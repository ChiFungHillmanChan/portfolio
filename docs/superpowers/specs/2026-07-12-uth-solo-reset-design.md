# Ultimate Texas Hold'em — Solo "Reset Game"

**Date:** 2026-07-12
**Status:** Approved — ready for implementation plan
**Scope:** Solo (client) ONLY. `js/core/logic.js`, `js/core/engine.js` and the
`cg-uth` Lambda are NOT touched — no re-sync, no redeploy.

---

## 1. Problem

A solo table's bankroll can reach a dead end:

- `rebuy` is only allowed when `stack < minAnte * 2` (< 50).
- A hand needs at least `minAnte * 3` = **75** chips (Ante 25 + Blind 25 + the
  mandatory 1x Play reserve — `readyOk` requires `afford.can1x`).
- So a stack in the **50–74 trap zone** can neither rebuy nor deal. The current
  dock shows a disabled DEAL and (only when an ante is pending) the guidance
  "lower your Ante or side bets" — impossible at min ante. The sitting-out
  branch shows SIT IN, which dead-ends into the same trap.

Beyond the trap, players also simply want to wipe a solo session (chips AND
stats) and start over. `rebuy` refills the stack but keeps `sessionNet` /
`handsWon` / `handsPlayed`.

## 2. Solution — a solo-only "Reset Game" action

Full wipe: rebuild the table exactly as if the SOLO code were opened for the
first time — `stack = 10,000`, `roundNo = 1`, `phase = betting`, session stats
zeroed, deal/private state cleared. Surfaced in two places, always guarded by
`isLocalCode(...)`.

### 2.1 New solo action — `js/state/local-table.js`

Add a `"reset-session"` case to `localCall`'s switch. It rebuilds a pristine
table via the existing `newTable(...)` and clears the deal:

```js
case "reset-session": {
  const fresh = newTable({ code, host: { uid: LOCAL_UID, name: "You", photoURL: null }, now });
  g.table = fresh.table;
  g.dealerDoc = null;
  g.myCards = null;
  break;
}
```

The trailing `freezeClock(...)` / `save(code)` / `notify(code)` at the end of
`localCall` persist and repaint it. The trailing freeze must target `g.table`
(the case replaces the object the top-of-function destructure captured).

### 2.2 Confirmation flow — `js/ui/table-main.js`

Mirror the `reveal-ask` → `reveal-confirm` overlay pattern:

- **`reset-ask`** → overlay: heading "Reset this solo game?", body "Your chips
  go back to 10,000 and your session stats are cleared. This can't be undone.",
  buttons **RESET GAME** (`reset-confirm`) / **CANCEL** (`close-overlay`).
- **`reset-confirm`** → `hideOverlay()`, guard `isLocalCode(activeCode)` (can
  never fire on an online table), clear per-table UI memos
  (`pending = zeroBets()`, `domHoleRound`, `megaShownRound`), then
  `tableCall(activeCode, "reset-session")`.

The local watcher then delivers the fresh table: `syncReveal` sees
`phase === "betting"` and resets `info.shown` + cancels any reveal timer;
`onMyCards(null)` clears the hole cards. No other UI plumbing needed.

### 2.3 Dock surface (contextual) — `renderDock`

`stuck = info.local && seat.stack < info.table.minAnte * 3` (< 75, betting
phase only — both dock branches below already only render during betting):

- **Active bet branch** (seat not ready): when stuck, replace the chip rack /
  actions with a red `.uth-bet-warning.block` notice ("Only N chips left — a
  hand needs at least 75…") + a **RESET GAME** button (`reset-ask`). This
  replaces the impossible "lower your Ante" guidance in the 50–74 trap zone.
- **Sitting-out branch:** `broke` (< 50) keeps its REBUY button (rebuy is the
  cheaper recovery and preserves stats). When `!broke && stuck` (the 50–74
  trap where SIT IN dead-ends), show the notice + **RESET GAME** instead of
  SIT IN.

### 2.4 Settings surface (always available) — `settingsOverlayHtml`

Append a **RESET SOLO GAME** button (`reset-ask`, styled `.uth-btn-fold` — the
existing red-outline variant) between the settings panel and GOT IT, rendered
only when `isLocalCode(activeCode)`. This is the stable, always-reachable
entry point via the gear.

## 3. Non-goals / guarantees

- Online tables: no reset anywhere (server `rebuy` already handles broke
  players). Every surface and handler is behind `info.local` /
  `isLocalCode(...)`.
- `logic.js` / `engine.js` / `cg-uth` Lambda: byte-untouched.
- No new CSS (reuses `.uth-bet-warning.block`, `.uth-btn-fold`).

## 4. Testing

- `local-table.js` is Node-runnable (its `localStorage` access is
  try/catch-wrapped), so `reset-session` gets real `node --test` coverage:
  a `tests/` dir + a dev-only `package.json` (`{"type":"module"}`) in the UTH
  source dir, mirroring the bb100 convention. Neither is synced to `public/`.
- UI surfaces verified in the browser (played hand → reset; localStorage stack
  edit → trap-zone dock; online guard).

## 5. Sync

Changed runtime files (`js/state/local-table.js`, `js/ui/table-main.js`) are
copied byte-identical to `portfolio/public/games/casino-game/ultimate-texas-holdem/…`
per the repo's source→public convention.
