# Casino-game Poker Phase 2 — Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase Google Sign-In to the casino-game poker bb100 page. After this phase, users can sign in, the "My Sessions" tab is revealed, and their Firebase ID token is attached to API calls (no API exists yet — that's Phase 3).

**Architecture:** Reuses the existing `system-design-c84d3` Firebase project. Casino-game is plain static HTML (no Vite/bundler), so Firebase SDK loads from gstatic.com as ES modules — same pattern as the existing Chart.js/Hammer.js CDN scripts. Firebase config (public-key material) is hardcoded in `firebase-init.js`. Three new JS modules: init, UI, api-client.

**Tech Stack:** Firebase v10 (modular SDK from gstatic.com CDN, no npm), Google Sign-In via popup.

**Spec:** `docs/superpowers/specs/2026-05-21-casino-poker-cloud-storage-design.md` (Phase 2 section)

**Pre-requisite (manual, one-time):** In Firebase Console → Authentication → Settings → Authorized domains, add `casino-game.hillmanchan.com` and `hillmanchan.com`. This task list assumes that's already done OR will be done before user testing in Task 5. The code works on `localhost` for development without that step.

---

## File map

```
portfolio/src/game/casino-game/calculator/poker/bb100/
├── index.html                  MODIFY: add sign-in button slot, Firebase script imports
├── css/
│   └── auth.css                NEW: sign-in button + avatar pill styling
└── js/
    └── auth/                   NEW directory
        ├── firebase-init.js    NEW: Firebase config + init; exports app/auth/db/googleProvider/POKER_API_BASE
        ├── auth-ui.js          NEW: sign-in button wiring, onAuthStateChanged listener, tab-reveal
        └── api-client.js       NEW: getIdToken() with auto-refresh, apiCall(action, payload) stub

portfolio/src/game/system-design/firestore.rules    MODIFY: add pokerStorage + pokerSessions rules
```

**Why this split:** firebase-init does ONE job (config + singleton exports). auth-ui owns DOM. api-client owns the API call surface that Phase 3+ will populate. No module imports another's internals.

---

## Task 1: Add auth.css with sign-in button + avatar pill

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/poker/bb100/css/auth.css`

- [ ] **Step 1: Write the CSS**

```css
/* Sign-in button (signed-out state) */
.auth-signin-btn {
  background: linear-gradient(180deg, #4285F4 0%, #2c6fd4 100%);
  color: white;
  border: 0;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.03em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: filter 0.15s, transform 0.05s;
}

.auth-signin-btn:hover { filter: brightness(1.1); }
.auth-signin-btn:active { transform: translateY(1px); }
.auth-signin-btn[disabled] { opacity: 0.6; cursor: progress; }

.auth-signin-btn::before {
  content: '';
  width: 16px; height: 16px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path fill='%23FFC107' d='M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-4z'/><path fill='%23FF3D00' d='M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z'/><path fill='%234CAF50' d='M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2.1 1.5-4.7 2.4-7.5 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.5 39.7 16.2 44 24 44z'/><path fill='%231976D2' d='M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.5 5.5C40.6 36.5 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z'/></svg>");
  background-size: contain;
  background-repeat: no-repeat;
}

/* Avatar pill (signed-in state) */
.auth-user-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 12px 4px 4px;
  border-radius: 999px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  color: #d0d0d8;
}

.auth-user-pill img {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: #1f1f2a;
}

.auth-signout-btn {
  background: transparent;
  color: #888;
  border: 0;
  padding: 4px 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
}

.auth-signout-btn:hover { background: rgba(255,255,255,0.05); color: #ddd; }

/* Auth slot positioning */
.auth-slot {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 600px) {
  .auth-signin-btn { padding: 6px 12px; font-size: 13px; }
  .auth-user-pill img { width: 24px; height: 24px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/css/auth.css
git commit -m "feat(poker): add auth.css — sign-in button + user pill styling

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create firebase-init.js

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/poker/bb100/js/auth/firebase-init.js`

- [ ] **Step 1: Write the module**

```js
// firebase-init.js — Firebase init for casino-game poker bb100
// Uses the same project as system-design-c84d3. Web config is public-key
// material by design; security is enforced by Firebase Auth ID-token
// verification + Firestore security rules + Lambda token verification.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2wBCjM1c8bX8VQP4vQbE_q-KoBrRY_vc",
  authDomain: "system-design-c84d3.firebaseapp.com",
  projectId: "system-design-c84d3",
  storageBucket: "system-design-c84d3.firebasestorage.app",
  messagingSenderId: "547168317115",
  appId: "1:547168317115:web:f5130cde873096b7f3839e",
};

export const POKER_API_BASE = "https://api.system-design.hillmanchan.com";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
```

- [ ] **Step 2: Smoke-test the import in a browser**

Open `portfolio/src/game/casino-game/calculator/poker/bb100/index.html` in Chrome with the dev console open. In console:

```js
const m = await import('./js/auth/firebase-init.js');
console.log(m.auth.app.options.projectId);  // → "system-design-c84d3"
```

Expected: prints `system-design-c84d3` with no errors. If you get CORS errors loading from gstatic, you need to serve the file (not file://). Use `python3 -m http.server 8000` from the bb100 dir and open `http://localhost:8000/index.html`.

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/js/auth/firebase-init.js
git commit -m "feat(poker): add firebase-init.js — singleton app/auth/db exports

Loads Firebase v10 modular SDK from gstatic CDN, no bundler. Reuses the
system-design-c84d3 project so casino-game and system-design share a single
Google identity per user.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Create api-client.js (token-bearing fetch wrapper)

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/poker/bb100/js/auth/api-client.js`

- [ ] **Step 1: Write the module**

```js
// api-client.js — Firebase-ID-token-bearing fetch wrapper for /poker/* API.
// Phase 3+ Lambda actions consume this. In Phase 2 there's no Lambda yet,
// so apiCall() is exported but only used in Phase 3.

import { auth, POKER_API_BASE } from "./firebase-init.js";

/**
 * Get the current user's Firebase ID token, auto-refreshing if near expiry.
 * Returns null if no user is signed in.
 */
export async function getIdToken({ forceRefresh = false } = {}) {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error("[poker auth] getIdToken failed:", err);
    return null;
  }
}

/**
 * POST to api.system-design.hillmanchan.com/poker/<action> with the user's
 * Firebase ID token in the Authorization header. Throws on network errors
 * or non-2xx responses; returns the parsed JSON body otherwise.
 */
export async function apiCall(action, payload = {}) {
  const token = await getIdToken();
  if (!token) {
    throw new Error("not-signed-in");
  }
  const url = `${POKER_API_BASE}/poker/${action}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`poker-api-${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/js/auth/api-client.js
git commit -m "feat(poker): add api-client.js — Firebase ID-token-bearing fetch wrapper

Single export apiCall(action, payload) → POST to /poker/<action> with
Authorization: Bearer <firebase-id-token>. Auto-refreshes the token.
No Lambda actions exist yet; Phase 3 populates them.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Create auth-ui.js (sign-in button + state listener + tab reveal)

**Files:**
- Create: `portfolio/src/game/casino-game/calculator/poker/bb100/js/auth/auth-ui.js`

- [ ] **Step 1: Write the module**

```js
// auth-ui.js — renders the sign-in button / user pill in the auth slot,
// wires sign-in/out actions, and reveals the My Sessions tab on sign-in.

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth, googleProvider } from "./firebase-init.js";

const SLOT_ID = "authSlot";
const SESSIONS_TAB_SELECTOR = '[data-tab="sessions"]';
const SAVE_TO_CLOUD_BTN_ID = "saveToCloudBtn";          // Phase 3 adds it; Phase 2 hides it
const QUOTA_METER_ID = "quotaMeter";                    // Phase 3 adds it; Phase 2 hides it

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "onclick") node.addEventListener("click", v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

function renderSignedOut(slot) {
  slot.replaceChildren(
    el("button", {
      class: "auth-signin-btn",
      type: "button",
      onclick: async (e) => {
        e.currentTarget.disabled = true;
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (err) {
          console.error("[poker auth] sign-in failed:", err);
          alert("Sign-in failed: " + (err.code || err.message));
        } finally {
          e.currentTarget.disabled = false;
        }
      },
    }, ["Sign in with Google"])
  );
}

function renderSignedIn(slot, user) {
  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();
  const avatar = user.photoURL
    ? el("img", { src: user.photoURL, alt: "", referrerpolicy: "no-referrer" })
    : el("span", { class: "auth-avatar-fallback" }, [initial]);
  slot.replaceChildren(
    el("div", { class: "auth-user-pill" }, [
      avatar,
      el("span", {}, [user.displayName || user.email || "Signed in"]),
    ]),
    el("button", {
      class: "auth-signout-btn",
      type: "button",
      onclick: () => signOut(auth),
    }, ["Sign out"])
  );
}

function setSessionsTabVisible(visible) {
  const tabBtn = document.querySelector(SESSIONS_TAB_SELECTOR);
  if (tabBtn) {
    if (visible) tabBtn.removeAttribute("hidden");
    else tabBtn.setAttribute("hidden", "");
  }
}

function init() {
  const slot = document.getElementById(SLOT_ID);
  if (!slot) {
    console.warn("[poker auth] auth slot #" + SLOT_ID + " not found in DOM");
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      renderSignedIn(slot, user);
      setSessionsTabVisible(true);
    } else {
      renderSignedOut(slot);
      setSessionsTabVisible(false);
    }
  });
}

// Init once DOM is parsed. The script tag uses type="module" + defer-like behavior.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
```

- [ ] **Step 2: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/js/auth/auth-ui.js
git commit -m "feat(poker): add auth-ui.js — sign-in button, user pill, tab reveal

onAuthStateChanged listener renders the auth slot and reveals/hides the
'My Sessions' tab based on signed-in state. Uses signInWithPopup with
Google provider configured for account picker.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Wire auth into index.html

**Files:**
- Modify: `portfolio/src/game/casino-game/calculator/poker/bb100/index.html`

- [ ] **Step 1: Read the current index.html head + top-of-body**

```bash
sed -n '1,30p' /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100/index.html
```

Note the existing `<link rel="stylesheet">` block (around lines 13-19) and where script tags live (currently bottom of body, around lines 227-229).

- [ ] **Step 2: Add auth.css to the head's stylesheet block**

Find the line containing `<link rel="stylesheet" href="css/upload.css">`. Immediately after it, add:

```html
    <link rel="stylesheet" href="css/auth.css">
```

- [ ] **Step 3: Add the auth slot to the page header area**

Find the page's main heading region (around lines 60-70 — there's likely an `<h1>` or `<header>` near the top of `<body>`). Add an `<div id="authSlot" class="auth-slot"></div>` element positioned top-right. The exact placement depends on the existing layout — a reasonable default is inside whatever `<header>`/banner element exists, OR as a fixed element top-right. Look at what's there and use `auth-ui.js`'s assumption (`document.getElementById("authSlot")`).

Concretely, find the line:

```html
        <div class="tab-bar" role="tablist">
```

Insert immediately before it:

```html
        <div class="auth-row">
            <div id="authSlot" class="auth-slot"></div>
        </div>
```

Then add to `css/auth.css`:

```css
.auth-row {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}
```

(Apply this CSS via a separate Edit to auth.css.)

- [ ] **Step 4: Add the auth module script to the bottom of body**

Find the existing script block at the bottom of `<body>`:

```html
    <script src="../../js/hamburger-menu.js"></script>
    <script src="js/bb100.js"></script>
    <script src="js/tabs.js"></script>
```

Add immediately after:

```html
    <script type="module" src="js/auth/auth-ui.js"></script>
```

The `type="module"` is required because auth-ui.js uses `import`.

- [ ] **Step 5: Smoke test in a browser**

Serve and open:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html`. Confirm:
1. Page loads without console errors
2. "Sign in with Google" button appears at top-right
3. Existing Manual / Upload tabs render and work
4. "My Sessions" tab is NOT visible (still hidden)

Click "Sign in with Google". Confirm:
5. Google account picker pops up
6. After selecting an account, the button becomes a user pill with avatar + name + "Sign out"
7. The "My Sessions" tab APPEARS in the tab bar
8. Click "Sign out" → reverts to "Sign in with Google" button + tab hides again

If sign-in pops up but errors with "auth/unauthorized-domain", that means Firebase Console hasn't whitelisted `localhost`. Localhost is usually already authorized by default; if not, add it in Firebase Console → Authentication → Settings → Authorized domains.

- [ ] **Step 6: Commit**

```bash
git add portfolio/src/game/casino-game/calculator/poker/bb100/index.html portfolio/src/game/casino-game/calculator/poker/bb100/css/auth.css
git commit -m "feat(poker): wire Firebase auth into bb100/index.html

Adds auth.css link, auth slot div, and auth-ui.js module script. Sign-in
button renders top-right; on auth state change, auth-ui.js reveals/hides
the My Sessions tab.

Tested locally: sign-in popup works, tab reveal works, sign-out works.
Firestore writes still locked down by rules; Phase 3 will add Lambda
actions that consume the ID token.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Add Firestore security rules for poker collections

**Files:**
- Modify: `portfolio/src/game/system-design/firestore.rules`

- [ ] **Step 1: Read the current rules file**

```bash
cat /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/system-design/firestore.rules
```

Identify the closing `}` of the outermost `rules_version` / `service cloud.firestore { match /databases/{db}/documents { ... } }` block. The new rules go inside the inner `documents` match.

- [ ] **Step 2: Add poker collection rules**

Insert before the final closing `}` of the `documents` block:

```
    // Casino-game poker — per-user storage doc (single doc per user)
    match /pokerStorage/{uid} {
      allow read:  if request.auth != null && request.auth.uid == uid;
      allow write: if false;   // Admin SDK only (cg-poker Lambda writes tier/count)
    }

    // Casino-game poker — per-user session docs (one per upload session)
    match /pokerSessions/{uid}/sessions/{sessionId} {
      allow read:  if request.auth != null && request.auth.uid == uid;
      allow write: if false;   // Admin SDK only
    }
```

- [ ] **Step 3: Deploy the rules**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/system-design
npx firebase deploy --only firestore:rules
```

Expected: deploy completes with no errors. The Firebase project ID in firebase.json must match `system-design-c84d3`.

If you get "no firebase.json" or "not logged in", the user needs to run firebase login first or you need to specify the project. STOP and report NEEDS_CONTEXT with the exact error.

- [ ] **Step 4: Verify the rules in Firebase Console**

Open https://console.firebase.google.com/project/system-design-c84d3/firestore/rules and confirm the new poker rules are visible.

- [ ] **Step 5: Smoke test — try to read pokerStorage/{uid} as the signed-in user**

In the browser (with sign-in still active from Task 5), in the dev console:

```js
const m1 = await import('./js/auth/firebase-init.js');
const m2 = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');
const ref = m2.doc(m1.db, 'pokerStorage', m1.auth.currentUser.uid);
try {
  const snap = await m2.getDoc(ref);
  console.log('exists:', snap.exists(), 'data:', snap.data());
} catch (err) {
  console.error(err.code, err.message);
}
```

Expected: `exists: false  data: undefined` (no doc yet — Phase 3 creates it on first upload). No "permission-denied" error.

If you get `permission-denied`, the rules aren't deployed or aren't matching the path. Check the deploy output.

Try to WRITE — should fail:

```js
await m2.setDoc(ref, { tier: 'ultra' }).catch(e => console.log('write blocked as expected:', e.code));
```

Expected: prints `write blocked as expected: permission-denied`.

- [ ] **Step 6: Commit**

```bash
git add portfolio/src/game/system-design/firestore.rules
git commit -m "feat(poker): add Firestore security rules for pokerStorage + pokerSessions

Clients can read their own doc(s); writes are Admin-SDK-only (cg-poker
Lambda in Phase 3). Rules deployed to system-design-c84d3 project.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Final Phase-2 regression + manual test

**Files:**
- No file changes.

- [ ] **Step 1: Run the bb100 unit-test suite (must remain green)**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100
node --test --test-timeout=180000 'tests/*.test.mjs' 2>&1 | grep -E "^# (tests|pass|fail|duration_ms)"
```

Expected: `# tests 66, # pass 66, # fail 0`. Phase 2 added no JS-runnable test code; this just confirms nothing regressed.

- [ ] **Step 2: Re-run the verify CLI (must remain green=$8.71, orange=$11.23)**

```bash
node verify/verify.mjs /Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8/ 2>&1 | grep -E "Hands parsed|Final Winnings|Final All-in EV"
```

Expected: Hands parsed 1815/1815; Final Winnings green $8.71; Final All-in EV orange $11.23 (both BEFORE RAKE lines).

- [ ] **Step 3: Manual browser end-to-end**

Serve and open:
```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/portfolio/src/game/casino-game/calculator/poker/bb100
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html`. Run through the matrix:

| State | Expected |
|---|---|
| Logged out, page load | "Sign in with Google" button top-right; Manual + Upload tabs only |
| Logged out, drop 1815-hand sample | Chart renders green=$8.71 orange=$11.23 (unchanged from Phase 1) |
| Click "Sign in with Google" | Google popup → choose account → returns to page |
| Logged in, page state | Avatar pill + "Sign out" replaces button; "My Sessions" tab appears |
| Logged in, click "My Sessions" tab | Placeholder text "Sign in to save..." visible |
| Logged in, dev console: read pokerStorage/{uid} | No permission error; doc doesn't exist (returns null) |
| Logged in, dev console: write pokerStorage/{uid} | Throws permission-denied |
| Click "Sign out" | Returns to logged-out state; tab disappears |

- [ ] **Step 4: Confirm clean git state**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio
git status --short
git log --oneline main..HEAD | head -20
```

Expected: clean working tree; Phase 2 commits visible (7 new commits since Phase 1 closed).

- [ ] **Step 5: Phase 2 done**

When all rows in the manual test matrix pass and git is clean, Phase 2 is complete. Phase 3 (cloud storage Lambda + frontend) is the next plan.

---

## Done criteria for Phase 2

- [x] auth.css + js/auth/{firebase-init.js, auth-ui.js, api-client.js} exist
- [x] index.html loads auth.css + auth-ui.js module
- [x] Sign-in with Google works (popup → account picker → returns signed-in)
- [x] Sign-out works (returns to button state)
- [x] My Sessions tab appears/hides based on auth state
- [x] Firestore rules block client writes to pokerStorage + pokerSessions
- [x] Firestore reads of own pokerStorage doc work (returns null/empty in Phase 2)
- [x] Manual test matrix all green
- [x] Phase 1 unit tests + verify CLI still pass
- [x] Clean git state
