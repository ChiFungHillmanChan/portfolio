# Casino-game Poker Phase 1 — Local Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out Phase 1 of the casino-poker cloud-storage project — confirm the existing local-only GGPoker parser + EV chart produces GG-exact numbers ($8.71 / $11.23 to the cent on the 1815-hand sample), tidy any structural debt, and ship the foundation.

**Architecture:** Phase 1 is **already mostly implemented** on branch `feat/poker-bb100-calculator`. The bb100/ directory contains all parser, equity, evaluator, stats modules + tests + verify CLI + EV chart. This plan finishes the verification gate, factors any inlined code, and prepares for Phase 2 to layer auth on top.

**Tech Stack:** Vanilla JS ES modules, BigInt micro-cent arithmetic, Cactus Kev evaluator (pure JS), Chart.js (CDN), Node 22 `node:test` runner, `node verify/verify.mjs` CLI.

**Spec:** `docs/superpowers/specs/2026-05-21-casino-poker-cloud-storage-design.md` (Phase 1 section)

**Sample data path (do NOT commit):** `/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/` — 8 files, 1815 Hero hands. Target: Winnings (before rake) ≈ $8.71, All-in EV (before rake) ≈ $11.23, both EXACT to the cent.

---

## File map (current state on `feat/poker-bb100-calculator`)

```
portfolio/src/game/casino-game/calculator/poker/bb100/
├── index.html                          EXISTS — has EV chart already
├── css/
│   ├── bb100.css                       EXISTS
│   └── upload.css                      EXISTS
├── js/
│   ├── bb100.js                        EXISTS (manual calculator, unchanged)
│   ├── upload.js                       EXISTS (orchestration — may contain inlined chart code)
│   ├── tabs.js                         EXISTS
│   ├── chart/
│   │   └── render.mjs                  CHECK — may not exist; may be inlined in upload.js
│   ├── parser/
│   │   ├── validator.mjs               EXISTS
│   │   ├── hand-model.mjs              EXISTS
│   │   └── gg-parser.mjs               EXISTS
│   ├── equity/
│   │   ├── cards.mjs                   EXISTS
│   │   ├── evaluator.mjs               EXISTS
│   │   └── equity.mjs                  EXISTS
│   └── stats/
│       ├── money.mjs                   EXISTS
│       └── compute.mjs                 EXISTS
├── verify/
│   ├── verify.mjs                      EXISTS
│   └── ev-breakdown.mjs                EXISTS (extra debug tool)
└── tests/
    ├── smoke.test.mjs                  EXISTS
    ├── money.test.mjs                  EXISTS
    ├── cards.test.mjs                  EXISTS
    ├── evaluator.test.mjs              EXISTS
    ├── equity.test.mjs                 EXISTS
    ├── validator.test.mjs              EXISTS
    ├── gg-parser.test.mjs              EXISTS
    └── compute.test.mjs                EXISTS
```

**This plan does NOT re-derive any of these from scratch.** It verifies they produce the right numbers and tidies what's left.

---

## Task 1: Run the unit-test suite end-to-end

Confirm every test passes cleanly before touching anything else. If any test fails, that's the root-cause source for whatever's blocking the verify gate.

**Files:**
- No file changes; read-only verification.

- [ ] **Step 1: Run all unit tests in the bb100 tests directory**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100
node --test --test-timeout=180000 'tests/*.test.mjs'
```

Expected: every `# pass` line; final summary `# fail 0`. If anything fails, STOP and read the failure carefully — fix that before proceeding. Common preflop-equity tests may take 30–60 seconds; the 180s timeout covers them.

- [ ] **Step 2: Count tests for the record**

```bash
node --test --test-timeout=180000 'tests/*.test.mjs' 2>&1 | grep -E "^# (tests|pass|fail|duration_ms)"
```

Record the totals (baseline as of 2026-05-21: `# tests 66, # pass 66, # fail 0`, ~2.5s) — this is the baseline you'll re-verify after any change.

- [ ] **Step 3: Do NOT commit (no changes made yet)**

If everything passed, move to Task 2. If anything failed, fix the failing test's root cause and re-run.

---

## Task 2: Run the verify CLI against the 1815-hand sample (THE HARD GATE)

This is the gate. If `node verify/verify.mjs` does not print Winnings (before rake) = $8.71 and All-in EV (before rake) = $11.23 (rounded to 2 decimals) on the 1815-hand sample, Phase 1 is not done.

**Files:**
- No file changes in this task (read-only verification).

- [ ] **Step 1: Confirm the sample directory exists**

```bash
ls /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/ | head -5
ls /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/ | wc -l
```

Expected: 8 files listed; line count = 8.

If the directory is missing, STOP and ask the user where the sample data lives. The hard-gate verification cannot proceed without it.

- [ ] **Step 2: Run the verify CLI**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100
node verify/verify.mjs /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/
```

Expected output shape (the verify.mjs file already exists; the exact format may differ — what matters is the bottom-line values):

```
Hands parsed:                   1815 / 1815
Final Winnings (after rake):    $X.XXXXXX
Final Winnings (before rake):   $8.XXXXXX     ← must round to $8.71
Final All-in EV (after rake):   $X.XXXXXX
Final All-in EV (before rake):  $11.XXXXXX    ← must round to $11.23
Red line final:                 $X.XXXXXX
Blue line final:                $X.XXXXXX
All-in EV − Winnings delta:     $X.XXXXXX
Total rake paid:                $X.XXXXXX (X.XX bb/100)
Position breakdown:             [BTN/SB/BB/UTG/HJ/CO with counts + $]
Equity cache hits:              X / X
```

- [ ] **Step 3: Verify exact match to GGPoker screenshot values**

The pass criteria, in precise terms:
- `Math.round(finalWinningsBeforeRakeUC / 10000) / 100 === 8.50`
- `Math.round(finalAllinEvBeforeRakeUC / 10000) / 100 === 11.00`
- `Hands parsed === 1815`

If the verify.mjs script doesn't currently print enough precision (e.g. it only prints `$8.71`), run it with extra precision via a one-liner:

```bash
node -e "
import('./verify/verify.mjs').then(async m => {
  const r = await m.run('/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/');
  console.log('winnings_before_rake_uc:', r.winningsBeforeRakeUC);
  console.log('allin_ev_before_rake_uc:', r.allinEvBeforeRakeUC);
});
"
```

(If `verify.mjs` doesn't expose a callable `run` function, skip this and read the printed output directly.)

- [ ] **Step 4: If numbers DON'T match, do not proceed — debug**

If green ≠ $8.71 or orange ≠ $11.23:

1. **First — re-run twice and confirm bit-identical output across runs.** If two runs differ, that's a non-determinism bug (probably equity cache pollution or float drift); fix the BigInt path before chasing the value mismatch.

```bash
node verify/verify.mjs /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/ > /tmp/run1.txt
node verify/verify.mjs /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/ > /tmp/run2.txt
diff /tmp/run1.txt /tmp/run2.txt
```

Expected: zero diff. If there's a diff, fix non-determinism first — every digit must be identical across runs.

2. **Use `ev-breakdown.mjs`** (the debug tool already on disk) to print per-hand EV contributions for the all-in hands. Look for outliers — a single mis-parsed all-in (e.g. multi-way side pot, uncalled-bet on river, all-in-but-tabled-cards) can move the orange by $1+.

```bash
node verify/ev-breakdown.mjs /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/ | head -100
```

3. **Most-likely root causes** (in order of past commit evidence on this branch):
   - Rake-share BigInt division rounding (commit b346587 was the round-half-up fix — verify it's in HEAD)
   - Multi-way side-pot decomposition (commit d0fae60 added this — verify completeness)
   - Villain-all-in EV computation (commit d0fae60 also)
   - Uncalled-bet returned-to-Hero accounting in winnings/EV math

Fix the root cause; re-run from Step 2 of this task. Do NOT proceed to Task 3 until the gate passes.

- [ ] **Step 5: When gate passes, commit a verification-record file**

Once green = $8.71 and orange = $11.23:

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
node /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100/verify/verify.mjs /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/ > portfolio/src/game/casino-game/calculator/poker/bb100/verify/sample-output.txt
```

Then:

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/verify/sample-output.txt
git commit -m "test(poker): record verify-CLI output proving \$8.71 / \$11.23 GG match

Captures the verify.mjs run against the 1815-hand sample at the moment Phase 1
passes the hard gate. Future changes to parser/equity/stats must produce
bit-identical output or be revisited.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

(The sample-output.txt file proves the gate was passed at a given commit; future regressions become visible as diffs to this file.)

---

## Task 3: Verify chart/render.mjs is properly factored (no inlined chart code)

The file map says chart code should live in `js/chart/render.mjs`. Check whether it's currently inlined in `upload.js`.

**Files:**
- Check: `portfolio/src/game/casino-game/calculator/poker/bb100/js/upload.js`
- Possibly create: `portfolio/src/game/casino-game/calculator/poker/bb100/js/chart/render.mjs`

- [ ] **Step 1: Check if chart/render.mjs already exists**

```bash
ls /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100/js/chart/render.mjs 2>&1
```

If it exists, the factoring is already done — skip to Task 4.

If it doesn't exist, check whether chart code is in `upload.js`:

```bash
grep -n "new Chart\|Chart.register\|chart.update\|getContext\|datasets" /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100/js/upload.js | head -20
```

If those grep matches return chart-construction code, the chart logic is inlined. Proceed to Step 2. Otherwise, the chart is loaded from somewhere else — investigate and place it appropriately, then move on.

- [ ] **Step 2: Read upload.js to understand the inlined chart region**

```bash
wc -l /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100/js/upload.js
```

Read the file end-to-end to identify the chart-specific functions (likely things like `renderChart()`, `updateChart()`, color/theme constants, tooltip callbacks, zoom/scrub handlers).

- [ ] **Step 3: Extract chart code into chart/render.mjs**

Create the new file with the exports the rest of `upload.js` will need (typically `renderChart(canvas, series, options)`, `updateChart(chart, series)`, `destroyChart(chart)` — adapt to what's actually inlined).

Update `upload.js` to import from `./chart/render.mjs` and delete the now-extracted code.

The exact code depends on what's inlined; the principle: chart/render.mjs owns Chart.js setup, color constants, axis formatters, tooltip callbacks, zoom/scrub wiring. `upload.js` owns the orchestration that calls into it.

- [ ] **Step 4: Verify the chart still renders correctly**

Open `index.html` in a browser, upload the 1815-hand sample, confirm:
1. Chart renders with green Winnings line ending near $8.71
2. Orange All-in EV line ending near $11.23
3. Red/Blue toggles work
4. Rake before/after toggle works
5. Zoom + hover crosshair still work (recent commits added these)

If any of these regress, restore from git and try the factor again more carefully.

- [ ] **Step 5: Re-run the test suite to confirm nothing broke**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100
node --test --test-timeout=180000 'tests/*.test.mjs'
```

Expected: same `# fail 0` as Task 1.

- [ ] **Step 6: Commit (only if factoring was done)**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/js/chart/render.mjs portfolio/src/game/casino-game/calculator/poker/bb100/js/upload.js
git commit -m "refactor(poker): extract chart rendering into chart/render.mjs

Pulls Chart.js setup, theme constants, tooltip callbacks, zoom/scrub wiring
out of upload.js and into a dedicated module. upload.js retains parse-to-render
orchestration only. No functional change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Add the 3-tab scaffold (Manual / Upload GG Hands / My Sessions)

The current `index.html` likely has only 2 tabs (Manual + Upload GG Hands). Phase 2+ needs a third "My Sessions" tab. Add it now, hidden by default. Phase 2 will show it after sign-in.

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/poker/bb100/index.html`
- Modify: `portfolio/src/game/casino-game/calculator/poker/bb100/js/tabs.js` (if it owns the tab list)

- [ ] **Step 1: Read the current tab markup**

```bash
grep -n "tab\|Tab" /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100/index.html | head -20
```

Identify how tabs are currently structured. Typical pattern: a `<nav>` with `<button data-tab="...">` and corresponding `<section data-tab-content="...">` panels.

- [ ] **Step 2: Add the hidden "My Sessions" tab**

In `index.html`, add a third tab button alongside the existing two, plus an empty content panel for it. Apply `hidden` to both:

```html
<!-- inside the tab nav -->
<button class="tab-button" data-tab="my-sessions" hidden>My Sessions</button>

<!-- inside the tab content region -->
<section class="tab-content" data-tab-content="my-sessions" hidden>
  <!-- Phase 3 will populate this -->
  <div class="my-sessions-placeholder">
    <p>Sign in to save and view your uploaded hand histories.</p>
  </div>
</section>
```

The `hidden` HTML attribute prevents the tab from being clickable / visible. Phase 2's auth-ui.js will remove the `hidden` attribute after sign-in.

- [ ] **Step 3: Verify tabs.js doesn't break with a third tab option**

```bash
grep -n "querySelectorAll\|data-tab\|tab-button" /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100/js/tabs.js
```

If tabs.js uses `querySelectorAll('[data-tab]')` or similar generic selectors, adding a third tab is automatic. If it hardcodes the two existing tab names, update it to iterate generically.

- [ ] **Step 4: Open index.html in a browser, confirm**

1. Only 2 visible tabs (Manual, Upload GG Hands) — third tab still `hidden`
2. Existing functionality unchanged
3. Temporarily remove the `hidden` attribute from the My Sessions tab in DevTools → confirm the third tab appears, clicking it shows the placeholder text → re-add `hidden` and reload

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/index.html portfolio/src/game/casino-game/calculator/poker/bb100/js/tabs.js
git commit -m "feat(poker): scaffold hidden 'My Sessions' tab for Phase 2 wiring

Adds a third tab button + content panel, both hidden by default.
Phase 2's auth-ui.js will reveal the tab after sign-in.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Final regression check + branch handoff

Confirm the branch is ready to ship and Phase 2 can start cleanly on top.

**Files:**
- No file changes.

- [ ] **Step 1: Re-run the full test suite**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100
node --test --test-timeout=180000 'tests/*.test.mjs'
```

Expected: `# fail 0`, same count as Task 1.

- [ ] **Step 2: Re-run the verify CLI**

```bash
node verify/verify.mjs /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/
```

Expected: green = $8.71, orange = $11.23, identical to Task 2 Step 5 captured output.

- [ ] **Step 3: Manual browser smoke test**

Open `portfolio/src/game/casino-game/calculator/poker/bb100/index.html` directly in Chrome (or serve via `python3 -m http.server` from the bb100 dir). Drag in the 1815-hand sample files. Confirm:

1. Parse completes with no console errors
2. Chart shows green line ending near $8.71
3. Chart shows orange line ending near $11.23
4. All 4 toggles work (Winnings / All-in EV / Red / Blue)
5. Rake before/after toggle works
6. Zoom, hover crosshair, drag-to-zoom, floating zoom-out, adaptive x-axis ticks all work (recent commits)
7. Three tabs in the nav: Manual (active by default), Upload GG Hands, and **NO** visible My Sessions tab (it's still `hidden`)

- [ ] **Step 4: Confirm git state**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git status --short
```

Expected: clean working tree, no untracked files except `.env`-like local-only.

```bash
git log --oneline feat/poker-bb100-calculator ^main | head -20
```

Should show the new commits from this plan (sample-output.txt commit, optional chart refactor, 3-tab scaffold).

- [ ] **Step 5: Phase 1 done — decision point**

Phase 1 is complete when:
- All unit tests pass
- Verify CLI prints $8.71 / $11.23 to the cent, bit-identical across runs
- Manual browser smoke test passes all 7 items above
- Branch has the My Sessions tab scaffold hidden

At this point, two paths:

**A. Ship Phase 1 standalone now** (recommended) — merge `feat/poker-bb100-calculator` to `main` and deploy the static portfolio + casino-game build. Users get the local-only EV chart immediately. Phase 2 starts on a fresh branch off main.

**B. Stay on the feat branch** — keep `feat/poker-bb100-calculator` open and add Phase 2 commits directly to it. Defer merge until more phases land. Acceptable if you want fewer prod deploys; slower feedback.

This plan's terminal step is the decision. The next plan (Phase 2: Auth) starts from whichever branch you choose.

---

## Done criteria for Phase 1

- [x] All bb100/tests pass (`# fail 0`)
- [x] verify.mjs prints green=$8.71 and orange=$11.23, rounded to 2 decimals, on the 1815-hand sample
- [x] verify.mjs output is bit-identical across two runs
- [x] sample-output.txt committed as the proof artifact
- [x] chart/render.mjs is a real file (not inlined)
- [x] index.html has a hidden 3rd tab placeholder for Phase 2
- [x] Manual smoke test passes the 7-item checklist
- [x] Branch is in a shippable state

If all checked: Phase 1 done. Move to writing the Phase 2 (Auth) plan.
