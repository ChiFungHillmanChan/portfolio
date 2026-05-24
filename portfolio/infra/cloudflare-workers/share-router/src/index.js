// share-router Worker — handles /p/{shareId} on casino-game.hillmanchan.com.
//
// Two jobs:
//   1. Map clean URL /p/{id} to the static share page at
//      /games/casino-game/poker/bb100/share/index.html?id={id}.
//   2. Fetch /poker/get-share-meta once and inject OG / Twitter meta tags
//      into the response HTML using HTMLRewriter, so WhatsApp / IG DM /
//      Slack / X / Telegram previews show the correct title, snippet and
//      preview image. (Their crawlers don't run JS.)
//
// Anything that's NOT /p/{id} is passed through to the underlying Pages
// (or whatever serves the rest of casino-game.hillmanchan.com).
//
// Configure via wrangler.toml:
//   PAGES_ORIGIN     — origin to forward all non-/p/* requests + the page
//                       request itself. Typically the Pages project URL or
//                       the same hostname when this Worker is on a route
//                       (in which case use a custom hostname for Pages and
//                       point PAGES_ORIGIN at it).
//   POKER_API_BASE   — backend API base, e.g. https://api.system-design.hillmanchan.com
//   OG_IMAGE_DEFAULT — URL of the fallback OG image (used when no per-share
//                       OG image exists and for password-protected shares)
//
// Note on caching: get-share-meta responses are cached at the edge for 60s
// per shareId, so a hot share doesn't hammer the Lambda. The crawlers
// usually re-fetch every few hours anyway.

const SHARE_ID_PATTERN = /^\/p\/([A-Za-z0-9_-]{12,32})\/?$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Trivial healthcheck — useful when wiring the Worker on a route.
    if (url.pathname === "/__share-router/health") {
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }

    const m = SHARE_ID_PATTERN.exec(url.pathname);
    if (!m) {
      return fetch(rewriteOrigin(request, env.PAGES_ORIGIN));
    }
    const shareId = m[1];

    // 1) Fetch metadata (cheap — Firestore doc, no R2 read).
    let meta = null;
    try {
      const metaRes = await edgeCachedMeta(env, ctx, shareId);
      if (metaRes.status === 410 || metaRes.status === 404) {
        // Still serve the page so the user gets a friendly error; the
        // client-side fetch will hit the same backend and render the error.
        meta = null;
      } else if (metaRes.ok) {
        meta = await metaRes.json();
      }
    } catch (err) {
      // Treat as missing meta — page still loads, just without enriched OG.
      console.warn("share-router meta fetch failed:", err);
    }

    // 2) Fetch the underlying static page from Pages.
    const pageUrl = new URL(env.PAGES_ORIGIN);
    pageUrl.pathname = "/games/casino-game/poker/bb100/share/index.html";
    pageUrl.search = `?id=${encodeURIComponent(shareId)}`;
    const pageReq = new Request(pageUrl.toString(), {
      headers: { ...Object.fromEntries(request.headers), host: pageUrl.host },
    });
    let pageRes;
    try {
      pageRes = await fetch(pageReq);
    } catch {
      return new Response("Share page is unavailable.", { status: 502 });
    }

    if (!meta) {
      // No metadata — pass page through so client-side rendering can do its job.
      return pageRes;
    }

    // 3) Rewrite OG / Twitter / <title> in flight.
    const og = buildOg(shareId, meta, env);
    return new HTMLRewriter()
      .on("title#pageTitle",                 { element(el) { el.setInnerContent(og.title); } })
      .on('meta[property="og:title"]',       { element(el) { el.setAttribute("content", og.title); } })
      .on('meta[property="og:description"]', { element(el) { el.setAttribute("content", og.description); } })
      .on('meta[property="og:image"]',       { element(el) { el.setAttribute("content", og.image); } })
      .on('meta[property="og:url"]',         { element(el) { el.setAttribute("content", og.url); } })
      .on('meta[name="twitter:title"]',      { element(el) { el.setAttribute("content", og.title); } })
      .on('meta[name="twitter:description"]', { element(el) { el.setAttribute("content", og.description); } })
      .on('meta[name="twitter:image"]',      { element(el) { el.setAttribute("content", og.image); } })
      .transform(pageRes);
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function rewriteOrigin(request, originBase) {
  const u = new URL(request.url);
  const out = new URL(originBase);
  out.pathname = u.pathname;
  out.search = u.search;
  return new Request(out.toString(), request);
}

async function edgeCachedMeta(env, ctx, shareId) {
  const cacheUrl = new URL(`https://share-meta.local/share/${shareId}`);
  const cache = caches.default;
  const cached = await cache.match(cacheUrl);
  if (cached) return cached;

  const upstream = await fetch(`${env.POKER_API_BASE}/poker/get-share-meta`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ shareId }),
  });

  // Only cache successful responses — error envelopes shouldn't get pinned.
  if (upstream.ok) {
    const toCache = new Response(upstream.clone().body, {
      status: upstream.status,
      headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
    });
    ctx.waitUntil(cache.put(cacheUrl, toCache));
  }
  return upstream;
}

function buildOg(shareId, meta, env) {
  const url = `https://casino-game.hillmanchan.com/p/${shareId}`;
  const ogImageDefault = env.OG_IMAGE_DEFAULT
    || "https://hillmanchan.com/games/casino-game/poker/bb100/share/og-default.png";

  // Password-protected shares: never leak stats in OG metadata. Crawlers
  // following the link see a generic title only.
  if (meta.passwordProtected) {
    return {
      title: "Password protected — Poker stats share",
      description: "Enter the password to view the shared poker session stats.",
      image: ogImageDefault,
      url,
    };
  }

  const hands = Number(meta.handsTotal) || 0;
  const bb100 = Number(meta.bbPer100After) || 0;
  const title = meta.title || `${hands.toLocaleString()} hands recorder`;
  const parts = [];
  if (hands)               parts.push(`${hands.toLocaleString()} hands`);
  if (Number.isFinite(bb100)) parts.push(`${bb100.toFixed(2)} bb/100 after rake`);
  if (meta.stakesBucket)   parts.push(`${meta.stakesBucket} stakes`);
  parts.push("no hand details shared");

  return {
    title: `${title} — Poker stats share`,
    description: parts.join(" · "),
    image: ogImageDefault, // TODO: serve a per-share dynamic OG image if/when we wire that
    url,
  };
}
