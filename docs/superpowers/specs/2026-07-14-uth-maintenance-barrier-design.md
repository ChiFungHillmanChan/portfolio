# UTH 3D Lobby Maintenance Barrier — "Dealer Training" Design

**Date:** 2026-07-14
**Scope:** `portfolio/src/game/casino-game/calculator/lobby-3d/` (+ mirrored `public/games/casino-game/lobby-3d/`)

## Goal

The Ultimate Texas Hold'em 3D playable table is not finished. Until it ships, the
UTH table in the 3D lobby must stay **visible** but be **actually unplayable**:
players cannot walk into the table area, and no UI path offers a "Sit down"
link. The closure is themed as **dealer training** (維修中), with a realistic
physical barrier and signboard.

## Non-goals

- Blocking the standalone 2D UTH page (`../ultimate-texas-holdem/index.html`)
  by direct URL — out of scope; this closure is the 3D lobby only.
- Removing the UTH section from quicknav — players can still *view* the
  section from outside the barrier.

## Design

### 1. Model: the closure is data (`floor-model.js`)

The `uth:main` table gains:

```js
closed: true,
closedNotice: 'Our dealers are training on this table. Multiplayer opens soon.',
href: null,          // the play link ceases to exist — not merely hidden
```

Everything else derives from this flag. Tests in `tests/floor-model.test.mjs`
assert `closed === true` and `href === null`.

### 2. Physical barrier (`src/floor/maintenance.js`, new inlined file)

`C.floor.buildMaintenanceZone({ rect, signLines, trainer })` builds, around
world-rect `x 3.45–7.3 / z 4.4–8.9` (enclosing the UTH table at 5.2, 6.5):

- **Stanchion posts** (dark steel, ~0.95 m, weighted base) at corners and
  every ≤ 0.96 m along each edge.
- **Hazard rails**: two yellow/black diagonal-striped boards (top ~0.82 m,
  mid ~0.45 m) between consecutive posts.
- **A-frame signboard** centered on the front rail, facing the aisle:
  "DEALER TRAINING" / "TABLE CLOSED · 維修中" / small apology line, with a
  pulsing amber beacon on top (same `onFrame` pulse idiom as the slot toppers).
- **Two traffic cones** inside the enclosure.
- **Supervisor figure** (`makeDealer` with navy suit) standing beside the
  table's dealer, watching — sells the "training in progress" scene.
- **Collision**: circle obstacles (r 0.35) chained under every rail at ≤ 0.9 m
  spacing. With player radius 0.35, passing between two obstacles requires
  centre spacing ≥ 1.4 m, so the chain is a hard wall for WASD, tap-to-move
  and glides alike.

Geometry constraints verified against the existing floor:

- **Cashier corridor** (between baccarat and UTH tables, x ≈ 2.35–2.65 at
  z 6.5) stays open: the west rail at x 3.45 blocks only x > 2.75, which is
  already inside the UTH table's own obstacle (blocks x > 2.65).
- **East side**: rail at x 7.3 clears the "OPENING SOON" dais (edge x 7.6);
  rail chain + pad obstacles overlap, so there is no slip route north or
  south of the pads.
- **Back**: rail at z 8.9; the leftover wall strip behind it is either
  blocked (plant at 6.9, 9.8 + cashier cage) or an unreachable dead pocket —
  harmless, `clampWalk` can never route a player into it.

`build.mjs` `SRC_ORDER` gains `src/floor/maintenance.js` before `sections.js`.

### 3. Section wiring (`src/floor/sections.js`)

`ROWS.uth` gains `closedZone: { x0: 3.45, x1: 7.3, z0: 4.4, z1: 8.9 }`.
When a table is `closed`:

- accent overrides to amber `#ffb040` (glow pad reads as "notice", not tier),
- `buildMaintenanceZone` is invoked with the rect, sign lines and trainer pose,
- the table anchor and pickable stay — approaching or clicking glides the
  camera to the aisle-side approach (outside the rails) and shows the closed
  card. The camera approach pose (z 3.8) is outside the barrier line (z 4.4).

### 4. UI (`ui.js`, `platform.js`)

- New `closedTableCard({ gameName, notice, onOk })`: title, "Dealer training
  in progress · 維修中" subtitle, notice text, single OK button. **No link.**
- `platform.js#showProximityCard`: `anchor.table.closed` routes to the closed
  card; 'closed' added to the proximity-hide list.
- Belt-and-braces: `sitdownCard` renders its primary action only when
  `table.href` is truthy (a null href can never become a live link).
- Zone label for `uth` becomes "Ultimate Hold'em — Dealer Training".

### 5. Sync

All changed files mirror to `portfolio/public/games/casino-game/lobby-3d/`
and both trees rebuild `index.html` via `node build.mjs`.

## Blocking matrix (every play path)

| Path | Block |
|---|---|
| Walk to table (WASD) | obstacle chain under rails |
| Tap-to-move into zone | `clampWalk` stops at rails |
| Click table mesh | glides to approach *outside* rails → closed card |
| Proximity sit-down card | routed to `closedTableCard` (no link) |
| Quicknav → UTH | camera pose outside barrier (view only) |
| `sitdownCard` somehow reached | `href: null` → no anchor rendered |

## Testing

- `node --test tests/` — floor-model closed-flag assertions + existing suites.
- Manual browser run: walk at the rails from all sides (blocked), cashier
  still reachable, closed card shows on approach/click, no console errors.
