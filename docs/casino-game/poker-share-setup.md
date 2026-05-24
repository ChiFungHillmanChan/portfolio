# Poker Stats-Share — Deploy & Setup

Deploy steps for the **Share Graphs** feature (`casino-game.hillmanchan.com/p/{id}`).

This doc was written **after** an end-to-end check against the real AWS / Cloudflare / R2 infrastructure (see "Reality check" section at the bottom). If you find a mismatch when you actually deploy, please update this doc.

---

## 0. What was built (and what's actually live)

| Piece | Path in repo | Status |
|---|---|---|
| Backend module | `lambda/poker/share-stats.mjs` (system-architecture repo) | code on `feat/poker-share-graphs` branch, **not deployed** |
| Lambda actions | `lambda/poker/index.mjs` (+5 new) | code on `feat/poker-share-graphs`, **not deployed** |
| Cleanup cron | `lambda/poker/scripts/cleanup-expired-shares.mjs` | code only, no Lambda function created yet |
| Frontend dialog | `bb100/js/replay/share-dialog.js` (rewritten) | code on `feat/poker-share-graphs`, **not in S3 yet** |
| API wrapper | `bb100/js/cloud/share-stats.js` | code only, **not in S3 yet** |
| Share button | `bb100/js/upload.js` (renderControls patch) | code only, **not in S3 yet** |
| Share viewer | `public/games/casino-game/poker/bb100/share/{index.html,share.js,share.css}` | code only, **not in S3 yet** |
| CloudFront Function | `infra/cloudfront-functions/portfolio-subdomain-rewrite.js` (extended) | code in repo, **deployed function NOT YET updated** |
| R2 bucket | `casino-poker-shares` (new) | **not created yet** |
| API Gateway routes | 5 new routes for stats-share endpoints | **not created yet** |
| Lambda env vars | `SHARES_BUCKET`, `SHARE_PAGE_ORIGIN` | **not set yet** |

---

## 1. Reality check — what already exists (verified 2026-05-24)

- **AWS account** `575108933055` (eu-west-2). IAM user `crochet_platform_user` has access.
- **CloudFront distribution** `E2SYHEFLV89R32` serves ALL portfolio subdomains (hillmanchan.com, casino-game.hillmanchan.com, system-design.hillmanchan.com, …) from one S3 origin: `hillmanportfolio1.s3-website.eu-west-2.amazonaws.com`.
- **CloudFront Function** `portfolio-subdomain-rewrite` is already attached to the default cache behaviour on `viewer-request`. We extend it for `/p/{id}` routing.
- **CloudFront custom error response**: 404 → `/index.html` with status 200 (SPA fallback). This is why `casino-game.hillmanchan.com/p/test123` currently returns 200 — it's the main portfolio SPA, NOT the share viewer. After deploying the CF Function update, `/p/{id}` will hit `share/index.html` instead.
- **Lambda `cg-poker`** is live with R2 credentials in env vars (`R2_ACCOUNT_ID=7d2747f6cc21c13e70c7650314efbccc`, etc.).
- **R2 bucket `casino-poker-hands`** exists (current `DATA_BUCKET`). The new `casino-poker-shares` bucket does NOT exist yet — needs to be created.
- **API Gateway** `sa-api` (`zniganhfcg`) has 18 `/poker/*` routes wired. NONE of the 5 new share routes are wired yet.
- **No existing Cloudflare Pages / Worker** for this stack. Initial design assumed Cloudflare-hosted shares; that was wrong — everything is CloudFront. The repo's `infra/` folder is **CloudFront Functions** now, not Cloudflare Workers.

---

## 2. R2 bucket setup (Cloudflare dashboard)

```text
1. Cloudflare → R2 → Create bucket
   Name: casino-poker-shares
   Location: Automatic

2. R2 → casino-poker-shares → Settings → Public Access
   Custom Domain → add e.g. shares-cdn.hillmanchan.com  (optional; only needed
   if you want clients to read JSON directly from R2 bypassing the Lambda. The
   current Lambda design reads R2 server-side and returns JSON via the API
   Gateway, so a public R2 domain is NOT required for the v1 deploy.)

3. R2 → Manage API Tokens → either:
   (a) extend the existing token's bucket-scope list to include casino-poker-shares
       (recommended — one less secret to rotate), or
   (b) create a new token scoped to BOTH casino-poker-hands AND casino-poker-shares,
       and update the Lambda env vars R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.

4. R2 → casino-poker-shares → Settings → CORS Policy → add:
   [
     {
       "AllowedOrigins": ["https://casino-game.hillmanchan.com", "https://hillmanchan.com"],
       "AllowedMethods": ["GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   (Only needed if you wired the optional public R2 domain in step 2.)
```

---

## 3. Lambda env vars

```bash
# Capture current env (the --environment flag REPLACES the full map — we must
# preserve every key).
aws lambda get-function-configuration --function-name cg-poker --region eu-west-2 \
  --query 'Environment.Variables' --output json > /tmp/cg-poker-env.json

# Append:
#   SHARES_BUCKET=casino-poker-shares
#   SHARE_PAGE_ORIGIN=https://casino-game.hillmanchan.com
jq '. + {SHARES_BUCKET:"casino-poker-shares", SHARE_PAGE_ORIGIN:"https://casino-game.hillmanchan.com"}' \
  /tmp/cg-poker-env.json > /tmp/cg-poker-env-new.json

aws lambda update-function-configuration --function-name cg-poker --region eu-west-2 \
  --environment "Variables=$(cat /tmp/cg-poker-env-new.json | jq -c .)"
```

> The Lambda code defaults `SHARES_BUCKET` to `"casino-poker-shares"` and `SHARE_PAGE_ORIGIN` to `"https://casino-game.hillmanchan.com"` so it'll work even without setting these env vars — but setting them makes intent explicit and lets you override in non-prod environments.

---

## 4. Deploy the cg-poker Lambda

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/poker
npm install --omit=dev
zip -r /tmp/cg-poker.zip index.mjs share-stats.mjs package.json node_modules/
aws lambda update-function-code --function-name cg-poker \
  --zip-file "fileb:///tmp/cg-poker.zip" --region eu-west-2
```

Smoke test (NO auth needed because get-stats-share is in `PUBLIC_ACTIONS`):

```bash
curl -sS -X POST 'https://api.system-design.hillmanchan.com/poker/get-stats-share' \
  -H 'content-type: application/json' \
  -d '{"shareId":"AAAAAAAAAAAAAAAA"}'
# expected: {"ok":false,"error":"invalid_id"} — the ID is 16 chars but base64url-invalid
# OR: {"ok":false,"error":"not_found"} once the route is wired (see §5)
```

Until the API Gateway routes are added in §5, every endpoint returns 404 from API Gateway level. The Lambda has the code but isn't yet reachable.

---

## 5. API Gateway routes

Add 5 routes (all → cg-poker Lambda integration). The existing integration ID is `ovboson`. Easiest path:

```bash
API_ID=zniganhfcg
INTEGRATION_ID=ovboson

for action in get-stats-share get-share-meta create-stats-share list-my-shares revoke-stats-share; do
  aws apigatewayv2 create-route --api-id $API_ID --region eu-west-2 \
    --route-key "POST /poker/$action" \
    --target "integrations/$INTEGRATION_ID"
done
```

API Gateway HTTP APIs do not have a JWT/IAM authorizer set on this API — the Lambda is the auth boundary (`PUBLIC_ACTIONS` set in `index.mjs` controls which actions accept anonymous traffic). So no extra "disable auth" toggle is needed for `get-stats-share` and `get-share-meta`.

After adding routes, the smoke test from §4 should succeed.

---

## 6. CloudFront Function update (URL rewrite for /p/{id})

The function lives in this repo at `portfolio/infra/cloudfront-functions/portfolio-subdomain-rewrite.js`. To push the change:

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/infra/cloudfront-functions

# 1. Capture the current Etag
ETAG=$(aws cloudfront describe-function \
  --name portfolio-subdomain-rewrite \
  --query 'ETag' --output text)

# 2. Push the new code
aws cloudfront update-function \
  --name portfolio-subdomain-rewrite \
  --if-match "$ETAG" \
  --function-config 'Comment="Subdomain rewrite + /p/{id} share routing",Runtime=cloudfront-js-2.0' \
  --function-code "fileb://portfolio-subdomain-rewrite.js"

# 3. Publish DEVELOPMENT → LIVE
PUBLISH_ETAG=$(aws cloudfront describe-function \
  --name portfolio-subdomain-rewrite \
  --query 'ETag' --output text)
aws cloudfront publish-function \
  --name portfolio-subdomain-rewrite \
  --if-match "$PUBLISH_ETAG"

# 4. Invalidate /p/* so cached SPA-fallback responses are evicted
aws cloudfront create-invalidation \
  --distribution-id E2SYHEFLV89R32 \
  --paths '/p/*' '/games/casino-game/poker/bb100/share/*'
```

Verify:

```bash
curl -sS -D - 'https://casino-game.hillmanchan.com/p/AAAAAAAAAAAAAAAA' | head -5
# Should serve the share/index.html (NOT the main portfolio SPA).
# The page itself will then show "Not found" because the share doesn't exist.
```

---

## 7. Upload share files to S3

The portfolio's existing CRA `deploy` flow (`npm run deploy` in `portfolio/`) builds the React app and syncs everything in `public/games/...` into S3 via `npm run upload:root:other`. Once the share/ files are in the merged tree, the normal portfolio deploy publishes them. If you want to ship JUST the share files without a full build:

```bash
S3_BUCKET=hillmanportfolio1
CF_DIST=E2SYHEFLV89R32

aws s3 cp portfolio/public/games/casino-game/poker/bb100/share/ \
  s3://$S3_BUCKET/games/casino-game/poker/bb100/share/ \
  --recursive --metadata-directive REPLACE \
  --cache-control "public, max-age=300"

# Also push the modified bb100 JS/CSS:
for f in css/replay.css css/upload.css \
         js/upload.js js/replay/animated-replay.js js/replay/share-dialog.js \
         js/cloud/share-stats.js; do
  aws s3 cp "portfolio/public/games/casino-game/poker/bb100/$f" \
    "s3://$S3_BUCKET/games/casino-game/poker/bb100/$f" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=300"
done

aws cloudfront create-invalidation --distribution-id $CF_DIST \
  --paths "/games/casino-game/poker/bb100/*"
```

---

## 8. Cleanup cron (EventBridge)

The cleanup script `lambda/poker/scripts/cleanup-expired-shares.mjs` is a CLI (top-level `main()`). To run it as a Lambda you have two options:

**Option A — run it locally on a host cron**

```bash
# On any machine with the Firebase service account + R2 creds in env:
crontab -e
0 4 * * *  cd /path/to/system-architecture/lambda/poker && \
           node scripts/cleanup-expired-shares.mjs >> /var/log/cleanup-shares.log 2>&1
```

**Option B — Lambda + EventBridge**

Wrap the script in a handler:

```js
// lambda/poker/scripts/cleanup-handler.mjs
import { runCleanup } from "./cleanup-expired-shares.mjs"; // expose runCleanup as a named export first
export const handler = async () => {
  const stats = await runCleanup({ dryRun: false });
  return { ok: true, ...stats };
};
```

Then:

```bash
zip -r /tmp/cg-cleanup.zip lambda/poker
aws lambda create-function \
  --function-name cg-poker-cleanup-shares \
  --runtime nodejs22.x --memory-size 256 --timeout 60 \
  --role arn:aws:iam::575108933055:role/sa-lambda-role \
  --handler scripts/cleanup-handler.handler \
  --zip-file fileb:///tmp/cg-cleanup.zip \
  --environment "Variables={FIREBASE_SERVICE_ACCOUNT=...,R2_ACCOUNT_ID=...,R2_ACCESS_KEY_ID=...,R2_SECRET_ACCESS_KEY=...,SHARES_BUCKET=casino-poker-shares}" \
  --region eu-west-2

aws events put-rule --name cg-poker-cleanup-shares-daily \
  --schedule-expression "rate(1 day)" --region eu-west-2

aws events put-targets --rule cg-poker-cleanup-shares-daily --region eu-west-2 \
  --targets "Id=1,Arn=arn:aws:lambda:eu-west-2:575108933055:function:cg-poker-cleanup-shares"

aws lambda add-permission --function-name cg-poker-cleanup-shares --region eu-west-2 \
  --statement-id eventbridge-daily --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:eu-west-2:575108933055:rule/cg-poker-cleanup-shares-daily
```

For v1 ship: Option A is fine — local cron on any machine you control. Migrate to Lambda when you decide whether to formalise it.

---

## 9. Firestore rules

Add to `firestore.rules`:

```js
match /pokerShares/{shareId} {
  allow read:  if false;   // public reads go through the Lambda
  allow write: if false;   // Admin SDK only
}
```

Deploy: `cd portfolio/src/game/system-design && npx firebase deploy --only firestore:rules`.

---

## 10. Smoke-test checklist (end-to-end)

After every step above is done:

- [ ] Signed-in free user opens Hand Recorder, uploads a session, clicks "📤 Share session" → Graphs tab, expire fixed at 7d, no password row → create → URL `https://casino-game.hillmanchan.com/p/{16chars}` returned
- [ ] Open the URL in incognito → graphs render; before/after rake toggle works; BB/$ toggle works; Enlarge goes fullscreen; reset-zoom appears after a drag-zoom
- [ ] Paid user creates a password-protected share → opens URL → password gate; wrong → 403; right → graphs
- [ ] Owner deletes the source session in the recorder → share URL still loads
- [ ] WhatsApp / Telegram DM the URL → preview shows generic fallback (per-share OG is future work — Lambda@Edge)
- [ ] `node scripts/cleanup-expired-shares.mjs --dry` after a share expires → lists it for deletion
- [ ] Replay-modal "Share" button still opens with the Hands tab pre-selected; existing video-export still works for paid/superadmin
- [ ] Free user opens replay-modal share → Hands tab shows the "🔒 paid plans only" message

---

## 11. Known gaps / out-of-scope for v1

- **Per-share OG image previews.** Need a Lambda@Edge on viewer-response that injects OG meta using `/poker/get-share-meta`. The viewer page already has fallback OG meta in the HTML.
- **"My shares" owner dashboard.** Backend `list-my-shares` + `revoke-stats-share` are wired; UI panel is not built yet.
- **Hands-share write path.** The `type: "hands"` action is reserved in the backend (gating + quotas) but currently has no client write — the Hands tab in the dialog directs paid users to the per-hand replay-modal share video.
- **Stakes / period buckets in the snapshot.** The compute pipeline currently doesn't track `firstHandAt` / `lastHandAt` / `stakes` on the summary, so shared pages will show "unspecified". To enable, extend `compute.mjs` to capture those fields when iterating hands. The sanitiser + backend already handle them when present.
