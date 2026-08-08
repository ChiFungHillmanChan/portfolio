// All SQL lives here. Methods are uid-scoped so handlers can't forget it.
export function makeDb(d1) {
  const first = (stmt) => stmt.first();
  const all = async (stmt) => (await stmt.all()).results;

  async function updateByPatch(table, uid, id, patch, extraWhere = '') {
    const keys = Object.keys(patch);
    const sets = keys.map((k, i) => `${k} = ?${i + 3}`).join(', ');
    const sql = `UPDATE ${table} SET ${sets} WHERE id = ?1 AND uid = ?2 ${extraWhere} RETURNING *`;
    return first(d1.prepare(sql).bind(id, uid, ...keys.map((k) => patch[k])));
  }

  // LIKE would treat a user-typed % or _ as a wildcard; escape them so the
  // search box matches literally.
  const likeArg = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const userMatch = (p) => `(email LIKE ${p} ESCAPE '\\' OR display_name LIKE ${p} ESCAPE '\\')`;

  return {
    // Admin list is paged so one superadmin visit never pulls the whole table.
    // ORDER BY created_at DESC, uid — the uid tiebreak keeps OFFSET paging
    // stable when several rows share a created_at second.
    adminCountUsers: async (q) => {
      const row = await first(q
        ? d1.prepare(`SELECT COUNT(*) AS n FROM users WHERE ${userMatch('?1')}`).bind(likeArg(q))
        : d1.prepare(`SELECT COUNT(*) AS n FROM users`));
      return row ? row.n : 0;
    },
    adminListUsers: (limit, offset, q) => all(q
      ? d1.prepare(`SELECT display_name, email, created_at FROM users WHERE ${userMatch('?3')}
                    ORDER BY created_at DESC, uid LIMIT ?1 OFFSET ?2`).bind(limit, offset, likeArg(q))
      : d1.prepare(`SELECT display_name, email, created_at FROM users
                    ORDER BY created_at DESC, uid LIMIT ?1 OFFSET ?2`).bind(limit, offset)),

    // Runs on every /api/state. The WHERE on DO UPDATE makes the common case
    // (nothing changed since last visit) write zero rows — D1 bills rows written.
    upsertUser: (uid, email, name) => d1.prepare(
      `INSERT INTO users (uid, email, display_name) VALUES (?1, ?2, ?3)
       ON CONFLICT(uid) DO UPDATE SET email = ?2, display_name = ?3
       WHERE users.email IS NOT ?2 OR users.display_name IS NOT ?3`).bind(uid, email, name).run(),

    getState: async (uid) => ({
      friends: await all(d1.prepare(
        `SELECT f.*, COALESCE((SELECT SUM(g.severity) FROM grudges g
           WHERE g.friend_id = f.id AND g.card_id IS NULL), 0) AS stamps
         FROM friends f WHERE f.uid = ?1 AND f.archived = 0 ORDER BY f.id`).bind(uid)),
      openCards: await all(d1.prepare(
        `SELECT * FROM cards WHERE uid = ?1 AND status != 'settled' ORDER BY id DESC`).bind(uid)),
    }),

    createFriend: (uid, v) => first(d1.prepare(
      `INSERT INTO friends (uid, name, colour, threshold, reward) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING *`)
      .bind(uid, v.name, v.colour, v.threshold, v.reward)),
    getFriend: (uid, id) => first(d1.prepare(`SELECT * FROM friends WHERE id = ?1 AND uid = ?2`).bind(id, uid)),
    updateFriend: (uid, id, patch) => updateByPatch('friends', uid, id, patch),
    deleteFriend: (uid, id) => d1.batch([
      d1.prepare(`DELETE FROM grudges WHERE friend_id = ?1 AND uid = ?2`).bind(id, uid),
      d1.prepare(`DELETE FROM cards WHERE friend_id = ?1 AND uid = ?2`).bind(id, uid),
      d1.prepare(`DELETE FROM friends WHERE id = ?1 AND uid = ?2`).bind(id, uid),
    ]),

    listGrudges: (uid, friendId) => all(d1.prepare(
      `SELECT * FROM grudges WHERE uid = ?1 AND friend_id = ?2 ORDER BY occurred_at DESC, id DESC`).bind(uid, friendId)),
    listOpenGrudges: (uid, friendId) => all(d1.prepare(
      `SELECT * FROM grudges WHERE uid = ?1 AND friend_id = ?2 AND card_id IS NULL`).bind(uid, friendId)),
    getGrudge: (uid, id) => first(d1.prepare(`SELECT * FROM grudges WHERE id = ?1 AND uid = ?2`).bind(id, uid)),
    createGrudge: (uid, v) => first(d1.prepare(
      `INSERT INTO grudges (uid, friend_id, content, severity, occurred_at) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING *`)
      .bind(uid, v.friend_id, v.content, v.severity, v.occurred_at)),
    updateGrudge: (uid, id, patch) => updateByPatch('grudges', uid, id, patch, 'AND card_id IS NULL'),
    deleteGrudge: (uid, id) => d1.prepare(
      `DELETE FROM grudges WHERE id = ?1 AND uid = ?2 AND card_id IS NULL`).bind(id, uid).run(),

    openCard: async (uid, friend, token, stampTotal, grudgeIds) => {
      // batch = one transaction in D1, so card insert + grudge claim are atomic.
      const idPh = grudgeIds.map((_, i) => `?${i + 4}`).join(', ');
      await d1.batch([
        d1.prepare(`INSERT INTO cards (share_token, uid, friend_id, stamp_total, reward)
                    VALUES (?1, ?2, ?3, ?4, ?5)`).bind(token, uid, friend.id, stampTotal, friend.reward),
        d1.prepare(`UPDATE grudges SET card_id = (SELECT id FROM cards WHERE share_token = ?1)
                    WHERE uid = ?2 AND friend_id = ?3 AND card_id IS NULL AND id IN (${idPh})`)
          .bind(token, uid, friend.id, ...grudgeIds),
      ]);
      return first(d1.prepare(`SELECT * FROM cards WHERE share_token = ?1`).bind(token));
    },
    getCard: (uid, id) => first(d1.prepare(`SELECT * FROM cards WHERE id = ?1 AND uid = ?2`).bind(id, uid)),
    settleCard: (uid, id) => first(d1.prepare(
      `UPDATE cards SET status = 'settled', settled_at = datetime('now')
       WHERE id = ?1 AND uid = ?2 AND status != 'settled' RETURNING *`).bind(id, uid)),
    listCards: (uid, friendId) => all(d1.prepare(
      `SELECT * FROM cards WHERE uid = ?1 AND friend_id = ?2 ORDER BY id DESC`).bind(uid, friendId)),

    getPublicCard: async (token) => {
      const card = await first(d1.prepare(`SELECT * FROM cards WHERE share_token = ?1`).bind(token));
      if (!card) return null;
      const friend = await first(d1.prepare(`SELECT name FROM friends WHERE id = ?1`).bind(card.friend_id));
      const grudges = await all(d1.prepare(
        `SELECT content, severity, occurred_at FROM grudges WHERE card_id = ?1 ORDER BY occurred_at, id`).bind(card.id));
      return { card, friendName: friend ? friend.name : '', grudges };
    },
    ackCardByToken: async (token) => {
      await d1.prepare(`UPDATE cards SET status = 'acknowledged', acknowledged_at = datetime('now')
                        WHERE share_token = ?1 AND status = 'open'`).bind(token).run();
      return first(d1.prepare(`SELECT * FROM cards WHERE share_token = ?1`).bind(token));
    },
  };
}
