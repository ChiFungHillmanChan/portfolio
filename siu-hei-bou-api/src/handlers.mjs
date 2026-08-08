import { stampSum, canOpenCard, validateFriend, validateGrudge, genShareToken } from './logic.mjs';

const ok = (body) => ({ status: 200, body });
const err = (status, error) => ({ status, body: { error } });

export const ADMIN_PAGE_SIZE = 20;
const ADMIN_MAX_PAGE_SIZE = 100;   // hard ceiling: ?page_size=999999 is not a way to dump the table
const ADMIN_MAX_QUERY = 60;

// Query params are attacker-controlled strings; clamp them into a bounded page.
function adminUserQuery(query = {}) {
  const rawSize = Math.floor(Number(query.page_size));
  const rawPage = Math.floor(Number(query.page));
  return {
    q: typeof query.q === 'string' ? query.q.trim().slice(0, ADMIN_MAX_QUERY) : '',
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: Number.isFinite(rawSize) && rawSize > 0
      ? Math.min(rawSize, ADMIN_MAX_PAGE_SIZE) : ADMIN_PAGE_SIZE,
  };
}

const publicCardView = (card) => ({
  status: card.status,
  stamp_total: card.stamp_total,
  reward: card.reward,
  created_at: card.created_at,
});

export const handlers = {
  getState: async ({ db, uid }) => ok(await db.getState(uid)),

  createFriend: async ({ db, uid }, { body }) => {
    const v = validateFriend(body);
    if (!v.ok) return err(400, v.error);
    return ok(await db.createFriend(uid, v.value));
  },
  updateFriend: async ({ db, uid }, { params, body }) => {
    const v = validateFriend(body, { partial: true });
    if (!v.ok) return err(400, v.error);
    const row = await db.updateFriend(uid, Number(params.id), v.value);
    return row ? ok(row) : err(404, 'not-found');
  },
  deleteFriend: async ({ db, uid }, { params }) => {
    const friend = await db.getFriend(uid, Number(params.id));
    if (!friend) return err(404, 'not-found');
    await db.deleteFriend(uid, friend.id);
    return ok({ deleted: true });
  },

  listGrudges: async ({ db, uid }, { query }) => {
    const friendId = Number(query.friend_id);
    if (!Number.isInteger(friendId) || friendId <= 0) return err(400, 'bad-request');
    return ok(await db.listGrudges(uid, friendId));
  },
  createGrudge: async ({ db, uid }, { body }) => {
    const v = validateGrudge(body);
    if (!v.ok) return err(400, v.error);
    const friend = await db.getFriend(uid, v.value.friend_id);
    if (!friend) return err(404, 'not-found');
    return ok(await db.createGrudge(uid, v.value));
  },
  updateGrudge: async ({ db, uid }, { params, body }) => {
    const grudge = await db.getGrudge(uid, Number(params.id));
    if (!grudge) return err(404, 'not-found');
    if (grudge.card_id !== null) return err(409, 'card-claimed');
    const v = validateGrudge(body, { partial: true });
    if (!v.ok) return err(400, v.error);
    return ok(await db.updateGrudge(uid, grudge.id, v.value));
  },
  deleteGrudge: async ({ db, uid }, { params }) => {
    const grudge = await db.getGrudge(uid, Number(params.id));
    if (!grudge) return err(404, 'not-found');
    if (grudge.card_id !== null) return err(409, 'card-claimed');
    await db.deleteGrudge(uid, grudge.id);
    return ok({ deleted: true });
  },

  openCard: async ({ db, uid }, { body }) => {
    const friendId = body && Number(body.friend_id);
    if (!Number.isInteger(friendId) || friendId <= 0) return err(400, 'bad-request');
    const friend = await db.getFriend(uid, friendId);
    if (!friend) return err(404, 'not-found');
    const open = await db.listOpenGrudges(uid, friend.id);
    const stamps = stampSum(open);
    if (!canOpenCard(stamps, friend.threshold)) return err(409, 'threshold-not-met');
    return ok(await db.openCard(uid, friend, genShareToken(), stamps, open.map((g) => g.id)));
  },
  settleCard: async ({ db, uid }, { params }) => {
    const row = await db.settleCard(uid, Number(params.id));
    return row ? ok(row) : err(404, 'not-found');
  },
  listCards: async ({ db, uid }, { query }) => {
    const friendId = Number(query.friend_id);
    if (!Number.isInteger(friendId) || friendId <= 0) return err(400, 'bad-request');
    return ok(await db.listCards(uid, friendId));
  },

  // 書末 ·個人檔案 — who you are here, and what a 撕爛本簿 would cost you.
  // Falls back to the verified token when the users row is somehow missing, so
  // the page still renders rather than showing a blank profile.
  getMe: async ({ db, uid, user }) => {
    const { user: row, counts } = await db.getMe(uid);
    return ok({
      email: (row && row.email) || (user && user.email) || '',
      name: (row && row.display_name) || (user && user.name) || null,
      created_at: (row && row.created_at) || null,
      counts: {
        friends: (counts && counts.friends) || 0,
        grudges: (counts && counts.grudges) || 0,
        cards: (counts && counts.cards) || 0,
      },
    });
  },

  // 撕爛本簿 — wipes every 小氣簿 row for this uid, uid-scoped so it can only ever
  // reach the caller's own book. The Google account is shared across
  // hillmanchan.com and is deliberately NOT touched; the client signs out after.
  deleteMe: async ({ db, uid }) => {
    await db.deleteMe(uid);
    return ok({ deleted: true });
  },

  publicCard: async ({ db }, { params }) => {
    const data = await db.getPublicCard(params.token);
    if (!data) return err(404, 'not-found');
    return ok({ card: publicCardView(data.card), friendName: data.friendName, grudges: data.grudges });
  },
  publicAck: async ({ db }, { params }) => {
    const row = await db.ackCardByToken(params.token);
    return row ? ok(publicCardView(row)) : err(404, 'not-found');
  },

  // Superadmin only: how many people use the app, and who. Gate is the verified
  // token email against env SUPERADMIN_EMAIL — no client-side flag is trusted.
  // Paged (20/page) + searchable: the sheet asks for one page at a time, so the
  // query stays a bounded LIMIT/OFFSET no matter how big the table gets.
  adminUsers: async ({ db, user, superadminEmail }, { query } = {}) => {
    if (!superadminEmail || !user || user.email !== superadminEmail || !user.emailVerified) {
      return err(403, 'forbidden');
    }
    const { q, page, pageSize } = adminUserQuery(query);
    const total = await db.adminCountUsers(q);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);           // asking past the end lands on the last page
    const users = await db.adminListUsers(pageSize, (safePage - 1) * pageSize, q);
    return ok({
      total, q, pages, pageSize, page: safePage,
      users: users.map((u) => ({ name: u.display_name || null, email: u.email, created_at: u.created_at })),
    });
  },
};
