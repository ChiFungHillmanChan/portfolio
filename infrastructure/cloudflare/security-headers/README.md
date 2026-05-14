# hillmanchan.com Security Headers (Cloudflare Worker)

This Worker sits in front of the S3 origin and adds the HTTP response headers
that S3 cannot set on its own. It addresses the gaps flagged by the most
recent security scan:

| Header                       | Why it matters                                    |
| ---------------------------- | ------------------------------------------------- |
| `Strict-Transport-Security`  | Force HTTPS, block downgrade / MITM attacks       |
| `Content-Security-Policy`    | Mitigate XSS by restricting where resources load  |
| `X-Frame-Options`            | Clickjacking protection (legacy clients)          |
| `frame-ancestors` in CSP     | Clickjacking protection (modern, can't be meta)   |
| `X-Content-Type-Options`     | Block MIME sniffing                               |
| `Referrer-Policy`            | Trim cross-origin referrer leakage                |
| `Permissions-Policy`         | Disable unused powerful APIs                      |
| `Cross-Origin-*-Policy`      | Tighter isolation between origins                 |

The CSP intentionally allows `'unsafe-inline'` for scripts because the casino
games under `/games/casino-game/` rely on inline `onclick=` handlers. Other
directives are scoped to the domains actually used by the portfolio
(Firebase, Stripe, YouTube, Google Fonts, etc.).

## Prerequisites

- Cloudflare account with `hillmanchan.com` already added as a zone.
- Workers enabled on that account (free tier is sufficient).
- A Cloudflare API token with `Workers Scripts:Edit` + `Zone:Edit` for the
  zone, exported as `CLOUDFLARE_API_TOKEN` (or `wrangler login` once).

## One-time setup

```bash
cd infrastructure/cloudflare/security-headers
npm install
npx wrangler login   # or set CLOUDFLARE_API_TOKEN
```

## Deploy

```bash
npm run deploy
```

After deploy, verify with:

```bash
curl -sI https://hillmanchan.com | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy'
```

You should see every header listed in the table above.

## Local preview

```bash
npm run dev   # spins up wrangler dev against the live origin
```

## Updating the policy

Edit `src/worker.js`, redeploy. CSP changes should be tested with the browser
devtools console open — any blocked resource will be reported there. If you
need to onboard a new third-party (analytics, embed, etc.), add it to the
matching directive (`script-src`, `connect-src`, `frame-src`, etc.) and make
the same change in `portfolio/public/index.html` so the meta-tag fallback
stays in sync.

## Rollback

If a deploy breaks the site, revert by re-deploying the previous version:

```bash
npx wrangler rollback
```

Or temporarily disable the route from the Cloudflare dashboard
(Workers & Pages → hillmanchan-security-headers → Triggers).

## Additional manual steps (not in this Worker)

1. **HSTS preload** – after the header has been live for a few weeks, submit
   `hillmanchan.com` at <https://hstspreload.org/>.
2. **CAA DNS record** – add the CAA record flagged in the scan to limit which
   CAs may issue certificates for the domain. In Cloudflare DNS:
   - Type: `CAA`
   - Name: `hillmanchan.com`
   - Tag: `issue`
   - Value: `letsencrypt.org` (and `pki.goog` if Google Trust Services is also
     used for the Cloudflare-managed cert)
