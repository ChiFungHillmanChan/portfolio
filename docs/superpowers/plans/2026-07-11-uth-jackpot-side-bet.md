# UTH Jackpot Side Bet + Topbar Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant ⓘ info button from the UTH table topbar, and add a flat $1 "Jackpot" side bet (settled from the 2 hole cards + the 3 flop cards) with a fixed pay table topping out at a 400,000 Royal-Flush MEGA jackpot that fires a full-screen celebration — in both solo and online modes.

**Architecture:** Ultimate Texas Hold'em runs one UI over two backends. Solo tables execute the pure state machine (`js/core/logic.js` + `engine.js`) in-browser; online tables are server-authoritative via the `cg-uth` Lambda, whose `logic.mjs`/`engine.mjs` are the source-of-truth for the client copies (SYNC REQUIREMENT — byte-identical bodies, differing only in the header comment and `.mjs`↔`.js` import extension). Jackpot settlement is added to the shared engine; the fancy UI + bet placement live in the client only.

**Tech Stack:** Vanilla ES modules, no build step (files served statically). Backend is Node 22 AWS Lambda with `node --test`. Pure CSS animations (CSP-safe, no external libs).

## Global Constraints

- **Three copies of each shared file stay in sync.** For `engine` and `logic`, edit: (a) the Lambda `.mjs`, (b) client `src` `.js`, (c) client `public` `.js`. Bodies are identical; only headers/import extensions differ. After editing, verify with the diff command in each task.
- **Client `src` and `public` are byte-identical.** After editing any client file under `src/game/casino-game/calculator/ultimate-texas-holdem/`, copy it to the matching `public/games/casino-game/ultimate-texas-holdem/` path with `cp`.
- **Never push to `main` directly.** Work stays on branch `feat/uth-jackpot-side-bet`; integrate via PR.
- **Pay table (exact, verbatim):** Flush 50 · Full House 500 · Four of a Kind 1,500 · Straight Flush 20,000 · Royal Flush 400,000. Flat $1 bet. Only a flush or better pays; else lose the $1. Pays even on a fold. MEGA = Royal Flush only.
- **Path roots:**
  - `SRC = portfolio/src/game/casino-game/calculator/ultimate-texas-holdem`
  - `PUB = portfolio/public/games/casino-game/ultimate-texas-holdem`
  - `LAM = /Users/hillmanchan/Desktop/system-architecture/lambda/uth`
- **Card encoding (for tests/QA):** `card = suit*13 + rank`, rank `2..A` = `0..12`, suit `♠♥♦♣` = `0..3`. Royal-spades = `[12,11,10,9,8]` (As Ks Qs Js Ts... note rank A=12, K=11, Q=10, J=9, T=8).

---

### Task 1: Remove the redundant topbar ⓘ button

**Files:**
- Modify: `SRC/table.html:27` → `cp` to `PUB/table.html`
- Modify: `SRC/js/ui/table-main.js` (remove `settings-info` click case) → `cp` to `PUB/...`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (pure removal). The gear `SETTINGS` tab still opens Settings; `settingsOverlayHtml("info")` helper stays (unused arg path harmless).

- [ ] **Step 1: Remove the button from `SRC/table.html`**

Delete the entire `<button … data-action="settings-info" …>…</button>` element on line 27 (inside `.uth-topbar-right`). After the edit, `.uth-topbar-right` contains only the `.uth-round-label`:

```html
            <div class="uth-topbar-right">
                <div class="uth-round-label" id="roundLabel"></div>
            </div>
```

- [ ] **Step 2: Remove the dead click case in `SRC/js/ui/table-main.js`**

Delete these two lines from the `click` handler `switch`:

```js
      case "settings-info":
        showOverlay(settingsOverlayHtml("info"));
        break;
```

(Leave `case "settings":` intact.)

- [ ] **Step 3: Sync to public**

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/table.html          public/games/casino-game/ultimate-texas-holdem/table.html
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js  public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
```

- [ ] **Step 4: Verify no `settings-info` references remain**

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
grep -rn "settings-info" src/game/casino-game/calculator/ultimate-texas-holdem public/games/casino-game/ultimate-texas-holdem
```
Expected: **no output** (exit 1).

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/table.html \
        portfolio/public/games/casino-game/ultimate-texas-holdem/table.html \
        portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js \
        portfolio/public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
git commit -m "feat(uth): remove redundant topbar info button (reachable via Settings gear)"
```

---

### Task 2: Engine — jackpot constants + `settleSeat` settlement (TDD)

**Files:**
- Modify: `LAM/engine.mjs` (constants + `settleSeat`)
- Test: `LAM/engine.test.mjs`
- Mirror: `SRC/js/core/engine.js` → `cp` to `PUB/js/core/engine.js`

**Interfaces:**
- Consumes: existing `evaluate5(five) → {cat, value}`, `CAT`, `JACKPOT_*` from this file.
- Produces:
  - `JACKPOT_BET = 1`
  - `JACKPOT_PAYS: { [CAT.ROYAL]:400000, [CAT.STRAIGHT_FLUSH]:20000, [CAT.QUADS]:1500, [CAT.FULL_HOUSE]:500, [CAT.FLUSH]:50 }`
  - `JACKPOT_MEGA_CAT = CAT.ROYAL`
  - `settleSeat(seat, playerEval, dealerEval, playerHole, dealerHole, flop)` — now takes a 6th `flop` arg (3 cards); returns the existing deltas plus `jackpot` (number) and `jackpotCat` (a `CAT` value on a win, else `null`). `net` includes `jackpot`. Old 5-arg callers get `flop === undefined` → no jackpot effect.

- [ ] **Step 1: Write the failing tests in `LAM/engine.test.mjs`**

Add after the existing "zero side bets settle to zero deltas" test. `seat()` helper and `cards()`/`BOARD` already exist; the flop is the first 3 board cards. Note `BOARD = "2h 7h 9h Jc 3d"` → flop `"2h 7h 9h"` is all hearts, and `P_FLUSH = "Ah Kh"`, so hole+flop is an A-high heart flush.

```js
// ── Jackpot side bet (2 hole cards + the flop) ───────────────────────────────

import { JACKPOT_PAYS, JACKPOT_BET, JACKPOT_MEGA_CAT } from "./engine.mjs";

const FLOP_FLUSH = cards("2h 7h 9h");      // + Ah Kh  → heart flush
const FLOP_ROYAL = cards("Qh Jh Th");      // + Ah Kh  → royal flush
const FLOP_JUNK  = cards("2h 7d 9c");      // + Ah Kh  → A-high, no pay

function jackSeat(extra = {}) {
  const s = seat(extra);
  s.bets.jackpot = 1;
  return s;
}

test("jackpot pays flush from hole+flop", () => {
  const r = settleSeat(jackSeat(), evalP(P_FLUSH), evalP(D_PAIR), P_FLUSH, D_PAIR, FLOP_FLUSH);
  assert.equal(r.jackpot, 50);
  assert.equal(r.jackpotCat, CAT.FLUSH);
});

test("jackpot pays the 400,000 MEGA on a royal flop", () => {
  const r = settleSeat(jackSeat(), evalP(P_FLUSH), evalP(D_PAIR), P_FLUSH, D_PAIR, FLOP_ROYAL);
  assert.equal(r.jackpot, 400000);
  assert.equal(r.jackpotCat, JACKPOT_MEGA_CAT);
  assert.equal(JACKPOT_MEGA_CAT, CAT.ROYAL);
});

test("jackpot below a flush loses the $1", () => {
  const r = settleSeat(jackSeat(), evalP(P_FLUSH), evalP(D_PAIR), P_FLUSH, D_PAIR, FLOP_JUNK);
  assert.equal(r.jackpot, -1);
  assert.equal(r.jackpotCat, null);
});

test("jackpot uses the flop only, ignoring turn/river", () => {
  // hole+flop is a flush (pays 50); the full 7-card eval would be something else,
  // but settleSeat only receives the 3 flop cards so it can't see past the flop.
  const r = settleSeat(jackSeat(), evalP(cards("4s 5c")), evalP(D_PAIR), P_FLUSH, D_PAIR, FLOP_FLUSH);
  assert.equal(r.jackpot, 50);
});

test("jackpot pays even when the seat folds", () => {
  const r = settleSeat(jackSeat({ folded: true }), evalP(P_FLUSH), evalP(D_PAIR), P_FLUSH, D_PAIR, FLOP_FLUSH);
  assert.equal(r.jackpot, 50);
  assert.equal(r.ante, -100); // main bets still forfeit on a fold
});

test("no jackpot bet → zero jackpot delta, net unaffected", () => {
  const r = settleSeat(seat({ ante: 100, playBet: 100 }), evalP(P_FLUSH), evalP(D_PAIR), P_FLUSH, D_PAIR, FLOP_FLUSH);
  assert.equal(r.jackpot, 0);
  assert.equal(r.jackpotCat, null);
});

test("jackpot amount is included in net", () => {
  const r = settleSeat(jackSeat({ ante: 100, playBet: 100 }), evalP(P_FLUSH), evalP(D_PAIR), P_FLUSH, D_PAIR, FLOP_FLUSH);
  // ante 100 + play 100 + blind floor(100*1.5)=150 + jackpot 50 = 400
  assert.equal(r.net, 100 + 100 + 150 + 50);
});

test("JACKPOT_PAYS matches spec", () => {
  assert.equal(JACKPOT_BET, 1);
  assert.equal(JACKPOT_PAYS[CAT.FLUSH], 50);
  assert.equal(JACKPOT_PAYS[CAT.FULL_HOUSE], 500);
  assert.equal(JACKPOT_PAYS[CAT.QUADS], 1500);
  assert.equal(JACKPOT_PAYS[CAT.STRAIGHT_FLUSH], 20000);
  assert.equal(JACKPOT_PAYS[CAT.ROYAL], 400000);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/uth && node --test engine.test.mjs
```
Expected: FAIL — `JACKPOT_PAYS`/`JACKPOT_BET`/`JACKPOT_MEGA_CAT` are `undefined` (import error) and `r.jackpot` is `undefined`.

- [ ] **Step 3: Add the constants in `LAM/engine.mjs`**

Insert directly after the `BBB_PAYS` block (right before the `// ── Hand evaluation ──` divider):

```js
// Jackpot — a flat $1 wager settled on the player's two hole cards + the flop
// (a 5-card hand). Only a flush or better pays; the Royal is the MEGA jackpot.
export const JACKPOT_BET = 1;

export const JACKPOT_PAYS = {
  [CAT.ROYAL]: 400000,
  [CAT.STRAIGHT_FLUSH]: 20000,
  [CAT.QUADS]: 1500,
  [CAT.FULL_HOUSE]: 500,
  [CAT.FLUSH]: 50,
};

export const JACKPOT_MEGA_CAT = CAT.ROYAL;
```

- [ ] **Step 4: Extend `settleSeat` in `LAM/engine.mjs`**

Change the signature and the first three lines:

```js
export function settleSeat(seat, playerEval, dealerEval, playerHole, dealerHole, flop) {
  const { ante, blind, trips, holeCard, badBeat, jackpot = 0 } = seat.bets;
  const playBet = seat.playBet || 0;
  const r = { ante: 0, blind: 0, play: 0, trips: 0, holeCard: 0, badBeat: 0, jackpot: 0, jackpotCat: null };
```

Add the jackpot block immediately after the existing Hole Card Bonus block (both resolve even on a fold), before `if (seat.folded) {`:

```js
  // Jackpot: fixed the instant the flop is known, so like the Hole Card bonus
  // it resolves even on a fold. Only a flush or better pays.
  if (jackpot > 0 && Array.isArray(flop) && flop.length === 3) {
    const jEval = evaluate5([...playerHole, ...flop]);
    const pay = JACKPOT_PAYS[jEval.cat];
    r.jackpot = pay ? pay : -jackpot;
    if (pay) r.jackpotCat = jEval.cat;
  }
```

Update the net line at the end of the function:

```js
  r.net = r.ante + r.blind + r.play + r.trips + r.holeCard + r.badBeat + r.jackpot;
  return r;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:
```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/uth && node --test engine.test.mjs
```
Expected: PASS — all tests green, including the pre-existing 5-arg `settleSeat` tests (unaffected).

- [ ] **Step 6: Mirror the identical body edit to the client `engine.js`**

Apply the **same** two edits (constants block + `settleSeat` changes) to `SRC/js/core/engine.js` (identical body — same insertion points), then copy to public:

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/core/engine.js public/games/casino-game/ultimate-texas-holdem/js/core/engine.js
```

- [ ] **Step 7: Verify the three copies stay in sync**

Run (bodies must match from the shared code onward; only headers differ):
```bash
cd /Users/hillmanchan/Desktop
diff <(tail -n +11 system-architecture/lambda/uth/engine.mjs) <(tail -n +12 HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/core/engine.js)
diff HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/core/engine.js HillmanChan_portfolio/portfolio/public/games/casino-game/ultimate-texas-holdem/js/core/engine.js
```
Expected: the first diff shows only the single header-comment line already known to differ (`// suit = Math.floor...`); the second diff shows **nothing**.

- [ ] **Step 8: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/core/engine.js portfolio/public/games/casino-game/ultimate-texas-holdem/js/core/engine.js
git commit -m "feat(uth): add jackpot pay table + settleSeat flop settlement (client)"
```
(The Lambda repo `LAM` is committed separately in Task 7 per its own workflow.)

---

### Task 3: State machine — wire the jackpot through deal/settle/reset

**Files:**
- Modify: `LAM/logic.mjs` (`newSeat`, `placeBets`, `maybeDeal`, `showdown`, `resetRound`)
- Test: `LAM/logic.test.mjs`
- Mirror: `SRC/js/core/logic.js` → `cp` to `PUB/js/core/logic.js`
- Modify (client only): `SRC/js/state/local-table.js` → `cp` to `PUB/...`

**Interfaces:**
- Consumes: `settleSeat(…, flop)` from Task 2.
- Produces: `seat.bets.jackpot` (0 or 1) is now part of the persisted seat shape; `placeBets` accepts `bets.jackpot`; `showdown` passes `community5.slice(0,3)` to `settleSeat`; `seat.result` carries `jackpot` + `jackpotCat`.

- [ ] **Step 1: Write a failing state-machine test in `LAM/logic.test.mjs`**

Add a test that drives a full deal→showdown with a jackpot bet and asserts the stack reflects the $1 and the result carries the jackpot. Use the file's existing harness (inspect the top of `logic.test.mjs` for its `deal`/`rng` helpers and follow the same style). The assertion that must hold regardless of harness details:

```js
test("jackpot: $1 is deducted at deal and settled at showdown", () => {
  // Build a betting table, place bets WITH jackpot:1, force a deal with a
  // deterministic rng, run to showdown, and assert:
  //   - the seat was charged an extra 1 chip at deal (stack lower by ante*2 + 1)
  //   - seat.result.jackpot is present (a number), and net includes it
  // (Mirror the existing showdown test's setup; add jackpot:1 to placeBets.)
});
```

If `logic.test.mjs` has no existing showdown/settlement test to mirror, SKIP this step — the engine-level tests in Task 2 already cover jackpot settlement, and `logic.mjs` only threads the value through. Note that decision in the commit message.

- [ ] **Step 2: Run to confirm the new test fails (if added)**

Run:
```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/uth && node --test logic.test.mjs
```
Expected: FAIL on the new assertion (jackpot not yet threaded). Skip if Step 1 was skipped.

- [ ] **Step 3: Edit `LAM/logic.mjs` — five wiring changes**

**(a)** `newSeat` — add `jackpot: 0` to `bets`:
```js
    bets: { ante: 0, blind: 0, trips: 0, holeCard: 0, badBeat: 0, jackpot: 0 },
```

**(b)** `placeBets` — read/validate/total/store the flat jackpot. Replace the bet-reading and store lines:
```js
  const ante = bets.ante;
  const trips = bets.trips || 0;
  const holeCard = bets.holeCard || 0;
  const badBeat = bets.badBeat || 0;
  const jackpot = bets.jackpot ? 1 : 0;
```
```js
  const total = ante * 2 + trips + holeCard + badBeat + jackpot;
  if (total > seat.stack) throw new UthError("insufficient-stack");

  seat.bets = { ante, blind: ante, trips, holeCard, badBeat, jackpot };
```

**(c)** `maybeDeal` — include jackpot in the stack deduction:
```js
    const { ante, blind, trips, holeCard, badBeat, jackpot = 0 } = seat.bets;
    seat.stack -= ante + blind + trips + holeCard + badBeat + jackpot;
```

**(d)** `showdown` — pass the flop and include jackpot in `staked`:
```js
    const result = settleSeat(seat, playerEval, dealerEval, hole, dealerHole, community5.slice(0, 3));
    const { ante, blind, trips, holeCard, badBeat, jackpot = 0 } = seat.bets;
    const staked = ante + blind + trips + holeCard + badBeat + jackpot + seat.playBet;
```
(`seat.result = { ...result, hand: … }` already spreads `jackpot` + `jackpotCat` through — no change there.)

**(e)** `resetRound` — reset jackpot:
```js
    seat.bets = { ante: 0, blind: 0, trips: 0, holeCard: 0, badBeat: 0, jackpot: 0 };
```

- [ ] **Step 4: Run all Lambda tests**

Run:
```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/uth && node --test
```
Expected: PASS — `engine.test.mjs` + `logic.test.mjs` all green.

- [ ] **Step 5: Mirror the same body edits to client `logic.js` + wire `local-table.js`**

Apply the identical five edits to `SRC/js/core/logic.js`. Then edit `SRC/js/state/local-table.js` — the `place-bets` case constructs the bets object explicitly, so add jackpot:

```js
      const out = placeBets(table, LOCAL_UID, {
        ante: payload.ante,
        trips: payload.trips || 0,
        holeCard: payload.holeCard || 0,
        badBeat: payload.badBeat || 0,
        jackpot: payload.jackpot ? 1 : 0,
      }, now);
```

Copy both to public:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/core/logic.js       public/games/casino-game/ultimate-texas-holdem/js/core/logic.js
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/state/local-table.js public/games/casino-game/ultimate-texas-holdem/js/state/local-table.js
```

- [ ] **Step 6: Verify sync**

Run:
```bash
cd /Users/hillmanchan/Desktop
diff <(tail -n +11 system-architecture/lambda/uth/logic.mjs) <(tail -n +11 HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/core/logic.js) | grep -v "engine.mjs\|engine.js\|SYNC\|re-copy\|Lambda\|byte-identical\|solo mode\|^---\|^[0-9]" || echo "logic bodies differ only in header (OK)"
diff HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/core/logic.js HillmanChan_portfolio/portfolio/public/games/casino-game/ultimate-texas-holdem/js/core/logic.js
```
Expected: the second diff shows **nothing**. (The first is a loose check — `logic.mjs`/`logic.js` differ in the multi-line header + the `engine.mjs`→`engine.js` import; confirm no *logic* lines differ.)

- [ ] **Step 7: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/core/logic.js portfolio/public/games/casino-game/ultimate-texas-holdem/js/core/logic.js portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/state/local-table.js portfolio/public/games/casino-game/ultimate-texas-holdem/js/state/local-table.js
git commit -m "feat(uth): thread jackpot bet through deal/showdown/reset (client + local)"
```

---

### Task 4: Client betting UI — the $1 jackpot toggle spot

**Files:**
- Modify: `SRC/js/ui/table-main.js` (`zeroBets`, `raiseAffordability`, `addBet` total, READY total, `renderBoard`, `renderSeats`, click cases, `toggleJackpot`) → `cp` to `PUB`
- Modify: `SRC/css/uth.css` (`.uth-jackpot-spot`) → `cp` to `PUB`

**Interfaces:**
- Consumes: `info.pending.jackpot` (0/1), `seat.bets.jackpot`, `seat.result.jackpot` from Tasks 2–3.
- Produces: a gold JACKPOT circle in the sides row that toggles `$1`/`—`; the READY total, affordability, and showdown delta all account for the $1.

- [ ] **Step 1: Add `jackpot` to `zeroBets`**

```js
const zeroBets = () => ({ ante: 0, trips: 0, holeCard: 0, badBeat: 0, jackpot: 0 });
```

- [ ] **Step 2: Include the $1 in affordability + totals**

In `raiseAffordability`:
```js
  const remaining = seat.stack - (p.ante * 2 + p.trips + p.holeCard + p.badBeat + p.jackpot);
```
In `addBet`, the stack-check total:
```js
  const total = p.ante * 2 + p.trips + p.holeCard + p.badBeat + p.jackpot;
```
In `renderDock`, the READY/DEAL button total (currently `p.ante * 2 + p.trips + p.holeCard + p.badBeat`):
```js
          <button class="uth-btn uth-btn-primary" data-action="ready" ${readyOk ? "" : "disabled"}>${info.local ? "DEAL" : "READY"}${p.ante ? ` · ${fmt(p.ante * 2 + p.trips + p.holeCard + p.badBeat + p.jackpot)}` : ""}</button>
```

- [ ] **Step 3: Add the `toggleJackpot` function**

Place it next to `addBet`/`removeBet`:
```js
// The jackpot is a flat $1 bonus — a plain on/off toggle, not chip-scaled.
function toggleJackpot() {
  const info = activeInfo();
  const seat = viewSeat(info);
  if (!info || !seat) return;
  const p = { ...info.pending };
  if (p.jackpot) {
    p.jackpot = 0;
  } else {
    if (p.ante * 2 + p.trips + p.holeCard + p.badBeat + 1 > seat.stack) {
      showToast("Not enough chips for the $1 jackpot.");
      return;
    }
    p.jackpot = 1;
  }
  info.pending = p;
  render();
}
```

- [ ] **Step 4: Render the jackpot circle in `renderBoard`**

Inside `renderBoard`, after the `sides` line and before the `return`, build the jackpot circle (it uses `seat.result` via the existing `results` local, which now carries `jackpot`):
```js
  // Jackpot: flat $1, gold, distinct from the chip-scaled side bets.
  const jp = editing ? info.pending.jackpot : seat.bets.jackpot || 0;
  let jpCls = "uth-bet-circle uth-jackpot-spot" + (jp ? " has-bet" : "") + (editing ? " editable" : " locked");
  let jpDelta = "";
  if (results) {
    const d = results.jackpot || 0;
    const cat = d > 0 ? "pos" : jp ? "neg" : "";
    if (cat) jpCls += ` res-${cat}`;
    if (jp || d > 0) jpDelta = `<span class="uth-bet-delta ${cat}">${d > 0 ? "+" + fmt(d) : "−1"}</span>`;
  }
  const jackpotCircle = `
    <button class="${jpCls}" ${editing ? 'data-action="toggle-jackpot"' : 'tabindex="-1"'}>
      <span class="uth-bet-label">JACKPOT</span>
      <span class="uth-bet-amount">${jp ? "$1" : "—"}</span>
      ${jpDelta}
    </button>`;
```
Append it into the sides row of the returned board:
```js
      <div class="uth-bet-row uth-bet-row-sides">${sides}${jackpotCircle}</div>
```

- [ ] **Step 5: Show jackpot on other players' seat pills (`renderSeats`)**

Include the $1 in the SIDE sum + tooltip so the table sees it:
```js
      const sides = s.bets.trips + s.bets.holeCard + s.bets.badBeat + (s.bets.jackpot || 0);
```
```js
      const betTitle = `Ante ${s.bets.ante} · Blind ${s.bets.blind} · Play ${s.playBet || 0} · Trips ${s.bets.trips} · Hole Card ${s.bets.holeCard} · Bad Beat ${s.bets.badBeat} · Jackpot ${s.bets.jackpot || 0 ? "$1" : "—"}`;
```

- [ ] **Step 6: Wire the click case**

In the `click` handler `switch`, add:
```js
      case "toggle-jackpot":
        toggleJackpot();
        break;
```

- [ ] **Step 7: Add the CSS**

Append to `SRC/css/uth.css` (after the `.uth-bet-circle.res-*` rules, ~line 665):
```css
/* Jackpot spot — always gold, a flat $1 toggle (not chip-scaled) */
.uth-jackpot-spot {
    border-color: var(--accent-gold);
    background: radial-gradient(circle at 50% 28%, rgba(212, 175, 55, 0.20), rgba(212, 175, 55, 0.04));
}
.uth-jackpot-spot .uth-bet-label { color: var(--accent-gold); }
.uth-jackpot-spot.has-bet {
    border-style: solid;
    box-shadow: var(--glow-gold);
}
```

- [ ] **Step 8: Sync + manual verify in the browser**

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
cp src/game/casino-game/calculator/ultimate-texas-holdem/css/uth.css          public/games/casino-game/ultimate-texas-holdem/css/uth.css
python3 -m http.server 8099 --directory public >/dev/null 2>&1 &
```
Open `http://localhost:8099/games/casino-game/ultimate-texas-holdem/table.html?code=SOLO`. Verify:
1. A gold **JACKPOT** spot shows in the sides row, reading `—`.
2. Clicking it toggles to `$1`; the READY/DEAL total rises by 1; clicking again clears it.
3. Place an ante + jackpot, DEAL. Your stack drops by `ante*2 + 1`.
4. Play the hand to showdown. On a non-flush flop, the jackpot spot shows `−1` in red. (Win amounts are covered by the Task 2 unit tests — a flush on the flop is ~1 in 500, too rare to reliably see by hand.)
5. No console errors (open DevTools).

- [ ] **Step 9: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js portfolio/public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/css/uth.css portfolio/public/games/casino-game/ultimate-texas-holdem/css/uth.css
git commit -m "feat(uth): add $1 jackpot toggle spot on the bet board"
```

---

### Task 5: MEGA jackpot celebration (Royal Flush)

**Files:**
- Modify: `SRC/table.html` (add `#megaOverlay`) → `cp` to `PUB`
- Modify: `SRC/js/ui/table-main.js` (imports, `el` refs, `showMega`/`hideMega`/`maybeMega`, `stepReveal` hook, click case) → `cp` to `PUB`
- Modify: `SRC/css/uth.css` (`.uth-mega*`) → `cp` to `PUB`

**Interfaces:**
- Consumes: `seat.result.jackpotCat`, `JACKPOT_PAYS`, `JACKPOT_MEGA_CAT` from Task 2.
- Produces: a full-screen celebration that fires once per hand when the local seat's result is a Royal-Flush jackpot, dismissed by a COLLECT button.

- [ ] **Step 1: Add the overlay element to `SRC/table.html`**

Insert directly after the existing `<div class="uth-overlay" id="overlay" …>…</div>` block (before `</div>` closing `.uth-table-page`):
```html
        <div class="uth-mega" id="megaOverlay" hidden>
            <div class="uth-mega-rays"></div>
            <div class="uth-mega-confetti" id="megaConfetti"></div>
            <div class="uth-mega-card">
                <div class="uth-mega-kicker">MEGA JACKPOT</div>
                <div class="uth-mega-title">ROYAL FLUSH</div>
                <div class="uth-mega-cards" id="megaCards"></div>
                <div class="uth-mega-amount" id="megaAmount">0</div>
                <button class="uth-btn uth-btn-primary uth-mega-collect" data-action="mega-collect">COLLECT</button>
            </div>
        </div>
```

- [ ] **Step 2: Import the constants + add element refs in `table-main.js`**

Extend the engine import:
```js
import { cardLabel, cardSuit, evaluate5, evaluate7, JACKPOT_PAYS, JACKPOT_MEGA_CAT } from "../core/engine.js";
```
Add to the `el` object:
```js
  megaOverlay: $("megaOverlay"),
  megaCards: $("megaCards"),
  megaAmount: $("megaAmount"),
  megaConfetti: $("megaConfetti"),
```

- [ ] **Step 3: Add `showMega` / `hideMega` / `maybeMega`**

Place near `showOverlay`/`hideOverlay`:
```js
function showMega(cards, amount) {
  el.megaCards.innerHTML = cards.map((c) => cardHtml(c)).join("");
  el.megaConfetti.innerHTML = Array.from({ length: 64 }, () => {
    const left = Math.floor(Math.random() * 100);
    const delay = (Math.random() * 2.4).toFixed(2);
    const dur = (2.6 + Math.random() * 1.8).toFixed(2);
    const light = 52 + Math.floor(Math.random() * 24);
    return `<i style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;background:hsl(46 90% ${light}%)"></i>`;
  }).join("");
  el.megaOverlay.hidden = false;
  const start = performance.now();
  const DUR = 1600;
  const tick = (t) => {
    const p = Math.min(1, (t - start) / DUR);
    const eased = 1 - Math.pow(1 - p, 3);
    el.megaAmount.textContent = fmt(Math.floor(eased * amount));
    if (p < 1) requestAnimationFrame(tick);
    else el.megaAmount.textContent = fmt(amount);
  };
  requestAnimationFrame(tick);
}

function hideMega() {
  el.megaOverlay.hidden = true;
  el.megaConfetti.innerHTML = "";
}

// Fire the full-screen celebration once when MY seat lands the MEGA (Royal) jackpot.
function maybeMega(info) {
  const seat = seatOf(info);
  const r = seat?.result;
  if (!r || r.jackpotCat !== JACKPOT_MEGA_CAT) return;
  if (info.megaShownRound === info.table.roundNo) return;
  info.megaShownRound = info.table.roundNo;
  const hole = info.myCards?.holeCards || seat.holeCards || [];
  const flop = (info.table.community || []).slice(0, 3);
  showMega([...hole, ...flop], JACKPOT_PAYS[JACKPOT_MEGA_CAT]);
}
```

- [ ] **Step 4: Trigger it when results reveal**

In `stepReveal`, the `resultsJustShown` branch currently only scrolls. Add the mega check:
```js
  if (code === activeCode) {
    render();
    if (resultsJustShown) {
      el.boardZone.scrollIntoView({ behavior: "smooth", block: "nearest" });
      maybeMega(info);
    }
  }
```

- [ ] **Step 5: Add the COLLECT click case**

In the `click` handler `switch`:
```js
      case "mega-collect":
        hideMega();
        break;
```

- [ ] **Step 6: Add the celebration CSS**

Append to `SRC/css/uth.css`:
```css
/* ── MEGA jackpot celebration (Royal Flush) ─────────────────────────────── */
.uth-mega {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 50% 40%, rgba(48, 36, 4, 0.9), rgba(0, 0, 0, 0.95));
    overflow: hidden;
}
.uth-mega[hidden] { display: none; }
.uth-mega-rays {
    position: absolute;
    width: 220vmax;
    height: 220vmax;
    background: repeating-conic-gradient(from 0deg, rgba(212, 175, 55, 0.13) 0deg 6deg, transparent 6deg 12deg);
    animation: uth-mega-spin 20s linear infinite;
}
@keyframes uth-mega-spin { to { transform: rotate(360deg); } }
.uth-mega-card {
    position: relative;
    text-align: center;
    padding: 2rem 1.5rem;
    animation: uth-mega-in 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.35);
}
@keyframes uth-mega-in {
    from { transform: scale(0.55); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
.uth-mega-kicker {
    font-family: var(--font-display);
    letter-spacing: 0.32em;
    font-size: 0.95rem;
    color: var(--accent-gold);
    text-shadow: var(--glow-gold);
}
.uth-mega-title {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(2rem, 9vw, 4.5rem);
    line-height: 1.05;
    margin: 0.15em 0 0.1em;
    background: linear-gradient(180deg, #fff7d6, var(--accent-gold) 58%, #a8791b);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
.uth-mega-cards {
    display: flex;
    gap: 0.4rem;
    justify-content: center;
    margin: 1rem 0;
    flex-wrap: wrap;
}
.uth-mega-cards .uth-card { animation: uth-card-flip 0.5s backwards; }
.uth-mega-amount {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: clamp(2.4rem, 12vw, 5.5rem);
    color: #fff;
    text-shadow: 0 0 26px rgba(212, 175, 55, 0.9);
}
.uth-mega-amount::before { content: "+"; opacity: 0.7; }
.uth-mega-collect {
    margin-top: 1.2rem;
    font-size: 1.05rem;
    padding: 0.8em 2.6em;
}
.uth-mega-confetti { position: absolute; inset: 0; pointer-events: none; }
.uth-mega-confetti i {
    position: absolute;
    top: -6vh;
    width: 9px;
    height: 14px;
    border-radius: 2px;
    animation: uth-confetti-fall linear infinite;
}
@keyframes uth-confetti-fall {
    to { transform: translateY(116vh) rotate(720deg); }
}
@media (prefers-reduced-motion: reduce) {
    .uth-mega-rays,
    .uth-mega-confetti i,
    .uth-mega-card { animation: none; }
}
```

- [ ] **Step 7: Sync + verify with a temporary demo hook**

A real Royal on the flop is ~1 in 650,000, so verify the UI with a temporary, removable hook. Add this ONE line at the end of `boot()` in `SRC/js/ui/table-main.js`:
```js
  if (urlParams.get("megademo") === "1") setTimeout(() => showMega([12, 11, 10, 9, 8], JACKPOT_PAYS[JACKPOT_MEGA_CAT]), 500);
```
Sync + serve:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/table.html          public/games/casino-game/ultimate-texas-holdem/table.html
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js  public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
cp src/game/casino-game/calculator/ultimate-texas-holdem/css/uth.css          public/games/casino-game/ultimate-texas-holdem/css/uth.css
```
Open `http://localhost:8099/games/casino-game/ultimate-texas-holdem/table.html?code=SOLO&megademo=1`. Verify: gold rays spin, confetti falls, "MEGA JACKPOT / ROYAL FLUSH" shows the 5 royal-spade cards, the amount counts up to `+400,000`, and **COLLECT** dismisses it cleanly. No console errors.

- [ ] **Step 8: Remove the demo hook, re-sync**

Delete the `megademo` line from `SRC/js/ui/table-main.js`, then:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
grep -rn "megademo" src/game/casino-game/calculator/ultimate-texas-holdem public/games/casino-game/ultimate-texas-holdem
```
Expected: `grep` prints **nothing**.

- [ ] **Step 9: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/table.html portfolio/public/games/casino-game/ultimate-texas-holdem/table.html portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js portfolio/public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/css/uth.css portfolio/public/games/casino-game/ultimate-texas-holdem/css/uth.css
git commit -m "feat(uth): full-screen MEGA jackpot celebration on a Royal Flush"
```

---

### Task 6: INFO panel + odds page pay tables

**Files:**
- Modify: `SRC/js/ui/strategy-panel.js` (`infoPanelHtml` + `jackpotTableHtml`, import `JACKPOT_PAYS`) → `cp` to `PUB`
- Modify: `SRC/odds.html` (pay-table card + frequency note) → `cp` to `PUB`

**Interfaces:**
- Consumes: `JACKPOT_PAYS`, `CAT`, `CAT_NAMES` from engine.
- Produces: a JACKPOT section in Settings → INFO and a Jackpot card in `odds.html`, both generated to match the pay table.

- [ ] **Step 1: Import `JACKPOT_PAYS` in `strategy-panel.js`**

```js
import { CAT, CAT_NAMES, BLIND_PAYS, TRIPS_PAYS, BBB_PAYS, JACKPOT_PAYS } from "../core/engine.js";
```

- [ ] **Step 2: Add `jackpotTableHtml` + the INFO section**

Add the helper near `payTableHtml`:
```js
// Jackpot pays flat amounts (not X:1 ratios), generated from the engine table.
function jackpotTableHtml() {
  const money = (n) => n.toLocaleString("en-US");
  const cats = Object.keys(JACKPOT_PAYS).map(Number).sort((a, b) => b - a);
  const rows = cats
    .map((cat) => `<tr><td>${CAT_NAMES[cat]}${cat === CAT.ROYAL ? ' <span class="uth-num">MEGA</span>' : ""}</td><td class="uth-num-cell">${money(JACKPOT_PAYS[cat])}</td></tr>`)
    .join("");
  return `<table class="uth-info-table">${rows}</table>`;
}
```
In `infoPanelHtml`, insert this block after the BAD BEAT BONUS section and before HOUSE EDGE PER BET:
```js
    <section class="uth-settings-block">
      <h3>JACKPOT ($1 flat — your two cards + the flop)</h3>
      ${jackpotTableHtml()}
      <p>Settled the instant the flop lands and <strong>pays even if you fold</strong>.
      Anything below a flush loses the $1. The Royal Flush is the
      <span class="uth-num">400,000</span> MEGA jackpot.</p>
    </section>
```

- [ ] **Step 3: Add the Jackpot card to `SRC/odds.html`**

Inside `<div class="odds-grid">`, after the Bad Beat `<details>` block (before the grid's closing `</div>` near line 184):
```html
            <details class="uth-paytable" open>
                <summary>Jackpot ($1 — your two cards + the flop)</summary>
                <table>
                    <tr><td>Royal Flush (MEGA)</td><td>400,000</td></tr>
                    <tr><td>Straight Flush</td><td>20,000</td></tr>
                    <tr><td>Four of a Kind</td><td>1,500</td></tr>
                    <tr><td>Full House</td><td>500</td></tr>
                    <tr><td>Flush</td><td>50</td></tr>
                </table>
            </details>
```
Then add a frequency note right after the `</div>` that closes `.odds-grid`:
```html
        <p class="odds-fine">Jackpot hit odds (5 cards): flush ≈ 0.197%, full house ≈ 0.144%,
        four of a kind ≈ 0.024%, straight flush ≈ 0.0014%, royal flush ≈ 0.00015%. A flat $1
        bonus — deliberately generous, just for the thrill of the MEGA.</p>
```

- [ ] **Step 4: Sync + verify**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/strategy-panel.js public/games/casino-game/ultimate-texas-holdem/js/ui/strategy-panel.js
cp src/game/casino-game/calculator/ultimate-texas-holdem/odds.html               public/games/casino-game/ultimate-texas-holdem/odds.html
```
In the browser (server still running): open the table, tap **SETTINGS → INFO**, scroll to the new **JACKPOT** section — confirm all five rows + the MEGA tag render. Open `.../odds.html` and confirm the Jackpot card + frequency line. No console errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/strategy-panel.js portfolio/public/games/casino-game/ultimate-texas-holdem/js/ui/strategy-panel.js portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/odds.html portfolio/public/games/casino-game/ultimate-texas-holdem/odds.html
git commit -m "docs(uth): jackpot pay table in Settings INFO + odds page"
```

---

### Task 7: Deploy the Lambda + final verification + PR

**Files:** none (deploy + integration).

**Interfaces:** Consumes all prior tasks.

- [ ] **Step 1: Full Lambda test run**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/uth && node --test
```
Expected: all tests PASS.

- [ ] **Step 2: Confirm which region hosts `cg-uth`**

The client hits `841ze82i0b.execute-api.ap-northeast-1.amazonaws.com` (Tokyo), but the CLAUDE.md deploy snippet says `eu-west-2`. Resolve the truth before deploying:
```bash
aws lambda get-function --function-name cg-uth --region ap-northeast-1 --query 'Configuration.FunctionArn' --output text 2>/dev/null || echo "not in ap-northeast-1"
aws lambda get-function --function-name cg-uth --region eu-west-2 --query 'Configuration.FunctionArn' --output text 2>/dev/null || echo "not in eu-west-2"
```
Use the region that returns an ARN as `REGION` below. (Expected: ap-northeast-1.)

- [ ] **Step 3: Package + deploy**

```bash
cd /Users/hillmanchan/Desktop/system-architecture/lambda/uth
npm install --omit=dev
zip -r /tmp/cg-uth.zip index.mjs engine.mjs logic.mjs package.json node_modules/
aws lambda update-function-code --function-name cg-uth --zip-file "fileb:///tmp/cg-uth.zip" --region <REGION>
```
Expected: JSON response with `"LastUpdateStatus": "InProgress"`/`"Successful"`.

- [ ] **Step 4: Smoke-test online settlement**

In the browser, open a NEW ONLINE TABLE (requires Google sign-in), place an ante + jackpot, and play a hand to showdown. Confirm the $1 is deducted at deal and the jackpot spot resolves (`−1` on a miss) with no errors in the Network tab (`/uth/place-bets`, `/uth/play-action` return 200). Tail logs if needed:
```bash
aws logs tail /aws/lambda/cg-uth --region <REGION> --follow
```

- [ ] **Step 5: Commit the backend repo (its own workflow)**

```bash
cd /Users/hillmanchan/Desktop/system-architecture
git add lambda/uth/engine.mjs lambda/uth/logic.mjs lambda/uth/engine.test.mjs lambda/uth/logic.test.mjs
git commit -m "feat(uth): jackpot side bet — $1 flop bonus, MEGA royal 400k"
```
(Follow the backend repo's own push/PR convention.)

- [ ] **Step 6: Regression pass in solo mode**

Play several solo hands with and without the jackpot toggled: confirm normal UTH play (ante/blind/play/trips/hole-card/bad-beat), reveal pacing, leaderboard, and sit-out/rebuy all still behave. Confirm an old solo table restored from `localStorage` (dealt before this change) still loads and plays (backward-compat via `|| 0`).

- [ ] **Step 7: Open the PR**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git push -u origin feat/uth-jackpot-side-bet
gh pr create --title "feat(uth): $1 Jackpot side bet + MEGA royal celebration; remove redundant topbar info button" --body "$(cat <<'EOF'
## Summary
- Remove the redundant ⓘ info button from the UTH table topbar (Settings → INFO is reachable from the gear).
- Add a flat **$1 Jackpot** side bet settled from the 2 hole cards + the 3 flop cards: Flush 50 · Full House 500 · Quads 1,500 · Straight Flush 20,000 · **Royal Flush 400,000 (MEGA)**.
- Full-screen gold celebration with COLLECT on a Royal Flush.
- Wired through solo (client) **and** online (cg-uth Lambda, redeployed); INFO panel + odds page updated.

## Notes
- Pay table is intentionally player-favorable (fake practice chips) — a fun jackpot, not a balanced edge.
- Jackpot pays even on a fold (fixed at the flop, like the Hole Card bonus).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- §2 remove topbar button → Task 1. ✅
- §3.1 pay table + hit odds → Task 2 (constants/tests), Task 6 (INFO/odds). ✅
- §3.2 engine constants + `settleSeat(flop)` → Task 2. ✅
- §3.3 state-machine wiring (newSeat/placeBets/maybeDeal/showdown/resetRound + local-table) → Task 3. ✅
- §3.4 tests → Task 2 (engine), Task 3 (logic, conditional). ✅
- §3.5 client UI (toggle spot, results delta, MEGA overlay) → Tasks 4 & 5. ✅
- §3.6 INFO + odds surfaces → Task 6. ✅
- §4 file list covered across Tasks 1–6; §5 deploy → Task 7. ✅
- §6 non-goals respected (no progressive pool, no coach change, no straight-flush full-screen). ✅

**Placeholder scan:** One intentional conditional (Task 3 Step 1 test — mirror the existing harness or skip with a noted reason, since engine tests already cover settlement). All code steps show real code. No TBD/TODO.

**Type consistency:** `settleSeat(seat, playerEval, dealerEval, playerHole, dealerHole, flop)` is the single signature used in Task 2 (def + tests) and Task 3 (`showdown` call). `seat.bets.jackpot` (0/1), `r.jackpot` (number), `r.jackpotCat` (`CAT`|null), `info.pending.jackpot`, `JACKPOT_PAYS`/`JACKPOT_MEGA_CAT` are named identically across Tasks 2–6. `zeroBets()` gains `jackpot` (Task 4) matching `placeBets`'s read (Task 3). ✅
