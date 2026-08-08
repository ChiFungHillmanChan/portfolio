import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { verifyFirebaseToken, AuthError } from '../src/auth.mjs';

const PROJECT = 'system-design-c84d3';
const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

let keyPair, jwks;

before(async () => {
  keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  jwks = { keys: [{ ...jwk, kid: 'test-kid', alg: 'RS256', use: 'sig' }] };
});

async function makeToken(claimOverrides = {}, headerOverrides = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid: 'test-kid', typ: 'JWT', ...headerOverrides };
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT,
    sub: 'uid-123', user_id: 'uid-123', email: 'a@b.com', name: '阿明',
    iat: nowSec - 10, exp: nowSec + 3600, ...claimOverrides,
  };
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${Buffer.from(sig).toString('base64url')}`;
}

const opts = () => ({ projectId: PROJECT, fetchJwks: async () => jwks });

test('accepts a valid token', async () => {
  const out = await verifyFirebaseToken(await makeToken(), opts());
  assert.deepEqual(out, { uid: 'uid-123', email: 'a@b.com', name: '阿明' });
});

test('rejects expired token', async () => {
  const token = await makeToken({ exp: Math.floor(Date.now() / 1000) - 10 });
  await assert.rejects(() => verifyFirebaseToken(token, opts()), AuthError);
});

test('rejects wrong audience / issuer / missing sub', async () => {
  await assert.rejects(async () => verifyFirebaseToken(await makeToken({ aud: 'other' }), opts()), AuthError);
  await assert.rejects(async () => verifyFirebaseToken(await makeToken({ iss: 'https://evil.example' }), opts()), AuthError);
  await assert.rejects(async () => verifyFirebaseToken(await makeToken({ sub: '' }), opts()), AuthError);
});

test('rejects tampered payload', async () => {
  const token = await makeToken();
  const [h, , s] = token.split('.');
  const tampered = `${h}.${enc({ sub: 'attacker', aud: PROJECT })}.${s}`;
  await assert.rejects(async () => verifyFirebaseToken(tampered, opts()), AuthError);
});

test('rejects unknown kid, alg none, and garbage', async () => {
  await assert.rejects(async () => verifyFirebaseToken(await makeToken({}, { kid: 'nope' }), opts()), AuthError);
  const nowSec = Math.floor(Date.now() / 1000);
  const noneToken = `${enc({ alg: 'none', kid: 'test-kid' })}.${enc({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: 'x', iat: nowSec, exp: nowSec + 100 })}.`;
  await assert.rejects(async () => verifyFirebaseToken(noneToken, opts()), AuthError);
  await assert.rejects(async () => verifyFirebaseToken('not-a-jwt', opts()), AuthError);
});
