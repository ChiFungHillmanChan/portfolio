// Verifies Firebase ID tokens (RS256) against Google's securetoken JWKS.
// WebCrypto only — no firebase-admin (it does not run on Workers).
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export class AuthError extends Error {
  constructor(message) { super(message); this.code = 'unauthorized'; }
}

let jwksCache = { keys: null, fetchedAt: 0 };

export async function defaultFetchJwks() {
  if (jwksCache.keys && Date.now() - jwksCache.fetchedAt < 60 * 60 * 1000) return jwksCache;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new AuthError('jwks fetch failed');
  jwksCache = { ...(await res.json()), fetchedAt: Date.now() };
  return jwksCache;
}

function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodeJson(part) {
  try { return JSON.parse(new TextDecoder().decode(b64urlToBytes(part))); }
  catch { throw new AuthError('malformed token'); }
}

export async function verifyFirebaseToken(token, { projectId = 'system-design-c84d3', fetchJwks = defaultFetchJwks, now = () => Date.now() } = {}) {
  if (typeof token !== 'string' || token.split('.').length !== 3) throw new AuthError('malformed token');
  const [headerB64, payloadB64, sigB64] = token.split('.');
  const header = decodeJson(headerB64);
  const payload = decodeJson(payloadB64);
  if (header.alg !== 'RS256' || !header.kid) throw new AuthError('bad alg');

  const { keys } = await fetchJwks();
  const jwk = (keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new AuthError('unknown kid');

  try {
    const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key,
      b64urlToBytes(sigB64), new TextEncoder().encode(`${headerB64}.${payloadB64}`));
    if (!ok) throw new AuthError('bad signature');
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('malformed token');
  }

  const nowMs = now();
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < nowMs - CLOCK_SKEW_MS) throw new AuthError('expired');
  if (typeof payload.iat !== 'number' || payload.iat * 1000 > nowMs + CLOCK_SKEW_MS) throw new AuthError('bad iat');
  if (payload.aud !== projectId) throw new AuthError('bad aud');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('bad iss');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new AuthError('bad sub');

  return { uid: payload.sub, email: payload.email || '', name: payload.name || '' };
}
