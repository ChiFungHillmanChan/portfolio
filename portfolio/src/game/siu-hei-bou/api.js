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

// GET /api/state is the one conditional request in the app: the client keeps the
// ETag in its IndexedDB mirror and a 304 means "your mirror is still correct".
// Returns the envelope rather than the body, because 304 has no body and must stay
// distinguishable from a book with nothing in it.
async function callState(etag) {
  const headers = {};
  if (tokenGetter) headers.authorization = `Bearer ${await tokenGetter()}`;
  if (etag) headers['if-none-match'] = etag;
  const res = await fetch(`${API_BASE}/api/state`, { method: 'GET', headers });
  if (res.status === 304) return { status: 304, etag, data: null };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'internal');
  // Null unless the Worker sends Access-Control-Expose-Headers: ETag — in which
  // case we simply never ask for a 304 again, rather than breaking.
  return { status: res.status, etag: res.headers.get('etag'), data };
}

export const api = {
  // NOTE: unlike every other method, this returns { status, etag, data } — see above.
  state: (etag) => callState(etag),
  me: () => call('GET', '/api/me'),
  deleteMe: () => call('DELETE', '/api/me'),
  // Creates take an optional `client_id` in `v` — the idempotency key sync.js
  // mints, so replaying a queued write returns the existing row instead of a
  // duplicate. The body is passed through whole, so nothing here has to know.
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
  adminUsers: ({ page = 1, q = '' } = {}) => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set('q', q);
    return call('GET', `/api/admin/users?${params}`);
  },
};

// Cosmetic gate only — the Worker re-checks the verified token email itself.
export const SUPERADMIN_EMAIL = 'hillmanchan709@gmail.com';
