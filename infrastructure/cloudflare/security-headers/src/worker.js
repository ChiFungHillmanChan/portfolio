/**
 * Cloudflare Worker that injects security response headers in front of the
 * S3 origin for hillmanchan.com. Deploy with `wrangler deploy`; route is set
 * via wrangler.toml so this runs on every request to the apex domain.
 *
 * Mirrors and reinforces the meta-tag CSP shipped in portfolio/public/index.html
 * and adds headers (HSTS, X-Frame-Options, X-Content-Type-Options,
 * Referrer-Policy, Permissions-Policy, frame-ancestors) that meta tags
 * cannot deliver.
 */

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://js.stripe.com https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://api.system-design.hillmanchan.com https://bugspark.hillmanchan.com https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebase.googleapis.com https://api.stripe.com wss://*.firebaseio.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://buy.stripe.com https://js.stripe.com https://*.firebaseapp.com https://docs.google.com https://card-game-pied-kappa.vercel.app",
  "frame-ancestors 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://buy.stripe.com https://docs.google.com",
  "upgrade-insecure-requests",
].join('; ');

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self "https://buy.stripe.com"), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Content-Security-Policy': CSP,
};

export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(name, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
