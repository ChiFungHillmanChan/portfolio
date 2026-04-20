# Connect 4 — Two-Screen Restructure + Mobile Polish

**Goal:** Split Connect 4 into (1) a **Home / Selection** screen and (2) a **Game** screen. Remove Undo and the inline difficulty / first-move selectors from the Game screen. Make the board + modals touch-friendly on mobile.

**File touched:** `portfolio/public/games/connect4/index.html` only.

## Design

### Home screen (`#home-screen`)

- Big italic title `Connect & Four`
- Subtitle `you vs the algorithm`
- **First move** segmented control (Human / Machine, default Machine)
- **Difficulty** segmented control (Easy / Medium / Hard / Impossible, default Impossible)
- Primary button `START GAME ▶` → hides home, shows game, calls `newGame()`
- Secondary button `🏆 HALL OF FAME` → opens existing HoF overlay
- Footer `BITBOARDS · NEGAMAX · α-β PRUNING · OPENING BOOK`

### Game screen (`#game-screen`)

- Top bar: `← Menu` on left, `Connect 4 · <level>` on right
- Scoreboard (unchanged)
- Status line
- Board (unchanged)
- Single action button: `NEW GAME`
- No undo, no selectors, no footer

### Screen switching

Both sections live in the DOM. CSS `.screen.hidden { display: none; }`. JS `showHome()` / `showGame()` toggle.

Default state on load: **Home screen visible, Game hidden**.

### Mobile-friendliness (works at 320px–1024px)

- All buttons ≥ 44px tall (Apple HIG touch target)
- Segmented buttons keep ≥ 44px min height on mobile
- Home screen primary/secondary buttons full width, ≥ 56px tall on mobile
- Board: `aspect-ratio: 7/6` — already responsive. Gap reduces to 3px at ≤ 380px.
- Game top bar stacks vertically on ≤ 380px (Menu button on top, title below)
- Submit modal + HoF overlay already use `max-width` + `width: 94%`; verify scroll works at `max-height: 88vh`
- Ensure no horizontal scroll anywhere (`overflow-x: hidden` on body already present)
- Tap regions for discs: the `.cell` click handlers already work — just needs the cell size large enough. At 320px width with 4px gap and 7 cols: ~40px discs, comfortably tappable.

## Implementation notes

- Keep the existing `#first-seg` / `#diff-seg` IDs inside the Home screen. Their existing event listeners read `btn.dataset.first` / `btn.dataset.diff` and set `humanFirst` / `aiDepth` — **no change needed** to the listeners, just move the containers into `#home-screen`.
- Remove the `#undo-btn` element and its listener. Delete the `undo()` function entirely (dead code after this).
- Replace the existing `.actions` row on the game screen with just `New Game`.
- The game screen top bar's `← Menu` button calls `showHome()`.
- The level label on the game top bar derives from `aiDepth` (3 → Easy, 6 → Medium, 10 → Hard, 14 → Impossible).
- Home HoF button opens the existing HoF overlay — it already exists; just add a second trigger on the home screen.

## Task list

- [ ] **Task 1** — Restructure HTML (add home section, wrap game content)
- [ ] **Task 2** — CSS: screen switching, home layout, mobile breakpoints, cleaner action row
- [ ] **Task 3** — JS: showHome/showGame, START wiring, Menu back button, HoF button in home, remove undo
- [ ] **Task 4** — Syntax check, build, push, invalidate CloudFront, smoke-test
