/**
 * Cloudflare Worker in front of the handbook PDFs on hillmanchan.com.
 *
 * - /downloads/<folder>/*.pdf: rate limited per visitor, then served from the Cloudflare cache
 *   (origin: CloudFront -> S3). Each successful download is recorded in D1.
 * - /api/handbook/stripe-webhook: Stripe checkout.session.completed events for the handbook's
 *   support links, recorded in D1.
 *
 * Bindings (wrangler.jsonc): DB (D1), DOWNLOAD_LIMIT, REQUEST_LIMIT (rate limiting).
 * Secrets: IP_SALT, STRIPE_WEBHOOK_SECRET. There is no read API: query D1 with wrangler (see README).
 */

// Download folder -> the handbook's slug on the site (/handbook/<slug>).
export const HANDBOOKS = { 'ai-engineer-handbook': 'ai-engineer' };
const FILE = /^AI_Engineer_Handbook_(\d{2})_[A-Za-z_]+?(_EN)?\.pdf$/;
// A second request for the same file from the same visitor within this window is the same
// download (browsers' PDF viewers often fetch a file more than once).
const REPEAT_MS = 30 * 60 * 1000;
const STRIPE_TOLERANCE_S = 300;
const REFERENCE = /^([a-z0-9-]+)__p(\d{2})__(zh|en)$/;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});

const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (text) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

// Compares two strings without leaking where they first differ.
async function sameSecret(given, expected) {
  if (!given || !expected) return false;
  const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// A limiter that is missing or fails lets the request through: availability beats counting.
async function allowed(limiter, key) {
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit({ key });
    return success;
  } catch (error) {
    console.error('rate limiter failed', error && error.message);
    return true;
  }
}

// The handbook, part and language a PDF path belongs to, or null for anything else.
export function parseDownload(pathname) {
  const match = /^\/downloads\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match || !HANDBOOKS[match[1]]) return null;
  const file = FILE.exec(match[2]);
  if (!file) return null;
  return { handbook: HANDBOOKS[match[1]], part: Number(file[1]), lang: file[2] ? 'en' : 'zh', file: match[2] };
}

// True for a request that starts a download: no Range header, or a range from the first byte.
const startsDownload = (request) => {
  const range = request.headers.get('range');
  return !range || /^bytes=0-/.test(range.trim());
};

async function recordDownload(env, item, ip, country, now) {
  const visitor = (await sha256(`${env.IP_SALT || ''}:${ip}`)).slice(0, 24);
  const at = new Date(now).toISOString();
  const since = new Date(now - REPEAT_MS).toISOString();
  await env.DB.prepare(
    `INSERT INTO downloads (at, day, handbook, part, lang, visitor, country)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
     WHERE NOT EXISTS (SELECT 1 FROM downloads WHERE visitor = ?6 AND handbook = ?3 AND part = ?4 AND lang = ?5 AND at > ?8)`,
  ).bind(at, at.slice(0, 10), item.handbook, item.part, item.lang, visitor, country || null, since).run();
}

async function download(request, env, ctx, item, now) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const starts = startsDownload(request);
  // Every request (including the ranges a PDF viewer asks for) counts towards a generous limit;
  // whole-file downloads also count towards a tight one.
  if (!(await allowed(env.REQUEST_LIMIT, ip)) || (starts && !(await allowed(env.DOWNLOAD_LIMIT, ip)))) {
    return new Response('Too many downloads from your network. Please wait a minute and try again.\n', {
      status: 429,
      headers: { 'retry-after': '60', 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  const response = await fetch(request);
  if (request.method === 'GET' && starts && (response.status === 200 || response.status === 206) && env.DB) {
    ctx.waitUntil(recordDownload(env, item, ip, request.cf && request.cf.country, now).catch((error) => {
      console.error('download not recorded', error && error.message);
    }));
  }
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Stripe signs each event: header "t=<unix>,v1=<hex HMAC-SHA256 of `${t}.${body}`>".
export async function verifyStripe(body, header, secret, now) {
  if (!header || !secret) return false;
  const fields = header.split(',').map((part) => part.split('='));
  const t = (fields.find(([k]) => k === 't') || [])[1];
  const signatures = fields.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || signatures.length === 0 || Math.abs(now / 1000 - Number(t)) > STRIPE_TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  for (const signature of signatures) {
    if (await sameSecret(signature, expected)) return true;
  }
  return false;
}

// Records a paid checkout from one of the handbook's support links. The site adds
// client_reference_id "<slug>__pNN__<lang>" so a payment says which part it came with.
export function paymentFrom(event, handbookLinks) {
  if (!event || !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return null;
  const session = event.data && event.data.object;
  if (!session || session.payment_status !== 'paid') return null;
  const fromHandbook = (session.metadata && session.metadata.source === 'handbook') || handbookLinks.includes(session.payment_link);
  if (!fromHandbook) return null;
  const reference = REFERENCE.exec(session.client_reference_id || '');
  return {
    session: session.id,
    at: new Date((session.created || event.created) * 1000).toISOString(),
    handbook: reference ? reference[1] : 'ai-engineer',
    part: reference ? Number(reference[2]) : null,
    lang: reference ? reference[3] : null,
    amount: session.amount_total || 0,
    currency: (session.currency || '').toUpperCase(),
    paymentLink: session.payment_link || null,
    livemode: session.livemode ? 1 : 0,
  };
}

async function stripeWebhook(request, env, now) {
  const body = await request.text();
  if (!(await verifyStripe(body, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET, now))) {
    return json({ error: 'Bad signature' }, 400);
  }
  const links = (env.HANDBOOK_PAYMENT_LINKS || '').split(',').map((id) => id.trim()).filter(Boolean);
  const payment = paymentFrom(JSON.parse(body), links);
  if (payment) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO payments (session_id, at, handbook, part, lang, amount, currency, payment_link, livemode)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    ).bind(payment.session, payment.at, payment.handbook, payment.part, payment.lang, payment.amount,
      payment.currency, payment.paymentLink, payment.livemode).run();
  }
  return json({ received: true, recorded: Boolean(payment) });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const now = Date.now();
    if (url.pathname === '/api/handbook/stripe-webhook' && request.method === 'POST') return stripeWebhook(request, env, now);
    if (url.pathname.startsWith('/api/handbook/')) return json({ error: 'Not found' }, 404);
    const item = parseDownload(url.pathname);
    if (item && (request.method === 'GET' || request.method === 'HEAD')) return download(request, env, ctx, item, now);
    return fetch(request);
  },
};
