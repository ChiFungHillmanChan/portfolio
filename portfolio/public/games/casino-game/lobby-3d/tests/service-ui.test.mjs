import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { cashierCard, barCard, buyInCard, mountWalletPill } from '../ui.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const dom = new JSDOM('<!doctype html><body></body>');
  globalThis.document = dom.window.document;
  let balance = 500, cash = 2000, buys = 0;
  const wallet = {
    getBalance: () => balance, getCash: () => cash, getResetInfo: () => ({}), subscribe: () => () => {},
    buyIn: async amount => { buys++; balance += amount; cash -= amount; },
    cashOut: async amount => { const value = amount === 'all' ? balance : amount; balance -= value; cash += value; },
  };
  return { dom, wallet, buys: () => buys, close(card) { card.dispatchEvent(new dom.window.Event('card:teardown')); dom.window.close(); } };
}

test('cashier performs one wallet exchange, then shows the matching service action', async () => {
  const h = setup(), calls = [];
  let finish;
  const card = cashierCard({ walletClient: h.wallet, onReset() {}, onExchange: (kind, amount) => {
    calls.push([kind, amount]); return new Promise(resolve => { finish = resolve; });
  } });
  try {
    card.querySelector('.cash-amt').value = '250'; card.querySelector('.cash-buy').click(); await flush();
    assert.deepEqual(calls, [['buyIn', 250]]);
    assert.equal(h.wallet.getBalance(), 750);
    assert.equal(card.querySelector('.cash-out').disabled, true, 'another exchange cannot overlap service');
    card.querySelector('.cash-buy').click(); assert.equal(h.buys(), 1);
    finish(); await flush();
    assert.equal(card.querySelector('.cash-buy').disabled, false);
  } finally { finish?.(); h.close(card); }
});

test('failed exchange never animates payout, and an animation error does not report a failed wallet transaction', async () => {
  const h = setup(); let animated = 0;
  h.wallet.buyIn = async () => { throw Object.assign(new Error('no'), { code: 'insufficient-cash' }); };
  const card = cashierCard({ walletClient: h.wallet, onReset() {}, onExchange: async () => { animated++; throw new Error('visual'); } });
  try {
    card.querySelector('.cash-amt').value = '100'; card.querySelector('.cash-buy').click(); await flush();
    assert.equal(animated, 0);
    assert.match(card.querySelector('.cash-err').textContent, /Not enough/);
    card.querySelector('.cash-out-all').click(); await flush(); await flush();
    assert.equal(animated, 1);
    assert.equal(h.wallet.getBalance(), 0);
    assert.equal(card.querySelector('.cash-err').hidden, true, 'successful wallet operation must not invite a retry');
    assert.match(card.querySelector('.cash-status').textContent, /complete/i);
  } finally { h.close(card); }
});

test('bar orders a selected drink once, reports completion and remains keyboard operable', async () => {
  const h = setup(), calls = []; let finish;
  const card = barCard({ onPractice() {}, onDismiss() {}, onOrder: id => {
    calls.push(id); return new Promise(resolve => { finish = resolve; });
  } });
  try {
    card.querySelector('.bar-drink').value = 'martini'; card.querySelector('[data-act="order"]').click();
    await flush();
    assert.deepEqual(calls, ['martini']);
    assert.equal(card.querySelector('[data-act="order"]').disabled, true);
    finish(); await flush();
    assert.match(card.querySelector('.bar-status').textContent, /served/i);
    assert.equal(card.querySelector('[data-act="order"]').disabled, false);
  } finally { finish?.(); h.close(card); }
});

test('wallet offers chip purchases anywhere without exposing cash-out', () => {
  const h = setup(), host = h.dom.window.document.createElement('div');
  let opened = 0;
  const pill = mountWalletPill(host, { walletClient: h.wallet, onBuyChips: () => { opened++; } });
  try {
    assert.equal(host.querySelector('.pill-buy'), null, 'signed-out guests cannot exchange');
    pill.setMode('balance');
    host.querySelector('.pill-buy').click();
    assert.equal(opened, 1);
    assert.doesNotMatch(host.textContent, /cash out/i);
  } finally { pill.setMode('signin'); h.dom.window.close(); }
});

test('direct chip purchase exchanges exactly once and refreshes embedded tables after success', async () => {
  const h = setup(); let finish, calls = 0, refreshed = 0, amount;
  h.wallet.buyIn = value => { calls++; amount = value; return new Promise(resolve => { finish = resolve; }); };
  h.wallet.cashOut = () => { throw new Error('cash-out must remain at the cashier'); };
  const card = buyInCard({ walletClient: h.wallet, onClose() {}, onPurchased() {
    refreshed++; throw new Error('presentation refresh must not fail a committed purchase');
  } });
  try {
    card.querySelector('.buyin-amount').value = '350';
    card.querySelector('.buyin-confirm').click(); card.querySelector('.buyin-confirm').click();
    assert.equal(calls, 1); assert.equal(amount, 350);
    assert.equal(refreshed, 0, 'refresh waits for the committed purchase');
    assert.equal(card.querySelector('.buyin-confirm').disabled, true);
    finish(); await flush();
    assert.equal(refreshed, 1);
    assert.match(card.querySelector('[role="status"]').textContent, /350 chips added/i);
    assert.equal(card.querySelector('.buyin-confirm').disabled, false);
    assert.equal(card.querySelector('.cash-out'), null);
  } finally { finish?.(); h.close(card); }
});

test('direct chip purchase rejects invalid input and reports wallet failures without success', async () => {
  const h = setup();
  const card = buyInCard({ walletClient: h.wallet, onClose() {} });
  try {
    for (const value of ['0', '-1', '1.5', '']) {
      card.querySelector('.buyin-amount').value = value; card.querySelector('.buyin-confirm').click(); await flush();
    }
    assert.equal(h.buys(), 0);
    h.wallet.buyIn = async () => { throw Object.assign(new Error('insufficient'), { code: 'insufficient-cash' }); };
    card.querySelector('.buyin-amount').value = '3000'; card.querySelector('.buyin-confirm').click(); await flush();
    assert.match(card.querySelector('[role="status"]').textContent, /Not enough/i);
    assert.equal(card.querySelector('.buyin-confirm').disabled, false);
  } finally { h.close(card); }
});
