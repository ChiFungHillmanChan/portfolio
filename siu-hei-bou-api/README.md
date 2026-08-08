# siu-hei-bou-api

Cloudflare Worker + D1 backend for 小氣簿 (siu-hei-bou.hillmanchan.com) — a
Cantonese grudge notebook. First Worker/D1 service in this repo.

## Architecture

```
React frontend (portfolio/src/game/siu-hei-bou/)
  │  Bearer <Firebase ID token>
  ▼
Worker  src/index.mjs      router, CORS, per-IP rate limit on public ack
        src/auth.mjs       Firebase ID token verify via WebCrypto + Google JWKS
                           (no firebase-admin; checks sig/exp/iat/aud/iss/sub,
                           returns {uid, email, name, emailVerified})
        src/handlers.mjs   request handlers (validation via logic.mjs)
        src/db.mjs         ALL SQL — prepared statements, uid-scoped
        src/logic.mjs      pure validation/domain logic (unit-tested)
  ▼
D1  siu-hei-bou-db         users / friends / grudges / cards  (schema.sql)
```

## Endpoints

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/state` | Bearer | friends + open cards (also upserts the user row) |
| `GET /api/me` | Bearer | 書末 profile — `{email, name, created_at, counts:{friends,grudges,cards}}` |
| `DELETE /api/me` | Bearer | 撕爛本簿 — wipes every row this uid owns (see below) |
| `POST/PATCH/DELETE /api/friends[/:id]` | Bearer | manage 罪人 |
| `GET/POST/PATCH/DELETE /api/grudges[/:id]` | Bearer | manage 罪行紀錄 |
| `POST /api/cards`, `POST /api/cards/:id/settle`, `GET /api/cards` | Bearer | 找數卡 lifecycle |
| `GET /public/cards/:token` | none | public card view — field-projected, never leaks uid/ids/tokens |
| `POST /public/cards/:token/ack` | none (rate-limited) | friend 認數 |
| `GET /api/admin/users?page=&page_size=&q=` | Bearer + superadmin | paged user list — `{total, q, page, pages, pageSize, users:[{name,email,created_at}]}` |

`/api/admin/users` is paged in SQL (default 20/page, ceiling 100) and ordered
`created_at DESC, uid` — the uid tiebreak is what keeps OFFSET paging from
skipping or repeating rows when several accounts share a created_at second.
`q` substring-matches email or display name (`%`/`_` are escaped, so they match
literally). Out-of-range `page` is clamped to the last page rather than
returning an empty list, and `total` always reflects the *matching* count.

## Security model

- Every `/api/*` request must carry a Firebase ID token; the Worker verifies it
  cryptographically against Google's JWKS — there is no session state.
- All SQL lives in `db.mjs` as prepared statements with `.bind()`; every query
  is uid-scoped, so no user can read or mutate another user's rows.
- Public card responses are shaped in the handlers layer down to
  `status / stamp_total / reward / created_at` (+ friend name + grudge text) —
  internal ids, uids and share tokens never leave the Worker.
- **Superadmin** is the wrangler env var `SUPERADMIN_EMAIL` compared against the
  *verified* token email with `email_verified === true`. It is not stored in the
  database, has no write path, and cannot be granted from any client.
- Secrets: the Worker holds none — D1 access is a platform binding, token
  verification uses Google's public keys, and `SUPERADMIN_EMAIL` is an email
  address, not a credential.

### Account deletion (`DELETE /api/me`)

`deleteMe` wipes `grudges → cards → friends → users` for the caller's uid in one
`d1.batch()` (= one transaction, FK-safe order — the same order `deleteFriend`
uses). The uid comes only from the verified token; nothing in the body or path
can redirect it at another account.

**The Firebase account is deliberately NOT deleted.** That Google account is
shared across the whole of hillmanchan.com — System Design 教室 (including paid
lifetime tiers), the poker hand recorder, the casino wallet. Deleting it here
would destroy entitlements bought elsewhere, so 小氣簿 only removes what 小氣簿
stores. The 私隱條款 (`portfolio/src/game/siu-hei-bou/legal.js`) states this
explicitly, and the in-app confirm repeats it — keep all three in sync.

After a successful wipe the client signs out immediately. That ordering matters:
`GET /api/state` upserts the user row, so a refresh between delete and sign-out
would resurrect an empty account.

## Develop / deploy

```bash
npm test              # node --test — pure logic, auth, handlers, router
npx wrangler deploy   # account hillmanchan709@gmail.com; custom domain
                      # siu-hei-bou-api.hillmanchan.com
```

D1 database: `siu-hei-bou-db` (id `67932535-b39a-4a1f-b7ae-a4fafc9b466d`).
Schema changes: edit `schema.sql` (the fresh-DB definition) **and** add a dated,
idempotent file under `sql/` (`CREATE INDEX IF NOT EXISTS`) for the live
database. Apply each before/with the deploy that needs it:

```bash
npx wrangler d1 execute siu-hei-bou-db --remote --file=sql/2026-08-09-indexes.sql
npx wrangler d1 execute siu-hei-bou-db --remote --file=sql/2026-08-09-cards-uid-index.sql
```

## Write/read cost notes

D1 bills rows read and rows written, so two things matter more than they look:

- `upsertUser` runs on every `/api/state`. Its `ON CONFLICT … DO UPDATE …
  WHERE email/display_name actually differ` makes the ordinary case (same person
  opening the app again) write **zero** rows. Don't drop that `WHERE`.
- Any `WHERE` clause that can't reach an index becomes a full table scan billed
  per row. The one to watch is getState's stamp sum, which filters on
  `friend_id` alone — the `idx_grudges_uid_friend` index leads on `uid` and
  cannot serve it, which is why the partial index `idx_grudges_open` exists.
  Check with `EXPLAIN QUERY PLAN` before adding a query on a growing table.
  `getMe`'s counts and `deleteMe`'s wipe both hit `cards` by `uid`, which is why
  `idx_cards_uid_friend` exists — without it both were `SCAN TABLE cards`.

## Caching

Every response carries `Cache-Control: no-store`. `/api/*` is per-user and
authenticated, so nothing it returns may ever sit in a shared cache. Cloudflare
already skips caching for requests bearing an `Authorization` header, but the
unauthenticated error paths are not covered by that rule — a stale `404` for a
route that did not exist yet was observed being served from the edge during the
gap between a frontend deploy and the Worker deploy. `no-store` closes it.
