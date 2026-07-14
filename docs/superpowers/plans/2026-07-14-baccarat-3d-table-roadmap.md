# Baccarat 3D Table Realism + Roadmap Scoreboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 3D lobby's four baccarat floor tables an authentic Macau-style felt (chip rack, card-dealing area, commission boxes, per-seat betting arcs) and a bilingual LED roadmap scoreboard (bead plate, big road, big eye boy, small road, cockroach pig, stats, 下局預告, current-round cards) driven by a real simulated 8-deck shoe.

**Architecture:** A new pure logic module `src/logic/baccarat-roads.js` (registered on the `CASINO` namespace, node-importable, unit-tested) simulates the shoe with the real third-card tableau and derives every road. `src/floor/tables/baccarat-table.js` consumes it: one `simulateShoe()` per table feeds the felt cards AND the scoreboard canvas, so everything on a table is self-consistent. Felt texture is rewritten (2048×1024, module-cached, shared by all 4 tables).

**Tech Stack:** Vanilla JS IIFEs on `globalThis.CASINO`, THREE r149 (global `THREE`), canvas textures, `node --test` for pure logic, `build.mjs` inlines everything into `index.html`.

**Spec:** `docs/superpowers/specs/2026-07-14-baccarat-3d-table-roadmap-design.md`

## Global Constraints

- Stay on branch `feat/casino-lobby-credits`. NEVER `git add -A` / `git add .` — a parallel session has uncommitted roulette/blackjack work in this tree; stage only the exact paths listed in each commit step.
- All lobby-3d source files are IIFEs: `(() => { const C = (globalThis.CASINO ??= {}); ... })();` — no imports/exports (build.mjs inlines them; node tests `await import()` them for the `CASINO` side effect).
- No external resources; code must not contain the substring `</script` (build guard).
- Card object shape everywhere: `{ r: 2..14, s: 0..3 }` — `r` 14 = Ace, 11/12/13 = J/Q/K; suits `['♠','♥','♦','♣']`, red = `s === 1 || s === 2` (matches `src/engine/cards.js`).
- CJK canvas font stack: `'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif`.
- Felt ellipse radii: rx `1.692`, rz `0.799` (= rail 1.8/0.85 × 0.94). Felt Y `0.82`. Table-local **+Z = player/aisle side**, dealer stands at −Z.
- Working directory for all commands: `portfolio/src/game/casino-game/calculator/lobby-3d/` (called `$LOBBY` below). Tests: `node --test tests/` from `$LOBBY`.
- Commit after every task with the exact `git add` paths given. Every commit message ends with the trailer line: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Logic module — shoe simulation + stats

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/baccarat-roads.js`
- Create (test): `portfolio/src/game/casino-game/calculator/lobby-3d/tests/baccarat-roads.test.mjs`

**Interfaces:**
- Produces: `C.baccaratRoads.bacValue(card) → 0..9`, `C.baccaratRoads.total(cards) → 0..9`, `C.baccaratRoads.bankerDraws(bankerTotal, playerThirdValueOrNull) → bool`, `C.baccaratRoads.simulateShoe(rng = Math.random) → rounds[]`, `C.baccaratRoads.stats(rounds) → { banker, player, tie, bPair, pPair, natural, games }`.
- Round shape (relied on by Tasks 2, 3, 6, 7): `{ outcome: 'B'|'P'|'T', playerCards: card[], bankerCards: card[], playerTotal, bankerTotal, playerPair, bankerPair, natural }` — 2–3 cards per side, index 2 = third card.

- [ ] **Step 1: Write the failing test**

Create `tests/baccarat-roads.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/baccarat-roads.js');
const R = globalThis.CASINO.baccaratRoads;

// deterministic rng for reproducible shoes
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test('bacValue: A=1, 10/J/Q/K=0, pips face value', () => {
  assert.equal(R.bacValue({ r: 14, s: 0 }), 1);
  assert.equal(R.bacValue({ r: 10, s: 0 }), 0);
  assert.equal(R.bacValue({ r: 11, s: 1 }), 0);
  assert.equal(R.bacValue({ r: 13, s: 3 }), 0);
  assert.equal(R.bacValue({ r: 2, s: 2 }), 2);
  assert.equal(R.bacValue({ r: 9, s: 1 }), 9);
  assert.equal(R.total([{ r: 9, s: 0 }, { r: 5, s: 1 }]), 4); // 14 -> 4
});

test('bankerDraws implements the full third-card table', () => {
  // player stood (null): banker draws 0-5, stands 6-7
  for (let bt = 0; bt <= 5; bt++) assert.equal(R.bankerDraws(bt, null), true, `bt ${bt} stood`);
  assert.equal(R.bankerDraws(6, null), false);
  assert.equal(R.bankerDraws(7, null), false);
  // banker 0-2 always draws
  for (let bt = 0; bt <= 2; bt++)
    for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(bt, p3), true);
  // banker 3: draws unless player third card is 8
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(3, p3), p3 !== 8);
  // banker 4: draws vs 2-7
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(4, p3), p3 >= 2 && p3 <= 7);
  // banker 5: draws vs 4-7
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(5, p3), p3 >= 4 && p3 <= 7);
  // banker 6: draws vs 6-7
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(6, p3), p3 === 6 || p3 === 7);
  // banker 7 stands
  for (let p3 = 0; p3 <= 9; p3++) assert.equal(R.bankerDraws(7, p3), false);
});

test('simulateShoe deals legal rounds from an 8-deck shoe', () => {
  const rounds = R.simulateShoe(mulberry32(42));
  assert.ok(rounds.length >= 55 && rounds.length <= 95, `round count ${rounds.length}`);
  for (const r of rounds) {
    assert.ok(r.playerCards.length >= 2 && r.playerCards.length <= 3);
    assert.ok(r.bankerCards.length >= 2 && r.bankerCards.length <= 3);
    assert.equal(r.playerTotal, R.total(r.playerCards));
    assert.equal(r.bankerTotal, R.total(r.bankerCards));
    const expect = r.playerTotal > r.bankerTotal ? 'P' : r.bankerTotal > r.playerTotal ? 'B' : 'T';
    assert.equal(r.outcome, expect);
    assert.equal(r.playerPair, r.playerCards[0].r === r.playerCards[1].r);
    assert.equal(r.bankerPair, r.bankerCards[0].r === r.bankerCards[1].r);
    // naturals end with 2 cards each
    if (r.natural) {
      assert.equal(r.playerCards.length, 2);
      assert.equal(r.bankerCards.length, 2);
      assert.ok(r.playerTotal >= 8 || r.bankerTotal >= 8);
    }
    // player only draws on 0-5
    if (r.playerCards.length === 3)
      assert.ok(R.total(r.playerCards.slice(0, 2)) <= 5, 'player drew on 0-5');
    // banker third card obeys the table
    if (!r.natural) {
      const bt2 = R.total(r.bankerCards.slice(0, 2));
      const p3 = r.playerCards.length === 3 ? R.bacValue(r.playerCards[2]) : null;
      assert.equal(r.bankerCards.length === 3, R.bankerDraws(bt2, p3));
    }
  }
  // same seed -> same shoe (determinism for tests)
  assert.deepEqual(R.simulateShoe(mulberry32(42)), rounds);
});

test('stats counts outcomes, pairs, naturals, games', () => {
  const rounds = R.simulateShoe(mulberry32(7));
  const s = R.stats(rounds);
  assert.equal(s.games, rounds.length);
  assert.equal(s.banker + s.player + s.tie, s.games);
  assert.equal(s.banker, rounds.filter((r) => r.outcome === 'B').length);
  assert.equal(s.bPair, rounds.filter((r) => r.bankerPair).length);
  assert.equal(s.pPair, rounds.filter((r) => r.playerPair).length);
  assert.equal(s.natural, rounds.filter((r) => r.natural).length);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `$LOBBY`): `node --test tests/baccarat-roads.test.mjs`
Expected: FAIL — `Cannot find module .../src/logic/baccarat-roads.js`

- [ ] **Step 3: Write the implementation**

Create `src/logic/baccarat-roads.js`:

```js
(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure baccarat shoe simulation + roadmap derivations. No THREE/DOM —
  // node-testable; consumed by the baccarat floor table's scoreboard.
  // Cards reuse the lobby shape {r: 2..14, s: 0..3} (14 = Ace).

  const bacValue = (c) => (c.r === 14 ? 1 : c.r >= 10 ? 0 : c.r);
  const total = (cards) => cards.reduce((t, c) => (t + bacValue(c)) % 10, 0);

  function buildShoe(rng, decks = 8) {
    const cards = [];
    for (let d = 0; d < decks; d++)
      for (let s = 0; s < 4; s++)
        for (let r = 2; r <= 14; r++) cards.push({ r, s });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  // Banker third-card table: banker two-card total vs the VALUE of the
  // player's third card (null = player stood).
  function bankerDraws(bt, p3) {
    if (bt >= 7) return false;
    if (p3 === null) return bt <= 5;
    if (bt <= 2) return true;
    if (bt === 3) return p3 !== 8;
    if (bt === 4) return p3 >= 2 && p3 <= 7;
    if (bt === 5) return p3 >= 4 && p3 <= 7;
    return p3 === 6 || p3 === 7; // bt === 6
  }

  function playRound(draw) {
    const p = [draw(), draw()], b = [draw(), draw()];
    let natural = false;
    if (total(p) >= 8 || total(b) >= 8) {
      natural = true;
    } else {
      let p3 = null;
      if (total(p) <= 5) { p.push(draw()); p3 = bacValue(p[2]); }
      if (bankerDraws(total(b), p3)) b.push(draw());
    }
    const pt = total(p), bt = total(b);
    return {
      outcome: pt > bt ? 'P' : bt > pt ? 'B' : 'T',
      playerCards: p, bankerCards: b,
      playerTotal: pt, bankerTotal: bt,
      playerPair: p[0].r === p[1].r, bankerPair: b[0].r === b[1].r,
      natural,
    };
  }

  // Full shoe: 8 decks, cut card ~14 from the end (~60-80 rounds).
  function simulateShoe(rng = Math.random) {
    const shoe = buildShoe(rng);
    let i = 0;
    const draw = () => shoe[i++];
    const rounds = [];
    while (shoe.length - i > 14 + 6) rounds.push(playRound(draw));
    return rounds;
  }

  function stats(rounds) {
    const s = { banker: 0, player: 0, tie: 0, bPair: 0, pPair: 0, natural: 0, games: rounds.length };
    for (const r of rounds) {
      if (r.outcome === 'B') s.banker++;
      else if (r.outcome === 'P') s.player++;
      else s.tie++;
      if (r.bankerPair) s.bPair++;
      if (r.playerPair) s.pPair++;
      if (r.natural) s.natural++;
    }
    return s;
  }

  C.baccaratRoads = { bacValue, total, bankerDraws, simulateShoe, stats };
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/baccarat-roads.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/baccarat-roads.js portfolio/src/game/casino-game/calculator/lobby-3d/tests/baccarat-roads.test.mjs
git commit -m "feat(casino-3d): baccarat shoe simulation with real third-card tableau + stats"
```

---

### Task 2: Logic module — big road, generic road layout, bead plate

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/baccarat-roads.js`
- Modify (test): `portfolio/src/game/casino-game/calculator/lobby-3d/tests/baccarat-roads.test.mjs`

**Interfaces:**
- Consumes: `rounds[]` from Task 1.
- Produces:
  - `C.baccaratRoads.buildBigRoad(rounds) → { cols: [{ outcome: 'B'|'P', cells: [{ ties: n }] }], leadingTies }` — LOGICAL columns (one per streak, unbounded depth). Ties never occupy a cell.
  - `C.baccaratRoads.layoutRoad(seq, rows = 6) → [{ col, row, key, ...payload }]` — display placement with 6-row wrap + dragon tail; `seq` items are `{ key, ...payload }`, consecutive equal keys stack.
  - `C.baccaratRoads.bigRoadCells(big, rows = 6) → [{ col, row, key, outcome, ties }]`.
  - `C.baccaratRoads.beadPlate(rounds, cols = 12, rows = 6) → [{ col, row, outcome, playerPair, bankerPair }]` — most recent whole columns kept.

- [ ] **Step 1: Add failing tests**

Append to `tests/baccarat-roads.test.mjs` (helper to build fake rounds from an outcome string):

```js
const mk = (str) => [...str].map((ch) => ({
  outcome: ch, playerCards: [], bankerCards: [],
  playerTotal: 0, bankerTotal: 0, playerPair: false, bankerPair: false, natural: false,
}));

test('buildBigRoad: streak columns, ties annotate the previous cell', () => {
  const big = R.buildBigRoad(mk('BTTBPT'));
  assert.equal(big.leadingTies, 0);
  assert.deepEqual(big.cols, [
    { outcome: 'B', cells: [{ ties: 2 }, { ties: 0 }] },
    { outcome: 'P', cells: [{ ties: 1 }] },
  ]);
});

test('buildBigRoad: leading ties are held separately', () => {
  const big = R.buildBigRoad(mk('TTB'));
  assert.equal(big.leadingTies, 2);
  assert.deepEqual(big.cols, [{ outcome: 'B', cells: [{ ties: 0 }] }]);
});

test('layoutRoad: stacks, new columns, dragon tail at row 6', () => {
  const seq = (s) => [...s].map((k) => ({ key: k }));
  // simple stack + column change
  assert.deepEqual(R.layoutRoad(seq('BBBP')).map(({ col, row }) => [col, row]),
    [[0, 0], [0, 1], [0, 2], [1, 0]]);
  // 8-long streak wraps right along the bottom row
  assert.deepEqual(R.layoutRoad(seq('BBBBBBBB')).map(({ col, row }) => [col, row]),
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5], [2, 5]]);
  // next column starts at col 1 row 0 (start col advances by 1, not past the tail)
  const cells = R.layoutRoad(seq('BBBBBBBBP'));
  assert.deepEqual(cells[8], { col: 1, row: 0, key: 'P' });
  // a stack that hits an old tail slides right on its own row
  const c2 = R.layoutRoad(seq('BBBBBBBBPPPPPP')).map(({ col, row }) => [col, row]);
  // P stack: (1,0)..(1,4) then (1,5) is occupied by the B tail -> (2,4)
  assert.deepEqual(c2.slice(8), [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [2, 4]]);
});

test('bigRoadCells carries outcome + ties through layout', () => {
  const cells = R.bigRoadCells(R.buildBigRoad(mk('BTTBP')));
  assert.deepEqual(cells, [
    { col: 0, row: 0, key: 'B', outcome: 'B', ties: 2 },
    { col: 0, row: 1, key: 'B', outcome: 'B', ties: 0 },
    { col: 1, row: 0, key: 'P', outcome: 'P', ties: 1 },
  ]);
});

test('beadPlate fills columns top-to-bottom and keeps the newest columns', () => {
  const cells = R.beadPlate(mk('BPT'), 12);
  assert.deepEqual(cells.map((c) => [c.col, c.row, c.outcome]),
    [[0, 0, 'B'], [0, 1, 'P'], [0, 2, 'T']]);
  // 80 rounds = 14 columns of 6 -> drop the 2 oldest columns (12 rounds)
  const many = mk('B'.repeat(80));
  const c = R.beadPlate(many, 12);
  assert.equal(c.length, 80 - 12);
  assert.deepEqual([c[0].col, c[0].row], [0, 0]);
  const lastCell = c[c.length - 1];
  assert.deepEqual([lastCell.col, lastCell.row], [Math.floor(67 / 6), 67 % 6]);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test tests/baccarat-roads.test.mjs`
Expected: the 5 new tests FAIL (`buildBigRoad is not a function`), Task 1 tests still PASS.

- [ ] **Step 3: Implement**

In `src/logic/baccarat-roads.js`, insert before the `C.baccaratRoads = ...` export line:

```js
  // ---------- big road (LOGICAL streak columns) ----------
  // Ties never occupy a cell: they increment `ties` on the previous cell;
  // ties before any B/P result are held in leadingTies.
  function buildBigRoad(rounds) {
    const cols = [];
    let leadingTies = 0;
    for (const r of rounds) {
      if (r.outcome === 'T') {
        const col = cols[cols.length - 1];
        if (col) col.cells[col.cells.length - 1].ties++;
        else leadingTies++;
        continue;
      }
      const col = cols[cols.length - 1];
      if (col && col.outcome === r.outcome) col.cells.push({ ties: 0 });
      else cols.push({ outcome: r.outcome, cells: [{ ties: 0 }] });
    }
    return { cols, leadingTies };
  }

  // ---------- display placement (6-row grid + dragon tail) ----------
  // seq: [{key, ...payload}] — consecutive equal keys stack in a column.
  // Stacking past the last row, or into an occupied cell, turns right and
  // continues along the current row (the "dragon tail"). New columns start
  // one to the right of the previous column's START (row 0 is never a tail
  // row, so column starts cannot collide).
  function layoutRoad(seq, rows = 6) {
    const out = [], used = new Set(), key = (c, r) => c + ':' + r;
    let colStart = -1, prevKey = null, c = 0, r = 0;
    for (const item of seq) {
      if (item.key !== prevKey) {
        colStart += 1; c = colStart; r = 0;
      } else if (r + 1 < rows && !used.has(key(c, r + 1))) {
        r += 1;
      } else {
        c += 1;
        while (used.has(key(c, r))) c += 1;
      }
      used.add(key(c, r));
      out.push({ col: c, row: r, ...item });
      prevKey = item.key;
    }
    return out;
  }

  const bigRoadCells = (big, rows = 6) => layoutRoad(
    big.cols.flatMap((col) => col.cells.map((cell) => ({ key: col.outcome, outcome: col.outcome, ties: cell.ties }))),
    rows,
  );

  // ---------- bead plate (every round incl. ties; newest columns kept) ----------
  function beadPlate(rounds, cols = 12, rows = 6) {
    const totalCols = Math.ceil(rounds.length / rows);
    const skip = Math.max(0, (totalCols - cols) * rows);
    return rounds.slice(skip).map((r, i) => ({
      col: Math.floor(i / rows), row: i % rows,
      outcome: r.outcome, playerPair: r.playerPair, bankerPair: r.bankerPair,
    }));
  }
```

Update the export line to:

```js
  C.baccaratRoads = { bacValue, total, bankerDraws, simulateShoe, stats, buildBigRoad, layoutRoad, bigRoadCells, beadPlate };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/baccarat-roads.test.mjs`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/baccarat-roads.js portfolio/src/game/casino-game/calculator/lobby-3d/tests/baccarat-roads.test.mjs
git commit -m "feat(casino-3d): big road, dragon-tail layout, bead plate for baccarat roads"
```

---

### Task 3: Logic module — derived roads + 下局預告 prediction

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/baccarat-roads.js`
- Modify (test): `portfolio/src/game/casino-game/calculator/lobby-3d/tests/baccarat-roads.test.mjs`

**Interfaces:**
- Consumes: `buildBigRoad` result `{ cols }` from Task 2.
- Produces:
  - `C.baccaratRoads.deriveRoad(big, offset) → ['r'|'b', ...]` — color sequence; offset 1 = big eye boy, 2 = small road, 3 = cockroach pig.
  - `C.baccaratRoads.predictNext(big) → { B: [c1, c2, c3], P: [c1, c2, c3] }` where each entry is `'r'`, `'b'`, or `null` (road not started yet).

**Rule being implemented** (0-indexed logical coordinates): a derived entry is generated for every big-road cell at (col `c`, row `r`) satisfying `c > offset || (c === offset && r >= 1)`:
- `r === 0`: red if `depth(c-1) === depth(c-1-offset)` else blue (depth = logical streak length).
- `r >= 1`: look at column `c-offset` — `depth === r` → blue; otherwise (depth > r has an entry at row r; depth < r ended before row r−1) → red.

- [ ] **Step 1: Add failing tests**

Append to `tests/baccarat-roads.test.mjs` — fixtures hand-worked from the rule above:

```js
test('deriveRoad: ping-pong pairs read as all red', () => {
  // B B P P B B P P -> 4 columns of depth 2
  const big = R.buildBigRoad(mk('BBPPBBPP'));
  assert.deepEqual(R.deriveRoad(big, 1), ['r', 'r', 'r', 'r', 'r']);
  assert.deepEqual(R.deriveRoad(big, 2), ['r', 'r', 'r']);
  assert.deepEqual(R.deriveRoad(big, 3), ['r']);
});

test('deriveRoad: mixed-depth fixture (hand-verified)', () => {
  // B P P B B B P -> cols B[1], P[2], B[3], P[1]
  const big = R.buildBigRoad(mk('BPPBBBP'));
  // big eye boy entries: (1,1)=b, (2,0)=b, (2,1)=r, (2,2)=b, (3,0)=b
  assert.deepEqual(R.deriveRoad(big, 1), ['b', 'b', 'r', 'b', 'b']);
  // small road entries: (2,1)=b, (2,2)=r, (3,0)=b
  assert.deepEqual(R.deriveRoad(big, 2), ['b', 'r', 'b']);
  // cockroach: (3,0) is col 3 row 0, needs c>3 or (c==3,r>=1) -> nothing yet
  assert.deepEqual(R.deriveRoad(big, 3), []);
});

test('deriveRoad start condition: nothing before col 2 / (col 1, row 1)', () => {
  assert.deepEqual(R.deriveRoad(R.buildBigRoad(mk('BBP')), 1), []);
  assert.deepEqual(R.deriveRoad(R.buildBigRoad(mk('BBPP')), 1), ['r']);
});

test('ties do not disturb derived roads', () => {
  const a = R.deriveRoad(R.buildBigRoad(mk('BPPBBBP')), 1);
  const b = R.deriveRoad(R.buildBigRoad(mk('BTPPTTBBBPT')), 1);
  assert.deepEqual(a, b);
});

test('predictNext matches actually appending the round', () => {
  const big = R.buildBigRoad(mk('BPPBBBP'));
  const pred = R.predictNext(big);
  // hand-worked: B starts col 4 -> depths c3=1 vs (BEB) c2=3 diff=b,
  // (small) c1=2 diff=b, (roach) c0=1 same=r
  assert.deepEqual(pred.B, ['b', 'b', 'r']);
  // P stacks col 3 row 1 -> (BEB) col2 depth3>1=r, (small) col1 depth2>1=r,
  // (roach) col0 depth1==1=b
  assert.deepEqual(pred.P, ['r', 'r', 'b']);
  // generic consistency for both outcomes on a real shoe
  const shoe = R.buildBigRoad(R.simulateShoe(mulberry32(3)));
  const p2 = R.predictNext(shoe);
  for (const oc of ['B', 'P']) {
    const cols = shoe.cols.map((c) => ({ outcome: c.outcome, cells: c.cells.map((x) => ({ ...x })) }));
    const last = cols[cols.length - 1];
    if (last && last.outcome === oc) last.cells.push({ ties: 0 });
    else cols.push({ outcome: oc, cells: [{ ties: 0 }] });
    for (const k of [1, 2, 3]) {
      const after = R.deriveRoad({ cols }, k);
      const before = R.deriveRoad(shoe, k);
      assert.equal(p2[oc][k - 1], after.length > before.length ? after[after.length - 1] : null);
    }
  }
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test tests/baccarat-roads.test.mjs`
Expected: 5 new tests FAIL (`deriveRoad is not a function`); earlier tests PASS.

- [ ] **Step 3: Implement**

Insert before the export line in `src/logic/baccarat-roads.js`:

```js
  // ---------- derived roads ----------
  // offset 1 = big eye boy (大眼仔), 2 = small road (小路),
  // 3 = cockroach pig (曱甴路). See plan/spec for the comparison rule.
  function deriveRoad(big, offset) {
    const depth = (i) => big.cols[i].cells.length;
    const colors = [];
    big.cols.forEach((col, c) => {
      col.cells.forEach((_, r) => {
        if (!(c > offset || (c === offset && r >= 1))) return;
        if (r === 0) colors.push(depth(c - 1) === depth(c - 1 - offset) ? 'r' : 'b');
        else colors.push(depth(c - offset) === r ? 'b' : 'r');
      });
    });
    return colors;
  }

  // 下局預告: the symbol each derived road would print if the next result
  // were B / P — computed by actually appending the hypothetical round.
  function predictNext(big) {
    const out = {};
    for (const oc of ['B', 'P']) {
      const cols = big.cols.map((c) => ({ outcome: c.outcome, cells: c.cells.map((x) => ({ ...x })) }));
      const last = cols[cols.length - 1];
      if (last && last.outcome === oc) last.cells.push({ ties: 0 });
      else cols.push({ outcome: oc, cells: [{ ties: 0 }] });
      out[oc] = [1, 2, 3].map((k) => {
        const after = deriveRoad({ cols }, k);
        const before = deriveRoad(big, k);
        return after.length > before.length ? after[after.length - 1] : null;
      });
    }
    return out;
  }
```

Update the export line to:

```js
  C.baccaratRoads = { bacValue, total, bankerDraws, simulateShoe, stats, buildBigRoad, layoutRoad, bigRoadCells, beadPlate, deriveRoad, predictNext };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/baccarat-roads.test.mjs`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/baccarat-roads.js portfolio/src/game/casino-game/calculator/lobby-3d/tests/baccarat-roads.test.mjs
git commit -m "feat(casino-3d): derived roads (big eye boy / small / cockroach) + next-round prediction"
```

---

### Task 4: Register module in the build + new felt geometry in layouts

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/build.mjs` (SRC_ORDER — **one line**; a parallel session may have touched this repo area: re-read the file immediately before editing)
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/layouts.js` (the `baccarat` object only)
- Modify (test): `portfolio/src/game/casino-game/calculator/lobby-3d/tests/layouts.test.mjs`

**Interfaces:**
- Produces (relied on by Tasks 5–7): `C.layouts.baccarat` gains `feltRx: 1.692`, `feltRz: 0.799`, `rackPos: [0, 0.82, -0.52]`, `discardPos: [-0.55, 0.82, -0.50]`, `seatAngles: [27.5, 52.5, 77.5, 102.5, 127.5, 152.5]` (seat 1 first; 90° = player edge, angle measured so x = cos·f·rx, z = sin·f·rz), `betFracs: { tie: 0.50, banker: 0.66, player: 0.81 }`, `seatSpot(seatIdx, kind) → [x, z]`. Card slots move to the card-dealing area at z = −0.14. `spots` becomes `{}` (per-seat printed boxes replace the old shared decals).

- [ ] **Step 1: Update the layouts test**

In `tests/layouts.test.mjs`, replace the existing `test('baccarat + uth slots/spots sit inside their felt ellipses', ...)` block with:

```js
test('baccarat + uth slots/spots sit inside their felt ellipses', () => {
  const inEllipse = (rx, rz) => ([x, , z], pad = 0) =>
    (x / (rx - pad)) ** 2 + (z / (rz - pad)) ** 2 < 1;
  const bacIn = inEllipse(1.8 * 0.94, 0.85 * 0.94);
  L.baccarat.playerSlots.forEach((p) => assert.ok(bacIn(p)));
  L.baccarat.bankerSlots.forEach((p) => assert.ok(bacIn(p)));
  Object.values(L.baccarat.spots).forEach(({ pos }) => assert.ok(bacIn(pos)));
  const uthIn = inEllipse(1.6 * 0.94, 0.9 * 0.94);
  L.uth.playerSlots.forEach((p) => assert.ok(uthIn(p)));
  L.uth.dealerSlots.forEach((p) => assert.ok(uthIn(p)));
  L.uth.boardSlots.forEach((p) => assert.ok(uthIn(p)));
  Object.values(L.uth.spots).forEach(({ pos }) => assert.ok(uthIn(pos)));
});

test('baccarat Macau layout: seat spots on the felt, card slots in the dealing area', () => {
  const bac = L.baccarat;
  assert.equal(bac.seatAngles.length, 6);
  // seat betting spots stay inside the felt ellipse with margin for a chip
  for (let s = 0; s < 6; s++) {
    for (const kind of ['tie', 'banker', 'player']) {
      const [x, z] = bac.seatSpot(s, kind);
      assert.ok((x / (bac.feltRx - 0.06)) ** 2 + (z / (bac.feltRz - 0.06)) ** 2 < 1, `seat ${s} ${kind}`);
      assert.ok(z > 0, 'betting arcs are on the player (+z) side');
    }
  }
  // seat 1 (index 0) is on the right (+x), seat 6 on the left
  assert.ok(bac.seatSpot(0, 'player')[0] > 0);
  assert.ok(bac.seatSpot(5, 'player')[0] < 0);
  // card slots sit between the rack (z ~ -0.5) and the arcs (z > 0)
  [...bac.playerSlots, ...bac.bankerSlots].forEach((p) => {
    assert.ok(p[2] > bac.rackPos[2] + 0.15 && p[2] < 0, 'card row in the dealing area');
  });
  // rack + discard + shoe on the dealer strip
  assert.ok(bac.rackPos[2] < -0.3 && bac.shoePos[2] < -0.3 && bac.discardPos[2] < -0.3);
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `node --test tests/layouts.test.mjs`
Expected: new test FAILS (`seatAngles` undefined); others PASS.

- [ ] **Step 3: Rewrite the `baccarat` object in `src/logic/layouts.js`**

Replace the whole `const baccarat = { ... };` block with:

```js
  // ---------- baccarat (ellipse felt rx 1.692 / rz 0.799, FELT_Y 0.82)
  // Macau-style layout: dealer strip (chip rack/shoe/discard) at -z, the
  // card-dealing area between it and six numbered seat sectors of betting
  // arcs on the +z side. Angles: 90° = player edge; x = cos(a)*f*rx,
  // z = sin(a)*f*rz — shared by seatSpot() and the painted felt texture.
  const baccarat = {
    feltY: 0.82, cardY: 0.85,
    feltRx: 1.692, feltRz: 0.799,
    rackPos: [0, 0.82, -0.52],
    shoePos: [0.62, 0.82, -0.48],
    discardPos: [-0.62, 0.82, -0.48],
    chipSource: [1.05, 0.84, 0.35],
    dealerChipPos: [0, 0.84, -0.32],
    // two upright slots + the third card laid SIDEWAYS outboard of them
    // (slot index 2), as dealt in real baccarat.
    playerSlots: [[-0.45, 0.85, -0.14], [-0.28, 0.85, -0.14], [-0.66, 0.85, -0.14]],
    bankerSlots: [[0.28, 0.85, -0.14], [0.45, 0.85, -0.14], [0.66, 0.85, -0.14]],
    spots: {},   // per-seat boxes are printed on the felt instead
    seatAngles: [27.5, 52.5, 77.5, 102.5, 127.5, 152.5],   // seat 1..6
    betFracs: { tie: 0.50, banker: 0.66, player: 0.81 },
    seatSpot(seat, kind) {
      const a = (this.seatAngles[seat] * Math.PI) / 180;
      const f = this.betFracs[kind];
      return [Math.cos(a) * f * this.feltRx, Math.sin(a) * f * this.feltRz];
    },
    poseDeal: { pos: [0, 1.32, 0.82], look: [0, 0.85, -0.15] },
  };
```

- [ ] **Step 4: Add the module to `build.mjs` SRC_ORDER**

Re-read `build.mjs` first (parallel session check). Then add ONE line after `'src/logic/layouts.js',`:

```js
  'src/logic/layouts.js',
  'src/logic/baccarat-roads.js',
```

- [ ] **Step 5: Run all tests**

Run: `node --test tests/`
Expected: ALL PASS (layouts, baccarat-roads, build, floor-model, reception-model tests). Note: the build test regenerates `index.html` from current sources — expected, it's a generated file.

- [ ] **Step 6: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/logic/layouts.js portfolio/src/game/casino-game/calculator/lobby-3d/tests/layouts.test.mjs portfolio/src/game/casino-game/calculator/lobby-3d/build.mjs
git commit -m "feat(casino-3d): baccarat Macau layout geometry + baccarat-roads in the bundle"
```

(Do NOT stage `index.html` here — it gets one rebuild commit in Task 8.)

---

### Task 5: Felt texture rewrite (Macau full style)

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/baccarat-table.js`

**Interfaces:**
- Consumes: `C.layouts.baccarat` fields from Task 4 (`feltRx/feltRz/seatAngles/betFracs/rackPos`), `C.assets.canvasTexture/roundRect`.
- Produces: module-cached `makeFeltTexture()` — all four tables share one 2048×1024 texture. Canvas mapping (verify in browser in Task 8): canvas x → local +x, canvas TOP = dealer edge (−z); `pt(f, deg)` matches `seatSpot` angles.

- [ ] **Step 1: Replace `makeFeltTexture()` in `baccarat-table.js`**

Replace the entire existing `makeFeltTexture` function with:

```js
  const CJK = "'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif";

  let feltTexture = null;
  function makeFeltTexture() {
    if (feltTexture) return feltTexture;
    const L = C.layouts.baccarat;
    const W = 2048, H = 1024, cx = W / 2, cy = H / 2;
    // world (table-local) -> canvas px; canvas top = dealer edge (-z)
    const px = (x) => cx + (x / L.feltRx) * (W / 2);
    const py = (z) => cy + (z / L.feltRz) * (H / 2);
    // point at radial fraction f, angle deg (90° = player edge) — the same
    // parametrisation as layouts.baccarat.seatSpot
    const pt = (f, deg) => {
      const a = (deg * Math.PI) / 180;
      return [cx + Math.cos(a) * f * (W / 2), cy + Math.sin(a) * f * (H / 2)];
    };

    feltTexture = C.assets.canvasTexture(W, H, (ctx) => {
      const R = C.assets.roundRect;
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, W, H);

      // gold border ring
      ctx.strokeStyle = 'rgba(240,216,120,.7)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(cx, cy, W / 2 - 14, H / 2 - 14, 0, 0, Math.PI * 2); ctx.stroke();

      // dealer strip: outline where the physical chip rack sits
      ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 4;
      R(ctx, px(-0.42), py(-0.66), px(0.42) - px(-0.42), py(-0.38) - py(-0.66), 14); ctx.stroke();

      // card-dealing area: 閒 PLAYER (left, yellow) | 庄 BANKER (right, red)
      const cardBox = (x0, x1, color, label) => {
        ctx.strokeStyle = color; ctx.lineWidth = 5;
        R(ctx, px(x0), py(-0.30), px(x1) - px(x0), py(0.02) - py(-0.30), 16); ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold 34px ${CJK}`;
        ctx.fillText(label, (px(x0) + px(x1)) / 2, py(-0.25));
      };
      cardBox(-0.78, -0.16, '#f0d878', '閒 PLAYER');
      cardBox(0.16, 0.78, '#e05555', '庄 BANKER');
      ctx.strokeStyle = 'rgba(240,216,120,.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, py(-0.30)); ctx.lineTo(cx, py(0.02)); ctx.stroke();

      // rotated text helper: upright for a viewer at that seat
      const arcText = (text, f, deg, font, fill) => {
        const [x, y] = pt(f, deg);
        ctx.save(); ctx.translate(x, y); ctx.rotate(((deg - 90) * Math.PI) / 180);
        ctx.font = font; ctx.fillStyle = fill;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };
      // closed band between fractions f0..f1, angles a0..a1
      const bandPath = (f0, f1, a0, a1) => {
        ctx.beginPath();
        for (let a = a0; a <= a1; a += 2) { const [x, y] = pt(f1, a); a === a0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        for (let a = a1; a >= a0; a -= 2) { const [x, y] = pt(f0, a); ctx.lineTo(x, y); }
        ctx.closePath();
      };

      // commission boxes 1..6 (dealer tracks 5% commission per seat)
      L.seatAngles.forEach((deg, i) => {
        const [bx, by] = pt(0.30, deg);
        ctx.save(); ctx.translate(bx, by); ctx.rotate(((deg - 90) * Math.PI) / 180);
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
        R(ctx, -30, -24, 60, 48, 8); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = 'bold 30px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), 0, 0);
        ctx.restore();
      });

      // radial sector dividers
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
      for (let i = 0; i <= 6; i++) {
        const deg = 15 + i * 25;
        const [x0, y0] = pt(0.40, deg), [x1, y1] = pt(0.90, deg);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }

      // per-seat betting arcs: TIE(+pairs) inner, BANKER middle, PLAYER outer
      L.seatAngles.forEach((deg, i) => {
        // TIE box
        ctx.strokeStyle = '#59d98e'; ctx.lineWidth = 4;
        bandPath(0.43, 0.56, deg - 6.5, deg + 6.5); ctx.stroke();
        arcText('和 TIE', 0.515, deg, `bold 26px ${CJK}`, '#59d98e');
        arcText('8:1', 0.455, deg, 'bold 20px Georgia, serif', 'rgba(89,217,142,.9)');
        // pair circles flanking the tie box
        [['庄對', '#e05555', -10.2], ['閒對', '#f0d878', 10.2]].forEach(([t, col, da]) => {
          const [ox, oy] = pt(0.50, deg + da);
          ctx.strokeStyle = col; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(ox, oy, 26, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = col;
          ctx.font = `bold 16px ${CJK}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(t, ox, oy);
        });
        // BANKER arc
        ctx.strokeStyle = '#e05555'; ctx.lineWidth = 4;
        bandPath(0.60, 0.72, deg - 11, deg + 11); ctx.stroke();
        arcText('庄 BANKER', 0.66, deg, `bold 30px ${CJK}`, '#e05555');
        // PLAYER arc
        ctx.strokeStyle = '#f0d878'; ctx.lineWidth = 4;
        bandPath(0.75, 0.87, deg - 11, deg + 11); ctx.stroke();
        arcText('閒 PLAYER', 0.81, deg, `bold 30px ${CJK}`, '#f0d878');
        // seat number at the rim
        arcText(String(i + 1), 0.93, deg, 'bold 44px Georgia, serif', 'rgba(255,255,255,.9)');
      });
    });
    return feltTexture;
  }
```

- [ ] **Step 2: Syntax check + tests**

Run: `node --check src/floor/tables/baccarat-table.js && node --test tests/`
Expected: no syntax error; all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/baccarat-table.js
git commit -m "feat(casino-3d): Macau-style baccarat felt — rack strip, card area, commission boxes, seat arcs"
```

---

### Task 6: Table props — chip rack, discard tray, ghost seats, last-round cards

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/baccarat-table.js`

**Interfaces:**
- Consumes: `C.baccaratRoads.simulateShoe()`, `C.chips.makeChipStack(value, n)`, `C.cards.makeCard(card)`, `C.cards.makeCardBoxDecal({sideways})`, `C.assets.makeStool()/goldMaterial()`, `L.seatSpot/rackPos/discardPos/playerSlots/bankerSlots`.
- Produces: inside `C.floor.tables.baccarat`, a `const rounds = C.baccaratRoads.simulateShoe();` used by Task 7's scoreboard; `makeChipRack()` and `makeDiscardTray()` helpers.

- [ ] **Step 1: Add the prop builders**

In `baccarat-table.js`, after `makeFeltTexture`, add:

```js
  // dealer chip rack: dark tray, gold dividers, 8 chip stacks
  function makeChipRack() {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.045, 0.26),
      new THREE.MeshStandardMaterial({ color: '#1a120b', roughness: 0.45, metalness: 0.25 }),
    );
    tray.position.y = 0.0225;
    tray.castShadow = true; tray.receiveShadow = true;
    g.add(tray);
    for (let i = 0; i <= 8; i++) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.052, 0.26), C.assets.goldMaterial());
      div.position.set(-0.36 + i * 0.09, 0.028, 0);
      g.add(div);
    }
    [5000, 1000, 1000, 500, 500, 100, 100, 25].forEach((v, i) => {
      const stack = C.chips.makeChipStack(v, 5 + (i % 3));
      stack.position.set(-0.315 + i * 0.09, 0.048, 0);
      g.add(stack);
    });
    return g;
  }

  // discard holder: shallow tray with a few face-down cards
  function makeDiscardTray() {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.03, 0.3),
      new THREE.MeshStandardMaterial({ color: '#14100c', roughness: 0.5, metalness: 0.2 }),
    );
    tray.position.y = 0.015;
    tray.castShadow = true;
    g.add(tray);
    for (let i = 0; i < 3; i++) {
      const card = C.cards.makeCard(null);
      card.rotation.x = -Math.PI / 2;
      card.rotation.z = (Math.random() - 0.5) * 0.3;
      card.position.set(0, 0.033 + i * 0.002, 0);
      g.add(card);
    }
    return g;
  }
```

- [ ] **Step 2: Rewrite the builder body**

In `C.floor.tables.baccarat`, DELETE: the old `[L.playerSlots, L.bankerSlots].forEach(...)` card-box loop, the `Object.values(L.spots).forEach(...)` decal loop, the old shoe block's `shoeGroup.position.set(...)` line only (keep the shoe build), and the whole `GHOST_ANGLES_DEG.forEach(...)` block (also delete the `GHOST_ANGLES_DEG` and `CHIP_RX, CHIP_RZ` constants at the top; keep `SEAT_RX, SEAT_RZ`). Replace with (after the felt mesh is added):

```js
    // one simulated shoe per table: the same history drives the felt cards
    // and the scoreboard, so everything on this table is self-consistent
    const rounds = C.baccaratRoads.simulateShoe();
    const lastRound = rounds[rounds.length - 1];

    // card-dealing area: printed boxes + the final round's actual cards
    [[L.playerSlots, lastRound.playerCards], [L.bankerSlots, lastRound.bankerCards]]
      .forEach(([slots, cards]) => {
        slots.forEach((slot, idx) => {
          const box = C.cards.makeCardBoxDecal({ sideways: idx === 2 });
          box.position.set(slot[0], FELT_Y + 0.004, slot[2]);
          g.add(box);
        });
        cards.forEach((cardDef, idx) => {
          const card = C.cards.makeCard(cardDef);
          card.rotation.x = -Math.PI / 2;
          if (idx === 2) card.rotation.z = Math.PI / 2;
          card.position.set(slots[idx][0], FELT_Y + 0.006 + idx * 0.0005, slots[idx][2]);
          g.add(card);
        });
      });

    // dealer strip props
    const rack = makeChipRack();
    rack.position.set(L.rackPos[0], FELT_Y, L.rackPos[2]);
    g.add(rack);
    const discard = makeDiscardTray();
    discard.position.set(L.discardPos[0], FELT_Y, L.discardPos[2]);
    g.add(discard);
    shoeGroup.position.set(L.shoePos[0], FELT_Y, L.shoePos[2]);

    // six seats matching the felt sectors; some "occupied" with ghost bets
    const kinds = ['player', 'banker', 'banker', 'player', 'tie'];
    const occupied = new Set();
    while (occupied.size < 3 + Math.floor(Math.random() * 2))
      occupied.add(Math.floor(Math.random() * 6));
    L.seatAngles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const stool = A.makeStool();
      stool.position.set(Math.cos(a) * SEAT_RX, 0, Math.sin(a) * SEAT_RZ);
      g.add(stool);
      if (!occupied.has(i)) return;
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const [bx, bz] = L.seatSpot(i, kind);
      const chips = C.chips.makeChipStack([100, 500, 1000][i % 3], 3 + (i % 4));
      chips.position.set(bx, FELT_Y + 0.005, bz);
      g.add(chips);
    });
```

Note: the shoe body/trim build stays exactly as-is above this block; only its final `position.set` uses the layouts value now.

- [ ] **Step 3: Syntax check + tests**

Run: `node --check src/floor/tables/baccarat-table.js && node --test tests/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/baccarat-table.js
git commit -m "feat(casino-3d): baccarat props — chip rack, discard tray, seat sectors, real last-round cards"
```

---

### Task 7: Roadmap scoreboard (百家樂 LED board)

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/baccarat-table.js`

**Interfaces:**
- Consumes: everything in `C.baccaratRoads` (Tasks 1–3), `rounds` from Task 6, `C.assets.canvasTexture/roundRect/goldMaterial`, `opts.tierName`.
- Produces: `drawBoardCanvas(rounds, opts) → THREE texture (1024×800)`, `makeScoreBoard(rounds, opts) → THREE.Group`, board added to the table at `(-2.35, 0, 0.35)`.

- [ ] **Step 1: Add the board canvas painter**

Add after `makeDiscardTray` in `baccarat-table.js`:

```js
  // ---------- roadmap scoreboard (bilingual Macau LED board) ----------
  function drawBoardCanvas(rounds, opts) {
    const R2 = C.baccaratRoads;
    const big = R2.buildBigRoad(rounds);
    const st = R2.stats(rounds);
    const pred = R2.predictNext(big);
    const RED = '#e0453a', BLUE = '#3d7de0', GREEN = '#2fae62', GOLD = '#e8b54a';
    const RANK = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
    for (let r = 2; r <= 10; r++) RANK[r] = String(r);
    const SUITS = ['♠', '♥', '♦', '♣'];
    const derivedCells = (k) =>
      R2.layoutRoad(R2.deriveRoad(big, k).map((color) => ({ key: color, color })));
    const lastCols = (cells, n) => {
      const max = cells.reduce((m, c) => Math.max(m, c.col), 0);
      const shift = Math.max(0, max + 1 - n);
      return cells.filter((c) => c.col >= shift).map((c) => ({ ...c, col: c.col - shift }));
    };

    return C.assets.canvasTexture(1024, 800, (ctx) => {
      const RR = C.assets.roundRect;
      const bg = ctx.createLinearGradient(0, 0, 0, 800);
      bg.addColorStop(0, '#241014'); bg.addColorStop(1, '#0c0d12');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 800);
      ctx.strokeStyle = '#4a3b22'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 1016, 792);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      const grid = (x0, y0, cell, cols, rows) => {
        ctx.strokeStyle = 'rgba(120,130,150,0.4)'; ctx.lineWidth = 1;
        for (let i = 0; i <= cols; i++) {
          ctx.beginPath(); ctx.moveTo(x0 + i * cell, y0); ctx.lineTo(x0 + i * cell, y0 + rows * cell); ctx.stroke();
        }
        for (let j = 0; j <= rows; j++) {
          ctx.beginPath(); ctx.moveTo(x0, y0 + j * cell); ctx.lineTo(x0 + cols * cell, y0 + j * cell); ctx.stroke();
        }
      };
      const roadPanel = (x0, y0, cell, cols, rows) => {
        ctx.fillStyle = '#f5efdf';
        RR(ctx, x0 - 3, y0 - 3, cols * cell + 6, rows * cell + 6, 6); ctx.fill();
        grid(x0, y0, cell, cols, rows);
      };
      const bandLabel = (t, x, y) => {
        ctx.fillStyle = '#c8b78e'; ctx.font = `bold 13px ${CJK}`;
        ctx.textAlign = 'left'; ctx.fillText(t, x, y); ctx.textAlign = 'center';
      };

      // title
      ctx.fillStyle = GOLD;
      ctx.font = `bold 52px ${CJK}`;
      ctx.fillText('百家樂', 150, 46);
      ctx.font = 'bold 38px Georgia, serif';
      ctx.fillText('BACCARAT', 150, 96);
      ctx.fillStyle = '#c8b78e'; ctx.font = `16px ${CJK}`;
      ctx.fillText((opts.tierName || '').toUpperCase(), 150, 132);

      // stats table
      [
        ['庄 BANKER', st.banker, RED],
        ['閒 PLAYER', st.player, BLUE],
        ['和 TIE', st.tie, GREEN],
        ['庄對 BANKER PAIR', st.bPair, RED],
        ['閒對 PLAYER PAIR', st.pPair, BLUE],
        ['例牌 NATURAL', st.natural, GOLD],
        ['局數 GAME NUMBER', st.games, '#dcd6c8'],
      ].forEach(([label, n, col], i) => {
        const y = 24 + i * 19;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(324, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#efe9dc'; ctx.textAlign = 'left';
        ctx.font = `bold 15px ${CJK}`;
        ctx.fillText(label, 340, y);
        ctx.fillStyle = GOLD; ctx.textAlign = 'right';
        ctx.font = 'bold 17px Georgia, serif';
        ctx.fillText(String(n), 700, y);
        ctx.textAlign = 'center';
      });

      // 下局預告 (next-round preview) — genuinely computed one step ahead
      ctx.strokeStyle = '#6b5a33'; ctx.lineWidth = 2;
      RR(ctx, 720, 12, 292, 140, 8); ctx.stroke();
      ctx.fillStyle = '#efe9dc'; ctx.font = `bold 18px ${CJK}`;
      ctx.fillText('下局預告', 866, 32);
      const predSymbol = (x, y, road, color) => {
        if (!color) {
          ctx.fillStyle = '#666';
          ctx.fillRect(x - 6, y - 1.5, 12, 3);
          return;
        }
        const col = color === 'r' ? RED : BLUE;
        if (road === 0) {           // big eye boy: ring
          ctx.strokeStyle = col; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
        } else if (road === 1) {    // small road: dot
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        } else {                    // cockroach: slash
          ctx.strokeStyle = col; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(x - 7, y + 7); ctx.lineTo(x + 7, y - 7); ctx.stroke();
        }
      };
      [['B', 810, RED, '庄'], ['P', 922, BLUE, '閒']].forEach(([oc, x, col, ch]) => {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, 66, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold 16px ${CJK}`;
        ctx.fillText(ch, x, 66);
        pred[oc].forEach((color, k) => predSymbol(x - 34 + k * 34, 108, k, color));
      });

      // 珠盤路 bead plate (12 cols)
      bandLabel('珠盤路', 14, 160);
      const BX = 12, BY = 170, BC = 26;
      roadPanel(BX, BY, BC, 12, 6);
      R2.beadPlate(rounds, 12).forEach((cell) => {
        const x = BX + cell.col * BC + BC / 2, y = BY + cell.row * BC + BC / 2;
        ctx.fillStyle = cell.outcome === 'B' ? RED : cell.outcome === 'P' ? BLUE : GREEN;
        ctx.beginPath(); ctx.arc(x, y, BC * 0.44, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold 14px ${CJK}`;
        ctx.fillText(cell.outcome === 'B' ? '庄' : cell.outcome === 'P' ? '閒' : '和', x, y);
        if (cell.bankerPair) {
          ctx.fillStyle = RED;
          ctx.beginPath(); ctx.arc(x - BC * 0.34, y - BC * 0.34, 3.5, 0, Math.PI * 2); ctx.fill();
        }
        if (cell.playerPair) {
          ctx.fillStyle = BLUE;
          ctx.beginPath(); ctx.arc(x + BC * 0.34, y + BC * 0.34, 3.5, 0, Math.PI * 2); ctx.fill();
        }
      });

      // current round card panel (gold)
      const last = rounds[rounds.length - 1];
      const gp = ctx.createLinearGradient(0, 170, 0, 326);
      gp.addColorStop(0, '#caa64f'); gp.addColorStop(1, '#9a7a2e');
      ctx.fillStyle = gp; RR(ctx, 340, 170, 672, 156, 8); ctx.fill();
      ctx.strokeStyle = '#6b5a1f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(676, 178); ctx.lineTo(676, 318); ctx.stroke();
      ctx.fillStyle = '#3a2c08'; ctx.font = `bold 22px ${CJK}`;
      ctx.fillText(`閒 PLAYER ${last.playerTotal}`, 508, 306);
      ctx.fillText(`庄 BANKER ${last.bankerTotal}`, 844, 306);
      const mini = (card, x, y, sideways) => {
        ctx.save(); ctx.translate(x, y);
        if (sideways) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#fdfbf2'; RR(ctx, -24, -34, 48, 68, 6); ctx.fill();
        ctx.strokeStyle = '#8a8578'; ctx.lineWidth = 1.5; RR(ctx, -24, -34, 48, 68, 6); ctx.stroke();
        ctx.fillStyle = card.s === 1 || card.s === 2 ? '#c0392b' : '#16161c';
        ctx.font = 'bold 26px Georgia, serif';
        ctx.fillText(RANK[card.r], 0, -12);
        ctx.font = '24px Georgia, serif';
        ctx.fillText(SUITS[card.s], 0, 16);
        ctx.restore();
      };
      last.playerCards.forEach((cd, i) => mini(cd, 448 + i * 64, 232, i === 2));
      last.bankerCards.forEach((cd, i) => mini(cd, 784 + i * 64, 232, i === 2));

      // 大路 big road
      bandLabel('大路', 14, 340);
      roadPanel(12, 348, 32, 31, 6);
      lastCols(R2.bigRoadCells(big), 31).forEach((c) => {
        const x = 12 + c.col * 32 + 16, y = 348 + c.row * 32 + 16;
        ctx.strokeStyle = c.outcome === 'B' ? RED : BLUE; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
        if (c.ties > 0) {
          ctx.strokeStyle = GREEN; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(x - 11, y + 11); ctx.lineTo(x + 11, y - 11); ctx.stroke();
          if (c.ties > 1) {
            ctx.fillStyle = GREEN; ctx.font = 'bold 13px Georgia, serif';
            ctx.fillText(String(c.ties), x + 10, y + 10);
          }
        }
      });

      // 大眼仔 big eye boy
      bandLabel('大眼仔', 14, 556);
      roadPanel(12, 564, 17, 59, 6);
      lastCols(derivedCells(1), 59).forEach((c) => {
        const x = 12 + c.col * 17 + 8.5, y = 564 + c.row * 17 + 8.5;
        ctx.strokeStyle = c.color === 'r' ? RED : BLUE; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.stroke();
      });

      // 小路 + 曱甴路
      bandLabel('小路', 14, 680);
      roadPanel(12, 688, 16, 30, 6);
      lastCols(derivedCells(2), 30).forEach((c) => {
        const x = 12 + c.col * 16 + 8, y = 688 + c.row * 16 + 8;
        ctx.fillStyle = c.color === 'r' ? RED : BLUE;
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
      });
      bandLabel('曱甴路', 522, 680);
      roadPanel(520, 688, 16, 30, 6);
      lastCols(derivedCells(3), 30).forEach((c) => {
        const x = 520 + c.col * 16 + 8, y = 688 + c.row * 16 + 8;
        ctx.strokeStyle = c.color === 'r' ? RED : BLUE; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - 5, y + 5); ctx.lineTo(x + 5, y - 5); ctx.stroke();
      });

      // bilingual disclaimer footer
      ctx.fillStyle = '#9b8f78'; ctx.font = `12px ${CJK}`;
      ctx.fillText('路盤所顯示之資料，只供參考，如有錯漏，本公司概不負責。 Results displayed are provided as a service only.', 512, 792);
    });
  }
```

- [ ] **Step 2: Add the physical board + integration**

After `drawBoardCanvas`, add:

```js
  function makeScoreBoard(rounds, opts) {
    const g = new THREE.Group();
    const casing = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 1.0, 0.07),
      new THREE.MeshStandardMaterial({ color: '#14161c', roughness: 0.5, metalness: 0.3 }),
    );
    casing.position.y = 1.5;
    casing.castShadow = true;
    g.add(casing);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.06, 0.05), C.assets.goldMaterial());
    frame.position.set(0, 1.5, -0.014);
    g.add(frame);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.92),
      new THREE.MeshBasicMaterial({ map: drawBoardCanvas(rounds, opts), fog: false }),
    );
    screen.position.set(0, 1.5, 0.037);
    g.add(screen);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 1.0, 12),
      new THREE.MeshStandardMaterial({ color: '#0e0f13', roughness: 0.4, metalness: 0.5 }),
    );
    pole.position.y = 0.5;
    g.add(pole);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.05, 20),
      new THREE.MeshStandardMaterial({ color: '#0e0f13', roughness: 0.5, metalness: 0.4 }),
    );
    base.position.y = 0.025;
    g.add(base);
    return g;
  }
```

In the builder (`C.floor.tables.baccarat`), right before the plaque block, add:

```js
    // roadmap scoreboard at the end opposite the plaque, facing the aisle
    const board = makeScoreBoard(rounds, opts);
    board.position.set(-2.35, 0, 0.35);
    board.rotation.y = 0.35;
    g.add(board);
```

And change `g.userData.radius = 2.3;` to `g.userData.radius = 2.4;`.

- [ ] **Step 3: Syntax check + full tests**

Run: `node --check src/floor/tables/baccarat-table.js && node --test tests/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/src/floor/tables/baccarat-table.js
git commit -m "feat(casino-3d): bilingual baccarat roadmap scoreboard — five roads, stats, prediction, live cards"
```

---

### Task 8: Build, browser verification, public sync

**Files:**
- Regenerate: `portfolio/src/game/casino-game/calculator/lobby-3d/index.html`
- Maybe sync: `portfolio/public/games/casino-game/lobby-3d/**` (conditional — see Step 4)

- [ ] **Step 1: Rebuild + full test run**

```bash
cd portfolio/src/game/casino-game/calculator/lobby-3d
node build.mjs && node --test tests/
```
Expected: build OK (~1.5 MB), all tests PASS.

- [ ] **Step 2: Serve + inspect in Chrome**

```bash
python3 -m http.server 8931 -d portfolio/src/game/casino-game/calculator/lobby-3d
```
Open `http://localhost:8931/index.html` with the claude-in-chrome tools, walk/teleport to the baccarat row, and screenshot:
- Felt: rack outline at dealer edge, 閒 PLAYER / 庄 BANKER card boxes with real cards between rack and arcs, commission boxes 1–6, three arcs per seat, seat numbers 1 (right) → 6 (left), text not mirrored (if mirrored: flip the sign in `py()` — one line — and re-check).
- Board: legible from the aisle, five road bands populated, stats plausible (banker ≥ player usually, ties ~9%), CJK glyphs render, prediction symbols present.
- Cross-check one table: felt cards = gold panel cards; latest big-road cell color matches the last round's outcome.
- Console: zero errors.
- 4 tables show DIFFERENT roads.

- [ ] **Step 3: Commit the rebuilt bundle**

```bash
git add portfolio/src/game/casino-game/calculator/lobby-3d/index.html
git commit -m "build(casino-3d): rebundle lobby with baccarat Macau table + roadmap board"
```
⚠️ The regenerated `index.html` also inlines the parallel session's uncommitted roulette source. If `git status` still shows their `src/**` files dirty, this bundle contains their in-progress code — in that case SKIP this commit and Step 4, and report to the user instead.

- [ ] **Step 4: Sync to public (conditional)**

Only if Step 3's check passed (no foreign dirty source files): mirror the tracked file set:

```bash
git ls-files portfolio/public/games/casino-game/lobby-3d | sed 's|portfolio/public/games/casino-game/lobby-3d/||' \
  | while read f; do cp "portfolio/src/game/casino-game/calculator/lobby-3d/$f" "portfolio/public/games/casino-game/lobby-3d/$f"; done
git add portfolio/public/games/casino-game/lobby-3d
git commit -m "build(casino-3d): sync lobby-3d to public"
```

- [ ] **Step 5: Final verification checklist (BrainSpark done-criteria)**

- All `node --test tests/` pass.
- Browser screenshots confirm the felt + board render correctly, no console errors.
- Report to the user with screenshots; do NOT push or merge (explicit instruction required per project memory).
