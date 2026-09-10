import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { mountLobbyWalletRefresh } from '../../roulette/js/wallet/lobby-wallet-refresh.js';
import { openRouletteLive, closeRouletteLive, refreshRouletteWallet } from '../roulette-live.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function childHarness(load = async () => {}) {
  const listeners = new Map(), timers = new Map(), messages = [];
  let id = 0, busy = false, refreshes = 0, balance = 0;
  const view = {
    location: { origin: 'https://casino.test' },
    parent: { postMessage: (data, origin) => messages.push({ data, origin }) },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
    setTimeout: callback => { const key = ++id; timers.set(key, callback); return key; },
    clearTimeout: key => timers.delete(key), console: { warn() {} },
  };
  const wallet = { getBalance: () => balance, load: async () => { refreshes++; return load(); } };
  const dispose = mountLobbyWalletRefresh({ view, walletClient: wallet, isBusy: () => busy });
  const message = overrides => listeners.get('message')?.({ source: view.parent, origin: view.location.origin,
    data: { source: 'cg-lobby', type: 'wallet-refresh' }, ...overrides });
  const tick = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); };
  return { view, messages, timers, listeners, dispose, message, tick,
    setBusy: value => { busy = value; }, setBalance: value => { balance = value; }, count: () => refreshes };
}

test('iframe accepts refresh only from its same-origin parent and uses the existing wallet load', async () => {
  let balance = 0, gate = 'insufficient', notifications = 0;
  const h = childHarness(async () => { balance = 1000; gate = 'ready'; notifications++; });
  h.message({ origin: 'https://other.test' });
  h.message({ source: {} });
  h.message({ data: { source: 'cg-roulette', type: 'wallet-refresh' } });
  assert.equal(h.count(), 0);
  h.message(); await flush();
  assert.equal(h.count(), 1);
  assert.equal(balance, 1000); assert.equal(gate, 'ready'); assert.equal(notifications, 1);
  assert.equal(h.view.rouletteWalletRefreshing, false);
  assert.equal(h.messages[0].data.type, 'wallet-refresh-ready');
  assert.deepEqual(h.messages.at(-1), { data: { source: 'cg-roulette', type: 'wallet-refreshed', ok: true }, origin: 'https://casino.test' });
  h.dispose();
});

test('refresh waits for the current round and prevents a new debit until the read completes', async () => {
  let finish;
  const h = childHarness(() => new Promise(resolve => { finish = resolve; }));
  h.setBusy(true); h.message();
  assert.equal(h.count(), 0, 'does not reconcile an in-flight round');
  assert.equal(h.view.rouletteWalletRefreshing, true);
  h.tick(); assert.equal(h.count(), 0);
  h.setBusy(false); h.tick();
  assert.equal(h.count(), 1);
  assert.equal(h.view.rouletteWalletRefreshing, true, 'new spins stay blocked until fresh balance arrives');
  finish(); await flush();
  assert.equal(h.view.rouletteWalletRefreshing, false);
  assert.equal(h.timers.size, 0);
  h.dispose();
});

test('refresh waits for the initial auth wallet read even when the first balance is below table minimum', async () => {
  const h = childHarness(); h.setBalance(null); h.message();
  assert.equal(h.count(), 0, 'does not race the bootstrap wallet load');
  h.tick(); assert.equal(h.count(), 0);
  h.setBalance(0); h.tick(); await flush();
  assert.equal(h.count(), 1, 'zero chips is initialized and must refresh to clear the insufficient gate');
  assert.equal(h.view.rouletteWalletRefreshing, false);
  assert.equal(h.timers.size, 0); h.dispose();
});

test('purchases during a refresh coalesce into one subsequent read and failure unlocks the game', async () => {
  const finishes = [];
  const h = childHarness(() => new Promise((resolve, reject) => finishes.push({ resolve, reject })));
  h.message(); h.message(); h.message();
  assert.equal(h.count(), 1, 'wallet reads never overlap');
  finishes[0].resolve(); await flush();
  assert.equal(h.count(), 2, 'latest purchase is read after the first response');
  finishes[1].reject(new Error('offline')); await flush();
  assert.equal(h.view.rouletteWalletRefreshing, false);
  assert.equal(h.messages.at(-1).data.ok, false);
  h.dispose();
});

test('closing an iframe cancels deferred work and ignores a late refresh response', async () => {
  const h = childHarness(); h.setBusy(true); h.message(); h.dispose(); h.tick();
  assert.equal(h.count(), 0); assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
  let finish;
  const late = childHarness(() => new Promise(resolve => { finish = resolve; }));
  late.message(); late.dispose(); const before = late.messages.length;
  finish(); await flush();
  assert.equal(late.messages.length, before, 'no message posted after iframe teardown');
});

test('parent refresh keeps the existing roulette iframe and retries after its module becomes ready', async () => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://casino.test/lobby-3d/' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../vendor/three-0.149.0.min.js', import.meta.url), 'utf8'), context);
  globalThis.THREE = context.THREE;
  const rig = new THREE.Group();
  rig.userData = { setBoardStats() {}, setBets() {}, buyIn() {}, cancelSpin() {} };
  let cameraMoves = 0;
  globalThis.CASINO = {
    floor: { rouletteRigs: new Map([['r1', rig]]), ROULETTE_FELT: {} },
    floorplan: { WALK_RECTS: [{ id: 'floor', x0: -20 }] },
    app: { glideTo: async () => { cameraMoves++; } }, world: { anchorById: () => null },
  };
  try {
    assert.equal(refreshRouletteWallet(), false);
    openRouletteLive({ table: { id: 'r1', key: 'low' } }); await flush();
    const iframe = document.querySelector('iframe'), sent = [];
    iframe.contentWindow.postMessage = (data, origin) => sent.push({ data, origin });
    assert.equal(refreshRouletteWallet(), true);
    assert.equal(sent[0].data.type, 'wallet-refresh');
    const dispatch = (type, source = iframe.contentWindow) => window.dispatchEvent(new window.MessageEvent('message', {
      origin: window.location.origin, source, data: { source: 'cg-roulette', type },
    }));
    dispatch('wallet-refreshed', {});
    dispatch('wallet-refresh-ready');
    assert.equal(sent.length, 2, 'an early purchase is repeated when the iframe listener is mounted');
    dispatch('wallet-refreshed'); dispatch('wallet-refresh-ready');
    assert.equal(sent.length, 2, 'acknowledged refresh is not repeated');
    assert.equal(document.querySelector('iframe'), iframe);
    assert.equal(cameraMoves, 1, 'purchase does not navigate away from the live table');
    closeRouletteLive(); assert.equal(refreshRouletteWallet(), false);
  } finally { closeRouletteLive(); dom.window.close(); delete globalThis.CASINO; }
});
