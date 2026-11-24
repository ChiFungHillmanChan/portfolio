# Handbook downloads Worker

This Cloudflare Worker sits in front of the handbook PDFs and the handbook API on `hillmanchan.com`. It runs only on these two routes:

- `hillmanchan.com/downloads/ai-engineer-handbook/*`
- `hillmanchan.com/api/handbook/*`

The rest of the site does not go through it.

## What it does

### Downloads

Each visitor (IP address) is rate limited:

- 10 whole-file downloads a minute.
- 120 requests a minute, counting the byte ranges a PDF viewer asks for.

Over either limit, the visitor gets `429`. Within the limits, the file is served from the Cloudflare cache, which falls back to CloudFront and then S3.

Every successful whole-file download is stored in D1. A row holds the time, the part, the language, a country code, and a salted SHA-256 hash of the IP address. The IP address itself is never stored. If the same visitor fetches the same file again within 30 minutes, it counts as one download.

### Stats

`GET /api/handbook/stats` returns download and payment counts per handbook, part and language. It needs the header `Authorization: Bearer <ADMIN_TOKEN>`. The admin page at `/handbook/admin` reads from this endpoint.

### Payments

`POST /api/handbook/stripe-webhook` receives Stripe `checkout.session.completed` events. The Stripe webhook endpoint is `we_1UfQxl9Pqr2DwjwZJhzF1Uf0` on the Hillman Projects account.

The Worker checks the Stripe signature. It records a payment only if it is paid and came from one of the handbook's Payment Links. A session counts as a handbook payment if it has `metadata.source = handbook`, or if its link is listed in `HANDBOOK_PAYMENT_LINKS`.

The site adds `client_reference_id=<slug>__pNN__<zh|en>` to the checkout link, so each payment records which part and language it came with.

## Rate limiting and cost

The PDFs are cached by Cloudflare, so most downloads never reach CloudFront and cost nothing.

The rate limits are approximate. Cloudflare counts per location and is eventually consistent. In a test, one client was blocked after about 95 requests in quick succession. That is enough to stop one machine downloading in a loop, but it is not an exact quota.

## Commands

Run these from this folder, logged in to Wrangler.

```bash
node --test worker.test.mjs                                    # tests
npx wrangler deploy                                            # deploy
npx wrangler d1 execute hillmanchan-handbook --remote --file schema.sql   # schema (idempotent)
npx wrangler secret put ADMIN_TOKEN                            # rotate the admin token
npx wrangler tail                                              # live logs
```

The secrets are `ADMIN_TOKEN`, `IP_SALT` and `STRIPE_WEBHOOK_SECRET`.

A copy of the admin token is kept outside the repo, in `~/.config/hillmanchan/handbook-admin-token`.

To add another handbook:

1. Add its download folder to `HANDBOOKS` in `worker.mjs`.
2. Add a route for it in `wrangler.jsonc`.
3. Add its Payment Link ids to `HANDBOOK_PAYMENT_LINKS`.
