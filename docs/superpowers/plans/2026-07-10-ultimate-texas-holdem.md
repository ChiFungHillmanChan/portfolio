# Ultimate Texas Hold'em Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Online multiplayer Ultimate Texas Hold'em (up to 6 players vs server dealer, private room codes) added to the casino-game suite, $0 infra cost.

**Architecture:** Server-authoritative game engine in a new `cg-uth` Lambda (system-architecture repo); clients read table state via Firestore `onSnapshot` and write only through `POST /uth/{action}`. Pure-logic modules (`engine.mjs`, `logic.mjs`) are Firestore-free and fully unit-tested; `index.mjs` is a thin auth + transaction wrapper. Frontend is vanilla JS matching the existing casino-game patterns.

**Tech Stack:** Vanilla JS (ES modules), Firebase Auth + Firestore (client listeners), AWS Lambda nodejs22.x + firebase-admin, `node --test` for tests.

**Spec:** `docs/superpowers/specs/2026-07-10-ultimate-texas-holdem-design.md` (pay tables, schema, rules — normative).

## Global Constraints

- Two repos: frontend + rules in `/Users/hillmanchan/Desktop/HillmanChan_portfolio` (branch `feat/ultimate-texas-holdem`, commit freely); Lambda in `/Users/hillmanchan/Desktop/system-architecture/lambda/uth/` (**create files but NEVER git add/commit there** — repo has unrelated uncommitted work).
- Frontend source of truth: `portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/`; must be synced to `portfolio/public/games/casino-game/ultimate-texas-holdem/` at the end.
- Card encoding: int 0–51. `rank = c % 13` (0='2' … 8='T', 9='J', 10='Q', 11='K', 12='A'), `suit = Math.floor(c/13)` (0=♠, 1=♥, 2=♦, 3=♣; suits 1,2 render red — matches existing games).
- All chip payouts `Math.floor`ed. Buy-in 10000, ante limits 25–1000, chips [25,100,500,1000].
- Timers: 30 s betting/decision phases, 10 s showdown; server field `actionDeadline` (ms epoch), clients call `tick` after expiry.
- Client never computes money; client engine copy is display-only.
- English UI copy; shared CSS via `../css/variables.css` etc.; no images (CSS/text cards).
- Lambda env: `FIREBASE_SERVICE_ACCOUNT` (base64), `ALLOWED_ORIGINS` (same as cg-poker).

## File Structure

```
system-architecture/lambda/uth/            (NEW, untracked — do not commit)
├── package.json          {"type":"module", deps: firebase-admin}
├── engine.mjs            cards, evaluate7, pay tables, settleSeat   (pure, env-agnostic)
├── logic.mjs             state machine: createTable/join/leave/placeBets/playAction/tick/rebuy/sitOut applied to plain objects (pure; shuffle via injected rng)
├── index.mjs             HTTP handler: CORS, Firebase auth, Firestore transactions → logic
├── engine.test.mjs       node --test
└── logic.test.mjs        node --test

portfolio/src/game/casino-game/calculator/ultimate-texas-holdem/
├── index.html            lobby (rules, create/join, sign-in gate)
├── table.html            game table
├── css/uth.css           lobby + table + cards + bets + actions (single file, ~existing games' scale)
└── js/
    ├── core/engine.js         byte-identical copy of engine.mjs (display only)
    ├── net/firestore-init.js  getFirestore(app) via CDN ESM — only loaded by UTH pages
    ├── net/uth-api.js         apiCall → POST /uth/{action}
    ├── state/table-store.js   onSnapshot subscriptions → callbacks
    ├── ui/lobby.js            create/join flow
    └── ui/table-main.js       render + actions + countdown (may import small ui helpers)

portfolio (modify)
├── src/game/casino-game/calculator/index.html         lobby card + nav item
├── …/calculator/{roulette,blackjack,baccarat,poker}/index.html   nav item each
├── src/game/system-design/firestore.rules              uthTables rules
└── public/games/casino-game/**                          sync mirror
```

---

### Task 1: Engine — cards & 7-card evaluator (TDD)

**Files:** Create `lambda/uth/package.json`, `lambda/uth/engine.mjs`, `lambda/uth/engine.test.mjs`

**Produces (exact interfaces):**
```js
export const RANKS = '23456789TJQKA';            // index = rank value
export const SUITS = ['♠','♥','♦','♣'];
export function cardRank(c)  // c%13
export function cardSuit(c)  // Math.floor(c/13)
export function cardLabel(c) // e.g. 'A♠'
export const CAT = { HIGH:0, PAIR:1, TWO_PAIR:2, TRIPS:3, STRAIGHT:4, FLUSH:5,
                     FULL_HOUSE:6, QUADS:7, STRAIGHT_FLUSH:8, ROYAL:9 };
export function evaluate7(cards /*int[7]*/)      // → { cat, value, name }
// value: single comparable integer  cat*13^5 + tie-break kickers base-13 (higher wins)
// name:  'Two Pair', 'Full House', …
export function evaluate5(cards /*int[5]*/)      // helper used by evaluate7
```

- [ ] **Step 1:** Write `engine.test.mjs` covering: every category incl. royal vs plain straight-flush, wheel straight (A2345, also wheel straight flush), 7-card selection picks best 5, kicker comparisons (pair vs pair same rank → kickers decide; two-pair tie-break; flush kickers), trips-vs-straight ordering, quads kicker. Use explicit card constructors: `const C = (r,s)=> s*13 + RANKS.indexOf(r);`
- [ ] **Step 2:** `node --test engine.test.mjs` → all FAIL (module missing).
- [ ] **Step 3:** Implement: evaluate5 (count ranks, detect flush/straight incl. wheel, build value), evaluate7 = max over 21 combos (C(7,5)=21, fine perf-wise).
- [ ] **Step 4:** `node --test` → PASS.
- [ ] **Step 5:** No commit (untracked repo) — note completion.

### Task 2: Engine — pay tables & settlement (TDD)

**Files:** Modify `lambda/uth/engine.mjs`, `engine.test.mjs`

**Produces:**
```js
export const BLIND_PAYS  = { [CAT.ROYAL]:500, [CAT.STRAIGHT_FLUSH]:50, [CAT.QUADS]:10,
                             [CAT.FULL_HOUSE]:3, [CAT.FLUSH]:1.5, [CAT.STRAIGHT]:1 };
export const TRIPS_PAYS  = { [CAT.ROYAL]:50, [CAT.STRAIGHT_FLUSH]:40, [CAT.QUADS]:30,
                             [CAT.FULL_HOUSE]:9, [CAT.FLUSH]:7, [CAT.STRAIGHT]:4, [CAT.TRIPS]:3 };
export const BBB_PAYS    = { [CAT.STRAIGHT_FLUSH]:7500, [CAT.QUADS]:500, [CAT.FULL_HOUSE]:50,
                             [CAT.FLUSH]:30, [CAT.STRAIGHT]:20, [CAT.TRIPS]:9, [CAT.ROYAL]:7500 };  // royal pays the straight-flush row
export function holeCardBonusMult(playerHole, dealerHole) // → 1000|30|25|20|15|10|5|3|-1
export function settleSeat(seat, playerEval, dealerEval, playerHole, dealerHole)
// seat: {bets:{ante,blind,trips,holeCard,badBeat}, playBet, folded}
// → {ante, blind, play, trips, holeCard, badBeat, net}   (deltas: + win, - loss, 0 push)
```

Settlement semantics (from spec §2): dealer qualifies with PAIR+; no-qualify → ante push; blind pays table only when player wins (else push if win-but-small, -blind if lose, 0 if tie); fold → lose ante+blind+trips, badBeat lost, holeCard still resolves; badBeat pays only when player loses showdown with trips+ (royal treated as straight-flush row).

- [ ] **Step 1:** Tests: settlement matrix (qualify×{win,lose,tie}×{raised 4x preflop, 1x river, fold}), blind 3:2 flooring (ante 25 flush win → blind +37), each side-bet row incl. both-aces 1000:1 (needs dealerHole), HCB resolves on fold, BBB requires loss AND trips+ (win with quads → -badBeat), trips forfeited on fold.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** PASS.

### Task 3: Logic — pure state machine (TDD)

**Files:** Create `lambda/uth/logic.mjs`, `logic.test.mjs`

**Produces (all pure — take/return plain objects; time & rng injected):**
```js
export function newTable({code, host:{uid,name,photoURL}, now})          // → {table, dealerDoc:null}
export function joinTable(table, {uid,name,photoURL}, now)               // → {table}  (throws {code:'table-full'|'already-seated'|'closed'})
export function leaveTable(table, uid, now)                              // → {table|null}  null = delete table
export function placeBets(table, uid, {ante,trips,holeCard,badBeat}, now, rng)
//   validates limits/stack; blind=ante; marks ready; if ALL active seats ready
//   → deals: returns {table, dealerDoc:{deck,dealerHole}, privateWrites:{[uid]:[c,c]}, dealt:true}
export function playAction(table, dealerDoc, uid, move /*'check'|'4x'|'3x'|'2x'|'1x'|'fold'*/, now)
//   → {table, dealerDoc}  advances phase when all acted; showdown runs settle + writes seat.result, seat.holeCards, table.dealer
export function tick(table, dealerDoc, now)                              // → {table, dealerDoc, changed:bool}  auto-actions per spec; showdown→next betting round reset
export function rebuy(table, uid) / sitOut(table, uid, flag)
export const PHASE = {WAITING:'waiting', BETTING:'betting', PREFLOP:'preflop', FLOP:'flop', RIVER:'river', SHOWDOWN:'showdown'};
```
Table shape exactly per spec §3 schema. Deadlines: betting/decisions `now+30000`, showdown `now+10000`. Auto-action: betting→sit-out (bets refunded — no bets taken yet since stack deducts at deal; deduct stakes at deal time), preflop/flop→check, river→fold; `timeoutsInARow>=2` → sitting out. Showdown tick resets: community=[], dealer nulls, seats' bets/ready/playBet/folded reset, phase=BETTING (or WAITING if <1 active), roundNo+1, broke players (stack<minAnte) auto sitting-out.

Stack accounting: stakes (ante+blind+sides) deducted from stack when the deal fires; play bets deducted when placed; settlement adds back stake+win for wins, stake for pushes.

- [ ] **Step 1:** Tests with seeded rng (inject `rng` = mulberry32) and fixed `now`: full 3-player happy path to showdown; all-check-to-river then 1x/fold; timeout auto-check via tick; two timeouts → sit-out; join/leave mid-round (leaver mid-hand forfeits stakes — folded); rebuy only when broke & between rounds; deal only fires when ALL non-sitting-out seats ready; insufficient stack for 4x → error; phase-illegal moves → error; single-player table works.
- [ ] **Step 2:** FAIL → **Step 3:** implement (uses engine.mjs; crypto shuffle default, injectable) → **Step 4:** PASS.

### Task 4: Lambda handler — `index.mjs`

**Files:** Create `lambda/uth/index.mjs` (pattern-match cg-poker's CORS/auth: `ALLOWED_ORIGINS` env, `verifyIdToken`, action = last path segment)

**Consumes:** logic.mjs API above. **Produces:** HTTP contract used by `uth-api.js`:
- `POST /uth/{action}` Bearer ID-token; JSON body; errors `{error: '<code>'}` 4xx/5xx; success returns `{ok:true, code?}`.
- Firestore mapping: table doc `uthTables/{code}`; `runTransaction` reads table (+`private/_dealer` when needed), calls logic fn, writes results; `privateWrites` → `uthTables/{code}/private/{uid}`; delete table → delete private subcollection docs (seats' + _dealer).
- `create-table`: 4-char code from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` via `crypto.randomInt`, retry on collision ×5; lazy GC (query `lastActivityAt < now-24h` limit 5, delete).
- Steps: - [ ] implement; - [ ] smoke-test locally with `node --input-type=module -e` harness stubbing admin? NO — instead: - [ ] `node --test` still green; syntax check `node --check index.mjs`.

### Task 5: Frontend net layer

**Files:** Create `js/net/firestore-init.js`, `js/net/uth-api.js`, `js/state/table-store.js` under `calculator/ultimate-texas-holdem/`

```js
// firestore-init.js
export { db } // getFirestore(app) from gstatic firebase-firestore.js 10.13.2, app from ../../js/auth/firebase-init.js
// uth-api.js
export async function uthCall(action, payload) // clone of apiCall but `/uth/${action}`, maps {error} JSON to Error(code)
// table-store.js
export function watchTable(code, {onTable, onMyCards, onError}) // returns unsubscribe(); subscribes table doc + private/{uid}
```
- [ ] Implement; `node --check` each file (ESM syntax only — browser-run).

### Task 6: Lobby page (`index.html` + `ui/lobby.js` + css shell)

Landing card layout like existing games: header, sign-in gate (reuse settings-modal auth), "CREATE TABLE" button, join input (4-char code, auto-uppercase), collapsible "How to play" rules section (spec §2 summarized), then redirect `table.html?code=XXXX`. Include hamburger nav copy (5 games with UTH active) + shared css/js includes mirroring `blackjack/index.html`.
- [ ] Build page; - [ ] commit portfolio repo.

### Task 7: Table page — layout & rendering

**Files:** `table.html`, `css/uth.css`, `js/ui/table-main.js`, `js/core/engine.js` (copy of engine.mjs with sync-warning header)

Layout (CSS grid/absolute, mobile-first): dealer zone top (2 card slots + qualify/rank label), 5 community slots centre on felt (radial-gradient green + gold border), 6 seat pods in arc (name, stack, bet circles mini, acted ✓ / countdown ring on actor, folded/sit-out dimming), own control dock bottom: bet circles (ANTE·BLIND·TRIPS·HCB·BBB) + chip rack + READY, or action buttons (CHECK/BET 4x/BET 3x → CHECK/BET 2x → BET 1x/FOLD), countdown ring (SVG stroke-dashoffset, driven by `actionDeadline`).
Render loop: `onTable` snapshot → pure `render(state, myUid)`; cards as existing games (`<div class="card red">A♥</div>`, face-down = back pattern div); "You have: Two Pair" hint via client engine copy on own hole+community.
Tick: `setInterval` 500 ms → when `now > actionDeadline + 400` → `uthCall('tick',{code})` (debounced, ignore errors).
Showdown: reveal dealer + all hole cards from table doc, per-seat result chips (+green/−red, `formatCurrency` style of existing games), banner with net.
- [ ] Build; - [ ] commit.

### Task 8: Wire into suite + rules

- [ ] Lobby `calculator/index.html`: game-card (icon: two cards + crown-ish SVG in existing stroke style; tags "6-Player Online", "Live Multiplayer", "Side Bets") + nav dropdown item.
- [ ] Nav item in `roulette/blackjack/baccarat/poker` index.html (before Support divider).
- [ ] `firestore.rules`: append uthTables block per spec §3.
- [ ] Commit.

### Task 9: Sync to public/ + verify

- [ ] `rsync -a --delete calculator/ultimate-texas-holdem/ public/games/casino-game/ultimate-texas-holdem/`; copy the 5 modified index.html files.
- [ ] Diff check `diff -r` between the two trees for uth + index pages.
- [ ] Commit.

### Task 10: Deploy backend (AWS + Firebase)

- [ ] `cd lambda/uth && npm install --omit=dev && zip -r /tmp/cg-uth.zip index.mjs engine.mjs logic.mjs package.json node_modules/`
- [ ] `aws lambda create-function --function-name cg-uth --runtime nodejs22.x --role arn:aws:iam::575108933055:role/sa-lambda-role --handler index.handler --timeout 15 --memory-size 256 --zip-file fileb:///tmp/cg-uth.zip --region eu-west-2` + env vars (copy `FIREBASE_SERVICE_ACCOUNT`/`ALLOWED_ORIGINS` from cg-poker config).
- [ ] API GW: create integration + route `POST /uth/{action}` on API `zniganhfcg`.
- [ ] Deploy Firestore rules: `cd portfolio/src/game/system-design && npx firebase deploy --only firestore:rules`.
- [ ] Smoke: `curl -X POST https://api.system-design.hillmanchan.com/uth/create-table` → 401 (no token) proves routing.

### Task 11: End-to-end verification

- [ ] Browser: sign in, create table, verify snapshot renders, play a full solo round vs dealer (bet→deal→decisions→showdown→next round), timeout path, fold path, rebuy when broke.
- [ ] Check console clean; check Firestore docs shape.
- [ ] Fix anything found (root-cause per BrainSpark protocol), re-run.

### Task 12: PR

- [ ] Push branch, `gh pr create` (portfolio repo), summary + test evidence. Do NOT touch system-architecture git.
