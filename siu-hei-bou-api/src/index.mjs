import { verifyFirebaseToken } from './auth.mjs';
import { makeDb } from './db.mjs';
import { handlers } from './handlers.mjs';

const ALLOWED_ORIGINS = [
  'https://siu-hei-bou.hillmanchan.com',
  'https://hillmanchan.com',
  'http://localhost:3000',
];

const ROUTES = [
  ['GET',    /^\/api\/state$/,                'getState',    []],
  ['GET',    /^\/api\/me$/,                   'getMe',        []],
  ['DELETE', /^\/api\/me$/,                   'deleteMe',     []],
  ['POST',   /^\/api\/friends$/,              'createFriend', []],
  ['PATCH',  /^\/api\/friends\/(\d+)$/,       'updateFriend', ['id']],
  ['DELETE', /^\/api\/friends\/(\d+)$/,       'deleteFriend', ['id']],
  ['GET',    /^\/api\/grudges$/,              'listGrudges',  []],
  ['POST',   /^\/api\/grudges$/,              'createGrudge', []],
  ['PATCH',  /^\/api\/grudges\/(\d+)$/,       'updateGrudge', ['id']],
  ['DELETE', /^\/api\/grudges\/(\d+)$/,       'deleteGrudge', ['id']],
  ['POST',   /^\/api\/cards$/,                'openCard',     []],
  ['POST',   /^\/api\/cards\/(\d+)\/settle$/, 'settleCard',   ['id']],
  ['GET',    /^\/api\/cards$/,                'listCards',    []],
  ['GET',    /^\/api\/admin\/users$/,         'adminUsers',   []],
  ['GET',    /^\/public\/cards\/([A-Za-z0-9_-]+)$/,       'publicCard', ['token']],
  ['POST',   /^\/public\/cards\/([A-Za-z0-9_-]+)\/ack$/,  'publicAck',  ['token']],
];

export function matchRoute(method, pathname) {
  for (const [m, re, name, paramNames] of ROUTES) {
    if (m !== method) continue;
    const hit = pathname.match(re);
    if (!hit) continue;
    const params = {};
    paramNames.forEach((p, i) => { params[p] = hit[i + 1]; });
    return { name, params, public: pathname.startsWith('/public/') };
  }
  return null;
}

export function makeRateLimiter(limit, windowMs, now = () => Date.now()) {
  const hits = new Map(); // ip -> {windowStart, count}
  return (ip) => {
    const t = now();
    const entry = hits.get(ip);
    if (!entry || t - entry.windowStart >= windowMs) {
      hits.set(ip, { windowStart: t, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}

const ackAllowed = makeRateLimiter(10, 60_000); // per-isolate is good enough for v1

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    // no-store on EVERY response: /api/* is per-user and authenticated, so none
    // of it may sit in a shared cache. Cloudflare already skips caching requests
    // that carry an Authorization header, but the unauthenticated error paths
    // are not covered by that — a stale 404 for a route that did not exist yet
    // was served from the edge during a frontend-ahead-of-Worker deploy gap.
    const respond = (status, body) => new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors },
    });

    // The preflight keeps Access-Control-Max-Age — that is the browser's own
    // preflight cache, which is not a shared cache and carries no data.
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const route = matchRoute(request.method, url.pathname);
    if (!route) return respond(404, { error: 'not-found' });

    const ctx = { db: makeDb(env.DB), superadminEmail: env.SUPERADMIN_EMAIL || '' };
    if (!route.public) {
      const header = request.headers.get('Authorization') || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      let user;
      try {
        user = await verifyFirebaseToken(token);
      } catch {
        return respond(401, { error: 'unauthorized' });
      }
      ctx.uid = user.uid;
      ctx.user = user;
    } else if (route.name === 'publicAck') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!ackAllowed(ip)) return respond(429, { error: 'too-fast' });
    }

    let body = null;
    if (request.method === 'POST' || request.method === 'PATCH') {
      try { body = await request.json(); } catch { body = null; }
    }
    const query = Object.fromEntries(url.searchParams);

    try {
      if (route.name === 'getState') await ctx.db.upsertUser(ctx.user.uid, ctx.user.email, ctx.user.name);
      const result = await handlers[route.name](ctx, { params: route.params, body, query });
      return respond(result.status, result.body);
    } catch (e) {
      console.error(`[${route.name}]`, e);
      return respond(500, { error: 'internal' });
    }
  },
};
