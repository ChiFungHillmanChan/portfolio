// The book the reader sees = server mirror + everything still queued. Pure, so the
// rest of the app never has to ask what state sync is in: Book.jsx renders what
// comes out of here and treats `pending` as pencil instead of ink.

// Mirrors the column defaults in siu-hei-bou-api/schema.sql. A 罪人 written offline
// has no server row to inherit them from, and a chapter with an undefined threshold
// renders a stamp card of NaN slots.
const FRIEND_DEFAULTS = { colour: '#e8a0a0', threshold: 10, reward: '請食飯', archived: 0, stamps: 0 };
const GRUDGE_DEFAULTS = { card_id: null, created_at: null };

// Reading order is the server's — newest 嬲爆事 first (occurred_at DESC, id DESC).
// A pending entry has no server id yet but would get the highest one, so it sorts
// to the top of its own day: exactly where it will still be after it syncs.
function byReadingOrder(a, b) {
  const dateA = a.occurred_at || '';
  const dateB = b.occurred_at || '';
  if (dateA !== dateB) return dateA < dateB ? 1 : -1;
  if (!a.pending !== !b.pending) return a.pending ? -1 : 1;
  if (a.pending) return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  return b.id - a.id;
}

export function projectBook(mirror, outbox) {
  const source = mirror || {};
  const friends = new Map();
  const grudges = new Map();
  (source.friends || []).forEach((f) => friends.set(f.id, { ...f }));
  (source.grudges || []).forEach((g) => grudges.set(g.id, { ...g }));
  const removedFriends = new Set();

  // stamps arrive from the server as the sum of unclaimed severities. Pending
  // writes have to move the stamp card too, or writing a 嬲爆事 offline looks like
  // nothing happened at all.
  const stamp = (friendId, delta) => {
    const friend = friends.get(friendId);
    if (friend && delta) friend.stamps = Math.max(0, (friend.stamps || 0) + delta);
  };

  // A 'permanent' item is a write that will never land: the book shows server
  // truth, and the explanation lives on 未寄出.
  const live = (outbox || []).filter((it) => it && it.state !== 'permanent');

  for (const it of live) {
    const patch = it.payload || {};
    switch (it.op) {
      case 'createFriend':
        friends.set(it.clientId, {
          ...FRIEND_DEFAULTS, ...patch,
          id: it.clientId, client_id: it.clientId, created_at: it.createdAt || null, pending: true,
        });
        break;
      case 'updateFriend': {
        const row = friends.get(it.targetId);
        if (row) friends.set(it.targetId, { ...row, ...patch, pending: true });
        break;
      }
      case 'deleteFriend':
        if (friends.delete(it.targetId)) removedFriends.add(it.targetId);
        break;
      case 'createGrudge': {
        const friendId = patch.friend_id === undefined ? it.friendClientId : patch.friend_id;
        grudges.set(it.clientId, {
          ...GRUDGE_DEFAULTS, ...patch, friend_id: friendId,
          id: it.clientId, client_id: it.clientId, created_at: it.createdAt || null, pending: true,
        });
        stamp(friendId, patch.severity || 0);
        break;
      }
      case 'updateGrudge': {
        const row = grudges.get(it.targetId);
        if (!row) break;
        if (row.card_id == null && patch.severity !== undefined) {
          stamp(row.friend_id, patch.severity - row.severity);
        }
        grudges.set(it.targetId, { ...row, ...patch, pending: true });
        break;
      }
      case 'deleteGrudge': {
        const row = grudges.get(it.targetId);
        if (!row) break;
        if (row.card_id == null) stamp(row.friend_id, -row.severity);
        grudges.delete(it.targetId);
        break;
      }
      default:
        break;
    }
  }

  // Deleting a 罪人 takes their chapter and their 找數卡 with them — the same
  // cascade the Worker runs in deleteFriend, so the book does not show orphans
  // in the gap before the delete syncs.
  return {
    friends: [...friends.values()],
    grudges: [...grudges.values()].filter((g) => !removedFriends.has(g.friend_id)).sort(byReadingOrder),
    cards: (source.cards || []).filter((c) => !removedFriends.has(c.friend_id)).map((c) => ({ ...c })),
  };
}
