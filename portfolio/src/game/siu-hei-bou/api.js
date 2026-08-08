export const API_BASE = 'https://siu-hei-bou-api.hillmanchan.com';
export const SHARE_BASE = 'https://siu-hei-bou.hillmanchan.com';

export class ApiError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

let tokenGetter = null;
export function setTokenGetter(fn) { tokenGetter = fn; }

async function call(method, path, body) {
  const headers = { 'content-type': 'application/json' };
  if (tokenGetter && path.startsWith('/api/')) headers.authorization = `Bearer ${await tokenGetter()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'internal');
  return data;
}

export const api = {
  state: () => call('GET', '/api/state'),
  me: () => call('GET', '/api/me'),
  deleteMe: () => call('DELETE', '/api/me'),
  createFriend: (v) => call('POST', '/api/friends', v),
  updateFriend: (id, v) => call('PATCH', `/api/friends/${id}`, v),
  deleteFriend: (id) => call('DELETE', `/api/friends/${id}`),
  grudges: (friendId) => call('GET', `/api/grudges?friend_id=${friendId}`),
  addGrudge: (v) => call('POST', '/api/grudges', v),
  editGrudge: (id, v) => call('PATCH', `/api/grudges/${id}`, v),
  removeGrudge: (id) => call('DELETE', `/api/grudges/${id}`),
  openCard: (friendId) => call('POST', '/api/cards', { friend_id: friendId }),
  settleCard: (id) => call('POST', `/api/cards/${id}/settle`),
  cards: (friendId) => call('GET', `/api/cards?friend_id=${friendId}`),
  publicCard: (token) => call('GET', `/public/cards/${token}`),
  ackCard: (token) => call('POST', `/public/cards/${token}/ack`),
  adminUsers: () => call('GET', '/api/admin/users'),
};

// Cosmetic gate only — the Worker re-checks the verified token email itself.
export const SUPERADMIN_EMAIL = 'hillmanchan709@gmail.com';
