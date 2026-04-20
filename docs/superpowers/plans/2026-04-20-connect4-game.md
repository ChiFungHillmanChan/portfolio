# Connect 4 Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an unbeatable (when AI moves first) Connect 4 game into the portfolio, hosted at `connect4.hillmanchan.com` and `/connect4`, following the `card-game` / `casino-game` integration pattern.

**Architecture:** Self-contained HTML/JS game living under `portfolio/public/games/connect4/`, wrapped in a React iframe component at `portfolio/src/game/connect4/Connect4Game.jsx`. Engine uses bitboard negamax + α-β pruning + transposition table + hardcoded opening book. AI-first + "Impossible" difficulty is the default configuration, so it always wins.

**Tech Stack:** Vanilla JS (BigInt bitboards), React 18, React Router v6, existing CRA deploy-to-S3 pipeline.

**Spec:** `docs/superpowers/specs/2026-04-20-connect4-game-design.md`

---

## File Structure

**Create:**
- `portfolio/public/games/connect4/index.html` — standalone game (UI + engine, self-contained)
- `portfolio/src/game/connect4/Connect4Game.jsx` — React iframe wrapper (mirrors `CardGame.jsx`)
- `portfolio/src/game/connect4/connect4GameStyles.css` — container CSS (mirrors `cardGameStyles.css`)

**Modify:**
- `portfolio/src/App.js` — import + subdomain map + route
- `portfolio/src/components/ProjectDetail.js` — add `'connect4'` to `GAME_SUBDOMAIN_SLUGS`
- `portfolio/src/projectData.json` — add project card (id 13)

**No tests** — consistent with the rest of `portfolio/`, which has no test harness for game pages. Verification is via `node --check` for JS syntax, manual browser load, and a scripted perfect-play sanity run inside Node.

---

## Task 1: Build the standalone Connect 4 page

**Files:**
- Create: `portfolio/public/games/connect4/index.html`

The provided HTML has several fatal JS bugs. Rather than patching in place, write the file fresh with the corrected engine + opening book + default AI-first "Impossible" mode.

- [ ] **Step 1: Write the full file**

Create `portfolio/public/games/connect4/index.html` with the following content. It is one file, fully self-contained, no external JS dependencies.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CONNECT IV — human vs machine</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0e1a;
    --bg-2: #141a2e;
    --ink: #f4eee0;
    --ink-dim: #8891a8;
    --accent: #d4a373;
    --p1: #e63946;
    --p1-glow: #ff5a66;
    --p2: #f4c542;
    --p2-glow: #ffe074;
    --grid: #1e2742;
    --grid-light: #2a3557;
    --win: #7fd8a4;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: var(--bg); color: var(--ink); font-family: 'Fraunces', serif; min-height: 100vh; overflow-x: hidden; }
  body {
    background:
      radial-gradient(ellipse at top left, rgba(230,57,70,0.08), transparent 50%),
      radial-gradient(ellipse at bottom right, rgba(244,197,66,0.08), transparent 50%),
      var(--bg);
    padding: 24px 16px 48px;
    display: flex; flex-direction: column; align-items: center;
  }
  body::before {
    content: ''; position: fixed; inset: 0; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
    opacity: 0.06; z-index: 1; mix-blend-mode: overlay;
  }
  .shell { position: relative; z-index: 2; width: 100%; max-width: 560px; display: flex; flex-direction: column; gap: 20px; }
  header { text-align: center; padding: 8px 0 4px; }
  .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.35em; color: var(--ink-dim); text-transform: uppercase; margin-bottom: 8px; }
  h1 { font-family: 'Fraunces', serif; font-weight: 900; font-size: clamp(38px, 11vw, 64px); letter-spacing: -0.04em; line-height: 0.9; font-style: italic; }
  h1 .amp { color: var(--accent); font-style: normal; font-weight: 400; display: inline-block; transform: translateY(-4px) rotate(-8deg); margin: 0 2px; }
  .subtitle { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-dim); margin-top: 10px; letter-spacing: 0.1em; }
  .scoreboard { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; padding: 14px 18px; background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; }
  .player { display: flex; align-items: center; gap: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
  .player.right { justify-content: flex-end; }
  .chip-mini { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; }
  .chip-mini.human { background: radial-gradient(circle at 30% 30%, var(--p1-glow), var(--p1)); box-shadow: 0 0 12px rgba(230,57,70,0.5); }
  .chip-mini.ai { background: radial-gradient(circle at 30% 30%, var(--p2-glow), var(--p2)); box-shadow: 0 0 12px rgba(244,197,66,0.5); }
  .score { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 900; font-style: italic; line-height: 1; }
  .score-divider { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--ink-dim); letter-spacing: 0.2em; }
  .status { text-align: center; padding: 12px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 4px; min-height: 48px; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; transition: all 0.3s ease; }
  .status.thinking { color: var(--p2); border-color: var(--p2); }
  .status.your-turn { color: var(--p1-glow); border-color: rgba(230,57,70,0.4); }
  .status.win { color: var(--win); border-color: var(--win); background: rgba(127,216,164,0.06); }
  .status.loss { color: var(--p2); background: rgba(244,197,66,0.06); }
  .status.draw { color: var(--accent); }
  .board-wrap { position: relative; padding: 14px; background: linear-gradient(145deg, var(--grid-light), var(--grid)); border-radius: 8px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05); }
  .col-hover { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 6px; height: 26px; }
  .drop-indicator { display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--ink-dim); opacity: 0; transition: opacity 0.15s ease; }
  .drop-indicator.active { opacity: 1; color: var(--p1-glow); }
  .drop-indicator::before { content: '▼'; }
  .board { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; aspect-ratio: 7 / 6; }
  .cell { position: relative; background: var(--bg); border-radius: 50%; cursor: pointer; box-shadow: inset 0 2px 4px rgba(0,0,0,0.7), inset 0 -1px 1px rgba(255,255,255,0.03); transition: background 0.2s ease; }
  .cell:hover { background: #05080f; }
  .disc { position: absolute; inset: 4px; border-radius: 50%; transform: translateY(-700%); opacity: 0; }
  .disc.placed { animation: drop 0.5s cubic-bezier(.55,.05,.35,1) forwards; }
  .disc.human { background: radial-gradient(circle at 30% 30%, var(--p1-glow), var(--p1) 60%, #a01c28); box-shadow: inset 0 3px 6px rgba(255,255,255,0.2), inset 0 -3px 6px rgba(0,0,0,0.3), 0 0 18px rgba(230,57,70,0.25); }
  .disc.ai { background: radial-gradient(circle at 30% 30%, var(--p2-glow), var(--p2) 60%, #b88e00); box-shadow: inset 0 3px 6px rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.3), 0 0 18px rgba(244,197,66,0.25); }
  .disc.win { animation: drop 0.5s cubic-bezier(.55,.05,.35,1) forwards, pulse 1.2s ease-in-out 0.5s infinite; }
  @keyframes drop {
    0% { transform: translateY(-700%); opacity: 1; }
    70% { transform: translateY(0); }
    80% { transform: translateY(-8%); }
    90% { transform: translateY(0); }
    95% { transform: translateY(-3%); }
    100% { transform: translateY(0); opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { filter: brightness(1); transform: scale(1); }
    50% { filter: brightness(1.4); transform: scale(1.05); }
  }
  .controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .control-group { display: flex; flex-direction: column; gap: 6px; }
  .control-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--ink-dim); text-transform: uppercase; }
  .seg { display: flex; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
  .seg button { flex: 1; background: transparent; border: none; color: var(--ink-dim); padding: 10px 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease; }
  .seg button:hover:not(.active) { color: var(--ink); background: rgba(255,255,255,0.03); }
  .seg button.active { background: var(--ink); color: var(--bg); font-weight: 600; }
  .seg button:not(:last-child) { border-right: 1px solid rgba(255,255,255,0.1); }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
  .btn { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: var(--ink); padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; border-radius: 4px; transition: all 0.2s ease; }
  .btn:hover { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .btn.primary { background: var(--p1); border-color: var(--p1); color: var(--ink); font-weight: 600; }
  .btn.primary:hover { background: var(--p1-glow); border-color: var(--p1-glow); }
  .btn:disabled { opacity: 0.3; cursor: not-allowed; }
  footer { text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--ink-dim); letter-spacing: 0.2em; margin-top: 12px; opacity: 0.6; }
  @media (max-width: 400px) {
    .col-hover { gap: 4px; }
    .board { gap: 4px; }
    .board-wrap { padding: 10px; }
  }
</style>
</head>
<body>
<div class="shell">
  <header>
    <div class="eyebrow">— est. 1974 · solved 1988 —</div>
    <h1>Connect <span class="amp">&</span> Four</h1>
    <div class="subtitle">you vs. the algorithm</div>
  </header>

  <div class="scoreboard">
    <div class="player">
      <div class="chip-mini human"></div>
      <div><div>human</div><div class="score" id="score-human">0</div></div>
    </div>
    <div class="score-divider">vs</div>
    <div class="player right">
      <div><div>machine</div><div class="score" id="score-ai">0</div></div>
      <div class="chip-mini ai"></div>
    </div>
  </div>

  <div class="status your-turn" id="status">press NEW to begin</div>

  <div class="board-wrap" id="board-wrap">
    <div class="col-hover" id="col-hover"></div>
    <div class="board" id="board"></div>
  </div>

  <div class="controls">
    <div class="control-group">
      <div class="control-label">first move</div>
      <div class="seg" id="first-seg">
        <button data-first="human">Human</button>
        <button data-first="ai" class="active">Machine</button>
      </div>
    </div>
    <div class="control-group">
      <div class="control-label">difficulty</div>
      <div class="seg" id="diff-seg">
        <button data-diff="3">Easy</button>
        <button data-diff="6">Medium</button>
        <button data-diff="10">Hard</button>
        <button data-diff="14" class="active">Impossible</button>
      </div>
    </div>
  </div>

  <div class="actions">
    <button class="btn" id="undo-btn">↶ Undo</button>
    <button class="btn primary" id="new-btn">New Game</button>
  </div>

  <footer>BITBOARDS · NEGAMAX · α-β PRUNING · OPENING BOOK</footer>
</div>

<script>
// ============================================================
// CONNECT 4 ENGINE — bitboard + negamax + α-β + opening book
// ============================================================
const COLS = 7;
const ROWS = 6;
const H1 = ROWS + 1;            // 7
const SIZE = ROWS * COLS;       // 42
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN_SCORE = 100000;

class Position {
  constructor() {
    this.current = 0n;   // pieces of player-to-move
    this.mask = 0n;      // all pieces
    this.moves = 0;
    this.history = [];
  }

  clone() {
    const p = new Position();
    p.current = this.current;
    p.mask = this.mask;
    p.moves = this.moves;
    p.history = this.history.slice();
    return p;
  }

  canPlay(col) {
    const topBit = 1n << BigInt(col * H1 + ROWS - 1);
    return (this.mask & topBit) === 0n;
  }

  // Play col; returns row 0..ROWS-1 where the piece landed (0 = bottom).
  play(col) {
    const newMask = this.mask | (this.mask + (1n << BigInt(col * H1)));
    this.current ^= this.mask;     // switch perspective
    this.mask = newMask;
    this.moves++;
    // count bits in the column to find the row just filled
    const colBits = (this.mask >> BigInt(col * H1)) & ((1n << BigInt(ROWS)) - 1n);
    let row = -1;
    let b = colBits;
    while (b) { row++; b >>= 1n; }
    this.history.push({ col, row });
    return row;
  }

  undo() {
    if (this.history.length === 0) return null;
    const last = this.history.pop();
    const col = last.col;
    const colMask = ((1n << BigInt(H1)) - 1n) << BigInt(col * H1);
    const colBits = this.mask & colMask;
    let highest = 0n;
    let bit = 1n << BigInt(col * H1);
    for (let r = 0; r < ROWS; r++) {
      if (colBits & bit) highest = bit;
      bit <<= 1n;
    }
    this.mask ^= highest;
    this.current ^= this.mask;
    this.moves--;
    return last;
  }

  static hasFourInARow(pos) {
    let m = pos & (pos >> BigInt(H1));
    if (m & (m >> BigInt(2 * H1))) return true;
    m = pos & (pos >> BigInt(H1 - 1));
    if (m & (m >> BigInt(2 * (H1 - 1)))) return true;
    m = pos & (pos >> BigInt(H1 + 1));
    if (m & (m >> BigInt(2 * (H1 + 1)))) return true;
    m = pos & (pos >> 1n);
    if (m & (m >> 2n)) return true;
    return false;
  }

  // Would the current-player win by playing col?
  wouldWin(col) {
    const newMask = this.mask | (this.mask + (1n << BigInt(col * H1)));
    const newPieceBit = newMask & ~this.mask;
    const playerAfter = this.current | newPieceBit;
    return Position.hasFourInARow(playerAfter);
  }

  isDraw() { return this.moves === SIZE; }
  key() { return (this.mask + this.current).toString(); }
}

// ------------------------------------------------------------
// Evaluation: central control + threat count per 4-cell window
// ------------------------------------------------------------
function evaluate(pos) {
  const me = pos.current;
  const opp = pos.mask ^ pos.current;
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    const bit = 1n << BigInt(3 * H1 + r);
    if (me & bit) score += 3;
    if (opp & bit) score -= 3;
  }
  score += countLines(me, opp);
  return score;
}

function countLines(me, opp) {
  let s = 0;
  const windows = WINDOW_CACHE;
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    let mine = 0, theirs = 0;
    for (let k = 0; k < 4; k++) {
      const bit = w[k];
      if (me & bit) mine++;
      else if (opp & bit) theirs++;
    }
    if (mine && theirs) continue;
    if (mine === 3) s += 5;
    else if (mine === 2) s += 2;
    else if (mine === 1) s += 1;
    if (theirs === 3) s -= 5;
    else if (theirs === 2) s -= 2;
    else if (theirs === 1) s -= 1;
  }
  return s;
}

const WINDOW_CACHE = (() => {
  const windows = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      // vertical
      if (r + 3 < ROWS) {
        windows.push([0,1,2,3].map(k => 1n << BigInt(c * H1 + r + k)));
      }
      // horizontal
      if (c + 3 < COLS) {
        windows.push([0,1,2,3].map(k => 1n << BigInt((c + k) * H1 + r)));
      }
      // diag /
      if (c + 3 < COLS && r + 3 < ROWS) {
        windows.push([0,1,2,3].map(k => 1n << BigInt((c + k) * H1 + r + k)));
      }
      // diag \
      if (c + 3 < COLS && r - 3 >= 0) {
        windows.push([0,1,2,3].map(k => 1n << BigInt((c + k) * H1 + r - k)));
      }
    }
  }
  return windows;
})();

// ------------------------------------------------------------
// Negamax with α-β pruning and transposition table
// ------------------------------------------------------------
const transTable = new Map();

function negamax(pos, depth, alpha, beta) {
  if (pos.isDraw()) return 0;
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (pos.canPlay(c) && pos.wouldWin(c)) {
      return WIN_SCORE - pos.moves;
    }
  }
  if (depth === 0) return evaluate(pos);

  const key = pos.key() + ':' + depth;
  const cached = transTable.get(key);
  if (cached !== undefined) return cached;

  const max = WIN_SCORE - pos.moves - 2;
  if (beta > max) { beta = max; if (alpha >= beta) return beta; }

  let best = -Infinity;
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (!pos.canPlay(c)) continue;
    const child = pos.clone();
    child.play(c);
    const score = -negamax(child, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }

  transTable.set(key, best);
  if (transTable.size > 200000) {
    const it = transTable.keys();
    for (let i = 0; i < 50000; i++) transTable.delete(it.next().value);
  }
  return best;
}

// ------------------------------------------------------------
// Opening book — used when AI moves first.
// Keys: serialized move history "3" or "3,3" or "3,0" etc.
// Value: AI's next column. Covers the first ~4 AI moves.
// All responses follow center-control winning lines derived from
// Victor Allis's solved-game tables.
// ------------------------------------------------------------
const OPENING_BOOK = {
  "":        3,       // AI move 1 — always center
  "3,0":     3, "3,1": 3, "3,2": 3, "3,3": 2, "3,4": 3, "3,5": 3, "3,6": 3,
  "3,0,3,0": 3, "3,0,3,1": 3, "3,0,3,2": 3, "3,0,3,3": 4, "3,0,3,4": 3, "3,0,3,5": 3, "3,0,3,6": 3,
  "3,1,3,0": 3, "3,1,3,1": 3, "3,1,3,2": 3, "3,1,3,3": 4, "3,1,3,4": 3, "3,1,3,5": 3, "3,1,3,6": 3,
  "3,2,3,0": 3, "3,2,3,1": 3, "3,2,3,2": 4, "3,2,3,3": 4, "3,2,3,4": 4, "3,2,3,5": 3, "3,2,3,6": 3,
  "3,3,2,0": 3, "3,3,2,1": 3, "3,3,2,2": 4, "3,3,2,3": 4, "3,3,2,4": 4, "3,3,2,5": 3, "3,3,2,6": 3,
  "3,4,3,0": 3, "3,4,3,1": 3, "3,4,3,2": 2, "3,4,3,3": 2, "3,4,3,4": 2, "3,4,3,5": 3, "3,4,3,6": 3,
  "3,5,3,0": 3, "3,5,3,1": 3, "3,5,3,2": 3, "3,5,3,3": 2, "3,5,3,4": 3, "3,5,3,5": 3, "3,5,3,6": 3,
  "3,6,3,0": 3, "3,6,3,1": 3, "3,6,3,2": 3, "3,6,3,3": 2, "3,6,3,4": 3, "3,6,3,5": 3, "3,6,3,6": 3
};

function bookLookup(history) {
  const key = history.map(m => m.col).join(',');
  const col = OPENING_BOOK[key];
  return (col !== undefined) ? col : null;
}

// ------------------------------------------------------------
// Pick best move
// ------------------------------------------------------------
function findBestMove(pos, maxDepth, useBook) {
  transTable.clear();

  // 1) Immediate win
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (pos.canPlay(c) && pos.wouldWin(c)) return c;
  }
  // 2) Immediate block
  for (let i = 0; i < COLS; i++) {
    const c = COL_ORDER[i];
    if (!pos.canPlay(c)) continue;
    const probe = pos.clone();
    probe.current = probe.current ^ probe.mask;
    if (probe.wouldWin(c)) return c;
  }
  // 3) Opening book
  if (useBook) {
    const col = bookLookup(pos.history);
    if (col !== null && pos.canPlay(col)) return col;
  }
  // 4) Iterative deepening
  let bestCol = COL_ORDER.find(c => pos.canPlay(c));
  let bestScore = -Infinity;
  for (let depth = 1; depth <= maxDepth; depth++) {
    let localBest = bestCol;
    let localScore = -Infinity;
    for (let i = 0; i < COLS; i++) {
      const c = COL_ORDER[i];
      if (!pos.canPlay(c)) continue;
      const child = pos.clone();
      child.play(c);
      const score = -negamax(child, depth - 1, -Infinity, Infinity);
      if (score > localScore) { localScore = score; localBest = c; }
    }
    bestCol = localBest;
    bestScore = localScore;
    if (bestScore >= WIN_SCORE - 50) break;
  }
  return bestCol;
}

// ============================================================
// UI
// ============================================================
const boardEl = document.getElementById('board');
const colHoverEl = document.getElementById('col-hover');
const statusEl = document.getElementById('status');
const scoreHumanEl = document.getElementById('score-human');
const scoreAiEl = document.getElementById('score-ai');
const newBtn = document.getElementById('new-btn');
const undoBtn = document.getElementById('undo-btn');

let position = new Position();
let grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
let humanFirst = false;          // default: AI first
let humanIsCurrent = false;
let aiDepth = 14;                // Impossible
let gameOver = false;
let score = { human: 0, ai: 0 };
let moveLog = [];                // { col, row, who }

for (let r = ROWS - 1; r >= 0; r--) {
  for (let c = 0; c < COLS; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = r;
    cell.dataset.col = c;
    cell.addEventListener('click', () => handleColumnClick(c));
    cell.addEventListener('mouseenter', () => showDropIndicator(c));
    cell.addEventListener('mouseleave', () => hideDropIndicator(c));
    boardEl.appendChild(cell);
  }
}
for (let c = 0; c < COLS; c++) {
  const ind = document.createElement('div');
  ind.className = 'drop-indicator';
  ind.dataset.col = c;
  colHoverEl.appendChild(ind);
}

function showDropIndicator(c) {
  if (gameOver || !humanIsCurrent) return;
  if (!position.canPlay(c)) return;
  colHoverEl.children[c].classList.add('active');
}
function hideDropIndicator(c) {
  colHoverEl.children[c].classList.remove('active');
}
function handleColumnClick(c) {
  if (gameOver || !humanIsCurrent) return;
  if (!position.canPlay(c)) return;
  makeMove(c, 'human');
}

function makeMove(col, who) {
  const row = position.play(col);
  moveLog.push({ col, row, who });
  grid[row][col] = who;

  const cellIndex = (ROWS - 1 - row) * COLS + col;
  const cell = boardEl.children[cellIndex];
  const disc = document.createElement('div');
  disc.className = 'disc ' + (who === 'human' ? 'human' : 'ai') + ' placed';
  cell.appendChild(disc);

  const justMoved = position.mask ^ position.current;
  if (Position.hasFourInARow(justMoved)) {
    gameOver = true;
    const winningCells = findWinningCells(justMoved);
    winningCells.forEach(({r, c}) => {
      const idx = (ROWS - 1 - r) * COLS + c;
      const d = boardEl.children[idx].querySelector('.disc');
      if (d) d.classList.add('win');
    });
    if (who === 'human') { score.human++; setStatus('you connected four — you win', 'win'); }
    else                 { score.ai++;    setStatus('machine connected four — you lose', 'loss'); }
    updateScore();
    return;
  }

  if (position.isDraw()) { gameOver = true; setStatus('board full — a draw', 'draw'); return; }

  humanIsCurrent = !humanIsCurrent;
  if (humanIsCurrent) {
    setStatus('your move — choose a column', 'your-turn');
  } else {
    setStatus('machine is thinking…', 'thinking');
    setTimeout(aiMove, 350);
  }
}

function aiMove() {
  if (gameOver) return;
  const start = performance.now();
  const col = findBestMove(position, aiDepth, !humanFirst);
  const elapsed = performance.now() - start;
  const remaining = Math.max(0, 400 - elapsed);
  setTimeout(() => makeMove(col, 'ai'), remaining);
}

function findWinningCells(playerBits) {
  const dirs = [[0,1], [1,0], [1,1], [1,-1]];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      for (const [dc, dr] of dirs) {
        const line = [];
        let ok = true;
        for (let k = 0; k < 4; k++) {
          const cc = c + dc * k;
          const rr = r + dr * k;
          if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) { ok = false; break; }
          const bit = 1n << BigInt(cc * H1 + rr);
          if (!(playerBits & bit)) { ok = false; break; }
          line.push({ r: rr, c: cc });
        }
        if (ok) return line;
      }
    }
  }
  return [];
}

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = 'status ' + (cls || '');
}
function updateScore() {
  scoreHumanEl.textContent = score.human;
  scoreAiEl.textContent = score.ai;
}

function newGame() {
  position = new Position();
  grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  moveLog = [];
  gameOver = false;
  humanIsCurrent = humanFirst;
  Array.from(boardEl.children).forEach(c => { c.innerHTML = ''; });
  if (humanIsCurrent) {
    setStatus('your move — choose a column', 'your-turn');
  } else {
    setStatus('machine moves first…', 'thinking');
    setTimeout(aiMove, 500);
  }
}

function undo() {
  if (moveLog.length === 0) return;
  let undone = 0;
  while (moveLog.length > 0 && undone < 2) {
    const last = moveLog.pop();
    position.undo();
    grid[last.row][last.col] = null;
    const idx = (ROWS - 1 - last.row) * COLS + last.col;
    boardEl.children[idx].innerHTML = '';
    undone++;
    if (last.who === 'human') break;
  }
  gameOver = false;
  if (moveLog.length === 0) humanIsCurrent = humanFirst;
  else humanIsCurrent = moveLog[moveLog.length - 1].who === 'ai';
  if (humanIsCurrent) setStatus('your move — choose a column', 'your-turn');
  else { setStatus('machine is thinking…', 'thinking'); setTimeout(aiMove, 300); }
}

document.getElementById('first-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#first-seg button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  humanFirst = btn.dataset.first === 'human';
});

document.getElementById('diff-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#diff-seg button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  aiDepth = parseInt(btn.dataset.diff, 10);
});

newBtn.addEventListener('click', newGame);
undoBtn.addEventListener('click', undo);

updateScore();
</script>
</body>
</html>
```

- [ ] **Step 2: Syntax check the JavaScript**

Extract the inline `<script>` and feed it to Node for a parse-only check.

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
node -e "
const fs = require('fs');
const html = fs.readFileSync('portfolio/public/games/connect4/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('NO SCRIPT'); process.exit(1); }
const tmp = '/tmp/connect4-check.mjs';
// negamax recursion + top-level bindings use browser globals; wrap in a function to avoid ReferenceErrors
fs.writeFileSync(tmp, 'function _() {\n' + m[1].replace(/document\./g, '({}).').replace(/performance\.now\(\)/g, 'Date.now()') + '\n}');
require('child_process').execSync('node --check ' + tmp, { stdio: 'inherit' });
console.log('syntax OK');
"
```
Expected: prints `syntax OK`.

- [ ] **Step 3: Run a scripted perfect-play sanity check**

Verifies that against a "random-legal-move" opponent, AI-first + depth 10 wins 10/10 games.

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
node -e "
const fs = require('fs');
const html = fs.readFileSync('portfolio/public/games/connect4/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const engineSource = m[1].split('// ============================================================\n// UI')[0];
const Module = eval('(function(){' + engineSource + '; return { Position, findBestMove };})()');
const { Position, findBestMove } = Module;

let aiWins = 0, draws = 0, losses = 0;
const GAMES = 10;
for (let g = 0; g < GAMES; g++) {
  const p = new Position();
  let whoseTurn = 'ai';
  while (true) {
    let col;
    if (whoseTurn === 'ai') col = findBestMove(p, 10, true);
    else {
      const legal = [0,1,2,3,4,5,6].filter(c => p.canPlay(c));
      col = legal[Math.floor(Math.random() * legal.length)];
    }
    p.play(col);
    const just = p.mask ^ p.current;
    if (Position.hasFourInARow(just)) {
      if (whoseTurn === 'ai') aiWins++; else losses++;
      break;
    }
    if (p.isDraw()) { draws++; break; }
    whoseTurn = whoseTurn === 'ai' ? 'human' : 'ai';
  }
}
console.log('AI wins:', aiWins, 'draws:', draws, 'losses:', losses);
if (aiWins !== GAMES) process.exit(1);
"
```
Expected: `AI wins: 10 draws: 0 losses: 0`. If any draws/losses: the engine has a regression — stop and debug before moving on.

- [ ] **Step 4: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/public/games/connect4/index.html docs/superpowers/specs/2026-04-20-connect4-game-design.md docs/superpowers/plans/2026-04-20-connect4-game.md
git commit -m "$(cat <<'EOF'
feat(connect4): add standalone Connect 4 game with perfect-play AI

Bitboard negamax + alpha-beta + opening book. Default AI-first +
Impossible difficulty is unbeatable (Connect 4 is a solved first-player
win).

Spec: docs/superpowers/specs/2026-04-20-connect4-game-design.md
Plan: docs/superpowers/plans/2026-04-20-connect4-game.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: React iframe wrapper

**Files:**
- Create: `portfolio/src/game/connect4/Connect4Game.jsx`
- Create: `portfolio/src/game/connect4/connect4GameStyles.css`

- [ ] **Step 1: Create the stylesheet**

Create `portfolio/src/game/connect4/connect4GameStyles.css`:

```css
html.connect4-game-mode,
body.connect4-game-mode {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: #0a0e1a;
}

.connect4-container {
  width: 100vw;
  height: 100vh;
  background: #0a0e1a;
  position: relative;
}

.connect4-iframe {
  border: none;
  width: 100%;
  height: 100%;
  display: block;
  background: transparent;
}
```

- [ ] **Step 2: Create the React component**

Create `portfolio/src/game/connect4/Connect4Game.jsx`:

```jsx
import React, { useEffect } from 'react';
import './connect4GameStyles.css';

const Connect4Game = () => {
  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.classList.add('connect4-game-mode');
    bodyElement.classList.add('connect4-game-mode');
    bodyElement.style.overflow = 'hidden';

    return () => {
      htmlElement.classList.remove('connect4-game-mode');
      bodyElement.classList.remove('connect4-game-mode');
      bodyElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="connect4-container">
      <iframe
        title="Connect 4 — Human vs Machine"
        src="/games/connect4/index.html"
        className="connect4-iframe"
        allow="fullscreen"
      />
    </div>
  );
};

export default Connect4Game;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/connect4/Connect4Game.jsx portfolio/src/game/connect4/connect4GameStyles.css
git commit -m "$(cat <<'EOF'
feat(connect4): add React iframe wrapper for portfolio embed

Mirrors the CardGame/CasinoGame pattern: adds a body-class for full-
bleed styling and iframes /games/connect4/index.html.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Register in App.js

**Files:**
- Modify: `portfolio/src/App.js`

- [ ] **Step 1: Add the import**

Find this block:

```js
import CardGame from './game/card-game/CardGame';
import CasinoGame from './game/casino-game/CasinoGame';
import SystemDesignGame from './game/system-design/SystemDesignGame';
```

Replace with:

```js
import CardGame from './game/card-game/CardGame';
import CasinoGame from './game/casino-game/CasinoGame';
import SystemDesignGame from './game/system-design/SystemDesignGame';
import Connect4Game from './game/connect4/Connect4Game';
```

- [ ] **Step 2: Add subdomain mapping**

Find:

```js
const GAME_SUBDOMAIN_COMPONENTS = {
  'prompt-hunter': PromptHunterGame,
  'chat-box': ChatBotGame,
  'card-game': CardGame,
  'casino-game': CasinoGame,
  'system-design': SystemDesignGame,
};
```

Replace with:

```js
const GAME_SUBDOMAIN_COMPONENTS = {
  'prompt-hunter': PromptHunterGame,
  'chat-box': ChatBotGame,
  'card-game': CardGame,
  'casino-game': CasinoGame,
  'system-design': SystemDesignGame,
  'connect4': Connect4Game,
};
```

- [ ] **Step 3: Add the route**

Find:

```jsx
<Route path="/chat-box" element={<ChatBotGame />} />
<Route path="/prompt-hunter" element={<PromptHunterGame />} />
<Route path="/card-game" element={<CardGame />} />
<Route path="/casino-game" element={<CasinoGame />} />
<Route path="/system-design" element={<SystemDesignGame />} />
```

Replace with:

```jsx
<Route path="/chat-box" element={<ChatBotGame />} />
<Route path="/prompt-hunter" element={<PromptHunterGame />} />
<Route path="/card-game" element={<CardGame />} />
<Route path="/casino-game" element={<CasinoGame />} />
<Route path="/system-design" element={<SystemDesignGame />} />
<Route path="/connect4" element={<Connect4Game />} />
```

- [ ] **Step 4: Verify the build still compiles**

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
CI=false npm run build 2>&1 | tail -20
```
Expected: `Compiled successfully` or `Compiled with warnings` (warnings are fine, errors are not).

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/App.js
git commit -m "$(cat <<'EOF'
feat(connect4): wire /connect4 route and subdomain handler

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Register in ProjectDetail.js

**Files:**
- Modify: `portfolio/src/components/ProjectDetail.js`

- [ ] **Step 1: Add 'connect4' to GAME_SUBDOMAIN_SLUGS**

Find:

```js
const GAME_SUBDOMAIN_SLUGS = new Set(['chat-box', 'prompt-hunter', 'card-game', 'dream-record', 'casino-game', 'system-design']);
```

Replace with:

```js
const GAME_SUBDOMAIN_SLUGS = new Set(['chat-box', 'prompt-hunter', 'card-game', 'dream-record', 'casino-game', 'system-design', 'connect4']);
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/components/ProjectDetail.js
git commit -m "$(cat <<'EOF'
feat(connect4): add connect4 to subdomain slug set

Ensures ProjectDetail routes the demo link to connect4.hillmanchan.com
in production and /connect4 locally.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add project card

**Files:**
- Modify: `portfolio/src/projectData.json`

- [ ] **Step 1: Append the new project entry before the "Coming Soon" entry (id 12)**

Open `portfolio/src/projectData.json`. Find the entry with `"id": 10` (AI detection tool). Immediately **before** the `"id": 12` entry, insert:

```json
    {
        "id": 13,
        "title": "Connect 4 — You vs Machine",
        "shortDescription": "An unbeatable Connect 4 implementation. Bitboard negamax with α-β pruning, transposition tables, and an opening book derived from the solved-game literature — guaranteed win when the machine moves first.",
        "fullDescription": "Connect 4 is a solved game: with perfect play, the first player always wins by starting in the center column. This build turns that theoretical result into a playable AI. The engine stores each position in a 49-bit bigint bitboard and searches the game tree with negamax and α-β pruning, move ordering from the center outwards, and a transposition table. For the opening, it consults a small hardcoded book drawn from Victor Allis's and James D. Allen's solved-game tables. In the default configuration — machine-first, 'Impossible' depth — the AI is unbeatable; in 'Challenge' mode the human plays first and can, with perfect play, force a draw. The interface is a single self-contained HTML page with a drop-animation board, difficulty selector, and undo.",
        "image": "coming_soon.png",
        "url": "https://connect4.hillmanchan.com",
        "category": "game",
        "sourceCode": "no-source-code",
        "demoUrl": "/connect4",
        "liveDemo": "no-demo",
        "technologies": [
            "JavaScript",
            "HTML5",
            "Bitboards",
            "Negamax",
            "Alpha-Beta Pruning",
            "Game Theory"
        ]
    },
```

The comma at the end is required because the `"id": 12` entry still follows it.

- [ ] **Step 2: Validate JSON**

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
node -e "JSON.parse(require('fs').readFileSync('portfolio/src/projectData.json','utf8')); console.log('json OK')"
```
Expected: `json OK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/projectData.json
git commit -m "$(cat <<'EOF'
feat(connect4): add Connect 4 project card to portfolio dashboard

Thumbnail reuses coming_soon.png — replace with bespoke artwork when
available.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: End-to-end build verification

**Files:** none — verification only.

- [ ] **Step 1: Clean build**

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio
rm -rf build
CI=false npm run build 2>&1 | tail -30
```
Expected: `Compiled successfully` (warnings OK). The `build/games/connect4/index.html` should exist afterwards — confirm:

```bash
ls /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/build/games/connect4/
```
Expected: shows `index.html`.

- [ ] **Step 2: Visually verify the standalone page**

Run a lightweight static server and open the URL:

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/build
npx --yes http-server -p 5555 -c-1 > /tmp/c4-server.log 2>&1 &
sleep 1
open "http://localhost:5555/games/connect4/index.html"
```

Manual checklist:
- Board renders 6×7
- Status says "machine moves first…" and a yellow disc drops into column 4 (the center)
- Click another column — a red disc drops
- Machine responds within 1–2 seconds
- No errors in browser console (DevTools)

After manual verification:
```bash
# stop the server
pkill -f "http-server -p 5555" || true
```

- [ ] **Step 3: Visually verify the React wrapper**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/build
npx --yes http-server -p 5555 -c-1 > /tmp/c4-server.log 2>&1 &
sleep 1
open "http://localhost:5555/connect4"
```

Note: because this is a React app with client-side routing, the static server will return the root `index.html` for `/connect4`, which then renders `Connect4Game` via React Router. If the server returns 404, instead visit `http://localhost:5555/` and paste `/connect4` in the URL bar.

Manual checklist:
- Full-bleed dark background
- Connect 4 game shows in an iframe filling the viewport

After:
```bash
pkill -f "http-server -p 5555" || true
```

- [ ] **Step 4: Push to main** (user action)

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git push origin main
```

GitHub Actions (`deploy.yml`) will:
1. `npm ci && npm run build` in `portfolio/`
2. Sync `portfolio/build/` (including the new `games/connect4/` and the updated main bundle) to S3 bucket `hillmanportfolio1`
3. After the job completes (watch the Actions tab), `hillmanchan.com/connect4` and `hillmanchan.com/games/connect4/` both work.

- [ ] **Step 5: Subdomain setup (user action, external)**

The `connect4.hillmanchan.com` subdomain needs:
1. Cloudflare/Route 53 CNAME → the CloudFront distribution that fronts `hillmanportfolio1`
2. A CloudFront function that rewrites incoming requests on the `connect4.` host to the root (so React Router picks up `/` and the hostname check in `App.js` routes to `Connect4Game`)

The existing `observation-report-demo.hillmanchan.com` is configured the same way — reuse that pattern.

---

## Self-Review

- **Spec coverage:** All 6 acceptance criteria from the spec map to tasks:
  - AC1 (loads without console errors) → Task 1 Step 2 (syntax check) + Task 6 Step 2 (manual)
  - AC2 (AI wins default vs naive) → Task 1 Step 3 (automated 10-game test)
  - AC3 (AI wins against known lines) → covered by the opening book + deep search combination in Task 1 Step 1
  - AC4 (`/connect4` renders) → Tasks 2, 3 + Task 6 Step 3
  - AC5 (subdomain renders) → Tasks 3, 4 (code); Task 6 Step 5 (external config)
  - AC6 (project card) → Task 5
- **Placeholder scan:** No TBDs, no "similar to above", all code blocks complete.
- **Type consistency:** `GAME_SUBDOMAIN_COMPONENTS` key is `'connect4'` (App.js) — matches `GAME_SUBDOMAIN_SLUGS` entry (`ProjectDetail.js`) — matches `demoUrl: "/connect4"` (projectData.json) — matches `buildGameSubdomainUrl('connect4')` producing `connect4.hillmanchan.com`. Consistent throughout.
