# Blackjack 3D Playable Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four blackjack tables on the 3D casino floor playable: sit, bet on a 2D board mirrored by real 3D chips, watch a European-style deal with casino-accurate card placement, act (hit/stand/double/split), and get paid with chips animating between the dealer's tray and the bet spots — all against the real shared server wallet.

**Architecture:** A root-level ES module `blackjack-live.js` (mirrors the existing `roulette-live.js` pattern: platform layer, owns DOM + wallet, drives the 3D scene through `globalThis.CASINO`) + a pure ES module `blackjack-rules.js` (node-tested rules) + small engine additions (ported card/chip animation primitives from the retired prototype, seat-layout constants centralized in `layouts.js`, rig exposure from `blackjack-table.js`).

**Tech Stack:** Vanilla JS, THREE.js r149 (global `THREE`), `node --test`, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-14-blackjack-3d-playable-design.md`

## Global Constraints

- Branch: `feat/casino-lobby-credits`. Commit after every task; never push or merge.
- Working dir for all commands: `portfolio/src/game/casino-game/calculator/lobby-3d/` unless stated.
- **A parallel Claude session is actively editing this same tree** (roulette live-play: `roulette-live.js`, `roulette-map.js`, `roulette-table.js`, plus lines in `platform.js`, `ui.js`, `sections.js`, `app.js`). Re-read any shared file immediately before editing it, make strictly additive edits, and NEVER modify roulette-* files or revert changes you didn't write. `git add` only the specific files you changed.
- Server bet keys are exactly `main`, `perfectPair`, `twentyOnePlus3` (NOT `twentyOnePlusThree`).
- Tier limits come from `getTable(table.gameId).betTypes` (`../js/wallet/table-config.js`); gameIds: `blackjack-micro`, `blackjack-mini`, `blackjack`, `blackjack-high`.
- European deal: player, dealer up-card, player. No hole card, no insurance, no peek. Dealer stands on all 17s. Blackjack 3:2 (unsplit 2-card 21). Max one split, no double-after-split, split aces hittable.
- The dev wallet stub must be gated to `localhost`/`127.0.0.1` AND an explicit `?stubwallet` param.
- After engine (`src/`) changes: `node build.mjs` regenerates `index.html`. Full check: `node --test tests/*.test.mjs` (all pre-existing tests must stay green; 21 pass today plus whatever the roulette session added).
- Final sync: copy changed files to `portfolio/public/games/casino-game/lobby-3d/` (full mirror of the src tree).
- Cards: `C.cards.makeCard({r, s})` — `r` 2–14 (14=Ace), `s` 0–3 (♠♥♦♣; 1,2 are red). Chip meshes exist for denominations 1,5,10,25,50,100,500,1000,5000.

---

### Task 1: Pure rules module `blackjack-rules.js`

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/lobby-3d/blackjack-rules.js`
- Create: `portfolio/src/game/casino-game/calculator/lobby-3d/tests/blackjack-rules.test.mjs`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (used by Tasks 4–5 and tests):
  `makeShoe(decks=6, rand?) -> card[]`, `handValue(cards) -> {total, soft}`,
  `isBlackjack(cards) -> bool`, `dealerPlay(hand, shoe) -> hand` (mutates+returns),
  `canSplit(cards) -> bool`,
  `settleMain({cards, stake, isSplit}, dealerCards) -> chips`,
  `perfectPairReturn(stake, [c1, c2]) -> chips`,
  `twentyOnePlus3Return(stake, c1, c2, dUp) -> chips`,
  `validateBets(bets, betTypes, balance, maxTotalBet) -> {ok, total?|reason?}`,
  `chipRack(betTypes) -> number[]`.

- [ ] **Step 1: Write the failing test**

Create `tests/blackjack-rules.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeShoe, handValue, isBlackjack, dealerPlay, canSplit,
  settleMain, perfectPairReturn, twentyOnePlus3Return, validateBets, chipRack,
} from '../blackjack-rules.js';

const c = (r, s = 0) => ({ r, s });

test('handValue: aces flex, soft flag', () => {
  assert.deepEqual(handValue([c(14), c(13)]), { total: 21, soft: true });
  assert.deepEqual(handValue([c(14), c(14)]), { total: 12, soft: true });
  assert.deepEqual(handValue([c(14), c(5), c(13)]), { total: 16, soft: false });
  assert.deepEqual(handValue([c(5), c(9), c(13)]), { total: 24, soft: false });
  assert.deepEqual(handValue([c(11), c(12)]), { total: 20, soft: false }); // J+Q
});

test('isBlackjack: 2-card 21 only', () => {
  assert.ok(isBlackjack([c(14), c(10)]));
  assert.ok(!isBlackjack([c(7), c(7), c(7)]));
  assert.ok(!isBlackjack([c(10), c(9)]));
});

test('dealerPlay stands on ALL 17s including soft 17', () => {
  const soft17 = [c(14), c(6)];
  dealerPlay(soft17, [c(5)]);
  assert.equal(soft17.length, 2);            // did not draw
  const sixteen = [c(10), c(6)];
  dealerPlay(sixteen, [c(2)].reverse());
  assert.equal(sixteen.length, 3);           // drew once to 18
});

test('canSplit: equal blackjack value incl mixed tens', () => {
  assert.ok(canSplit([c(13), c(10)]));       // K + 10
  assert.ok(canSplit([c(14), c(14)]));
  assert.ok(!canSplit([c(9), c(10)]));
  assert.ok(!canSplit([c(8), c(8), c(8)]));
});

test('settleMain: European matrix', () => {
  const D21 = [c(14), c(13)];                // dealer blackjack
  const D20 = [c(10), c(13)];
  const D17_3 = [c(5), c(6), c(6)];
  const DBUST = [c(10), c(6), c(9)];
  const h = (cards, stake = 500, isSplit = false) => ({ cards, stake, isSplit });
  assert.equal(settleMain(h([c(14), c(13)]), D21), 500);          // BJ vs BJ push
  assert.equal(settleMain(h([c(14), c(13)]), D20), 1250);         // BJ pays 3:2
  assert.equal(settleMain(h([c(7), c(7), c(7)]), D21), 0);        // dealer BJ wins
  assert.equal(settleMain(h([c(10), c(9)]), DBUST), 1000);        // dealer bust
  assert.equal(settleMain(h([c(10), c(13)]), D20), 500);          // 20 v 20 push
  assert.equal(settleMain(h([c(10), c(9)]), D17_3), 1000);        // 19 beats 17
  assert.equal(settleMain(h([c(10), c(6), c(13)]), DBUST), 0);    // player bust loses even v bust
  assert.equal(settleMain(h([c(14), c(13)], 500, true), D20), 1000); // split 21 is NOT blackjack
  assert.equal(settleMain(h([c(10), c(9)], 1000), D20), 0);       // doubled stake loses whole stake
});

test('perfectPair paytable 25/12/6', () => {
  assert.equal(perfectPairReturn(100, [c(13, 0), c(13, 0)]), 2600); // perfect
  assert.equal(perfectPairReturn(100, [c(13, 0), c(13, 3)]), 1300); // colored (both black)
  assert.equal(perfectPairReturn(100, [c(13, 1), c(13, 2)]), 1300); // colored (both red)
  assert.equal(perfectPairReturn(100, [c(13, 0), c(13, 1)]), 700);  // mixed
  assert.equal(perfectPairReturn(100, [c(13, 0), c(12, 0)]), 0);
  assert.equal(perfectPairReturn(0, [c(13, 0), c(13, 0)]), 0);
});

test('21+3 paytable 100/40/30/10/5', () => {
  assert.equal(twentyOnePlus3Return(100, c(9, 2), c(9, 2), c(9, 2)), 10100); // suited trips
  assert.equal(twentyOnePlus3Return(100, c(7, 2), c(8, 2), c(9, 2)), 4100);  // straight flush
  assert.equal(twentyOnePlus3Return(100, c(9, 0), c(9, 1), c(9, 2)), 3100);  // trips
  assert.equal(twentyOnePlus3Return(100, c(7, 0), c(8, 1), c(9, 2)), 1100);  // straight
  assert.equal(twentyOnePlus3Return(100, c(2, 3), c(9, 3), c(13, 3)), 600);  // flush
  assert.equal(twentyOnePlus3Return(100, c(12, 0), c(13, 1), c(14, 2)), 1100); // QKA straight
  assert.equal(twentyOnePlus3Return(100, c(14, 0), c(2, 1), c(3, 2)), 1100);   // A23 straight
  assert.equal(twentyOnePlus3Return(100, c(2, 0), c(9, 1), c(13, 2)), 0);
});

const MICRO = {
  main:           { min: 50, max: 1000, maxReturn: 2.5, mergeFactor: 8 },
  perfectPair:    { min: 50, max: 250, maxReturn: 26, mergeFactor: 1 },
  twentyOnePlus3: { min: 50, max: 250, maxReturn: 101, mergeFactor: 1 },
};

test('validateBets against tier betTypes', () => {
  assert.deepEqual(validateBets({ main: 100 }, MICRO, 5000, 1750), { ok: true, total: 100 });
  assert.equal(validateBets({ main: 25 }, MICRO, 5000, 1750).reason, 'main-range');
  assert.equal(validateBets({ main: 0, perfectPair: 100 }, MICRO, 5000, 1750).reason, 'main-range');
  assert.equal(validateBets({ main: 100, twentyOnePlus3: 300 }, MICRO, 5000, 1750).reason, 'side-range');
  assert.equal(validateBets({ main: 1000, perfectPair: 250, twentyOnePlus3: 250 }, MICRO, 1200, 1750).reason, 'balance');
  assert.equal(validateBets({ main: 1000, perfectPair: 250, twentyOnePlus3: 250 }, MICRO, 99999, 1400).reason, 'table-max');
});

test('chipRack scales with the tier', () => {
  assert.deepEqual(chipRack(MICRO), [50, 100, 500, 1000]);
  assert.deepEqual(chipRack({ main: { min: 1000, max: 20000 } }), [50, 100, 500, 1000, 5000]);
});

test('makeShoe: 6 decks, injectable rand is deterministic', () => {
  const shoe = makeShoe(6);
  assert.equal(shoe.length, 312);
  const a = makeShoe(1, (n) => 0);
  const b = makeShoe(1, (n) => 0);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((k) => k.r + ':' + k.s)).size, 52);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/blackjack-rules.test.mjs`
Expected: FAIL — `Cannot find module '../blackjack-rules.js'`

- [ ] **Step 3: Write the implementation**

Create `blackjack-rules.js`:

```js
// blackjack-rules.js — pure rules for the 3D lobby's live blackjack round.
// European no-hole-card game, S17, BJ 3:2, one split, no double-after-split.
// No DOM, no THREE, no globals — imported by blackjack-live.js AND node tests.

const defaultRand = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

export function makeDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return d;
}

export function makeShoe(decks = 6, rand = defaultRand) {
  const cards = Array.from({ length: decks }, makeDeck).flat();
  for (let i = cards.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.r === 14) { aces++; total += 11; } else total += Math.min(c.r, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards) => cards.length === 2 && handValue(cards).total === 21;

// S17: dealer draws to 17 and stands on ALL 17s (soft included) — same as 2D.
export function dealerPlay(hand, shoe) {
  while (handValue(hand).total < 17) hand.push(shoe.pop());
  return hand;
}

const bjVal = (r) => Math.min(r, 10) + (r === 14 ? 1 : 0); // 14→11, 10..13→10
export const canSplit = (cards) =>
  cards.length === 2 && bjVal(cards[0].r) === bjVal(cards[1].r);

// One hand's return (chips back, stake included). stake already includes any
// double top-up. European: dealer blackjack (2-card 21) beats everything but
// pushes a player blackjack; a 3+ card dealer 21 is an ordinary 21.
export function settleMain({ cards, stake, isSplit = false }, dealerCards) {
  const p = handValue(cards).total;
  if (p > 21) return 0;
  const pBJ = !isSplit && isBlackjack(cards);
  const dBJ = isBlackjack(dealerCards);
  if (pBJ && dBJ) return stake;
  if (pBJ) return stake + Math.floor(stake * 1.5);
  if (dBJ) return 0;
  const d = handValue(dealerCards).total;
  if (d > 21 || p > d) return stake * 2;
  if (p === d) return stake;
  return 0;
}

// Perfect Pair: 25:1 same rank+suit, 12:1 same rank+color, 6:1 mixed pair.
const RED_SUITS = new Set([1, 2]);
export function perfectPairReturn(stake, [a, b]) {
  if (!stake || a.r !== b.r) return 0;
  if (a.s === b.s) return stake * 26;
  if (RED_SUITS.has(a.s) === RED_SUITS.has(b.s)) return stake * 13;
  return stake * 7;
}

// 21+3 (player's two + dealer up): suited trips 100, straight flush 40,
// trips 30, straight 10, flush 5 — the 2D side-bets.js paytable.
export function twentyOnePlus3Return(stake, c1, c2, dUp) {
  if (!stake) return 0;
  const cs = [c1, c2, dUp];
  const trips = cs.every((k) => k.r === cs[0].r);
  const flush = cs.every((k) => k.s === cs[0].s);
  const rs = cs.map((k) => k.r).sort((x, y) => x - y);
  const straight = (rs[1] === rs[0] + 1 && rs[2] === rs[1] + 1) ||
                   (rs[0] === 2 && rs[1] === 3 && rs[2] === 14);
  if (trips && flush) return stake * 101;
  if (straight && flush) return stake * 41;
  if (trips) return stake * 31;
  if (straight) return stake * 11;
  if (flush) return stake * 6;
  return 0;
}

// Board validation against the tier's real betTypes (table-config shapes).
export function validateBets(bets, betTypes, balance, maxTotalBet = Infinity) {
  const main = bets.main || 0;
  const pp = bets.perfectPair || 0;
  const tpt = bets.twentyOnePlus3 || 0;
  const inR = (a, t) => a >= t.min && a <= t.max;
  if (!inR(main, betTypes.main)) return { ok: false, reason: 'main-range' };
  if (pp !== 0 && !inR(pp, betTypes.perfectPair)) return { ok: false, reason: 'side-range' };
  if (tpt !== 0 && !inR(tpt, betTypes.twentyOnePlus3)) return { ok: false, reason: 'side-range' };
  const total = main + pp + tpt;
  if (total > maxTotalBet) return { ok: false, reason: 'table-max' };
  if (total > balance) return { ok: false, reason: 'balance' };
  return { ok: true, total };
}

// Chip rack denominations for the tier (chip meshes exist for all of these).
export const chipRack = (betTypes) =>
  [50, 100, 500, 1000, 5000].filter((v) => v <= betTypes.main.max);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/blackjack-rules.test.mjs`
Expected: PASS (10 tests)

- [ ] **Step 5: Run the whole suite, then commit**

Run: `node --test tests/*.test.mjs` — all pass.

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/blackjack-rules.js portfolio/src/game/casino-game/calculator/lobby-3d/tests/blackjack-rules.test.mjs
git commit -m "feat(casino-3d): blackjack rules module for live 3D play"
```

---

### Task 2: Seat-layout constants in `layouts.js` + rig exposure from the table

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/layouts.js` (blackjack object, ~line 29)
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/blackjack-table.js`
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/sections.js` (one line, next to the rouletteRigs line)
- Test: `portfolio/src/game/casino-game/calculator/lobby-3d/tests/layouts.test.mjs`

**Interfaces:**
- Produces: `C.layouts.blackjack.seat = { count, angleStart, angleStep, stoolR, mainR, sideR, sideDx, cardsR, stackDr, splitDx }` and `C.layouts.blackjack.seatPoint(angle, radius, tangent) -> [x, z]`.
- Produces: on each blackjack table group: `group.userData.bj = { seat, feltY: 0.83, seatAngle(i), seatPoint, spotLocal(seatIdx, id) -> [x,y,z] (ids: main, main2, perfectPair, twentyOnePlus3), trayLocal: [0, 0.884, -0.19], shoeLocal, dealerSlots, fanDx, freeSeats: [0, 2, 3, 5] }`.
- Produces: `C.floor.blackjackRigs: Map<tableId, group>` (registered in sections.js).

- [ ] **Step 1: Write the failing test** — append to `tests/layouts.test.mjs`:

```js
test('blackjack seat layout: stacks, splits and spots stay on the felt', () => {
  const bj = L.blackjack, s = bj.seat;
  assert.ok(s && s.count === 6);
  const angle = (i) => ((s.angleStart - i * s.angleStep) * Math.PI) / 180;
  for (let i = 0; i < s.count; i++) {
    const a = angle(i);
    for (const [radius, tangent] of [
      [s.mainR, 0], [s.sideR, -s.sideDx], [s.sideR, s.sideDx],       // bet spots
      [s.cardsR, s.splitDx], [s.cardsR, -s.splitDx],                 // split bases
      [s.cardsR - 6 * s.stackDr, 0],                                 // 7th hit card
      [bj.seat.mainR, -s.splitDx],                                   // split bet stack
    ]) {
      const [x, z] = bj.seatPoint(a, radius, tangent);
      assert.ok(Math.hypot(x, z) < 1.6 - 0.05, `inside rim seat ${i}`);
      assert.ok(z - L.CARD_H / 2 > -0.02, `on +Z felt seat ${i}`);
    }
  }
  // deepest stack card never collides with the dealer's card row (z 0.16)
  const deep = bj.seatPoint(angle(2), s.cardsR - 6 * s.stackDr, 0);
  assert.ok(Math.hypot(deep[0], deep[1]) > 0.45);
});
```

- [ ] **Step 2: Run it** — `node --test tests/layouts.test.mjs` → FAIL (`bj.seat` undefined).

- [ ] **Step 3: Implement.**

In `src/logic/layouts.js`, inside the `blackjack` object (after `fanDx: 0.17,`), add:

```js
    // v2 floor-table seat geometry (polar, radii from table center). The
    // table builder AND blackjack-live.js both use seatPoint so painted
    // spots, chips and cards can never drift apart.
    seat: {
      count: 6, angleStart: 160, angleStep: 28, stoolR: 1.95,
      mainR: 1.40, sideR: 1.19, sideDx: 0.07,
      cardsR: 1.02, stackDr: 0.062, splitDx: 0.14,
    },
```

and just before `C.layouts = {`, add + export a shared helper on the blackjack object:

```js
  blackjack.seatPoint = (a, radius, tangent = 0) => [
    Math.cos(a) * radius - Math.sin(a) * tangent,
    Math.sin(a) * radius + Math.cos(a) * tangent,
  ];
```

In `src/floor/tables/blackjack-table.js`:
1. Delete the local constant lines `const SEAT_COUNT = 6, SEAT_ANGLE_START = 160 ...`, `const MAIN_R = 1.40, SIDE_R = 1.19, SIDE_DX = 0.07, CARDS_R = 1.02;` and the local `seatPoint` definition. Replace with (top of the IIFE keeps `GHOST_SEATS = [1, 4]` and `seatSpin`):

```js
  const TABLE_R = 1.6, RAIL_H = 0.8, FELT_Y = 0.83;
  const GHOST_SEATS = [1, 4];
  // Geometry lives in C.layouts.blackjack.seat — but layouts.js loads first
  // in SRC_ORDER, so read it lazily inside the builder, not at module scope.
  const seatSpin = (a) => Math.PI / 2 - a;
```

2. Inside `C.floor.tables.blackjack = (opts = {}) => {`, first lines become:

```js
    const A = C.assets;
    const L = C.layouts.blackjack;
    const S = L.seat;
    const seatPoint = L.seatPoint;
    const seatAngle = (i) => ((S.angleStart - i * S.angleStep) * Math.PI) / 180;
    const SEAT_COUNT = S.count, SEAT_R = S.stoolR;
    const MAIN_R = S.mainR, SIDE_R = S.sideR, SIDE_DX = S.sideDx, CARDS_R = S.cardsR;
```

   (`makeBlackjackFeltTexture` also references `seatAngle`/`SEAT_COUNT` at module
   scope — it no longer uses them after the earlier felt cleanup; verify with
   grep and, if the texture function still references them, move those
   references to use a locally computed angle the same way.)

3. Before `return g;`, expose the rig:

```js
    // live-play rig: everything blackjack-live.js needs, in TABLE-LOCAL coords
    // (convert with group.localToWorld). main2 = the split hand's bet stack.
    g.userData.bj = {
      seat: S, feltY: FELT_Y, seatAngle, seatPoint,
      dealerSlots: L.dealerSlots, fanDx: L.fanDx, shoeLocal: L.shoePos,
      trayLocal: [0, FELT_Y + 0.054, -0.19],
      freeSeats: [0, 2, 3, 5],
      spotLocal(i, id) {
        const a = seatAngle(i);
        const at = (radius, tangent) => {
          const [x, z] = seatPoint(a, radius, tangent);
          return [x, FELT_Y + 0.004, z];
        };
        if (id === 'main') return at(MAIN_R, 0);
        if (id === 'main2') return at(MAIN_R, -S.splitDx);
        if (id === 'perfectPair') return at(SIDE_R, -SIDE_DX);
        return at(SIDE_R, SIDE_DX);            // twentyOnePlus3
      },
    };
```

In `src/floor/sections.js`, directly below the existing rouletteRigs line, add:

```js
        if (section.id === 'blackjack') (C.floor.blackjackRigs ??= new Map()).set(table.id, group);
```

- [ ] **Step 4: Verify** — `node build.mjs && node --test tests/*.test.mjs` → all pass, build OK.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/layouts.js portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/blackjack-table.js portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/sections.js portfolio/src/game/casino-game/calculator/lobby-3d/tests/layouts.test.mjs portfolio/src/game/casino-game/calculator/lobby-3d/index.html
git commit -m "feat(casino-3d): centralize blackjack seat geometry + expose live-play rig"
```

---

### Task 3: Port deal/flip/bet-stack animation primitives into the engine

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/engine/cards.js` (add `dealCardTo`, `flipFlatCard`; extend the `C.cards` export line)
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/engine/chips3d.js` (add `createBetStacks`; export it and `disposeChip`)
- Reference (port source, do NOT edit): `portfolio/build/games/casino-game/prototype-3d/src/engine/cards.js:83-150`, `.../chips3d.js:73-200`

**Interfaces:**
- Produces: `C.cards.dealCardTo(app, cardMesh, from, to, {ms, flip, delay, spin}) -> Promise` — flies a card from `from` ([x,y,z]) to `to` with arc + in-plane spin; the mesh's final `rotation.z` must be set BEFORE calling (it animates toward it).
- Produces: `C.cards.flipFlatCard(app, mesh, ms) -> Promise` — lift-and-flip a flat card.
- Produces: `C.chips.createBetStacks(app, {getSpotPos(id)->[x,y,z], source:[x,y,z], dealerPos:[x,y,z]}) -> {add(id, value), removeTop(id), clear(), settle(id, 'win'|'lose'|'push', payoutExtra) -> Promise, disposeAll()}`.
- Note: the ported code guards on `app.roomGen` — undefined in the lobby app, so the guards are inert (`undefined !== undefined` is false). That is intended: animations self-terminate, and `disposeAll()` is the cancellation path. Keep the guards as-is for fidelity with the prototype.

- [ ] **Step 1: Port `dealCardTo` + `flipFlatCard`.** In `src/engine/cards.js`, insert between `makeCard` and `makeCardBoxDecal` the two functions copied VERBATIM from the prototype file (`portfolio/build/games/casino-game/prototype-3d/src/engine/cards.js` — `dealCardTo` starts at the comment `// dealCardTo v2 — same contract as the original`, `flipFlatCard` at `// Shared reveal for flat-lying cards`). Copy the complete function bodies including comments. Then change the export line to:

```js
  C.cards = { makeCard, dealCardTo, flipFlatCard, makeCardBoxDecal };
```

- [ ] **Step 2: Port `createBetStacks`.** In `src/engine/chips3d.js`, insert the whole `createBetStacks` function (prototype `chips3d.js`, from the comment `// Live 3D wager stacks for one room.` through its closing `return { add, removeTop, clear, settle, disposeAll };\n  }`) between `disposeChip` and the export line. Change the export line to:

```js
  C.chips = { CHIP_COLORS, CHIP_H, makeChip, makeChipStack, makeSpotDecal, createBetStacks, disposeChip };
```

(The lobby's `disposeChip` already exists — do not duplicate it. `createBetStacks` references `C.layouts.chipBreakdown`, `C.tween`, `CHIP_H`, `makeChip` — all present.)

- [ ] **Step 3: Verify** — `node build.mjs && node --test tests/*.test.mjs` → build OK (`</script` guard passes), tests green.

- [ ] **Step 4: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/engine/cards.js portfolio/src/game/casino-game/calculator/lobby-3d/src/engine/chips3d.js portfolio/src/game/casino-game/calculator/lobby-3d/index.html
git commit -m "feat(casino-3d): port dealCardTo/flipFlatCard/createBetStacks from prototype"
```

---

### Task 4: `blackjack-live.js` — planners, board, sit/leave, chip mirroring

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/lobby-3d/blackjack-live.js`
- Create: `portfolio/src/game/casino-game/calculator/lobby-3d/tests/blackjack-live.test.mjs`

**Interfaces:**
- Consumes: Task 1 exports; Task 2 rig (`C.floor.blackjackRigs`, `group.userData.bj`); Task 3 primitives; `getTable`, `formatChips` from `../js/wallet/table-config.js`; `C.app.{glideTo, inputLocked, banner, player}`; walletClient (Task 6 injects it).
- Produces (for Task 6): `openBlackjackLive({table, walletClient, onClosed}) -> handle|null`, `closeBlackjackLive()`, `blackjackLiveActive() -> bool`.
- Produces (node-tested pure exports): `planPlayerCard(seat, {hand, hands, card, sideways}) -> {pos:[x,y,z], spin}` (seat = `{angle, cardsR, stackDr, splitDx, feltY}`), `planDealerCard({dealerSlots, fanDx}, i) -> {pos, spin}`.

- [ ] **Step 1: Write the failing planner tests** — `tests/blackjack-live.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPlayerCard, planDealerCard } from '../blackjack-live.js';

const seat = { angle: Math.PI / 2, cardsR: 1.02, stackDr: 0.062, splitDx: 0.14, feltY: 0.83 };

test('planPlayerCard: hits stack TOWARD the dealer, newest on top', () => {
  const c0 = planPlayerCard(seat, { card: 0 });
  const c1 = planPlayerCard(seat, { card: 1 });
  const c4 = planPlayerCard(seat, { card: 4 });
  assert.ok(c1.pos[2] < c0.pos[2]);                    // closer to dealer (z shrinks at 90°)
  assert.ok(c1.pos[1] > c0.pos[1]);                    // physically on top
  assert.ok(Math.abs(c4.pos[2] - (1.02 - 4 * 0.062)) < 1e-9);
  assert.ok(Math.abs(c0.pos[0]) < 1e-9);               // seat at 90° is centered
});

test('planPlayerCard: double is sideways, split hands mirror left/right', () => {
  const dbl = planPlayerCard(seat, { card: 2, sideways: true });
  const flat = planPlayerCard(seat, { card: 2 });
  assert.ok(Math.abs(dbl.spin - flat.spin - Math.PI / 2) < 1e-9);
  const right = planPlayerCard(seat, { hand: 0, hands: 2, card: 0 });
  const left = planPlayerCard(seat, { hand: 1, hands: 2, card: 0 });
  assert.ok(Math.abs(right.pos[0] + left.pos[0]) < 1e-9); // symmetric about the radial
  assert.notEqual(Math.sign(right.pos[0]), Math.sign(left.pos[0]));
});

test('planDealerCard: two boxes then fans right, all face up', () => {
  const L = { dealerSlots: [[-0.085, 0.86, 0.16], [0.085, 0.86, 0.16]], fanDx: 0.17 };
  assert.deepEqual(planDealerCard(L, 0).pos.map((v) => +v.toFixed(4)), [-0.085, 0.86, 0.16]);
  const c2 = planDealerCard(L, 2);
  assert.ok(Math.abs(c2.pos[0] - (0.085 + 0.17)) < 1e-9);
  const c3 = planDealerCard(L, 3);
  assert.ok(c3.pos[0] > c2.pos[0]);
  assert.ok(c3.pos[1] > c2.pos[1]);                    // no z-fighting
});
```

- [ ] **Step 2: Run** — `node --test tests/blackjack-live.test.mjs` → FAIL (module missing).

- [ ] **Step 3: Create `blackjack-live.js`** with the planners, board, sit/leave and chip mirroring. Round-flow functions are stubs completed in Task 5. Complete file:

```js
// blackjack-live.js — in-place blackjack play at a 3D floor table.
//
// Native 3D round (unlike roulette-live's iframe mirror): this module owns the
// betting board (DOM), the round state machine and the wallet round, and uses
// the engine (globalThis.CASINO) for cards, chips and camera. European deal:
// player, dealer up-card, player — no hole card; dealer draws after actions.
import {
  makeShoe, handValue, isBlackjack, dealerPlay, canSplit,
  settleMain, perfectPairReturn, twentyOnePlus3Return, validateBets, chipRack,
} from './blackjack-rules.js';
import { getTable, formatChips } from '../js/wallet/table-config.js';

// ---------- pure layout planners (node-tested) ----------
// Player cards stack TOWARD the dealer (radius shrinks per card) with the
// newest physically on top; split hands sit at ±splitDx along the tangent.
export function planPlayerCard(seat, { hand = 0, hands = 1, card = 0, sideways = false } = {}) {
  const tangent = hands === 1 ? 0 : (hand === 0 ? seat.splitDx : -seat.splitDx);
  const radius = seat.cardsR - card * seat.stackDr;
  const a = seat.angle;
  const x = Math.cos(a) * radius - Math.sin(a) * tangent;
  const z = Math.sin(a) * radius + Math.cos(a) * tangent;
  const spin = Math.PI / 2 - a + (card % 2 ? -0.06 : 0.05) + (sideways ? Math.PI / 2 : 0);
  return { pos: [x, seat.feltY + 0.012 + card * 0.003, z], spin };
}

// Dealer cards run HORIZONTALLY: the two painted boxes, then fanDx per card.
export function planDealerCard(L, i) {
  const s = L.dealerSlots;
  const base = i < s.length
    ? s[i]
    : [s[s.length - 1][0] + (i - s.length + 1) * L.fanDx, s[1][1], s[1][2]];
  return { pos: [base[0], base[1] + i * 0.0012, base[2]], spin: 0 };
}

const STYLE_ID = 'bj3-style';
const CSS = `
#bjLive{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;flex-direction:column;align-items:center;pointer-events:none;font-family:Rajdhani,system-ui,sans-serif}
#bjLive .bj3-bar{pointer-events:auto;display:flex;gap:14px;align-items:center;background:rgba(12,10,8,.92);border:1px solid #6b5325;border-bottom:0;border-radius:10px 10px 0 0;padding:6px 14px;color:#e8d9a8;font-size:14px;letter-spacing:.4px}
#bjLive .bj3-bar .bj3-balance{color:#ffd76a;font-weight:600}
#bjLive .bj3-bar button{background:none;border:1px solid #6b5325;border-radius:6px;color:#e8d9a8;padding:3px 10px;cursor:pointer}
#bjLive .bj3-panel{pointer-events:auto;width:min(560px,96vw);background:rgba(12,10,8,.92);border:1px solid #6b5325;border-radius:12px 12px 0 0;padding:10px 16px 12px;transition:transform .35s ease;color:#e8d9a8}
#bjLive.bj3-away .bj3-panel{transform:translateY(115%)}
.bj3-circles{display:flex;justify-content:center;gap:18px;margin:6px 0 10px}
.bj3-spot{position:relative;width:86px;height:86px;border:2px solid rgba(240,216,120,.7);border-radius:50%;background:rgba(11,93,59,.55);color:#f0d878;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;cursor:pointer;user-select:none}
.bj3-spot.bj3-main{width:104px;height:104px;font-size:15px}
.bj3-spot .bj3-badge{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:#1d1608;border:1px solid #6b5325;border-radius:9px;padding:0 8px;font-size:12px;color:#ffd76a;white-space:nowrap}
.bj3-rack{display:flex;justify-content:center;gap:8px;margin-bottom:10px}
.bj3-chipbtn{width:44px;height:44px;border-radius:50%;border:3px dashed rgba(255,255,255,.75);color:#fff;font-weight:700;cursor:pointer;font-size:12px}
.bj3-chipbtn.bj3-sel{outline:3px solid #ffd76a;outline-offset:2px}
.bj3-actionsrow{display:flex;justify-content:center;gap:10px;align-items:center}
.bj3-actionsrow button{border-radius:8px;padding:8px 18px;font-weight:700;letter-spacing:.6px;cursor:pointer;border:0}
.bj3-gold{background:linear-gradient(180deg,#f4cf67,#c9982b);color:#241a05}
.bj3-dim{background:#2a241a;color:#cdbd90;border:1px solid #55431f}
.bj3-gold:disabled,.bj3-dim:disabled{opacity:.4;cursor:default}
.bj3-status{text-align:center;min-height:18px;font-size:13px;margin-top:6px}
.bj3-status .bj3-err{color:#ff9d7a}
#bjActions{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:31;display:flex;gap:10px;align-items:center;background:rgba(12,10,8,.9);border:1px solid #6b5325;border-radius:12px;padding:10px 16px;color:#e8d9a8;font-family:Rajdhani,system-ui,sans-serif}
#bjActions .bj3-total{font-size:15px;font-weight:600;min-width:130px}
@media (max-width:640px){#bjLive .bj3-panel{padding:8px}.bj3-spot{width:72px;height:72px}.bj3-spot.bj3-main{width:88px;height:88px}}
`;

const CHIP_COLORS_2D = { 50: '#c26a1f', 100: '#2e6db4', 500: '#8e44ad', 1000: '#c0392b', 5000: '#b8860b' };

let active = null;
export const blackjackLiveActive = () => !!active;
export function closeBlackjackLive() { active?.close(); }

export function openBlackjackLive({ table, walletClient, onClosed }) {
  if (active) return active;
  const C = globalThis.CASINO;
  const rig = C.floor.blackjackRigs && C.floor.blackjackRigs.get(table.id);
  const bj = rig && rig.userData.bj;
  if (!rig || !bj || !walletClient) {           // no rig — fall back to the 2D page
    window.location.href = table.href;
    return null;
  }
  const cfg = getTable(table.gameId);
  const rack = chipRack(cfg.betTypes);
  const toWorld = (p) => rig.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();

  // ---- seat: the free seat nearest to where the player stands ----
  const px = C.app.player.x - rig.position.x, pz = C.app.player.z - rig.position.z;
  const seatIdx = bj.freeSeats
    .map((i) => {
      const [x, z] = bj.seatPoint(bj.seatAngle(i), bj.seat.stoolR);
      return { i, d: Math.hypot(px - x, pz - z) };
    })
    .sort((a, b) => a.d - b.d)[0].i;
  const angle = bj.seatAngle(seatIdx);
  const seat = { angle, cardsR: bj.seat.cardsR, stackDr: bj.seat.stackDr, splitDx: bj.seat.splitDx, feltY: bj.feltY };
  const seatLocal = (radius, tangent = 0, y = bj.feltY) => {
    const [x, z] = bj.seatPoint(angle, radius, tangent);
    return [x, y, z];
  };
  const poses = {
    seated: { pos: toWorld(seatLocal(2.15)), look: toWorld(seatLocal(0.55, 0, 0.88)) },
    dealer: { pos: toWorld(seatLocal(2.15)), look: toWorld([0, 0.95, 0.16]) },
  };

  // ---- 3D chip stacks mirrored 1:1 from the board ----
  const stacks = C.chips.createBetStacks(C.app, {
    getSpotPos: (id) => toWorld(bj.spotLocal(seatIdx, id)),
    source: toWorld(seatLocal(1.72, 0, bj.feltY + 0.06)),
    dealerPos: toWorld(bj.trayLocal),
  });

  // ---- betting board DOM ----
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const bets = { main: 0, perfectPair: 0, twentyOnePlus3: 0 };
  const placed = { main: [], perfectPair: [], twentyOnePlus3: [] };
  const history = [];
  let selectedDenom = rack[Math.min(1, rack.length - 1)];
  let roundInFlight = false;

  const wrap = document.createElement('div');
  wrap.id = 'bjLive';
  wrap.innerHTML = `
    <div class="bj3-bar">
      <span>${(table.tierName || '').toUpperCase()} BLACKJACK · ${table.limitsText || ''}</span>
      <span class="bj3-balance"></span>
      <button type="button" class="bj3-leave">Leave table</button>
    </div>
    <div class="bj3-panel">
      <div class="bj3-circles">
        <div class="bj3-spot" data-spot="perfectPair">P&nbsp;PAIR</div>
        <div class="bj3-spot bj3-main" data-spot="main">MAIN</div>
        <div class="bj3-spot" data-spot="twentyOnePlus3">21+3</div>
      </div>
      <div class="bj3-rack"></div>
      <div class="bj3-actionsrow">
        <button type="button" class="bj3-dim bj3-undo">UNDO</button>
        <button type="button" class="bj3-dim bj3-clear">CLEAR</button>
        <button type="button" class="bj3-gold bj3-deal" disabled>DEAL</button>
      </div>
      <div class="bj3-status" aria-live="polite"></div>
    </div>`;
  document.body.appendChild(wrap);
  const statusEl = wrap.querySelector('.bj3-status');
  const dealBtn = wrap.querySelector('.bj3-deal');
  const balanceEl = wrap.querySelector('.bj3-balance');

  const REASON_COPY = {
    'main-range': `Main bet ${cfg.betTypes.main.min.toLocaleString()} – ${cfg.betTypes.main.max.toLocaleString()}`,
    'side-range': `Side bets ${cfg.betTypes.perfectPair.min.toLocaleString()} – ${cfg.betTypes.perfectPair.max.toLocaleString()}`,
    'table-max': `Table max ${cfg.maxTotalBet.toLocaleString()} total`,
    balance: 'Not enough chips',
    insufficient: 'Not enough chips',
    'too-fast': 'One moment — dealing too fast',
    'network-error': 'Connection problem — try again',
  };

  const renderBalance = () => { balanceEl.textContent = formatChips(walletClient.getBalance() ?? 0); };
  const unsubBalance = walletClient.subscribe(renderBalance);
  renderBalance();

  const rackEl = wrap.querySelector('.bj3-rack');
  rack.forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bj3-chipbtn' + (v === selectedDenom ? ' bj3-sel' : '');
    b.style.background = CHIP_COLORS_2D[v] || '#555';
    b.textContent = v >= 1000 ? v / 1000 + 'K' : String(v);
    b.addEventListener('click', () => {
      selectedDenom = v;
      rackEl.querySelectorAll('.bj3-chipbtn').forEach((x) => x.classList.toggle('bj3-sel', x === b));
    });
    rackEl.appendChild(b);
  });

  function refreshBoard() {
    wrap.querySelectorAll('.bj3-spot').forEach((el) => {
      const amt = bets[el.dataset.spot] || 0;
      let badge = el.querySelector('.bj3-badge');
      if (amt > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'bj3-badge'; el.appendChild(badge); }
        badge.textContent = amt.toLocaleString();
      } else badge?.remove();
    });
    const allZero = !bets.main && !bets.perfectPair && !bets.twentyOnePlus3;
    const v = validateBets(bets, cfg.betTypes, walletClient.getBalance() ?? 0, cfg.maxTotalBet);
    if (allZero) { dealBtn.disabled = true; statusEl.textContent = 'Place your bets'; }
    else if (v.ok) { dealBtn.disabled = false; statusEl.textContent = 'Total: ' + v.total.toLocaleString(); }
    else { dealBtn.disabled = true; statusEl.innerHTML = `<span class="bj3-err">${REASON_COPY[v.reason] || ''}</span>`; }
  }

  wrap.querySelectorAll('.bj3-spot').forEach((el) => {
    el.addEventListener('click', () => {
      if (roundInFlight) return;
      const id = el.dataset.spot;
      bets[id] += selectedDenom;
      placed[id].push(selectedDenom);
      history.push(id);
      stacks.add(id, selectedDenom);
      refreshBoard();
    });
  });
  wrap.querySelector('.bj3-undo').addEventListener('click', () => {
    if (roundInFlight) return;
    const id = history.pop();
    if (!id) return;
    bets[id] -= placed[id].pop();
    stacks.removeTop(id);
    refreshBoard();
  });
  wrap.querySelector('.bj3-clear').addEventListener('click', () => {
    if (roundInFlight) return;
    for (const id of Object.keys(bets)) { bets[id] = 0; placed[id].length = 0; }
    history.length = 0;
    stacks.clear();
    refreshBoard();
  });
  const resetBetsAfterRound = () => {   // 3D stacks were consumed by settle()
    for (const id of Object.keys(bets)) { bets[id] = 0; placed[id].length = 0; }
    history.length = 0;
    refreshBoard();
  };
  refreshBoard();

  // ---- session lifecycle ----
  let closed = false;
  const dealt = [];        // card meshes on the felt this round
  const markers = [];      // split-hand highlight decals

  function disposeMesh(m) {
    m.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((mm) => { if (!mm) return; mm.map?.dispose(); mm.dispose(); });
    });
  }
  function clearTableMeshes() {
    [...dealt, ...markers].forEach((m) => { C.app.scene.remove(m); disposeMesh(m); });
    dealt.length = 0;
    markers.length = 0;
  }

  function close() {
    if (closed) return;
    closed = true;
    unsubBalance();
    wrap.remove();
    document.getElementById('bjActions')?.remove();
    stacks.disposeAll();
    clearTableMeshes();
    C.app.inputLocked = false;
    active = null;
    onClosed && onClosed();
    const a = C.world.anchorById(table.id);
    if (a) C.app.goToAnchor(a);
  }
  wrap.querySelector('.bj3-leave').addEventListener('click', () => {
    if (roundInFlight) { statusEl.innerHTML = '<span class="bj3-err">Finish the hand first</span>'; return; }
    close();
  });

  dealBtn.addEventListener('click', () => {
    if (dealBtn.disabled || roundInFlight) return;
    dealBtn.disabled = true;
    startRound().catch((err) => {
      console.error('[bj-live] round crashed:', err);
      roundInFlight = false;
      wrap.classList.remove('bj3-away');
      refreshBoard();
    });
  });

  // ---- round flow (Task 5 fills these in) ----
  async function startRound() { throw new Error('not-implemented'); }

  C.app.inputLocked = true;
  C.app.glideTo(poses.seated.pos, poses.seated.look, 1100);

  // Stale open round from a crashed session: forfeit it so bet() can open a
  // fresh one (same debit-at-bet posture as the 2D game).
  if (walletClient.openRound && walletClient.openRound(table.gameId)) {
    walletClient.payout(table.gameId, 0)
      .then(() => C.app.banner('Previous hand forfeited', 'An unfinished round was closed.', 2200))
      .catch(() => {});
  }

  active = { close, tableId: table.id };
  return active;
}
```

- [ ] **Step 4: Run** — `node --test tests/blackjack-live.test.mjs` → PASS (3 tests); `node --test tests/*.test.mjs` all green.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/blackjack-live.js portfolio/src/game/casino-game/calculator/lobby-3d/tests/blackjack-live.test.mjs
git commit -m "feat(casino-3d): blackjack live board, seat/leave and 3D chip mirroring"
```

---

### Task 5: Round flow — deal, actions, double, split, dealer, settle

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/blackjack-live.js` (replace the `startRound` stub; add helpers below it)
- Test: `tests/blackjack-rules.test.mjs` already covers all the money math; this task's new code is choreography around it.

**Interfaces:**
- Consumes: everything already in scope inside `openBlackjackLive` (bets, placed, stacks, seat, poses, cfg, walletClient, table, wrap, statusEl, dealt, clearTableMeshes, resetBetsAfterRound, REASON_COPY, roundInFlight flag).
- Wallet contract: `walletClient.bet(gameId, bets) -> Promise<{balance, roundId}>` (throws `WalletError` with `.code` e.g. `insufficient`, `round-in-progress`); `topUp(gameId, bets)`; `payout(gameId, gross)` — MUST be called exactly once per round, even for gross 0. Before coding, run `grep -n "class WalletError" ../js/wallet/wallet-client.js` and confirm the error's code property name; adapt `errCode()` below if it differs.

- [ ] **Step 1: Replace the `startRound` stub** with the full round flow (all inside `openBlackjackLive`, same scope):

```js
  // ---- round flow ----
  const errCode = (err) => (err && (err.code || err.message)) || 'error';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function makeFlatCard(card, plan) {
    const mesh = C.cards.makeCard(card);
    mesh.rotation.set(-Math.PI / 2, 0, plan.spin);
    dealt.push(mesh);
    return mesh;
  }
  const dealTo = (mesh, plan, opts = {}) =>
    C.cards.dealCardTo(C.app, mesh, toWorld(bj.shoeLocal), toWorld(plan.pos), { ms: 420, ...opts });

  function actionBar() {
    let el = document.getElementById('bjActions');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bjActions';
      document.body.appendChild(el);
    }
    return el;
  }

  async function startRound() {
    const v = validateBets(bets, cfg.betTypes, walletClient.getBalance() ?? 0, cfg.maxTotalBet);
    if (!v.ok) { refreshBoard(); return; }
    try {
      await walletClient.bet(table.gameId, {
        main: bets.main,
        ...(bets.perfectPair ? { perfectPair: bets.perfectPair } : {}),
        ...(bets.twentyOnePlus3 ? { twentyOnePlus3: bets.twentyOnePlus3 } : {}),
      });
    } catch (err) {
      statusEl.innerHTML = `<span class="bj3-err">${REASON_COPY[errCode(err)] || 'Bet failed — try again'}</span>`;
      dealBtn.disabled = false;
      return;
    }
    if (closed) return;
    roundInFlight = true;
    wrap.classList.add('bj3-away');

    const shoe = makeShoe(6);
    const roundBets = { ...bets };
    // hands: [{cards, stake, isSplit, doubled, meshes}]
    const hands = [{ cards: [], stake: roundBets.main, isSplit: false, doubled: false, meshes: [] }];
    const dealerCards = [];
    const dealerMeshes = [];

    const dealPlayer = async (hand, handIdx, handCount, { sideways = false } = {}) => {
      const card = shoe.pop();
      hand.cards.push(card);
      const plan = planPlayerCard(seat, { hand: handIdx, hands: handCount, card: hand.cards.length - 1, sideways });
      const mesh = makeFlatCard(card, plan);
      hand.meshes.push(mesh);
      await dealTo(mesh, plan);
      return card;
    };
    const dealDealer = async () => {
      const card = shoe.pop();
      dealerCards.push(card);
      const plan = planDealerCard({ dealerSlots: bj.dealerSlots, fanDx: bj.fanDx }, dealerCards.length - 1);
      const mesh = makeFlatCard(card, plan);
      dealerMeshes.push(mesh);
      await dealTo(mesh, plan);
      return card;
    };

    // European deal: player, dealer up-card, player.
    await dealPlayer(hands[0], 0, 1);
    if (closed) return;
    await dealDealer();
    if (closed) return;
    await dealPlayer(hands[0], 0, 1);
    if (closed) return;

    // Side bets resolve off the initial deal, paid/taken immediately.
    let sideRet = 0;
    const sideJobs = [];
    if (roundBets.perfectPair) {
      const r = perfectPairReturn(roundBets.perfectPair, hands[0].cards);
      sideRet += r;
      sideJobs.push(stacks.settle('perfectPair',
        r === 0 ? 'lose' : 'win', Math.max(0, r - roundBets.perfectPair)));
    }
    if (roundBets.twentyOnePlus3) {
      const r = twentyOnePlus3Return(roundBets.twentyOnePlus3, hands[0].cards[0], hands[0].cards[1], dealerCards[0]);
      sideRet += r;
      sideJobs.push(stacks.settle('twentyOnePlus3',
        r === 0 ? 'lose' : 'win', Math.max(0, r - roundBets.twentyOnePlus3)));
    }
    Promise.all(sideJobs).catch(() => {});

    if (isBlackjack(hands[0].cards)) {
      await runDealerAndSettle(hands, dealerCards, dealDealer, roundBets, sideRet);
      return;
    }
    await playHands(hands, dealPlayer, roundBets, sideRet, dealerCards, dealDealer);
  }

  async function playHands(hands, dealPlayer, roundBets, sideRet, dealerCards, dealDealer) {
    for (let hi = 0; hi < hands.length; hi++) {
      // eslint-disable-next-line no-await-in-loop
      await playOneHand(hands, hi, dealPlayer, roundBets);
      if (closed) return;
    }
    document.getElementById('bjActions')?.remove();
    const anyLive = hands.some((h) => handValue(h.cards).total <= 21);
    if (anyLive) await runDealerAndSettle(hands, dealerCards, dealDealer, roundBets, sideRet);
    else await settleRound(hands, dealerCards, roundBets, sideRet);
  }

  function playOneHand(hands, hi, dealPlayer, roundBets) {
    return new Promise((resolve) => {
      const hand = hands[hi];
      const el = actionBar();
      const spotId = hi === 0 ? 'main' : 'main2';
      let acting = false;

      const finish = () => { resolve(); };
      const render = () => {
        const hv = handValue(hand.cards);
        const label = hands.length > 1 ? `HAND ${hi + 1}/${hands.length}: ` : 'YOUR HAND: ';
        el.innerHTML = `<span class="bj3-total">${label}${hv.total}${hv.soft ? ' (soft)' : ''}</span>`;
        const mk = (txt, cls, fn, disabled = false) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = cls; b.textContent = txt; b.disabled = disabled;
          b.addEventListener('click', () => { if (!acting) fn(); });
          el.appendChild(b);
          return b;
        };
        mk('HIT', 'bj3-gold', onHit);
        mk('STAND', 'bj3-dim', finish);
        const bal = walletClient.getBalance() ?? 0;
        if (hand.cards.length === 2 && !hand.isSplit && !hand.doubled)
          mk('DOUBLE', 'bj3-dim', onDouble, bal < roundBets.main);
        if (hand.cards.length === 2 && !hand.isSplit && hands.length === 1 && canSplit(hand.cards))
          mk('SPLIT', 'bj3-dim', onSplit, bal < roundBets.main);
      };

      const onHit = async () => {
        acting = true;
        await dealPlayer(hand, hi, hands.length);
        acting = false;
        if (closed) return resolve();
        if (handValue(hand.cards).total > 21) return finish();
        render();
      };

      const onDouble = async () => {
        acting = true;
        try {
          await walletClient.topUp(table.gameId, { main: roundBets.main });
        } catch (err) {
          acting = false;
          C.app.banner('Double unavailable', REASON_COPY[errCode(err)] || 'Try hit or stand.', 2000);
          render();
          return;
        }
        if (closed) return resolve();
        hand.doubled = true;
        hand.stake += roundBets.main;
        // double is only offered on the unsplit hand, so the spot is 'main';
        // board bet totals intentionally stay as-placed (wallet + 3D change)
        placed.main.forEach((v) => stacks.add('main', v));
        await dealPlayer(hand, hi, hands.length, { sideways: true });
        acting = false;
        if (closed) return resolve();
        finish();                                               // double = exactly one card
      };

      const onSplit = async () => {
        acting = true;
        try {
          await walletClient.topUp(table.gameId, { main: roundBets.main });
        } catch (err) {
          acting = false;
          C.app.banner('Split unavailable', REASON_COPY[errCode(err)] || 'Try hit or stand.', 2000);
          render();
          return;
        }
        if (closed) return resolve();
        // second hand takes the second card; re-home both card meshes
        const moved = hand.cards.pop();
        const movedMesh = hand.meshes.pop();
        hands.push({ cards: [moved], stake: roundBets.main, isSplit: true, doubled: false, meshes: [movedMesh] });
        hand.isSplit = true;
        const p0 = planPlayerCard(seat, { hand: 0, hands: 2, card: 0 });
        const p1 = planPlayerCard(seat, { hand: 1, hands: 2, card: 0 });
        C.tween.to(hand.meshes[0].position, { x: toWorld(p0.pos)[0], z: toWorld(p0.pos)[2] }, 320, 'outCubic');
        C.tween.to(movedMesh.position, { x: toWorld(p1.pos)[0], z: toWorld(p1.pos)[2] }, 320, 'outCubic');
        placed.main.forEach((v) => stacks.add('main2', v));     // second hand's equal bet
        await wait(380);
        // each split hand draws its second card before play continues
        await dealPlayer(hand, 0, 2);
        if (closed) return resolve();
        await dealPlayer(hands[1], 1, 2);
        acting = false;
        if (closed) return resolve();
        render();
      };

      render();
    });
  }

  async function runDealerAndSettle(hands, dealerCards, dealDealer, roundBets, sideRet) {
    await C.app.glideTo(poses.dealer.pos, poses.dealer.look, 700);
    if (closed) return;
    // European: dealer completes the hand now (draws to 17, stands on all 17s)
    while (handValue(dealerCards).total < 17) {
      // eslint-disable-next-line no-await-in-loop
      await dealDealer();
      if (closed) return;
      // eslint-disable-next-line no-await-in-loop
      await wait(260);
    }
    await settleRound(hands, dealerCards, roundBets, sideRet);
  }

  async function settleRound(hands, dealerCards, roundBets, sideRet) {
    const rets = hands.map((h) => settleMain(h, dealerCards));
    const gross = rets.reduce((a, b) => a + b, 0) + sideRet;

    let payoutFailed = false;
    try {
      await walletClient.payout(table.gameId, gross);
    } catch (err1) {
      try {
        await walletClient.payout(table.gameId, gross);
      } catch (err2) {
        payoutFailed = true;
        console.error('[bj-live] payout failed twice:', err2);
      }
    }
    if (closed) return;

    // Chip choreography: dealer pays from the tray / collects into it.
    const jobs = hands.map((h, i) => {
      const spotId = i === 0 ? 'main' : 'main2';
      const ret = rets[i];
      const outcome = ret === 0 ? 'lose' : ret === h.stake ? 'push' : 'win';
      return stacks.settle(spotId, outcome, Math.max(0, ret - h.stake));
    });

    const d = handValue(dealerCards).total;
    const bestP = Math.max(...hands.map((h) => handValue(h.cards).total));
    const won = rets.reduce((a, b) => a + b, 0) > hands.reduce((a, h) => a + h.stake, 0);
    const title = hands.some((h) => isBlackjack(h.cards) && !h.isSplit) && rets[0] > hands[0].stake ? 'BLACKJACK!'
      : bestP > 21 ? 'BUST'
      : won ? 'YOU WIN'
      : gross === hands.reduce((a, h) => a + h.stake, 0) + sideRet && gross > 0 ? 'PUSH'
      : `DEALER ${d > 21 ? 'BUSTS' : 'WINS'}`;
    const sub = payoutFailed
      ? 'Payout retry pending — your balance will reconcile shortly.'
      : gross > 0 ? `Returned ${gross.toLocaleString()} chips` : 'No return';
    await C.app.banner(title, sub, 2600);
    await Promise.all(jobs).catch(() => {});
    if (closed) return;

    await wait(300);
    clearTableMeshes();
    await C.app.glideTo(poses.seated.pos, poses.seated.look, 800);
    if (closed) return;
    roundInFlight = false;
    resetBetsAfterRound();
    wrap.classList.remove('bj3-away');
  }
```

Notes for the implementer:
- Do not mutate `bets`/`placed` in onDouble/onSplit — the board shows the base bets; only the wallet round and the 3D stacks grow.
- `toWorld`, `bj`, `seat`, `poses`, `stacks`, `wrap`, `statusEl`, `dealBtn`, `placed`, `bets`, `closed`, `roundInFlight`, `resetBetsAfterRound`, `refreshBoard` are all in the enclosing `openBlackjackLive` scope from Task 4.
- Split plays hand 0 (tangent `+splitDx`) first, then hand 1. If visual QA (Task 7) shows the first-played hand on the viewer's LEFT instead of right, flip the sign convention in `planPlayerCard`'s `tangent` line only (single source of truth) and update the planner test's expectation comment.

- [ ] **Step 2: Static checks** — `node --check blackjack-live.js` passes; `node --test tests/*.test.mjs` all green (planner tests unaffected).

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/blackjack-live.js
git commit -m "feat(casino-3d): blackjack live round flow — deal, actions, split/double, settle"
```

---

### Task 6: Platform wiring + dev wallet stub

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/platform.js`

**Interfaces:**
- Consumes: Task 4/5 exports (`openBlackjackLive`, `closeBlackjackLive`, `blackjackLiveActive`).
- ⚠️ `platform.js` is shared with the active roulette session. `git diff platform.js` first; make each edit adjacent-additive; if the roulette lines moved, match the new shape.

- [ ] **Step 1: Import + close hooks.** Next to the roulette-live import add:

```js
import { openBlackjackLive, closeBlackjackLive, blackjackLiveActive } from './blackjack-live.js';
```

In `render()`'s `case 'out':` next to `closeRouletteLive()` add `closeBlackjackLive();`. In the quicknav `onGo` handler next to `closeRouletteLive()` add `closeBlackjackLive();`.

- [ ] **Step 2: Proximity guard + sit-down wiring.** In `showProximityCard`, extend the live-session guard to `if (rouletteLiveActive() || blackjackLiveActive()) return;`. In the `anchor.kind === 'table'` branch, replace the roulette-only `onPlay` with:

```js
    const liveOpen =
      section && section.id === 'roulette'
        ? () => openRouletteLive({ table: anchor.table })
        : section && section.id === 'blackjack'
          ? () => openBlackjackLive({
              table: anchor.table,
              walletClient: walletClient(),
              onClosed: () => quicknav?.refresh(),
            })
          : null;
    cards.show('sitdown', UI.sitdownCard({
      table: anchor.table,
      gameName: section ? section.gameName : '',
      balance: balance(),
      onNotNow: () => cards.hide('sitdown'),
      onPlay: liveOpen ? () => { cards.hide(); liveOpen(); } : null,
    }));
```

- [ ] **Step 3: Dev wallet stub.** Replace the auth-bridge `import('../js/wallet/wallet-bootstrap.js')` block with a gated branch (keep the existing import exactly as the else-path):

```js
// ---------- auth bridge (starts immediately, in parallel with the splash) ----------
// Local dev: Firebase blocks localhost referers, so ?stubwallet swaps in an
// in-memory signed-in wallet. Localhost-only — production ignores the param.
const STUB_WALLET =
  ['localhost', '127.0.0.1'].includes(location.hostname) &&
  new URLSearchParams(location.search).has('stubwallet');

function makeStubBootstrap() {
  let bal = 100000;
  const subs = new Set();
  const rounds = new Map();
  const fail = (code) => Object.assign(new Error(code), { code });
  const emit = () => subs.forEach((cb) => cb(bal));
  return {
    walletClient: {
      getBalance: () => bal,
      getResetInfo: () => ({ canReset: false, resetAvailableAt: null }),
      subscribe: (cb) => (subs.add(cb), () => subs.delete(cb)),
      openRound: (gameId) => rounds.get(gameId) || null,
      async load() { return { balance: bal }; },
      async bet(gameId, bets) {
        if (rounds.has(gameId)) throw fail('round-in-progress');
        const total = Object.values(bets).reduce((a, b) => a + b, 0);
        if (total > bal) throw fail('insufficient');
        bal -= total; rounds.set(gameId, { roundId: 'stub', bets: { ...bets } }); emit();
        return { balance: bal, roundId: 'stub' };
      },
      async topUp(gameId, bets) {
        if (!rounds.has(gameId)) throw fail('no-open-round');
        const total = Object.values(bets).reduce((a, b) => a + b, 0);
        if (total > bal) throw fail('insufficient');
        bal -= total; emit();
        return { balance: bal, roundId: 'stub' };
      },
      async payout(gameId, chips) {
        rounds.delete(gameId); bal += chips; emit();
        return { balance: bal };
      },
      async reset() { return { balance: bal }; },
      clear() {},
    },
    onAuth(cb) { setTimeout(() => cb({ signedIn: true, user: { displayName: 'Stub Player', email: 'stub@localhost' } }), 50); },
    signIn: async () => {},
    signOut: async () => {},
  };
}

(STUB_WALLET
  ? Promise.resolve({ default: makeStubBootstrap() })
  : import('../js/wallet/wallet-bootstrap.js'))
  .then((m) => {
    /* keep the existing .then body verbatim */
  })
  .catch((err) => {
    /* keep the existing .catch body verbatim */
  });
```

- [ ] **Step 4: Verify + commit** — `node --check platform.js`; `node --test tests/*.test.mjs` green.

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/platform.js
git commit -m "feat(casino-3d): wire blackjack live play into the floor + localhost wallet stub"
```

---

### Task 7: Visual QA, fixes, sync, final gate

**Files:**
- Modify (fixes only, as QA demands): files from Tasks 2–6
- Sync: `portfolio/public/games/casino-game/lobby-3d/` (copy every changed file)

- [ ] **Step 1: Build + serve**

```bash
node build.mjs
cd .. && python3 -m http.server 8791 --bind 127.0.0.1 &   # serve calculator/ root
```

- [ ] **Step 2: Browser QA** (Chrome tools) at
`http://127.0.0.1:8791/lobby-3d/index.html?stubwallet&cam=12,-3.7,3.14159,-0.42` — ENTER, walk to the Standard blackjack table (or use the quicknav "Blackjack"), confirm the sit-down card shows **"Play at this table"**, then click it and verify EVERY item:
  1. Camera glides to the nearest free seat; board slides up; input locked (WASD does nothing).
  2. Chip clicks land 3D chips dead-center in YOUR seat's MAIN/PP/21+3 circles; UNDO/CLEAR return them; badges match.
  3. DEAL: balance drops by the total (stub pill), board slides away, deal order is player → dealer up-card → player-on-top; player stack overlaps toward the dealer, dealer card horizontal.
  4. HIT stacks a new card on top. STAND moves to the dealer draw (camera turns to the dealer row, cards fan horizontally, stops on 17+).
  5. DOUBLE (2-card hand): chips double on the spot, ONE sideways card, then dealer plays.
  6. SPLIT (keep re-dealing until a pair — micro table makes this cheap): cards separate left/right, second bet stack appears, both hands play in order with the HAND 1/2 label. If the first-played hand is on the LEFT, flip the tangent sign in `planPlayerCard` (see Task 5 note) and re-verify.
  7. Settlement: wins fly chips from the dealer tray to the spot then off toward you; losses fly into the tray; push slides back. Banner totals match the stub balance change: `payout == Σ settleMain + sides`.
  8. Round repeats: board returns with refreshed balance; LEAVE TABLE stands you up, restores input, sit-down card can reopen.
  9. Leave button during a live hand is refused with the "Finish the hand first" notice.
  10. No console errors (`read_console_messages` with pattern `bj-live|error|Error`).
- [ ] **Step 3: Screenshot** the seated betting view and a settled win for the user.
- [ ] **Step 4: Full gate**

```bash
node --test tests/*.test.mjs        # everything green
node build.mjs                      # final bundle
```

- [ ] **Step 5: Sync the public mirror** (only blackjack-session files + build output; do NOT copy roulette work-in-progress files):

```bash
cd portfolio/src/game/casino-game/calculator/lobby-3d
for f in index.html blackjack-rules.js blackjack-live.js platform.js \
         src/logic/layouts.js src/floor/tables/blackjack-table.js \
         src/floor/sections.js src/engine/cards.js src/engine/chips3d.js \
         tests/blackjack-rules.test.mjs tests/blackjack-live.test.mjs tests/layouts.test.mjs; do
  cp "$f" "../../../../public/games/casino-game/lobby-3d/$f"
done
```

(Note: `platform.js` and `index.html` will carry the roulette session's current state too — that is correct, the mirror tracks the src tree. If their work is mid-edit and broken at sync time, coordinate before syncing those two files.)

- [ ] **Step 6: Final commit**

```bash
git add -A portfolio/src/game/casino-game/calculator/lobby-3d portfolio/public/games/casino-game/lobby-3d
git status   # CHECK: no roulette-session files staged that you didn't intend
git commit -m "feat(casino-3d): playable blackjack at the 3D lobby tables

European deal, hit/stand/double/split, side bets, dealer-tray chip
choreography, real shared wallet (bet/topUp/payout), localhost stub for dev."
```

If `git status` shows staged roulette files (roulette-live.js, roulette-map.js, roulette-table.js changes), `git restore --staged` them first — they belong to the parallel session.
