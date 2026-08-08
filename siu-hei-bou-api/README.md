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
| `POST/PATCH/DELETE /api/friends[/:id]` | Bearer | manage 罪人 |
| `GET/POST/PATCH/DELETE /api/grudges[/:id]` | Bearer | manage 罪行紀錄 |
| `POST /api/cards`, `POST /api/cards/:id/settle`, `GET /api/cards` | Bearer | 找數卡 lifecycle |
| `GET /public/cards/:token` | none | public card view — field-projected, never leaks uid/ids/tokens |
| `POST /public/cards/:token/ack` | none (rate-limited) | friend 認數 |
| `GET /api/admin/users` | Bearer + superadmin | `{total, users:[{name,email,created_at}]}` |

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

## Develop / deploy

```bash
npm test              # node --test — pure logic, auth, handlers, router
npx wrangler deploy   # account hillmanchan709@gmail.com; custom domain
                      # siu-hei-bou-api.hillmanchan.com
```

D1 database: `siu-hei-bou-db` (id `67932535-b39a-4a1f-b7ae-a4fafc9b466d`).
Schema changes: edit `schema.sql`, apply with
`npx wrangler d1 execute siu-hei-bou-db --remote --file schema.sql` (fresh DB)
or an explicit `--command "ALTER TABLE …"` migration.
