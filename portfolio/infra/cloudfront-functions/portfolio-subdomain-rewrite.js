// portfolio-subdomain-rewrite — CloudFront Function (cloudfront-js-2.0)
// Attached to distribution E2SYHEFLV89R32 on the DEFAULT viewer-request.
//
// Two responsibilities (in order):
//   1. Subdomain canonicalisation — e.g.
//      observation-report-demo.hillmanchan.com / →
//        /games/observation-report/index.html
//   2. /p/{id} share-viewer routing on casino-game.hillmanchan.com → rewrite
//      to the static share viewer with the share ID as a query param. This
//      lets the share dialog hand out the clean URL casino-game.hillmanchan.com/p/{id}
//      while the underlying file lives at /games/casino-game/poker/bb100/share/index.html.
//
// Note: CloudFront Functions are synchronous and CANNOT modify response
// bodies. That means OG / Twitter meta INJECTION for per-share preview
// images is NOT possible here — direct visits see the full chart, but
// crawlers (WhatsApp / X / IG DM) see the static fallback meta in the
// share HTML. Per-share OG previews would require a Lambda@Edge on
// viewer-response and are intentionally out-of-scope for v1.
//
// IMPORTANT: keep this file in sync with the actual deployed function — if
// you edit one, edit the other. CloudFront Functions live in their own
// service (`aws cloudfront update-function`) and there's no native CI
// hook into a Git repo.

function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';
  var uri = request.uri;

  // ── 1. Subdomain canonicalisation (legacy behaviour, preserved) ─────────
  if (host === 'observation-report-demo.hillmanchan.com') {
    if (uri === '/' || uri === '/index.html') {
      request.uri = '/games/observation-report/index.html';
    }
  }

  // ── 2. /p/{id} share-viewer routing ─────────────────────────────────────
  //
  // Match /p/{shareId} (base64url, 12–32 chars, optional trailing slash) on
  // any host alias of the distribution — accept both
  //   casino-game.hillmanchan.com/p/{id}
  //   hillmanchan.com/p/{id}
  // so existing share links survive a future move of the casino-game
  // subdomain. The query param is what the share-page JS reads with
  // URLSearchParams.get('id').
  //
  // Regex literals in CloudFront Functions runtime 2.0 are limited; use
  // String.prototype.match with a single-group regex string instead.
  var m = /^\/p\/([A-Za-z0-9_\-]{12,32})\/?$/.exec(uri);
  if (m) {
    var shareId = m[1];
    request.uri = '/games/casino-game/poker/bb100/share/index.html';
    request.querystring = {
      id: { value: shareId }
    };
    return request;
  }

  return request;
}
