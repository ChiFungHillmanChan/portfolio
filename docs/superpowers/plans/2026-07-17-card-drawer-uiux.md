# Card Drawer UI/UX Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three UI/UX changes from spec `docs/superpowers/specs/2026-07-17-card-drawer-uiux-design.md` — readable spares, full-screen card viewer, Pick reveal sequence + take-the-lead celebration.

**Architecture:** Presentation-only. `game.js` gains three transient UI states (`viewerFor`, `reveal`, `leadGlow`), one pure-ish helper (`currentLeaderId`), and two overlay renderers; `styles.css` gains the viewer, reveal, sparkle, and glow styling and softens the spare-card treatment. `hand-eval.js` and all tests untouched.

**Tech Stack:** Vanilla JS ES modules, plain CSS. No build step.

## Global Constraints

- **Work in the worktree** `/Users/hillmanchan/Desktop/HillmanChan_portfolio/.claude/worktrees/card-drawer-uiux` on branch `worktree-card-drawer-uiux`. Paths relative to the worktree root. Never push `main` directly.
- **Only touch** `portfolio/public/games/card-drawer/game.js` and `portfolio/public/games/card-drawer/styles.css`. `hand-eval.js`, tests, `card-svg.js`, `index.html`: unchanged.
- **No emoji anywhere** — all glyphs/effects are hand-drawn inline SVG or CSS.
- **localStorage schema unchanged** (`card-drawer:v1`); every new state lives on the transient `ui` object and is never serialized.
- Touch targets ≥ 44px for interactive controls; `prefers-reduced-motion` must keep working (the existing global media query already collapses animations — add nothing that bypasses it).
- Regression gate for every task: `node --test portfolio/public/games/card-drawer/*.test.js` (66 pass — note the `*.test.js` glob; `node --test <dir>` is broken on this machine) and `node --input-type=module --check < portfolio/public/games/card-drawer/game.js` (no output).
- Merge/deploy (Task 5) only after Task 4 verification; PR merged separately from any other branch.

---

### Task 1: Readable spare cards (`styles.css` only)

**Files:**
- Modify: `portfolio/public/games/card-drawer/styles.css`

**Interfaces:**
- Consumes: existing `.fan .card-wrap.best` / `.spare` classes emitted by `game.js` (unchanged).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Soften the spare treatment**

In the `/* --- player panels --- */` section:

1. Replace `.fan .card-wrap + .card-wrap { margin-left: -36px; }` with:

```css
.fan .card-wrap + .card-wrap { margin-left: -28px; }
```

2. Replace the whole `.fan .card-wrap.spare { ... }` rule with:

```css
.fan .card-wrap.spare {
  opacity: 0.82;
  filter: saturate(0.85) drop-shadow(0 3px 5px rgba(0, 0, 0, 0.35));
}
```

3. Replace `.fan .card-wrap.best + .card-wrap.spare { margin-left: 12px; }` with:

```css
.fan .card-wrap.best + .card-wrap.spare {
  margin-left: 18px;
  position: relative;
}

.fan .card-wrap.best + .card-wrap.spare::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 8%;
  height: 84%;
  width: 1px;
  background: var(--ink-faint);
}
```

4. In the `@media (max-width: 380px)` block: change `.fan .card-wrap + .card-wrap { margin-left: -34px; }` to `margin-left: -26px;` and DELETE the `.fan .card-wrap.spare { width: 46px; }` line entirely.

- [ ] **Step 2: Regression check**

Run: `node --test portfolio/public/games/card-drawer/*.test.js`
Expected: 66 pass, 0 fail.

- [ ] **Step 3: Commit**

```bash
git add portfolio/public/games/card-drawer/styles.css
git commit -m "style(card-drawer): spare cards full-size and readable with group divider"
```

---

### Task 2: Full-screen card viewer (`game.js` + `styles.css`)

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js`
- Modify: `portfolio/public/games/card-drawer/styles.css`

**Interfaces:**
- Consumes: `evaluateHand(...).bestFive`, `cardWrap(card, { flip, group })`, delegated click handling.
- Produces: `ui.viewerFor` transient state; `viewerHTML()`; click actions `view-cards` / `close-viewer`; a document-level Escape chain that Task 3 extends (viewer → sheet, reveal added in front by Task 3).

- [ ] **Step 1: State + fan affordance in `game.js`**

1. Change the `ui` declaration (currently `const ui = { sheetFor: null, justDrawn: null, confirmReset: false, resume: null };`) to:

```js
const ui = { sheetFor: null, justDrawn: null, confirmReset: false, resume: null, viewerFor: null };
```

2. In `playerPanel`, replace the line `<div class="fan">${fan}</div>` and add the attrs const just above the `return`:

```js
  const fanAttrs = player.cards.length
    ? ` data-action="view-cards" data-player="${player.id}" role="button" tabindex="0"` +
      ` aria-label="View ${esc(player.name)}'s cards"`
    : '';
```

and in the template:

```js
      <div class="fan"${fanAttrs}>${fan}</div>
```

3. In `resetGame`, after `ui.sheetFor = null;` add:

```js
  ui.viewerFor = null;
```

- [ ] **Step 2: `viewerHTML()` renderer**

Add after `sheetHTML()`:

```js
function viewerHTML() {
  const player = state.players.find((p) => p.id === ui.viewerFor);
  if (!player || !player.cards.length) return '';
  const hand = evaluateHand(player.cards);
  const bestSet = new Set(hand.bestFive);
  const spares = player.cards
    .filter((card) => !bestSet.has(card))
    .sort((a, b) => (b.rank || 15) - (a.rank || 15));
  return `
    <div class="viewer" role="dialog" aria-modal="true" aria-label="${esc(player.name)}'s cards">
      <div class="viewer-head">
        <div>
          <h2 class="viewer-name">${esc(player.name)}</h2>
          <p class="viewer-sub">${esc(hand.name)} — ${player.cards.length} card${player.cards.length === 1 ? '' : 's'}</p>
        </div>
        <button class="btn btn-quiet btn-icon" data-action="close-viewer" aria-label="Close">${ICONS.cross}</button>
      </div>
      <div class="viewer-body">
        <h3 class="viewer-section">Best hand</h3>
        <div class="viewer-grid viewer-grid-best">${hand.bestFive.map((card) => cardWrap(card)).join('')}</div>
        ${
          spares.length
            ? `<h3 class="viewer-section">Other cards</h3>
        <div class="viewer-grid">${spares.map((card) => cardWrap(card)).join('')}</div>`
            : ''
        }
        <button class="btn btn-block" data-action="close-viewer">Close</button>
      </div>
    </div>
  `;
}
```

- [ ] **Step 3: Wire rendering + events**

1. In `gameScreen()`, add the viewer between the leaderboard and the sheet lines:

```js
    ${leaderboardHTML()}
    ${ui.viewerFor !== null ? viewerHTML() : ''}
    ${ui.sheetFor !== null ? sheetHTML() : ''}
```

2. In the click handler `switch`, add before `case 'undo':`:

```js
    case 'view-cards':
      ui.viewerFor = playerId;
      render();
      break;
    case 'close-viewer':
      ui.viewerFor = null;
      render();
      break;
```

3. Add an `app`-level keydown listener (after the existing `app.addEventListener('change', ...)` block) so Enter/Space activate the fan:

```js
app.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const fan = event.target.closest('[data-action="view-cards"]');
  if (!fan) return;
  event.preventDefault();
  ui.viewerFor = Number(fan.dataset.player);
  render();
});
```

4. Replace the document-level Escape listener with a priority chain:

```js
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (ui.viewerFor !== null) {
    ui.viewerFor = null;
    render();
    return;
  }
  if (ui.sheetFor !== null) {
    ui.sheetFor = null;
    render();
  }
});
```

- [ ] **Step 4: Viewer styles**

Append a new section to `styles.css` (before the `/* --- small screens / misc --- */` section), and add `cursor: pointer;` to the existing `.fan` rule:

```css
/* --- full-card viewer ------------------------------------------------------ */

.viewer {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  flex-direction: column;
  background: radial-gradient(120% 90% at 50% 0%, var(--felt-800) 0%, var(--felt-900) 70%);
  padding: 14px 14px calc(14px + env(safe-area-inset-bottom));
  animation: viewer-in 220ms ease-out;
}

@keyframes viewer-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.viewer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(211, 169, 82, 0.3);
}

.viewer-name { margin: 0; font-size: 24px; }

.viewer-sub { margin: 2px 0 0; color: var(--brass); font-size: 15px; }

.viewer-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-top: 6px;
}

.viewer-section {
  margin: 14px 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

.viewer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 10px;
}

.viewer-grid .card-wrap { width: 100%; }

.viewer-grid.viewer-grid-best { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }

.viewer-grid.viewer-grid-best .card-svg { box-shadow: 0 0 0 2px var(--brass); }

.viewer-body > .btn-block { margin-top: 16px; }
```

- [ ] **Step 5: Regression check**

Run: `node --test portfolio/public/games/card-drawer/*.test.js && node --input-type=module --check < portfolio/public/games/card-drawer/game.js`
Expected: 66 pass; no syntax output.

- [ ] **Step 6: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js portfolio/public/games/card-drawer/styles.css
git commit -m "feat(card-drawer): tap a fan to open a full-screen card viewer"
```

---

### Task 3: Pick reveal sequence + take-the-lead celebration (`game.js` + `styles.css`)

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js`
- Modify: `portfolio/public/games/card-drawer/styles.css`

**Interfaces:**
- Consumes: `cardWrap`, `evaluateHand`, `compareScores`, `ICONS.crown`, the Task 2 Escape chain.
- Produces: `ui.reveal` / `ui.leadGlow` transients, `currentLeaderId()`, `revealOverlayHTML()`, `dismissReveal()`, click actions `reveal-continue` / `reveal-done`; `.lb-glow` leaderboard class.

- [ ] **Step 1: Sparkles constant + state in `game.js`**

1. After the `ICONS` object, add:

```js
// Celebration sparkles — 4-point-star paths generated from fixed positions.
const SPARKLES =
  '<svg class="sparkles" viewBox="0 0 320 320" aria-hidden="true">' +
  ['160 34 18', '58 84 12', '258 72 14', '36 190 10', '284 196 12', '104 262 12', '216 272 14', '160 132 8']
    .map((s) => {
      const [x, y, r] = s.split(' ').map(Number);
      return (
        `<path d="M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} ` +
        `Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z" fill="currentColor"/>`
      );
    })
    .join('') +
  '</svg>';
```

2. Extend the `ui` declaration to:

```js
const ui = {
  sheetFor: null,
  justDrawn: null,
  confirmReset: false,
  resume: null,
  viewerFor: null,
  reveal: null,
  leadGlow: null,
};
```

3. Next to `let resetTimer = null;` add:

```js
let revealTimer = null;
```

- [ ] **Step 2: Leader helper + action changes**

1. Add above `dealRandom`:

```js
// Leader's player id right now — cheap (no outs computation). Strict > keeps
// the earlier player on ties, matching rankedEntries' stable sort.
function currentLeaderId() {
  let best = null;
  for (const p of state.players) {
    const hand = evaluateHand(p.cards);
    if (!hand) continue;
    if (!best || compareScores(hand.score, best.score) > 0) best = { id: p.id, score: hand.score };
  }
  return best ? best.id : null;
}
```

2. Replace `dealRandom` with:

```js
function dealRandom(playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.deck.length === 0) return;
  const prevLeader = currentLeaderId();
  const card = state.deck.pop();
  player.cards.push(card);
  state.history.push({ playerId, cardId: card.id });
  const newLeader = currentLeaderId();
  if (prevLeader !== null && newLeader === playerId && newLeader !== prevLeader) {
    ui.leadGlow = playerId;
  }
  ui.justDrawn = { playerId, cardId: card.id };
  saveState();
  render();
  ui.justDrawn = null;
  ui.leadGlow = null;
}
```

3. Replace `pickCard` with:

```js
function pickCard(playerId, index) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || index < 0 || index >= state.deck.length) return;
  const prevLeader = currentLeaderId();
  const [card] = state.deck.splice(index, 1);
  player.cards.push(card);
  state.history.push({ playerId, cardId: card.id });
  const newLeader = currentLeaderId();
  const tookLead = prevLeader !== null && newLeader === playerId && newLeader !== prevLeader;
  ui.sheetFor = null;
  ui.reveal = { playerId, cardId: card.id, stage: 1, tookLead };
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    if (ui.reveal && ui.reveal.stage === 1) {
      ui.reveal.stage = 2;
      render();
    }
  }, 900);
  saveState();
  render();
}
```

4. Add after `pickCard`:

```js
function dismissReveal() {
  clearTimeout(revealTimer);
  const reveal = ui.reveal;
  ui.reveal = null;
  if (reveal && reveal.tookLead) {
    ui.leadGlow = reveal.playerId;
  }
  render();
  ui.leadGlow = null;
}
```

5. In `resetGame`, after `ui.viewerFor = null;` add:

```js
  clearTimeout(revealTimer);
  ui.reveal = null;
  ui.leadGlow = null;
```

- [ ] **Step 3: Reveal overlay renderer + wiring**

1. Add after `viewerHTML()`:

```js
function revealOverlayHTML() {
  const player = state.players.find((p) => p.id === ui.reveal.playerId);
  if (!player) return '';
  const card = player.cards.find((c) => c.id === ui.reveal.cardId);
  if (!card) return '';
  if (ui.reveal.stage === 1) {
    return `
    <div class="overlay reveal-overlay" data-action="reveal-continue">
      <div class="reveal-stage">
        <div class="reveal-card">${cardWrap(card, { flip: true })}</div>
        <p class="reveal-caption">${esc(player.name)} draws…</p>
      </div>
    </div>`;
  }
  const hand = evaluateHand(player.cards);
  return `
    <div class="overlay reveal-overlay" data-action="reveal-done">
      <div class="reveal-stage">
        ${ui.reveal.tookLead ? SPARKLES : ''}
        ${ui.reveal.tookLead ? `<div class="lead-ribbon">${ICONS.crown}<span>Takes the lead</span></div>` : ''}
        <div class="reveal-best">${hand.bestFive
          .map((c) => cardWrap(c, { group: c.id === ui.reveal.cardId ? 'just' : '' }))
          .join('')}</div>
        <p class="reveal-hand">${esc(hand.name)}</p>
        <p class="reveal-caption">${esc(player.name)}</p>
        <button class="btn btn-primary" data-action="reveal-done">Done</button>
      </div>
    </div>`;
}
```

2. In `gameScreen()`, add the reveal as the LAST overlay:

```js
    ${ui.viewerFor !== null ? viewerHTML() : ''}
    ${ui.sheetFor !== null ? sheetHTML() : ''}
    ${ui.reveal ? revealOverlayHTML() : ''}
```

3. Click handler — add before `case 'undo':`:

```js
    case 'reveal-continue':
      clearTimeout(revealTimer);
      if (ui.reveal) {
        ui.reveal.stage = 2;
        render();
      }
      break;
    case 'reveal-done':
      dismissReveal();
      break;
```

4. Escape chain — extend the Task 2 document keydown listener so it starts with:

```js
  if (ui.reveal) {
    dismissReveal();
    return;
  }
```

5. In `leaderboardHTML`, change the `<li>` opening to include the glow class:

```js
      <li class="${leader ? 'lb-leader' : ''}${ui.leadGlow === entry.player.id ? ' lb-glow' : ''}">
```

- [ ] **Step 4: Reveal + celebration styles**

Append to `styles.css` (after the viewer section from Task 2):

```css
/* --- pick reveal + celebration --------------------------------------------- */

.reveal-overlay {
  z-index: 60;
  cursor: pointer;
}

.reveal-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 22px;
  max-width: min(92vw, 460px);
}

.reveal-card .card-wrap {
  width: min(46vw, 210px);
  filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.5));
}

.reveal-caption {
  margin: 0;
  color: var(--ink-dim);
  font-style: italic;
}

.reveal-hand {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--brass);
}

.reveal-best {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.reveal-best .card-wrap {
  width: clamp(64px, 16vw, 84px);
  animation: card-rise 420ms ease-out both;
}

.reveal-best .card-wrap:nth-child(2) { animation-delay: 70ms; }
.reveal-best .card-wrap:nth-child(3) { animation-delay: 140ms; }
.reveal-best .card-wrap:nth-child(4) { animation-delay: 210ms; }
.reveal-best .card-wrap:nth-child(5) { animation-delay: 280ms; }

.reveal-best .card-wrap.just .card-svg { box-shadow: 0 0 0 3px var(--brass); }

@keyframes card-rise {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

.lead-ribbon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--brass), var(--brass-deep));
  color: #241b08;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  animation: ribbon-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes ribbon-pop {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

.sparkles {
  position: absolute;
  inset: 0;
  margin: auto;
  width: min(86vw, 360px);
  height: auto;
  color: var(--brass);
  pointer-events: none;
}

.sparkles path {
  transform-origin: center;
  transform-box: fill-box;
  animation: sparkle-twinkle 1.6s ease-in-out infinite;
}

.sparkles path:nth-child(odd) { animation-delay: 0.4s; }
.sparkles path:nth-child(3n) { animation-delay: 0.8s; }

@keyframes sparkle-twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1.15); }
}

.leaderboard li.lb-glow {
  border-radius: 8px;
  animation: lead-glow 1.5s ease-out;
}

@keyframes lead-glow {
  0% { background: rgba(211, 169, 82, 0.45); box-shadow: 0 0 22px rgba(211, 169, 82, 0.5); }
  100% { background: transparent; box-shadow: none; }
}
```

- [ ] **Step 5: Regression check**

Run: `node --test portfolio/public/games/card-drawer/*.test.js && node --input-type=module --check < portfolio/public/games/card-drawer/game.js`
Expected: 66 pass; no syntax output.

- [ ] **Step 6: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js portfolio/public/games/card-drawer/styles.css
git commit -m "feat(card-drawer): pick reveal sequence + take-the-lead celebration"
```

---

### Task 4: Browser verification

- [ ] Serve: `python3 -m http.server 8766 -d portfolio/public/games/card-drawer` (background).
- [ ] Checklist (zero console errors, hook `window.onerror` + `unhandledrejection` since the CDP console capture is a stub):
  1. Spares are full-size, lightly dimmed, divider visible; index corners readable at -28px overlap.
  2. Tap a fan → viewer opens: name, hand subline, ringed best-hand grid, Other cards grid, wraps with no sideways scroll; X, bottom Close, and Escape all close; Enter on a focused fan opens it.
  3. Pick mode: tap a face-down card → stage 1 large flip; auto-advance ~0.9s; tap during stage 1 skips ahead; stage 2 shows the ranked best five (picked card extra-ringed when in the five), hand name, Done.
  4. Engineer a lead change in Pick mode (deal a strong pile to trailing player) → ribbon + sparkles in stage 2, leaderboard glow after dismissing.
  5. Random-mode lead change → leaderboard glow only, no overlay.
  6. Tie with the leader → no celebration.
  7. Reset mid-reveal and mid-viewer → clean setup screen, no stuck overlays/timers.
  8. Reload mid-game → resume works; overlays all closed.
- [ ] Kill the server; commit any fixes.

### Task 5: Ship

- [ ] `git push -u origin worktree-card-drawer-uiux`
- [ ] `gh pr create --base main --title "feat(card-drawer): UI/UX — readable spares, card viewer, pick reveal + lead celebration" --body <summary + spec path + footer>`
- [ ] `gh pr merge --merge` (user pre-authorized; merge separately from other branches)
- [ ] Watch the `Deploy Portfolio to S3` run for the merge commit; then `curl -s https://card-drawer.hillmanchan.com/games/card-drawer/game.js | grep -c "reveal-overlay"` → ≥1.
