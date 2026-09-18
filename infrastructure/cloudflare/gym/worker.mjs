const ORIGIN = 'https://hillmanportfolio1.s3.eu-west-2.amazonaws.com';
const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  webmanifest: 'application/manifest+json; charset=utf-8',
};

function errorResponse(request, message, status, headers = {}) {
  return new Response(request.method === 'HEAD' ? null : message, {
    status,
    headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8', ...headers },
  });
}

export default {
  async fetch(request) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return errorResponse(request, 'Method not allowed', 405, { allow: 'GET, HEAD' });
    }

    let path;
    try {
      path = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return errorResponse(request, 'Invalid path', 400);
    }
    if (path.includes('\\') || path.split('/').some((part) => part === '.' || part === '..')) {
      return errorResponse(request, 'Invalid path', 400);
    }
    if (path.endsWith('/')) path += 'index.html';
    const originUrl = new URL(`/gym${path.split('/').map(encodeURIComponent).join('/')}`, ORIGIN);

    // Only these headers are useful to a static origin. Never forward cookies,
    // authorization, the visitor's Host, or S3 API query parameters.
    const requestHeaders = new Headers();
    for (const name of ['if-none-match', 'if-modified-since', 'range', 'if-range']) {
      if (request.headers.has(name)) requestHeaders.set(name, request.headers.get(name));
    }
    const upstream = await fetch(originUrl, {
      method: request.method,
      headers: requestHeaders,
      redirect: 'manual',
      cache: 'no-store',
    });

    if (upstream.status === 403 || upstream.status === 404) {
      return errorResponse(request, 'Not found', 404);
    }

    const headers = new Headers(upstream.headers);
    const extension = path.split('.').pop().toLowerCase();
    if (CONTENT_TYPES[extension]) headers.set('content-type', CONTENT_TYPES[extension]);
    const isMedia = /\.(avif|gif|jpe?g|png|svg|webp|mp4|webm)$/i.test(path);
    headers.set('cache-control', upstream.ok || upstream.status === 304
      ? (isMedia ? 'public, max-age=86400' : 'no-cache') : 'no-store');
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    headers.set('x-frame-options', 'SAMEORIGIN');
    headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
