// Pure domain logic — no I/O, shared by handlers and tests.
export const SEVERITIES = [1, 2, 3];

export function stampSum(grudges) {
  return grudges.reduce((sum, g) => sum + g.severity, 0);
}

export function canOpenCard(stamps, threshold) {
  return stamps >= threshold;
}

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// client_id is the idempotency key an offline client mints before it can know a
// server id, so re-sending a queued write returns the existing row instead of a
// duplicate. Optional: clients that never go offline omit it and nothing about
// them changes. Shape-checked only — it is never trusted for anything but
// dedup, and dedup is uid-scoped in SQL, so a guessed one reaches no one else.
// Returns undefined when absent, null when malformed (same convention as the
// per-field checkers below).
function checkClientId(value) {
  if (value === undefined) return undefined;
  return typeof value === 'string' && CLIENT_ID.test(value) ? value : null;
}

function isValidDate(s) {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function checkFriendField(key, value) {
  switch (key) {
    case 'name': {
      const name = typeof value === 'string' ? value.trim() : '';
      if (!name || name.length > 30) return null;
      return name;
    }
    case 'colour':
      return typeof value === 'string' && HEX_COLOUR.test(value) ? value.toLowerCase() : null;
    case 'threshold':
      return Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
    case 'reward': {
      const reward = typeof value === 'string' ? value.trim() : '';
      if (!reward || reward.length > 30) return null;
      return reward;
    }
    case 'archived':
      return value === 0 || value === 1 ? value : null;
    default:
      return undefined; // unknown key — ignored
  }
}

export function validateFriend(body, { partial = false } = {}) {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'bad-request' };
  // Checked in both modes, but only ever returned for a create. In partial mode
  // it falls through checkFriendField's "unknown key" branch and is dropped, so
  // an UPDATE can never rewrite the idempotency key of a row that already has one.
  const clientId = checkClientId(body.client_id);
  if (clientId === null) return { ok: false, error: 'bad-request' };
  if (partial) {
    const value = {};
    for (const key of Object.keys(body)) {
      const checked = checkFriendField(key, body[key]);
      if (checked === undefined) continue;
      if (checked === null) return { ok: false, error: 'bad-request' };
      value[key] = checked;
    }
    if (Object.keys(value).length === 0) return { ok: false, error: 'bad-request' };
    return { ok: true, value };
  }
  const name = checkFriendField('name', body.name);
  if (name === null) return { ok: false, error: 'bad-request' };
  const colour = body.colour === undefined ? '#e8a0a0' : checkFriendField('colour', body.colour);
  const threshold = body.threshold === undefined ? 10 : checkFriendField('threshold', body.threshold);
  const reward = body.reward === undefined ? '請食飯' : checkFriendField('reward', body.reward);
  if (colour === null || threshold === null || reward === null) return { ok: false, error: 'bad-request' };
  const value = { name, colour, threshold, reward };
  if (clientId !== undefined) value.client_id = clientId;
  return { ok: true, value };
}

function checkGrudgeField(key, value) {
  switch (key) {
    case 'friend_id':
      return Number.isInteger(value) && value > 0 ? value : null;
    case 'content': {
      const content = typeof value === 'string' ? value.trim() : '';
      if (!content || content.length > 500) return null;
      return content;
    }
    case 'severity':
      return SEVERITIES.includes(value) ? value : null;
    case 'occurred_at':
      return typeof value === 'string' && isValidDate(value) ? value : null;
    default:
      return undefined;
  }
}

export function validateGrudge(body, { partial = false } = {}) {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'bad-request' };
  // See validateFriend: validated in both modes, carried only into a create.
  const clientId = checkClientId(body.client_id);
  if (clientId === null) return { ok: false, error: 'bad-request' };
  const keys = partial ? Object.keys(body).filter((k) => k !== 'friend_id')
                       : ['friend_id', 'content', 'severity', 'occurred_at'];
  const value = {};
  for (const key of keys) {
    const checked = checkGrudgeField(key, body[key]);
    if (checked === undefined) continue;
    if (checked === null) return { ok: false, error: 'bad-request' };
    value[key] = checked;
  }
  if (Object.keys(value).length === 0) return { ok: false, error: 'bad-request' };
  if (!partial && clientId !== undefined) value.client_id = clientId;
  return { ok: true, value };
}

const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function genShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let out = '';
  for (const b of bytes) out += TOKEN_ALPHABET[b & 63];
  return out;
}
