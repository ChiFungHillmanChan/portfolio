# 打小人 Image-Rights Consent Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player who uploads a photo must affirm they have the right to use it before either game mode can start, and the disclaimers gain no-efficacy, age, and share-responsibility wording.

**Architecture:** A pure closure-factory module `consent.js` owns the three gate rules (no photo → free; photo unticked → blocked; photo swapped → confirmation resets) and is unit-tested in isolation. `game.js` renders a checkbox row that is hidden until a photo decodes, mirrors the module's state into the DOM, and consults `canStart()` inside `start()` — which is the authoritative gate. Copy changes are plain string edits. `sw.js` precaches the new module and bumps its cache version so the change actually reaches returning players.

**Tech Stack:** Vanilla ES modules, no dependencies. `node --test` (Node's built-in runner). Canvas 2D game, PWA service worker.

**Spec:** `docs/superpowers/specs/2026-07-27-da-siu-yan-image-consent-design.md`

## Global Constraints

- **Working directory for all game files:** `portfolio/public/games/da-siu-yan/`. `portfolio/build/` is generated and gitignored — never edit or commit it.
- **No new dependencies.** The game is deliberately dependency-free vanilla JS.
- **Punctuation:** use ASCII `,` and `!` with fullwidth `。` and `、`, matching every existing string in the codebase. Do **not** use `，`.
- **Cantonese conventions:** 淨係 (not 只係) for "only" on the end screen; 冇 (not 無); 口訣 for the chant.
- **The confirmation sentence is verbatim 書面語** and must not be rewritten into Cantonese: `我確認我擁有此圖片的使用權,且此圖片不涉及未成年人、私密影像或未經同意的他人肖像。`
- **`sw.js` `CACHE` and `ASSETS` must stay strict JSON** (double quotes, no trailing commas) — `portfolio/public/games/pwa.test.mjs` parses them textually with a regex + `JSON.parse`.
- **Branch:** `feat/da-siu-yan-image-consent` (already created off `main`). Open a PR; **do not merge** without explicit instruction.
- **Do not commit** `README.md` or `scripts/da-siu-yan/*` — they are uncommitted changes belonging to other work in this shared tree. Stage files by explicit path, never `git add -A`.

## File Structure

| File | Responsibility |
|---|---|
| `consent.js` *(create)* | The three gate rules, pure and DOM-free |
| `consent.test.js` *(create)* | Unit tests for those rules |
| `game.js` *(modify)* | Checkbox markup, state mirroring, the gate in `start()`, copy |
| `styles.css` *(modify)* | `.consent`, nudge keyframe, `.mode-btn.is-locked` |
| `sw.js` *(modify)* | Precache `consent.js`, bump `CACHE` |

---

### Task 1: The `consent.js` gate module

**Files:**
- Create: `portfolio/public/games/da-siu-yan/consent.js`
- Test: `portfolio/public/games/da-siu-yan/consent.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createConsent()` returning `{ photoChanged(accepted: boolean): void, setConfirmed(v: boolean): void, canStart(): boolean, state(): {hasPhoto: boolean, confirmed: boolean} }`. Task 2 consumes all four.

- [ ] **Step 1: Write the failing tests**

Create `portfolio/public/games/da-siu-yan/consent.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConsent } from './consent.js';

test('no photo: the ritual starts freely', () => {
  const c = createConsent();
  assert.equal(c.canStart(), true);
  assert.deepEqual(c.state(), { hasPhoto: false, confirmed: false });
});

test('photo loaded but unconfirmed: blocked', () => {
  const c = createConsent();
  c.photoChanged(true);
  assert.equal(c.canStart(), false);
});

test('photo loaded and confirmed: allowed', () => {
  const c = createConsent();
  c.photoChanged(true);
  c.setConfirmed(true);
  assert.equal(c.canStart(), true);
});

test('swapping the photo resets a previous confirmation', () => {
  const c = createConsent();
  c.photoChanged(true);
  c.setConfirmed(true);
  c.photoChanged(true);                 // a DIFFERENT image
  assert.equal(c.canStart(), false);
  assert.deepEqual(c.state(), { hasPhoto: true, confirmed: false });
});

test('a failed decode clears the photo and its confirmation', () => {
  const c = createConsent();
  c.photoChanged(true);
  c.setConfirmed(true);
  c.photoChanged(false);
  assert.equal(c.canStart(), true);
  assert.deepEqual(c.state(), { hasPhoto: false, confirmed: false });
});

test('confirming with no photo records the flag without inventing a photo', () => {
  const c = createConsent();
  c.setConfirmed(true);
  assert.equal(c.canStart(), true);
  assert.deepEqual(c.state(), { hasPhoto: false, confirmed: true });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd portfolio/public/games/da-siu-yan && node --test consent.test.js
```

Expected: FAIL — `Cannot find module .../consent.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `portfolio/public/games/da-siu-yan/consent.js`:

```js
// Photo-rights consent gate. A photo of a real person may only enter the
// ritual after the player affirms they have the right to use it — see
// docs/superpowers/specs/2026-07-27-da-siu-yan-image-consent-design.md.
//
// Swapping the image ALWAYS clears the confirmation: the undertaking is about
// one specific photo and must never be inherited by the next one. A failed
// decode arrives here as photoChanged(false) and is simply "no photo".
export function createConsent() {
  let hasPhoto = false, confirmed = false;
  return {
    photoChanged(accepted) { hasPhoto = accepted; confirmed = false; },
    setConfirmed(v) { confirmed = v; },
    canStart: () => !hasPhoto || confirmed,
    state: () => ({ hasPhoto, confirmed })
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd portfolio/public/games/da-siu-yan && node --test consent.test.js
```

Expected: PASS — 6 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/da-siu-yan/consent.js portfolio/public/games/da-siu-yan/consent.test.js
git commit -m "feat(da-siu-yan): pure consent gate for uploaded photos"
```

---

### Task 2: Checkbox UI, state mirroring, and the gate in `start()`

**Files:**
- Modify: `portfolio/public/games/da-siu-yan/game.js` (import at :9, template :20-22, refs :45, photo handler :72-83, mode wiring :121-122, `start()` :173-175)
- Modify: `portfolio/public/games/da-siu-yan/styles.css` (append after the `.toggle` rules at :41-45)

**Interfaces:**
- Consumes: `createConsent()` from Task 1.
- Produces: DOM ids `photo-consent` (the `<label>` row) and `photo-consent-box` (the `<input type="checkbox">`); the `.is-locked` class on `.mode-btn`. Task 3 edits copy in the same file but touches none of these.

- [ ] **Step 1: Add the CSS**

Append to `portfolio/public/games/da-siu-yan/styles.css`, after the `.toggle button[aria-pressed="true"]` rule:

```css
/* Consent row — only rendered while a photo is loaded. The [hidden] rule is
   NOT redundant: `display: flex` here would otherwise beat the UA's
   [hidden] { display: none }, exactly as it does for .overlay above. */
.consent { display: flex; gap: 10px; align-items: flex-start; text-align: left;
  max-width: min(340px, 86%); font-size: 0.8rem; line-height: 1.6;
  padding: 10px 12px; border-radius: 8px; border: 1px solid #7a5a30;
  background: #120a06; cursor: pointer; }
.consent[hidden] { display: none; }
.consent input { flex: 0 0 auto; width: 22px; height: 22px; margin-top: 1px;
  accent-color: var(--paper); }
/* pressing a locked mode button points at the reason instead of doing nothing */
.consent--nudge { animation: consent-nudge 0.6s ease-out; }
@keyframes consent-nudge {
  0%, 100% { border-color: #7a5a30; background: #120a06; }
  25%, 75% { border-color: #a8442f; background: #2a1008; }
}
.mode-btn.is-locked { opacity: 0.4; }
```

- [ ] **Step 2: Add the import**

In `game.js`, after the existing `import { INTRO, LINES } from './chant-lines.js';` line:

```js
import { createConsent } from './consent.js';
```

- [ ] **Step 3: Add the markup**

In the `app.innerHTML` template, insert immediately after the
`<input id="photo-input" type="file" accept="image/*" />` line and before the
`<div class="toggle" role="group" aria-label="聲線">` line:

```html
      <label id="photo-consent" class="consent" hidden>
        <input id="photo-consent-box" type="checkbox" />
        <span>我確認我擁有此圖片的使用權,且此圖片不涉及未成年人、私密影像或未經同意的他人肖像。</span>
      </label>
```

- [ ] **Step 4: Add element refs and the module instance**

After the existing `const styleBtns = { ... };` line:

```js
const consentRow = document.getElementById('photo-consent');
const consentBox = document.getElementById('photo-consent-box');
const modeBtns = [document.getElementById('start-ritual'), document.getElementById('start-free')];
```

And beside the other mutable state, immediately after `let photoCanvas = null;`:

```js
const consent = createConsent();
```

- [ ] **Step 5: Add the two UI helpers**

Insert directly above the `photoBtn.addEventListener('click', ...)` line:

```js
// The consent row exists only while there is a photo to consent to. The mode
// buttons stay CLICKABLE while locked — a `disabled` attribute would swallow
// the click and there would be no way to say why nothing happened.
function syncConsentUI() {
  const { hasPhoto, confirmed } = consent.state();
  consentRow.hidden = !hasPhoto;
  consentBox.checked = confirmed;
  const locked = !consent.canStart();
  for (const btn of modeBtns) {
    btn.classList.toggle('is-locked', locked);
    btn.setAttribute('aria-disabled', String(locked));
  }
}

function nudgeConsent() {
  consentRow.classList.remove('consent--nudge');
  void consentRow.offsetWidth;          // reflow, so repeat taps replay it
  consentRow.classList.add('consent--nudge');
}
```

- [ ] **Step 6: Wire the photo handler and the checkbox**

In the `photoInput` change handler, add `consent.photoChanged(true);` as the last
line of the `try` block, `consent.photoChanged(false);` as the last line of the
`catch` block, and `syncConsentUI();` after the whole `try/catch`. The handler
becomes:

```js
photoInput.addEventListener('change', async () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  try {
    photoCanvas = await downscale(file, 1024);
    photoBtn.textContent = '相已上載(撳一下再換)';
    consent.photoChanged(true);
  } catch (err) {
    console.warn('photo decode failed', err);
    photoBtn.textContent = '張相讀唔到,試過另一張';
    photoCanvas = null;
    consent.photoChanged(false);
  }
  syncConsentUI();
});
```

Then add the checkbox listener directly below that handler:

```js
consentBox.addEventListener('change', () => {
  consent.setConfirmed(consentBox.checked);
  syncConsentUI();
});
```

- [ ] **Step 7: Use `modeBtns` for the mode wiring and do the first sync**

Replace the two lines

```js
document.getElementById('start-ritual').addEventListener('click', () => start('ritual'));
document.getElementById('start-free').addEventListener('click', () => start('free'));
```

with

```js
modeBtns[0].addEventListener('click', () => start('ritual'));
modeBtns[1].addEventListener('click', () => start('free'));
syncConsentUI();
```

- [ ] **Step 8: Add the authoritative gate**

In `async function start(which)`, immediately after the existing `if (mode) return;`:

```js
  if (!consent.canStart()) { nudgeConsent(); return; }
```

- [ ] **Step 9: Verify the existing suite still passes**

```bash
cd portfolio/public/games/da-siu-yan && node --test
```

Expected: PASS — all pre-existing test files plus `consent.test.js`, 0 failures.

- [ ] **Step 10: Commit**

```bash
git add portfolio/public/games/da-siu-yan/game.js portfolio/public/games/da-siu-yan/styles.css
git commit -m "feat(da-siu-yan): gate both modes behind photo-rights confirmation"
```

---

### Task 3: Disclaimer copy

**Files:**
- Modify: `portfolio/public/games/da-siu-yan/game.js` (fineprint in the template :32, end-screen note :311-314)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing consumed later.

- [ ] **Step 1: Replace the entry fineprint**

In the `app.innerHTML` template, replace the line

```html
      <p class="fineprint">名同相只喺你部機處理,唔會上載去任何地方。<br>娛樂用途,旨在祈福減壓。聲音由 AI 生成。</p>
```

with

```html
      <p class="fineprint">名同相只喺你部機處理,唔會上載去任何地方。<br>本遊戲只係模仿民間習俗,唔係宗教服務,亦冇任何實際效力。<br>口訣有咒罵字句,建議成年人玩。聲音由 AI 生成。</p>
```

(The removed 娛樂用途,旨在祈福減壓 is dropped on purpose: 祈福 implies the ritual works.)

- [ ] **Step 2: Add the end-screen responsibility line**

In `showEnd()`, inside the `if (recBlob && recBlob.size > 0)` branch, after the
existing `endEl.appendChild(note);` that follows
`note.textContent = '條片淨係喺你部機入面,唔儲存就會冇咗。';`, append:

```js
      const care = document.createElement('p');
      care.className = 'fineprint';
      care.textContent = '如果用咗真人個名或者張相,後果你要自己負責 —— 唔好用嚟騷擾、恐嚇或者公開針對任何人。';
      endEl.appendChild(care);
```

It must stay inside that branch so it appears exactly when a shareable video
exists, and never in free mode, which records nothing.

- [ ] **Step 3: Verify the suite still passes**

```bash
cd portfolio/public/games/da-siu-yan && node --test
```

Expected: PASS, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add portfolio/public/games/da-siu-yan/game.js
git commit -m "feat(da-siu-yan): no-efficacy, age and share-responsibility notices"
```

---

### Task 4: Service-worker precache and cache bump

**Files:**
- Modify: `portfolio/public/games/da-siu-yan/sw.js` (`CACHE` at :5, `ASSETS` list)
- Test: `portfolio/public/games/pwa.test.mjs` (existing, not modified)

**Interfaces:**
- Consumes: the `consent.js` path from Task 1.
- Produces: nothing consumed later.

- [ ] **Step 1: Run the PWA test to see it currently passes**

```bash
cd portfolio/public/games && node --test pwa.test.mjs
```

Expected: PASS. This is the baseline — the test cannot detect the missing entry
on its own, so the bar is that it still passes after the edit.

- [ ] **Step 2: Add `consent.js` to `ASSETS`**

In `sw.js`, add the entry immediately after `"./game.js",`:

```js
  "./consent.js",
```

Without this, `game.js`'s new `import` 404s on an offline first load and the
whole game fails to boot.

- [ ] **Step 3: Bump the cache version**

Change

```js
const CACHE = "da-siu-yan-v9";
```

to

```js
const CACHE = "da-siu-yan-v10";
```

Without the bump, returning players keep the cached `game.js` and never receive
the checkbox — the gate would silently not ship.

- [ ] **Step 4: Verify**

```bash
cd portfolio/public/games && node --test pwa.test.mjs
```

Expected: PASS — the suite asserts every `ASSETS` entry exists on disk and that
`CACHE` matches `^da-siu-yan-v\d+$`.

- [ ] **Step 5: Commit**

```bash
git add portfolio/public/games/da-siu-yan/sw.js
git commit -m "chore(da-siu-yan): precache consent.js, cache v10"
```

---

### Task 5: Browser verification and PR

**Files:** none modified.

**Interfaces:** none.

- [ ] **Step 1: Serve the game from the repo root**

```bash
cd portfolio/public/games/da-siu-yan && python3 -m http.server 8765
```

Open `http://localhost:8765/`. If a previous service worker is registered, hard-reload
or use a private window so `v10` installs cleanly.

- [ ] **Step 2: Walk the six states and confirm each**

1. Fresh load, no photo → no consent row; 開壇 and 任摑 are full-opacity and start normally.
2. Upload a photo → consent row appears, unticked; both buttons dim.
3. Press 開壇 while unticked → nothing starts, the row flashes. Press again → it flashes again.
4. Tick the box (tap the *text*, not just the square — confirms the label target) → both buttons return to full opacity; 任摑 starts.
5. Return to the entry screen, upload a *different* photo → the box is unticked again and the buttons re-dim.
6. Run a full 開壇 to the end screen → both fineprint lines are present under the video, and the entry screen's three-line fineprint reads correctly.

- [ ] **Step 3: Check the console**

Expected: no errors. A `[pwa]` warning is only acceptable if the page is not
being served over `http://localhost`.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/da-siu-yan-image-consent
gh pr create --title "打小人: image-rights consent gate + disclaimer gaps" --body "$(cat <<'PRBODY'
Adds a rights-confirmation checkbox that gates both game modes whenever a photo
is loaded, and fills the three disclaimer gaps found while analysing the game.

- `consent.js` — pure gate: no photo → free; photo unticked → blocked; swapping
  the photo resets the confirmation so a new image never inherits the old
  undertaking. Six unit tests.
- Entry screen — checkbox appears only once a photo decodes. Mode buttons use
  `aria-disabled` + `.is-locked` rather than the `disabled` attribute, so a tap
  can flash the row instead of silently doing nothing. `start()` is the real gate.
- Copy — dropped 祈福 (implied efficacy) for 唔係宗教服務,亦冇任何實際效力; added an
  age/content note; added a share-responsibility line beside 儲存/分享, which had
  no disclaimer at all.
- `sw.js` — precache `consent.js`, `CACHE` v9 → v10.

Spec: `docs/superpowers/specs/2026-07-27-da-siu-yan-image-consent-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)"
```

- [ ] **Step 5: Stop — do not merge**

Report the PR URL and wait for an explicit merge instruction.

---

## Self-Review

**Spec coverage:** §1 Entry UI → Task 2 steps 1,3; §2 Locking mode buttons → Task 2 steps 1,5,7,8; §3 `consent.js` → Task 1; §4 Copy → Task 3; §5 Service worker → Task 4; §Testing → Task 1 step 4, Task 4 step 4, Task 5 step 2. No gaps.

**Type consistency:** `createConsent`, `photoChanged`, `setConfirmed`, `canStart`, `state` are spelled identically in Task 1's test, Task 1's implementation, and every call site in Task 2. DOM ids `photo-consent` / `photo-consent-box` match between Task 2 step 3 (markup) and step 4 (refs). `.is-locked` and `.consent--nudge` match between the CSS in step 1 and the JS in step 5.
