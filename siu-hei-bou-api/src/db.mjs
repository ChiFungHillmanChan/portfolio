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

  return {
    upsertUser: (uid, email, name) => d1.prepare(
      `INSERT INTO users (uid, email, display_name) VALUES (?1, ?2, ?3)
       ON CONFLICT(uid) DO UPDATE SET email = ?2, display_name = ?3`).bind(uid, email, name).run(),

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

    openCard: async (uid, friend, token, stampTotal) => {
      // batch = one transaction in D1, so card insert + grudge claim are atomic.
      await d1.batch([
        d1.prepare(`INSERT INTO cards (share_token, uid, friend_id, stamp_total, reward)
                    VALUES (?1, ?2, ?3, ?4, ?5)`).bind(token, uid, friend.id, stampTotal, friend.reward),
        d1.prepare(`UPDATE grudges SET card_id = (SELECT id FROM cards WHERE share_token = ?1)
                    WHERE uid = ?2 AND friend_id = ?3 AND card_id IS NULL`).bind(token, uid, friend.id),
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
