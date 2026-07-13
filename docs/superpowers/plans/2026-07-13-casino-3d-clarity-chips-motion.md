# Casino 3D — Card Clarity, Live Chip Placement, Motion Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 3D casino prototype read like a real game: oversized readable cards landing in painted boxes, a crisp 2D hand mirror, chips that visibly stack in the 2D overlay AND land live on the 3D felt, and card/dealer motion that looks dealt rather than teleported.

**Architecture:** All work is inside `portfolio/src/game/casino-game/calculator/prototype-3d/`. Four new modules carry the shared machinery — `src/logic/layouts.js` (pure, node-testable layout tables + chip breakdown + roulette spot mapping), `src/engine/cards.js` (jumbo card textures, bigger meshes, dealCardTo v2, shared flipFlatCard, card-box decals), `src/engine/chips3d.js` (3D chip meshes + a per-room BetStacks manager with fly-in/undo/clear/settle animations), `src/engine/hud.js` (DOM hand mirror + 2D chip stack renderer). The dealer gains procedural deal gestures and head tracking inside `assets.js`. Then each of the four rooms is integrated one task at a time. Painted boxes/spots are **separate decal meshes positioned from the same `C.layouts` constants the deal/chip targets use**, so cards/chips physically cannot land outside their markings.

**Tech Stack:** Vanilla JS IIFEs on `globalThis.CASINO` (namespace `C`), THREE.js r149 (inlined vendor), canvas-generated textures, `node --test` for pure logic, `build.mjs` inliner (no bundler, no deps).

## Global Constraints

- Everything stays self-contained: no new files fetched at runtime, no GLTF, no fonts — canvas + primitives only. `node build.mjs` must keep producing a double-clickable `index.html`.
- Every new animation honors `app.REDUCED` (prefers-reduced-motion): shorten to ≤180ms or skip entirely.
- Every frame-hook animation must carry the `roomGen` guard pattern (capture `const gen = app.roomGen` at start; on mismatch, `app.offFrame(hook)` and resolve) AND a `hook.cancel = () => { app.offFrame(hook); resolve(); }` property, exactly like the existing `dealCardTo` (`src/engine/assets.js:466-496`).
- Dispose discipline: every mesh removed from the scene has `geometry.dispose()` + all materials (+ their `.map`s) disposed — reuse the rooms' existing `disposeMesh` pattern.
- Run the full suite with `node --test tests/` from the `prototype-3d/` directory. It must stay green after every task. Rebuild with `node build.mjs` before every commit so `index.html` never goes stale.
- Card size constants: `CARD_W = 0.14`, `CARD_H = 0.196` (world units). Chip: radius 0.034, height 0.007, stack pitch 0.0072.
- Commit after every task on branch `feat/casino-lobby-credits`. Check `git status` first — parallel sessions share this tree; stage only your own files.
- All file paths below are relative to `portfolio/src/game/casino-game/calculator/prototype-3d/`.

---

### Task 1: `src/logic/layouts.js` — shared layout tables + pure helpers

**Files:**
- Create: `src/logic/layouts.js`
- Create: `tests/layouts.test.mjs`
- Modify: `build.mjs` (SRC_ORDER)

**Interfaces:**
- Consumes: nothing (pure module; only `globalThis.CASINO`).
- Produces: `C.layouts` = `{ CARD_W, CARD_H, chipBreakdown(amount), blackjack, baccarat, uth, roulette, rouletteSpotPos(id) }`. Room objects contain `feltY, cardY, shoePos/deckPos, chipSource, dealerChipPos, playerSlots, dealerSlots, boardSlots?, fanDx?, spots: {id: {pos, r, label}}, poseDeal`. Later tasks read ONLY these — no room re-declares a card/chip position.

- [ ] **Step 1: Write the failing test**

Create `tests/layouts.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/logic/layouts.js');
const L = globalThis.CASINO.layouts;

test('card dimensions are poker-ratio and ~1.55x the old size', () => {
  assert.equal(L.CARD_W, 0.14);
  assert.equal(L.CARD_H, 0.196);
  assert.ok(Math.abs(L.CARD_W / L.CARD_H - 0.714) < 0.01);
});

test('chipBreakdown is greedy, rounds remainders up to one 100, caps at 20 chips', () => {
  assert.deepEqual(L.chipBreakdown(1600), [1000, 500, 100]);
  assert.deepEqual(L.chipBreakdown(100), [100]);
  assert.deepEqual(L.chipBreakdown(750), [500, 100, 100, 100]);   // 50 remainder -> one extra 100
  assert.deepEqual(L.chipBreakdown(475), [100, 100, 100, 100, 100]); // banker 0.95 on 500
  assert.deepEqual(L.chipBreakdown(0), []);
  assert.ok(L.chipBreakdown(1e9).length <= 20);
});

test('blackjack slots + spots sit on the half-disc table (radius 1.6, +Z side)', () => {
  const bj = L.blackjack;
  const onTable = ([x, , z]) => Math.hypot(x, z) < 1.6 - L.CARD_H / 2;
  bj.playerSlots.forEach((p) => assert.ok(onTable(p)));
  bj.dealerSlots.forEach((p) => assert.ok(onTable(p)));
  Object.values(bj.spots).forEach(({ pos, r }) =>
    assert.ok(Math.hypot(pos[0], pos[2]) + r < 1.6));
  // hit cards keep fanning right and must stay on the felt up to 7 cards
  const x7 = bj.playerSlots[1][0] + 5 * bj.fanDx;
  assert.ok(Math.hypot(x7 + L.CARD_W / 2, bj.playerSlots[1][2]) < 1.6);
});

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

test('rouletteSpotPos maps every overlay spot id onto the felt box', () => {
  const ids = ['n0', ...Array.from({ length: 36 }, (_, i) => 'n' + (i + 1)),
    'c1', 'c2', 'c3', 'd1', 'd2', 'd3', 'low', 'even', 'red', 'black', 'odd', 'high'];
  const seen = new Set();
  for (const id of ids) {
    const [x, z] = L.rouletteSpotPos(id);
    assert.ok(Math.abs(x) < 3.28 / 2 && Math.abs(z) < 1.48 / 2, id + ' on felt');
    const key = x.toFixed(3) + ',' + z.toFixed(3);
    assert.ok(!seen.has(key), id + ' distinct');
    seen.add(key);
  }
  // x ordering is unambiguous (texture u runs along +x): 0 column left of numbers,
  // number columns increase with column index, column bets right of numbers.
  assert.ok(L.rouletteSpotPos('n0')[0] < L.rouletteSpotPos('n1')[0]);
  assert.ok(L.rouletteSpotPos('n1')[0] < L.rouletteSpotPos('n4')[0]);
  assert.ok(L.rouletteSpotPos('c1')[0] > L.rouletteSpotPos('n36')[0]);
  // rows within one column share x
  assert.equal(L.rouletteSpotPos('n1')[0], L.rouletteSpotPos('n3')[0]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd portfolio/src/game/casino-game/calculator/prototype-3d && node --test tests/layouts.test.mjs`
Expected: FAIL (cannot find module `../src/logic/layouts.js`).

- [ ] **Step 3: Write the implementation**

Create `src/logic/layouts.js`:

```js
(() => {
  const C = (globalThis.CASINO ??= {});

  // Oversized cards (~1.55x a real 9x12.6cm card) — the "first-person casino"
  // readability trick. Every card mesh, painted box, and deal target derives
  // from these two numbers so they cannot drift apart.
  const CARD_W = 0.14, CARD_H = 0.196;

  // Greedy payout breakdown for 3D chip pushes. Amounts that aren't
  // representable (e.g. 750 blackjack natural, 475 banker win) round the
  // remainder UP to one visual 100 chip — display only, wallet math is
  // untouched. Capped at 20 chips so a jackpot can't spawn a mesh flood.
  const DENOMS = [5000, 1000, 500, 100];
  function chipBreakdown(amount) {
    const out = [];
    let left = amount;
    for (const d of DENOMS) {
      while (left >= d && out.length < 20) { out.push(d); left -= d; }
    }
    if (left > 0 && out.length < 20) out.push(100);
    return out;
  }

  // ---------- blackjack (half-disc table, radius 1.6, felt +Z side, FELT_Y 0.83)
  // CORRECTED mid-execution (user report): the felt half-disc's flat (dealer)
  // edge is at z = 0 — felt only exists for z in [0, 1.6]. The original room
  // constants (and this plan's first draft) floated the dealer cards and shoe
  // at negative z, off the table. All footprints below sit at z >= 0.
  const blackjack = {
    feltY: 0.83, cardY: 0.86,
    shoePos: [1.05, 0.83, 0.18],
    chipSource: [1.0, 0.85, 1.05],          // near table edge at the player's right
    dealerChipPos: [0, 0.85, 0.10],
    playerSlots: [[0.27, 0.86, 0.50], [0.44, 0.86, 0.50]],
    dealerSlots: [[-0.24, 0.86, 0.16], [-0.07, 0.86, 0.16]],
    fanDx: 0.17,                             // 3rd+ card continues right of slot[1]
    spots: {
      main:               { pos: [0.36, 0.845, 0.78], r: 0.11,  label: 'MAIN' },
      perfectPair:        { pos: [0.10, 0.845, 0.88], r: 0.075, label: 'PP' },
      twentyOnePlusThree: { pos: [0.62, 0.845, 0.88], r: 0.075, label: '21+3' },
    },
    poseDeal: { pos: [0.12, 1.35, 1.25], look: [0.08, 0.84, 0.25] },
  };

  // ---------- baccarat (ellipse felt rx 1.692 / rz 0.799, FELT_Y 0.82)
  const baccarat = {
    feltY: 0.82, cardY: 0.85,
    shoePos: [0.85, 0.82, -0.55],
    chipSource: [1.05, 0.84, 0.35],
    dealerChipPos: [0, 0.84, -0.6],
    // two upright slots side by side + the third card laid SIDEWAYS next to
    // them (rotation.z = ±PI/2 on the flat card), as dealt in real baccarat.
    playerSlots: [[-0.78, 0.85, 0.08], [-0.61, 0.85, 0.08], [-0.37, 0.85, 0.08]],
    bankerSlots: [[0.61, 0.85, 0.08], [0.78, 0.85, 0.08], [0.37, 0.85, 0.08]],
    spots: {
      player: { pos: [-0.70, 0.84, 0.42], r: 0.13,  label: 'PLAYER' },
      banker: { pos: [0.70, 0.84, 0.42],  r: 0.13,  label: 'BANKER' },
      tie:    { pos: [0, 0.84, 0.48],     r: 0.10,  label: 'TIE' },
      pPair:  { pos: [-0.32, 0.84, 0.54], r: 0.07,  label: 'P PAIR' },
      bPair:  { pos: [0.32, 0.84, 0.54],  r: 0.07,  label: 'B PAIR' },
    },
    poseDeal: { pos: [0, 1.32, 0.82], look: [0, 0.85, -0.15] },
  };

  // ---------- uth (ellipse felt rx 1.504 / rz 0.846, FELT_Y 0.82)
  const uth = {
    feltY: 0.82, cardY: 0.85,
    deckPos: [0.75, 0.82, -0.65],
    chipSource: [0.95, 0.84, 0.42],
    dealerChipPos: [0, 0.84, -0.62],
    playerSlots: [[-0.11, 0.85, 0.55], [0.11, 0.85, 0.55]],
    dealerSlots: [[-0.11, 0.85, -0.55], [0.11, 0.85, -0.55]],
    boardSlots: [[-0.44, 0.85, 0], [-0.22, 0.85, 0], [0, 0.85, 0], [0.22, 0.85, 0], [0.44, 0.85, 0]],
    spots: {
      ante:    { pos: [-0.34, 0.84, 0.30], r: 0.085, label: 'ANTE' },
      blind:   { pos: [-0.12, 0.84, 0.30], r: 0.085, label: 'BLIND' },
      jackpot: { pos: [0.10, 0.84, 0.30],  r: 0.06,  label: 'JP' },
      trips:   { pos: [0.32, 0.84, 0.30],  r: 0.075, label: 'TRIPS' },
    },
    poseDeal: { pos: [0, 1.3, 0.95], look: [0, 0.85, -0.2] },
  };

  // ---------- roulette: map a 2D overlay spot id to a world (x, z) on the
  // painted felt. Mirrors makeFeltLayoutTexture's geometry EXACTLY
  // (src/rooms/roulette.js): 1024x512 canvas on a 3.28 x 1.48 box top.
  // Canvas u runs along world +x. The v->z SIGN is verified in-browser in
  // Task 9 — if the rows land mirrored, flip Z_SIGN there (one constant).
  const R_TEX = { W: 1024, H: 512, gx: 40, gy: 30, gw: 940, gh: 380, zeroW: 70, oy: 434, oh: 56 };
  const R_FELT = { w: 3.28, d: 1.48 };
  const Z_SIGN = 1;
  const ROWS = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];
  function rouletteSpotPx(id) {
    const { gx, gy, gw, gh, zeroW, oy, oh } = R_TEX;
    const cellW = (gw - zeroW) / 12, cellH = gh / 3, ow = gw / 6;
    if (id === 'n0') return [gx + zeroW / 2, gy + gh / 2];
    if (/^n\d+$/.test(id)) {
      const n = Number(id.slice(1));
      const r = ROWS.findIndex((row) => row.includes(n));
      const c = ROWS[r].indexOf(n);
      return [gx + zeroW + (c + 0.5) * cellW, gy + (r + 0.5) * cellH];
    }
    if (/^c[123]$/.test(id)) {
      const r = { c3: 0, c2: 1, c1: 2 }[id];
      return [gx + gw + 30, gy + (r + 0.5) * cellH];
    }
    if (/^d[123]$/.test(id)) {
      const i = Number(id.slice(1)) - 1;
      return [gx + (i + 0.5) * (gw / 3), oy - 40];
    }
    const i = ['low', 'even', 'red', 'black', 'odd', 'high'].indexOf(id);
    return [gx + (i + 0.5) * ow, oy + oh / 2];
  }
  function rouletteSpotPos(id) {
    const [px, py] = rouletteSpotPx(id);
    return [(px / R_TEX.W - 0.5) * R_FELT.w, Z_SIGN * (py / R_TEX.H - 0.5) * R_FELT.d];
  }

  C.layouts = { CARD_W, CARD_H, chipBreakdown, blackjack, baccarat, uth, rouletteSpotPos };
})();
```

Note: `c1..c3` map slightly OFF the number grid (x = gx+gw+30 = 1010 px → x ≈ 1.62, still < 1.64 half-width) — the painted layout has no column cells, so column chips park just right of the grid edge. `d1..d3` park just above the outside row.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/layouts.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Add to build order and run the full suite**

In `build.mjs`, add `'src/logic/layouts.js'` to `SRC_ORDER` immediately after `'src/logic/tables.js'`.
Run: `node --test tests/ && node build.mjs`
Expected: all tests pass; `built index.html (…KB)`.

- [ ] **Step 6: Commit**

```bash
git add src/logic/layouts.js tests/layouts.test.mjs build.mjs index.html
git commit -m "feat(casino-3d): shared layout tables, chip breakdown, roulette spot mapping"
```

---

### Task 2: `src/engine/cards.js` — jumbo cards, dealCardTo v2, box decals

**Files:**
- Create: `src/engine/cards.js`
- Modify: `src/engine/assets.js` (delete card functions), `src/engine/tween.js` (add `outBack`), `build.mjs`

**Interfaces:**
- Consumes: `C.layouts.CARD_W/CARD_H`, `C.tween`, `C.outcomes.RANK_LABEL/SUIT_CHAR`, `C.assets.canvasTexture`.
- Produces: `C.cards = { makeCard(card), dealCardTo(app, mesh, from, to, opts), flipFlatCard(app, mesh, ms), makeCardBoxDecal(opts) }`, plus back-compat aliases `C.assets.makeCard` and `C.assets.dealCardTo` (lobby gallery + rooms keep working until they're migrated).

- [ ] **Step 1: Add the `outBack` easing to `src/engine/tween.js`**

In the `easings` object add:

```js
    outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
```

- [ ] **Step 2: Create `src/engine/cards.js`**

Move `drawCardBack`, `drawCardFace`, `makeCard`, and `dealCardTo` OUT of `assets.js` into this new file, upgraded as follows (complete file):

```js
(() => {
  const C = (globalThis.CASINO ??= {});

  // Texture canvas: 512x716 (2x the old 256x358) with JUMBO corner indices —
  // rank ≈30% of card height — so faces read clearly from the play camera.
  const TW = 512, TH = 716;

  function drawCardBack(ctx) {
    ctx.fillStyle = '#1e3a8a';
    C.assets.roundRect(ctx, 0, 0, TW, TH, 40); ctx.fill();
    ctx.save();
    C.assets.roundRect(ctx, 0, 0, TW, TH, 40); ctx.clip();
    ctx.strokeStyle = 'rgba(201,162,39,0.55)';
    ctx.lineWidth = 4;
    for (let x = -TH; x < TW + TH; x += 52) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + TH, TH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, TH); ctx.lineTo(x + TH, 0); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 12;
    C.assets.roundRect(ctx, 20, 20, TW - 40, TH - 40, 32); ctx.stroke();
    ctx.lineWidth = 4;
    C.assets.roundRect(ctx, 36, 36, TW - 72, TH - 72, 24); ctx.stroke();
  }

  function drawCardFace(ctx, card) {
    const RANK_LABEL = C.outcomes.RANK_LABEL, SUIT_CHAR = C.outcomes.SUIT_CHAR;
    ctx.fillStyle = '#f8f6ee';
    C.assets.roundRect(ctx, 8, 8, TW - 16, TH - 16, 40); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#888';
    C.assets.roundRect(ctx, 8, 8, TW - 16, TH - 16, 40); ctx.stroke();

    const suit = SUIT_CHAR[card.s];
    const rank = RANK_LABEL[card.r];
    const red = card.s === 1 || card.s === 2;
    ctx.fillStyle = red ? '#c0392b' : '#141414';

    // Jumbo corner index (top-left) + rotated copy (bottom-right)
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold 190px Georgia, serif';
    ctx.fillText(rank, 28, 8, 180);       // maxWidth clamps '10'
    ctx.font = '140px Georgia, serif';
    ctx.fillText(suit, 34, 200);
    ctx.save();
    ctx.translate(TW - 28, TH - 8);
    ctx.rotate(Math.PI);
    ctx.font = 'bold 190px Georgia, serif';
    ctx.fillText(rank, 0, 0, 180);
    ctx.font = '140px Georgia, serif';
    ctx.fillText(suit, 6, 192);
    ctx.restore();

    // Big center pip on the right half so the corner index owns the left
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '300px Georgia, serif';
    ctx.fillText(suit, TW * 0.62, TH / 2 + 10);
  }

  function makeCard(card) {
    const geo = new THREE.PlaneGeometry(C.layouts.CARD_W, C.layouts.CARD_H);
    const faceTx = C.assets.canvasTexture(TW, TH, (ctx) => (card ? drawCardFace(ctx, card) : drawCardBack(ctx)));
    const backTx = C.assets.canvasTexture(TW, TH, drawCardBack);
    faceTx.anisotropy = 8; backTx.anisotropy = 8;
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTx, roughness: 0.5, metalness: 0 });
    const backMat = new THREE.MeshStandardMaterial({ map: backTx, roughness: 0.5, metalness: 0 });

    const face = new THREE.Mesh(geo, faceMat);
    face.position.z = 0.0006;
    face.castShadow = true; face.receiveShadow = true;
    const back = new THREE.Mesh(geo, backMat);
    back.rotation.y = Math.PI;
    back.position.z = -0.0006;
    back.castShadow = true; back.receiveShadow = true;

    const group = new THREE.Group();
    group.add(face, back);
    group.userData.card = card;
    group.userData.flip = (ms = 400, onDone) =>
      C.tween.to(group.rotation, { y: group.rotation.y + Math.PI }, ms, 'inOutCubic', onDone);
    return group;
  }

  // dealCardTo v2 — same contract as the original (assets.js), plus:
  //  * in-plane spin: rotation.z starts 0.45 rad short of the caller's final
  //    value and eases in (rotation.z is the INNERMOST Euler axis, so the
  //    spin stays in the card's own plane whatever rotation.x/y are doing).
  //  * XZ travel eases with outBack — the card overshoots its box by a few cm
  //    and slides back, reading as "dealt" instead of "placed".
  //  * REDUCED: no spin, linear-ish fast flight (unchanged from v1).
  function dealCardTo(app, cardMesh, from, to, { ms = 420, flip = false, delay = 0, spin = true } = {}) {
    if (app.REDUCED) { ms = Math.min(ms, 180); spin = false; }
    return new Promise((resolve) => {
      const gen = app.roomGen;
      cardMesh.position.set(...from);
      const zEnd = cardMesh.rotation.z;
      const zStart = spin ? zEnd - 0.45 : zEnd;
      cardMesh.rotation.z = zStart;
      app.scene.add(cardMesh);
      const easeXZ = spin ? C.tween.easings.outBack : C.tween.easings.outCubic;
      const easeSpin = C.tween.easings.outCubic;
      const start = () => {
        const t0 = performance.now();
        if (app.roomGen !== gen) return resolve();
        const hook = () => {
          if (app.roomGen !== gen) { app.offFrame(hook); return resolve(); }
          const t = Math.min(1, (performance.now() - t0) / ms);
          const exz = easeXZ(t);
          cardMesh.position.x = from[0] + (to[0] - from[0]) * exz;
          cardMesh.position.z = from[2] + (to[2] - from[2]) * exz;
          const base = from[1] + (to[1] - from[1]) * t;
          cardMesh.position.y = base + 0.25 * 4 * t * (1 - t);
          cardMesh.rotation.z = zStart + (zEnd - zStart) * easeSpin(t);
          if (t >= 1) {
            cardMesh.position.set(to[0], to[1], to[2]);
            cardMesh.rotation.z = zEnd;
            app.offFrame(hook);
            if (flip) cardMesh.userData.flip(Math.min(220, ms), resolve);
            else resolve();
          }
        };
        hook.cancel = () => { app.offFrame(hook); resolve(); };
        app.onFrame(hook);
      };
      if (delay > 0) setTimeout(start, delay);
      else start();
    });
  }

  // Shared reveal for flat-lying cards (was duplicated in 3 room files).
  function flipFlatCard(app, mesh, ms) {
    if (app.REDUCED) ms = Math.min(ms, 180);
    return new Promise((resolve) => {
      const baseY = mesh.position.y;
      C.tween.to(mesh.position, { y: baseY + 0.05 }, ms / 2, 'outCubic', () => {
        C.tween.to(mesh.position, { y: baseY }, ms / 2, 'outQuart');
      });
      mesh.userData.flip(ms, resolve);
    });
  }

  // Painted card box: a thin transparent decal plane, dashed cream outline,
  // sized to the card footprint + margin. Lay at feltY + 0.002.
  function makeCardBoxDecal({ label = '', sideways = false } = {}) {
    const w = C.layouts.CARD_W + 0.024, h = C.layouts.CARD_H + 0.024;
    const pw = 128, ph = Math.round(pw * h / w);
    const tx = C.assets.canvasTexture(pw, ph, (ctx) => {
      ctx.clearRect(0, 0, pw, ph);
      ctx.strokeStyle = 'rgba(240,216,120,0.65)';
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 9]);
      C.assets.roundRect(ctx, 6, 6, pw - 12, ph - 12, 12); ctx.stroke();
      ctx.setLineDash([]);
      if (label) {
        ctx.fillStyle = 'rgba(240,216,120,0.8)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 26px Georgia, serif';
        ctx.fillText(label, pw / 2, ph / 2);
      }
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    if (sideways) mesh.rotation.z = Math.PI / 2;
    mesh.renderOrder = 1;
    return mesh;
  }

  C.cards = { makeCard, dealCardTo, flipFlatCard, makeCardBoxDecal };
  // Back-compat: lobby gallery and not-yet-migrated rooms call these via C.assets.
  C.assets.makeCard = makeCard;
  C.assets.dealCardTo = dealCardTo;
})();
```

- [ ] **Step 3: Slim `src/engine/assets.js`**

- Delete `drawCardBack`, `drawCardFace`, `makeCard`, and `dealCardTo` from `assets.js` (lines ~89-164 and ~465-496).
- Export `roundRect` (cards.js and chips3d.js need it): add `roundRect` to the `C.assets = { … }` export object.
- Remove `makeCard` and `dealCardTo` from the export object (the aliases in cards.js replace them — cards.js loads AFTER assets.js, so the alias assignment overwrites nothing).

- [ ] **Step 4: Add to build order, run tests, verify in browser**

In `build.mjs` SRC_ORDER add `'src/engine/cards.js'` immediately after `'src/engine/assets.js'`.
Run: `node --test tests/ && node build.mjs` — expected: green, build OK.
Open `index.html#gallery` in a browser: the ace/queen/back cards in the front row must render with the new jumbo faces at the larger size, no console errors. Play one blackjack round (rooms still call `C.assets.makeCard`/`dealCardTo` via the aliases): cards fly with spin + overshoot and land at the OLD positions (room migration comes in Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/engine/cards.js src/engine/assets.js src/engine/tween.js build.mjs index.html
git commit -m "feat(casino-3d): jumbo cards, dealt-feel card flights, card box decals"
```

---

### Task 3: `src/engine/chips3d.js` — chip meshes + BetStacks manager

**Files:**
- Create: `src/engine/chips3d.js`
- Modify: `src/engine/assets.js` (delete chip functions), `build.mjs`

**Interfaces:**
- Consumes: `C.layouts.chipBreakdown`, `C.tween`, `C.assets.canvasTexture`.
- Produces: `C.chips = { makeChip(value), makeChipStack(value, n), makeSpotDecal({label, r, color}), createBetStacks(app, opts) }` with aliases `C.assets.makeChip`, `C.assets.makeChipStack`.
  `createBetStacks(app, { getSpotPos, source, dealerPos })` where `getSpotPos(spotId) -> [x, y, z]`, returns:
  `{ add(spotId, value), removeTop(spotId), clear(), settle(spotId, outcome, payoutExtra), disposeAll() }` — `outcome` ∈ `'win' | 'lose' | 'push'`; `settle` returns a Promise; `add/removeTop/clear` are fire-and-forget.

- [ ] **Step 1: Create `src/engine/chips3d.js`**

Move `CHIP_COLORS`, `makeChip`, `makeChipStack` out of `assets.js` verbatim, then add (complete new code):

```js
  const CHIP_H = 0.0072;

  // Painted circular bet spot decal (MAIN / ANTE / TRIPS ... ) laid on the felt.
  function makeSpotDecal({ label = '', r = 0.09, color = 'rgba(240,216,120,0.65)' } = {}) {
    const P = 128;
    const tx = C.assets.canvasTexture(P, P, (ctx) => {
      ctx.clearRect(0, 0, P, P);
      ctx.strokeStyle = color; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(P / 2, P / 2, P / 2 - 6, 0, Math.PI * 2); ctx.stroke();
      if (label) {
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 24px Georgia, serif';
        ctx.fillText(label, P / 2, P / 2);
      }
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2, r * 2),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 1;
    return mesh;
  }

  function disposeChip(mesh) {
    mesh.geometry?.dispose();
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      .forEach((m) => { if (!m) return; m.map?.dispose(); m.dispose(); });
  }

  // Live 3D wager stacks for one room. Every animation carries the roomGen
  // guard + hook.cancel, mirroring dealCardTo.
  function createBetStacks(app, { getSpotPos, source, dealerPos }) {
    const gen = app.roomGen;
    const stacks = {};            // spotId -> [chip meshes]
    const inFlight = new Set();   // frame hooks, for disposeAll

    function fly(mesh, from, to, ms, onDone) {
      if (app.REDUCED) {
        mesh.position.set(...to);
        onDone && onDone();
        return;
      }
      mesh.position.set(...from);
      const t0 = performance.now();
      const ease = C.tween.easings.outCubic;
      const hook = () => {
        if (app.roomGen !== gen) { app.offFrame(hook); inFlight.delete(hook); return; }
        const t = Math.min(1, (performance.now() - t0) / ms);
        const e = ease(t);
        mesh.position.x = from[0] + (to[0] - from[0]) * e;
        mesh.position.z = from[2] + (to[2] - from[2]) * e;
        mesh.position.y = from[1] + (to[1] - from[1]) * e + 0.12 * 4 * t * (1 - t);
        if (t >= 1) {
          mesh.position.set(...to);
          app.offFrame(hook); inFlight.delete(hook);
          onDone && onDone();
        }
      };
      hook.cancel = () => { app.offFrame(hook); inFlight.delete(hook); onDone && onDone(); };
      inFlight.add(hook);
      app.onFrame(hook);
    }

    function stackTop(spotId) {
      const [x, y, z] = getSpotPos(spotId);
      const n = (stacks[spotId] || []).length;
      return [x, y + 0.005 + n * CHIP_H, z];
    }

    function add(spotId, value) {
      const chip = makeChip(value);
      chip.rotation.y = Math.random() * 0.5 - 0.25;
      (stacks[spotId] ??= []);
      const to = stackTop(spotId);
      stacks[spotId].push(chip);
      app.scene.add(chip);
      fly(chip, source, to, 340);
    }

    function removeTop(spotId) {
      const chip = (stacks[spotId] || []).pop();
      if (!chip) return;
      fly(chip, chip.position.toArray(), source, 280, () => {
        app.scene.remove(chip); disposeChip(chip);
      });
    }

    function clear() {
      for (const id of Object.keys(stacks)) {
        while (stacks[id].length) removeTop(id);
      }
    }

    // Glide a batch of chips to a point, shrink out, dispose.
    function sweep(chips, to, ms) {
      return Promise.all(chips.map((chip, i) => new Promise((res) => {
        setTimeout(() => {
          if (app.roomGen !== gen) { app.scene.remove(chip); disposeChip(chip); return res(); }
          fly(chip, chip.position.toArray(), [to[0], to[1] + i * CHIP_H, to[2]], ms, () => {
            C.tween.to(chip.scale, { x: 0.01, y: 0.01, z: 0.01 }, 140, 'outCubic', () => {
              app.scene.remove(chip); disposeChip(chip); res();
            });
          });
        }, i * 40);
      })));
    }

    // outcome: 'win'  -> payoutExtra chips fly in from the dealer beside the
    //                    stack, brief beat, then everything glides to source.
    //          'lose' -> stack glides to dealerPos.
    //          'push' -> stack glides back to source.
    async function settle(spotId, outcome, payoutExtra = 0) {
      const chips = stacks[spotId] || [];
      stacks[spotId] = [];
      if (!chips.length && outcome !== 'win') return;
      if (outcome === 'lose') return sweep(chips, dealerPos, 420);
      if (outcome === 'push') return sweep(chips, source, 420);
      const [x, y, z] = getSpotPos(spotId);
      const pay = C.layouts.chipBreakdown(payoutExtra);
      const payChips = pay.map((v, i) => {
        const chip = makeChip(v);
        chip.rotation.y = Math.random() * 0.5 - 0.25;
        app.scene.add(chip);
        fly(chip, dealerPos, [x + 0.085, y + 0.005 + i * CHIP_H, z], 380);
        return chip;
      });
      await new Promise((r) => setTimeout(r, app.REDUCED ? 60 : 450));
      return sweep([...chips, ...payChips], source, 460);
    }

    function disposeAll() {
      inFlight.forEach((hook) => app.offFrame(hook));
      inFlight.clear();
      for (const id of Object.keys(stacks)) {
        stacks[id].forEach((chip) => { app.scene.remove(chip); disposeChip(chip); });
      }
      Object.keys(stacks).forEach((k) => delete stacks[k]);
    }

    return { add, removeTop, clear, settle, disposeAll };
  }

  C.chips = { CHIP_COLORS, makeChip, makeChipStack, makeSpotDecal, createBetStacks };
  C.assets.makeChip = makeChip;
  C.assets.makeChipStack = makeChipStack;
```

(Wrap the whole file in the same `(() => { const C = (globalThis.CASINO ??= {}); … })();` IIFE as every other module, with the moved `CHIP_COLORS/makeChip/makeChipStack` at the top.)

- [ ] **Step 2: Slim `assets.js`, wire build order**

Delete `CHIP_COLORS`, `makeChip`, `makeChipStack` from `assets.js` and from its export object. Add `'src/engine/chips3d.js'` to SRC_ORDER after `'src/engine/cards.js'`.

- [ ] **Step 3: Run tests + browser check**

Run: `node --test tests/ && node build.mjs` — green.
Browser: `#gallery` still shows the two chip stacks (aliases work); lobby → blackjack ghost chips render; console clean.

- [ ] **Step 4: Commit**

```bash
git add src/engine/chips3d.js src/engine/assets.js build.mjs index.html
git commit -m "feat(casino-3d): 3D chip module with live bet-stack manager"
```

---

### Task 4: `src/engine/hud.js` + CSS — hand mirror & 2D chip stacks

**Files:**
- Create: `src/engine/hud.js`
- Modify: `src/style.css`, `build.mjs`

**Interfaces:**
- Consumes: `C.outcomes.RANK_LABEL/SUIT_CHAR`.
- Produces: `C.hud = { miniCard(card), createMirror(sections), renderChips(spotEl, denoms) }`.
  `createMirror([{id, label}, …])` → `{ el, set(id, cards, note), clear(), show(), hide(), destroy() }`. `cards` is an array of `{r, s}` or `null` (face-down back). `renderChips(spotEl, denoms)` re-renders the CSS chip stack inside a bet spot element from an array of denominations (visual cap 8).

- [ ] **Step 1: Create `src/engine/hud.js`**

```js
(() => {
  const C = (globalThis.CASINO ??= {});
  const CHIP_CLASS = { 100: 'c100', 500: 'c500', 1000: 'c1000', 5000: 'c5000' };

  function miniCard(card) {
    const el = document.createElement('div');
    if (!card) { el.className = 'mc back'; return el; }
    const red = card.s === 1 || card.s === 2;
    el.className = 'mc' + (red ? ' red' : '');
    const rank = document.createElement('span');
    rank.className = 'mc-r';
    rank.textContent = C.outcomes.RANK_LABEL[card.r];
    const suit = document.createElement('span');
    suit.className = 'mc-s';
    suit.textContent = C.outcomes.SUIT_CHAR[card.s];
    el.append(rank, suit);
    return el;
  }

  // sections: [{ id: 'dealer', label: 'DEALER' }, ...]
  function createMirror(sections) {
    const el = document.createElement('div');
    el.className = 'hand-mirror';
    el.hidden = true;
    const secEls = {};
    for (const s of sections) {
      const sec = document.createElement('div');
      sec.className = 'hm-sec';
      const label = document.createElement('div');
      label.className = 'hm-label';
      label.textContent = s.label;
      const cards = document.createElement('div');
      cards.className = 'hm-cards';
      const note = document.createElement('div');
      note.className = 'hm-note';
      sec.append(label, cards, note);
      el.appendChild(sec);
      secEls[s.id] = { sec, cards, note };
    }
    document.body.appendChild(el);
    return {
      el,
      set(id, cards, note = '') {
        const s = secEls[id];
        if (!s) return;
        s.cards.replaceChildren(...cards.map(miniCard));
        s.note.textContent = note;
      },
      clear() {
        Object.values(secEls).forEach((s) => { s.cards.replaceChildren(); s.note.textContent = ''; });
      },
      show() { el.hidden = false; },
      hide() { el.hidden = true; },
      destroy() { el.remove(); },
    };
  }

  // 2D chip stack inside a bet spot: bottom-anchored, 3px vertical offset per
  // chip, visual cap 8 (the numeric badge stays exact).
  function renderChips(spotEl, denoms) {
    let wrap = spotEl.querySelector('.chips2d');
    if (!denoms.length) { wrap?.remove(); return; }
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'chips2d';
      spotEl.appendChild(wrap);
    }
    wrap.replaceChildren(...denoms.slice(-8).map((v, i) => {
      const chip = document.createElement('div');
      chip.className = 'chip2d ' + (CHIP_CLASS[v] || 'c100');
      chip.style.bottom = i * 3 + 'px';
      chip.textContent = v >= 1000 ? v / 1000 + 'K' : String(v);
      return chip;
    }));
  }

  C.hud = { miniCard, createMirror, renderChips };
})();
```

- [ ] **Step 2: Add CSS to `src/style.css`**

Append:

```css
/* Hand mirror (crisp 2D duplicate of the 3D hands) */
.hand-mirror { position: fixed; top: 3.4rem; right: 1rem; z-index: 23; display: flex;
  flex-direction: column; gap: .55rem; padding: .7rem .8rem; min-width: 180px;
  background: rgba(10,8,4,.88); border: 1px solid #c9a227; border-radius: 8px;
  box-shadow: 0 6px 30px rgba(0,0,0,.6); }
.hm-label { font-size: .68rem; letter-spacing: .2em; color: #b8ad98; margin-bottom: .25rem; }
.hm-cards { display: flex; gap: .3rem; flex-wrap: wrap; }
.hm-note { margin-top: .25rem; font-size: .8rem; color: #f0d878; letter-spacing: .08em; min-height: 1em; }
.mc { position: relative; width: 34px; height: 48px; border-radius: 4px; background: #f8f6ee;
  color: #141414; box-shadow: 0 1px 3px rgba(0,0,0,.5); display: flex; flex-direction: column;
  align-items: center; justify-content: center; font-family: Georgia, serif; }
.mc.red { color: #c0392b; }
.mc.back { background: repeating-linear-gradient(45deg, #1e3a8a 0 4px, #2b4a9d 4px 8px);
  border: 2px solid #c9a227; }
.mc-r { font-size: 1rem; font-weight: bold; line-height: 1; }
.mc-s { font-size: .85rem; line-height: 1; }

/* 2D chip stacks inside bet spots */
.chips2d { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
  width: 38px; height: 60px; pointer-events: none; }
.chip2d { position: absolute; left: 0; width: 38px; height: 38px; border-radius: 50%;
  border: 3px dashed #fff; display: flex; align-items: center; justify-content: center;
  font-size: .6rem; color: #fff; text-shadow: 0 1px 2px #000; box-shadow: 0 1px 2px rgba(0,0,0,.55); }
.chip2d.c100 { background: #2e6db4; } .chip2d.c500 { background: #8e44ad; }
.chip2d.c1000 { background: #c0392b; } .chip2d.c5000 { background: #b8860b; }
```

And inside the existing `@media (max-width: 768px)` block:

```css
  .hand-mirror { top: 2.9rem; left: .5rem; right: .5rem; flex-direction: row;
    justify-content: center; gap: 1.2rem; min-width: 0; padding: .45rem .5rem; }
  .mc { width: 26px; height: 38px; }
```

- [ ] **Step 3: Wire build order, run tests**

Add `'src/engine/hud.js'` to SRC_ORDER after `'src/engine/chips3d.js'`.
Run: `node --test tests/ && node build.mjs` — green (hud has no node-testable logic; DOM verification happens in room tasks).

- [ ] **Step 4: Commit**

```bash
git add src/engine/hud.js src/style.css build.mjs index.html
git commit -m "feat(casino-3d): hand-mirror HUD and 2D chip stack renderer"
```

---

### Task 5: Dealer deal-gesture + head tracking (`src/engine/assets.js`)

**Files:**
- Modify: `src/engine/assets.js` (`makeDealer`, lines ~237-346)

**Interfaces:**
- Consumes: `C.tween`, THREE.
- Produces: on the dealer group — `userData.dealGesture(app, worldTarget, ms = 650) -> Promise` (right arm: rest → shoe reach → sweep toward target → rest; re-entrant, latest call wins), `userData.lookToward(app, worldTarget)` (head group yaw eases toward the target, clamped ±0.6 rad), plus the existing `userData.idle(app)`.

- [ ] **Step 1: Refactor head + arms for animation**

Inside `makeDealer()`:

1. **Head group** (a rotating sphere is invisible — the hair must turn with it):

```js
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.57;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skinMat);
    head.castShadow = true; head.receiveShadow = true;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.116, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), blackMat);
    hair.castShadow = true;
    headGroup.add(head, hair);
    group.add(headGroup);
```

(replacing the current separate `head`/`hair` adds; their old `position.y = 1.57` moves onto `headGroup`.)

2. **Keep arm references + pose solver.** Change `makeArm(side)` to also RETURN its pieces, keep the existing rest solve, and store rest quaternions:

```js
    const armR = makeArm(1), armL = makeArm(-1);
    group.add(armL.shoulder, armR.shoulder);
```

where `makeArm` now ends with `return { shoulder, elbow, shoulderPos };` (`shoulder` is the group it already builds, `elbow` the elbow group, `shoulderPos` the THREE.Vector3 it already computes).

3. **Pose targets + gesture.** After the arms:

```js
    // Solve a shoulder quaternion that points the arm (local -Y) at a
    // dealer-LOCAL point — same math as the rest pose.
    const _v = new THREE.Vector3();
    function armQuat(arm, localTarget) {
      _v.copy(localTarget).sub(arm.shoulderPos).normalize();
      return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), _v);
    }
    const restQuatR = armR.shoulder.quaternion.clone();

    function slerpQ(app, obj, toQuat, ms, token, getToken) {
      return new Promise((resolve) => {
        if (app.REDUCED) { obj.quaternion.copy(toQuat); return resolve(); }
        const fromQuat = obj.quaternion.clone();
        const t0 = performance.now();
        const hook = () => {
          if (getToken() !== token) { app.offFrame(hook); return resolve(); }
          const t = Math.min(1, (performance.now() - t0) / ms);
          obj.quaternion.slerpQuaternions(fromQuat, toQuat, C.tween.easings.inOutCubic(t));
          if (t >= 1) { app.offFrame(hook); resolve(); }
        };
        hook.cancel = () => { app.offFrame(hook); resolve(); };
        app.onFrame(hook);
      });
    }

    let gestureId = 0;
    group.userData.dealGesture = async (app, worldTarget, ms = 650) => {
      if (app.REDUCED) return;
      const token = ++gestureId;
      const getToken = () => gestureId;
      const local = group.worldToLocal(new THREE.Vector3(...worldTarget));
      // reach: hand toward a point up-forward-right (the shoe side)
      const reach = armQuat(armR, new THREE.Vector3(0.35, 1.05, 0.3));
      const sweep = armQuat(armR, local.setY(Math.min(local.y, 1.05)));
      await slerpQ(app, armR.shoulder, reach, ms * 0.3, token, getToken);
      await slerpQ(app, armR.shoulder, sweep, ms * 0.4, token, getToken);
      await slerpQ(app, armR.shoulder, restQuatR, ms * 0.3, token, getToken);
    };

    let lookId = 0;
    group.userData.lookToward = (app, worldTarget) => {
      if (app.REDUCED) return;
      const token = ++lookId;
      const local = group.worldToLocal(new THREE.Vector3(...worldTarget));
      const yaw = Math.max(-0.6, Math.min(0.6, Math.atan2(local.x, local.z)));
      const t0 = performance.now(), from = headGroup.rotation.y;
      const hook = () => {
        if (lookId !== token) return app.offFrame(hook);
        const t = Math.min(1, (performance.now() - t0) / 300);
        headGroup.rotation.y = from + (yaw - from) * C.tween.easings.outCubic(t);
        if (t >= 1) app.offFrame(hook);
      };
      hook.cancel = () => app.offFrame(hook);
      app.onFrame(hook);
    };
```

Note: `group.worldToLocal` requires the dealer to be scene-attached with updated matrices — rooms only call gestures after `enter()` adds the dealer, and the render loop updates matrices every frame, so this holds.

- [ ] **Step 2: Run tests + browser check**

Run: `node --test tests/ && node build.mjs` — green.
Browser `#gallery`: dealer still renders correctly (arms in rest pose at the table-rest position, head + hair intact). No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/assets.js index.html
git commit -m "feat(casino-3d): dealer deal gesture and head tracking"
```

---

### Task 6: Blackjack room integration

**Files:**
- Modify: `src/rooms/blackjack.js`

**Interfaces:**
- Consumes: `C.layouts.blackjack` (aliased `L`), `C.cards.*`, `C.chips.createBetStacks/makeSpotDecal`, `C.hud.createMirror/renderChips`, dealer `userData.dealGesture/lookToward`.
- Produces: nothing new for later tasks (self-contained room).

- [ ] **Step 1: Swap layout constants**

At the top of the IIFE bind the shared layout (SRC_ORDER guarantees `layouts.js` runs before any room file):

```js
  const L = C.layouts.blackjack;
```

Delete `SHOE_POS`, `PLAYER_BASE`, `DEALER_BASE`, `FAN_DX`, and `POSE_DEAL`; keep `WIDE_POSE`, `POSE_SEAT`. Then:

```js
  const SHOE_POS = L.shoePos;
  const POSE_DEAL = L.poseDeal;
  function cardPos(slots, idx) {
    if (idx < slots.length) return slots[idx];
    const last = slots[slots.length - 1];
    return [last[0] + (idx - slots.length + 1) * L.fanDx, last[1], last[2]];
  }
```

Replace every `cardPos(PLAYER_BASE, i)` with `cardPos(L.playerSlots, i)` and every `cardPos(DEALER_BASE, i)` with `cardPos(L.dealerSlots, i)`.

- [ ] **Step 2: Delete the local `flipFlatCard`, use the shared one**

Delete the room's `flipFlatCard` function; replace calls with `C.cards.flipFlatCard(app, mesh, ms)`. Replace `A.makeCard` → `C.cards.makeCard`, `A.dealCardTo` → `C.cards.dealCardTo` (drop reliance on aliases within rooms).

- [ ] **Step 3: Paint boxes + spots, create stacks + mirror in `enter()`**

After the felt/rim setup add:

```js
      // painted card boxes + bet spots — positions ARE the deal/chip targets
      [...L.playerSlots, ...L.dealerSlots].forEach((slot) => {
        const box = C.cards.makeCardBoxDecal();
        box.position.set(slot[0], L.feltY + 0.002, slot[2]);
        scene.add(box);
      });
      Object.values(L.spots).forEach(({ pos, r, label }) => {
        const decal = C.chips.makeSpotDecal({ label, r });
        decal.position.set(pos[0], L.feltY + 0.002, pos[2]);
        scene.add(decal);
      });
      const stacks = C.chips.createBetStacks(app, {
        getSpotPos: (id) => L.spots[id].pos,
        source: L.chipSource,
        dealerPos: L.dealerChipPos,
      });
      const mirror = C.hud.createMirror([
        { id: 'dealer', label: 'DEALER' },
        { id: 'player', label: 'YOUR HAND' },
      ]);
```

Store `stacks`/`mirror` in module-scope `let` bindings (like `ui`) so `exit()` can clean them: `exit()` gains `stacks?.disposeAll(); stacks = null; mirror?.destroy(); mirror = null;`.

- [ ] **Step 4: Live chips in the overlay**

`makeOverlay(onDeal)` becomes `makeOverlay(onDeal, stacks)` (pass it at the `setTimeout` call site). Inside, track denominations per spot and wire the three mutation points:

```js
    const placed = { main: [], perfectPair: [], twentyOnePlusThree: [] };

    function placeBet(id) {
      bets[id] = (bets[id] || 0) + selectedDenom;
      history.push({ id, amt: selectedDenom });
      placed[id].push(selectedDenom);
      stacks.add(id, selectedDenom);
      refresh();
    }
```

UNDO handler adds `placed[last.id].pop(); stacks.removeTop(last.id);`.
CLEAR handler adds `Object.values(placed).forEach((a) => (a.length = 0)); stacks.clear();`.
In `refresh()`, after the badge loop add `C.hud.renderChips(el, placed[el.dataset.spot] || []);`
`resetBets()` clears `placed` arrays (the 3D stacks are consumed by settlement, don't `stacks.clear()` there).

- [ ] **Step 5: Mirror + dealer gesture through the round**

- In `startRound` after `app.flyTo(POSE_DEAL, 800)`: `mirror.clear(); mirror.show();`
- Helper inside `enter()` (needs `dealer` + `gen`):

```js
      const gesture = (pos, delay = 0) => {
        setTimeout(() => {
          if (app.roomGen !== gen) return;
          dealer.userData.dealGesture(app, pos);
          dealer.userData.lookToward(app, pos);
        }, delay);
      };
```

- In `dealInitial`, before the `Promise.all`, fire `gesture(cardPos(L.playerSlots, 0), 0)`, `gesture(cardPos(L.dealerSlots, 0), 320)`, `gesture(cardPos(L.playerSlots, 1), 640)`, `gesture(cardPos(L.dealerSlots, 1), 960)` (matching the existing 320ms stagger). After the deal resolves update the mirror:

```js
        mirror.set('player', [pc1, pc2], 'TOTAL ' + O.handValue([pc1, pc2]).total);
        mirror.set('dealer', [dc1, null], 'SHOWING ' + O.handValue([dc1]).total);
```

- In the HIT handler after the card lands: `gesture(...)` before the deal, then `mirror.set('player', playerHand.map((h) => h.card), 'TOTAL ' + v.total + (v.soft ? ' (soft)' : ''));`
- In `resolveDealer` after the hole flip: `mirror.set('dealer', dealerHand.map((h) => h.card), 'TOTAL ' + O.handValue(dealerHand.map((h) => h.card)).total);` and update again after the draw loop completes; `gesture` each drawn card with its `i * 500` delay.

- [ ] **Step 6: Chip settlement in `settle()`**

Before `await app.banner(...)` compute per-spot outcomes and run them concurrently with the banner:

```js
        const mainRet = O.settleBlackjack({ main: bets.main }, playerRaw, dealerRaw);
        const spotOutcome = (spotAmt, retAmt) =>
          spotAmt === 0 ? null : retAmt === 0 ? 'lose' : retAmt === spotAmt ? 'push' : 'win';
        const settles = [
          ['main', spotOutcome(bets.main, mainRet), Math.max(0, mainRet - bets.main)],
          ['perfectPair', spotOutcome(bets.perfectPair, ppRet), Math.max(0, ppRet - bets.perfectPair)],
          ['twentyOnePlusThree', spotOutcome(bets.twentyOnePlusThree, tptRet), Math.max(0, tptRet - bets.twentyOnePlusThree)],
        ].filter(([, o]) => o);
        const chipsDone = Promise.all(settles.map(([id, o, extra]) => stacks.settle(id, o, extra)));
```

(`ret` for the wallet credit stays exactly as computed today — chips are visual.)
After the banner: `await chipsDone;` then `mirror.hide();` before the existing cleanup/flyTo/reset.

- [ ] **Step 7: Full check**

Run: `node --test tests/ && node build.mjs`.
Browser, full blackjack rounds (aim for one win, one loss, one push, one blackjack, one bust):
- 4 dashed card boxes visible; every initial card lands centered in its box; hit cards fan right.
- Chips: tap MAIN/PP/21+3 → CSS chip stacks in the circles AND 3D chips flying onto the painted felt spots in real time; UNDO/CLEAR reverse both.
- Mirror matches the 3D cards at every step; hole card shows as a back until reveal.
- Dealer arm sweeps on deals; head follows; win → payout chips arrive then glide to you; loss → dealer pulls the stack.
- Leave the room mid-round: no orphan meshes/DOM, no console errors.

- [ ] **Step 8: Commit**

```bash
git add src/rooms/blackjack.js index.html
git commit -m "feat(casino-3d): blackjack — boxed cards, live chips, mirror, dealer motion"
```

---

### Task 7: Baccarat room integration

**Files:**
- Modify: `src/rooms/baccarat.js`, `src/style.css` (remove `.bac-tag` rules)

**Interfaces:**
- Consumes: `C.layouts.baccarat`, `C.cards.*`, `C.chips.*`, `C.hud.*`, dealer gestures.
- Produces: nothing (self-contained).

- [ ] **Step 1: Layout swap + third card sideways**

`const L = C.layouts.baccarat;` — delete `PLAYER_X`, `BANKER_X`, `ZONE_Z0`, `FAN_DZ`, `CARD_Y`, `SHOE_POS`, `POSE_CARDS` (use `L.poseDeal` where `POSE_CARDS` was; keep `WIDE_POSE`/`POSE_SEAT`). Replace `zonePos(x, idx)` with:

```js
      function slotFor(side, idx) {
        return (side === 'player' ? L.playerSlots : L.bankerSlots)[idx];
      }
```

In `dealInitial` and `dealThird`, replace `const x = d.side === 'player' ? PLAYER_X : BANKER_X;` + `zonePos(x, idx)` with `slotFor(side, idx)`. For the third card (idx 2), set the sideways orientation before dealing:

```js
        if (idx === 2) mesh.rotation.z = side === 'player' ? Math.PI / 2 : -Math.PI / 2;
```

(rotation.z is the innermost Euler axis — the card stays flat and face-down/up logic via rotation.y is unaffected; dealCardTo v2 preserves the caller's final rotation.z.)

- [ ] **Step 2: Felt texture — drop the old dashed zones**

In `makeFeltTexture`, delete the trailing dashed-zone block (the `zoneFrac` helper and the `[PLAYER_X, BANKER_X].forEach(...)` strokeRect loop) — box decals replace it.

- [ ] **Step 3: Decals, stacks, mirror, chips-in-overlay, gestures**

Same pattern as blackjack (Task 6 steps 3-5), with:
- Box decals: `L.playerSlots`/`L.bankerSlots` indices 0-1 upright, index 2 `makeCardBoxDecal({ sideways: true })`.
- Spot decals for all five `L.spots` (they also visually replace the texture zones for pairs).
- Overlay `placed` keys: `player, banker, tie, pPair, bPair`.
- Mirror sections: `[{ id: 'player', label: 'PLAYER' }, { id: 'banker', label: 'BANKER' }]`. Replace `showTag`/`clearTags` entirely (delete them + the `tagEls` module state + the `.bac-tag` CSS rules): where `showTag('player', total)` was called, use `mirror.set('player', round.P.slice(0, n), 'TOTAL ' + total)` with the same card slices the tags used; show face-down backs (`[null, null]`) for undealt/unflipped states at the start of `dealRound`.
- Gestures: in `dealInitial` fire `gesture(slotFor(d.side, d.idx), i * 380)` per card; in `dealThird` fire before the deal.

- [ ] **Step 4: Settlement**

In `startRound` after computing `ret`, settle each spot from its individual return (concurrent with the banner, awaited after — same shape as Task 6 Step 6):

```js
        const settles = Object.entries(bets)
          .filter(([, amt]) => amt > 0)
          .map(([id, amt]) => {
            const r = O.baccaratReturn({ [id]: amt }, round);
            const outcome = r === 0 ? 'lose' : r === amt ? 'push' : 'win';
            return stacks.settle(id, outcome, Math.max(0, r - amt));
          });
        const chipsDone = Promise.all(settles);
```

(Note: a tie result pushes player/banker main bets — `baccaratReturn({player: amt}, tieRound)` returns the stake back, which lands in the `'push'` branch.)

- [ ] **Step 5: Full check + commit**

`node --test tests/ && node build.mjs`; browser rounds covering player win, banker win, tie, a 3rd-card draw (sideways card lands in the sideways box), pair side bets. Mid-round exit clean; console clean.

```bash
git add src/rooms/baccarat.js src/style.css index.html
git commit -m "feat(casino-3d): baccarat — boxed cards w/ sideways third, live chips, mirror"
```

---

### Task 8: UTH room integration

**Files:**
- Modify: `src/rooms/uth.js`

**Interfaces:**
- Consumes: `C.layouts.uth`, `C.cards.*`, `C.chips.*`, `C.hud.*`, dealer gestures.
- Produces: nothing (self-contained).

- [ ] **Step 1: Layout swap**

`const L = C.layouts.uth;` — delete `DECK_POS`, `PLAYER_BASE`, `DEALER_BASE`, `BOARD_BASE_X`, `FAN_DX`, `CARD_Y`, `POSE_DEAL`; use `L.deckPos`, `L.poseDeal`. Replace `playerCardPos(idx)`/`dealerCardPos(idx)`/`boardCardPos(idx)` with `L.playerSlots[idx]`/`L.dealerSlots[idx]`/`L.boardSlots[idx]`. `ghostCardPos` stays (ghost props are decorative). Local `flipFlatCard` deleted → `C.cards.flipFlatCard(app, mesh, ms)`; `A.makeCard`/`A.dealCardTo` → `C.cards.*`.

- [ ] **Step 2: Felt texture cleanup**

In `makeFeltTexture` delete: the dashed community-slot loop (5 `strokeRect`s), the ANTE=BLIND circle block, and the TRIPS circle block. KEEP the community strip tint, 'COMMUNITY CARDS' text, and ellipse border. Decals take over: card box decals at `L.playerSlots`, `L.dealerSlots`, and all 5 `L.boardSlots`; spot decals for `L.spots` (ante/blind/jackpot/trips).

- [ ] **Step 3: Stacks + overlay — ante mirrors blind**

Create `stacks`/`mirror` as in Task 6 Step 3 (mirror sections: `dealer`, `board`, `player`). Overlay chips:

```js
    const placed = { ante: [], blind: [], trips: [], jackpot: [] };
```

- `placeAnte()` (after the range check): `placed.ante.push(selectedDenom); placed.blind.push(selectedDenom); stacks.add('ante', selectedDenom); stacks.add('blind', selectedDenom);`
- `placeBet('trips')`: `placed.trips.push(selectedDenom); stacks.add('trips', selectedDenom);`
- `toggleJackpot()`: on → `placed.jackpot = [100]; stacks.add('jackpot', 100);` off → `placed.jackpot = []; stacks.removeTop('jackpot');`
- UNDO: ante entries pop BOTH ante+blind (`stacks.removeTop('ante'); stacks.removeTop('blind');`); jackpot toggle entries re-toggle (add/remove the single chip); trips pops trips.
- CLEAR: empty all `placed` arrays + `stacks.clear()`.
- `refresh()`: `C.hud.renderChips` on `anteEl` with `placed.ante`, `tripsEl` with `placed.trips`, `jackpotEl` with `placed.jackpot` (the blind stack exists only in 3D — there is no blind element in the overlay).

- [ ] **Step 4: Mirror + gestures through the streets**

- `startRound`: `mirror.clear(); mirror.show();` after the flyTo.
- After `dealInitial`: `mirror.set('player', playerHole, ''); mirror.set('dealer', [null, null], '');` and fire `gesture(pos, delay)` per non-ghost card in the `seq` (use each entry's `pos` and `i * 220` delay).
- After each street's flips: `mirror.set('board', board.slice(0, n), '')` for n = 3, 4, 5; `gesture(L.boardSlots[i], …)` per board card dealt.
- After the dealer reveal: `mirror.set('dealer', dealerHole, '');` and at settle: `mirror.set('player', playerHole, O.HAND_NAMES[result.p.cat]); mirror.set('dealer', dealerHole, O.HAND_NAMES[result.d.cat]);`

- [ ] **Step 5: Settlement (visual approximation — settleUTH exposes only the aggregate)**

```js
        // settleUTH returns only the aggregate `ret` — per-bet outcomes are a
        // VISUAL approximation: win -> winnings pushed at the ante spot, other
        // stacks return to the player; lose -> dealer takes everything;
        // push -> everything returns.
        const spotIds = ['ante', 'blind', 'trips', 'jackpot'].filter((id) => placed[id].length);
        let chipsDone;
        if (result.cmp > 0) {
          const stakes = bets.ante * 2 + bets.trips + (bets.jackpot ? 100 : 0);
          chipsDone = Promise.all([
            stacks.settle('ante', 'win', Math.max(0, result.ret - stakes)),
            ...spotIds.filter((id) => id !== 'ante').map((id) => stacks.settle(id, 'push', 0)),
          ]);
        } else {
          const outcome = result.cmp === 0 ? 'push' : 'lose';
          chipsDone = Promise.all(spotIds.map((id) => stacks.settle(id, outcome, 0)));
        }
```

Run concurrent with the banner, `await chipsDone;` + `mirror.hide();` after it.

- [ ] **Step 6: Full check + commit**

`node --test tests/ && node build.mjs`; browser rounds: boxes for player/dealer/board all land exactly; ante tap fills BOTH ante+blind stacks (2D ante circle + both 3D spots); jackpot toggle places/removes one 100 chip; mirror walks hole cards → flop → turn → river → showdown hand names. Mid-round exit clean.

```bash
git add src/rooms/uth.js index.html
git commit -m "feat(casino-3d): UTH — boxed cards, ante+blind live chips, street mirror"
```

---

### Task 9: Roulette room integration

**Files:**
- Modify: `src/rooms/roulette.js`, `src/style.css` (`.chip-mini`)

**Interfaces:**
- Consumes: `C.layouts.rouletteSpotPos`, `C.chips.createBetStacks`, `C.hud` (not the mirror — no cards here).
- Produces: nothing (self-contained).

- [ ] **Step 1: Verify the v→z sign of `rouletteSpotPos` FIRST**

Temporary check in the browser console after entering the roulette room:

```js
const [x, z] = CASINO.layouts.rouletteSpotPos('n0');
const probe = CASINO.chips.makeChip(500);
probe.position.set(x, 0.88, z);
CASINO.app.scene.add(probe);
```

The chip must sit on the green `0` cell (left end of the grid). If it sits mirrored front-to-back, flip `Z_SIGN` to `-1` in `src/logic/layouts.js` and re-run `node --test tests/layouts.test.mjs` (the tests are sign-agnostic by design). Remove the probe (reload).

- [ ] **Step 2: Live 3D chips from the grid**

In `enter()` create the stack manager (module-scope `let stacks`):

```js
      stacks = C.chips.createBetStacks(app, {
        getSpotPos: (id) => {
          const [x, z] = C.layouts.rouletteSpotPos(id);
          return [x, FELT_Y + 0.021, z];   // felt box top face
        },
        source: [0, FELT_Y + 0.021, 0.62],
        dealerPos: [0, FELT_Y + 0.021, -0.6],
      });
```

Pass `stacks` into `makeOverlay`; wire `placeBet` → `stacks.add(id, selectedDenom)`, UNDO → `stacks.removeTop(last.id)`, CLEAR → `stacks.clear()`. `exit()` → `stacks?.disposeAll(); stacks = null;`.

- [ ] **Step 3: 2D chip icon on grid spots**

Grid cells are too small for stacks — show one mini chip colored by the LARGEST denomination placed on that spot. Track `placed = {}` (spotId → denom array) alongside `bets` (push in placeBet, pop in UNDO, wipe in CLEAR/resetBets). In `refresh()`'s spot loop:

```js
        let mini = el.querySelector('.chip-mini');
        const denoms = placed[el.dataset.spot] || [];
        if (denoms.length) {
          if (!mini) { mini = document.createElement('span'); mini.className = 'chip-mini'; el.appendChild(mini); }
          mini.dataset.v = Math.max(...denoms);
        } else if (mini) mini.remove();
```

CSS (append to `src/style.css`):

```css
.chip-mini { position: absolute; left: 4px; bottom: 4px; width: 14px; height: 14px;
  border-radius: 50%; border: 2px dashed #fff; box-shadow: 0 1px 2px rgba(0,0,0,.6); }
.chip-mini[data-v="100"] { background: #2e6db4; } .chip-mini[data-v="500"] { background: #8e44ad; }
.chip-mini[data-v="1000"] { background: #c0392b; } .chip-mini[data-v="5000"] { background: #b8860b; }
```

- [ ] **Step 4: Per-spot settlement after the spin**

In `startRound` after `ret` is computed (keep wallet credit as-is):

```js
        const chipsDone = Promise.all(Object.entries(betsSnapshot).map(([id, amt]) => {
          const r = O.rouletteReturn({ [id]: amt }, result);
          return stacks.settle(id, r > 0 ? 'win' : 'lose', Math.max(0, r - amt));
        }));
```

before the banner; `await chipsDone;` after it (before flyTo/reset).

- [ ] **Step 5: Full check + commit**

`node --test tests/ && node build.mjs`; browser: chips land on the correct painted cells (spot-check 0, a few numbers across all three rows, RED, a dozen, a column), spin resolves each stack independently (winners paid at the spot then pushed to you, losers raked), UNDO/CLEAR mirror in 3D, mid-spin exit clean, console clean.

```bash
git add src/rooms/roulette.js src/style.css index.html
git commit -m "feat(casino-3d): roulette — live chips on the painted layout, per-spot settlement"
```

---

### Task 10: Gallery props, final build, full-session verification

**Files:**
- Modify: `src/boot.js` (gallery), `.superpowers/sdd/progress-3d-preview.md` (repo root path: `.superpowers/sdd/`)

- [ ] **Step 1: Gallery additions**

In the `#gallery` branch of `boot.js`, extend `frontItems` with the new props so prop-QA covers them:

```js
    const boxDecal = C.cards.makeCardBoxDecal({ label: 'BOX' });
    boxDecal.rotation.x = 0;                       // stand upright for the gallery camera
    const spotDecal = C.chips.makeSpotDecal({ label: 'MAIN', r: 0.11 });
    spotDecal.rotation.x = 0;
    const frontItems = [
      A.makeCard({ r: 14, s: 0 }), A.makeCard({ r: 12, s: 1 }), A.makeCard(null),
      A.makeChipStack(100, 5), A.makeChipStack(5000, 9),
      boxDecal, spotDecal,
    ];
```

(and widen the x spread from `(i - 2) * 0.8` to `(i - 3) * 0.7` so seven items fit.)

- [ ] **Step 2: Full suite + rebuild**

Run: `node --test tests/` — ALL green. `node build.mjs` — rebuilt.

- [ ] **Step 3: Full-session browser verification (the definition of done)**

One continuous session in the browser, `file://` open:
1. Splash → lobby → each of the 4 rooms → back to lobby, twice.
2. In each card room: cards land in their painted boxes at matching size; mirror always agrees with the felt; dealer arm+head move on every deal.
3. In every room: chips appear on the felt from the FIRST overlay tap; UNDO/CLEAR reflect in 3D; settlement animates win/lose/push correctly; wallet math unchanged from before this plan.
4. Reduced-motion (`chrome://flags` or OS setting, or spot-check by temporarily forcing `REDUCED = true`): rounds complete fast with no hangs.
5. Mid-round room exits from each room: no stuck promises, no orphan meshes/DOM nodes, `#overlay-root` empty, zero console errors for the entire session.

- [ ] **Step 4: Progress notes + commit**

Append a dated section to `.superpowers/sdd/progress-3d-preview.md` summarizing what shipped and any follow-ups discovered.

```bash
git add src/boot.js index.html ../../../../../../.superpowers/sdd/progress-3d-preview.md
git commit -m "feat(casino-3d): gallery props for boxes/spots; clarity+chips+motion complete"
```
