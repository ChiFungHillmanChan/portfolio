# siu-hei-bou-api — working notes

Cloudflare Worker + D1 for 小氣簿. Full architecture/endpoint/security detail in
[README.md](README.md); frontend notes in `portfolio/CLAUDE.md` §小氣簿.

## Rules

- ALL SQL stays in `src/db.mjs`, prepared + `.bind()`, uid-scoped. Handlers never
  see raw SQL; `logic.mjs` stays pure (it is unit-tested without mocks).
- Public (`/public/*`) responses are field-projected in `handlers.mjs` — never
  return uid, internal ids, or share tokens from them.
- `admin-*` style actions gate on `user.email === env.SUPERADMIN_EMAIL &&
  user.emailVerified` (see `adminUsers`). Superadmin lives ONLY in the wrangler
  var — never add a DB flag or client-writable path for it.
- Adding a route = one line in the `ROUTES` table in `src/index.mjs` (method,
  anchored regex, handler name, param names). Non-`/public/` routes get Bearer
  auth automatically.
- `npm test` (node --test) must stay green; add handler tests for any new
  auth/permission behaviour.
- Any list endpoint over a table that grows with users must be paged in SQL
  (`LIMIT/OFFSET` + a separate `COUNT(*)`), never sliced client-side, and must
  have a deterministic `ORDER BY` with a unique tiebreak or OFFSET paging will
  skip rows. `adminUsers` is the reference implementation.
- Before adding a query on `grudges`/`cards`, run `EXPLAIN QUERY PLAN` against
  a local sqlite copy of `schema.sql`. D1 bills rows read; a `SCAN TABLE` in the
  plan is a bill, not just a latency problem. New indexes go in BOTH
  `schema.sql` and a dated idempotent file under `sql/`.

## Offline writes (`client_id`)

The frontend queues mutations in IndexedDB and replays them, so **creates must be
idempotent** — see `docs/superpowers/specs/2026-08-08-siu-hei-bou-offline-sync-design.md`.

- `friends.client_id` / `grudges.client_id` are client-minted UUIDs, validated
  for shape in `logic.mjs` and optional (older clients omit them). Dedup is
  `UNIQUE(uid, client_id)`, so one account's key can never touch another's.
- `createFriend`/`createGrudge` upsert on that key. Two clauses look redundant
  and are not: the index is **partial**, so `ON CONFLICT` must repeat
  `WHERE client_id IS NOT NULL` or SQLite rejects the statement outright; and
  `DO UPDATE SET client_id = excluded.client_id` is a deliberate no-op whose only
  job is to make `RETURNING` fire on the retry, since `DO NOTHING` returns no row
  and the client would never learn its server id. Both are pinned by tests.
- An UPDATE must never carry `client_id` into its patch — `validateFriend`/
  `validateGrudge` validate it in partial mode and then drop it.
- `GET /api/state` returns the whole book (`friends`, `openCards`, `grudges`,
  `cards`) and is the only etagged route: it is SHA-256'd and answers
  `If-None-Match` with a bodyless 304. `if-none-match` in
  `Access-Control-Allow-Headers` and `Access-Control-Expose-Headers: ETag` are
  both load-bearing — drop either and the conditional GET dies at the preflight
  or the etag is invisible to JS. `cache-control: no-store` stays on everything;
  IndexedDB is the cache, not the browser.
- `friends`/`openCards` in that response are **append-only**. The deployed
  frontend reads them, and the Worker ships before the frontend does.

`test/helpers/d1-sqlite.mjs` runs the real `db.mjs` SQL against the real
`schema.sql` via `node:sqlite`, for behaviour that lives inside the SQL itself.
Reach for it instead of a stub db whenever a stub would only prove the stub.

## Deploy

```bash
cd siu-hei-bou-api
npm test && npx wrangler deploy   # → siu-hei-bou-api.hillmanchan.com
```

Worker deploys are independent of portfolio frontend deploys (push-to-main).
CORS allowlist + the portfolio CSP `connect-src` must both include the API
origin or every fetch dies silently.
