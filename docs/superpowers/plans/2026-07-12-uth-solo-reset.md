# UTH Solo "Reset Game" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a solo UTH player fully reset their table (chips back to 10,000, session stats wiped) via a confirmed flow, surfaced in Settings always and in the dock when the bankroll is stuck in the 50–74 trap zone.

**Architecture:** Solo tables run the pure state machine (`js/core/logic.js`) in-browser via `js/state/local-table.js`, which mirrors the online API (`localCall`). A new `"reset-session"` action rebuilds the table with the existing `newTable(...)`; all UI lives in `js/ui/table-main.js` behind `isLocalCode`/`info.local` guards. `logic.js`, `engine.js` and the `cg-uth` Lambda are NOT modified.

**Tech Stack:** Vanilla ES modules, no build step. Tests: `node --test` (Node 22) — `local-table.js` runs under Node because its `localStorage` access is try/catch-wrapped (verified: `localCall("SOLO","place-bets",{ante:25})` succeeds under plain Node with a `{"type":"module"}` package.json in the UTH dir).

**Spec:** `docs/superpowers/specs/2026-07-12-uth-solo-reset-design.md`

## Global Constraints

- **Path roots:**
  - `SRC = portfolio/src/game/casino-game/calculator/ultimate-texas-holdem`
  - `PUB = portfolio/public/games/casino-game/ultimate-texas-holdem`
- **Client `src` and `public` runtime files are byte-identical.** After editing `SRC/js/state/local-table.js` or `SRC/js/ui/table-main.js`, `cp` to the matching `PUB` path and `diff` to confirm. `SRC/tests/` and `SRC/package.json` are dev-only — do NOT sync them.
- **Do not touch** `js/core/logic.js`, `js/core/engine.js` (SYNC'd with the Lambda), any Lambda code, or any CSS (reuse `.uth-bet-warning.block` and `.uth-btn-fold`).
- **Never push to `main`.** Work stays on branch `feat/uth-jackpot-side-bet`; run `git status` before each commit (parallel sessions may share the tree).
- **Numbers (from `logic.js`, do not re-derive):** `BUY_IN = 10000`, `MIN_ANTE = 25`. Stuck threshold `minAnte * 3 = 75`; rebuy allowed only below `minAnte * 2 = 50`; trap zone = stack 50–74.
- **Guards:** every new surface/handler must be unreachable for online tables (`info.local` / `isLocalCode(activeCode)`).

---

### Task 0: Commit spec + plan

**Files:**
- Create: `docs/superpowers/specs/2026-07-12-uth-solo-reset-design.md` (already written)
- Create: `docs/superpowers/plans/2026-07-12-uth-solo-reset.md` (this file)

- [ ] **Step 1: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git status   # confirm only the two docs are new
git add docs/superpowers/specs/2026-07-12-uth-solo-reset-design.md docs/superpowers/plans/2026-07-12-uth-solo-reset.md
git commit -m "docs(uth): solo reset-game spec + implementation plan"
```

---

### Task 1: `reset-session` action in `local-table.js` (TDD)

**Files:**
- Create: `SRC/package.json` (dev-only, NOT synced)
- Create: `SRC/tests/local-table.test.mjs` (dev-only, NOT synced)
- Modify: `SRC/js/state/local-table.js` (the `localCall` switch, ~line 116–161) → `cp` to `PUB/js/state/local-table.js`

**Interfaces:**
- Consumes: `newTable({ code, host, now })` from `../core/logic.js` (already imported), module-locals `g` (game record), `LOCAL_UID`, `freezeClock(table)`.
- Produces: `localCall(code, "reset-session")` → resolves `{ ok: true, code }`, leaving the stored game pristine (`stack 10000`, `roundNo 1`, `phase "betting"`, zeroed stats/bets, `dealerDoc`/`myCards` null) and notifying watchers. Task 2's `reset-confirm` calls this via `tableCall`.

- [ ] **Step 1: Create the dev-only package.json**

Write `SRC/package.json`:

```json
{
  "//": "dev-only — lets `node --test tests/` import the browser ES modules. Not synced to public/.",
  "type": "module"
}
```

- [ ] **Step 2: Write the failing test**

Write `SRC/tests/local-table.test.mjs`:

```js
// tests/local-table.test.mjs — the solo "reset-session" action.
// local-table.js runs under plain Node: its localStorage access is
// try/catch-wrapped, so persistence is simply skipped here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { localCall, watchLocalTable, LOCAL_UID } from "../js/state/local-table.js";

const flush = () => new Promise((r) => setTimeout(r, 0));

test("reset-session rebuilds a pristine table after a deal", async () => {
  const seen = { table: null, myCards: null };
  const un = watchLocalTable("SOLO", {
    onTable: (t) => (seen.table = t),
    onMyCards: (d) => (seen.myCards = d),
  });

  await localCall("SOLO", "place-bets", { ante: 100, trips: 25 });
  await flush();
  assert.equal(seen.table.phase, "preflop");
  assert.equal(seen.myCards?.holeCards?.length, 2);
  const before = seen.table.seats.find((s) => s.uid === LOCAL_UID);
  assert.ok(before.stack < 10000);

  await localCall("SOLO", "reset-session");
  await flush();
  const t = seen.table;
  const seat = t.seats.find((s) => s.uid === LOCAL_UID);
  assert.equal(t.phase, "betting");
  assert.equal(t.roundNo, 1);
  assert.deepEqual(t.community, []);
  assert.equal(t.dealer.holeCards, null);
  assert.equal(t.actionDeadline, null);
  assert.equal(seat.stack, 10000);
  assert.equal(seat.sessionNet, 0);
  assert.equal(seat.handsWon, 0);
  assert.equal(seat.handsPlayed, 0);
  assert.deepEqual(seat.bets, { ante: 0, blind: 0, trips: 0, holeCard: 0, badBeat: 0, jackpot: 0 });
  assert.equal(seen.myCards, null);
  un();
});

test("reset-session on an online code rejects with bad-code", async () => {
  await assert.rejects(localCall("8K3F", "reset-session"), (e) => e.code === "bad-code");
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/ultimate-texas-holdem
node --test tests/
```

Expected: test 1 FAILS (rejects with `bad-move` — the switch's `default`), test 2 passes (existing `ensureGame` guard).

- [ ] **Step 4: Implement `reset-session`**

In `SRC/js/state/local-table.js`, add a case before `default:` in the `localCall` switch:

```js
    case "reset-session": {
      // Full wipe — chips, stats and deal — as if this SOLO code were opened fresh.
      const fresh = newTable({
        code,
        host: { uid: LOCAL_UID, name: "You", photoURL: null },
        now,
      });
      g.table = fresh.table;
      g.dealerDoc = null;
      g.myCards = null;
      break;
    }
```

And retarget the trailing freeze (the case above replaces the object the
top-of-function destructure captured) — change:

```js
  freezeClock(table);
```

to:

```js
  freezeClock(g.table);
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/ultimate-texas-holdem
node --test tests/
```

Expected: 2 pass, 0 fail.

- [ ] **Step 6: Sync to public and verify**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/state/local-table.js public/games/casino-game/ultimate-texas-holdem/js/state/local-table.js
diff src/game/casino-game/calculator/ultimate-texas-holdem/js/state/local-table.js public/games/casino-game/ultimate-texas-holdem/js/state/local-table.js && echo SYNCED
```

Expected: `SYNCED`.

- [ ] **Step 7: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git status
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/package.json \
        portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/tests/local-table.test.mjs \
        portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/state/local-table.js \
        portfolio/public/games/casino-game/ultimate-texas-holdem/js/state/local-table.js
git commit -m "feat(uth): solo reset-session action in local-table.js (node --test coverage)"
```

---

### Task 2: Confirmation flow + Settings entry in `table-main.js`

**Files:**
- Modify: `SRC/js/ui/table-main.js` — `settingsOverlayHtml` (~line 973) and the click-handler switch (insert after `case "reveal-confirm"`, ~line 1304) → `cp` to `PUB/js/ui/table-main.js`

**Interfaces:**
- Consumes: `localCall`-backed `tableCall(activeCode, "reset-session")` from Task 1; existing helpers `showOverlay`, `hideOverlay`, `zeroBets`, `fmt`, `isLocalCode`, `settingsPanelHtml`, `GEAR_SVG`; per-table memos `info.pending`, `info.domHoleRound`, `info.megaShownRound`.
- Produces: `data-action="reset-ask"` (opens confirm overlay; used again by Task 3's dock buttons) and `data-action="reset-confirm"` (executes the reset).

- [ ] **Step 1: Add the solo-only reset button to the Settings overlay**

Replace `settingsOverlayHtml` with:

```js
function settingsOverlayHtml(tab = "coach") {
  return `
    <h2>${GEAR_SVG} Settings</h2>
    <div class="uth-guide">${settingsPanelHtml(coachOn, tab)}</div>
    ${isLocalCode(activeCode) ? `<button class="uth-btn uth-btn-fold" data-action="reset-ask">RESET SOLO GAME</button>` : ""}
    <button class="uth-btn uth-btn-primary" data-action="close-overlay">GOT IT</button>`;
}
```

- [ ] **Step 2: Add the `reset-ask` / `reset-confirm` click cases**

In the `document.addEventListener("click", …)` switch, directly after the closing `}` of `case "reveal-confirm": { … }`, insert:

```js
      case "reset-ask":
        if (!info?.local) break;
        showOverlay(`
          <h2>Reset this solo game?</h2>
          <p class="uth-muted">Your chips go back to ${fmt(info.table?.buyIn ?? 10000)} and your
          session stats are cleared. This can't be undone.</p>
          <div class="uth-actions">
            <button class="uth-btn uth-btn-fold" data-action="reset-confirm">RESET GAME</button>
            <button class="uth-btn uth-btn-ghost" data-action="close-overlay">CANCEL</button>
          </div>`);
        break;
      case "reset-confirm": {
        hideOverlay();
        if (!info || !isLocalCode(activeCode)) break;
        // stale UI memos from the old session must not leak into the new one
        info.pending = zeroBets();
        info.domHoleRound = null;
        info.megaShownRound = null;
        await tableCall(activeCode, "reset-session");
        break;
      }
```

(No optimistic patch and no manual `render()`: `localCall` resolves synchronously
and `notify` → `onTable` repaints; `syncReveal` sees `phase === "betting"` and
clears `info.shown` + any pending reveal timer.)

- [ ] **Step 3: Sync to public and verify**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
diff src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js && echo SYNCED
```

Expected: `SYNCED`.

- [ ] **Step 4: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git status
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js \
        portfolio/public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
git commit -m "feat(uth): solo reset confirm flow + Settings entry"
```

---

### Task 3: Dock trap-zone surfaces in `renderDock`

**Files:**
- Modify: `SRC/js/ui/table-main.js` — `renderDock` sitting-out branch (~line 799) and the betting not-ready branch (~line 855) → `cp` to `PUB/js/ui/table-main.js`

**Interfaces:**
- Consumes: `data-action="reset-ask"` from Task 2; `info.local`, `info.table.minAnte` (25), `info.table.buyIn` (10000), `fmt`.
- Produces: nothing new (UI only).

- [ ] **Step 1: Sitting-out branch — RESET instead of a dead-end SIT IN**

Replace the sitting-out block at the top of `renderDock` with:

```js
  // sitting out (only meaningful surface during betting)
  if (seat.sittingOut && phase === "betting") {
    const broke = seat.stack < info.table.minAnte * 2;
    const stuck = info.local && !broke && seat.stack < info.table.minAnte * 3;
    el.dockContent.innerHTML = `
      <p class="uth-muted">You're sitting out.</p>
      ${stuck ? `<p class="uth-bet-warning block">Only ${fmt(seat.stack)} chips left — a hand needs at least ${fmt(info.table.minAnte * 3)} (Ante + Blind + 1x Play). Reset to start fresh with ${fmt(info.table.buyIn)}.</p>` : ""}
      <div class="uth-actions">
        ${broke
          ? `<button class="uth-btn uth-btn-primary" data-action="rebuy">REBUY ${fmt(info.table.buyIn)}</button>`
          : stuck
            ? `<button class="uth-btn uth-btn-fold" data-action="reset-ask">RESET GAME</button>`
            : `<button class="uth-btn uth-btn-primary" data-action="sit-in">SIT IN</button>`}
      </div>`;
    return;
  }
```

(`broke` keeps REBUY — the cheaper recovery, preserving session stats. Online
tables never see `stuck`.)

- [ ] **Step 2: Betting branch — stuck notice replaces the unusable chip rack**

In `renderDock`'s `if (phase === "betting")`, the not-ready `else` currently
starts with `const chips = CHIPS.map(…)`. Wrap its whole body in a stuck check
so it becomes:

```js
    } else {
      const stuck = info.local && seat.stack < info.table.minAnte * 3;
      if (stuck) {
        parts.push(`<p class="uth-bet-warning block">Only ${fmt(seat.stack)} chips left — a hand needs at least ${fmt(info.table.minAnte * 3)} (Ante + Blind + 1x Play). Reset to start fresh with ${fmt(info.table.buyIn)}.</p>`);
        parts.push(`
        <div class="uth-actions">
          <button class="uth-btn uth-btn-fold" data-action="reset-ask">RESET GAME</button>
        </div>`);
      } else {
        const chips = CHIPS.map(
          (v) => `
            <button class="uth-chip uth-chip-${v}${selChip === v ? " selected" : ""}"
                    data-action="chip" data-chip="${v}">${v >= 1000 ? "1K" : v}</button>`
        ).join("");
        parts.push(`<div class="uth-chip-rack">${chips}</div>`);
        parts.push(`<div class="uth-bet-note uth-muted">Click a spot to add the selected chip · hold or right-click to remove</div>`);
        const p = info.pending;
        const afford = raiseAffordability(seat, p);
        if (p.ante > 0) {
          if (!afford.can1x) {
            parts.push(`<p class="uth-bet-warning block">Not enough chips left for the required 1x Play bet (${fmt(p.ante)}) — lower your Ante or side bets.</p>`);
          } else if (!afford.can3x) {
            parts.push(`<p class="uth-bet-warning">Heads up: after these bets you can't afford a 3x or 4x raise — only check, 2x or 1x.</p>`);
          } else if (!afford.can4x) {
            parts.push(`<p class="uth-bet-warning">Heads up: you can afford a 3x raise, but not 4x.</p>`);
          }
        }
        const readyOk = p.ante >= info.table.minAnte && afford.can1x;
        parts.push(`
          <div class="uth-actions">
            <button class="uth-btn uth-btn-ghost" data-action="clear-bets">CLEAR</button>
            <button class="uth-btn uth-btn-primary" data-action="ready" ${readyOk ? "" : "disabled"}>${info.local ? "DEAL" : "READY"}${p.ante ? ` · ${fmt(p.ante * 2 + p.trips + p.holeCard + p.badBeat + p.jackpot)}` : ""}</button>
            <button class="uth-btn uth-btn-ghost" data-action="sit-out">SIT OUT</button>
          </div>`);
      }
    }
```

(The inner code is the existing block verbatim, re-indented — no behavior
change on the non-stuck path.)

- [ ] **Step 3: Sync to public and verify**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
cp src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
diff src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js && echo SYNCED
```

Expected: `SYNCED`.

- [ ] **Step 4: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git status
git add portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/js/ui/table-main.js \
        portfolio/public/games/casino-game/ultimate-texas-holdem/js/ui/table-main.js
git commit -m "feat(uth): dock reset surface for the 50-74 chip trap zone"
```

---

### Task 4: Browser verification (user-perspective QA)

**Files:** none (verification only).

- [ ] **Step 1: Serve the game locally**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator
python3 -m http.server 8360
```

- [ ] **Step 2: Happy path** — open `http://localhost:8360/ultimate-texas-holdem/table.html?code=SOLO`:
  1. Place Ante 100 + a side bet, DEAL, play the hand to showdown, NEXT HAND (stats now non-zero, stack ≠ 10,000).
  2. Gear → Settings: **RESET SOLO GAME** button visible (red outline) above GOT IT.
  3. Click it → confirm overlay ("Reset this solo game?" / "chips go back to 10,000"). CANCEL closes with no change.
  4. Reopen → **RESET GAME** → dock returns to a fresh betting board, topbar shows "Round 1 · practice chips", stack 10,000, no leaderboard/session line, no console errors.
  5. Reload the page → table still fresh (localStorage persisted the reset).

- [ ] **Step 3: Trap zone (dock surfaces)** — in DevTools console:

```js
const k = "uthSoloTable:SOLO", g = JSON.parse(localStorage.getItem(k));
g.table.seats[0].stack = 60; localStorage.setItem(k, JSON.stringify(g)); location.reload();
```

Expected: red "Only 60 chips left — a hand needs at least 75 (Ante + Blind + 1x Play)…" + **RESET GAME** in the dock; DEAL/chip rack gone. Clicking RESET GAME → confirm → fresh 10,000 table. Repeat with `sittingOut = true` on the seat to check the sitting-out branch (notice + RESET GAME instead of SIT IN); and with `stack = 40, sittingOut = true` to confirm REBUY (not RESET) still shows.

- [ ] **Step 4: Online guard** — open the Settings gear while an online-table tab is active (or temporarily set `activeCode` to a non-SOLO code): no RESET SOLO GAME button. Grep-level check is also acceptable: every new surface is behind `info.local` / `isLocalCode(activeCode)`.

- [ ] **Step 5: Re-run the node tests one last time**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/ultimate-texas-holdem
node --test tests/
```

Expected: 2 pass.

---

## Self-Review (done at plan time)

- Spec coverage: §2.1 → Task 1; §2.2 + §2.4 → Task 2; §2.3 → Task 3; §4 testing → Tasks 1 & 4; §5 sync → per-task sync steps. No gaps.
- `freezeClock(table)` → `freezeClock(g.table)` retarget is load-bearing (the reset case replaces `g.table` after the destructure) — covered by the `actionDeadline === null` assert in the test.
- Names consistent across tasks: `reset-session` (state action), `reset-ask` / `reset-confirm` (UI actions), `.uth-btn-fold` styling, `stuck` threshold `minAnte * 3`.
