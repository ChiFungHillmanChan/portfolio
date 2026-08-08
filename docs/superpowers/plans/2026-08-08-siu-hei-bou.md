# 小氣簿 (Siu Hei Bou) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cantonese cute mobile-first grudge-notebook web app at `siu-hei-bou.hillmanchan.com` — log grudges per friend, severity-weighted stamps, full card opens a public 找數卡 share link demanding a meal.

**Architecture:** React component in the portfolio CRA build (hostname-routed like card-drawer); Google login via the shared Firebase project (like casino-game); backend is a Cloudflare Worker (`siu-hei-bou-api/` at repo root) with a D1 SQLite database, verifying Firebase ID tokens via Google's JWKS with WebCrypto.

**Tech Stack:** React 18 (CRA, eager import like other games), firebase@11 (npm, already a dependency), Cloudflare Workers + D1, `node --test` for Worker tests, hand-drawn inline SVG (no emoji), font LXGW WenKai TC via Google Fonts.

**Spec:** `docs/superpowers/specs/2026-08-08-siu-hei-bou-design.md` — read it first.

## Global Constraints

- All user-facing copy is Cantonese (廣東話, e.g. 「加個罪人」「記一筆」「開找數卡」「認數」「搵唔到呢張卡喎」).
- **No emoji anywhere in UI** — hand-drawn inline SVG only (repo rule).
- Severity: 小嬲=1, 中嬲=2, 勁嬲=3 stamps; friend `threshold` default 10; `reward` default 「請食飯」.
- Firebase project `system-design-c84d3`; API base `https://siu-hei-bou-api.hillmanchan.com`; share URL `https://siu-hei-bou.hillmanchan.com/card/<token>`.
- Worker code style mirrors the Lambda repos: plain `.mjs`, ctx-injected handlers, pure logic module, `node --test`.
- Branch `feat/siu-hei-bou` (already exists, spec committed). Never push `main`; finish via PR.
- Do NOT touch unrelated dirty files (`README.md` at repo root is modified by another session — leave it; the game-table row edit in Task 11 must re-check `git diff README.md` and only add the new row).
- Grudge `content` max 500 chars; friend `name`/`reward` max 30 chars; `threshold` 1–100.
- Card statuses: `open` → `acknowledged` (public, one-way) → `settled` (owner only).

## File Structure

```
siu-hei-bou-api/                    # NEW — Cloudflare Worker backend
├── package.json                    # scripts: test (node --test), deploy (wrangler deploy)
├── wrangler.toml                   # D1 binding DB → siu-hei-bou-db, custom domain
├── schema.sql                      # D1 schema (from spec)
├── src/logic.mjs                   # pure: validation, stamp maths, share token
├── src/auth.mjs                    # Firebase ID token verify (WebCrypto + JWKS)
├── src/db.mjs                      # makeDb(d1) — named SQL methods
├── src/handlers.mjs                # route handlers, ctx-injected {db, uid}
├── src/index.mjs                   # fetch entry: CORS, router, auth, error mapping
└── test/{logic,auth,handlers}.test.mjs

portfolio/src/game/siu-hei-bou/     # NEW — frontend
├── SiuHeiBouGame.jsx               # root: auth state, path routing, data load
├── firebase.js                     # lazy memoized Firebase init (public config)
├── api.js                          # fetch client for the Worker API
├── svgs.jsx                        # AngryFace ×3, stamp circle, decorations
├── CoverPage.jsx                   # 封面 + Google 登入
├── HomePage.jsx                    # 罪人名單 + 加個罪人
├── FriendPage.jsx                  # 儲印卡 + 記錄 + 開找數卡
├── AddGrudgeSheet.jsx              # 記一筆 bottom sheet
├── PublicCardPage.jsx              # 找數卡 公開頁 (/card/:token, no auth)
├── SettingsSheet.jsx               # per-friend settings + 歷史 + 登出
└── siuHeiBouStyles.css             # notebook aesthetic, all scoped under .shb-root

portfolio/src/App.js                # MODIFY — hostname map + dev route
```

---

### Task 1: Worker scaffold + pure logic module (TDD)

**Files:**
- Create: `siu-hei-bou-api/package.json`, `siu-hei-bou-api/wrangler.toml`, `siu-hei-bou-api/schema.sql`, `siu-hei-bou-api/src/logic.mjs`
- Test: `siu-hei-bou-api/test/logic.test.mjs`

**Interfaces:**
- Produces: `stampSum(grudges)→int`, `canOpenCard(stamps,threshold)→bool`, `validateFriend(body,{partial})→{ok,value}|{ok:false,error}`, `validateGrudge(body,{partial})→same`, `genShareToken()→24-char base64url string`, `SEVERITIES=[1,2,3]`

- [ ] **Step 1: Scaffold config files**

`siu-hei-bou-api/package.json`:
```json
{
  "name": "siu-hei-bou-api",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
```

`siu-hei-bou-api/wrangler.toml`:
```toml
name = "siu-hei-bou-api"
main = "src/index.mjs"
compatibility_date = "2026-07-01"

routes = [
  { pattern = "siu-hei-bou-api.hillmanchan.com", custom_domain = true }
]

[[d1_databases]]
binding = "DB"
database_name = "siu-hei-bou-db"
database_id = "PLACEHOLDER-SET-IN-TASK-5"
```
(`database_id` is filled in Task 5 when the D1 database is created — until then only `npm test` runs, which never loads wrangler.)

`siu-hei-bou-api/schema.sql`: copy the four `CREATE TABLE` + two `CREATE INDEX` statements **verbatim** from the spec section "Data Model (D1 schema)".

- [ ] **Step 2: Write the failing tests**

`siu-hei-bou-api/test/logic.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stampSum, canOpenCard, validateFriend, validateGrudge, genShareToken } from '../src/logic.mjs';

test('stampSum adds severities', () => {
  assert.equal(stampSum([]), 0);
  assert.equal(stampSum([{ severity: 1 }, { severity: 3 }, { severity: 2 }]), 6);
});

test('canOpenCard needs stamps >= threshold', () => {
  assert.equal(canOpenCard(9, 10), false);
  assert.equal(canOpenCard(10, 10), true);
  assert.equal(canOpenCard(15, 10), true);
});

test('validateFriend accepts minimal input and applies defaults', () => {
  const r = validateFriend({ name: '  阿明  ' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯' });
});

test('validateFriend rejects bad input', () => {
  assert.equal(validateFriend({ name: '' }).ok, false);
  assert.equal(validateFriend({ name: 'x'.repeat(31) }).ok, false);
  assert.equal(validateFriend({ name: 'ok', threshold: 0 }).ok, false);
  assert.equal(validateFriend({ name: 'ok', threshold: 101 }).ok, false);
  assert.equal(validateFriend({ name: 'ok', threshold: 5.5 }).ok, false);
  assert.equal(validateFriend({ name: 'ok', colour: 'red' }).ok, false);
  assert.equal(validateFriend({ name: 'ok', reward: 'x'.repeat(31) }).ok, false);
});

test('validateFriend partial mode only validates provided keys', () => {
  const r = validateFriend({ threshold: 12 }, { partial: true });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { threshold: 12 });
  assert.equal(validateFriend({}, { partial: true }).ok, false); // nothing to update
});

test('validateGrudge accepts full input', () => {
  const r = validateGrudge({ friend_id: 3, content: '遲到一個鐘', severity: 2, occurred_at: '2026-08-08' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { friend_id: 3, content: '遲到一個鐘', severity: 2, occurred_at: '2026-08-08' });
});

test('validateGrudge rejects bad input', () => {
  assert.equal(validateGrudge({ friend_id: 1, content: '', severity: 1, occurred_at: '2026-08-08' }).ok, false);
  assert.equal(validateGrudge({ friend_id: 1, content: 'x'.repeat(501), severity: 1, occurred_at: '2026-08-08' }).ok, false);
  assert.equal(validateGrudge({ friend_id: 1, content: 'ok', severity: 4, occurred_at: '2026-08-08' }).ok, false);
  assert.equal(validateGrudge({ friend_id: 1, content: 'ok', severity: 1, occurred_at: '08/08/2026' }).ok, false);
  assert.equal(validateGrudge({ friend_id: 1, content: 'ok', severity: 1, occurred_at: '2026-13-40' }).ok, false);
});

test('genShareToken is 24 url-safe chars and unique', () => {
  const a = genShareToken();
  const b = genShareToken();
  assert.match(a, /^[A-Za-z0-9_-]{24}$/);
  assert.notEqual(a, b);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd siu-hei-bou-api && npm test`
Expected: FAIL — cannot find module `../src/logic.mjs`.

- [ ] **Step 4: Implement `src/logic.mjs`**

```js
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
  return { ok: true, value: { name, colour, threshold, reward } };
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
  return { ok: true, value };
}

const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function genShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let out = '';
  for (const b of bytes) out += TOKEN_ALPHABET[b & 63];
  return out;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd siu-hei-bou-api && npm test`
Expected: all PASS. (Do NOT `npm install` yet — wrangler isn't needed for tests.)

- [ ] **Step 6: Commit**

```bash
git add siu-hei-bou-api
git commit -m "feat(siu-hei-bou): worker scaffold + pure logic module"
```

---

### Task 2: Firebase ID token verification (TDD, WebCrypto)

**Files:**
- Create: `siu-hei-bou-api/src/auth.mjs`
- Test: `siu-hei-bou-api/test/auth.test.mjs`

**Interfaces:**
- Produces: `verifyFirebaseToken(token, {projectId, fetchJwks, now}) → Promise<{uid, email, name}>`, throws `AuthError` (has `.code='unauthorized'`) on any failure. `defaultFetchJwks()` fetches Google's JWKS with module-level 1h cache.
- Consumed by: Task 4 (`index.mjs` calls it for every `/api/*` request).

- [ ] **Step 1: Write the failing tests**

`siu-hei-bou-api/test/auth.test.mjs` — generates a real RSA keypair, signs a token, and verifies through the same code path the Worker uses:
```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { verifyFirebaseToken, AuthError } from '../src/auth.mjs';

const PROJECT = 'system-design-c84d3';
const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

let keyPair, jwks;

before(async () => {
  keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  jwks = { keys: [{ ...jwk, kid: 'test-kid', alg: 'RS256', use: 'sig' }] };
});

async function makeToken(claimOverrides = {}, headerOverrides = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid: 'test-kid', typ: 'JWT', ...headerOverrides };
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT,
    sub: 'uid-123', user_id: 'uid-123', email: 'a@b.com', name: '阿明',
    iat: nowSec - 10, exp: nowSec + 3600, ...claimOverrides,
  };
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${Buffer.from(sig).toString('base64url')}`;
}

const opts = () => ({ projectId: PROJECT, fetchJwks: async () => jwks });

test('accepts a valid token', async () => {
  const out = await verifyFirebaseToken(await makeToken(), opts());
  assert.deepEqual(out, { uid: 'uid-123', email: 'a@b.com', name: '阿明' });
});

test('rejects expired token', async () => {
  const token = await makeToken({ exp: Math.floor(Date.now() / 1000) - 10 });
  await assert.rejects(() => verifyFirebaseToken(token, opts()), AuthError);
});

test('rejects wrong audience / issuer / missing sub', async () => {
  await assert.rejects(() => verifyFirebaseToken(await makeToken({ aud: 'other' }), opts()), AuthError);
  await assert.rejects(() => verifyFirebaseToken(await makeToken({ iss: 'https://evil.example' }), opts()), AuthError);
  await assert.rejects(() => verifyFirebaseToken(await makeToken({ sub: '' }), opts()), AuthError);
});

test('rejects tampered payload', async () => {
  const token = await makeToken();
  const [h, , s] = token.split('.');
  const tampered = `${h}.${enc({ sub: 'attacker', aud: PROJECT })}.${s}`;
  await assert.rejects(() => verifyFirebaseToken(tampered, opts()), AuthError);
});

test('rejects unknown kid, alg none, and garbage', async () => {
  await assert.rejects(() => verifyFirebaseToken(await makeToken({}, { kid: 'nope' }), opts()), AuthError);
  const nowSec = Math.floor(Date.now() / 1000);
  const noneToken = `${enc({ alg: 'none', kid: 'test-kid' })}.${enc({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: 'x', iat: nowSec, exp: nowSec + 100 })}.`;
  await assert.rejects(() => verifyFirebaseToken(noneToken, opts()), AuthError);
  await assert.rejects(() => verifyFirebaseToken('not-a-jwt', opts()), AuthError);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd siu-hei-bou-api && npm test`
Expected: auth tests FAIL — cannot find module `../src/auth.mjs`. Logic tests still pass.

- [ ] **Step 3: Implement `src/auth.mjs`**

```js
// Verifies Firebase ID tokens (RS256) against Google's securetoken JWKS.
// WebCrypto only — no firebase-admin (it does not run on Workers).
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export class AuthError extends Error {
  constructor(message) { super(message); this.code = 'unauthorized'; }
}

let jwksCache = { keys: null, fetchedAt: 0 };

export async function defaultFetchJwks() {
  if (jwksCache.keys && Date.now() - jwksCache.fetchedAt < 60 * 60 * 1000) return jwksCache;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new AuthError('jwks fetch failed');
  jwksCache = { ...(await res.json()), fetchedAt: Date.now() };
  return jwksCache;
}

function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodeJson(part) {
  try { return JSON.parse(new TextDecoder().decode(b64urlToBytes(part))); }
  catch { throw new AuthError('malformed token'); }
}

export async function verifyFirebaseToken(token, { projectId = 'system-design-c84d3', fetchJwks = defaultFetchJwks, now = () => Date.now() } = {}) {
  if (typeof token !== 'string' || token.split('.').length !== 3) throw new AuthError('malformed token');
  const [headerB64, payloadB64, sigB64] = token.split('.');
  const header = decodeJson(headerB64);
  const payload = decodeJson(payloadB64);
  if (header.alg !== 'RS256' || !header.kid) throw new AuthError('bad alg');

  const { keys } = await fetchJwks();
  const jwk = (keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new AuthError('unknown kid');

  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key,
    b64urlToBytes(sigB64), new TextEncoder().encode(`${headerB64}.${payloadB64}`));
  if (!ok) throw new AuthError('bad signature');

  const nowMs = now();
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < nowMs - CLOCK_SKEW_MS) throw new AuthError('expired');
  if (typeof payload.iat !== 'number' || payload.iat * 1000 > nowMs + CLOCK_SKEW_MS) throw new AuthError('bad iat');
  if (payload.aud !== projectId) throw new AuthError('bad aud');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('bad iss');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new AuthError('bad sub');

  return { uid: payload.sub, email: payload.email || '', name: payload.name || '' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd siu-hei-bou-api && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add siu-hei-bou-api/src/auth.mjs siu-hei-bou-api/test/auth.test.mjs
git commit -m "feat(siu-hei-bou): firebase ID token verification via WebCrypto"
```

---

### Task 3: DB layer + route handlers (TDD with stubbed db)

**Files:**
- Create: `siu-hei-bou-api/src/db.mjs`, `siu-hei-bou-api/src/handlers.mjs`
- Test: `siu-hei-bou-api/test/handlers.test.mjs`

**Interfaces:**
- Consumes: Task 1's `validateFriend/validateGrudge/stampSum/canOpenCard/genShareToken`.
- Produces: `makeDb(d1)` returning the methods listed below; `handlers` — an object keyed by route name, each `async (ctx, req) => ({status, body})` where `ctx={db, uid}` (uid absent on public routes) and `req={params, body, query}`.

`makeDb(d1)` methods (all uid-scoped except the two token ones):
`upsertUser(uid,email,name)`, `getState(uid)→{friends,openCards}` (friends include live `stamps`), `createFriend(uid,v)→row`, `getFriend(uid,id)→row|null`, `updateFriend(uid,id,patch)→row|null`, `deleteFriend(uid,id)` (cascades grudges+cards), `listGrudges(uid,friendId)→rows`, `listOpenGrudges(uid,friendId)→rows`, `getGrudge(uid,id)→row|null`, `createGrudge(uid,v)→row`, `updateGrudge(uid,id,patch)→row`, `deleteGrudge(uid,id)`, `openCard(uid,friend,token,stampTotal)→card` (atomic batch), `getCard(uid,id)→row|null`, `settleCard(uid,id)→row|null`, `listCards(uid,friendId)→rows`, `getPublicCard(token)→{card,friendName,grudges}|null`, `ackCardByToken(token)→row|null`.

- [ ] **Step 1: Write the failing tests**

`siu-hei-bou-api/test/handlers.test.mjs` — stub db as a plain object per test:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handlers } from '../src/handlers.mjs';

const FRIEND = { id: 3, uid: 'u1', name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯', archived: 0 };

test('getState returns db state', async () => {
  const db = { getState: async (uid) => ({ friends: [{ ...FRIEND, stamps: 4 }], openCards: [] }) };
  const res = await handlers.getState({ db, uid: 'u1' }, {});
  assert.equal(res.status, 200);
  assert.equal(res.body.friends[0].stamps, 4);
});

test('createFriend validates then inserts with defaults', async () => {
  let inserted;
  const db = { createFriend: async (uid, v) => { inserted = { uid, ...v }; return { id: 9, uid, ...v }; } };
  const res = await handlers.createFriend({ db, uid: 'u1' }, { body: { name: ' 阿明 ' } });
  assert.equal(res.status, 200);
  assert.deepEqual(inserted, { uid: 'u1', name: '阿明', colour: '#e8a0a0', threshold: 10, reward: '請食飯' });
  const bad = await handlers.createFriend({ db, uid: 'u1' }, { body: { name: '' } });
  assert.equal(bad.status, 400);
});

test('createGrudge checks friend ownership', async () => {
  const db = {
    getFriend: async (uid, id) => (id === 3 ? FRIEND : null),
    createGrudge: async (uid, v) => ({ id: 1, uid, ...v, card_id: null }),
  };
  const ok = await handlers.createGrudge({ db, uid: 'u1' },
    { body: { friend_id: 3, content: '遲到', severity: 2, occurred_at: '2026-08-08' } });
  assert.equal(ok.status, 200);
  const notMine = await handlers.createGrudge({ db, uid: 'u1' },
    { body: { friend_id: 7, content: '遲到', severity: 2, occurred_at: '2026-08-08' } });
  assert.equal(notMine.status, 404);
});

test('updateGrudge refuses claimed grudges', async () => {
  const db = { getGrudge: async () => ({ id: 5, uid: 'u1', card_id: 11 }) };
  const res = await handlers.updateGrudge({ db, uid: 'u1' }, { params: { id: '5' }, body: { content: '改字' } });
  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'card-claimed');
});

test('openCard enforces threshold and claims grudges', async () => {
  const grudges = [{ severity: 3 }, { severity: 3 }, { severity: 3 }];
  let opened;
  const db = {
    getFriend: async () => FRIEND,
    listOpenGrudges: async () => grudges,
    openCard: async (uid, friend, token, total) => { opened = { token, total }; return { id: 20, share_token: token, stamp_total: total, status: 'open' }; },
  };
  const notYet = await handlers.openCard({ db, uid: 'u1' }, { body: { friend_id: 3 } });
  assert.equal(notYet.status, 409);
  assert.equal(notYet.body.error, 'threshold-not-met');
  grudges.push({ severity: 1 });  // now 10 stamps
  const res = await handlers.openCard({ db, uid: 'u1' }, { body: { friend_id: 3 } });
  assert.equal(res.status, 200);
  assert.match(opened.token, /^[A-Za-z0-9_-]{24}$/);
  assert.equal(opened.total, 10);
});

test('publicCard 404s on bad token and returns card on good token', async () => {
  const db = { getPublicCard: async (t) => (t === 'good' ? { card: { status: 'open' }, friendName: '阿明', grudges: [] } : null) };
  assert.equal((await handlers.publicCard({ db }, { params: { token: 'bad' } })).status, 404);
  assert.equal((await handlers.publicCard({ db }, { params: { token: 'good' } })).status, 200);
});

test('publicAck is one-way and idempotent', async () => {
  let calls = 0;
  const db = { ackCardByToken: async () => { calls += 1; return { status: 'acknowledged' }; } };
  const res = await handlers.publicAck({ db }, { params: { token: 'good' } });
  assert.equal(res.status, 200);
  assert.equal(calls, 1);
  const missing = await handlers.publicAck({ db: { ackCardByToken: async () => null } }, { params: { token: 'x' } });
  assert.equal(missing.status, 404);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd siu-hei-bou-api && npm test`
Expected: handlers tests FAIL (module not found); logic + auth still pass.

- [ ] **Step 3: Implement `src/db.mjs`**

```js
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
```

- [ ] **Step 4: Implement `src/handlers.mjs`**

```js
import { stampSum, canOpenCard, validateFriend, validateGrudge, genShareToken } from './logic.mjs';

const ok = (body) => ({ status: 200, body });
const err = (status, error) => ({ status, body: { error } });

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
    return ok(await db.openCard(uid, friend, genShareToken(), stamps));
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

  publicCard: async ({ db }, { params }) => {
    const data = await db.getPublicCard(params.token);
    return data ? ok(data) : err(404, 'not-found');
  },
  publicAck: async ({ db }, { params }) => {
    const row = await db.ackCardByToken(params.token);
    return row ? ok(row) : err(404, 'not-found');
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd siu-hei-bou-api && npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add siu-hei-bou-api/src/db.mjs siu-hei-bou-api/src/handlers.mjs siu-hei-bou-api/test/handlers.test.mjs
git commit -m "feat(siu-hei-bou): D1 data layer + route handlers"
```

---

### Task 4: Worker entry — router, CORS, auth wiring, rate limit (TDD for routing)

**Files:**
- Create: `siu-hei-bou-api/src/index.mjs`
- Test: `siu-hei-bou-api/test/index.test.mjs`

**Interfaces:**
- Consumes: Task 2 `verifyFirebaseToken` (+ `AuthError`), Task 3 `makeDb`/`handlers`.
- Produces: default Worker export `{fetch}`; exported for tests: `matchRoute(method, pathname)→{name, params, public}|null`, `makeRateLimiter(limit, windowMs, now)→(ip)=>bool`.

- [ ] **Step 1: Write the failing tests**

`siu-hei-bou-api/test/index.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, makeRateLimiter } from '../src/index.mjs';

test('matchRoute maps every API route', () => {
  assert.deepEqual(matchRoute('GET', '/api/state'), { name: 'getState', params: {}, public: false });
  assert.deepEqual(matchRoute('POST', '/api/friends'), { name: 'createFriend', params: {}, public: false });
  assert.deepEqual(matchRoute('PATCH', '/api/friends/7'), { name: 'updateFriend', params: { id: '7' }, public: false });
  assert.deepEqual(matchRoute('DELETE', '/api/friends/7'), { name: 'deleteFriend', params: { id: '7' }, public: false });
  assert.deepEqual(matchRoute('GET', '/api/grudges'), { name: 'listGrudges', params: {}, public: false });
  assert.deepEqual(matchRoute('POST', '/api/grudges'), { name: 'createGrudge', params: {}, public: false });
  assert.deepEqual(matchRoute('PATCH', '/api/grudges/5'), { name: 'updateGrudge', params: { id: '5' }, public: false });
  assert.deepEqual(matchRoute('DELETE', '/api/grudges/5'), { name: 'deleteGrudge', params: { id: '5' }, public: false });
  assert.deepEqual(matchRoute('POST', '/api/cards'), { name: 'openCard', params: {}, public: false });
  assert.deepEqual(matchRoute('POST', '/api/cards/2/settle'), { name: 'settleCard', params: { id: '2' }, public: false });
  assert.deepEqual(matchRoute('GET', '/api/cards'), { name: 'listCards', params: {}, public: false });
  assert.deepEqual(matchRoute('GET', '/public/cards/abc123'), { name: 'publicCard', params: { token: 'abc123' }, public: true });
  assert.deepEqual(matchRoute('POST', '/public/cards/abc123/ack'), { name: 'publicAck', params: { token: 'abc123' }, public: true });
  assert.equal(matchRoute('GET', '/nope'), null);
  assert.equal(matchRoute('PUT', '/api/friends/7'), null);
});

test('rate limiter allows N per window then blocks, per IP', () => {
  let t = 0;
  const allow = makeRateLimiter(3, 60_000, () => t);
  assert.equal(allow('1.1.1.1'), true);
  assert.equal(allow('1.1.1.1'), true);
  assert.equal(allow('1.1.1.1'), true);
  assert.equal(allow('1.1.1.1'), false);
  assert.equal(allow('2.2.2.2'), true);   // different IP unaffected
  t = 61_000;
  assert.equal(allow('1.1.1.1'), true);   // window rolled over
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd siu-hei-bou-api && npm test`
Expected: index tests FAIL (module not found); the rest pass.

- [ ] **Step 3: Implement `src/index.mjs`**

```js
import { verifyFirebaseToken } from './auth.mjs';
import { makeDb } from './db.mjs';
import { handlers } from './handlers.mjs';

const ALLOWED_ORIGINS = [
  'https://siu-hei-bou.hillmanchan.com',
  'https://hillmanchan.com',
  'http://localhost:3000',
];

const ROUTES = [
  ['GET',    /^\/api\/state$/,                'getState',    []],
  ['POST',   /^\/api\/friends$/,              'createFriend', []],
  ['PATCH',  /^\/api\/friends\/(\d+)$/,       'updateFriend', ['id']],
  ['DELETE', /^\/api\/friends\/(\d+)$/,       'deleteFriend', ['id']],
  ['GET',    /^\/api\/grudges$/,              'listGrudges',  []],
  ['POST',   /^\/api\/grudges$/,              'createGrudge', []],
  ['PATCH',  /^\/api\/grudges\/(\d+)$/,       'updateGrudge', ['id']],
  ['DELETE', /^\/api\/grudges\/(\d+)$/,       'deleteGrudge', ['id']],
  ['POST',   /^\/api\/cards$/,                'openCard',     []],
  ['POST',   /^\/api\/cards\/(\d+)\/settle$/, 'settleCard',   ['id']],
  ['GET',    /^\/api\/cards$/,                'listCards',    []],
  ['GET',    /^\/public\/cards\/([A-Za-z0-9_-]+)$/,       'publicCard', ['token']],
  ['POST',   /^\/public\/cards\/([A-Za-z0-9_-]+)\/ack$/,  'publicAck',  ['token']],
];

export function matchRoute(method, pathname) {
  for (const [m, re, name, paramNames] of ROUTES) {
    if (m !== method) continue;
    const hit = pathname.match(re);
    if (!hit) continue;
    const params = {};
    paramNames.forEach((p, i) => { params[p] = hit[i + 1]; });
    return { name, params, public: pathname.startsWith('/public/') };
  }
  return null;
}

export function makeRateLimiter(limit, windowMs, now = () => Date.now()) {
  const hits = new Map(); // ip -> {windowStart, count}
  return (ip) => {
    const t = now();
    const entry = hits.get(ip);
    if (!entry || t - entry.windowStart >= windowMs) {
      hits.set(ip, { windowStart: t, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}

const ackAllowed = makeRateLimiter(10, 60_000); // per-isolate is good enough for v1

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    const respond = (status, body) => new Response(JSON.stringify(body), {
      status, headers: { 'content-type': 'application/json', ...cors },
    });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const route = matchRoute(request.method, url.pathname);
    if (!route) return respond(404, { error: 'not-found' });

    const ctx = { db: makeDb(env.DB) };
    if (!route.public) {
      const header = request.headers.get('Authorization') || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      try {
        const user = await verifyFirebaseToken(token);
        ctx.uid = user.uid;
        if (route.name === 'getState') await ctx.db.upsertUser(user.uid, user.email, user.name);
      } catch {
        return respond(401, { error: 'unauthorized' });
      }
    } else if (route.name === 'publicAck') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!ackAllowed(ip)) return respond(429, { error: 'too-fast' });
    }

    let body = null;
    if (request.method === 'POST' || request.method === 'PATCH') {
      try { body = await request.json(); } catch { body = null; }
    }
    const query = Object.fromEntries(url.searchParams);

    try {
      const result = await handlers[route.name](ctx, { params: route.params, body, query });
      return respond(result.status, result.body);
    } catch (e) {
      console.error(`[${route.name}]`, e);
      return respond(500, { error: 'internal' });
    }
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd siu-hei-bou-api && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add siu-hei-bou-api/src/index.mjs siu-hei-bou-api/test/index.test.mjs
git commit -m "feat(siu-hei-bou): worker entry with router, CORS, auth, rate limit"
```

---

### Task 5: Provision D1 + deploy Worker + smoke test

**Files:**
- Modify: `siu-hei-bou-api/wrangler.toml` (fill `database_id`)

**Interfaces:**
- Produces: live API at `https://siu-hei-bou-api.hillmanchan.com` used by all frontend tasks.

⚠️ Needs Cloudflare credentials. If `npx wrangler whoami` fails, ask the user to run `! npx wrangler login` (interactive) before continuing.

- [ ] **Step 1: Install wrangler and check auth**

```bash
cd siu-hei-bou-api && npm install
npx wrangler whoami
```
Expected: prints the Cloudflare account (the one holding the hillmanchan.com zone). If not logged in, STOP and ask the user.

- [ ] **Step 2: Create the D1 database and apply schema**

```bash
npx wrangler d1 create siu-hei-bou-db
```
Copy the printed `database_id` into `wrangler.toml` (replace `PLACEHOLDER-SET-IN-TASK-5`). Then:
```bash
npx wrangler d1 execute siu-hei-bou-db --remote --file=schema.sql
npx wrangler d1 execute siu-hei-bou-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```
Expected: lists `users`, `friends`, `cards`, `grudges`.

- [ ] **Step 3: Deploy with custom domain**

```bash
npx wrangler deploy
```
Expected: deploy succeeds and registers custom domain `siu-hei-bou-api.hillmanchan.com` (wrangler creates the DNS record + cert automatically because the zone is on the same account). If the custom-domain step errors, retry once after 60s (cert provisioning lag).

- [ ] **Step 4: Smoke test the live API**

```bash
curl -s https://siu-hei-bou-api.hillmanchan.com/api/state | head -c 200; echo
curl -s -X POST https://siu-hei-bou-api.hillmanchan.com/public/cards/doesnotexist/ack | head -c 200; echo
curl -s -X OPTIONS -i https://siu-hei-bou-api.hillmanchan.com/api/state -H "Origin: https://siu-hei-bou.hillmanchan.com" | head -5
```
Expected: `{"error":"unauthorized"}` (401), `{"error":"not-found"}` (404), and a 204 with `Access-Control-Allow-Origin: https://siu-hei-bou.hillmanchan.com`.

- [ ] **Step 5: Commit**

```bash
git add siu-hei-bou-api/wrangler.toml siu-hei-bou-api/package.json siu-hei-bou-api/package-lock.json
git commit -m "feat(siu-hei-bou): provision D1 + deploy worker to siu-hei-bou-api.hillmanchan.com"
```
(Ensure `siu-hei-bou-api/node_modules/` is ignored — repo root `.gitignore` already ignores `node_modules`; verify with `git status`.)

---

### Task 6: Frontend foundation — Firebase, API client, App.js wiring, root + 封面

**Files:**
- Create: `portfolio/src/game/siu-hei-bou/firebase.js`, `portfolio/src/game/siu-hei-bou/api.js`, `portfolio/src/game/siu-hei-bou/svgs.jsx`, `portfolio/src/game/siu-hei-bou/SiuHeiBouGame.jsx`, `portfolio/src/game/siu-hei-bou/CoverPage.jsx`, `portfolio/src/game/siu-hei-bou/siuHeiBouStyles.css`
- Modify: `portfolio/src/App.js` (import at line ~22, map entry at line ~33, dev route at line ~75)

**Interfaces:**
- Produces (used by Tasks 7–10): `getFirebase()→Promise<{auth,provider,signInWithPopup,onAuthStateChanged,signOut}>`; `api.*` methods + `setTokenGetter(fn)` + `ApiError{status,code}`; `AngryFace({level,size})`, `StampSeal({filled,size})`, `GoogleG({size})` SVG components; root passes to pages: `navigate(path)`, `refresh()`, `state={friends,openCards}`, `toast(msg)`.
- Placeholder pages for HomePage/FriendPage/PublicCardPage are NOT created — the root renders inline stubs (`<p>` placeholders) replaced by Tasks 7–9; each later task deletes its stub line.

- [ ] **Step 1: Write `firebase.js`** (lazy dynamic import so firebase stays out of the portfolio main bundle and out of App.test's jsdom module graph — same reason da-siu-yan lazy-loads it)

```js
// Shared Firebase project (system-design-c84d3) — same public config casino-game uses.
let cached = null;

export async function getFirebase() {
  if (cached) return cached;
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = await import('firebase/auth');
  const app = getApps().length ? getApp() : initializeApp({
    apiKey: 'AIzaSyC2wBCjM1c8bX8VQP4vQbE_q-KoBrRY_vc',
    authDomain: 'system-design-c84d3.firebaseapp.com',
    projectId: 'system-design-c84d3',
    storageBucket: 'system-design-c84d3.firebasestorage.app',
    messagingSenderId: '547168317115',
    appId: '1:547168317115:web:f5130cde873096b7f3839e',
  });
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  cached = { auth, provider, signInWithPopup, onAuthStateChanged, signOut };
  return cached;
}
```

- [ ] **Step 2: Write `api.js`**

```js
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
};
```

- [ ] **Step 3: Write `svgs.jsx`** — hand-drawn look via wobbly strokes, NO emoji

```jsx
import React from 'react';

// 嬲爆面 — level 1 小嬲 / 2 中嬲 / 3 勁嬲. Hand-drawn wobbly circle + brows.
export function AngryFace({ level = 1, size = 32 }) {
  const brow = { 1: 'M9 13 L14 15', 2: 'M8 12 L14 15.5', 3: 'M7 11 L14 16' }[level];
  const browR = { 1: 'M23 13 L18 15', 2: 'M24 12 L18 15.5', 3: 'M25 11 L18 16' }[level];
  const mouth = {
    1: 'M12 22 Q16 20 20 22',                    // pout
    2: 'M12 23 Q16 19.5 20 23',                  // frown
    3: 'M12 24 Q16 18 20 24 Q16 26 12 24 Z',     // open shout
  }[level];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 C24 2.4 29.6 9 29 16 C28.4 24 23 29.6 16 29 C8 28.4 2.4 23 3 16 C3.6 8 9 3.6 16 3 Z"
        fill="var(--shb-face, #ffe3e0)" stroke="var(--shb-ink, #b3402f)" strokeWidth="1.6" strokeLinecap="round" />
      <path d={brow} stroke="var(--shb-ink, #b3402f)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d={browR} stroke="var(--shb-ink, #b3402f)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="17" r="1.4" fill="var(--shb-ink, #b3402f)" />
      <circle cx="20" cy="17" r="1.4" fill="var(--shb-ink, #b3402f)" />
      <path d={mouth} stroke="var(--shb-ink, #b3402f)" strokeWidth="1.8" strokeLinecap="round"
        fill={level === 3 ? 'var(--shb-ink, #b3402f)' : 'none'} />
      {level >= 2 && <path d="M24 7 L27 4 M26 9 L29.5 7" stroke="var(--shb-ink, #b3402f)" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

// 儲印卡格仔 — empty dashed slot, or a red ink seal with a tiny angry face.
export function StampSeal({ filled = false, size = 34 }) {
  if (!filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--shb-line, #d8c9b8)"
          strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shb-seal">
      <path d="M16 2.6 C24.8 2 30 9 29.4 16.4 C28.8 24.6 23 30 15.6 29.4 C7.8 28.8 2 23 2.6 15.6 C3.2 8 8.4 3.2 16 2.6 Z"
        fill="#c94f3d" opacity="0.9" />
      <g transform="translate(6.5 6.5) scale(0.6)" opacity="0.95">
        <path d="M8 12 L13 14.5 M24 12 L19 14.5" stroke="#fff2ec" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="11.5" cy="17.5" r="1.6" fill="#fff2ec" />
        <circle cx="20.5" cy="17.5" r="1.6" fill="#fff2ec" />
        <path d="M11 23.5 Q16 20 21 23.5" stroke="#fff2ec" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

export function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.1 0 11.2-2 15-5.5l-7.5-5.8c-2.1 1.4-4.7 2.2-7.5 2.2-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
```

- [ ] **Step 4: Write `SiuHeiBouGame.jsx`** (root: font/title, path routing, auth, data, toast)

```jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getFirebase } from './firebase';
import { api, setTokenGetter } from './api';
import CoverPage from './CoverPage';
import './siuHeiBouStyles.css';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&display=swap';

function getBase() {
  return window.location.pathname.startsWith('/siu-hei-bou') ? '/siu-hei-bou' : '';
}

function parsePath() {
  const base = getBase();
  const rest = window.location.pathname.slice(base.length) || '/';
  const cardMatch = rest.match(/^\/card\/([A-Za-z0-9_-]+)/);
  if (cardMatch) return { page: 'card', token: cardMatch[1] };
  return { page: 'app' };
}

export default function SiuHeiBouGame() {
  const [route, setRoute] = useState(parsePath);
  const [user, setUser] = useState(undefined);     // undefined=loading, null=signed out
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shb-state')) || null; } catch { return null; }
  });
  const [friendId, setFriendId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    document.title = '小氣簿';
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
    const onPop = () => { setRoute(parsePath()); setFriendId(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (route.page === 'card') return; // public page never loads Firebase
    let unsub = () => {};
    getFirebase().then(({ auth, onAuthStateChanged }) => {
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) setTokenGetter(() => u.getIdToken());
      });
    });
    return () => unsub();
  }, [route.page]);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const s = await api.state();
      setState(s);
      localStorage.setItem('shb-state', JSON.stringify(s));
    } catch {
      toast('load 唔到，遲啲再試');
    }
  }, [toast]);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  const login = useCallback(async () => {
    setLoginBusy(true);
    try {
      const { auth, provider, signInWithPopup } = await getFirebase();
      await signInWithPopup(auth, provider);
    } catch {
      toast('登入唔到，再試多次');
    } finally {
      setLoginBusy(false);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    const { auth, signOut } = await getFirebase();
    await signOut(auth);
    setState(null);
    localStorage.removeItem('shb-state');
    setFriendId(null);
  }, []);

  const friend = useMemo(
    () => (state && friendId ? state.friends.find((f) => f.id === friendId) || null : null),
    [state, friendId],
  );

  let content;
  if (route.page === 'card') {
    content = <p>PUBLIC CARD PAGE — Task 9 replaces this: token {route.token}</p>;
  } else if (user === undefined) {
    content = <div className="shb-loading">開緊本簿⋯</div>;
  } else if (!user) {
    content = <CoverPage onLogin={login} busy={loginBusy} />;
  } else if (friend) {
    content = <p>FRIEND PAGE — Task 8 replaces this: {friend.name}</p>;
  } else {
    content = <p>HOME PAGE — Task 7 replaces this</p>;
  }

  return (
    <div className="shb-root">
      {content}
      {toastMsg && <div className="shb-toast">{toastMsg}</div>}
    </div>
  );
}
```
(The three inline `<p>` stubs are intentionally ugly — Tasks 7, 8 and 9 replace them with `<HomePage …>`, `<FriendPage …>`, `<PublicCardPage token={route.token}>`. `logout`, `setFriendId`, `refresh`, `state`, `toast` are already in scope for those replacements.)

- [ ] **Step 5: Write `CoverPage.jsx`**

```jsx
import React from 'react';
import { GoogleG, AngryFace } from './svgs';

export default function CoverPage({ onLogin, busy }) {
  return (
    <div className="shb-cover">
      <div className="shb-cover-band" aria-hidden="true" />
      <div className="shb-cover-plate">
        <div className="shb-cover-face"><AngryFace level={2} size={56} /></div>
        <h1 className="shb-cover-title">小氣簿</h1>
        <p className="shb-cover-sub">小器之人，專用此簿</p>
      </div>
      <button type="button" className="shb-google-btn" onClick={onLogin} disabled={busy}>
        <GoogleG size={18} />
        <span>{busy ? '登入緊⋯' : '用 Google 開簿'}</span>
      </button>
      <p className="shb-cover-note">記低朋友激嬲你嘅事，儲滿印仔就叫佢請食飯</p>
    </div>
  );
}
```

- [ ] **Step 6: Write base `siuHeiBouStyles.css`** (tokens + shell + cover; later tasks append their own sections at the end of this file)

```css
/* ===== 小氣簿 — base tokens & shell ===== */
.shb-root {
  --shb-paper: #f7f0e3;
  --shb-paper-deep: #efe5d2;
  --shb-line: #d8c9b8;
  --shb-ink: #b3402f;
  --shb-ink-dark: #5a4632;
  --shb-face: #ffe3e0;
  --shb-cover: #b04a3a;
  --shb-cover-deep: #8e3a2d;
  --shb-accent: #e8a0a0;
  --shb-radius: 14px;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--shb-paper-deep);
  color: var(--shb-ink-dark);
  font-family: 'LXGW WenKai TC', 'PingFang HK', 'Microsoft JhengHei', serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
}
.shb-root * { box-sizing: border-box; }
.shb-root button { font-family: inherit; cursor: pointer; }

.shb-loading { margin: 40vh auto; font-size: 18px; }

.shb-toast {
  position: fixed; bottom: calc(24px + env(safe-area-inset-bottom)); left: 50%;
  transform: translateX(-50%);
  background: var(--shb-ink-dark); color: var(--shb-paper);
  padding: 10px 18px; border-radius: 20px; font-size: 15px; z-index: 60;
  animation: shb-pop-in 0.18s ease-out;
}
@keyframes shb-pop-in { from { transform: translateX(-50%) scale(0.8); opacity: 0; } }

/* ===== 封面 ===== */
.shb-cover {
  width: min(92vw, 400px); margin: 8vh auto 0; padding: 48px 24px 64px;
  background: linear-gradient(160deg, var(--shb-cover), var(--shb-cover-deep));
  border-radius: 10px 22px 22px 10px;
  box-shadow: inset 6px 0 0 rgba(0,0,0,0.18), 0 14px 30px rgba(90, 50, 30, 0.35);
  position: relative; text-align: center;
}
.shb-cover-band {
  position: absolute; top: 0; bottom: 0; right: 26px; width: 14px;
  background: #6f4a3d; opacity: 0.85; border-radius: 4px;
}
.shb-cover-plate {
  background: var(--shb-paper); border-radius: 8px;
  width: min(70%, 230px); margin: 0 auto; padding: 22px 12px 18px;
  box-shadow: 0 3px 0 rgba(0,0,0,0.15);
}
.shb-cover-face { margin-bottom: 6px; }
.shb-cover-title { font-size: 44px; font-weight: 700; letter-spacing: 10px; margin: 0; color: var(--shb-ink); }
.shb-cover-sub { font-size: 14px; letter-spacing: 4px; margin: 8px 0 0; }
.shb-google-btn {
  margin-top: 40px; display: inline-flex; align-items: center; gap: 10px;
  background: var(--shb-paper); border: none; border-radius: 24px;
  padding: 12px 26px; font-size: 17px; color: var(--shb-ink-dark);
  box-shadow: 0 4px 0 rgba(0,0,0,0.2);
}
.shb-google-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(0,0,0,0.2); }
.shb-google-btn:disabled { opacity: 0.7; }
.shb-cover-note { color: rgba(255, 240, 230, 0.85); font-size: 13px; margin-top: 18px; letter-spacing: 1px; }
```

- [ ] **Step 7: Wire `App.js`** — three one-line edits following the existing pattern exactly:

```js
// with the other game imports (after line 22):
import SiuHeiBouGame from './game/siu-hei-bou/SiuHeiBouGame';
// in GAME_SUBDOMAIN_COMPONENTS (after 'da-siu-yan' line 33):
  'siu-hei-bou': SiuHeiBouGame,
// with the standalone routes (after line 75) — note the /* so /card/:token works in dev:
        <Route path="/siu-hei-bou/*" element={<SiuHeiBouGame />} />
```

- [ ] **Step 8: Verify build + tests + dev render**

```bash
cd portfolio && CI=false npm run build && CI=true npx react-scripts test --watchAll=false
```
Expected: build succeeds; App.test passes (firebase is dynamically imported, so jsdom never loads it).
Then `npm start`, open `http://localhost:3000/siu-hei-bou` — expect the notebook cover with 「小氣簿」 and the Google button (clicking it will fail on localhost — the shared Firebase key blocks localhost referers; that's expected, full login is verified in Task 11).

- [ ] **Step 9: Commit**

```bash
git add portfolio/src/game/siu-hei-bou portfolio/src/App.js
git commit -m "feat(siu-hei-bou): frontend foundation — firebase, api client, cover page"
```

---

### Task 7: 罪人名單 (HomePage)

**Files:**
- Create: `portfolio/src/game/siu-hei-bou/HomePage.jsx`
- Modify: `portfolio/src/game/siu-hei-bou/SiuHeiBouGame.jsx` (replace HOME PAGE stub), `portfolio/src/game/siu-hei-bou/siuHeiBouStyles.css` (append section)

**Interfaces:**
- Consumes: `api.createFriend`, root's `state/refresh/toast/logout/setFriendId`.
- Produces: `<HomePage state refresh toast onSelect onLogout />`.

- [ ] **Step 1: Write `HomePage.jsx`**

```jsx
import React, { useState } from 'react';
import { api } from './api';

const COLOURS = ['#e8a0a0', '#a0c8e8', '#a8d8b0', '#e8d3a0', '#c9aee5', '#f0b8d0'];

export default function HomePage({ state, onSelect, refresh, toast, onLogout }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const friends = state ? state.friends : null;

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await api.createFriend({ name: trimmed, colour: COLOURS[(friends?.length || 0) % COLOURS.length] });
      setName('');
      await refresh();
    } catch {
      toast('加唔到，遲啲再試');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shb-page">
      <header className="shb-header">
        <h1>小氣簿</h1>
        <p>罪人名單</p>
      </header>

      {friends === null && <div className="shb-loading">揭緊頁⋯</div>}
      {friends && friends.length === 0 && (
        <p className="shb-empty">一個罪人都未有，<br />恭喜你，朋友都好乖。</p>
      )}

      <ul className="shb-tabs">
        {(friends || []).map((f) => (
          <li key={f.id}>
            <button type="button" className="shb-tab" style={{ '--tab': f.colour }} onClick={() => onSelect(f.id)}>
              <span className="shb-tab-name">{f.name}</span>
              <span className="shb-tab-progress">
                <span className="shb-tab-bar" style={{ width: `${Math.min(100, (f.stamps / f.threshold) * 100)}%` }} />
              </span>
              <span className="shb-tab-count">{f.stamps}/{f.threshold} 印</span>
              {f.stamps >= f.threshold && <span className="shb-tab-full">滿喇！</span>}
            </button>
          </li>
        ))}
      </ul>

      <form className="shb-add-friend" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="邊個激嬲你？" />
        <button type="submit" disabled={busy || !name.trim()}>加個罪人</button>
      </form>

      <footer className="shb-footer">
        <button type="button" className="shb-link" onClick={onLogout}>合埋本簿（登出）</button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Replace the HOME PAGE stub in `SiuHeiBouGame.jsx`**

Add `import HomePage from './HomePage';` and replace
`content = <p>HOME PAGE — Task 7 replaces this</p>;` with:
```jsx
    content = <HomePage state={state} onSelect={setFriendId} refresh={refresh} toast={toast} onLogout={logout} />;
```

- [ ] **Step 3: Append to `siuHeiBouStyles.css`**

```css
/* ===== 通用頁面 ===== */
.shb-page {
  width: min(100vw, 480px); flex: 1; padding: 18px 16px calc(96px + env(safe-area-inset-bottom));
  background:
    repeating-linear-gradient(transparent 0 30px, var(--shb-line) 30px 31px),
    var(--shb-paper);
  box-shadow: 0 0 24px rgba(90, 50, 30, 0.18);
  position: relative;
}
.shb-header { text-align: center; padding: 6px 0 14px; }
.shb-header h1 { font-size: 26px; letter-spacing: 8px; color: var(--shb-ink); margin: 0; }
.shb-header p { margin: 2px 0 0; font-size: 14px; letter-spacing: 3px; }
.shb-empty { text-align: center; margin: 48px 0; font-size: 16px; line-height: 2; opacity: 0.75; }

/* ===== 罪人 tabs ===== */
.shb-tabs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.shb-tab {
  width: 100%; display: grid; grid-template-columns: auto 1fr auto; align-items: center;
  gap: 6px 12px; padding: 14px 16px 14px 22px; border: none; text-align: left;
  background: var(--shb-paper); border-left: 10px solid var(--tab);
  border-radius: 6px var(--shb-radius) var(--shb-radius) 6px;
  box-shadow: 0 3px 0 rgba(90, 50, 30, 0.15); font-size: 17px; color: inherit;
}
.shb-tab:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(90, 50, 30, 0.15); }
.shb-tab-name { font-weight: 700; font-size: 18px; }
.shb-tab-progress {
  grid-column: 1 / 3; height: 8px; border-radius: 4px;
  background: var(--shb-paper-deep); overflow: hidden;
}
.shb-tab-bar { display: block; height: 100%; background: var(--shb-ink); border-radius: 4px; transition: width 0.4s ease; }
.shb-tab-count { font-size: 13px; opacity: 0.8; }
.shb-tab-full {
  grid-column: 3; grid-row: 1; font-size: 13px; color: var(--shb-paper);
  background: var(--shb-ink); border-radius: 12px; padding: 2px 10px;
  animation: shb-wiggle 1.4s ease-in-out infinite;
}
@keyframes shb-wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }

/* ===== 加個罪人 ===== */
.shb-add-friend { display: flex; gap: 10px; margin-top: 22px; }
.shb-add-friend input {
  flex: 1; border: 2px dashed var(--shb-line); border-radius: var(--shb-radius);
  background: transparent; padding: 12px 14px; font-family: inherit; font-size: 16px; color: inherit;
}
.shb-add-friend input:focus { outline: none; border-color: var(--shb-ink); }
.shb-add-friend button {
  border: none; background: var(--shb-ink); color: var(--shb-paper);
  border-radius: var(--shb-radius); padding: 0 18px; font-size: 16px;
  box-shadow: 0 3px 0 var(--shb-cover-deep);
}
.shb-add-friend button:disabled { opacity: 0.5; }
.shb-footer { text-align: center; margin-top: 36px; }
.shb-link { background: none; border: none; color: var(--shb-ink-dark); opacity: 0.7; font-size: 14px; text-decoration: underline; }
```

- [ ] **Step 4: Verify build**

Run: `cd portfolio && CI=false npm run build`
Expected: success, no eslint errors.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/siu-hei-bou
git commit -m "feat(siu-hei-bou): home page — 罪人名單 with stamp progress tabs"
```

---

### Task 8: 朋友頁 — 儲印卡 + 罪行紀錄 + 記一筆 sheet

**Files:**
- Create: `portfolio/src/game/siu-hei-bou/FriendPage.jsx`, `portfolio/src/game/siu-hei-bou/AddGrudgeSheet.jsx`
- Modify: `portfolio/src/game/siu-hei-bou/SiuHeiBouGame.jsx` (replace FRIEND PAGE stub), `portfolio/src/game/siu-hei-bou/siuHeiBouStyles.css` (append)

**Interfaces:**
- Consumes: `api.grudges/addGrudge/removeGrudge/openCard/settleCard`, `StampSeal`, `AngryFace`, `SHARE_BASE`.
- Produces: `<FriendPage friend openCards onBack refresh toast />`; `<AddGrudgeSheet friend onClose onSaved toast />`; `share(card)` message template (exact copy below — reused conceptually by Task 9's public page).

- [ ] **Step 1: Write `FriendPage.jsx`**

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { api, SHARE_BASE } from './api';
import { AngryFace, StampSeal } from './svgs';
import AddGrudgeSheet from './AddGrudgeSheet';

function BackChevron() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M20 5 L10 16 L20 27" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FriendPage({ friend, openCards, onBack, refresh, toast }) {
  const [grudges, setGrudges] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyCard, setBusyCard] = useState(false);

  const load = useCallback(async () => {
    try { setGrudges(await api.grudges(friend.id)); }
    catch { toast('load 唔到，遲啲再試'); }
  }, [friend.id, toast]);

  useEffect(() => { load(); }, [load]);

  const card = (openCards || []).find((c) => c.friend_id === friend.id);
  const full = friend.stamps >= friend.threshold;
  const nearly = !full && friend.stamps >= friend.threshold * 0.8;

  const share = useCallback(async (c) => {
    const url = `${SHARE_BASE}/card/${c.share_token}`;
    const text = `【小氣簿】你喺我本簿度已經儲滿 ${c.stamp_total} 個嬲爆印！睇下你做過啲乜 → ${url} 依家${c.reward}，一筆勾銷。`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled the share sheet */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast('已經 copy 咗，貼去 WhatsApp send 俾佢啦');
    }
  }, [toast]);

  const openCardNow = async () => {
    setBusyCard(true);
    try {
      const c = await api.openCard(friend.id);
      await refresh();
      await load();
      await share(c);
    } catch (e) {
      toast(e.code === 'threshold-not-met' ? '未儲夠印住' : '開唔到卡，遲啲再試');
    } finally {
      setBusyCard(false);
    }
  };

  const settle = async (c) => {
    try {
      await api.settleCard(c.id);
      await refresh();
      await load();
      toast('一筆勾銷！');
    } catch { toast('搞唔掂，遲啲再試'); }
  };

  const removeGrudge = async (g) => {
    try { await api.removeGrudge(g.id); await refresh(); await load(); }
    catch { toast('刪唔到，遲啲再試'); }
  };

  const slots = Array.from({ length: friend.threshold }, (_, i) => i < friend.stamps);

  return (
    <div className="shb-page">
      <header className="shb-friend-header" style={{ '--tab': friend.colour }}>
        <button type="button" className="shb-back" onClick={onBack} aria-label="返去名單"><BackChevron /></button>
        <h2>{friend.name}</h2>
        <span className="shb-friend-count">{friend.stamps}/{friend.threshold} 印</span>
      </header>

      {nearly && <div className="shb-banner">就快滿喇，{friend.name} 小心啲⋯</div>}

      <section className="shb-stampcard" aria-label="儲印卡">
        {slots.map((filled, i) => <StampSeal key={i} filled={filled} />)}
        {friend.stamps > friend.threshold && <span className="shb-over">+{friend.stamps - friend.threshold}</span>}
      </section>

      {full && !card && (
        <button type="button" className="shb-big-btn" onClick={openCardNow} disabled={busyCard}>
          {busyCard ? '開緊⋯' : `開找數卡（${friend.reward}）`}
        </button>
      )}

      {card && (
        <div className="shb-open-card">
          <p>
            {card.status === 'acknowledged'
              ? `佢認咗數喇！記住要佢${card.reward}`
              : `張找數卡開咗喇（${card.stamp_total} 印）`}
          </p>
          <div className="shb-open-card-actions">
            <button type="button" onClick={() => share(card)}>send 俾佢</button>
            <button type="button" onClick={() => settle(card)}>找咗數，一筆勾銷</button>
          </div>
        </div>
      )}

      <section className="shb-entries">
        <h3>罪行紀錄</h3>
        {grudges === null && <div className="shb-loading">揭緊頁⋯</div>}
        {grudges && grudges.length === 0 && <p className="shb-empty">未有紀錄，快啲記低第一筆</p>}
        <ul>
          {(grudges || []).map((g) => (
            <li key={g.id} className={g.card_id ? 'shb-entry shb-entry-claimed' : 'shb-entry'}>
              <span className="shb-entry-date">{g.occurred_at}</span>
              <AngryFace level={g.severity} size={26} />
              <p className="shb-entry-text">{g.content}</p>
              {!g.card_id && (
                <button type="button" className="shb-entry-del" aria-label="刪走佢" onClick={() => removeGrudge(g)}>×</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="shb-fab" onClick={() => setShowAdd(true)}>記一筆</button>

      {showAdd && (
        <AddGrudgeSheet
          friend={friend}
          onClose={() => setShowAdd(false)}
          onSaved={async () => { setShowAdd(false); await refresh(); await load(); }}
          toast={toast}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `AddGrudgeSheet.jsx`**

```jsx
import React, { useState } from 'react';
import { api } from './api';
import { AngryFace } from './svgs';

const LABELS = { 1: '小嬲', 2: '中嬲', 3: '勁嬲' };
const today = () => new Date().toISOString().slice(0, 10);

export default function AddGrudgeSheet({ friend, onClose, onSaved, toast }) {
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState(1);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      await api.addGrudge({ friend_id: friend.id, content: content.trim(), severity, occurred_at: date });
      await onSaved();
    } catch {
      toast('save 唔到，遲啲再試');
      setBusy(false);
    }
  };

  return (
    <div className="shb-sheet-mask" onClick={onClose}>
      <div className="shb-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>記一筆：{friend.name}</h3>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          maxLength={500} rows={4} autoFocus placeholder="佢今次做咗啲乜⋯"
        />
        <div className="shb-severity">
          {[1, 2, 3].map((lv) => (
            <button
              key={lv} type="button"
              className={severity === lv ? 'shb-sev shb-sev-on' : 'shb-sev'}
              onClick={() => setSeverity(lv)}
            >
              <AngryFace level={lv} size={34} />
              <span>{LABELS[lv]}（{lv} 印）</span>
            </button>
          ))}
        </div>
        <div className="shb-sheet-row">
          <label>幾時發生：
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <span className="shb-count">{content.length}/500</span>
        </div>
        <div className="shb-sheet-actions">
          <button type="button" className="shb-link" onClick={onClose}>算數</button>
          <button type="button" className="shb-big-btn" onClick={save} disabled={busy || !content.trim()}>
            {busy ? '記緊⋯' : '記低佢'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace the FRIEND PAGE stub in `SiuHeiBouGame.jsx`**

Add `import FriendPage from './FriendPage';` and replace
`content = <p>FRIEND PAGE — Task 8 replaces this: {friend.name}</p>;` with:
```jsx
    content = (
      <FriendPage friend={friend} openCards={state ? state.openCards : []}
        onBack={() => setFriendId(null)} refresh={refresh} toast={toast} />
    );
```

- [ ] **Step 4: Append to `siuHeiBouStyles.css`**

```css
/* ===== 朋友頁 ===== */
.shb-friend-header {
  display: flex; align-items: center; gap: 10px; padding: 4px 0 12px;
  border-bottom: 3px solid var(--tab, var(--shb-accent));
}
.shb-back { background: none; border: none; color: var(--shb-ink-dark); padding: 6px; display: flex; }
.shb-friend-header h2 { margin: 0; font-size: 22px; flex: 1; }
.shb-friend-count { font-size: 14px; opacity: 0.8; }
.shb-banner {
  margin: 12px 0 0; padding: 10px 14px; border-radius: var(--shb-radius);
  background: #fbe6c9; border: 1.5px dashed #d9a05b; font-size: 14px; text-align: center;
}

/* ===== 儲印卡 ===== */
.shb-stampcard {
  margin: 16px 0; padding: 14px; display: flex; flex-wrap: wrap; gap: 10px;
  justify-content: center; align-items: center;
  background: var(--shb-paper); border: 2px solid var(--shb-line); border-radius: var(--shb-radius);
  box-shadow: 0 3px 0 rgba(90, 50, 30, 0.12);
}
.shb-seal { animation: shb-stamp-pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1); }
@keyframes shb-stamp-pop { from { transform: scale(1.8) rotate(-14deg); opacity: 0; } }
.shb-over { font-size: 15px; color: var(--shb-ink); font-weight: 700; }

.shb-big-btn {
  display: block; width: 100%; border: none; margin: 10px 0;
  background: var(--shb-ink); color: var(--shb-paper); font-size: 18px;
  padding: 14px; border-radius: var(--shb-radius); box-shadow: 0 4px 0 var(--shb-cover-deep);
  animation: shb-wiggle 1.6s ease-in-out infinite;
}
.shb-big-btn:disabled { opacity: 0.6; animation: none; }

.shb-open-card {
  margin: 12px 0; padding: 12px 14px; border-radius: var(--shb-radius);
  background: #f6e3df; border: 2px solid var(--shb-accent); font-size: 15px;
}
.shb-open-card p { margin: 0 0 10px; }
.shb-open-card-actions { display: flex; gap: 10px; }
.shb-open-card-actions button {
  flex: 1; border: none; border-radius: 10px; padding: 10px; font-size: 15px;
  background: var(--shb-paper); box-shadow: 0 2px 0 rgba(90, 50, 30, 0.2); color: inherit;
}

/* ===== 罪行紀錄 ===== */
.shb-entries h3 { font-size: 16px; letter-spacing: 3px; margin: 18px 0 8px; color: var(--shb-ink); }
.shb-entries ul { list-style: none; margin: 0; padding: 0; }
.shb-entry {
  display: grid; grid-template-columns: auto auto 1fr auto; align-items: start; gap: 10px;
  padding: 10px 4px; border-bottom: 1px dashed var(--shb-line);
}
.shb-entry-date { font-size: 12px; opacity: 0.65; padding-top: 5px; white-space: nowrap; }
.shb-entry-text { margin: 0; font-size: 16px; line-height: 1.6; word-break: break-word; }
.shb-entry-claimed { opacity: 0.45; }
.shb-entry-del { background: none; border: none; font-size: 20px; color: var(--shb-ink); opacity: 0.6; padding: 0 6px; }

/* ===== FAB + bottom sheet ===== */
.shb-fab {
  position: fixed; bottom: calc(22px + env(safe-area-inset-bottom)); right: calc(50% - min(50vw, 240px) + 18px);
  border: none; background: var(--shb-ink); color: var(--shb-paper);
  font-size: 17px; padding: 14px 22px; border-radius: 30px;
  box-shadow: 0 5px 14px rgba(90, 30, 20, 0.4); z-index: 30;
}
.shb-sheet-mask {
  position: fixed; inset: 0; background: rgba(60, 40, 30, 0.45); z-index: 50;
  display: flex; align-items: flex-end; justify-content: center;
}
.shb-sheet {
  width: min(100vw, 480px); background: var(--shb-paper);
  border-radius: 22px 22px 0 0; padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
  animation: shb-sheet-up 0.25s ease-out;
}
@keyframes shb-sheet-up { from { transform: translateY(40%); } }
.shb-sheet h3 { margin: 0 0 12px; font-size: 18px; color: var(--shb-ink); }
.shb-sheet textarea {
  width: 100%; border: none; resize: none; font-family: inherit; font-size: 17px; color: inherit;
  background: repeating-linear-gradient(transparent 0 29px, var(--shb-line) 29px 30px);
  line-height: 30px; padding: 0 2px; min-height: 120px;
}
.shb-sheet textarea:focus { outline: none; }
.shb-severity { display: flex; gap: 10px; margin: 14px 0 4px; }
.shb-sev {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: var(--shb-paper-deep); border: 2px solid transparent; border-radius: var(--shb-radius);
  padding: 10px 4px; font-size: 13px; color: inherit;
}
.shb-sev-on { border-color: var(--shb-ink); background: var(--shb-face); }
.shb-sheet-row { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; font-size: 14px; }
.shb-sheet-row input[type='date'] { font-family: inherit; border: 1px solid var(--shb-line); border-radius: 8px; padding: 4px 8px; background: transparent; color: inherit; }
.shb-count { opacity: 0.6; font-size: 13px; }
.shb-sheet-actions { display: flex; gap: 12px; align-items: center; }
.shb-sheet-actions .shb-big-btn { flex: 1; margin: 0; animation: none; }
```

- [ ] **Step 5: Verify build**

Run: `cd portfolio && CI=false npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add portfolio/src/game/siu-hei-bou
git commit -m "feat(siu-hei-bou): friend page with stamp card, grudge diary, add-grudge sheet"
```

---

### Task 9: 找數卡 public page (`/card/:token`)

**Files:**
- Create: `portfolio/src/game/siu-hei-bou/PublicCardPage.jsx`
- Modify: `portfolio/src/game/siu-hei-bou/SiuHeiBouGame.jsx` (replace PUBLIC CARD stub), `portfolio/src/game/siu-hei-bou/siuHeiBouStyles.css` (append)

**Interfaces:**
- Consumes: `api.publicCard(token)` → `{card, friendName, grudges}`, `api.ackCard(token)`, `StampSeal`, `AngryFace`, `ApiError`.
- Produces: `<PublicCardPage token />` — works with NO login (never touches Firebase).

- [ ] **Step 1: Write `PublicCardPage.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { api } from './api';
import { AngryFace, StampSeal } from './svgs';

export default function PublicCardPage({ token }) {
  const [data, setData] = useState(undefined); // undefined=loading, null=not found
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.publicCard(token).then(setData).catch(() => setData(null));
  }, [token]);

  const ack = async () => {
    setBusy(true);
    try {
      const card = await api.ackCard(token);
      setData((d) => ({ ...d, card }));
    } catch { /* stays open; user can retry */ }
    finally { setBusy(false); }
  };

  if (data === undefined) return <div className="shb-loading">開緊張卡⋯</div>;
  if (data === null) {
    return (
      <div className="shb-coupon shb-coupon-missing">
        <AngryFace level={1} size={64} />
        <h2>搵唔到呢張卡喎</h2>
        <p>可能條 link 唔啱，或者張卡已經唔存在。</p>
      </div>
    );
  }

  const { card, friendName, grudges } = data;
  return (
    <div className="shb-coupon">
      <p className="shb-coupon-tag">小氣簿・找數卡</p>
      <h2 className="shb-coupon-name">{friendName}</h2>
      <p className="shb-coupon-lede">你已經儲滿 {card.stamp_total} 個嬲爆印</p>

      <div className="shb-stampcard">
        {Array.from({ length: card.stamp_total }, (_, i) => <StampSeal key={i} filled size={30} />)}
      </div>

      <h3 className="shb-coupon-listtitle">罪行清單</h3>
      <ul className="shb-coupon-list">
        {grudges.map((g, i) => (
          <li key={i}>
            <span className="shb-entry-date">{g.occurred_at}</span>
            <AngryFace level={g.severity} size={22} />
            <p>{g.content}</p>
          </li>
        ))}
      </ul>

      <p className="shb-coupon-demand">{card.reward}啦！</p>

      {card.status === 'open' && (
        <button type="button" className="shb-big-btn" onClick={ack} disabled={busy}>
          {busy ? '認緊⋯' : '好啦好啦，我認數'}
        </button>
      )}
      {card.status === 'acknowledged' && <p className="shb-coupon-status">已認數 — 記住{card.reward}呀</p>}
      {card.status === 'settled' && <p className="shb-coupon-status">已找數，一筆勾銷</p>}

      <a className="shb-coupon-footer" href="https://siu-hei-bou.hillmanchan.com">由小氣簿發出 — 你都想記朋友仇？</a>
    </div>
  );
}
```

- [ ] **Step 2: Replace the PUBLIC CARD stub in `SiuHeiBouGame.jsx`**

Add `import PublicCardPage from './PublicCardPage';` and replace
`content = <p>PUBLIC CARD PAGE — Task 9 replaces this: token {route.token}</p>;` with:
```jsx
    content = <PublicCardPage token={route.token} />;
```

- [ ] **Step 3: Append to `siuHeiBouStyles.css`**

```css
/* ===== 找數卡（公開頁）===== */
.shb-coupon {
  width: min(92vw, 420px); margin: 6vh auto; padding: 26px 20px 22px; text-align: center;
  background: var(--shb-paper); border-radius: var(--shb-radius);
  border: 2px solid var(--shb-ink);
  outline: 6px solid var(--shb-paper); outline-offset: -10px;
  box-shadow: 0 14px 30px rgba(90, 50, 30, 0.3);
}
.shb-coupon-missing { border-style: dashed; padding-top: 40px; }
.shb-coupon-tag { letter-spacing: 5px; font-size: 13px; color: var(--shb-ink); margin: 0; }
.shb-coupon-name { font-size: 30px; margin: 10px 0 2px; }
.shb-coupon-lede { margin: 0 0 8px; font-size: 15px; opacity: 0.85; }
.shb-coupon-listtitle { font-size: 15px; letter-spacing: 3px; color: var(--shb-ink); margin: 14px 0 6px; }
.shb-coupon-list { list-style: none; padding: 0; margin: 0 0 8px; text-align: left; }
.shb-coupon-list li {
  display: grid; grid-template-columns: auto auto 1fr; gap: 8px; align-items: start;
  padding: 7px 2px; border-bottom: 1px dashed var(--shb-line);
}
.shb-coupon-list p { margin: 0; font-size: 15px; line-height: 1.55; word-break: break-word; }
.shb-coupon-demand { font-size: 34px; font-weight: 700; color: var(--shb-ink); margin: 16px 0 8px; animation: shb-wiggle 1.4s ease-in-out infinite; }
.shb-coupon-status {
  display: inline-block; margin: 10px 0; padding: 8px 18px; font-size: 16px;
  color: var(--shb-ink); border: 2px solid var(--shb-ink); border-radius: 8px; transform: rotate(-4deg);
}
.shb-coupon-footer { display: block; margin-top: 16px; font-size: 12px; color: var(--shb-ink-dark); opacity: 0.65; }
```

- [ ] **Step 4: Verify end-to-end against the live API with seeded data**

```bash
cd siu-hei-bou-api
npx wrangler d1 execute siu-hei-bou-db --remote --command "
INSERT INTO users (uid,email) VALUES ('seed-uid','seed@test.local') ON CONFLICT(uid) DO NOTHING;
INSERT INTO friends (uid,name,threshold,reward) VALUES ('seed-uid','測試阿明',10,'請食飯');
INSERT INTO cards (share_token,uid,friend_id,stamp_total,reward) VALUES ('seedtoken1234567890abcd','seed-uid',last_insert_rowid(),10,'請食飯');
INSERT INTO grudges (uid,friend_id,content,severity,occurred_at,card_id)
  SELECT 'seed-uid', c.friend_id, '約食飯遲到成個鐘', 2, '2026-08-01', c.id FROM cards c WHERE c.share_token='seedtoken1234567890abcd';
"
curl -s https://siu-hei-bou-api.hillmanchan.com/public/cards/seedtoken1234567890abcd | head -c 400; echo
```
Expected: JSON with `friendName: "測試阿明"` and one grudge.
Then `cd ../portfolio && npm start`, open `http://localhost:3000/siu-hei-bou/card/seedtoken1234567890abcd` — the coupon renders; tap 「好啦好啦，我認數」 → status flips to 已認數 (persists on reload). Finally clean up:
```bash
cd ../siu-hei-bou-api
npx wrangler d1 execute siu-hei-bou-db --remote --command "
DELETE FROM grudges WHERE uid='seed-uid'; DELETE FROM cards WHERE uid='seed-uid';
DELETE FROM friends WHERE uid='seed-uid'; DELETE FROM users WHERE uid='seed-uid';"
```

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/siu-hei-bou
git commit -m "feat(siu-hei-bou): public 找數卡 page with 認數 flow"
```

---

### Task 10: 設定 sheet — per-friend threshold/reward/name/colour, card history, delete

**Files:**
- Create: `portfolio/src/game/siu-hei-bou/SettingsSheet.jsx`
- Modify: `portfolio/src/game/siu-hei-bou/FriendPage.jsx` (add settings button + sheet), `portfolio/src/game/siu-hei-bou/siuHeiBouStyles.css` (append)

**Interfaces:**
- Consumes: `api.updateFriend/deleteFriend/cards/settleCard`.
- Produces: `<SettingsSheet friend onClose refresh toast onDeleted />`.

- [ ] **Step 1: Write `SettingsSheet.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { api } from './api';

const COLOURS = ['#e8a0a0', '#a0c8e8', '#a8d8b0', '#e8d3a0', '#c9aee5', '#f0b8d0'];
const STATUS_LABEL = { open: '未認數', acknowledged: '已認數', settled: '已找數' };

export default function SettingsSheet({ friend, onClose, refresh, toast, onDeleted }) {
  const [name, setName] = useState(friend.name);
  const [colour, setColour] = useState(friend.colour);
  const [threshold, setThreshold] = useState(friend.threshold);
  const [reward, setReward] = useState(friend.reward);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.cards(friend.id).then(setHistory).catch(() => setHistory([]));
  }, [friend.id]);

  const save = async () => {
    const t = Number(threshold);
    if (!name.trim() || !reward.trim() || !Number.isInteger(t) || t < 1 || t > 100) {
      toast('啲設定唔啱喎，檢查下');
      return;
    }
    setBusy(true);
    try {
      await api.updateFriend(friend.id, { name: name.trim(), colour, threshold: t, reward: reward.trim() });
      await refresh();
      toast('save 咗喇');
      onClose();
    } catch {
      toast('save 唔到，遲啲再試');
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await api.deleteFriend(friend.id);
      await refresh();
      onDeleted();
    } catch {
      toast('刪唔到，遲啲再試');
      setBusy(false);
    }
  };

  return (
    <div className="shb-sheet-mask" onClick={onClose}>
      <div className="shb-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>設定：{friend.name}</h3>

        <label className="shb-field">改名
          <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="shb-field">
          <span>書籤顏色</span>
          <div className="shb-swatches">
            {COLOURS.map((c) => (
              <button key={c} type="button" aria-label={`顏色 ${c}`}
                className={c === colour ? 'shb-swatch shb-swatch-on' : 'shb-swatch'}
                style={{ background: c }} onClick={() => setColour(c)} />
            ))}
          </div>
        </div>
        <label className="shb-field">滿卡要幾多印（1–100）
          <input type="number" min={1} max={100} value={threshold}
            onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))} />
        </label>
        <label className="shb-field">滿咗要佢做乜
          <input value={reward} maxLength={30} placeholder="請食飯" onChange={(e) => setReward(e.target.value)} />
        </label>

        <h4 className="shb-history-title">找數紀錄</h4>
        {history === null && <div className="shb-loading">睇緊⋯</div>}
        {history && history.length === 0 && <p className="shb-empty-small">未開過找數卡</p>}
        <ul className="shb-history">
          {(history || []).map((c) => (
            <li key={c.id}>
              <span>{c.created_at.slice(0, 10)}</span>
              <span>{c.stamp_total} 印・{c.reward}</span>
              <span className="shb-history-status">{STATUS_LABEL[c.status]}</span>
            </li>
          ))}
        </ul>

        <div className="shb-sheet-actions">
          {!confirmDelete && (
            <button type="button" className="shb-link shb-danger" onClick={() => setConfirmDelete(true)}>
              刪走呢個罪人
            </button>
          )}
          {confirmDelete && (
            <button type="button" className="shb-link shb-danger" onClick={del} disabled={busy}>
              真係刪？所有紀錄一齊冇㗎（撳多次確認）
            </button>
          )}
          <button type="button" className="shb-big-btn" onClick={save} disabled={busy}>save 設定</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `FriendPage.jsx`**

Add `import SettingsSheet from './SettingsSheet';` and `const [showSettings, setShowSettings] = useState(false);`. In the header, after `shb-friend-count`, add:
```jsx
        <button type="button" className="shb-gear" aria-label="設定" onClick={() => setShowSettings(true)}>
          <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M6 26 L20 6 L26 10 L12 30 L5 31 Z M18 9 L23 13"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </button>
```
(a pencil doodle, matching the notebook theme). At the bottom, next to the AddGrudgeSheet block, add:
```jsx
      {showSettings && (
        <SettingsSheet friend={friend} onClose={() => setShowSettings(false)}
          refresh={refresh} toast={toast} onDeleted={onBack} />
      )}
```

- [ ] **Step 3: Append to `siuHeiBouStyles.css`**

```css
/* ===== 設定 sheet ===== */
.shb-gear { background: none; border: none; color: var(--shb-ink-dark); opacity: 0.7; padding: 6px; display: flex; }
.shb-field { display: block; margin: 12px 0; font-size: 14px; }
.shb-field input {
  display: block; width: 100%; margin-top: 6px; padding: 10px 12px; font-family: inherit; font-size: 16px;
  border: 2px dashed var(--shb-line); border-radius: 10px; background: transparent; color: inherit;
}
.shb-field input:focus { outline: none; border-color: var(--shb-ink); }
.shb-swatches { display: flex; gap: 10px; margin-top: 8px; }
.shb-swatch { width: 34px; height: 34px; border-radius: 50%; border: 3px solid transparent; }
.shb-swatch-on { border-color: var(--shb-ink-dark); }
.shb-history-title { font-size: 14px; letter-spacing: 3px; color: var(--shb-ink); margin: 16px 0 6px; }
.shb-history { list-style: none; margin: 0 0 10px; padding: 0; font-size: 13px; }
.shb-history li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 2px; border-bottom: 1px dashed var(--shb-line); }
.shb-history-status { color: var(--shb-ink); }
.shb-empty-small { font-size: 13px; opacity: 0.6; margin: 4px 0 10px; }
.shb-danger { color: #a03030; }
```

- [ ] **Step 4: Verify build**

Run: `cd portfolio && CI=false npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/siu-hei-bou
git commit -m "feat(siu-hei-bou): per-friend settings, card history, delete friend"
```

---

### Task 11: Infra cutover — CloudFront alias, Cloudflare DNS, Firebase authorized domain

**Files:** none (infrastructure only)

**Interfaces:**
- Produces: `https://siu-hei-bou.hillmanchan.com` serving the portfolio SPA over TLS (it will show the main portfolio until the PR merges — hostname mapping ships with the code; that's expected).

Per the repo's subdomain checklist: a Cloudflare CNAME alone TLS-fails — the CloudFront alias on `E2SYHEFLV89R32` must ALSO be added (the `*.hillmanchan.com` wildcard cert already covers it).

- [ ] **Step 1: Add the CloudFront alternate domain**

```bash
aws cloudfront get-distribution-config --id E2SYHEFLV89R32 > /tmp/cf.json
jq -r '.DistributionConfig.Aliases.Items' /tmp/cf.json          # confirm current aliases
ETAG=$(jq -r '.ETag' /tmp/cf.json)
jq '.DistributionConfig
    | .Aliases.Items += ["siu-hei-bou.hillmanchan.com"]
    | .Aliases.Quantity = (.Aliases.Items | length)' /tmp/cf.json > /tmp/cf-config.json
aws cloudfront update-distribution --id E2SYHEFLV89R32 \
  --distribution-config file:///tmp/cf-config.json --if-match "$ETAG"
aws cloudfront get-distribution-config --id E2SYHEFLV89R32 \
  --query 'DistributionConfig.Aliases.Items' --output json
CF_DOMAIN=$(jq -r '.DistributionConfig | .Comment as $c | .' /tmp/cf.json >/dev/null; aws cloudfront get-distribution --id E2SYHEFLV89R32 --query 'Distribution.DomainName' --output text)
echo "$CF_DOMAIN"
```
Expected: alias list now includes `siu-hei-bou.hillmanchan.com`; `$CF_DOMAIN` prints `dXXXX.cloudfront.net`.

- [ ] **Step 2: Add the Cloudflare DNS record (user-assist)**

Ask the user to add in the Cloudflare dashboard (hillmanchan.com zone) — same as the other game subdomains:
- Type `CNAME`, name `siu-hei-bou`, target `<the dXXXX.cloudfront.net from Step 1>`, proxy **OFF (grey cloud, DNS only)**.

- [ ] **Step 3: Add Firebase authorized domain (user-assist)**

Ask the user to open [Firebase console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/system-design-c84d3/authentication/settings) and add `siu-hei-bou.hillmanchan.com`. Also check the API key's HTTP-referrer allowlist in Google Cloud console (the one that blocks localhost) — if it enumerates subdomains rather than `*.hillmanchan.com/*`, add `siu-hei-bou.hillmanchan.com/*`.

- [ ] **Step 4: Verify TLS + routing (after DNS propagates, ~2 min)**

```bash
curl -sI https://siu-hei-bou.hillmanchan.com | head -5
```
Expected: `HTTP/2 200` (currently the portfolio home — the hostname mapping arrives with the merge). No TLS error. If TLS fails, the CloudFront alias didn't take — recheck Step 1.

---

### Task 12: Docs + PR (stop before merge)

**Files:**
- Modify: `README.md` (repo root — add one game-table row ONLY; the file has unrelated uncommitted edits from another session)

**Interfaces:** none.

- [ ] **Step 1: Add the README row carefully**

Run `git diff README.md` first — do NOT revert or include the other session's edits. In the "Games and Interactive Demos" table add:
```markdown
| **小氣簿 Siu Hei Bou** | Cantonese grudge notebook — log each 嬲爆事件 per friend, severity-weighted stamps fill a per-friend card, full card opens a public 找數卡 link telling them to treat you a meal. Google login, Cloudflare Worker + D1 backend | `siu-hei-bou` |
```
Also update the "Nine standalone apps" count to "Ten".

- [ ] **Step 2: Commit ONLY the intended hunk**

```bash
git add -p README.md   # pick only the game-table row + count hunks
git commit -m "docs: add 小氣簿 to the games table"
```

- [ ] **Step 3: Full worker test suite one last time**

```bash
cd siu-hei-bou-api && npm test && cd ../portfolio && CI=false npm run build
```
Expected: all pass.

- [ ] **Step 4: Push branch + open PR**

```bash
git push -u origin feat/siu-hei-bou
gh pr create --title "小氣簿 (siu-hei-bou) — Cantonese grudge-notebook app with Cloudflare D1 backend" --body "$(cat <<'EOF'
## Summary
- New app at siu-hei-bou.hillmanchan.com: 廣東話記仇簿 — log grudges per friend, severity-weighted stamps (小嬲/中嬲/勁嬲 = 1/2/3 印), full card opens a public 找數卡 share link (friend needs no account) demanding 請食飯.
- Frontend: React component in the portfolio build, hostname-routed like card-drawer; Google login via the shared Firebase project like casino-game.
- Backend: NEW stack — Cloudflare Worker + D1 (siu-hei-bou-api/, deployed to siu-hei-bou-api.hillmanchan.com), Firebase ID tokens verified via WebCrypto/JWKS, `node --test` suite.
- Spec: docs/superpowers/specs/2026-08-08-siu-hei-bou-design.md

## Test plan
- [x] Worker unit tests (logic, auth, handlers, router)
- [x] Live API smoke tests (401/404/CORS)
- [x] Public 找數卡 page verified against seeded D1 data
- [ ] Post-merge: full login → record → open card → share → 認數 → settle loop on production (Task 13)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Wg7FW4FHWoLuKW6bVRWdCc
EOF
)"
```

- [ ] **Step 5: STOP — report PR URL and wait for the user's explicit merge instruction** (repo rule: no premature merges).

---

### Task 13: Post-merge production verification (run only after the user merges)

**Files:** none.

- [ ] **Step 1: Wait for deploy**

After merge, watch the GitHub Action: `gh run watch $(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId')`. Expected: deploy job green.

- [ ] **Step 2: Full user-perspective loop on production**

Using claude-in-chrome on `https://siu-hei-bou.hillmanchan.com` (mobile-sized window, 390×844):
1. Cover page renders with the notebook design and LXGW WenKai TC font loads.
2. Google login works (user may need to complete the popup).
3. 加個罪人 → friend tab appears.
4. 記一筆 ×4 with 勁嬲 (3 印) — stamp card fills with pop animation, 「就快滿喇」 banner at 8+, 滿喇 at 10+.
5. 開找數卡 → share sheet/copy fires; open the `/card/<token>` link in a fresh incognito-style tab (no login) → coupon renders; 認數 → status flips.
6. Back in the app: friend page shows 認咗數; 找咗數 → stamp card resets to 0; history shows the settled card.
7. Settings: change threshold/reward/name/colour → persists after reload; delete a test friend → gone.
8. No console errors (`read_console_messages`), no failed network requests.

- [ ] **Step 3: Clean up test data** (delete the test friend in-app, which cascades grudges + cards).

- [ ] **Step 4: Report done** with what was verified.

---

## Self-Review Notes

- **Spec coverage:** single-account + share link (T8/T9), severity stamps + per-friend threshold (T1/T3/T8), domain + hosting method (T6/T11), D1 schema verbatim (T1), all 13 API routes (T3/T4), notebook UI pages 封面/名單/朋友頁/記一筆/找數卡/設定 (T6–T10), share template (T8), 80% banner (T8), cute 404 (T9), rate-limited one-way ack (T4), localStorage cache (T6), `node --test` (T1–T4), infra checklist (T5/T11), PR flow (T12), user-perspective done-check (T13). 年度回顧/share image/photos correctly absent (out of scope v1).
- **Type consistency:** `handlers.*(ctx, {params, body, query})` ↔ router dispatch (T4); `api.*` names match component call sites; `share_token` regex identical in router, seed token (23 chars would fail — the seed token `seedtoken1234567890abcd` is 23 chars: router accepts any length `[A-Za-z0-9_-]+`, fine); `stamps` computed field name consistent (db → HomePage/FriendPage).
- **Known compromises (accepted):** per-isolate rate limiter; `upsertUser` only on `getState`; login untestable on localhost (verified in T13); e2e deferred to post-merge because deploy = merge-to-main.
