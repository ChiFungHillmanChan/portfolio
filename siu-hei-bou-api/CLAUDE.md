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

## Deploy

```bash
cd siu-hei-bou-api
npm test && npx wrangler deploy   # → siu-hei-bou-api.hillmanchan.com
```

Worker deploys are independent of portfolio frontend deploys (push-to-main).
CORS allowlist + the portfolio CSP `connect-src` must both include the API
origin or every fetch dies silently.
