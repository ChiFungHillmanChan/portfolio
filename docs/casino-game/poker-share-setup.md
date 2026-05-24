# Poker Stats-Share — Deploy & Setup

Setup steps for the **Share Graphs** feature (`casino-game.hillmanchan.com/p/{id}`).

The codebase changes are already committed. This doc only covers the **infrastructure** + **deploy** steps that must happen in the Cloudflare and AWS consoles (and a few CLI commands).

---

## 0. What was built

| Piece | Path | Purpose |
|---|---|---|
| Backend module | `lambda/poker/share-stats.mjs` | Sanitiser, password hash, limits, expiry resolution |
| Lambda actions | `lambda/poker/index.mjs` (5 new) | create / get / get-meta / list-my / revoke |
| Cleanup cron | `lambda/poker/scripts/cleanup-expired-shares.mjs` | Daily sweep of expired shares |
| Frontend dialog | `bb100/js/replay/share-dialog.js` (rewritten) | Tabs: Graphs / Hands |
| Frontend wrappers | `bb100/js/cloud/share-stats.js` | API + payload prep |
| Share button | `bb100/js/upload.js` (renderControls) | "📤 Share session" |
| Share viewer | `public/games/casino-game/poker/bb100/share/` | index.html + share.js + share.css |
| Worker | `portfolio/infra/cloudflare-workers/share-router/` | URL rewrite + OG injection |

---

## 1. Cloudflare R2 (new public bucket)

```bash
# Create bucket via Cloudflare dashboard:
#   R2 → Create bucket
#   Name: casino-poker-shares
#   Location: Automatic
```

Then **enable public access via custom domain** (NOT via *.r2.dev — keeps the URL ours and lets us layer Cloudflare cache rules):

1. R2 → `casino-poker-shares` → Settings → "Connect Custom Domain"
2. Add `share-cdn.hillmanchan.com` (or another subdomain you own).
3. Cloudflare auto-creates the DNS record + cert.
4. (Optional) R2 → Object Lifecycle Rules → add a belt-and-braces "delete after 400 days" on prefix `shared-stats/` — catches anything the cron cleanup script misses.

CORS — R2 buckets used by browsers need CORS:

```json
[
  {
    "AllowedOrigins": [
      "https://casino-game.hillmanchan.com",
      "https://hillmanchan.com"
    ],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Generate an R2 API token: R2 → Manage R2 API Tokens → Create token, scope "Object Read & Write" on `casino-poker-shares`. Save `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`.

> **Reusing the existing R2 token?** The existing `cg-poker` Lambda already authenticates with R2 for the hands bucket. If that token has access to the new bucket too, you don't need a separate one. Otherwise, create a token scoped to BOTH buckets and update the Lambda env.

---

## 2. Lambda env vars (cg-poker)

```bash
aws lambda get-function-configuration --function-name cg-poker --region eu-west-2 \
  --query 'Environment.Variables' --output json > /tmp/cg-poker-env.json

# Edit /tmp/cg-poker-env.json — add:
#   "SHARES_BUCKET":      "casino-poker-shares"
#   "SHARE_PAGE_ORIGIN":  "https://casino-game.hillmanchan.com"
# Keep all existing keys intact (the --environment flag REPLACES the full map).

aws lambda update-function-configuration --function-name cg-poker --region eu-west-2 \
  --environment "Variables=$(cat /tmp/cg-poker-env.json | jq -c .)"
```

If you're routing through a different R2 token, also update `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` in the same call.

---

## 3. Deploy the cg-poker Lambda

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker
npm install --omit=dev
zip -r /tmp/cg-poker.zip index.mjs share-stats.mjs package.json node_modules/
aws lambda update-function-code --function-name cg-poker \
  --zip-file "fileb:///tmp/cg-poker.zip" --region eu-west-2
```

**Smoke test** (must return 404 because the share doesn't exist — proves the new route is wired):

```bash
curl -sS -X POST 'https://api.system-design.hillmanchan.com/poker/get-stats-share' \
  -H 'content-type: application/json' \
  -d '{"shareId":"AAAAAAAAAAAAAAAA"}'
# expected: {"ok":false,"error":"not_found"}
```

---

## 4. API Gateway routes

Add 5 routes (all → cg-poker Lambda integration). API Gateway → `sa-api` → Routes → Create:

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/poker/create-stats-share` | required (Lambda enforces) | |
| POST | `/poker/get-stats-share`    | **none** | Lambda intentionally bypasses Firebase auth — share link IS the bearer |
| POST | `/poker/get-share-meta`     | **none** | Same — used by the Worker for OG meta |
| POST | `/poker/list-my-shares`     | required | |
| POST | `/poker/revoke-stats-share` | required | |

API Gateway HTTP APIs don't have a "no auth" toggle per route — there's no JWT/IAM authorizer on this API to remove. The Lambda is the auth boundary (`PUBLIC_ACTIONS` set in `index.mjs` controls which actions accept anonymous traffic).

---

## 5. Cloudflare Pages — casino-game subdomain

If `casino-game.hillmanchan.com` isn't already a Cloudflare Pages project:

1. Cloudflare → Pages → Create project → connect to the portfolio GitHub repo.
2. Build settings: framework = None (or matching the existing portfolio), output `portfolio/public/games/casino-game`. (Adjust to whatever the current setup is — the goal is for `/games/casino-game/poker/bb100/share/index.html` to resolve.)
3. Custom domain: `casino-game.hillmanchan.com` AND a second custom domain (e.g. `casino-game-pages.hillmanchan.com`) that the Worker can call without looping.

If the casino-game subdomain already exists and isn't on Pages, just make sure `share/index.html` ships with the next deploy of the existing host (the files are under `portfolio/public/games/casino-game/poker/bb100/share/`).

---

## 6. Cloudflare Worker

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/infra/cloudflare-workers/share-router
npm install
# Authenticate once:
npx wrangler login
# Adjust wrangler.toml — set PAGES_ORIGIN to your Pages direct-URL hostname
npx wrangler deploy
```

The Worker route in `wrangler.toml` is `casino-game.hillmanchan.com/*`. Cloudflare runs it BEFORE Pages on that hostname, so `/p/{id}` gets the OG-injection treatment and every other path passes through.

**Smoke test**:

```bash
curl -sI 'https://casino-game.hillmanchan.com/p/AAAAAAAAAAAAAAAA'
# expected: 200 (with the share page), even though the share itself doesn't
# exist — the client-side JS will then call /poker/get-stats-share and show
# "Not found".
```

---

## 7. Cleanup cron (EventBridge → Lambda)

Create a dedicated cleanup Lambda:

```bash
# Package the cleanup script
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker
mkdir -p /tmp/cg-cleanup-build
cp scripts/cleanup-expired-shares.mjs /tmp/cg-cleanup-build/index.mjs
# scripts/cleanup-expired-shares.mjs uses top-level await + ESM, so the
# Lambda needs the same package.json + node_modules.
cp package.json /tmp/cg-cleanup-build/
( cd /tmp/cg-cleanup-build && npm install --omit=dev )
( cd /tmp/cg-cleanup-build && zip -r /tmp/cg-cleanup.zip . )

# Create function (or use existing if you prefer to share the dispatcher)
aws lambda create-function --function-name cg-poker-cleanup-shares \
  --runtime nodejs22.x --role <SAME ROLE AS cg-poker> \
  --handler index.handler --zip-file fileb:///tmp/cg-cleanup.zip \
  --timeout 60 --memory-size 256 --region eu-west-2 \
  --environment "Variables={FIREBASE_SERVICE_ACCOUNT=<base64>,R2_ACCOUNT_ID=<id>,R2_ACCESS_KEY_ID=<key>,R2_SECRET_ACCESS_KEY=<secret>,SHARES_BUCKET=casino-poker-shares}"
```

> The cleanup script is currently written as a CLI (`main()` IIFE). To run it from a Lambda you have two options:
>
> 1. **Easy** — wrap it in `export const handler = async (event) => { ... }` that calls the same logic. Edit `scripts/cleanup-expired-shares.mjs` to add this wrapper, or duplicate the file as `cleanup-handler.mjs`.
> 2. **Easier still** — run it manually with a daily local cron until you decide whether to formalise it: `node scripts/cleanup-expired-shares.mjs` (set env vars first).

Schedule via EventBridge:

```bash
aws events put-rule --name cg-poker-cleanup-shares-daily \
  --schedule-expression "rate(1 day)" --region eu-west-2

aws events put-targets --rule cg-poker-cleanup-shares-daily \
  --targets "Id=1,Arn=arn:aws:lambda:eu-west-2:<acct>:function:cg-poker-cleanup-shares" \
  --region eu-west-2

aws lambda add-permission --function-name cg-poker-cleanup-shares \
  --statement-id eventbridge-daily --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:eu-west-2:<acct>:rule/cg-poker-cleanup-shares-daily" \
  --region eu-west-2
```

---

## 8. Firestore schema additions

The Lambda creates these on-demand — you don't need to seed anything. Listed here for visibility:

```
pokerShares/{shareId}                   (Admin SDK only — clients never write)
  shareId, ownerUid, ownerEmail, type ("graphs" | "hands"), title,
  createdAt, expiresAt, expireDays, revoked, views,
  passwordProtected, passwordHash, passwordSalt,
  r2Key, meta { handsTotal, bbPer100After, rakeBbPer100, stakesBucket }

pokerStorage/{uid}.shareGraphs          (extends the existing doc)
  { month: "YYYY-MM", count: N, lastSharedAt: Timestamp }
pokerStorage/{uid}.shareHands           (same shape; reserved for future)
```

The existing Firestore security rules already deny all client writes on `pokerStorage/*` and `pokerShares/*` (the latter is new — verify it's covered or add it). If not, in `firestore.rules`:

```js
match /pokerShares/{shareId} {
  allow read: if false;   // public reads go through the Lambda
  allow write: if false;  // Admin SDK only
}
```

Deploy: `cd portfolio/src/game/system-design && npx firebase deploy --only firestore:rules`.

---

## 9. Sync portfolio public/

The portfolio repo builds the bb100 standalone via Vite. The share page lives under `public/games/casino-game/poker/bb100/share/`, which is already publish-ready as static files — no Vite step needed for that subtree, it ships when the rest of the casino-game does.

If the casino-game subdomain isn't already on Cloudflare Pages, the existing portfolio host (whatever serves `hillmanchan.com/games/casino-game/`) needs to also serve those new files. They're in `public/`, so the standard portfolio deploy picks them up automatically.

---

## 10. Smoke-test checklist (end-to-end)

After all the above:

- [ ] Signed-in free user creates a graph share → URL returned, expires in 7 days, no password option in UI.
- [ ] Open the URL in incognito → graphs render, before/after rake + BB/$ toggles work, enlarge button goes fullscreen.
- [ ] Paid user creates a password-protected share → URL returned, opening it shows the password gate; wrong password → 403; right password → graphs.
- [ ] Owner deletes the underlying session in the recorder → share URL still loads (snapshot semantics).
- [ ] Owner clicks "Revoke" in My Shares (TODO — UI not built yet) → URL returns 410 Revoked.
- [ ] WhatsApp DM the URL → preview shows title + "{N} hands · X bb/100" + image.
- [ ] Run `node scripts/cleanup-expired-shares.mjs --dry` after a few days → lists shares whose expiresAt is past.
