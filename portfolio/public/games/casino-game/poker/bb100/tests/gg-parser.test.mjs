// tests/gg-parser.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { splitIntoHands, parseHand, parseFile } from '../js/parser/gg-parser.mjs';
import { dollarsToUC } from '../js/stats/money.mjs';

const fix = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

// === Splitter ===
test('splitIntoHands returns 1 chunk per hand block', () => {
  const combined = fix('hand-walk-bb.txt') + '\n' + fix('hand-fold-preflop.txt');
  const hands = splitIntoHands(combined);
  assert.equal(hands.length, 2);
  assert.match(hands[0], /^Poker Hand #RC1000001/);
  assert.match(hands[1], /^Poker Hand #RC1000002/);
});

test('handles trailing blank lines', () => {
  const text = fix('hand-walk-bb.txt') + '\n\n\n';
  assert.equal(splitIntoHands(text).length, 1);
});

test('handles CRLF line endings', () => {
  const text = fix('hand-walk-bb.txt').replace(/\n/g, '\r\n');
  assert.equal(splitIntoHands(text).length, 1);
});

// === Header ===
test('parseHand extracts id, stake, date from header', () => {
  const h = parseHand(fix('hand-walk-bb.txt'));
  assert.equal(h.id, 'RC1000001');
  assert.equal(h.stake.sbUC, dollarsToUC('0.01'));
  assert.equal(h.stake.bbUC, dollarsToUC('0.02'));
  assert.equal(h.date, '2026-05-21T03:00:00Z');
});

// === Hero seat + position ===
test('parseHand: Hero on seat 2 in 2-player table = BB', () => {
  const h = parseHand(fix('hand-walk-bb.txt'));
  assert.equal(h.hero.seat, 2);
  assert.equal(h.hero.position, 'BB');
});

test('parseHand: Hero on button (seat 1) in 3-player = BTN', () => {
  const h = parseHand(fix('hand-fold-preflop.txt'));
  assert.equal(h.hero.position, 'BTN');
});

test('parseHand extracts Hero cards if dealt', () => {
  const h = parseHand(fix('hand-walk-bb.txt'));
  assert.deepEqual(h.hero.cards, ['Ks', 'Kh']);
});

// === Contributions + collections ===
test('parseHand: walk in BB → contributed $0.02, collected $0.03 (uncalled+pot), net +$0.01', () => {
  const h = parseHand(fix('hand-walk-bb.txt'));
  assert.equal(h.contributedUC, dollarsToUC('0.02'));
  assert.equal(h.collectedUC, dollarsToUC('0.03'));
  assert.equal(h.collectedUC - h.contributedUC, dollarsToUC('0.01'));
});

test('parseHand: fold preflop on button → contributed $0, collected $0', () => {
  const h = parseHand(fix('hand-fold-preflop.txt'));
  assert.equal(h.contributedUC, 0n);
  assert.equal(h.collectedUC, 0n);
});

test('parseHand: 3bet fold → contributed $0.24, collected $0.31 (uncalled $0.18 + pot $0.13)', () => {
  const h = parseHand(fix('hand-3bet-fold.txt'));
  assert.equal(h.contributedUC, dollarsToUC('0.24'));
  assert.equal(h.collectedUC, dollarsToUC('0.31'));
});

test('parseHand: showdown-win → correct contributions across streets', () => {
  const h = parseHand(fix('hand-showdown-win.txt'));
  // SB $0.01, raise to $0.06 (contributed $0.06), flop bet $0.08, turn bet $0.20, river check
  // Total contributed = 0.06 + 0.08 + 0.20 = 0.34
  assert.equal(h.contributedUC, dollarsToUC('0.34'));
  assert.equal(h.collectedUC, dollarsToUC('0.65'));
});

test('parseHand: uncalled-return → correct contributions', () => {
  const h = parseHand(fix('hand-uncalled-return.txt'));
  // SB $0.01, raise to $0.06, flop bet $0.50 (returned uncalled), collect $0.12
  // contributed = $0.01(SB) + ($0.06-$0.01 raise extra) + $0.50(flop bet)
  // Actually: SB $0.01 (heroStreetCommitted=0.01), raise to $0.06: extra = 0.06-0.01=0.05, contributed=0.01+0.05=0.06
  // Then flop: bets $0.50, contributed += $0.50 → total = $0.56
  assert.equal(h.contributedUC, dollarsToUC('0.56'));
  assert.equal(h.collectedUC, dollarsToUC('0.62')); // $0.50 uncalled + $0.12 collected
});

// === uncalledUC tracking ===
test('parseHand: walk in BB → uncalledUC = $0.01 (the returned SB excess)', () => {
  const h = parseHand(fix('hand-walk-bb.txt'));
  assert.equal(h.uncalledUC, dollarsToUC('0.01'));
});

test('parseHand: 3bet fold → uncalledUC = $0.18 (the returned raise)', () => {
  const h = parseHand(fix('hand-3bet-fold.txt'));
  assert.equal(h.uncalledUC, dollarsToUC('0.18'));
});

test('parseHand: uncalled-return fixture → uncalledUC = $0.50 (returned flop bet)', () => {
  const h = parseHand(fix('hand-uncalled-return.txt'));
  assert.equal(h.uncalledUC, dollarsToUC('0.50'));
});

test('parseHand: fold preflop on button → uncalledUC = $0 (no uncalled bet)', () => {
  const h = parseHand(fix('hand-fold-preflop.txt'));
  assert.equal(h.uncalledUC, 0n);
});

// === Rake / jackpot / showdown / all-in ===
test('parseHand: rake extracted from SUMMARY', () => {
  const h = parseHand(fix('hand-3bet-fold.txt'));
  assert.equal(h.rakeUC, dollarsToUC('0.02'));
  assert.equal(h.totalPotUC, dollarsToUC('0.15'));
});

test('parseHand: jackpotUC = $0 when SUMMARY line has Jackpot $0', () => {
  const h = parseHand(fix('hand-3bet-fold.txt'));
  // hand-3bet-fold.txt has: Total pot $0.15 | Rake $0.02 | Jackpot $0 | Bingo $0 | Fortune $0 | Tax $0
  assert.equal(h.jackpotUC, 0n);
});

test('parseHand: jackpotUC parsed correctly from SUMMARY with non-zero jackpot', () => {
  // Inline fixture with a $0.03 jackpot fee
  const text = `Poker Hand #RC9999999: Hold'em No Limit ($0.01/$0.02) - 2026/05/21 03:00:00
Table 'TestTable' 2-max Seat #1 is the button
Seat 1: Villain1 ($2 in chips)
Seat 2: Hero ($2 in chips)
Villain1: posts small blind $0.01
Hero: posts big blind $0.02
*** HOLE CARDS ***
Dealt to Hero [Ks Kh]
Villain1: folds
Uncalled bet ($0.01) returned to Hero
Hero collected $0.02 from pot
*** SUMMARY ***
Total pot $0.03 | Rake $0.00 | Jackpot $0.03 | Bingo $0 | Fortune $0 | Tax $0
Seat 1: Villain1 (button) (small blind) folded before Flop
Seat 2: Hero (big blind) collected ($0.02)
`;
  const h = parseHand(text);
  assert.equal(h.jackpotUC, dollarsToUC('0.03'));
  assert.equal(h.rakeUC, 0n);
});

test('parseHand: walk in BB → reachedShowdown=false (Hero collected, not showed)', () => {
  const h = parseHand(fix('hand-walk-bb.txt'));
  assert.equal(h.reachedShowdown, false);
});

test('parseHand: showdown win → reachedShowdown=true (Hero showed)', () => {
  const h = parseHand(fix('hand-showdown-win.txt'));
  assert.equal(h.reachedShowdown, true);
});

test('parseHand: 3bet fold → reachedShowdown=false (Hero collected uncontested)', () => {
  const h = parseHand(fix('hand-3bet-fold.txt'));
  assert.equal(h.reachedShowdown, false);
});

test('parseHand: all-in detection sets heroAllIn + street', () => {
  const h = parseHand(fix('hand-allin-showdown.txt'));
  assert.equal(h.heroAllIn, true);
  assert.equal(h.allInStreet, 'preflop');
});

// === Showdown cards extraction ===
test('parseHand: showdown captures hero, villains, board', () => {
  const h = parseHand(fix('hand-allin-showdown.txt'));
  assert.ok(h.showdown);
  assert.deepEqual(h.showdown.hero, ['As', 'Ah']);
  assert.deepEqual(h.showdown.villains.Villain1, ['Kc', 'Kd']);
  assert.deepEqual(h.showdown.board, ['7d', '2c', '5h', '9s', '3c']);
});

test('parseHand: no showdown → showdown field is null', () => {
  const h = parseHand(fix('hand-walk-bb.txt'));
  assert.equal(h.showdown, null);
});

// === parseFile ===
test('parseFile on sample file 1 parses 199 hands', () => {
  let content;
  try {
    content = readFileSync('/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/GG20260521-0135 - RushAndCash32413741 - 0.01 - 0.02 - 6max.txt', 'utf8');
  } catch { return; /* sample not available */ }
  const result = parseFile('sample1.txt', content);
  assert.equal(result.skipped, 0, `unexpected skips: ${(result.errors || []).join('\n')}`);
  assert.equal(result.hands.length, 199);
});

test('parseFile on all 8 sample files yields 1815 hands total', async () => {
  const dir = '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8';
  let list;
  try {
    list = readdirSync(dir).filter(f => f.endsWith('.txt'));
  } catch (e) {
    if (e.code === 'ENOENT') return;
    throw e;
  }
  let total = 0;
  for (const f of list) {
    const r = parseFile(f, readFileSync(`${dir}/${f}`, 'utf8'));
    assert.equal(r.skipped, 0, `${f}: ${(r.errors || []).join('\n')}`);
    total += r.hands.length;
  }
  assert.equal(total, 1815);
});
