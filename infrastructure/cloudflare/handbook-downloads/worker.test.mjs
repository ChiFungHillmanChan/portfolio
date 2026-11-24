import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import worker, { parseDownload, paymentFrom, verifyStripe } from './worker.mjs';

const PDF = 'https://hillmanchan.com/downloads/ai-engineer-handbook/AI_Engineer_Handbook_02_LLM_RAG_EN.pdf';
const ctx = () => {
  const pending = [];
  return { waitUntil: (p) => pending.push(p), settle: () => Promise.all(pending) };
};
const limiter = (allow) => ({ calls: [], async limit({ key }) { this.calls.push(key); return { success: allow(key, this.calls.length) }; } });

// A tiny stand-in for D1 that records statements and answers batch() with canned rows.
const fakeDb = (rows = []) => ({
  runs: [],
  prepare(sql) {
    const db = this;
    return { sql, bind(...args) { return { sql, args, run: async () => { db.runs.push({ sql, args }); return {}; } }; } };
  },
  async batch(statements) { this.batched = statements; return statements.map((_, i) => ({ results: rows[i] || [] })); },
});

test('parses handbook PDF paths and ignores everything else', () => {
  assert.deepEqual(parseDownload('/downloads/ai-engineer-handbook/AI_Engineer_Handbook_00_Intro.pdf'),
    { handbook: 'ai-engineer', part: 0, lang: 'zh', file: 'AI_Engineer_Handbook_00_Intro.pdf' });
  assert.equal(parseDownload(new URL(PDF).pathname).lang, 'en');
  assert.equal(parseDownload(new URL(PDF).pathname).part, 2);
  assert.equal(parseDownload('/downloads/other/AI_Engineer_Handbook_01_Software.pdf'), null);
  assert.equal(parseDownload('/downloads/ai-engineer-handbook/notes.txt'), null);
  assert.equal(parseDownload('/downloads/ai-engineer-handbook/../x.pdf'), null);
});

test('a download is served from the origin and recorded once with a hashed visitor', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('%PDF', { status: 200, headers: { 'content-type': 'application/pdf' } }));
  const env = { DB: fakeDb(), IP_SALT: 'salt', DOWNLOAD_LIMIT: limiter(() => true), REQUEST_LIMIT: limiter(() => true) };
  const c = ctx();
  const response = await worker.fetch(new Request(PDF, { headers: { 'cf-connecting-ip': '203.0.113.9' } }), env, c);
  await c.settle();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '%PDF');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(env.DB.runs.length, 1);
  const [at, day, handbook, part, lang, visitor] = env.DB.runs[0].args;
  assert.equal(day, at.slice(0, 10));
  assert.deepEqual([handbook, part, lang], ['ai-engineer', 2, 'en']);
  assert.match(visitor, /^[0-9a-f]{24}$/);
  assert.ok(!JSON.stringify(env.DB.runs).includes('203.0.113.9'), 'the IP address is never stored');
  assert.match(env.DB.runs[0].sql, /WHERE NOT EXISTS/, 'repeat requests within the window are not counted again');
});

test('byte ranges after the first are served but not counted, and do not use the download limit', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('x', { status: 206 }));
  const env = { DB: fakeDb(), DOWNLOAD_LIMIT: limiter(() => false), REQUEST_LIMIT: limiter(() => true) };
  const c = ctx();
  const response = await worker.fetch(new Request(PDF, { headers: { range: 'bytes=65536-131071' } }), env, c);
  await c.settle();
  assert.equal(response.status, 206);
  assert.equal(env.DB.runs.length, 0);
  assert.equal(env.DOWNLOAD_LIMIT.calls.length, 0);
});

test('too many downloads from one visitor get 429 without touching the origin', async (t) => {
  const origin = t.mock.method(globalThis, 'fetch', async () => new Response('%PDF'));
  const env = { DB: fakeDb(), DOWNLOAD_LIMIT: limiter((_, n) => n <= 10), REQUEST_LIMIT: limiter(() => true) };
  const statuses = [];
  for (let i = 0; i < 12; i += 1) {
    const c = ctx();
    statuses.push((await worker.fetch(new Request(PDF, { headers: { 'cf-connecting-ip': '198.51.100.1' } }), env, c)).status);
    await c.settle();
  }
  assert.deepEqual(statuses.slice(10), [429, 429]);
  assert.equal(origin.mock.callCount(), 10);
  assert.ok(env.DOWNLOAD_LIMIT.calls.every((key) => key === '198.51.100.1'));
});

test('a broken limiter or database never blocks a download', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('%PDF'));
  const broken = { limit: async () => { throw new Error('down'); } };
  const env = { DB: { prepare() { throw new Error('db down'); } }, DOWNLOAD_LIMIT: broken, REQUEST_LIMIT: broken };
  const c = ctx();
  t.mock.method(console, 'error', () => {});
  const response = await worker.fetch(new Request(PDF), env, c);
  assert.equal(response.status, 200);
});

test('other paths pass straight through', async (t) => {
  const origin = t.mock.method(globalThis, 'fetch', async () => new Response('page'));
  const response = await worker.fetch(new Request('https://hillmanchan.com/handbook/ai-engineer'), {}, ctx());
  assert.equal(await response.text(), 'page');
  assert.equal(origin.mock.callCount(), 1);
});

test('stats need the admin token and are never cached', async () => {
  const env = { DB: fakeDb([[{ handbook: 'ai-engineer', part: 1, lang: 'zh', downloads: 3, people: 2 }]]), ADMIN_TOKEN: 'secret-token', ADMIN_LIMIT: limiter(() => true) };
  const url = 'https://hillmanchan.com/api/handbook/stats';
  assert.equal((await worker.fetch(new Request(url), env, ctx())).status, 401);
  assert.equal((await worker.fetch(new Request(url, { headers: { authorization: 'Bearer wrong' } }), env, ctx())).status, 401);
  const ok = await worker.fetch(new Request(url, { headers: { authorization: 'Bearer secret-token' } }), env, ctx());
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  const body = await ok.json();
  assert.equal(body.parts[0].downloads, 3);
  assert.equal(env.DB.batched.length, 6);
});

test('stats are refused without any configured token', async () => {
  const response = await worker.fetch(new Request('https://hillmanchan.com/api/handbook/stats', { headers: { authorization: 'Bearer ' } }), { DB: fakeDb() }, ctx());
  assert.equal(response.status, 401);
});

const sign = (body, secret, t) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

test('Stripe signatures are checked, including their age', async () => {
  const now = 1_800_000_000_000;
  const t = now / 1000;
  assert.equal(await verifyStripe('{}', sign('{}', 'whsec_x', t), 'whsec_x', now), true);
  assert.equal(await verifyStripe('{}', sign('{}', 'whsec_other', t), 'whsec_x', now), false);
  assert.equal(await verifyStripe('{"a":1}', sign('{}', 'whsec_x', t), 'whsec_x', now), false);
  assert.equal(await verifyStripe('{}', sign('{}', 'whsec_x', t - 600), 'whsec_x', now), false);
  assert.equal(await verifyStripe('{}', undefined, 'whsec_x', now), false);
});

const session = (extra) => ({
  type: 'checkout.session.completed',
  created: 1_800_000_000,
  data: { object: { id: 'cs_1', payment_status: 'paid', amount_total: 2000, currency: 'hkd', livemode: true, metadata: { source: 'handbook' }, payment_link: 'plink_a', client_reference_id: 'ai-engineer__p02__en', created: 1_800_000_000, ...extra } },
});

test('handbook payments are recognised with their part and language; others are ignored', () => {
  assert.deepEqual(paymentFrom(session(), []), {
    session: 'cs_1', at: new Date(1_800_000_000_000).toISOString(), handbook: 'ai-engineer', part: 2, lang: 'en',
    amount: 2000, currency: 'HKD', paymentLink: 'plink_a', livemode: 1,
  });
  assert.equal(paymentFrom(session({ metadata: {}, payment_link: 'plink_course' }), ['plink_a']), null);
  assert.equal(paymentFrom(session({ metadata: {} }), ['plink_a']).part, 2);
  assert.equal(paymentFrom(session({ payment_status: 'unpaid' }), []), null);
  assert.equal(paymentFrom(session({ client_reference_id: null }), []).part, null);
  assert.equal(paymentFrom(session({ client_reference_id: 'x"; DROP TABLE' }), []).part, null);
  assert.equal(paymentFrom({ ...session(), type: 'charge.refunded' }, []), null);
});

test('the webhook records a signed handbook payment once and rejects unsigned calls', async () => {
  const env = { DB: fakeDb(), STRIPE_WEBHOOK_SECRET: 'whsec_x', HANDBOOK_PAYMENT_LINKS: 'plink_a' };
  const body = JSON.stringify({ ...session(), created: Math.floor(Date.now() / 1000) });
  const url = 'https://hillmanchan.com/api/handbook/stripe-webhook';
  const bad = await worker.fetch(new Request(url, { method: 'POST', body }), env, ctx());
  assert.equal(bad.status, 400);
  const good = await worker.fetch(new Request(url, { method: 'POST', body, headers: { 'stripe-signature': sign(body, 'whsec_x', Math.floor(Date.now() / 1000)) } }), env, ctx());
  assert.deepEqual(await good.json(), { received: true, recorded: true });
  assert.match(env.DB.runs[0].sql, /INSERT OR IGNORE INTO payments/);
  assert.deepEqual(env.DB.runs[0].args.slice(2, 7), ['ai-engineer', 2, 'en', 2000, 'HKD']);
});
