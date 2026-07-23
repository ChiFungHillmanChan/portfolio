# Card Drawer v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional card-effects game mode (rank → ability), replace the scrolling player-panel stack with a no-scroll tile grid, and move the Random/Pick draw-mode choice into the setup screen.

**Architecture:** Two new pure modules join the existing pattern (`hand-eval.js`, `card-svg.js`): `effects.js` (effect catalog, draw-chain resolution, atomic undo) and `state.js` (state shape, save validation, v1→v2 migration), both under `node --test`. `game.js` stays the only DOM module and only wires UI. Spec: `docs/superpowers/specs/2026-07-23-card-drawer-v3-design.md`.

**Tech Stack:** Vanilla JS ES modules, no dependencies, no build step. Tests: `node --test`. PWA service worker with strict-JSON `CACHE`/`ASSETS` consts.

## Global Constraints

- Working directory for all commands: the worktree root `/Users/hillmanchan/Desktop/HillmanChan_portfolio/.claude/worktrees/card-drawer-v3` (paths below are relative to it).
- Game test command (run from `portfolio/public/games/card-drawer/`): `node --test '*.test.js'` — glob form, NOT bare `node --test` (dir discovery broken on Node 22.22).
- PWA test command (run from `portfolio/public/games/`): `node --test pwa.test.mjs`.
- **No emoji anywhere in UI** — inline SVG paths only (existing `ICONS` pattern).
- Every user-provided string rendered into HTML goes through `esc()`.
- `sw.js` `CACHE` and `ASSETS` must stay strict JSON (double quotes) — `pwa.test.mjs` parses them. Any shipped-file change requires a `CACHE` bump.
- Storage: new key `card-drawer:v2`; legacy key `card-drawer:v1` migrated read-only (effects off), then removed.
- Jokers never carry effects; only deck draws trigger effects; drawn card always stays in the drawer's hand.
- Tiles render in seat order and never re-sort; board must fit `100dvh` without page scroll during play.
- Touch targets: keep `min-height: var(--tap)` (44px) for primary buttons; tile Deal buttons may compress to 40px.
- Commit after every task; branch `worktree-card-drawer-v3`.

---

### Task 1: `effects.js` — catalog, `effectForCard`, `legalTargets`, `beginRecord`

**Files:**
- Create: `portfolio/public/games/card-drawer/effects.js`
- Test: `portfolio/public/games/card-drawer/effects.test.js`

**Interfaces:**
- Consumes: card objects `{id, rank, suit}` / `{id, joker: true}` from `hand-eval.js`'s `createDeck()`; state objects shaped like `state.js` `defaultState()` (Task 5) — but only the fields `effectsEnabled`, `effectMap`, `players`, `deck`, `graveyard`.
- Produces (used by Tasks 2–4, 5, 7, 9):
  - `EFFECTS: {[id]: {label, desc, needsTarget}}`
  - `EFFECT_IDS: string[]` — picker order `['sabotage','bonus','burn','steal','swap','shield']`
  - `DEFAULT_EFFECT_MAP: {2:'sabotage', 7:'bonus', 11:'burn'}` (numeric rank keys; 11 = J)
  - `effectForCard(state, card) -> string|null`
  - `legalTargets(state, drawerId) -> player[]`
  - `beginRecord(playerId, via, cardId, deckIndex) -> ActionRecord` where ActionRecord = `{playerId, via:'deal'|'pick', steps:[{kind:'draw', cardId, deckIndex}], queue:[cardId]}`

- [ ] **Step 1: Write the failing test**

Create `portfolio/public/games/card-drawer/effects.test.js`:

```js
// Tests for the effects engine. States are hand-built plain objects — the
// engine must never touch DOM or module state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from './hand-eval.js';
import {
  EFFECTS,
  EFFECT_IDS,
  DEFAULT_EFFECT_MAP,
  effectForCard,
  legalTargets,
  beginRecord,
} from './effects.js';

const FULL_DECK = createDeck({ includeJokers: true });
export const card = (id) => {
  const found = FULL_DECK.find((c) => c.id === id);
  assert.ok(found, `unknown card id ${id}`);
  return found;
};

export function makeState(overrides = {}) {
  return {
    phase: 'playing',
    includeJokers: false,
    drawMode: 'random',
    effectsEnabled: true,
    effectMap: { ...DEFAULT_EFFECT_MAP },
    players: [],
    deck: [],
    graveyard: [],
    history: [],
    pending: null,
    ...overrides,
  };
}

export const seat = (id, name, ids = [], shield = false) => ({
  id,
  name,
  cards: ids.map(card),
  shield,
});

// Deterministic rng: yields the given values in order, repeats the last.
export const rig = (...vals) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};

test('catalog: six effects, picker order, default preset', () => {
  assert.deepEqual(EFFECT_IDS, ['sabotage', 'bonus', 'burn', 'steal', 'swap', 'shield']);
  for (const id of EFFECT_IDS) {
    assert.ok(EFFECTS[id].label && EFFECTS[id].desc, `${id} needs label + desc`);
    assert.equal(typeof EFFECTS[id].needsTarget, 'boolean');
  }
  assert.equal(EFFECTS.sabotage.needsTarget, true);
  assert.equal(EFFECTS.steal.needsTarget, true);
  assert.equal(EFFECTS.swap.needsTarget, true);
  assert.equal(EFFECTS.bonus.needsTarget, false);
  assert.equal(EFFECTS.burn.needsTarget, false);
  assert.equal(EFFECTS.shield.needsTarget, false);
  assert.deepEqual(DEFAULT_EFFECT_MAP, { 2: 'sabotage', 7: 'bonus', 11: 'burn' });
});

test('effectForCard: mapped rank, unmapped rank, joker, disabled', () => {
  const state = makeState();
  assert.equal(effectForCard(state, card('2S')), 'sabotage');
  assert.equal(effectForCard(state, card('7H')), 'bonus');
  assert.equal(effectForCard(state, card('JD')), 'burn');
  assert.equal(effectForCard(state, card('KC')), null);
  assert.equal(effectForCard(state, card('JOKER-1')), null);
  assert.equal(effectForCard(makeState({ effectsEnabled: false }), card('2S')), null);
});

test('legalTargets: excludes drawer and empty hands, includes shielded', () => {
  const state = makeState({
    players: [
      seat(1, 'Anna', ['2S']),
      seat(2, 'Ben', ['KH'], true),
      seat(3, 'Carol', []),
    ],
  });
  assert.deepEqual(legalTargets(state, 1).map((p) => p.id), [2]);
});

test('beginRecord: draw step + queue seeded with the drawn card', () => {
  assert.deepEqual(beginRecord(1, 'pick', '2S', 7), {
    playerId: 1,
    via: 'pick',
    steps: [{ kind: 'draw', cardId: '2S', deckIndex: 7 }],
    queue: ['2S'],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: FAIL — `Cannot find module ... effects.js` (existing 66 tests still pass).

- [ ] **Step 3: Write minimal implementation**

Create `portfolio/public/games/card-drawer/effects.js`:

```js
// Card Drawer — effects engine. Pure logic: no DOM, no module state. Operates
// on the state shape owned by state.js; every mutation is captured as a step
// in an ActionRecord so undoRecord can reverse it exactly.

export const EFFECTS = {
  sabotage: {
    label: 'Sabotage',
    desc: 'Destroy a random card from a player you choose.',
    needsTarget: true,
  },
  bonus: {
    label: 'Bonus draw',
    desc: 'Immediately draw one extra card.',
    needsTarget: false,
  },
  burn: {
    label: 'Deck burn',
    desc: 'Reveal and destroy a random card from the deck.',
    needsTarget: false,
  },
  steal: {
    label: 'Steal',
    desc: 'Take a random card from a player you choose.',
    needsTarget: true,
  },
  swap: {
    label: 'Swap hands',
    desc: 'Trade entire hands with a player you choose.',
    needsTarget: true,
  },
  shield: {
    label: 'Shield',
    desc: 'Block the next effect aimed at you.',
    needsTarget: false,
  },
};

export const EFFECT_IDS = ['sabotage', 'bonus', 'burn', 'steal', 'swap', 'shield'];

// 11 = J. Loaded the first time effects are enabled; users tweak from there.
export const DEFAULT_EFFECT_MAP = { 2: 'sabotage', 7: 'bonus', 11: 'burn' };

const findPlayer = (state, id) => state.players.find((p) => p.id === id);

// Effect id carried by a drawn card, or null. Jokers never carry effects.
export function effectForCard(state, card) {
  if (!state.effectsEnabled || !card || card.joker) return null;
  return state.effectMap[card.rank] || null;
}

// Opponents choosable for sabotage / steal / swap: anyone else holding at
// least one card. Shielded players ARE legal — the shield absorbs the hit.
export function legalTargets(state, drawerId) {
  return state.players.filter((p) => p.id !== drawerId && p.cards.length > 0);
}

// Start an ActionRecord for a card just moved from deck into the drawer's
// hand. deckIndex = the deck position it was removed from (deck.length after
// a top deal), so undo can splice it back exactly.
export function beginRecord(playerId, via, cardId, deckIndex) {
  return {
    playerId,
    via,
    steps: [{ kind: 'draw', cardId, deckIndex }],
    queue: [cardId],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: PASS — 66 + 4 = 70 tests.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/card-drawer/effects.js portfolio/public/games/card-drawer/effects.test.js
git commit -m "feat(card-drawer): effects catalog + targeting + action records"
```

---

### Task 2: `effects.js` — `advanceDraw` (bonus chains, burn, shield, fizzles)

**Files:**
- Modify: `portfolio/public/games/card-drawer/effects.js` (append)
- Test: `portfolio/public/games/card-drawer/effects.test.js` (append)

**Interfaces:**
- Produces: `advanceDraw(state, record, rng = Math.random) -> {status:'done'} | {status:'need-target', effect, cardId}`. Mutates `state` (deck/hands/graveyard/shield) and appends to `record.steps` / `record.queue`. Step kinds added: `bonus-draw`, `burn`, `shield-gain`, `shield-noop`, `fizzle`.

- [ ] **Step 1: Write the failing tests**

Append to `effects.test.js` (add `advanceDraw` to the existing import from `./effects.js`):

```js
test('advanceDraw: plain card resolves with no extra steps', () => {
  const state = makeState({ players: [seat(1, 'Anna', ['KC']), seat(2, 'Ben', ['3H'])] });
  const record = beginRecord(1, 'deal', 'KC', 0);
  assert.deepEqual(advanceDraw(state, record), { status: 'done' });
  assert.equal(record.steps.length, 1);
  assert.deepEqual(record.queue, []);
});

test('advanceDraw: bonus chain 7 -> 7 -> 2 pauses on need-target', () => {
  // Deck bottom->top: 2S, 7D. Bonus pops 7D first (another bonus), then 2S
  // (sabotage) which needs a target because Ben holds a card.
  const state = makeState({
    players: [seat(1, 'Anna', ['7H']), seat(2, 'Ben', ['KH'])],
    deck: [card('2S'), card('7D')],
  });
  const record = beginRecord(1, 'deal', '7H', 2);
  const result = advanceDraw(state, record);
  assert.deepEqual(result, { status: 'need-target', effect: 'sabotage', cardId: '2S' });
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['7H', '7D', '2S']);
  assert.equal(state.deck.length, 0);
  assert.deepEqual(record.steps.map((s) => s.kind), ['draw', 'bonus-draw', 'bonus-draw']);
  assert.deepEqual(record.steps[1], { kind: 'bonus-draw', cardId: '7D', deckIndex: 1 });
  assert.deepEqual(record.steps[2], { kind: 'bonus-draw', cardId: '2S', deckIndex: 0 });
  assert.deepEqual(record.queue, ['2S']);
});

test('advanceDraw: bonus with empty deck fizzles', () => {
  const state = makeState({ players: [seat(1, 'Anna', ['7H']), seat(2, 'Ben', ['KH'])] });
  const record = beginRecord(1, 'deal', '7H', 0);
  assert.deepEqual(advanceDraw(state, record), { status: 'done' });
  assert.deepEqual(record.steps[1], { kind: 'fizzle', effect: 'bonus', cardId: '7H' });
});

test('advanceDraw: burn destroys a rigged deck card into the graveyard', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['JD']), seat(2, 'Ben', ['KH'])],
    deck: [card('4C'), card('9S'), card('QH')],
  });
  const record = beginRecord(1, 'deal', 'JD', 3);
  // rng 0.5 * 3 = index 1 -> 9S
  assert.deepEqual(advanceDraw(state, record, rig(0.5)), { status: 'done' });
  assert.deepEqual(state.deck.map((c) => c.id), ['4C', 'QH']);
  assert.deepEqual(state.graveyard.map((c) => c.id), ['9S']);
  assert.deepEqual(record.steps[1], { kind: 'burn', cardId: 'JD', burnedId: '9S', deckIndex: 1 });
});

test('advanceDraw: burn with empty deck fizzles', () => {
  const state = makeState({ players: [seat(1, 'Anna', ['JD']), seat(2, 'Ben', ['KH'])] });
  const record = beginRecord(1, 'deal', 'JD', 0);
  assert.deepEqual(advanceDraw(state, record), { status: 'done' });
  assert.deepEqual(record.steps[1], { kind: 'fizzle', effect: 'burn', cardId: 'JD' });
});

test('advanceDraw: shield gained once, noop while already shielded', () => {
  const state = makeState({
    effectMap: { 5: 'shield' },
    players: [seat(1, 'Anna', ['5C', '5D']), seat(2, 'Ben', ['KH'])],
  });
  const first = beginRecord(1, 'deal', '5C', 1);
  assert.deepEqual(advanceDraw(state, first), { status: 'done' });
  assert.equal(state.players[0].shield, true);
  assert.deepEqual(first.steps[1], { kind: 'shield-gain', cardId: '5C' });

  const second = beginRecord(1, 'deal', '5D', 0);
  assert.deepEqual(advanceDraw(state, second), { status: 'done' });
  assert.equal(state.players[0].shield, true);
  assert.deepEqual(second.steps[1], { kind: 'shield-noop', cardId: '5D' });
});

test('advanceDraw: targeted effect with no legal target auto-fizzles', () => {
  const state = makeState({ players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', [])] });
  const record = beginRecord(1, 'deal', '2S', 0);
  assert.deepEqual(advanceDraw(state, record), { status: 'done' });
  assert.deepEqual(record.steps[1], { kind: 'fizzle', effect: 'sabotage', cardId: '2S' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: FAIL — `advanceDraw` is not exported.

- [ ] **Step 3: Implement `advanceDraw`**

Append to `effects.js`:

```js
// Process the record's queue until every drawn card's effect is resolved or a
// target choice is required. Immediate effects (bonus/burn/shield) apply here;
// bonus chains by drawing again and queueing the new card.
export function advanceDraw(state, record, rng = Math.random) {
  const player = findPlayer(state, record.playerId);
  while (record.queue.length) {
    const cardId = record.queue[0];
    const drawn = player.cards.find((c) => c.id === cardId);
    const effect = drawn ? effectForCard(state, drawn) : null;
    if (!effect) {
      record.queue.shift();
      continue;
    }
    if (EFFECTS[effect].needsTarget) {
      if (legalTargets(state, record.playerId).length === 0) {
        record.steps.push({ kind: 'fizzle', effect, cardId });
        record.queue.shift();
        continue;
      }
      return { status: 'need-target', effect, cardId };
    }
    if (effect === 'bonus') {
      if (state.deck.length === 0) {
        record.steps.push({ kind: 'fizzle', effect, cardId });
      } else {
        const extra = state.deck.pop();
        player.cards.push(extra);
        record.steps.push({ kind: 'bonus-draw', cardId: extra.id, deckIndex: state.deck.length });
        record.queue.push(extra.id);
      }
    } else if (effect === 'burn') {
      if (state.deck.length === 0) {
        record.steps.push({ kind: 'fizzle', effect, cardId });
      } else {
        const i = Math.floor(rng() * state.deck.length);
        const [burned] = state.deck.splice(i, 1);
        state.graveyard.push(burned);
        record.steps.push({ kind: 'burn', cardId, burnedId: burned.id, deckIndex: i });
      }
    } else if (effect === 'shield') {
      record.steps.push({ kind: player.shield ? 'shield-noop' : 'shield-gain', cardId });
      player.shield = true;
    }
    record.queue.shift();
  }
  return { status: 'done' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: PASS — 77 tests.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/card-drawer/effects.js portfolio/public/games/card-drawer/effects.test.js
git commit -m "feat(card-drawer): advanceDraw — bonus chains, burn, shield, fizzles"
```

---

### Task 3: `effects.js` — `applyTarget` (sabotage / steal / swap / shield block)

**Files:**
- Modify: `portfolio/public/games/card-drawer/effects.js` (append)
- Test: `portfolio/public/games/card-drawer/effects.test.js` (append)

**Interfaces:**
- Produces: `applyTarget(state, record, targetId, rng = Math.random)` — resolves the queue-head targeted effect against `targetId`, then returns `advanceDraw(...)` to continue any chain. Invalid target → returns `{status:'need-target', effect, cardId}` without mutating. Step kinds added: `sabotage`, `steal`, `swap`, `blocked`.

- [ ] **Step 1: Write the failing tests**

Append to `effects.test.js` (add `applyTarget` to the import):

```js
test('applyTarget: sabotage destroys a rigged card from the chosen hand', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', ['KH', 'QD', '9C'])],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  // rng 0.5 * 3 = index 1 -> QD
  assert.deepEqual(applyTarget(state, record, 2, rig(0.5)), { status: 'done' });
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH', '9C']);
  assert.deepEqual(state.graveyard.map((c) => c.id), ['QD']);
  assert.deepEqual(record.steps[1], {
    kind: 'sabotage', cardId: '2S', targetId: 2, destroyedId: 'QD', targetIndex: 1,
  });
  assert.deepEqual(record.queue, []);
});

test('applyTarget: steal moves a rigged card into the drawer hand', () => {
  const state = makeState({
    effectMap: { 10: 'steal' },
    players: [seat(1, 'Anna', ['10S']), seat(2, 'Ben', ['KH', 'QD'])],
  });
  const record = beginRecord(1, 'deal', '10S', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2, rig(0)), { status: 'done' });
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['10S', 'KH']);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['QD']);
  assert.deepEqual(record.steps[1], {
    kind: 'steal', cardId: '10S', targetId: 2, stolenId: 'KH', targetIndex: 0,
  });
});

test('applyTarget: swap trades entire hands and records both id lists', () => {
  const state = makeState({
    effectMap: { 12: 'swap' },
    players: [seat(1, 'Anna', ['QS', '3C']), seat(2, 'Ben', ['KH'])],
  });
  const record = beginRecord(1, 'deal', 'QS', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2), { status: 'done' });
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['KH']);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['QS', '3C']);
  assert.deepEqual(record.steps[1], {
    kind: 'swap', cardId: 'QS', targetId: 2,
    drawerCardIds: ['QS', '3C'], targetCardIds: ['KH'],
  });
});

test('applyTarget: shield absorbs the hit and breaks', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', ['KH'], true)],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2), { status: 'done' });
  assert.equal(state.players[1].shield, false);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH']);
  assert.deepEqual(record.steps[1], { kind: 'blocked', effect: 'sabotage', cardId: '2S', targetId: 2 });
});

test('applyTarget: invalid target keeps the prompt open, mutates nothing', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', ['KH']), seat(3, 'Carol', [])],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  // Carol has no cards; the drawer can't target themself either.
  assert.equal(applyTarget(state, record, 3).status, 'need-target');
  assert.equal(applyTarget(state, record, 1).status, 'need-target');
  assert.equal(record.steps.length, 1);
  assert.deepEqual(record.queue, ['2S']);
});

test('applyTarget: chain continues after the target resolves', () => {
  // Mid-chain state: Anna's 7H already bonus-drew 2S (sabotage), which is the
  // queue head. After the target resolves, advanceDraw finishes the record
  // without touching the rest of the deck.
  const state = makeState({
    players: [seat(1, 'Anna', ['7H', '2S']), seat(2, 'Ben', ['KH', 'QD'])],
    deck: [card('4C')],
  });
  const record = beginRecord(1, 'deal', '7H', 1);
  // Simulate mid-chain: 7H drew 2S already, 2S is queue head, 7H consumed.
  record.steps.push({ kind: 'bonus-draw', cardId: '2S', deckIndex: 1 });
  record.queue = ['2S'];
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2, rig(0)), { status: 'done' });
  // Sabotage took KH, then nothing else was queued, done with 4C untouched.
  assert.deepEqual(state.graveyard.map((c) => c.id), ['KH']);
  assert.deepEqual(state.deck.map((c) => c.id), ['4C']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: FAIL — `applyTarget` is not exported.

- [ ] **Step 3: Implement `applyTarget`**

Append to `effects.js`:

```js
// Resolve the queue-head targeted effect with the chosen opponent, then
// continue the chain via advanceDraw. An illegal target (self, empty hand,
// unknown id) returns need-target unchanged so the prompt stays open.
export function applyTarget(state, record, targetId, rng = Math.random) {
  const player = findPlayer(state, record.playerId);
  const cardId = record.queue[0];
  const drawn = player.cards.find((c) => c.id === cardId);
  const effect = drawn ? effectForCard(state, drawn) : null;
  const target = legalTargets(state, record.playerId).find((p) => p.id === targetId);
  if (!effect || !EFFECTS[effect].needsTarget || !target) {
    return { status: 'need-target', effect, cardId };
  }
  if (target.shield) {
    target.shield = false;
    record.steps.push({ kind: 'blocked', effect, cardId, targetId });
  } else if (effect === 'sabotage') {
    const i = Math.floor(rng() * target.cards.length);
    const [destroyed] = target.cards.splice(i, 1);
    state.graveyard.push(destroyed);
    record.steps.push({ kind: 'sabotage', cardId, targetId, destroyedId: destroyed.id, targetIndex: i });
  } else if (effect === 'steal') {
    const i = Math.floor(rng() * target.cards.length);
    const [stolen] = target.cards.splice(i, 1);
    player.cards.push(stolen);
    record.steps.push({ kind: 'steal', cardId, targetId, stolenId: stolen.id, targetIndex: i });
  } else if (effect === 'swap') {
    const drawerCardIds = player.cards.map((c) => c.id);
    const targetCardIds = target.cards.map((c) => c.id);
    const tmp = player.cards;
    player.cards = target.cards;
    target.cards = tmp;
    record.steps.push({ kind: 'swap', cardId, targetId, drawerCardIds, targetCardIds });
  }
  record.queue.shift();
  return advanceDraw(state, record, rng);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: PASS — 83 tests.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/card-drawer/effects.js portfolio/public/games/card-drawer/effects.test.js
git commit -m "feat(card-drawer): applyTarget — sabotage, steal, swap, shield block"
```

---

### Task 4: `effects.js` — `undoRecord` (atomic, deterministic reversal)

**Files:**
- Modify: `portfolio/public/games/card-drawer/effects.js` (append)
- Test: `portfolio/public/games/card-drawer/effects.test.js` (append)

**Interfaces:**
- Produces: `undoRecord(state, record)` — reverses every step newest-first using the indices materialized at apply time. Defensive: a step whose card can't be found is skipped (corrupted-save safety), never throws.

- [ ] **Step 1: Write the failing tests**

Append to `effects.test.js` (add `undoRecord` to the import):

```js
test('undoRecord: plain draw returns the card to its deck position', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['KC']), seat(2, 'Ben', ['3H'])],
    deck: [card('4C'), card('9S')],
  });
  // KC was picked from index 1 (between 4C and 9S).
  const record = beginRecord(1, 'pick', 'KC', 1);
  advanceDraw(state, record);
  undoRecord(state, record);
  assert.deepEqual(state.players[0].cards, []);
  assert.deepEqual(state.deck.map((c) => c.id), ['4C', 'KC', '9S']);
});

test('undoRecord: full chain (bonus, bonus, sabotage) restores everything', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['7H']), seat(2, 'Ben', ['KH'])],
    deck: [card('2S'), card('7D')],
  });
  const record = beginRecord(1, 'deal', '7H', 2);
  assert.equal(advanceDraw(state, record).status, 'need-target');
  assert.deepEqual(applyTarget(state, record, 2, rig(0)), { status: 'done' });
  assert.deepEqual(state.graveyard.map((c) => c.id), ['KH']);

  undoRecord(state, record);
  assert.deepEqual(state.players[0].cards, []);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH']);
  assert.deepEqual(state.graveyard, []);
  // 2S and 7D back at their original indices, 7H back on top.
  assert.deepEqual(state.deck.map((c) => c.id), ['2S', '7D', '7H']);
});

test('undoRecord: swap restores both hands in original order', () => {
  const state = makeState({
    effectMap: { 12: 'swap' },
    players: [seat(1, 'Anna', ['QS', '3C']), seat(2, 'Ben', ['KH'])],
    deck: [],
  });
  const record = beginRecord(1, 'deal', 'QS', 0);
  advanceDraw(state, record);
  applyTarget(state, record, 2);
  undoRecord(state, record);
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['3C']);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH']);
  assert.deepEqual(state.deck.map((c) => c.id), ['QS']);
});

test('undoRecord: blocked restores the broken shield; shield-gain removes it', () => {
  const state = makeState({
    players: [seat(1, 'Anna', ['2S']), seat(2, 'Ben', ['KH'], true)],
  });
  const record = beginRecord(1, 'deal', '2S', 0);
  advanceDraw(state, record);
  applyTarget(state, record, 2);
  assert.equal(state.players[1].shield, false);
  undoRecord(state, record);
  assert.equal(state.players[1].shield, true);

  const state2 = makeState({
    effectMap: { 5: 'shield' },
    players: [seat(1, 'Anna', ['5C']), seat(2, 'Ben', ['KH'])],
  });
  const record2 = beginRecord(1, 'deal', '5C', 0);
  advanceDraw(state2, record2);
  assert.equal(state2.players[0].shield, true);
  undoRecord(state2, record2);
  assert.equal(state2.players[0].shield, false);
});

test('undoRecord: steal returns the card to its original slot', () => {
  const state = makeState({
    effectMap: { 10: 'steal' },
    players: [seat(1, 'Anna', ['10S']), seat(2, 'Ben', ['KH', 'QD'])],
  });
  const record = beginRecord(1, 'deal', '10S', 0);
  advanceDraw(state, record);
  applyTarget(state, record, 2, rig(0.9)); // index 1 -> QD
  assert.deepEqual(state.players[0].cards.map((c) => c.id), ['10S', 'QD']);
  undoRecord(state, record);
  assert.deepEqual(state.players[0].cards, []);
  assert.deepEqual(state.players[1].cards.map((c) => c.id), ['KH', 'QD']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: FAIL — `undoRecord` is not exported.

- [ ] **Step 3: Implement `undoRecord`**

Append to `effects.js`:

```js
// Reverse every step of a record, newest first. Indices recorded at apply
// time restore exact positions, so undo never re-randomizes. Defensive
// against corrupted saves: a step whose card can't be found is skipped.
export function undoRecord(state, record) {
  const player = findPlayer(state, record.playerId);
  const takeById = (arr, id) => {
    const i = arr.findIndex((c) => c.id === id);
    return i === -1 ? null : arr.splice(i, 1)[0];
  };
  for (let s = record.steps.length - 1; s >= 0; s--) {
    const step = record.steps[s];
    const target = step.targetId !== undefined ? findPlayer(state, step.targetId) : null;
    switch (step.kind) {
      case 'draw':
      case 'bonus-draw': {
        const drawn = takeById(player.cards, step.cardId);
        if (drawn) state.deck.splice(step.deckIndex, 0, drawn);
        break;
      }
      case 'burn': {
        const burned = takeById(state.graveyard, step.burnedId);
        if (burned) state.deck.splice(step.deckIndex, 0, burned);
        break;
      }
      case 'sabotage': {
        const destroyed = takeById(state.graveyard, step.destroyedId);
        if (destroyed && target) target.cards.splice(step.targetIndex, 0, destroyed);
        break;
      }
      case 'steal': {
        const stolen = takeById(player.cards, step.stolenId);
        if (stolen && target) target.cards.splice(step.targetIndex, 0, stolen);
        break;
      }
      case 'swap': {
        if (target) {
          const byId = new Map(player.cards.concat(target.cards).map((c) => [c.id, c]));
          player.cards = step.drawerCardIds.map((id) => byId.get(id)).filter(Boolean);
          target.cards = step.targetCardIds.map((id) => byId.get(id)).filter(Boolean);
        }
        break;
      }
      case 'shield-gain':
        player.shield = false;
        break;
      case 'blocked':
        if (target) target.shield = true;
        break;
      default:
        break; // shield-noop, fizzle — nothing to reverse
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: PASS — 88 tests.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/card-drawer/effects.js portfolio/public/games/card-drawer/effects.test.js
git commit -m "feat(card-drawer): undoRecord — atomic deterministic reversal"
```

---

### Task 5: `state.js` — state shape, v2 validation, v1 migration

**Files:**
- Create: `portfolio/public/games/card-drawer/state.js`
- Test: `portfolio/public/games/card-drawer/state.test.js`

**Interfaces:**
- Consumes: `createDeck` from `./hand-eval.js`; `EFFECTS`, `DEFAULT_EFFECT_MAP` from `./effects.js`.
- Produces (used by `game.js` in Task 6):
  - `STORAGE_KEY = 'card-drawer:v2'`, `LEGACY_STORAGE_KEY = 'card-drawer:v1'`
  - `MAX_PLAYERS = 10`, `MIN_PLAYERS = 2` (moved out of game.js)
  - `defaultState() -> state` (v2 shape with `effectsEnabled`, `effectMap`, `graveyard`, `pending`, players carry `shield`)
  - `normalizeState(parsed) -> state|null`
  - `migrateLegacy(parsedV1) -> state|null`

- [ ] **Step 1: Write the failing tests**

Create `portfolio/public/games/card-drawer/state.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, shuffle } from './hand-eval.js';
import { DEFAULT_EFFECT_MAP } from './effects.js';
import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  defaultState,
  normalizeState,
  migrateLegacy,
} from './state.js';

test('constants and default state shape', () => {
  assert.equal(STORAGE_KEY, 'card-drawer:v2');
  assert.equal(LEGACY_STORAGE_KEY, 'card-drawer:v1');
  assert.equal(MAX_PLAYERS, 10);
  assert.equal(MIN_PLAYERS, 2);
  const s = defaultState();
  assert.equal(s.phase, 'setup');
  assert.equal(s.effectsEnabled, false);
  assert.deepEqual(s.effectMap, DEFAULT_EFFECT_MAP);
  assert.deepEqual(s.graveyard, []);
  assert.equal(s.pending, null);
});

// A valid mid-game v2 state: every card in exactly one pile.
function playingState() {
  const deck = createDeck();
  const hand1 = deck.slice(0, 3);
  const hand2 = deck.slice(3, 5);
  const grave = deck.slice(5, 6);
  const rest = deck.slice(6);
  return {
    phase: 'playing',
    includeJokers: false,
    drawMode: 'random',
    effectsEnabled: true,
    effectMap: { ...DEFAULT_EFFECT_MAP },
    players: [
      { id: 1, name: 'Anna', cards: hand1, shield: true },
      { id: 2, name: 'Ben', cards: hand2, shield: false },
    ],
    deck: rest,
    graveyard: grave,
    history: [
      {
        playerId: 1,
        via: 'deal',
        steps: [{ kind: 'draw', cardId: hand1[0].id, deckIndex: 51 }],
        queue: [],
      },
    ],
    pending: null,
  };
}

test('normalizeState: accepts a valid playing state round-trip', () => {
  const clean = normalizeState(JSON.parse(JSON.stringify(playingState())));
  assert.ok(clean);
  assert.equal(clean.players[0].shield, true);
  assert.equal(clean.graveyard.length, 1);
  assert.equal(clean.history.length, 1);
});

test('normalizeState: rejects a card present in both hand and graveyard', () => {
  const s = playingState();
  s.graveyard = [s.players[0].cards[0]];
  assert.equal(normalizeState(JSON.parse(JSON.stringify(s))), null);
});

test('normalizeState: rejects playing state with a missing card', () => {
  const s = playingState();
  s.deck = s.deck.slice(1); // one card vanished entirely
  assert.equal(normalizeState(JSON.parse(JSON.stringify(s))), null);
});

test('normalizeState: rejects unknown effect ids and bad ranks', () => {
  const good = playingState();
  const bad1 = { ...good, effectMap: { 2: 'explode' } };
  const bad2 = { ...good, effectMap: { 99: 'sabotage' } };
  assert.equal(normalizeState(JSON.parse(JSON.stringify(bad1))), null);
  assert.equal(normalizeState(JSON.parse(JSON.stringify(bad2))), null);
});

test('normalizeState: history record with unfinished queue is rejected', () => {
  const s = playingState();
  s.history[0].queue = [s.players[0].cards[0].id];
  assert.equal(normalizeState(JSON.parse(JSON.stringify(s))), null);
});

test('normalizeState: valid pending record is kept', () => {
  const s = playingState();
  s.pending = {
    playerId: 1,
    via: 'deal',
    steps: [{ kind: 'draw', cardId: s.players[0].cards[0].id, deckIndex: 51 }],
    queue: [s.players[0].cards[0].id],
  };
  const clean = normalizeState(JSON.parse(JSON.stringify(s)));
  assert.ok(clean);
  assert.equal(clean.pending.playerId, 1);
  assert.deepEqual(clean.pending.queue, [s.players[0].cards[0].id]);
});

test('migrateLegacy: v1 save becomes v2 with effects off and typed history', () => {
  const deck = shuffle(createDeck());
  const drawn = deck.pop();
  const v1 = {
    phase: 'playing',
    includeJokers: false,
    drawMode: 'manual',
    players: [
      { id: 1, name: 'Anna', cards: [drawn] },
      { id: 2, name: 'Ben', cards: deck.splice(0, 1) },
    ],
    deck,
    history: [{ playerId: 1, cardId: drawn.id }],
  };
  const v2 = migrateLegacy(JSON.parse(JSON.stringify(v1)));
  assert.ok(v2);
  assert.equal(v2.effectsEnabled, false);
  assert.deepEqual(v2.effectMap, DEFAULT_EFFECT_MAP);
  assert.deepEqual(v2.graveyard, []);
  assert.equal(v2.pending, null);
  assert.equal(v2.players[0].shield, false);
  assert.equal(v2.history.length, 1);
  assert.equal(v2.history[0].steps[0].kind, 'draw');
  assert.equal(v2.history[0].steps[0].cardId, drawn.id);
});

test('migrateLegacy: garbage input returns null', () => {
  assert.equal(migrateLegacy(null), null);
  assert.equal(migrateLegacy({ phase: 'nope' }), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: FAIL — `Cannot find module ... state.js`.

- [ ] **Step 3: Implement `state.js`**

Create `portfolio/public/games/card-drawer/state.js`:

```js
// Card Drawer — state shape, save validation, legacy migration. Pure: no DOM,
// no storage access (game.js owns localStorage and rendering).

import { createDeck } from './hand-eval.js';
import { EFFECTS, DEFAULT_EFFECT_MAP } from './effects.js';

export const STORAGE_KEY = 'card-drawer:v2';
export const LEGACY_STORAGE_KEY = 'card-drawer:v1';
export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;

export function defaultState() {
  return {
    phase: 'setup',
    includeJokers: false,
    drawMode: 'random',
    effectsEnabled: false,
    effectMap: { ...DEFAULT_EFFECT_MAP },
    players: [],
    deck: [],
    graveyard: [],
    history: [],
    pending: null,
  };
}

const STEP_KINDS = new Set([
  'draw', 'bonus-draw', 'burn', 'sabotage', 'steal', 'swap',
  'shield-gain', 'shield-noop', 'blocked', 'fizzle',
]);

function normalizeEffectMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const map = {};
  for (const [key, value] of Object.entries(raw)) {
    const rank = Number(key);
    if (!Number.isInteger(rank) || rank < 2 || rank > 14) return null;
    if (!EFFECTS[value]) return null;
    map[rank] = value;
  }
  return map;
}

// Structural check of an ActionRecord. Card ids are only matched against
// piles at undo time (defensively), so this validates shape + indices.
function normalizeRecord(raw, playerIds) {
  if (!raw || typeof raw !== 'object') return null;
  if (!playerIds.has(raw.playerId)) return null;
  if (raw.via !== 'deal' && raw.via !== 'pick') return null;
  if (!Array.isArray(raw.steps) || !raw.steps.length || !Array.isArray(raw.queue)) return null;
  if (!raw.queue.every((id) => typeof id === 'string')) return null;
  for (const step of raw.steps) {
    if (!step || !STEP_KINDS.has(step.kind)) return null;
    if (typeof step.cardId !== 'string') return null;
    if (['sabotage', 'steal', 'swap', 'blocked'].includes(step.kind)) {
      if (!playerIds.has(step.targetId)) return null;
    } else if (step.targetId !== undefined) return null;
    if (['draw', 'bonus-draw', 'burn'].includes(step.kind)) {
      if (!Number.isInteger(step.deckIndex) || step.deckIndex < 0) return null;
    }
    if (['sabotage', 'steal'].includes(step.kind)) {
      if (!Number.isInteger(step.targetIndex) || step.targetIndex < 0) return null;
    }
    if (step.kind === 'burn' && typeof step.burnedId !== 'string') return null;
    if (step.kind === 'sabotage' && typeof step.destroyedId !== 'string') return null;
    if (step.kind === 'steal' && typeof step.stolenId !== 'string') return null;
    if (step.kind === 'swap') {
      const strings = (a) => Array.isArray(a) && a.every((id) => typeof id === 'string');
      if (!strings(step.drawerCardIds) || !strings(step.targetCardIds)) return null;
    }
  }
  return {
    playerId: raw.playerId,
    via: raw.via,
    steps: raw.steps.map((s) => ({ ...s })),
    queue: raw.queue.slice(),
  };
}

// Validate the shape and card integrity of a stored v2 state; returns a clean
// state (cards re-mapped onto canonical deck objects) or null.
export function normalizeState(s) {
  if (!s || typeof s !== 'object') return null;
  if (s.phase !== 'setup' && s.phase !== 'playing') return null;
  if (s.drawMode !== 'random' && s.drawMode !== 'manual') return null;
  if (typeof s.includeJokers !== 'boolean') return null;
  if (typeof s.effectsEnabled !== 'boolean') return null;
  const effectMap = normalizeEffectMap(s.effectMap);
  if (!effectMap) return null;
  if (!Array.isArray(s.players) || s.players.length > MAX_PLAYERS) return null;
  if (!Array.isArray(s.deck) || !Array.isArray(s.graveyard) || !Array.isArray(s.history)) return null;

  const universe = new Map(
    createDeck({ includeJokers: s.includeJokers }).map((card) => [card.id, card])
  );
  const seen = new Set();
  const mapCard = (card) => {
    if (!card || typeof card.id !== 'string') return null;
    if (!universe.has(card.id) || seen.has(card.id)) return null;
    seen.add(card.id);
    return universe.get(card.id);
  };

  const players = [];
  for (const p of s.players) {
    if (!p || typeof p.id !== 'number' || typeof p.name !== 'string' || !p.name.trim()) return null;
    if (!Array.isArray(p.cards)) return null;
    const cards = p.cards.map(mapCard);
    if (cards.some((card) => card === null)) return null;
    players.push({ id: p.id, name: p.name.trim().slice(0, 24), cards, shield: p.shield === true });
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) return null;

  const deck = s.deck.map(mapCard);
  if (deck.some((card) => card === null)) return null;
  const graveyard = s.graveyard.map(mapCard);
  if (graveyard.some((card) => card === null)) return null;

  if (s.phase === 'playing') {
    if (players.length < MIN_PLAYERS) return null;
    if (seen.size !== universe.size) return null; // deck + hands + graveyard = every card
  }

  const playerIds = new Set(players.map((p) => p.id));
  const history = [];
  for (const h of s.history) {
    const record = normalizeRecord(h, playerIds);
    if (!record || record.queue.length) return null; // history records are complete
    history.push(record);
  }

  let pending = null;
  if (s.pending !== null && s.pending !== undefined) {
    if (s.phase !== 'playing') return null;
    pending = normalizeRecord(s.pending, playerIds);
    if (!pending || !pending.queue.length) return null;
  }

  return {
    phase: s.phase,
    includeJokers: s.includeJokers,
    drawMode: s.drawMode,
    effectsEnabled: s.effectsEnabled,
    effectMap,
    players,
    deck,
    graveyard,
    history,
    pending,
  };
}

// One-time upgrade of a card-drawer:v1 save: effects off, empty graveyard, no
// shields. Legacy {playerId, cardId} history entries become single-step draw
// records whose deckIndex clamps to the deck end — undo pushes the card back
// on top, exactly the v1 behavior.
export function migrateLegacy(v1) {
  if (!v1 || typeof v1 !== 'object') return null;
  const deckLength = Array.isArray(v1.deck) ? v1.deck.length : 0;
  return normalizeState({
    phase: v1.phase,
    includeJokers: v1.includeJokers,
    drawMode: v1.drawMode,
    effectsEnabled: false,
    effectMap: { ...DEFAULT_EFFECT_MAP },
    players: Array.isArray(v1.players)
      ? v1.players.map((p) => (p && typeof p === 'object' ? { ...p, shield: false } : p))
      : v1.players,
    deck: v1.deck,
    graveyard: [],
    history: Array.isArray(v1.history)
      ? v1.history.map((h) => ({
          playerId: h ? h.playerId : undefined,
          via: 'deal',
          steps: [{ kind: 'draw', cardId: h ? h.cardId : undefined, deckIndex: deckLength }],
          queue: [],
        }))
      : v1.history,
    pending: null,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: PASS — 97 tests.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/card-drawer/state.js portfolio/public/games/card-drawer/state.test.js
git commit -m "feat(card-drawer): state.js — v2 shape, validation, v1 migration"
```

---

### Task 6: `game.js` — adopt `state.js`, v2 storage + migration boot

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js`

**Interfaces:**
- Consumes: everything Task 5 produces.
- Produces: `game.js` no longer defines `STORAGE_KEY`, `MAX_PLAYERS`, `MIN_PLAYERS`, `defaultState`, `normalizeState` locally. `saveState`/`clearSaved`/`loadSaved` use the v2 key; `loadSaved` falls back to migrating the v1 key once, then deletes it. No behavior change visible to users yet.

- [ ] **Step 1: Replace imports and delete moved code**

In `game.js`:

Replace the import block (lines 1–5):

```js
// Card Drawer — UI + state wiring. Pure logic lives in hand-eval.js (poker),
// effects.js (card effects), state.js (shape + persistence) and card-svg.js
// (rendering); this module only composes them and manages the DOM.

import { createDeck, shuffle, evaluateHand, compareScores, countOuts, rankLabel, RANKS } from './hand-eval.js';
import { renderCardSVG } from './card-svg.js';
import {
  EFFECTS,
  EFFECT_IDS,
  effectForCard,
  legalTargets,
  beginRecord,
  advanceDraw,
  applyTarget,
  undoRecord,
} from './effects.js';
import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  defaultState,
  normalizeState,
  migrateLegacy,
} from './state.js';
```

Delete from `game.js`:
- `const STORAGE_KEY = 'card-drawer:v1';`, `const MAX_PLAYERS = 10;`, `const MIN_PLAYERS = 2;`
- the whole local `function defaultState() {...}`
- the whole local `function normalizeState(s) {...}` (moved to state.js)

- [ ] **Step 2: Replace `loadSaved` with v2 + migration**

Replace the existing `loadSaved` function:

```js
function loadSaved() {
  const readJson = (key) => {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const v2 = normalizeState(readJson(STORAGE_KEY));
  if (v2) return v2;
  const migrated = migrateLegacy(readJson(LEGACY_STORAGE_KEY));
  if (migrated) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return migrated;
}
```

- [ ] **Step 3: Run tests + manual boot check**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'`
Expected: PASS — 97 tests (game.js has no tests; this guards the pure modules).

Manual check: `cd portfolio/public/games/card-drawer && python3 -m http.server 8123` then open `http://localhost:8123/` — setup screen renders, players can be added, a legacy in-progress save (if any) offers Resume. Stop the server after.

- [ ] **Step 4: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js
git commit -m "refactor(card-drawer): game.js adopts state.js — v2 storage + legacy migration"
```

---

### Task 7: Setup screen — draw-mode section + effects configurator

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js` (`setupScreen`, `dealerBar`, event handlers, `resetGame`)
- Modify: `portfolio/public/games/card-drawer/styles.css` (append)

**Interfaces:**
- Consumes: `EFFECTS`, `EFFECT_IDS`, `RANKS`, `rankLabel`.
- Produces: transient UI field `ui.fxPickerFor` (rank number | null). New data-actions: `set-mode` (setup), `fx-chip`, `fx-assign`; new change hook `data-toggle="effects"`. The in-game `mode` action and `.mode-toggle` markup are REMOVED from `dealerBar` (Task 8 rewrites `dealerBar` fully; here just delete the mode block and its `case 'mode'`).

- [ ] **Step 1: Add UI state and shield icon**

In the `ui` object literal add:

```js
  fxPickerFor: null,
  target: null,
  fxQueue: null,
  prevLeader: null,
```

In `ICONS` add a shield glyph (used by Tasks 7–9):

```js
  shield:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
    '<path d="M12 3 L19 6 V11 C19 15.5 16 19.5 12 21 C8 19.5 5 15.5 5 11 V6 Z" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
```

- [ ] **Step 2: Extend `setupScreen`**

In `setupScreen()`, insert between the Players `</section>` and the Deck section:

```js
    <section class="panel" aria-labelledby="mode-h">
      <h2 id="mode-h">Draw mode</h2>
      <div class="mode-toggle" role="group" aria-label="Draw mode">
        <button class="btn" data-action="set-mode" data-mode="random" aria-pressed="${state.drawMode === 'random'}">Random</button>
        <button class="btn" data-action="set-mode" data-mode="manual" aria-pressed="${state.drawMode === 'manual'}">Pick</button>
      </div>
      <p class="setup-hint">${
        state.drawMode === 'random'
          ? 'Cards are dealt from the top of the shuffled deck.'
          : 'The deck fans out face-down and each player taps a card.'
      }</p>
    </section>
```

After the Deck section (before the Start button), add the effects section builder call `${effectsSection()}` and define the function near `setupScreen`:

```js
// Effect chips are colored per effect id via the fx-<id> class; the picker
// opens inline under the grid for the tapped rank.
function effectsSection() {
  const grid = RANKS.map((rank) => {
    const fx = state.effectMap[rank];
    return (
      `<button class="rank-chip${fx ? ` has-fx fx-${fx}` : ''}${ui.fxPickerFor === rank ? ' open' : ''}"` +
      ` data-action="fx-chip" data-rank="${rank}"` +
      ` aria-label="${rankLabel(rank)}: ${fx ? EFFECTS[fx].label : 'no effect'}">` +
      `${rankLabel(rank)}${fx ? '<span class="fx-dot"></span>' : ''}</button>`
    );
  }).join('');

  let picker = '';
  if (ui.fxPickerFor !== null) {
    const rank = ui.fxPickerFor;
    const current = state.effectMap[rank] || null;
    const options = [
      `<button class="fx-opt${current === null ? ' sel' : ''}" data-action="fx-assign" data-rank="${rank}" data-fx="">` +
        '<strong>None</strong><span>Just a normal card.</span></button>',
      ...EFFECT_IDS.map(
        (id) =>
          `<button class="fx-opt fx-${id}${current === id ? ' sel' : ''}" data-action="fx-assign" data-rank="${rank}" data-fx="${id}">` +
          `<strong>${EFFECTS[id].label}</strong><span>${EFFECTS[id].desc}</span></button>`
      ),
    ].join('');
    picker = `
      <div class="fx-picker" role="group" aria-label="Effect for ${rankLabel(rank)}">
        <p class="fx-picker-title">Effect for <strong>${rankLabel(rank)}</strong></p>
        ${options}
      </div>`;
  }

  return `
    <section class="panel" aria-labelledby="fx-h">
      <h2 id="fx-h">Card effects</h2>
      <div class="toggle-row">
        <div class="toggle-copy">
          <strong>Enable effects</strong>
          <p>Ranks carry abilities that fire when drawn.</p>
        </div>
        <label class="switch">
          <input type="checkbox" data-toggle="effects" ${state.effectsEnabled ? 'checked' : ''}
                 aria-label="Enable card effects" />
          <span class="track"></span><span class="thumb"></span>
        </label>
      </div>
      ${state.effectsEnabled ? `<div class="rank-grid">${grid}</div>${picker}` : ''}
    </section>
  `;
}
```

- [ ] **Step 3: Wire events**

In the click handler `switch`, REMOVE `case 'mode'` and add:

```js
    case 'set-mode':
      state.drawMode = target.dataset.mode === 'manual' ? 'manual' : 'random';
      saveState();
      render();
      break;
    case 'fx-chip': {
      const rank = Number(target.dataset.rank);
      ui.fxPickerFor = ui.fxPickerFor === rank ? null : rank;
      render();
      break;
    }
    case 'fx-assign': {
      const rank = Number(target.dataset.rank);
      if (target.dataset.fx) state.effectMap[rank] = target.dataset.fx;
      else delete state.effectMap[rank];
      ui.fxPickerFor = null;
      saveState();
      render();
      break;
    }
```

In the change handler, after the jokers block, add:

```js
  if (event.target.closest('[data-toggle="effects"]')) {
    state.effectsEnabled = event.target.checked;
    ui.fxPickerFor = null;
    saveState();
    render();
  }
```

In `resetGame()`, carry the new settings (replace the state rebuild line):

```js
  state = {
    ...defaultState(),
    includeJokers: state.includeJokers,
    drawMode: state.drawMode,
    effectsEnabled: state.effectsEnabled,
    effectMap: { ...state.effectMap },
    players: names,
  };
```

(`names` already maps players to `{id, name, cards: []}` — extend that map to `{id, name, cards: [], shield: false}`.)

In `addPlayer()`, initialize the new field — replace the push line:

```js
  state.players.push({ id: nextPlayerId(), name: trimmed, cards: [], shield: false });
```

In `startGame()`, reset the new piles — after the `p.cards = []` loop, replace the body so a new game always starts clean:

```js
function startGame() {
  if (state.players.length < MIN_PLAYERS) return;
  state.players.forEach((p) => {
    p.cards = [];
    p.shield = false;
  });
  state.deck = shuffle(createDeck({ includeJokers: state.includeJokers }));
  state.graveyard = [];
  state.history = [];
  state.pending = null;
  state.phase = 'playing';
  saveState();
  render();
}
```

In `dealerBar()`, DELETE the entire `<div class="mode-toggle">…</div>` block.

- [ ] **Step 4: Styles**

Append to `styles.css`:

```css
/* --- effects configurator (setup) ------------------------------------------ */

:root {
  --fx-sabotage: #d06556;
  --fx-bonus: #6fae7c;
  --fx-burn: #a06ddc;
  --fx-steal: #d3a952;
  --fx-swap: #5f8fd6;
  --fx-shield: #7cc4c9;
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-top: 14px;
}

.rank-chip {
  position: relative;
  min-height: var(--tap);
  border-radius: 8px;
  border: 1px solid var(--ink-faint);
  background: rgba(0, 0, 0, 0.25);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
}

.rank-chip.has-fx { border-color: rgba(211, 169, 82, 0.6); background: rgba(211, 169, 82, 0.14); }
.rank-chip.open { outline: 2px solid var(--brass); outline-offset: 1px; }

.rank-chip .fx-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.rank-chip.fx-sabotage .fx-dot { background: var(--fx-sabotage); }
.rank-chip.fx-bonus .fx-dot { background: var(--fx-bonus); }
.rank-chip.fx-burn .fx-dot { background: var(--fx-burn); }
.rank-chip.fx-steal .fx-dot { background: var(--fx-steal); }
.rank-chip.fx-swap .fx-dot { background: var(--fx-swap); }
.rank-chip.fx-shield .fx-dot { background: var(--fx-shield); }

.fx-picker {
  margin-top: 12px;
  padding: 12px;
  border: 1px dashed rgba(211, 169, 82, 0.4);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fx-picker-title { margin: 0 0 2px; font-size: 14px; color: var(--ink-dim); }

.fx-opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: var(--tap);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--ink-faint);
  background: rgba(0, 0, 0, 0.2);
  color: var(--ink);
  text-align: left;
}

.fx-opt span { font-size: 13px; color: var(--ink-dim); }
.fx-opt.sel { border-color: var(--brass); background: rgba(211, 169, 82, 0.16); }
.fx-opt.fx-sabotage.sel { border-color: var(--fx-sabotage); }
.fx-opt.fx-bonus.sel { border-color: var(--fx-bonus); }
.fx-opt.fx-burn.sel { border-color: var(--fx-burn); }
.fx-opt.fx-steal.sel { border-color: var(--fx-steal); }
.fx-opt.fx-swap.sel { border-color: var(--fx-swap); }
.fx-opt.fx-shield.sel { border-color: var(--fx-shield); }

@media (max-width: 380px) {
  .rank-grid { grid-template-columns: repeat(5, 1fr); }
}
```

- [ ] **Step 5: Verify**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'` → PASS (97).
Manual: serve locally, confirm — mode toggle works in setup and persists; effects toggle reveals the 13-chip grid with 2/7/J dotted; tapping a chip opens the picker; assigning/clearing updates the chip; the dealer bar no longer shows Random/Pick in-game; Reset keeps mode + effects settings.

- [ ] **Step 6: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js portfolio/public/games/card-drawer/styles.css
git commit -m "feat(card-drawer): setup gains draw-mode + effects configurator; in-game toggle removed"
```

---

### Task 8: Tile-grid board — no-scroll play screen

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js` (`gameScreen`, `playerPanel` → `playerTile`, delete `leaderboardHTML`, `dealerBar`, `render`)
- Modify: `portfolio/public/games/card-drawer/styles.css` (append + small edits)

**Interfaces:**
- Consumes: `rankedEntries()` (kept as-is), `ICONS.shield`, `state.graveyard`.
- Produces: `.board-play` flex column filling `100dvh`; `.tile-grid` with seat-ordered `.tile` sections; `body.in-game` class toggled by `render()`. The old `.player-panel` + `.leaderboard` sections are gone.

- [ ] **Step 1: Replace `playerPanel` and `leaderboardHTML` with `playerTile`**

Delete `playerPanel()` and `leaderboardHTML()`. Add:

```js
// One tile per seat. Rank/crown/outs come from rankedEntries so the tiles ARE
// the leaderboard; seat order never changes, only the badges update.
function playerTile(player, meta) {
  const hand = evaluateHand(player.cards);
  const deckEmpty = state.deck.length === 0;
  const locked = state.pending !== null;
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
  const isLeader = meta.rank === 1 && hand;
  const actionLabel = state.drawMode === 'random' ? 'Deal' : 'Pick';
  const action = state.drawMode === 'random' ? 'deal' : 'open-sheet';
  const fanAttrs = player.cards.length
    ? ` data-action="view-cards" data-player="${player.id}" role="button" tabindex="0"` +
      ` aria-label="View ${esc(player.name)}'s cards"`
    : '';
  const outs =
    meta.outs === undefined
      ? ''
      : `<span class="tile-outs">${
          meta.outs
            ? `${meta.outs} card${meta.outs === 1 ? '' : 's'} can take the lead`
            : 'No single card takes the lead'
        }</span>`;

  return `
    <section class="tile${isLeader ? ' tile-leader' : ''}${ui.leadGlow === player.id ? ' tile-glow' : ''}">
      <div class="tile-head">
        <span class="tile-rank${isLeader ? ' lead' : ''}">${meta.rank}</span>
        ${isLeader ? `<span class="tile-crown">${ICONS.crown}</span>` : ''}
        <h3 class="tile-name">${esc(player.name)}</h3>
        ${player.shield ? `<span class="tile-shield" aria-label="Shielded">${ICONS.shield}</span>` : ''}
        <span class="tile-count">${player.cards.length}c</span>
      </div>
      <div class="fan tile-fan"${fanAttrs}>${fan}</div>
      <p class="tile-hand">${hand ? esc(hand.name) : '&nbsp;'}</p>
      ${outs}
      <button class="btn tile-btn" data-action="${action}" data-player="${player.id}"
              ${deckEmpty || locked ? 'disabled' : ''}>
        ${deckEmpty ? 'Deck empty' : actionLabel}
      </button>
    </section>
  `;
}
```

- [ ] **Step 2: Rewrite `dealerBar` and `gameScreen`**

```js
function dealerBar() {
  const left = state.deck.length;
  const burned = state.graveyard.length;
  const empty = left === 0;
  return `
    <div class="dealer-bar">
      <div class="dealer-row">
        <div class="deck-stack${empty ? ' deck-empty' : ''}" aria-hidden="true">
          ${renderCardSVG('back')}${renderCardSVG('back')}
        </div>
        <div class="deck-meta" aria-live="polite">
          <p class="eyebrow" style="margin:0">Card Drawer</p>
          <span class="deck-count${empty ? ' deck-empty-note' : ''}">
            ${empty ? 'Deck empty' : `${left} <span class="unit">left</span>`}
            ${burned ? `<span class="burned-count">&middot; ${burned} burned</span>` : ''}
          </span>
        </div>
        <div class="dealer-actions">
          <button class="btn btn-quiet btn-icon" data-action="undo" aria-label="Undo last draw"
                  ${state.history.length && !state.pending ? '' : 'disabled'}>${ICONS.undo}</button>
          <button class="btn ${ui.confirmReset ? 'btn-danger' : 'btn-quiet'}" data-action="reset">
            ${ui.confirmReset ? 'Confirm' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function gameScreen() {
  const metas = new Map(
    rankedEntries().map((entry) => [entry.player.id, { rank: entry.rank, outs: entry.outs }])
  );
  const overlayOpen =
    ui.viewerFor !== null || ui.sheetFor !== null || ui.reveal !== null ||
    ui.target !== null || ui.fxQueue !== null;
  return `
    <div class="board board-play"${overlayOpen ? ' inert' : ''}>
      ${dealerBar()}
      <div class="tile-grid tile-grid-${Math.min(state.players.length, 10)}">
        ${state.players.map((p) => playerTile(p, metas.get(p.id))).join('')}
      </div>
    </div>
    ${ui.viewerFor !== null ? viewerHTML() : ''}
    ${ui.sheetFor !== null ? sheetHTML() : ''}
    ${ui.reveal ? revealOverlayHTML() : ''}
    ${ui.target ? targetOverlayHTML() : ''}
    ${ui.fxQueue ? fxOverlayHTML() : ''}
  `;
}
```

(`targetOverlayHTML` / `fxOverlayHTML` arrive in Task 9 — until then add two stubs returning `''` so this task runs standalone: `function targetOverlayHTML() { return ''; }` and `function fxOverlayHTML() { return ''; }`.)

- [ ] **Step 3: Toggle `body.in-game` in `render`**

Replace `render()`:

```js
function render() {
  document.body.classList.toggle('in-game', state.phase === 'playing' && !ui.resume);
  const screen = state.phase === 'setup' ? setupScreen() : gameScreen();
  app.innerHTML = ui.resume ? `<div class="board" inert>${screen}</div>${resumeOverlay()}` : screen;
}
```

- [ ] **Step 4: Styles**

Append to `styles.css`:

```css
/* --- tile-grid board (play) -------------------------------------------------- */

body.in-game { overflow: hidden; }

body.in-game #app {
  max-width: 980px;
  height: 100dvh;
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  flex-direction: column;
}

.board-play {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.board-play .dealer-bar { flex: none; }

.tile-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 1fr;
  gap: 8px;
  padding: 8px 0;
  overflow-y: auto; /* graceful fallback on very short viewports */
}

@media (min-width: 700px) { .tile-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 940px) { .tile-grid { grid-template-columns: repeat(4, 1fr); } }

/* 2-4 players: single column on phones so tiles stay large */
.tile-grid-2, .tile-grid-3, .tile-grid-4 { grid-template-columns: 1fr; }
@media (min-width: 700px) {
  .tile-grid-2 { grid-template-columns: repeat(2, 1fr); }
  .tile-grid-3, .tile-grid-4 { grid-template-columns: repeat(2, 1fr); }
}

.tile {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid rgba(211, 169, 82, 0.22);
  background: linear-gradient(180deg, var(--felt-700), var(--felt-800));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24);
}

.tile-leader { border-color: var(--brass); }

.tile-glow { animation: lead-glow 1.5s ease-out; }

.tile-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tile-rank {
  flex: none;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-dim);
}

.tile-rank.lead {
  border-color: var(--brass);
  background: rgba(211, 169, 82, 0.2);
  color: var(--brass);
}

.tile-crown { flex: none; color: var(--brass); display: inline-flex; }

.tile-name {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-shield { flex: none; color: var(--fx-shield); display: inline-flex; }

.tile-count {
  flex: none;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-faint);
}

.tile-fan {
  min-height: 0;
  flex: 1;
  padding: 6px 2px 2px;
  align-items: center;
}

.tile-fan .card-wrap { width: 44px; }
.tile-fan .card-wrap + .card-wrap { margin-left: -20px; }
.tile-fan .card-wrap.best + .card-wrap.spare { margin-left: 10px; }

.tile-hand {
  margin: 0;
  font-size: 12.5px;
  color: var(--brass);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-outs {
  font-size: 11px;
  font-style: italic;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-btn {
  margin-top: 6px;
  min-height: 40px;
  padding: 4px 10px;
  font-size: 13px;
}

.burned-count { font-size: 12px; color: var(--danger); letter-spacing: 0.06em; }
```

Also delete the now-unused CSS blocks: `.player-panel …` rules (the `/* --- player panels --- */` section's `.player-panel` selectors — keep the shared `.fan` rules, which tiles reuse) and the entire `/* --- leaderboard --- */` section including `.leaderboard li.lb-glow` (its `lead-glow` keyframes stay — tiles use them).

- [ ] **Step 5: Verify**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'` → PASS.
Manual (serve locally): start a 6-player game — all six tiles visible with no page scroll on a phone-sized viewport (DevTools 390×844); rank badges + crown update as cards are dealt; tap fan opens viewer; undo/reset work; 10 players fit as 2×5; 2 players get large single-column tiles.

- [ ] **Step 6: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js portfolio/public/games/card-drawer/styles.css
git commit -m "feat(card-drawer): tile-grid board — all seats visible, leaderboard folded into tiles"
```

---

### Task 9: Draw flow — effect resolution, targeting overlay, reveal queue, typed undo

**Files:**
- Modify: `portfolio/public/games/card-drawer/game.js` (`dealRandom`, `pickCard`, `dismissReveal`, `undoLastDraw`, `resetGame`, events, replace Task 8 stubs)
- Modify: `portfolio/public/games/card-drawer/styles.css` (append)

**Interfaces:**
- Consumes: `beginRecord`, `advanceDraw`, `applyTarget`, `undoRecord`, `effectForCard`, `legalTargets`, `EFFECTS`.
- Produces: full effects gameplay. `ui.target = {effect, cardId}` while `state.pending` holds the record; `ui.fxQueue = step[]` drives post-draw resolution overlays; `ui.prevLeader` defers the take-the-lead celebration until resolution finishes.

- [ ] **Step 1: Rewrite the draw entry points**

Replace `dealRandom` and `pickCard`:

```js
// Shared driver: the card is already in the drawer's hand and the record
// begun. Advances until done or a target is needed; on done, commits history
// and starts the resolution reveal queue.
function advanceRecord(record, viaTarget = false, targetId = null) {
  const result = viaTarget
    ? applyTarget(state, record, targetId)
    : advanceDraw(state, record);
  if (result.status === 'need-target') {
    state.pending = record;
    ui.target = { effect: result.effect, cardId: result.cardId };
    saveState();
    render();
    return;
  }
  state.pending = null;
  ui.target = null;
  state.history.push(record);
  const fxSteps = record.steps.filter((s) => s.kind !== 'draw');
  ui.fxQueue = fxSteps.length ? fxSteps : null;
  if (!ui.fxQueue) celebrateIfLeadTaken(record.playerId);
  saveState();
  render();
  ui.justDrawn = null;
  ui.leadGlow = null;
}

// The celebration is judged AFTER full resolution (a sabotage can change the
// leader as much as the draw itself).
function celebrateIfLeadTaken(playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (player && tookLeadAfterDraw(ui.prevLeader, player)) ui.leadGlow = playerId;
  ui.prevLeader = null;
}

function dealRandom(playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.deck.length === 0 || state.pending) return;
  ui.prevLeader = currentLeader();
  const card = state.deck.pop();
  player.cards.push(card);
  ui.justDrawn = { playerId, cardId: card.id };
  advanceRecord(beginRecord(playerId, 'deal', card.id, state.deck.length));
}

function pickCard(playerId, index) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || index < 0 || index >= state.deck.length || state.pending) return;
  ui.prevLeader = currentLeader();
  const [card] = state.deck.splice(index, 1);
  player.cards.push(card);
  const record = beginRecord(playerId, 'pick', card.id, index);
  ui.sheetFor = null;
  // Two-stage flip reveal first; effects resolve when it's dismissed.
  ui.reveal = { playerId, cardId: card.id, stage: 1, record };
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

Replace `dismissReveal`:

```js
function dismissReveal() {
  clearTimeout(revealTimer);
  const reveal = ui.reveal;
  ui.reveal = null;
  if (reveal && reveal.record) {
    advanceRecord(reveal.record);
    return;
  }
  render();
}
```

In `revealOverlayHTML`, the stage-2 branch no longer knows `tookLead` at reveal time — remove the `ui.reveal.tookLead` ribbon/sparkles lines from BOTH stages (the celebration now happens via `ui.leadGlow` on the tile and, when effects fire, after the fx queue). Also remove `tookLead` from where `ui.reveal` is constructed (done above) and delete the now-unused reference in `dismissReveal` (done above).

- [ ] **Step 2: Targeting overlay + resolution overlays (replace Task 8 stubs)**

```js
function targetOverlayHTML() {
  const record = state.pending;
  if (!record || !ui.target) return '';
  const drawer = state.players.find((p) => p.id === record.playerId);
  const fx = EFFECTS[ui.target.effect];
  const card = drawer.cards.find((c) => c.id === ui.target.cardId);
  const rows = legalTargets(state, record.playerId)
    .map(
      (p) => `
      <li>
        <button class="btn target-row" data-action="choose-target" data-target="${p.id}">
          <span class="target-name">${esc(p.name)}</span>
          ${p.shield ? `<span class="target-shield">${ICONS.shield} shielded</span>` : ''}
          <span class="target-count">${p.cards.length}c</span>
        </button>
      </li>`
    )
    .join('');
  return `
    <div class="overlay target-overlay" role="dialog" aria-modal="true" aria-label="${esc(fx.label)}">
      <div class="panel">
        <h2 class="fx-title fx-${ui.target.effect}">${esc(fx.label)}</h2>
        <div class="target-card">${card ? cardWrap(card) : ''}</div>
        <p class="target-copy">${esc(drawer.name)} — choose an opponent.</p>
        <ul class="target-list">${rows}</ul>
      </div>
    </div>
  `;
}

// One overlay per resolution step; tap advances the queue.
function fxOverlayHTML() {
  const step = ui.fxQueue[0];
  const record = state.history[state.history.length - 1];
  const drawer = state.players.find((p) => p.id === record.playerId);
  const targetPlayer =
    step.targetId !== undefined ? state.players.find((p) => p.id === step.targetId) : null;
  const cardById = (id) => {
    const all = state.players.flatMap((p) => p.cards).concat(state.deck, state.graveyard);
    return all.find((c) => c.id === id) || null;
  };
  let effect = '';
  let shown = null;
  let caption = '';
  switch (step.kind) {
    case 'bonus-draw':
      effect = 'bonus';
      shown = cardById(step.cardId);
      caption = `${esc(drawer.name)} draws again`;
      break;
    case 'burn':
      effect = 'burn';
      shown = cardById(step.burnedId);
      caption = 'Burned from the deck';
      break;
    case 'sabotage':
      effect = 'sabotage';
      shown = cardById(step.destroyedId);
      caption = `${esc(targetPlayer.name)}'s card is destroyed`;
      break;
    case 'steal':
      effect = 'steal';
      shown = cardById(step.stolenId);
      caption = `${esc(drawer.name)} steals from ${esc(targetPlayer.name)}`;
      break;
    case 'swap':
      effect = 'swap';
      caption = `${esc(drawer.name)} swaps hands with ${esc(targetPlayer.name)}`;
      break;
    case 'shield-gain':
      effect = 'shield';
      caption = `${esc(drawer.name)} raises a shield`;
      break;
    case 'shield-noop':
      effect = 'shield';
      caption = `${esc(drawer.name)} is already shielded`;
      break;
    case 'blocked':
      effect = 'shield';
      caption = `${esc(targetPlayer.name)}'s shield blocks it`;
      break;
    case 'fizzle':
      effect = step.effect;
      caption = 'No effect';
      break;
    default:
      break;
  }
  const label = EFFECTS[effect] ? EFFECTS[effect].label : '';
  return `
    <div class="overlay reveal-overlay fx-overlay" role="dialog" aria-modal="true"
         aria-label="${esc(label)}" data-action="fx-continue">
      <div class="reveal-stage">
        <p class="fx-title fx-${effect}">${esc(label)}</p>
        ${shown ? `<div class="reveal-card">${cardWrap(shown)}</div>` : ''}
        ${effect === 'shield' && !shown ? `<div class="fx-big-shield">${ICONS.shield}</div>` : ''}
        <p class="reveal-caption">${caption}</p>
        <button class="btn btn-primary" data-action="fx-continue">
          ${ui.fxQueue.length > 1 ? 'Next' : 'Done'}
        </button>
      </div>
    </div>
  `;
}
```

- [ ] **Step 3: Wire events + undo**

In the click handler add:

```js
    case 'choose-target': {
      const record = state.pending;
      if (record) advanceRecord(record, true, Number(target.dataset.target));
      break;
    }
    case 'fx-continue': {
      ui.fxQueue = ui.fxQueue && ui.fxQueue.length > 1 ? ui.fxQueue.slice(1) : null;
      if (!ui.fxQueue) {
        const last = state.history[state.history.length - 1];
        if (last) celebrateIfLeadTaken(last.playerId);
      }
      render();
      ui.leadGlow = null;
      break;
    }
```

Replace `undoLastDraw`:

```js
function undoLastDraw() {
  if (state.pending) return; // mid-choice; resolve or reset first
  const record = state.history.pop();
  if (!record) return;
  undoRecord(state, record);
  const viewed = state.players.find((p) => p.id === ui.viewerFor);
  if (viewed && viewed.cards.length === 0) ui.viewerFor = null;
  saveState();
  render();
}
```

In `resetGame()` also clear the new transient state:

```js
  ui.target = null;
  ui.fxQueue = null;
  ui.prevLeader = null;
```

In the Escape key handler, add a guard FIRST (targeting is mandatory, fx queue advances instead of closing):

```js
  if (ui.target) return;
  if (ui.fxQueue) {
    ui.fxQueue = ui.fxQueue.length > 1 ? ui.fxQueue.slice(1) : null;
    render();
    return;
  }
```

Boot-time: after `loadSaved()`, if the restored state has `pending`, rebuild the prompt so the targeting overlay reopens on Resume — in the `case 'resume':` handler, after `state = ui.resume;` add:

```js
      if (state.pending) {
        const result = advanceDraw(state, state.pending);
        if (result.status === 'need-target') {
          ui.target = { effect: result.effect, cardId: result.cardId };
        } else {
          state.history.push(state.pending);
          state.pending = null;
        }
      }
```

- [ ] **Step 4: Styles**

Append to `styles.css`:

```css
/* --- targeting + effect resolution overlays --------------------------------- */

.target-overlay .panel { width: min(440px, 100%); }

.target-card {
  display: flex;
  justify-content: center;
  margin: 4px 0 10px;
}

.target-card .card-wrap { width: 84px; }

.target-copy { margin: 0 0 10px; color: var(--ink-dim); }

.target-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 46dvh;
  overflow-y: auto;
}

.target-row {
  width: 100%;
  justify-content: flex-start;
  gap: 10px;
  text-transform: none;
  letter-spacing: normal;
}

.target-row .target-name {
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.target-row .target-shield {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--fx-shield);
}

.target-row .target-count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-faint);
}

.fx-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.fx-title.fx-sabotage { color: var(--fx-sabotage); }
.fx-title.fx-bonus { color: var(--fx-bonus); }
.fx-title.fx-burn { color: var(--fx-burn); }
.fx-title.fx-steal { color: var(--fx-steal); }
.fx-title.fx-swap { color: var(--fx-swap); }
.fx-title.fx-shield { color: var(--fx-shield); }

.fx-big-shield { color: var(--fx-shield); }
.fx-big-shield svg { width: 96px; height: 96px; }
```

- [ ] **Step 5: Verify**

Run: `cd portfolio/public/games/card-drawer && node --test '*.test.js'` → PASS.
Manual walkthrough (serve locally, effects ON, 3 players):
1. Deal until a 2 lands — targeting overlay appears, cannot be dismissed, choosing a victim shows the destroyed card, victim's tile shrinks by one card.
2. Draw a 7 — "Bonus draw" overlay, then the extra card; if the extra card is a 2, the chain prompts targeting.
3. Draw a J — burned card shown; dealer bar shows "· 1 burned".
4. Assign shield to a rank in setup, gain it, get attacked — "shield blocks it" overlay, marker disappears.
5. Undo after a chained draw — every card returns (victim's hand, deck count, graveyard count, shield marker all restored).
6. Refresh mid-targeting-prompt — Resume reopens the prompt.
7. Effects OFF — game plays exactly like v2 (no prompts, no overlays).

- [ ] **Step 6: Commit**

```bash
git add portfolio/public/games/card-drawer/game.js portfolio/public/games/card-drawer/styles.css
git commit -m "feat(card-drawer): effects gameplay — targeting, resolution reveals, atomic undo"
```

---

### Task 10: Service worker + PWA test

**Files:**
- Modify: `portfolio/public/games/card-drawer/sw.js:5-15`

**Interfaces:**
- Consumes: pwa.test.mjs contract — `CACHE` matches `^card-drawer-v\d+$`, `ASSETS` entries must exist on disk.

- [ ] **Step 1: Bump cache + add new modules**

In `sw.js` replace lines 5–15:

```js
const CACHE = "card-drawer-v2";
const ASSETS = [
  "./index.html",
  "./styles.css",
  "./game.js",
  "./card-svg.js",
  "./hand-eval.js",
  "./effects.js",
  "./state.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];
```

- [ ] **Step 2: Run the PWA suite**

Run: `cd portfolio/public/games && node --test pwa.test.mjs`
Expected: PASS — all games' PWA tests green (card-drawer picks up the two new assets).

- [ ] **Step 3: Commit**

```bash
git add portfolio/public/games/card-drawer/sw.js
git commit -m "chore(card-drawer): sw cache v2 — precache effects.js + state.js"
```

---

### Task 11: Final verification pass

**Files:** none (verification only; fix-forward if anything fails)

- [ ] **Step 1: Full test run**

```bash
cd portfolio/public/games/card-drawer && node --test '*.test.js'
cd ../ && node --test pwa.test.mjs
```
Expected: all PASS.

- [ ] **Step 2: Browser pass (BrainSpark done criteria)**

Serve `portfolio/public/games/card-drawer/` locally and verify with DevTools console open (zero errors):
- Setup: add/rename/remove players; mode + jokers + effects settings persist across reload.
- Classic game (effects off): deal, pick, undo, reset, viewer, outs hints — v2 parity.
- Effects game: the Task 9 walkthrough, plus deck-empty endgame (all buttons disabled, no crash) and a 10-player no-scroll check at 390×844.
- Legacy migration: seed `localStorage['card-drawer:v1']` with a v1 save in the console, reload — Resume works, effects off.

- [ ] **Step 3: Commit any fixes, then report**

If the browser pass surfaced fixes, commit them (`fix(card-drawer): …`). Report done with test counts; branch stays unmerged awaiting explicit merge instruction (user's standing rule: no premature merges/PRs).

---

## Self-Review Notes

- Spec coverage: setup reorganization (T7), six effects + chains + fizzles + shield (T1–T3, T9), destroyed-cards graveyard + burned count (T2, T8), tile grid + no leaderboard section + seat order (T8), draw mode locked in-game (T7 removes the toggle; T9 never re-adds), typed atomic undo (T4, T9), v2 storage + v1 migration (T5, T6), `effects.js`/`state.js` pure + tested (T1–T5), sw CACHE bump (T10). Outs math needs no change — `countOuts` reads the live deck (spec §2).
- Type consistency: ActionRecord `{playerId, via, steps, queue}` and step kinds are identical across effects.js (T1–T4), state.js validation (T5), and game.js wiring (T9). `advanceRecord` is the only caller of `advanceDraw`/`applyTarget` in game.js.
- Known intentional trade-offs: no DOM test harness exists in this codebase, so game.js is covered by the manual browser pass (same as v1/v2); `tile-grid` keeps `overflow-y:auto` as a graceful fallback for extreme viewport/player combinations.
