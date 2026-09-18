# Gym hosting

`gym.hillmanchan.com` uses the dedicated `hillmanchan-gym` Cloudflare Worker to
serve the app from the existing AWS S3 bucket `hillmanportfolio1` in `eu-west-2`.
The Worker maps `/` to `/gym/index.html` and every other asset path to `/gym/*`
on the HTTPS S3 REST endpoint. Hash navigation needs no server-side fallback.
Missing files return 404 instead of the main portfolio shell.

The custom domain in `wrangler.jsonc` provisions the hostname's DNS and TLS
association. It does not change the shared CloudFront distribution,
`portfolio-subdomain-rewrite` function, apex Worker, or other subdomains.
[Cloudflare custom-domain documentation](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## Deploy

From the repository root, with the existing AWS CLI and Wrangler logins:

```sh
node --test infrastructure/cloudflare/gym/worker.test.mjs
bash scripts/deploy-gym.sh --dry-run
bash scripts/deploy-gym.sh
```

The script regenerates the offline manifest, validates required assets, runs
the Worker, storage, content and offline tests, and uploads only
`portfolio/public/gym/` to `s3://hillmanportfolio1/gym/`, then deploys the Worker.
It does not delete S3 objects. Application HTML is uploaded after its modules
and assets. Test files and source maps are excluded. JavaScript and the web
manifest receive explicit MIME types at both the origin and edge.

`portfolio/public/gym/` is copied into `portfolio/build/gym/` by the existing CRA
build. Keep the app files in that tracked public directory: the normal main
branch deployment syncs the complete build to the shared bucket with `--delete`.
Deploying an older checkout without these files would remove the gym prefix.

The Worker revalidates HTML, CSS, modules, `precache.js`, `sw.js`, and the manifest
on each online load, even after a regular portfolio deployment. Images and media
use a one-day browser cache. S3 fetches bypass the edge cache. The service worker
owns offline asset caching. User progress is stored in the browser; neither the
Worker nor S3 receives workout entries.

## Verify the live site

```sh
curl -I https://gym.hillmanchan.com/
curl -I https://gym.hillmanchan.com/app.mjs
curl -I https://gym.hillmanchan.com/sw.js
curl -I https://gym.hillmanchan.com/manifest.webmanifest
curl -I https://gym.hillmanchan.com/missing-file.mjs
```

Expect 200 for existing files; JavaScript MIME for modules and the service
worker; `no-cache` for the shell and executable files; and 404 for missing files.
Check the app in a browser, including phone layout, a saved workout, reload,
offline reopening after the first online load, and installing it from a browser
that supports home-screen installation.

## Rollback

Restore the desired version of `portfolio/public/gym/` and run the same deploy
script. Roll back Worker-only changes with Wrangler's deployment rollback for
`hillmanchan-gym`. Removing or replacing the gym custom domain is independent of
the main portfolio. Do not remove or change another application's DNS record.

## Initial infrastructure checks

On 2026-09-18, the existing AWS and Cloudflare logins were authenticated; the
HTTPS S3 REST origin served the portfolio index; `gym/` had no objects; and no
gym Worker or custom-domain binding existed. Public DNS did not resolve the
hostname. The Wrangler OAuth token could read the active zone and manage
Workers/custom domains; direct DNS-record reads were unavailable to that token.

## Live deployment verification

Published on 2026-09-18 at 23:29 UTC (2026-09-19 in London) to
[gym.hillmanchan.com](https://gym.hillmanchan.com/).

- Cloudflare Worker: `hillmanchan-gym`, version
  `21b59626-512e-4011-8089-cd5d19efbd33`; custom-domain trigger deployed.
- Public DNS resolves through Cloudflare and TLS 1.3 certificate validation passes.
- AWS prefix inventory: 96 objects, 44,897,482 bytes. Every uploaded path and size
  matches `portfolio/public/gym/`; deployment touched only the `gym/` prefix.
- Offline content version: `e2968c95e86356b1eba6`, with 94 local cache assets.
- All 36 deployment checks passed before upload.
- Live HTML, `app.mjs`, `sw.js`, `precache.js`, manifest and an original diagram
  returned 200, with response bodies byte-identical to local files.
- The shell, modules, service worker and manifest return `no-cache`; a diagram
  returns `image/gif` with a one-day browser cache.
- A `Range: bytes=0-1023` request for `media/goblet.mp4` returned 206 with exactly
  1,024 bytes and `Content-Range: bytes 0-1023/225124`.
- A missing module returned 404, plain text, and `no-store`.

The first request during custom-domain propagation returned 403; subsequent
checks all passed without a configuration change. The shared CloudFront
distribution and other applications' Workers, routes and DNS were not modified.
