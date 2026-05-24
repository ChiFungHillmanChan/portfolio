# CloudFront Functions

The portfolio is served from CloudFront distribution **`E2SYHEFLV89R32`** (origin: `hillmanportfolio1` S3 bucket). The default cache behaviour has a CloudFront Function attached on `viewer-request` named **`portfolio-subdomain-rewrite`**.

The canonical source for that function lives in this folder. CloudFront has no native git-sync — when you edit the JS here, also push it to AWS using the deploy snippet below.

## Files

| File | Purpose |
|---|---|
| `portfolio-subdomain-rewrite.js` | URL rewriting on viewer-request. Handles legacy subdomain canonicalisation + `/p/{id}` share-viewer routing. |

## Deploy a change

```bash
# 1. Capture the current Etag (CloudFront uses optimistic concurrency)
ETAG=$(aws cloudfront describe-function \
  --name portfolio-subdomain-rewrite \
  --query 'ETag' --output text)

# 2. Push the new code
aws cloudfront update-function \
  --name portfolio-subdomain-rewrite \
  --if-match "$ETAG" \
  --function-config 'Comment="Subdomain rewrite + /p/{id} share routing",Runtime=cloudfront-js-2.0' \
  --function-code fileb://portfolio-subdomain-rewrite.js

# 3. Publish — DEVELOPMENT → LIVE
PUBLISH_ETAG=$(aws cloudfront describe-function \
  --name portfolio-subdomain-rewrite \
  --query 'ETag' --output text)
aws cloudfront publish-function \
  --name portfolio-subdomain-rewrite \
  --if-match "$PUBLISH_ETAG"

# 4. Invalidate the relevant paths so cached 200 responses for /p/* don't
#    serve the old SPA fallback (CloudFront returned /index.html for /p/*
#    before the function knew about that route).
aws cloudfront create-invalidation \
  --distribution-id E2SYHEFLV89R32 \
  --paths '/p/*'
```

## Verify

```bash
# Should respond with 200 + the share/index.html body (NOT the main SPA).
# The page will then try to fetch /poker/get-stats-share and show "Not found"
# because no such share exists — that's fine.
curl -sS -D - 'https://casino-game.hillmanchan.com/p/AAAAAAAAAAAAAAAA' | head -20
```

## Per-share OG preview (future work)

CloudFront Functions cannot modify response bodies. To inject per-share OG / Twitter meta into the response HTML (so WhatsApp / IG / X show "{N} hands @ X bb/100"), you would need:

- A **Lambda@Edge** on `origin-response` deployed in us-east-1
- It fetches `/poker/get-share-meta` (the lightweight metadata endpoint we already ship in `cg-poker`) and rewrites OG `<meta>` tags inline.

For v1 we ship without it. The static fallback OG image in `share/index.html` is what crawlers will pick up.
