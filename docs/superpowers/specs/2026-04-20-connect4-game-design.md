# Connect 4 — Portfolio Game Design

**Date:** 2026-04-20
**Status:** Approved for implementation
**Live URL target:** `https://connect4.hillmanchan.com`

## Goal

Ship a Connect 4 game into the portfolio, following the exact integration pattern used for `card-game` and `casino-game`:

- Standalone HTML under `portfolio/public/games/connect4/`
- React iframe wrapper under `portfolio/src/game/connect4/`
- Registered in `App.js` (route + subdomain routing) and `ProjectDetail.js`
- Project card in `projectData.json`
- Subdomain `connect4.hillmanchan.com` (DNS + CloudFront rewrite — external, same process the user used for `observation-report-demo`)

The AI must play strongly enough to win every game against any human in its default configuration.

## Connect 4 Theory

Connect 4 is a **solved first-player-win** (Victor Allis 1988; James D. Allen 1988):

- First player wins by playing **column 3 (center)** on move 1.
- With perfect play, first player wins no later than move 41.
- If the first player does **not** play center, the game is drawn with optimal play from both sides.

**Implication for "always win":**
- If the **AI moves first**, a perfect-play engine guarantees a win.
- If the **human moves first** and plays perfectly, the AI **cannot always win** — the game is a draw at best.

Our design makes AI-first the default on the top difficulty (“Impossible”), so the AI always wins in default configuration.

## User Requirements

1. Fix the provided HTML (it has fatal JS bugs — see Bug List below).
2. Strengthen the AI so that it plays perfect Connect 4.
3. Integrate into the portfolio as a game (dashboard tile + subdomain route).
4. Host at `connect4.hillmanchan.com`.

## Bug List (existing HTML)

| Bug | Location | Fix |
|---|---|---|
| `cons= (1n << ...)` missing identifier | bitboard constants | `const BOARD_BITS = ...` (constant is unused anyway — delete it) |
| `Potion.hasFourInARow` typo | `makeMove()` | `Position.hasFourInARow` |
| `penow()` typo | `aiMove()` | `performance.now()` |
| `transrm:` typo | `.disc` CSS rule | `transform:` |
| `const i (ROWS - 1 - last.row)` missing `=` | `undo()` | `const idx = (ROWS - 1 - last.row) * COLS + last.col` |
| `humanIsCurrt` typo | `undo()` | `humanIsCurrent` |
| `</script>body>` malformed closing | end of `<script>` | `</script>\n</body>` |
| `3 * H1 + r` evaluation center bonus off-by-one | `evaluate()` | correct to `3 * H1 + r` (already correct; keep but verify) |

## Architecture

### File layout

```
portfolio/
├── public/games/connect4/
│   └── index.html                  # self-contained game + engine
└── src/
    ├── App.js                      # edit: register Connect4Game
    ├── projectData.json            # edit: add project entry
    ├── components/ProjectDetail.js # edit: add 'connect4' to GAME_SUBDOMAIN_SLUGS
    ├── game/connect4/
    │   ├── Connect4Game.jsx        # new: iframe wrapper (mirrors CardGame.jsx)
    │   └── connect4GameStyles.css  # new: container/iframe CSS
    └── assets/connect4.png         # new: thumbnail (fallback: reuse coming_soon.png)
```

### React wiring

`App.js`:
- Import `Connect4Game from './game/connect4/Connect4Game'`
- Add `'connect4': Connect4Game` to `GAME_SUBDOMAIN_COMPONENTS`
- Add `<Route path="/connect4" element={<Connect4Game />} />`

`ProjectDetail.js`:
- Extend `GAME_SUBDOMAIN_SLUGS` with `'connect4'`

`projectData.json`:
- New project (id 13) with:
  - `title`: "Connect 4 — You vs Machine"
  - `category`: `"game"`
  - `image`: `"connect4.png"` (fallback: `"coming_soon.png"` until artwork exists)
  - `demoUrl`: `"/connect4"`
  - `url`: `"https://connect4.hillmanchan.com"`
  - `liveDemo`: `"no-demo"`
  - `sourceCode`: `"no-source-code"`
  - `technologies`: `["JavaScript", "Bitboards", "Minimax", "Alpha-Beta Pruning", "Game Theory"]`

### Iframe wrapper

`Connect4Game.jsx` — identical pattern to `CardGame.jsx`:
- Adds `connect4-game-mode` class to `html` / `body` on mount
- Hides body overflow
- Renders `<iframe src="/games/connect4/index.html">`

`connect4GameStyles.css` — minimal:
- `html.connect4-game-mode, body.connect4-game-mode { height: 100%; margin: 0; background: #0a0e1a; }`
- `.connect4-container { width: 100vw; height: 100vh; }`
- `.connect4-iframe { width: 100%; height: 100%; border: none; display: block; }`

## AI Engine

### Board representation

Bitboard with sentinel bit per column (7-bit-high columns, 49 total bits stored as `BigInt`):
- `mask`: all occupied cells
- `current`: pieces of player-to-move
- Bit index: `col * H1 + row` where `H1 = 7`

### Search

1. **Immediate tactics (always, regardless of depth)**
   - If current player has a winning move, play it.
   - If opponent threatens immediate win next move, block it.

2. **Opening book (AI-first only)** — hardcoded from solved-game literature:
   - Move 1: column 3 (center). Forced.
   - Move 3: respond to each of the 7 possible human replies with a known winning move (Allis tables). For brevity the book ends after AI's 4th move; from then on negamax is strong enough.

3. **Iterative deepening negamax with α-β pruning**
   - Move ordering: `[3, 2, 4, 1, 5, 0, 6]` (center-first)
   - Transposition table keyed on `mask + current`
   - Window narrowing using `WIN_SCORE - moves` upper bound (Pons-style)
   - Iterative deepening from depth 1 → `maxDepth`, with early exit on confirmed forced win

### Evaluation

Used only at leaf nodes when depth runs out:
- **Threat count**: for each 4-cell line, score by number of own pieces (3 = 5pts, 2 = 2pts, 1 = 1pt) minus opponent's equivalent; lines containing both colors are blocked (0 pts).
- **Center control**: own pieces in col 3 × 3.
- **Odd/even threat heuristic** (optional polish): threats on odd rows favour first player; even rows favour second. Awards bonus points accordingly.

### Difficulty levels

| Level | Depth | Opening book | Notes |
|---|---|---|---|
| Easy | 3 | off | Quick, beatable |
| Medium | 6 | off | Tactical, occasional blunders |
| Hard | 10 | on | Wins against most humans |
| **Impossible** | 14 + late-game full solve | on | Default; unbeatable when AI-first |

- Browsers: search runs on the main thread; at depth 14 end-of-game positions (<12 empty cells) solve completely within a few hundred ms on a modern laptop thanks to transposition + α-β. Mobile caps at depth 12.
- A synthetic minimum "thinking" delay of 350 ms keeps the UX consistent across difficulties.

### Default configuration

- First move: **AI**.
- Difficulty: **Impossible**.
- Result: AI always wins any completed game.

Human-first mode is available but labelled "Challenge — Connect 4 is a first-player win, so perfect play by you can force a draw." No misleading marketing.

## UI Changes to Provided HTML

- Add fourth "Impossible" pill in the difficulty segmented control (already present in provided HTML — keep).
- Default the First-Move segmented control to "Machine" (was "Human").
- Default difficulty to "Impossible" (was "Hard").
- Update subtitle `you vs. the alhm` → `you vs. the algorithm`.

## Deployment

- Commit and push to `main` — GitHub Actions (`deploy.yml`) builds `portfolio/` and syncs `portfolio/build/games/` to the S3 bucket `hillmanportfolio1`.
- Once deployed, `hillmanchan.com/games/connect4/` serves the standalone HTML, and `/connect4` serves the React wrapper.
- For `connect4.hillmanchan.com`:
  - User adds CloudFront distribution + Route53/Cloudflare CNAME + URL-rewrite function (same as `observation-report-demo.hillmanchan.com`). This is external to this repo.
  - The React `App.js` subdomain handler already renders `Connect4Game` when hostname first-label is `'connect4'`.

## Out of Scope

- Online multiplayer
- Move history / PGN export
- Custom board sizes
- Dedicated CloudFront/DNS automation (user handles externally)

## Acceptance Criteria

1. `portfolio/public/games/connect4/index.html` loads in a browser with no JS console errors.
2. In default config (AI-first, Impossible), a naive human-played test loses to the AI.
3. A scripted perfect-play test where AI-first plays the center + known winning line defeats any human response within 41 moves.
4. `hillmanchan.com/connect4` (after deploy) renders the game via iframe.
5. Visiting `connect4.hillmanchan.com` (after user's external DNS/CloudFront setup) renders the React wrapper, which iframes the game.
6. Project card appears on the portfolio under the "Game" category with a click-through to the demo.
