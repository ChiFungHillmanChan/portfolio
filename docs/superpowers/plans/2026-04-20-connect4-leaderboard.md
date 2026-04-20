# Connect 4 Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time Hall of Fame to Connect 4 tracking Top 10 humans who beat Impossible difficulty (two symmetric leaderboards: Human-first / Machine-first). Free forever — Firebase Spark + Firestore `onSnapshot`.

**Architecture:** Standalone HTML gains a `<script type="module">` that loads Firebase directly from the gstatic CDN (no build step), signs the visitor in anonymously, writes submissions with the full move sequence, and renders the leaderboard in a modal overlay — validating each submission by replaying the moves locally against our deterministic AI.

**Tech Stack:** Firebase Web SDK v10 (ES modules via CDN), Firestore, Firebase Anonymous Auth, vanilla JS, CSS.

**Spec:** `docs/superpowers/specs/2026-04-20-connect4-leaderboard-design.md`

---

## File Structure

**Modify (already exists):**
- `portfolio/public/games/connect4/index.html` — add Firebase module, submit modal, Hall of Fame overlay, onSnapshot subscription, replay validator. The existing `<script>` tag becomes `<script type="module">` so ES-module imports work alongside the game code.
- `portfolio/src/game/system-design/firestore.rules` — append a `match /connect4Leaderboard/{entryId}` block.

**Create:** None.

**Manual external actions (user, after deploy):**
1. Deploy updated Firestore rules.
2. Add `connect4.hillmanchan.com` + `hillmanchan.com` to Firebase Auth → Settings → Authorized domains.
3. Click the Firestore "create index" URL the first time the leaderboard query runs (browser console will print it).

**Firebase config (public, safe to commit):**

```js
{
  apiKey: "AIzaSyC2wBCjM1c8bX8VQP4vQbE_q-KoBrRY_vc",
  authDomain: "system-design-c84d3.firebaseapp.com",
  projectId: "system-design-c84d3",
  storageBucket: "system-design-c84d3.firebasestorage.app",
  messagingSenderId: "547168317115",
  appId: "1:547168317115:web:f5130cde873096b7f3839e"
}
```

---

## Task 1: Extend Firestore rules

**Files:**
- Modify: `portfolio/src/game/system-design/firestore.rules`

- [ ] **Step 1: Append the `connect4Leaderboard` match block**

Read the current file. It ends with:
```
    }
  }
}
```

(The outer `}` closes `service cloud.firestore { ... }` and the middle `}` closes `match /databases/{database}/documents { ... }`.)

Insert the following block **immediately before** the closing `}` of `match /databases/{database}/documents` (i.e., between the inner `}` that closes the `users` match and the middle `}`):

```
    match /connect4Leaderboard/{entryId} {
      allow read: if true;

      allow create: if request.auth != null
        && request.resource.data.keys().hasOnly(['name','mode','steps','moves','difficulty','createdAt','uid'])
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 3
        && request.resource.data.name.size() <= 20
        && request.resource.data.mode in ['human-first', 'ai-first']
        && request.resource.data.steps is int
        && request.resource.data.steps >= 7
        && request.resource.data.steps <= 42
        && request.resource.data.moves is list
        && request.resource.data.moves.size() == request.resource.data.steps
        && request.resource.data.difficulty == 'impossible'
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.createdAt == request.time;

      allow update, delete: if false;
    }
```

- [ ] **Step 2: Deploy the rules**

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/system-design && npx --yes firebase deploy --only firestore:rules 2>&1 | tail -10
```

Expected last line: `✔  Deploy complete!` (or similar success message). If it errors with "Command requires authentication", ask the user to run `npx firebase login` — that's a one-time interactive step you cannot do from a subagent.

- [ ] **Step 3: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/src/game/system-design/firestore.rules docs/superpowers/specs/2026-04-20-connect4-leaderboard-design.md docs/superpowers/plans/2026-04-20-connect4-leaderboard.md
git commit -m "$(cat <<'EOF'
feat(connect4): add Firestore rules for connect4Leaderboard collection

Public read, authenticated-write-with-strict-schema, no update/delete.
Rate limiting lives on the read-path (replay validator) instead of
in rules — see spec.

Spec: docs/superpowers/specs/2026-04-20-connect4-leaderboard-design.md
Plan: docs/superpowers/plans/2026-04-20-connect4-leaderboard.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Convert game script to module + wire up Firebase

**Files:**
- Modify: `portfolio/public/games/connect4/index.html`

Converting the existing `<script>` to `<script type="module">` is safe: all top-level `const`/`let`/`function` declarations in the script are self-contained; module scope is fine. The event-handler wiring at the bottom still works because listeners capture references within the same module.

- [ ] **Step 1: Find the game script opening tag**

In `portfolio/public/games/connect4/index.html`, find the exact line:

```
<script>
// ============================================================
// CONNECT 4 ENGINE — bitboard + negamax + α-β + opening book
// ============================================================
```

Change the first line to:

```
<script type="module">
// ============================================================
// CONNECT 4 ENGINE — bitboard + negamax + α-β + opening book
// ============================================================
```

- [ ] **Step 2: Add Firebase imports and init at the top of the module**

Immediately after the `<script type="module">` tag (above the `// CONNECT 4 ENGINE` comment line), insert:

```javascript
// ============================================================
// FIREBASE (leaderboard) — graceful if offline or blocked
// ============================================================
let firebaseReady = false;
let db = null;
let auth = null;
let lbCol = null;
let fbApi = null;   // holds { addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp }

(async () => {
  try {
    const [{ initializeApp }, firestoreMod, authMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js"),
    ]);
    const app = initializeApp({
      apiKey: "AIzaSyC2wBCjM1c8bX8VQP4vQbE_q-KoBrRY_vc",
      authDomain: "system-design-c84d3.firebaseapp.com",
      projectId: "system-design-c84d3",
      storageBucket: "system-design-c84d3.firebasestorage.app",
      messagingSenderId: "547168317115",
      appId: "1:547168317115:web:f5130cde873096b7f3839e"
    });
    db = firestoreMod.getFirestore(app);
    auth = authMod.getAuth(app);
    lbCol = firestoreMod.collection(db, 'connect4Leaderboard');
    fbApi = {
      addDoc: firestoreMod.addDoc,
      query: firestoreMod.query,
      where: firestoreMod.where,
      orderBy: firestoreMod.orderBy,
      limit: firestoreMod.limit,
      onSnapshot: firestoreMod.onSnapshot,
      serverTimestamp: firestoreMod.serverTimestamp,
    };
    await authMod.signInAnonymously(auth);
    firebaseReady = true;
    document.dispatchEvent(new CustomEvent('c4-lb-ready'));
  } catch (err) {
    console.warn('[c4] leaderboard disabled:', err.message);
    const btn = document.getElementById('hof-btn');
    if (btn) btn.setAttribute('hidden', '');
  }
})();
```

- [ ] **Step 3: Add a Hall of Fame button to the action row**

Find the existing block:

```html
  <div class="actions">
    <button class="btn" id="undo-btn">↶ Undo</button>
    <button class="btn primary" id="new-btn">New Game</button>
  </div>
```

Replace with:

```html
  <div class="actions">
    <button class="btn" id="undo-btn">↶ Undo</button>
    <button class="btn" id="hof-btn">🏆 Hall of Fame</button>
    <button class="btn primary" id="new-btn">New Game</button>
  </div>
```

Note: the actions grid is currently `grid-template-columns: 1fr 1fr;` — change to `1fr 1fr 1fr;`.

Find in the `<style>` block:

```css
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
```

Replace with:

```css
  .actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 4px; }
```

- [ ] **Step 4: Syntax check**

Run:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio && node -e "
const fs = require('fs');
const html = fs.readFileSync('portfolio/public/games/connect4/index.html', 'utf8');
const m = html.match(/<script type=\"module\">([\\s\\S]*?)<\\/script>/);
if (!m) { console.error('NO MODULE SCRIPT'); process.exit(1); }
const tmp = '/tmp/c4-syntax.mjs';
fs.writeFileSync(tmp, m[1]);
require('child_process').execSync('node --check ' + tmp, { stdio: 'inherit' });
console.log('syntax OK');
"
```
Expected: `syntax OK`.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/public/games/connect4/index.html
git commit -m "$(cat <<'EOF'
feat(connect4): wire Firebase SDK + Hall of Fame button

Converts the inline game script to a module so Firebase ES imports
work alongside the game engine. Graceful fallback when Firebase
cannot initialise — game still plays.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Submit modal — UI and logic

**Files:**
- Modify: `portfolio/public/games/connect4/index.html`

- [ ] **Step 1: Add modal CSS**

In the `<style>` block, at the end (before the closing `</style>`), insert:

```css
  /* SUBMIT MODAL + HALL OF FAME */
  .modal, .overlay { position: fixed; inset: 0; background: rgba(10,14,26,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal[hidden], .overlay[hidden] { display: none; }
  .modal-card { background: linear-gradient(145deg, var(--grid-light), var(--grid)); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 28px 24px; max-width: 400px; width: 92%; text-align: center; }
  .modal-title { font-family: 'Fraunces', serif; font-style: italic; font-size: 28px; font-weight: 900; color: var(--win); margin-bottom: 8px; }
  .modal-body { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-dim); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 20px; line-height: 1.6; }
  .modal-body .muted { color: var(--ink-dim); }
  .name-input { width: 100%; padding: 12px; background: var(--bg); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: var(--ink); font-family: 'Fraunces', serif; font-size: 18px; text-align: center; margin-bottom: 16px; outline: none; }
  .name-input:focus { border-color: var(--p1); }
  .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .modal-err { color: var(--p1-glow); font-size: 10px; margin-top: 10px; min-height: 14px; }
```

- [ ] **Step 2: Add modal HTML**

Find in the body:

```html
  <footer>BITBOARDS · NEGAMAX · α-β PRUNING · OPENING BOOK</footer>
</div>
```

Immediately **after** the closing `</div>` (the `.shell` div), and before the `<script type="module">` tag, insert:

```html
<div class="modal" id="submit-modal" hidden>
  <div class="modal-card">
    <div class="modal-title">🏆 YOU BEAT THE MACHINE</div>
    <div class="modal-body">
      Immortalise yourself on the Hall of Fame<br>
      <span class="muted" id="submit-meta">steps: — · mode: —</span>
    </div>
    <input class="name-input" id="submit-name" type="text" maxlength="20" placeholder="Your name" />
    <div class="modal-actions">
      <button class="btn" id="submit-skip">Skip</button>
      <button class="btn primary" id="submit-go">Submit</button>
    </div>
    <div class="modal-err" id="submit-err"></div>
  </div>
</div>
```

- [ ] **Step 3: Add submit logic to the module script**

Find in the module script the block:

```javascript
newBtn.addEventListener('click', newGame);
undoBtn.addEventListener('click', undo);

updateScore();
```

Replace with:

```javascript
newBtn.addEventListener('click', newGame);
undoBtn.addEventListener('click', undo);

// ============================================================
// LEADERBOARD UI — submit modal + Hall of Fame overlay
// ============================================================
const submitModal = document.getElementById('submit-modal');
const submitMeta = document.getElementById('submit-meta');
const submitName = document.getElementById('submit-name');
const submitGo = document.getElementById('submit-go');
const submitSkip = document.getElementById('submit-skip');
const submitErr = document.getElementById('submit-err');
let lastSubmitAt = 0;

function openSubmitModal(meta) {
  submitMeta.textContent = `steps: ${meta.steps} · mode: ${meta.mode === 'human-first' ? 'Human-first' : 'Machine-first'}`;
  submitName.value = localStorage.getItem('connect4Name') || '';
  submitErr.textContent = '';
  submitModal.pendingMeta = meta;
  submitModal.hidden = false;
  setTimeout(() => submitName.focus(), 50);
}

function closeSubmitModal() {
  submitModal.hidden = true;
  submitModal.pendingMeta = null;
}

submitSkip.addEventListener('click', closeSubmitModal);

submitGo.addEventListener('click', async () => {
  const name = submitName.value.trim();
  if (name.length < 3 || name.length > 20) { submitErr.textContent = 'Name must be 3–20 chars.'; return; }
  if (Date.now() - lastSubmitAt < 30000) { submitErr.textContent = 'Hang on — 30s cooldown.'; return; }
  if (!firebaseReady) { submitErr.textContent = 'Leaderboard unavailable.'; return; }
  const meta = submitModal.pendingMeta;
  if (!meta) { closeSubmitModal(); return; }
  submitGo.disabled = true;
  submitErr.textContent = 'Submitting…';
  try {
    const safeName = name.replace(/[<>]/g, '').slice(0, 20);
    await fbApi.addDoc(lbCol, {
      name: safeName,
      mode: meta.mode,
      steps: meta.steps,
      moves: meta.moves,
      difficulty: 'impossible',
      createdAt: fbApi.serverTimestamp(),
      uid: auth.currentUser.uid
    });
    localStorage.setItem('connect4Name', safeName);
    lastSubmitAt = Date.now();
    submitErr.textContent = '';
    closeSubmitModal();
  } catch (err) {
    console.warn('[c4] submit failed:', err);
    submitErr.textContent = 'Submit failed: ' + (err.code || err.message || 'unknown');
  } finally {
    submitGo.disabled = false;
  }
});

updateScore();
```

- [ ] **Step 4: Trigger the modal on Impossible human win**

Find in the module script the `makeMove` function, specifically this block:

```javascript
    if (who === 'human') { score.human++; setStatus('you connected four — you win', 'win'); }
    else                 { score.ai++;    setStatus('machine connected four — you lose', 'loss'); }
    updateScore();
    return;
```

Replace with:

```javascript
    if (who === 'human') {
      score.human++;
      setStatus('you connected four — you win', 'win');
      if (aiDepth === 14 && firebaseReady) {
        const meta = {
          mode: humanFirst ? 'human-first' : 'ai-first',
          steps: moveLog.length,
          moves: moveLog.map(m => m.col)
        };
        setTimeout(() => openSubmitModal(meta), 900);
      }
    } else {
      score.ai++;
      setStatus('machine connected four — you lose', 'loss');
    }
    updateScore();
    return;
```

- [ ] **Step 5: Syntax check**

Run the same Node syntax check from Task 2, Step 4. Expected: `syntax OK`.

- [ ] **Step 6: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/public/games/connect4/index.html
git commit -m "$(cat <<'EOF'
feat(connect4): add submit modal for Hall of Fame entries

Triggers after beating Impossible; stores full move sequence for
replay validation; remembers the entered name in localStorage.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Replay validator

**Files:**
- Modify: `portfolio/public/games/connect4/index.html`

- [ ] **Step 1: Add the validator function**

Find in the module script:

```javascript
// ============================================================
// UI
// ============================================================
```

Insert the following block **immediately before** that comment:

```javascript
// ============================================================
// REPLAY VALIDATION — re-simulate a submission vs our engine
// Returns true iff the moves produce a legitimate human win.
// ============================================================
function validateSubmission(entry) {
  try {
    if (!Array.isArray(entry.moves)) return false;
    if (entry.moves.length !== entry.steps) return false;
    if (entry.difficulty !== 'impossible') return false;
    if (entry.mode !== 'human-first' && entry.mode !== 'ai-first') return false;

    const p = new Position();
    let turn = entry.mode === 'human-first' ? 'human' : 'ai';
    for (let i = 0; i < entry.moves.length; i++) {
      const col = entry.moves[i];
      if (!Number.isInteger(col) || col < 0 || col >= COLS) return false;
      if (!p.canPlay(col)) return false;

      if (turn === 'ai') {
        const expected = findBestMove(p, 14, entry.mode === 'ai-first');
        if (col !== expected) return false;
      }
      p.play(col);

      const justMoved = p.mask ^ p.current;
      if (Position.hasFourInARow(justMoved)) {
        return i === entry.moves.length - 1 && turn === 'human';
      }
      turn = turn === 'human' ? 'ai' : 'human';
    }
    return false;
  } catch (err) {
    console.warn('[c4] replay error:', err);
    return false;
  }
}
```

- [ ] **Step 2: Syntax check**

Run the same Node syntax check. Expected: `syntax OK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/public/games/connect4/index.html
git commit -m "$(cat <<'EOF'
feat(connect4): add replay validator for Hall of Fame entries

Deterministically re-runs each submitted move sequence against our
engine; only entries that produce a legitimate human win survive.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Hall of Fame overlay + real-time subscription

**Files:**
- Modify: `portfolio/public/games/connect4/index.html`

- [ ] **Step 1: Add overlay CSS**

In the `<style>` block, after the modal CSS you added in Task 3 Step 1, append:

```css
  .hof-card { background: linear-gradient(145deg, var(--grid-light), var(--grid)); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 24px; max-width: 520px; width: 94%; max-height: 88vh; overflow-y: auto; }
  .hof-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  .hof-title { font-family: 'Fraunces', serif; font-style: italic; font-size: 24px; font-weight: 900; }
  .hof-close { background: transparent; border: none; color: var(--ink-dim); font-size: 20px; cursor: pointer; padding: 4px 10px; }
  .hof-close:hover { color: var(--ink); }
  .hof-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
  .hof-tab { background: transparent; border: none; color: var(--ink-dim); padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; }
  .hof-tab.active { background: var(--ink); color: var(--bg); font-weight: 600; }
  .hof-tab .badge { display: inline-block; margin-left: 6px; color: var(--win); font-weight: 600; }
  .hof-list { display: flex; flex-direction: column; gap: 6px; }
  .hof-row { display: grid; grid-template-columns: 30px 1fr auto auto; gap: 10px; align-items: center; padding: 10px 12px; background: rgba(255,255,255,0.02); border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
  .hof-row.flash { animation: flashIn 1.2s ease-out; }
  @keyframes flashIn {
    0% { background: rgba(127,216,164,0.3); transform: scale(1.02); }
    100% { background: rgba(255,255,255,0.02); transform: scale(1); }
  }
  .hof-rank { color: var(--accent); font-weight: 600; }
  .hof-name { color: var(--ink); font-family: 'Fraunces', serif; font-size: 16px; font-style: italic; font-weight: 600; }
  .hof-steps { color: var(--win); font-weight: 600; }
  .hof-date { color: var(--ink-dim); font-size: 10px; }
  .hof-empty { padding: 32px 12px; text-align: center; color: var(--ink-dim); font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
  .hof-status { margin-top: 10px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--ink-dim); letter-spacing: 0.15em; text-align: center; text-transform: uppercase; }
  .hof-status .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--win); box-shadow: 0 0 8px var(--win); margin-right: 6px; vertical-align: middle; animation: pulse-dot 1.5s ease-in-out infinite; }
  @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
```

- [ ] **Step 2: Add overlay HTML**

Find the submit modal block from Task 3 Step 2. Immediately **after** its closing `</div>` (the outer `.modal`), insert:

```html
<div class="overlay" id="hof-overlay" hidden>
  <div class="hof-card">
    <div class="hof-head">
      <div class="hof-title">Hall of Fame</div>
      <button class="hof-close" id="hof-close" aria-label="Close">✕</button>
    </div>
    <div class="hof-tabs">
      <button class="hof-tab active" data-tab="human-first">Human First</button>
      <button class="hof-tab" data-tab="ai-first">Machine First</button>
    </div>
    <div class="hof-list" id="hof-list"></div>
    <div class="hof-status" id="hof-status"><span class="dot"></span>Live · Loading…</div>
  </div>
</div>
```

- [ ] **Step 3: Add overlay logic to the module script**

Find in the module script the line:

```javascript
updateScore();
```

(This is the very last line of the script, added in Task 3.) Insert the following block **immediately before** that line:

```javascript
// ============================================================
// HALL OF FAME OVERLAY — tabs + realtime onSnapshot
// ============================================================
const hofBtn = document.getElementById('hof-btn');
const hofOverlay = document.getElementById('hof-overlay');
const hofClose = document.getElementById('hof-close');
const hofList = document.getElementById('hof-list');
const hofStatus = document.getElementById('hof-status');
const hofTabs = document.querySelectorAll('.hof-tab');
let currentTab = 'human-first';
let currentUnsub = null;
const knownEntries = { 'human-first': new Set(), 'ai-first': new Set() };

function formatDate(ts) {
  if (!ts || !ts.toDate) return '—';
  const d = ts.toDate();
  return d.toISOString().slice(0, 10);
}

function renderList(entries) {
  hofList.innerHTML = '';
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'hof-empty';
    empty.textContent = 'No entries yet.';
    hofList.appendChild(empty);
    return;
  }
  entries.slice(0, 10).forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'hof-row';
    if (entry._isNew) row.classList.add('flash');
    const rank = document.createElement('span'); rank.className = 'hof-rank'; rank.textContent = '#' + (i + 1);
    const name = document.createElement('span'); name.className = 'hof-name'; name.textContent = entry.name;
    const steps = document.createElement('span'); steps.className = 'hof-steps'; steps.textContent = entry.steps + ' steps';
    const date = document.createElement('span'); date.className = 'hof-date'; date.textContent = formatDate(entry.createdAt);
    row.appendChild(rank); row.appendChild(name); row.appendChild(steps); row.appendChild(date);
    hofList.appendChild(row);
  });
}

function subscribeTab(mode) {
  if (currentUnsub) { currentUnsub(); currentUnsub = null; }
  if (!firebaseReady) { hofStatus.innerHTML = 'Leaderboard offline'; return; }
  hofStatus.innerHTML = '<span class="dot"></span>Live · Verifying entries…';
  const q = fbApi.query(
    lbCol,
    fbApi.where('mode', '==', mode),
    fbApi.where('difficulty', '==', 'impossible'),
    fbApi.orderBy('steps', 'asc'),
    fbApi.orderBy('createdAt', 'asc'),
    fbApi.limit(100)
  );
  currentUnsub = fbApi.onSnapshot(q, (snap) => {
    const validated = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (!validateSubmission(data)) return;
      const isNew = !knownEntries[mode].has(docSnap.id);
      knownEntries[mode].add(docSnap.id);
      validated.push({ ...data, _isNew: isNew });
    });
    renderList(validated);
    hofStatus.innerHTML = '<span class="dot"></span>Live · ' + validated.length + ' verified';
  }, (err) => {
    console.warn('[c4] onSnapshot error:', err);
    hofStatus.innerHTML = 'Leaderboard error: ' + (err.code || err.message);
  });
}

hofBtn.addEventListener('click', () => {
  hofOverlay.hidden = false;
  subscribeTab(currentTab);
});
hofClose.addEventListener('click', () => {
  hofOverlay.hidden = true;
  if (currentUnsub) { currentUnsub(); currentUnsub = null; }
});
hofOverlay.addEventListener('click', (e) => {
  if (e.target === hofOverlay) hofClose.click();
});
hofTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    hofTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    subscribeTab(currentTab);
  });
});

```

- [ ] **Step 4: Syntax check**

Run the same Node syntax check. Expected: `syntax OK`.

- [ ] **Step 5: Commit**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git add portfolio/public/games/connect4/index.html
git commit -m "$(cat <<'EOF'
feat(connect4): Hall of Fame overlay with real-time onSnapshot

Two tabs (Human-first, Machine-first), each showing the top 10
replay-validated entries. Subscribes only while overlay is open;
closes cleanly on unmount. New entries flash in.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: End-to-end verification

**Files:** none — verification + deploy.

- [ ] **Step 1: Build the portfolio**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio && rm -rf build && CI=false npm run build 2>&1 | tail -10
```
Expected: `Compiled successfully.`

Check the new HTML landed:

```bash
grep -c 'type="module"' /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/build/games/connect4/index.html
grep -c 'Hall of Fame' /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/build/games/connect4/index.html
```
Expected: `1` and `≥ 2` respectively.

- [ ] **Step 2: Local smoke test**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/build
npx --yes http-server -p 5555 -c-1 > /tmp/c4-server.log 2>&1 &
sleep 1
open "http://localhost:5555/games/connect4/index.html"
```

Manual checklist — open DevTools Console and confirm:
- No red errors related to Firebase (warnings from ad-blockers are OK).
- Console log: either success (auth completed silently) or `[c4] leaderboard disabled:` — the latter is acceptable if the test runs in an environment that blocks gstatic.
- Click `🏆 Hall of Fame` — overlay opens; if Firebase reached, shows `Live · 0 verified` (empty list).
- Close overlay.
- Switch difficulty to Medium, first-move Human, start a game, win a human game on Medium — submit modal does NOT appear (because depth !== 14).
- Switch to Impossible + Human-first, win (by deliberately playing a known winning line — col 3, 3, 2, 4, 1, 5, etc.). If you can't win, skip this step — the AI is genuinely unbeatable by default.

Stop server:
```bash
pkill -f "http-server -p 5555" || true
```

- [ ] **Step 3: Push to main**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio && git push origin main
```

- [ ] **Step 4: Watch the deploy workflow**

```bash
gh run list --branch main --limit 1 --json databaseId,status
RUN_ID=$(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status 2>&1 | tail -15
```
Expected: `✓ main Deploy Portfolio to S3`.

- [ ] **Step 5: Live verification**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://connect4.hillmanchan.com/games/connect4/index.html
curl -s https://connect4.hillmanchan.com/games/connect4/index.html | grep -c 'type="module"'
```
Expected: `HTTP 200` and `1`.

- [ ] **Step 6: Report to user**

Tell the user three things:
1. Feature deployed at `https://connect4.hillmanchan.com`.
2. Firestore rules deployed in Task 1 (verify in Firebase console).
3. Manual step — add `connect4.hillmanchan.com` and `hillmanchan.com` to Firebase Auth → Authorized domains (defense-in-depth; anonymous auth likely works without it).
4. When the first real submission happens, browser will log a `FAILED_PRECONDITION: The query requires an index. Click here to create it:` — the user clicks the link once, done.

---

## Self-Review

- **Spec coverage:**
  - Data model → Task 1 (rules) + Task 3 (submit shape).
  - Firestore rules schema → Task 1.
  - Firebase project reuse / public config → Task 2 Step 2.
  - Anonymous auth flow → Task 2 Step 2.
  - Replay validation → Task 4.
  - Submit modal UX → Task 3.
  - Hall of Fame overlay + symmetric tabs + real-time updates → Task 5.
  - "No entries yet" symmetric empty state → Task 5 Step 3 (`renderList`).
  - 30s client cooldown → Task 3 Step 3.
  - Graceful offline behaviour → Task 2 Step 2 (try/catch hides `hof-btn`).
  - Manual steps (deploy rules, auth domains, index link) → Task 1 Step 2 + Task 6 Step 6.
  - Acceptance criterion 6 (unsubscribe on close) → Task 5 Step 3 (`hofClose` listener calls `currentUnsub()`).
- **Placeholder scan:** No TBDs, no "similar to above", every code block is complete.
- **Type consistency:** Field names (`name`, `mode`, `steps`, `moves`, `difficulty`, `createdAt`, `uid`) are identical across rules (Task 1), submit (Task 3), validator (Task 4), render (Task 5). Mode values (`'human-first'`, `'ai-first'`) consistent. Difficulty always `'impossible'`.
