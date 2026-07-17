# Card Drawer v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three Card Drawer changes — blind face-down manual pick, ranked best-5 hand row, and leaderboard "cards that can take the lead" — per spec `docs/superpowers/specs/2026-07-17-card-drawer-v2-design.md`.

**Architecture:** Pure poker logic gains two capabilities in `hand-eval.js` (`bestFive` card selection, `countOuts`), both unit-tested with `node --test`. `game.js` (vanilla-JS UI, string-template rendering, delegated events) consumes them: the manual-pick sheet becomes a face-down grid, the player fan renders best-5-first, the leaderboard gains an outs line. No state-schema change; saved v1 games resume unchanged.

**Tech Stack:** Vanilla JS ES modules, `node --test` + `node:assert/strict`, plain CSS. No frameworks, no build step for the game itself.

## Global Constraints

- **Work in the worktree** `/Users/hillmanchan/Desktop/HillmanChan_portfolio/.claude/worktrees/card-drawer-v2` on branch `worktree-card-drawer-v2`. All paths below are relative to that worktree root. Never `cd` to the main checkout; never push `main` directly.
- **Do not touch** `portfolio/build/**`, `portfolio/src/game/card-drawer/**` (thin iframe wrapper, unchanged), or anything related to the `dealer-glb` worktree/character work.
- **No emoji anywhere** in UI or code output — SVG glyphs only (existing `ICONS` / `renderCardSVG` patterns).
- **localStorage schema unchanged:** key `card-drawer:v1`; `drawMode` stored values stay `'random'` / `'manual'` (only the visible label changes to "Pick").
- Mobile-first; touch targets ≥ 44px (`var(--tap)`).
- Tests run from the worktree root: `node --test portfolio/public/games/card-drawer/`.
- Merge/deploy (Task 7) happens **separately from any other in-flight branch**, only after Task 6 verification passes. Deploy = merge to `main` → GitHub Actions builds CRA and uploads to S3 (serves `card-drawer.hillmanchan.com`).

---

### Task 1: `bestFive` selection in `hand-eval.js`

**Files:**
- Modify: `portfolio/public/games/card-drawer/hand-eval.js`
- Test: `portfolio/public/games/card-drawer/hand-eval.test.js`

**Interfaces:**
- Consumes: existing `evaluatePlain(cards) → score[]`, `compareScores(a, b)`, `SUITS`, `RANKS`, `CATEGORY`.
- Produces: `evaluateHand(cards)` now returns `{ category, score, name, bestFive }` where `bestFive` is an array of **the actual card objects from the input pile** (jokers appear as the joker objects themselves), ordered by score priority (e.g. Full House K over 9 → `[K,K,K,9,9]`), length `min(cards.length, 5)`. Task 4 renders this; Task 2's `countOuts` is unaffected by it.

- [ ] **Step 1: Write the failing tests**

Append to `portfolio/public/games/card-drawer/hand-eval.test.js`:

```js
// --- bestFive --------------------------------------------------------------

test('bestFive: full house from seven cards picks the trips then the pair', () => {
  const pile = [
    c(2, 'clubs'),
    c(13, 'hearts'),
    c(9, 'hearts'),
    c(13, 'diamonds'),
    c(7, 'diamonds'),
    c(13, 'spades'),
    c(9, 'clubs'),
  ];
  const hand = evaluateHand(pile);
  assert.deepEqual(hand.score, [CATEGORY.FULL_HOUSE, 13, 9]);
  assert.deepEqual(hand.bestFive.map((card) => card.rank), [13, 13, 13, 9, 9]);
  assert.equal(new Set(hand.bestFive).size, 5);
  for (const card of hand.bestFive) assert.ok(pile.includes(card));
});

test('bestFive: flush returns five cards of the flush suit, best first', () => {
  const hand = evaluateHand([
    c(14, 'hearts'),
    c(2, 'spades'),
    c(11, 'hearts'),
    c(9, 'hearts'),
    c(6, 'hearts'),
    c(3, 'hearts'),
  ]);
  assert.equal(hand.category, CATEGORY.FLUSH);
  assert.deepEqual(hand.bestFive.map((card) => card.rank), [14, 11, 9, 6, 3]);
  assert.ok(hand.bestFive.every((card) => card.suit === 'hearts'));
});

test('bestFive: straight is ordered high to low', () => {
  const hand = evaluateHand(mixed(2, 9, 5, 6, 7, 8, 11));
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 9]);
  assert.deepEqual(hand.bestFive.map((card) => card.rank), [9, 8, 7, 6, 5]);
});

test('bestFive: wheel straight ends with the ace card', () => {
  const hand = evaluateHand(mixed(14, 2, 3, 4, 5));
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 5]);
  assert.deepEqual(hand.bestFive.map((card) => card.rank), [5, 4, 3, 2, 14]);
});

test('bestFive: joker object itself appears in the winning five', () => {
  const w = joker();
  const pile = [c(9, 'spades'), c(9, 'hearts'), c(9, 'diamonds'), c(9, 'clubs'), w];
  const hand = evaluateHand(pile);
  assert.equal(hand.category, CATEGORY.FIVE_OF_A_KIND);
  assert.ok(hand.bestFive.includes(w));
  assert.equal(new Set(hand.bestFive).size, 5);
});

test('bestFive: joker completing the wheel is in the five', () => {
  const w = joker();
  const pile = [c(14, 'spades'), c(2, 'hearts'), c(3, 'diamonds'), c(4, 'clubs'), w];
  const hand = evaluateHand(pile);
  assert.deepEqual(hand.score, [CATEGORY.STRAIGHT, 5]);
  assert.ok(hand.bestFive.includes(w));
  assert.equal(hand.bestFive.length, 5);
});

test('bestFive: fewer than five cards returns the whole pile, best first', () => {
  const kh = c(13, 'hearts');
  const qs = c(12, 'spades');
  const hand = evaluateHand([qs, kh]);
  assert.deepEqual(hand.bestFive, [kh, qs]);
});

test('bestFive: pair {K, Joker} returns both cards', () => {
  const w = joker();
  const kh = c(13, 'hearts');
  const hand = evaluateHand([kh, w]);
  assert.deepEqual(hand.score, [CATEGORY.PAIR, 13]);
  assert.equal(hand.bestFive.length, 2);
  assert.ok(hand.bestFive.includes(kh));
  assert.ok(hand.bestFive.includes(w));
});

test('bestFive: royal flush picks the suited run even among distractors', () => {
  const suited = [c(14, 'spades'), c(13, 'spades'), c(12, 'spades'), c(11, 'spades'), c(10, 'spades')];
  const pile = [c(14, 'hearts'), ...suited, c(9, 'clubs')];
  const hand = evaluateHand(pile);
  assert.equal(hand.category, CATEGORY.ROYAL_FLUSH);
  assert.deepEqual(hand.bestFive, suited);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test portfolio/public/games/card-drawer/hand-eval.test.js`
Expected: the 9 new `bestFive:` tests FAIL (`hand.bestFive` is `undefined`); all pre-existing tests still PASS.

- [ ] **Step 3: Implement selection tracking**

In `portfolio/public/games/card-drawer/hand-eval.js`, add `selectFive` after `evaluatePlain` (before `handName`):

```js
// Given concrete cards (no jokers; wild substitutes allowed as tagged copies)
// and the score evaluatePlain produced for them, pick the actual card objects
// that form the hand, in score-priority order. Each object is used at most
// once. Deterministic: naturals listed before wild extras are preferred.
function selectFive(cards, score) {
  const [category, ...ranks] = score;
  const pool = cards.slice();
  const takeByRank = (rank, howMany, suit = null) => {
    const out = [];
    for (let i = 0; i < pool.length && out.length < howMany; i++) {
      if (pool[i].rank === rank && (suit === null || pool[i].suit === suit)) {
        out.push(pool[i]);
        pool.splice(i, 1);
        i--;
      }
    }
    return out;
  };
  const straightRanks = (high) =>
    high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];

  switch (category) {
    case CATEGORY.FIVE_OF_A_KIND:
      return takeByRank(ranks[0], 5);
    case CATEGORY.ROYAL_FLUSH:
    case CATEGORY.STRAIGHT_FLUSH: {
      const run = straightRanks(category === CATEGORY.ROYAL_FLUSH ? 14 : ranks[0]);
      const suit = SUITS.find((s) =>
        run.every((r) => pool.some((card) => card.suit === s && card.rank === r))
      );
      return run.map((r) => takeByRank(r, 1, suit)[0]);
    }
    case CATEGORY.QUADS:
      return [...takeByRank(ranks[0], 4), ...ranks.slice(1).map((r) => takeByRank(r, 1)[0])];
    case CATEGORY.FULL_HOUSE:
      return [...takeByRank(ranks[0], 3), ...takeByRank(ranks[1], 2)];
    case CATEGORY.FLUSH: {
      const suit = SUITS.find((s) => {
        const bag = new Map();
        for (const card of pool) {
          if (card.suit !== s) continue;
          bag.set(card.rank, (bag.get(card.rank) || 0) + 1);
        }
        const need = new Map();
        for (const r of ranks) need.set(r, (need.get(r) || 0) + 1);
        return [...need].every(([r, n]) => (bag.get(r) || 0) >= n);
      });
      return ranks.map((r) => takeByRank(r, 1, suit)[0]);
    }
    case CATEGORY.STRAIGHT:
      return straightRanks(ranks[0]).map((r) => takeByRank(r, 1)[0]);
    case CATEGORY.TRIPS:
      return [...takeByRank(ranks[0], 3), ...ranks.slice(1).map((r) => takeByRank(r, 1)[0])];
    case CATEGORY.TWO_PAIR:
      return [
        ...takeByRank(ranks[0], 2),
        ...takeByRank(ranks[1], 2),
        ...ranks.slice(2).map((r) => takeByRank(r, 1)[0]),
      ];
    case CATEGORY.PAIR:
      return [...takeByRank(ranks[0], 2), ...ranks.slice(1).map((r) => takeByRank(r, 1)[0])];
    default:
      return ranks.map((r) => takeByRank(r, 1)[0]);
  }
}
```

Replace the whole existing `evaluateHand` with:

```js
// Best 5-card hand of a pile that may contain wild jokers. Each wild is
// brute-forced over all 52 concrete card values (duplicates allowed); with a
// single deck W <= 2, so at most 52x52 = 2704 plain evaluations. The brute
// force is score-only; card selection runs once, on the winning assignment.
export function evaluateHand(cards) {
  if (!cards || cards.length === 0) return null;
  const naturals = cards.filter((card) => !card.joker);
  const wilds = cards.filter((card) => card.joker);

  let best = null;
  let bestExtras = [];
  const consider = (score, extras) => {
    if (!best || compareScores(score, best) > 0) {
      best = score;
      bestExtras = extras.slice();
    }
  };
  const assign = (wildsLeft, extras) => {
    if (wildsLeft === 0) {
      consider(evaluatePlain(naturals.concat(extras)), extras);
      return;
    }
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        extras.push({ rank, suit, wildOf: wilds[extras.length] });
        assign(wildsLeft - 1, extras);
        extras.pop();
      }
    }
  };
  assign(wilds.length, []);

  const bestFive = selectFive(naturals.concat(bestExtras), best).map(
    (card) => card.wildOf || card
  );
  return { category: best[0], score: best, name: handName(best), bestFive };
}
```

(`evaluatePlain` only reads `rank`/`suit`, so the `wildOf` tag on extras is inert. Naturals come before extras in the pool, so a natural is always preferred over a wild copy of the same card.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test portfolio/public/games/card-drawer/hand-eval.test.js`
Expected: ALL tests PASS (pre-existing + 9 new).

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/card-drawer/hand-eval.js portfolio/public/games/card-drawer/hand-eval.test.js
git commit -m "feat(card-drawer): evaluateHand returns bestFive card selection"
```

---

### Task 2: `countOuts` in `hand-eval.js`

**Files:**
- Modify: `portfolio/public/games/card-drawer/hand-eval.js`
- Test: `portfolio/public/games/card-drawer/hand-eval.test.js`

**Interfaces:**
- Consumes: `evaluateHand(cards)` (Task 1 shape), `compareScores`.
- Produces: `export function countOuts(playerCards, leaderScore, deck) → number` — how many cards in `deck` would, added to `playerCards` as one more card, make the hand **strictly** beat `leaderScore` (a score tuple). Task 5 calls this from `game.js`.

- [ ] **Step 1: Write the failing tests**

Append to `portfolio/public/games/card-drawer/hand-eval.test.js` (add `countOuts` to the import list at the top of the file):

```js
// --- countOuts ---------------------------------------------------------------

test('countOuts: counts only cards that strictly beat the leader', () => {
  const player = [c(13, 'spades'), c(13, 'hearts')]; // pair of kings
  const leaderScore = [CATEGORY.PAIR, 14]; // pair of aces
  const deck = [c(13, 'diamonds'), c(2, 'clubs'), c(14, 'hearts')];
  // KD -> trips kings (beats); 2C, AH -> still pair of kings (lose to pair of aces).
  assert.equal(countOuts(player, leaderScore, deck), 1);
});

test('countOuts: a joker in the deck counts when it wins as a wild', () => {
  const player = [c(10, 'spades'), c(10, 'hearts')];
  const leaderScore = [CATEGORY.TRIPS, 9, 8, 2];
  const deck = [joker(), c(3, 'clubs')];
  assert.equal(countOuts(player, leaderScore, deck), 1); // joker -> trips 10s
});

test('countOuts: a tie does not count as an out', () => {
  const player = [c(13, 'spades')];
  const leaderScore = [CATEGORY.HIGH_CARD, 14, 13];
  const deck = [c(14, 'hearts')]; // makes exactly A-K high — equal, not better
  assert.equal(countOuts(player, leaderScore, deck), 0);
});

test('countOuts: empty deck yields zero', () => {
  assert.equal(countOuts([c(5, 'spades')], [CATEGORY.HIGH_CARD, 14], []), 0);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test portfolio/public/games/card-drawer/hand-eval.test.js`
Expected: FAIL — `countOuts` is not exported (SyntaxError on import). Pre-existing tests unaffected once it exists.

- [ ] **Step 3: Implement**

Append to `portfolio/public/games/card-drawer/hand-eval.js` (after `evaluateHand`):

```js
// How many cards in `deck` would, drawn as one more card, make this pile
// strictly beat `leaderScore`. O(deck) evaluateHand calls; only a pile already
// holding both jokers is expensive (~54 x 2704 plain evals worst case).
export function countOuts(playerCards, leaderScore, deck) {
  let outs = 0;
  for (const card of deck) {
    const hand = evaluateHand([...playerCards, card]);
    if (compareScores(hand.score, leaderScore) > 0) outs++;
  }
  return outs;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test portfolio/public/games/card-drawer/hand-eval.test.js`
Expected: ALL tests PASS.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/card-drawer/hand-eval.js portfolio/public/games/card-drawer/hand-eval.test.js
git commit -m "feat(card-drawer): countOuts — cards that beat a target score"
```

---

### Task 3: Blind face-down pick sheet (`game.js` + `styles.css`)

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js`
- Modify: `portfolio/public/games/card-drawer/styles.css`

**Interfaces:**
- Consumes: `renderCardSVG('back')` (existing), `state.deck` (shuffled at start).
- Produces: `pickCard(playerId, index)` replaces `assignCard(playerId, cardId)`; pick buttons carry `data-action="pick" data-index="<i>"`. Mode toggle label becomes "Pick". `ui.justPicked` and the `pop-in` animation are removed (`ui.justDrawn` flip is used for both draw paths). Tasks 4–5 build on this file state.

- [ ] **Step 1: Replace the sheet and assign logic in `game.js`**

1. In the `ui` object (line ~64), delete `justPicked: null,` — it becomes:

```js
const ui = { sheetFor: null, justDrawn: null, confirmReset: false, resume: null };
```

2. Replace `assignCard` entirely with:

```js
function pickCard(playerId, index) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || index < 0 || index >= state.deck.length) return;
  const [card] = state.deck.splice(index, 1);
  player.cards.push(card);
  state.history.push({ playerId, cardId: card.id });
  ui.justDrawn = { playerId, cardId: card.id };
  ui.sheetFor = null;
  saveState();
  render();
  ui.justDrawn = null;
}
```

3. Replace `sheetHTML` and delete `pickButton` entirely:

```js
function sheetHTML() {
  const player = state.players.find((p) => p.id === ui.sheetFor);
  if (!player) return '';
  const left = state.deck.length;
  const backs = state.deck
    .map(
      (_, i) =>
        `<button class="pick-card" data-action="pick" data-index="${i}" ` +
        `aria-label="Face-down card ${i + 1} of ${left}">${renderCardSVG('back')}</button>`
    )
    .join('');
  return `
    <div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Pick a card for ${esc(player.name)}">
      <div class="sheet-head">
        <h2>Pick a card for ${esc(player.name)}
          <span class="sheet-sub">${left} face-down card${left === 1 ? '' : 's'} — tap one</span>
        </h2>
        <button class="btn btn-quiet btn-icon" data-action="close-sheet" aria-label="Close">${ICONS.cross}</button>
      </div>
      <div class="sheet-body"><div class="pick-grid">${backs}</div></div>
    </div>
  `;
}
```

4. Update the `pick` case in the click handler to:

```js
    case 'pick': {
      const sheetPlayer = ui.sheetFor;
      if (sheetPlayer !== null) pickCard(sheetPlayer, Number(target.dataset.index));
      break;
    }
```

5. In `dealerBar()`, change the second mode button's label from `Manual` to `Pick` (the `data-mode="manual"` attribute and stored value stay `manual`).

6. In `playerPanel()`, the manual-mode action label already reads `Pick for ${esc(player.name)}` — leave it. Remove the now-dead `pop` handling: in the fan mapping delete the `const pop = ...` line and pass only `{ flip }` to `cardWrap`; in `cardWrap` remove the `pop` option and the `pop-in` class (Task 4 rewrites both anyway — if executing tasks in order, it is fine to leave `cardWrap` untouched here and let Task 4 remove it).

7. Delete the now-unused `SUIT_TITLES` constant and remove `rankLabel` and `SUITS` from the `hand-eval.js` import (still imported: `createDeck`, `shuffle`, `evaluateHand`, `compareScores`).

- [ ] **Step 2: Style the face-down grid in `styles.css`**

In the `/* --- manual-pick sheet --- */` section: delete the `.sheet-suit` rule (no more suit headers) and widen the grid slightly — replace the `.pick-grid` rule with:

```css
.pick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: 8px;
  padding-top: 6px;
}
```

Delete the `.pick-card:disabled` rule (no disabled picks remain — taken cards simply are not rendered).

- [ ] **Step 3: Regression-check the module still parses and pure tests pass**

Run: `node --test portfolio/public/games/card-drawer/`
Expected: ALL tests PASS (game.js has no test harness; `node --check` it too: `node --input-type=module --check < portfolio/public/games/card-drawer/game.js` → no output).

- [ ] **Step 4: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js portfolio/public/games/card-drawer/styles.css
git commit -m "feat(card-drawer): manual mode is now a blind face-down pick"
```

---

### Task 4: Ranked hand row — best 5 first (`game.js` + `styles.css`)

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js`
- Modify: `portfolio/public/games/card-drawer/styles.css`

**Interfaces:**
- Consumes: `evaluateHand(...).bestFive` (Task 1), `cardWrap`, `ui.justDrawn`.
- Produces: player fan renders `bestFive` (class `best`) then leftovers (class `spare`, rank-descending). `cardWrap(card, { flip, group })` signature — Task 5 does not touch it.

- [ ] **Step 1: Rewrite `cardWrap` and the fan in `game.js`**

Replace `cardWrap` with:

```js
function cardWrap(card, { flip = false, group = '' } = {}) {
  const cls = `card-wrap${group ? ` ${group}` : ''}`;
  if (flip) {
    return (
      `<span class="${cls} flip"><span class="flip-inner">` +
      `<span class="flip-face">${renderCardSVG(card)}</span>` +
      `<span class="flip-back">${renderCardSVG('back')}</span>` +
      '</span></span>'
    );
  }
  return `<span class="${cls}">${renderCardSVG(card)}</span>`;
}
```

In `playerPanel`, replace the `const fan = ...` block with:

```js
  let fan = '<span class="fan-empty">No cards yet</span>';
  if (player.cards.length) {
    const bestSet = new Set(hand.bestFive);
    const spares = player.cards
      .filter((card) => !bestSet.has(card))
      .sort((a, b) => (b.rank || 15) - (a.rank || 15));
    const wrap = (card, group) =>
      cardWrap(card, { flip: ui.justDrawn && ui.justDrawn.cardId === card.id, group });
    fan =
      hand.bestFive.map((card) => wrap(card, 'best')).join('') +
      spares.map((card) => wrap(card, 'spare')).join('');
  }
```

(An unused joker sorts first among spares via the `|| 15` fallback — jokers have no `rank`.)

- [ ] **Step 2: Style the two groups in `styles.css`**

In the `/* --- player panels --- */` section, delete the `.fan .card-wrap:last-child { transform: translateY(-5px); }` rule (draw-order relic) and the `.pop-in` rule + `@keyframes pop-in` (no longer emitted). Add after the `.fan .card-wrap + .card-wrap` rule:

```css
.fan .card-wrap.best { transform: translateY(-4px); }

.fan .card-wrap.best .card-svg {
  box-shadow: 0 0 0 2px var(--brass);
}

.fan .card-wrap.spare {
  width: 52px;
  opacity: 0.55;
  filter: saturate(0.7) drop-shadow(0 3px 5px rgba(0, 0, 0, 0.35));
}

.fan .card-wrap.best + .card-wrap.spare { margin-left: 12px; }
```

And inside the existing `@media (max-width: 380px)` block add:

```css
  .fan .card-wrap.spare { width: 46px; }
```

- [ ] **Step 3: Regression check**

Run: `node --test portfolio/public/games/card-drawer/ && node --input-type=module --check < portfolio/public/games/card-drawer/game.js`
Expected: ALL tests PASS; no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js portfolio/public/games/card-drawer/styles.css
git commit -m "feat(card-drawer): player fan shows best five first, ranked"
```

---

### Task 5: Leaderboard outs line (`game.js` + `styles.css`)

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js`
- Modify: `portfolio/public/games/card-drawer/styles.css`

**Interfaces:**
- Consumes: `countOuts` (Task 2), `rankedEntries()`.
- Produces: entries from `rankedEntries()` carry `outs: number` when (and only when) rank > 1, the leader has a hand, and the deck is non-empty; `leaderboardHTML` renders it.

- [ ] **Step 1: Compute outs in `rankedEntries` in `game.js`**

Add `countOuts` to the `hand-eval.js` import. At the end of `rankedEntries` (after the `entries.forEach(...)` rank pass, before `return entries;`), insert:

```js
  const leader = entries[0];
  if (leader && leader.hand && state.deck.length) {
    for (const entry of entries) {
      if (entry.rank > 1) {
        entry.outs = countOuts(entry.player.cards, leader.hand.score, state.deck);
      }
    }
  }
```

- [ ] **Step 2: Render the outs line in `leaderboardHTML`**

Inside the row template, after the `lb-hand` span, add:

```js
          ${
            entry.outs === undefined
              ? ''
              : `<span class="lb-outs">${
                  entry.outs
                    ? `${entry.outs} card${entry.outs === 1 ? '' : 's'} can take the lead`
                    : 'No single card takes the lead'
                }</span>`
          }
```

(so the `lb-body` span contains name, hand, and optionally outs).

- [ ] **Step 3: Style it in `styles.css`**

Add to the `/* --- leaderboard --- */` section, after `.leaderboard .lb-hand`:

```css
.leaderboard .lb-outs {
  display: block;
  font-size: 12px;
  font-style: italic;
  color: var(--ink-faint);
}
```

- [ ] **Step 4: Regression check**

Run: `node --test portfolio/public/games/card-drawer/ && node --input-type=module --check < portfolio/public/games/card-drawer/game.js`
Expected: ALL tests PASS; no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js portfolio/public/games/card-drawer/styles.css
git commit -m "feat(card-drawer): leaderboard shows cards that can take the lead"
```

---

### Task 6: Full-suite run + real-browser verification

**Files:**
- No source changes expected (fix-forward if the browser run finds bugs, then re-run this task).

- [ ] **Step 1: Run every test**

Run: `node --test portfolio/public/games/card-drawer/`
Expected: ALL tests PASS (hand-eval + card-svg suites).

- [ ] **Step 2: Serve the game locally**

```bash
python3 -m http.server 8765 -d portfolio/public/games/card-drawer
```

(run in background; the game is a static ES-module page, same-origin serving is required for module imports).

- [ ] **Step 3: Drive it in a browser at `http://localhost:8765`**

Checklist — all must hold with **zero console errors**:
1. Setup: add 3 players, enable jokers, start.
2. Random mode: deal several cards — new cards flip in and slot into ranked position (best five highlighted with brass ring, spares dimmed to the right).
3. Switch mode — toggle reads **Random | Pick**. "Pick for [player]" opens a sheet of face-down backs only, count matches "N face-down cards — tap one". Tap one → sheet closes, card flips face-up in the hand.
4. Undo after a blind pick: card count restores, sheet (reopened) shows one more back.
5. Leaderboard: non-leaders show "N cards can take the lead" / "No single card takes the lead"; leader shows crown and no outs line; numbers change after each draw.
6. Draw a joker to a player: it appears in the highlighted best five (wild).
7. Deal until deck empty: buttons disable, outs lines disappear.
8. Reload mid-game: Resume restores the game; ranked row and outs render immediately.
9. Reset → confirm → back to setup.

- [ ] **Step 4: Kill the server, commit any fixes**

If fixes were needed, commit them:

```bash
git add -A portfolio/public/games/card-drawer && git commit -m "fix(card-drawer): browser-verification fixes"
```

---

### Task 7: Push, PR, merge separately, verify deploy

The user pre-authorized this ("commit and push and deploy the change… merge and push separately once done") — merge **only after Task 6 passes**, and keep this PR independent of any other branch (dealer-glb etc.).

- [ ] **Step 1: Push the branch and open the PR**

```bash
git push -u origin worktree-card-drawer-v2
gh pr create --base main \
  --title "feat(card-drawer): blind face-down pick, ranked best-5 row, leaderboard outs" \
  --body "$(cat <<'EOF'
Card Drawer v2 — spec docs/superpowers/specs/2026-07-17-card-drawer-v2-design.md

- Manual mode is now a blind face-down pick: the sheet shows only the remaining cards as backs; tapping slot i takes deck[i] (pre-shuffled, so uniformly random) and flips it into the hand.
- Player fan renders ranked: evaluateHand now returns bestFive (actual pile cards, jokers as themselves); best five are highlighted, leftovers trail dimmed, re-sorting after every draw/undo.
- Leaderboard: non-leaders show how many remaining deck cards would put them strictly ahead of the current leader (countOuts, unit-tested).

No localStorage schema change — v1 saves resume unchanged. node --test suites extended (bestFive per category, joker mapping, countOuts).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01SjojbwCpLUAQvHNjTo18Zo
EOF
)"
```

- [ ] **Step 2: Merge the PR (separately, as instructed)**

```bash
gh pr merge --merge
```

- [ ] **Step 3: Watch the deploy workflow**

```bash
gh run list --branch main --limit 3
gh run watch <run-id-of-the-deploy>
```

Expected: the S3 deploy workflow for the merge commit succeeds.

- [ ] **Step 4: Verify live**

```bash
curl -s https://card-drawer.hillmanchan.com/games/card-drawer/hand-eval.js | grep -c "countOuts"
```

Expected: `≥ 1` (new code live). Optionally spot-check the page in a browser at `https://card-drawer.hillmanchan.com`.
