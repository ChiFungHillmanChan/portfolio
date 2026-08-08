# 小氣簿 — Offline PWA + IndexedDB sync

Date: 2026-08-08
Status: approved, ready to implement

## Goal

小氣簿 works with no network: the whole book is readable, and 嬲爆事 can be
written, edited and deleted offline. Writes queue in IndexedDB and push when the
network returns. Two phones on the **same Google account** converge without
losing data or silently duplicating it.

## Non-goals

- 開卡 (`openCard`), 找數 (`settleCard`), 撕爛本簿 (`deleteMe`), and the public
  `/public/cards/*` ack stay **online-only**. `openCard` mints an unguessable
  share token, checks the threshold against authoritative stamps, and claims all
  open grudges in one atomic D1 batch — none of that is safely replayable from a
  client.
- No multi-account switching UX. Records are uid-tagged as a safety invariant,
  not as a feature.
- No background sync, no polling, no push. Sync runs on app open/foreground and
  on reconnect.
- Re-applying a server-rejected edit as a fresh grudge. Out of scope.

## Current state (what exists today)

- Frontend `portfolio/src/game/siu-hei-bou/`, in the main CRA bundle,
  hostname-routed. Shell SW `portfolio/public/sw.js` already precaches
  `/index.html` + hashed `/static/` bundles and skips `/games/`, so the app
  shell already boots offline.
- `GET /api/state` returns only `friends` + `openCards`. Grudge bodies are
  fetched per-chapter via `GET /api/grudges?friend_id=`. **Offline, every
  chapter is blank.**
- `localStorage['shb-state']` caches the state blob, un-namespaced by uid.
- Google Font `LXGW WenKai TC` is cross-origin; the shell SW returns early on
  cross-origin, so offline the handwriting font falls back to a system font.
- `friends.id` / `grudges.id` are D1 `AUTOINCREMENT` — server-assigned.
- All writes `await api.*()` then `refresh()`; on failure the data is lost.

## Architecture

Server is the single source of truth. The device holds:

- a **mirror** — a disposable, wholesale-replaced copy of the server's answer.
  Never merged into, so no code path can corrupt it.
- an **outbox** — an ordered log of local mutations. The only precious data on
  the device.

What the UI renders is a pure projection of the two.

```
IndexedDB "shb"
  mirror  (keyPath uid)   { uid, etag, pulledAt, friends[], grudges[], cards[] }
  outbox  (keyPath seq, autoIncrement)
                          { seq, uid, op, payload, clientId, friendClientId?,
                            tries, state, lastError, createdAt }
                          // state: 'pending' (will retry) | 'permanent' (dead, shown on 未寄出)
  meta    (keyPath k)     { k, v }        // last flush time etc.

projectBook(mirror, outbox) -> { friends, grudges, cards }   // pure
```

`localStorage['shb-state']` is removed on first boot of the new version and
never written again.

---

## 1. Database migration

`siu-hei-bou-api/sql/2026-08-08-client-ids.sql`, idempotent, and mirrored into
`schema.sql`:

```sql
ALTER TABLE friends ADD COLUMN client_id TEXT;
ALTER TABLE grudges ADD COLUMN client_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_friends_client
  ON friends(uid, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grudges_client
  ON grudges(uid, client_id) WHERE client_id IS NOT NULL;
```

SQLite refuses `ALTER TABLE ... ADD COLUMN ... UNIQUE`, hence the separate
index. It is **partial** so pre-existing rows (all `client_id IS NULL`) stay out
of it.

`ALTER TABLE` is not idempotent in SQLite. Applying this file twice errors on
the ALTERs. That is acceptable for a one-shot migration — apply once, verify
with `PRAGMA table_info(grudges)`.

Apply:

```bash
cd siu-hei-bou-api
npx wrangler d1 execute siu-hei-bou-db --remote --file=sql/2026-08-08-client-ids.sql
```

(Retry on `Authentication error [code: 10000]` — it is intermittent and
succeeds on retry.)

Verified query plans against a local sqlite copy of `schema.sql` — all
`SEARCH ... USING INDEX`, no `SCAN TABLE`:

```
SELECT * FROM grudges WHERE uid = ?      -> SEARCH USING idx_grudges_uid_friend (uid=?)
SELECT * FROM cards   WHERE uid = ?      -> SEARCH USING idx_cards_uid_friend   (uid=?)
SELECT * FROM grudges WHERE uid=? AND client_id=?
                                         -> SEARCH USING idx_grudges_client (uid=? AND client_id=?)
```

## 2. Idempotent inserts

`client_id` is the idempotency key. Without it the failure mode is: phone posts
a grudge on a dying connection, the server commits, the response is lost, the
outbox retries — and the grudge exists twice with no way to tell which is real.

`db.mjs` `createFriend` / `createGrudge` become upserts:

```sql
INSERT INTO grudges (uid, friend_id, content, severity, occurred_at, client_id)
VALUES (?1, ?2, ?3, ?4, ?5, ?6)
ON CONFLICT(uid, client_id) WHERE client_id IS NOT NULL
  DO UPDATE SET client_id = excluded.client_id
RETURNING *
```

Three clauses are load-bearing and two of them look redundant:

- `WHERE client_id IS NOT NULL` — the unique index is **partial**, and SQLite
  refuses to match a conflict target to a partial index unless the index's own
  `WHERE` is repeated. Omit it and the statement dies with *"ON CONFLICT clause
  does not match any PRIMARY KEY or UNIQUE constraint"*.
- `DO UPDATE SET client_id = excluded.client_id` — a deliberate no-op write.
  `RETURNING` only fires for a row the statement actually touched, so
  `DO NOTHING` comes back empty on the retry and the client never learns its
  server id.
- The row is **not** otherwise overwritten, so a retry returns server truth
  rather than replaying a stale queued body over a row another device has since
  edited.

**This must be pinned by tests against real SQL**, not a stub db — the whole
guarantee lives inside the `ON CONFLICT` clause, so a stub would only prove the
stub. `test/helpers/d1-sqlite.mjs` runs the real `db.mjs` statements against the
real `schema.sql` through `node:sqlite`.

When `client_id` is absent (older clients), behaviour is unchanged: a plain
insert. The partial index tolerates unlimited NULLs.

## 3. Worker API changes

All changes are **additive** — the currently deployed frontend keeps working
against the new Worker.

### `GET /api/state`

Returns the whole book:

```json
{
  "friends":   [ ...unchanged shape, incl. stamps... ],
  "openCards": [ ...unchanged... ],
  "grudges":   [ ...ALL grudges for the uid... ],
  "cards":     [ ...ALL cards for the uid... ]
}
```

`friends` and `openCards` keep their exact current shape and semantics.
New `db.mjs` methods: `listAllGrudges(uid)`, `listAllCards(uid)`.

### ETag / 304

- Worker SHA-256s the serialized response body (WebCrypto `crypto.subtle`) and
  sends `ETag: "<hex>"`.
- Client stores the etag in the mirror and sends `If-None-Match` on the next
  pull. On match the Worker returns **304 with no body**.
- `index.mjs` CORS must be extended or this silently dies:
  - add `if-none-match` to `Access-Control-Allow-Headers` — otherwise the
    preflight rejects the request outright;
  - add `Access-Control-Expose-Headers: ETag` — otherwise JS cannot read the
    header cross-origin.
- `respond()` keeps `cache-control: no-store`. The browser HTTP cache is
  deliberately not involved; IndexedDB is the cache and the client sends
  `If-None-Match` by hand.
- The 304 response must still carry the CORS headers, and must have no body.

Only `GET /api/state` gets ETag handling. Nothing else needs it.

Verify in the browser that a 304 reaches JS as `res.status === 304`. Because
`cache-control: no-store` means the browser has no cache entry of its own, the
response should pass straight through rather than being intercepted by the HTTP
cache — but confirm it on a device rather than assuming, and fall back to a
`{"unchanged": true}` 200 body if it does not.

### `client_id` validation

In `logic.mjs` (pure, unit-tested), `validateFriend` and `validateGrudge` accept
an **optional** `client_id`. If present it must be a string matching
`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`. Anything
else is `400 bad-request`.

## 4. Client sync engine

New files under `portfolio/src/game/siu-hei-bou/`. Each has one job.

### `idb.js` — plumbing only, no logic

```js
openDb()                       // -> IDBDatabase, db "shb" version 1
getMirror(uid)                 // -> mirror | null
putMirror(mirror)              // atomic single-record put
enqueue(item)                  // -> seq
listOutbox(uid)                // -> items ordered by seq
updateOutboxItem(seq, patch)
removeOutboxItem(seq)
replaceOutbox(uid, items)      // for coalescing rewrites
clearAll(uid)                  // 撕爛本簿 / logout wipe
```

### `outbox.js` — pure, no IDB, no fetch

```js
OPS = ['createFriend','updateFriend','deleteFriend',
       'createGrudge','updateGrudge','deleteGrudge']

classify(status, op, code) -> 'done' | 'retry' | 'permanent' | 'pause'
coalesce(queue, newItem)   -> queue'
poison(queue, failedItem)  -> queue'
backoffMs(tries)           -> number
```

**`classify` table** — the 404 row is the subtle one, because for a delete it
means "the job is already done" and for a create it means "the thing you are
attaching to is gone":

| Response | Meaning | Result |
|---|---|---|
| 2xx | applied | `done` |
| 401 | token expired / signed out | `pause` — do NOT consume the item |
| 404 on `update*` / `delete*` | already gone elsewhere | `done` |
| 404 on `createGrudge` | parent friend deleted on the other device | `permanent` |
| 409 `card-claimed` | other device swept it into a 找數卡 | `permanent` |
| 400 | malformed (client bug) | `permanent` |
| 429, 5xx, network failure | transient | `retry` |

**`coalesce`** — writing a grudge offline, fixing a typo, then deleting it must
cost zero network operations, not three:

- `update*` whose target's `create*` is still pending → patch the pending
  create's payload in place, enqueue nothing.
- `delete*` whose target's `create*` is still pending → remove the pending
  create, enqueue nothing.
- otherwise → append.

This removes the entire category of "update a row the server has never heard
of".

**`poison`** — when a `createFriend` becomes `permanent`, every queued item
whose `friendClientId` matches also becomes `permanent`: they can never resolve
a `friend_id`.

**`backoffMs`** — exponential from 2s, capped at 5 min.

### `project.js` — pure

```js
projectBook(mirror, outbox) -> { friends, grudges, cards }
```

- pending `create*` → appended with `pending: true`
- pending `update*` → applied over the mirror row with `pending: true`
- pending `delete*` → row hidden
- items in state `permanent` → excluded entirely (the book shows server truth;
  the explanation lives on 未寄出)

Book.jsx consumes only this. **The UI never learns what sync is** — it renders
`pending` as pencil and nothing else.

### `sync.js` — thin impure orchestration

- `flush(uid, token)` — strictly ordered by `seq`, **single-flight** (a mutex so
  two triggers cannot race). Maps `clientId → server id` from responses as it
  goes, to fill in `friend_id` for grudges queued under an offline-created
  friend. Safe across a crash precisely because inserts are idempotent:
  re-flushing the friend returns the existing row and rebuilds the map.
  - `retry` blocks the queue (order matters).
  - `permanent` items are **evicted** from the queue into state `permanent`, or
    one dead item head-of-lines everything behind it forever.
  - `pause` stops the flush without consuming the item.
- `pull(uid, token)` — `GET /api/state` with `If-None-Match`; on 200 replace the
  mirror wholesale, on 304 keep it and just update `pulledAt`.
- `sync()` = flush, then pull. Triggered on app open, on `visibilitychange` →
  visible, and on the `online` event.
- Every item carries `uid`; the flusher refuses to send items whose `uid` does
  not match the current token's uid.

**`navigator.onLine` is a hint, never the truth** — it reports `true` on a
captive portal. It triggers flush attempts; the state shown to the user comes
from whether the last attempt actually succeeded.

## 5. UI

### Pencil and ink

Unsynced entries render grey (pencil), synced entries in ink. No badge, no
spinner, no emoji — the book states its own condition. CSS class `.shb-pending`
in `siuHeiBouStyles.css`, driven purely by the `pending` flag from
`projectBook`.

A failed *update* shows the server-truth row unchanged. A failed *create* is not
rendered in a chapter at all.

### 未寄出 page

- New `PendingPage.jsx`, appended **last** within the `'__back__'` 書末 section,
  so it appearing and disappearing never shifts the page you were reading.
- Rendered only when there is at least one outbox item.
- Discovered via a `未寄出 (n)` line on the 目錄 footer next to 管理書本, shown
  only when n > 0.
- Per item:
  - transient (`state: 'pending'`) → 等緊網絡, no button (it retries itself).
  - permanent → the reason in Cantonese, plus **唔要** (discard) only. Offering
    重試 on a 409 would be a button guaranteed to fail.
- Copy for the main cases:
  - 409 `card-claimed` → 「呢單嬲爆已經入咗《找數卡》，改唔到」
  - 404 on createGrudge → 「呢個罪人喺另一部機刪咗」
  - 400 → 「寫壞咗，寄唔出」

`Book.nav.test.js` covers 書末 ordering and must be updated for the conditional
page.

### Offline affordances

Nothing may be a button that does nothing:

| Control | Offline |
|---|---|
| 開卡 | greyed + 「開卡要有網絡」 |
| 找數 | greyed + same |
| 分享 | **enabled** — copying a URL works offline |
| 用戶一覽 | hidden/disabled |
| 撕爛本簿 | disabled + 「撕書要有網絡」 |
| 登入 (never signed in) | 「要開簿一次先」 |

If the user has signed in before, Firebase restores the session from its own
IndexedDB persistence and the book opens offline. **Verify this on a device** —
it is the difference between a real PWA and a login button that does nothing.

### Logout vs 撕爛本簿 (added after review — the original spec got this wrong)

The old code cleared `localStorage['shb-state']` on logout, which was safe when
the local copy was a disposable cache. It is not safe now: the outbox holds
grudges the user wrote offline. Wiping it on logout destroys real work; leaving
the whole book readable after logout is a privacy problem on a shared phone.
Those pull in opposite directions, so the two stores are treated differently:

| Action | Mirror | Outbox |
|---|---|---|
| **Logout** (`clearMirror`) | cleared — nothing readable remains | **kept**, uid-tagged |
| **撕爛本簿** (`clearBook`) | cleared | cleared — a deliberate destroy |

Keeping the outbox across logout is safe because `runFlush` only ever sends
items whose `uid` matches the current token, so another account signing in on
the same device can neither see nor send them.

If the outbox is non-empty at logout, warn first (count + 照登出 / 唔登住),
reusing the existing 撕爛本簿 confirm pattern rather than inventing a new one.

**This is promised in `legal.js` §二**, and that file's header states its text
must match what the code does. The two move together or not at all.

### Where sync lives

`Book.jsx` is already 439 lines, the largest file in the folder; threading a
queue through it would make it unreviewable. `SiuHeiBouGame.jsx` (106 lines)
already owns `state` and `refresh` — sync belongs there, and Book stays a
renderer receiving a projected book plus a small set of callbacks.

## 6. Service worker / PWA

- Bump `CACHE` in `portfolio/public/sw.js` from `portfolio-shell-v1` to
  `portfolio-shell-v2`.
- Add cache-first handling for an **explicit two-host allowlist**:
  `fonts.googleapis.com` and `fonts.gstatic.com`.

  This must be written as an allowlist. Inverting the existing cross-origin
  early-return instead would make the SW start intercepting
  `siu-hei-bou-api.hillmanchan.com` and quietly cache authenticated API
  responses. **The SW must never touch `/api/*`.** IndexedDB is the cache.
- Add a `portfolio/public/games/pwa.test.mjs` assertion pinning the font
  allowlist, matching how that file already pins the other shell invariants.
- Known limitation: only the font subsets already fetched while online are
  available offline, so a friend name containing a never-before-rendered
  character falls back for that glyph. Self-healing on next connection.
- No per-game `sw.js` for 小氣簿 — it lives in the main CRA bundle and the shell
  SW only bypasses `/games/`. Adding one would be wrong.
- The manifest (`portfolio/public/pwa/siu-hei-bou.webmanifest`) needs no change.

## 7. Conflict semantics (same account, two phones)

| # | Scenario | Outcome |
|---|---|---|
| 1 | Both add grudges offline | Distinct `client_id`s, both land, stamps sum. No conflict. |
| 2 | A opens a card while B holds an unsynced grudge | The card claimed only what the server knew. B's grudge lands with `card_id = NULL` and counts toward the **next** card. |
| 3 | B edits/deletes a grudge A already claimed | `409 card-claimed` → 未寄出. |
| 4 | Both edit the same grudge offline | Last flush to arrive wins. Fine for a notebook; no UI. |
| 5 | A deletes a friend, B adds a grudge to it offline | `404` on create → 未寄出. |
| 6 | A does 撕爛本簿 while B has a queue | B's items 404 into 未寄出. Locally, 撕爛本簿 also wipes mirror + outbox. |

Scenario 2 is slightly surprising but is the honest semantics: the alternative
is retroactively mutating a 找數卡 that has already been shown to someone.

`created_at` is assigned by the server at **sync** time, not write time — a
grudge written Monday and synced Friday records Friday. This does not affect
reading order, since `listGrudges` sorts by `occurred_at DESC, id DESC` and
`occurred_at` is a user-entered date. Left as-is deliberately rather than
accepting a client-supplied timestamp that would then have to be distrusted.

## 8. Testing

**Pure unit tests (no IDB, no network):**
- `outbox.test.js` — every row of the `classify` table, including 404 splitting
  by op; all three `coalesce` rules; `poison` cascading to dependents;
  `backoffMs` monotonic and capped.
- `project.test.js` — pending create appears, pending update overlays, pending
  delete hides, permanent excluded.
- `logic.test.mjs` (Worker) — `client_id` accepted when well-formed, rejected
  otherwise, optional when absent.

**Worker tests** (`handlers.test.mjs`):
- same `client_id` twice → one row, same `id` returned both times.
- `409 card-claimed` still fires for a claimed grudge.
- `/api/state` includes `grudges` and `cards`, and `friends`/`openCards` keep
  their existing shape.
- ETag round-trip: 200 with `ETag`, then `If-None-Match` → 304 with no body.

**Integration:**
- `idb.test.js` round-trip against `fake-indexeddb` (new devDependency of
  `portfolio`).

**Must stay green:**
```bash
cd siu-hei-bou-api && npm test
cd portfolio && npx react-scripts test --watchAll=false --testPathPattern siu-hei-bou
node --test portfolio/public/games/pwa.test.mjs
cd portfolio && CI=false npm run build
```

**Device verification (cannot be unit-tested):**
1. Install the PWA, load the book online, kill the network → book still fully
   readable, handwriting font intact.
2. Add grudges offline → pencil. Reconnect → they turn to ink.
3. Two devices: A offline adds, B offline adds, both reconnect → both present,
   stamps correct.
4. B offline edits a grudge; A online opens a card claiming it; B reconnects →
   未寄出 entry with the right copy.
5. Force-quit mid-flush → no duplicates.

## 9. Rollout

Order matters. Every Worker change is additive, so the currently deployed
frontend keeps working during the gap.

1. Apply the D1 migration.
2. Deploy the Worker (`npm test && npx wrangler deploy`). Verify the live
   frontend still works.
3. Merge the frontend (auto-deploys to S3/CloudFront within ~1 min).
4. SW bump ships with the frontend.

Existing users' `localStorage['shb-state']` is ignored and removed on first
boot; no migration logic.

## Files

**New**
- `siu-hei-bou-api/sql/2026-08-08-client-ids.sql`
- `portfolio/src/game/siu-hei-bou/idb.js`
- `portfolio/src/game/siu-hei-bou/outbox.js`
- `portfolio/src/game/siu-hei-bou/project.js`
- `portfolio/src/game/siu-hei-bou/sync.js`
- `portfolio/src/game/siu-hei-bou/PendingPage.jsx`
- tests: `outbox.test.js`, `project.test.js`, `idb.test.js`

**Edited**
- `siu-hei-bou-api/schema.sql`, `src/db.mjs`, `src/handlers.mjs`,
  `src/index.mjs`, `src/logic.mjs`, `test/*`
- `portfolio/src/game/siu-hei-bou/api.js`, `SiuHeiBouGame.jsx`, `Book.jsx`,
  `AddGrudgeSheet.jsx`, `BackMatter.jsx`, `siuHeiBouStyles.css`,
  `Book.nav.test.js`
- `portfolio/public/sw.js`, `portfolio/public/games/pwa.test.mjs`
- `portfolio/package.json` (fake-indexeddb devDependency)
- `portfolio/CLAUDE.md`, `siu-hei-bou-api/CLAUDE.md` (document the offline model)
