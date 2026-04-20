# Connect 4 — Real-Time Leaderboard Design

**Date:** 2026-04-20
**Status:** Approved for implementation
**Dependencies:** Connect 4 game already live at `https://connect4.hillmanchan.com` (see `2026-04-20-connect4-game-design.md`).

## Goal

Add a real-time "Hall of Fame" to Connect 4 that tracks humans who have beaten Impossible difficulty. Two leaderboards: Human-first and Machine-first, treated symmetrically. Fewest-steps wins. Powered by Firestore with live updates via `onSnapshot`. Zero recurring cost.

## Non-Goals

- Live PvP between two humans (separate future project)
- Spectator mode (watch ongoing games)
- User profiles, avatars, chat, seasonal resets, country ranking
- Non-Impossible difficulty tracking

## The trust model

The Connect 4 game is 100% client-side. No server computes wins. Anti-cheat is achieved by two things:

1. **Client submits the full move sequence** (`moves: [3, 2, 3, 2, 3, ...]`) alongside the claimed result.
2. **The leaderboard page replays every submission locally** using the exact same engine that ran the game. If the replay does not produce a legitimate win against our deterministic AI, the entry is hidden from the leaderboard.

This is self-consistent: to "cheat" you would need to produce a move sequence that genuinely beats our AI → which is the achievement itself.

Firestore is a dumb store here. It enforces schema (shape, types, size limits) but never evaluates whether a game was won. The engine is the referee, at render time, on the client.

## Data Model

### Collection: `connect4Leaderboard/{autoId}`

```
{
  name: string,                       // 3–20 chars, user-supplied
  mode: "human-first" | "ai-first",
  steps: number (int, 7–42),          // total moves played
  moves: number[] (length 7–42, each 0–6),
  difficulty: "impossible",           // fixed constant; other values rejected
  createdAt: timestamp (server),
  uid: string                         // Firebase Anonymous UID
}
```

`steps` is the total number of moves played in the game. The minimum possible win for the first player is 7 moves (7 moves placed, with the 7th forming 4-in-a-row on move 4 of that player). The maximum is 42 (a full board that ends on a win on the last move). Anything outside [7, 42] is rejected.

`moves` is the authoritative record of the game; `steps` must equal `moves.length`. This is enforced in Firestore rules.

### Index

A composite index on `(mode, difficulty, steps, createdAt)` is required for the leaderboard query:

```
query: where('mode','==', <mode>).where('difficulty','==','impossible').orderBy('steps','asc').orderBy('createdAt','asc').limit(100)
```

We fetch 100 so that after replay-filtering we still reliably show a top-10.

Firestore will prompt with a "create index" URL the first time the query runs — follow the URL once, accept, done.

## Firestore Rules

Extend `portfolio/src/game/system-design/firestore.rules` with a new match block.

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

Why:
- `read: true` — public leaderboard
- Tight `create` shape — rejects malformed/oversized data at the edge
- `moves.size() == steps` — the two redundant fields must agree
- `uid == request.auth.uid` — submitter can't impersonate
- `createdAt == request.time` — server-set, client cannot backdate
- `update, delete: false` — immutable

Rate limiting is intentionally **not** enforced in rules for v1. The replay filter on read is the authoritative defense, and a client-side 30-second cooldown after submit discourages rapid-fire spam. If a real abuse pattern appears later, add a counter collection (same shape as `aiUsage`).

## Firebase Project Reuse

The portfolio already uses Firebase project `system-design-c84d3` for System Design 教室. Reuse it. New collection `connect4Leaderboard`. Same web API key. No new project, no new cost.

### Authorized domains

Anonymous auth via `signInAnonymously()` does not require OAuth redirect and works from any domain given a valid API key. Still, add `connect4.hillmanchan.com` and `hillmanchan.com` to Firebase Auth → Authorized domains as a defense-in-depth step.

### API key exposure

The client-side Firebase config (API key, project ID, app ID) is safe to ship in the static HTML — Firebase web API keys are identifiers, not secrets. Security is enforced by Firestore rules and API key referrer restrictions (already set up for system-design). For the standalone HTML, hardcode the config inline — we don't have a build step to inject env vars.

## Auth Flow

```
page load
  ↓
firebase.auth().signInAnonymously()
  ↓  (instant, no UI)
auth.currentUser.uid available
```

Anonymous UID persists across reloads via localStorage (Firebase default). Browsing-data clear resets it. That's fine — the UID's only purpose is provenance tagging; leaderboard names are user-chosen.

## Replay Validation

The engine in `index.html` is already deterministic. Given the same `moves` and the same `mode`, replaying produces the same win/loss result.

```js
function validateSubmission(entry) {
  const p = new Position();
  let turn = entry.mode === 'human-first' ? 'human' : 'ai';
  for (let i = 0; i < entry.moves.length; i++) {
    const col = entry.moves[i];
    if (!Number.isInteger(col) || col < 0 || col >= COLS) return false;
    if (!p.canPlay(col)) return false;

    // On AI's turn, the move must match our engine's output exactly.
    if (turn === 'ai') {
      const expected = findBestMove(p, 14, entry.mode === 'ai-first');
      if (col !== expected) return false;
    }

    p.play(col);

    const justMoved = p.mask ^ p.current;
    const isLast = i === entry.moves.length - 1;
    if (Position.hasFourInARow(justMoved)) {
      return isLast && turn === 'human';  // must end with a human win
    }
    turn = turn === 'human' ? 'ai' : 'human';
  }
  return false;  // never reached 4-in-a-row
}
```

The AI side of each replay calls `findBestMove()` — same function the live game uses. This replay is slightly expensive (~100–500ms per entry at depth 14). Render the list progressively: show entries as each replay finishes; mark un-validated entries as "verifying…" during the pass.

Use `navigator.hardwareConcurrency` or just sequentially `requestIdleCallback` to avoid jank. Optional optimization: cache validated entries by `docId` in `sessionStorage` so re-opening the overlay during the same session skips the replay pass.

## UI Design

### Entry point

Add a `HALL OF FAME` button in the game's action row, between Undo and New Game:

```
[  ↶ Undo  ]  [  🏆 Hall of Fame  ]  [  New Game  ]
```

Also auto-open the submit modal when a Impossible-difficulty human wins.

### Submit modal

Shown after `makeMove` detects a human win AND the active `aiDepth === 14` (Impossible).

```
┌────────────────────────────────────┐
│      🏆  YOU BEAT THE MACHINE       │
│                                    │
│   Immortalise yourself on the      │
│   Hall of Fame                     │
│                                    │
│   Your name: [_______________]     │
│                                    │
│   steps: 29 · mode: Human-first    │
│                                    │
│   [ Skip ]     [ Submit ]          │
└────────────────────────────────────┘
```

- Name field is pre-filled from `localStorage.connect4Name` if present
- Max 20 chars, client-side strip angle brackets / script tags, then rely on Firestore rule for length check
- Submit disabled for 30s after a successful submit (anti-spam)
- Skip = close modal, do not submit; next win still prompts

### Hall of Fame overlay

Full-screen overlay triggered by the button. Two tabs, symmetric:

```
┌─────────────────────────────────────┐
│  HALL  OF  FAME                  ✕ │
│  ─────────────────                 │
│  [ Human-first ]  [ Machine-first ] │
│                                     │
│  #1  Hillman    — 29 steps  Apr 20 │
│  #2  Jordan     — 31 steps  Apr 20 │
│  #3  Anon       — 34 steps  Apr 19 │
│  ...                                │
│                                     │
│  No entries yet.                    │
│  (when a tab is empty)              │
│                                     │
│  🔴 LIVE · 23 players watching     │
└─────────────────────────────────────┘
```

Both tabs are **symmetric** — no special copy for an empty Machine-first list. Empty = "No entries yet."

Entries are sorted by `steps` ascending, then `createdAt` ascending (earlier wins take precedence in tiebreakers). Show top 10 per tab.

### Real-time updates

Use Firestore `onSnapshot` for both queries. When a new entry appears that passes replay validation, it animates into the list with a brief flash. If a user is viewing the Human-first tab and someone wins Machine-first, show a subtle badge on the Machine-first tab label: `Machine-first (new!)`.

The listener is active only while the overlay is open. Close the overlay → unsubscribe. This keeps us well inside the 100-concurrent-listener free-tier limit even if traffic spikes.

## File Plan

### Modify

- `portfolio/public/games/connect4/index.html`
  - Add `<script type="module">` that initializes Firebase from the gstatic CDN
  - Add hardcoded Firebase config (same public values as `system-design`)
  - Call `signInAnonymously()` on page load (swallow errors; game still playable offline)
  - Add submit modal (hidden by default, shown on Impossible human win)
  - Add Hall of Fame button + overlay
  - Add `validateSubmission()` helper
  - Add `onSnapshot()` listeners scoped to overlay lifetime
  - Guard: if Firebase fails to init (network down, blocked, etc), hide leaderboard UI entirely and let the game continue — leaderboard must never block gameplay.

- `portfolio/src/game/system-design/firestore.rules`
  - Append `connect4Leaderboard` match block

### Create

- None. No new files.

### Manual / deploy

- Deploy firestore.rules: `cd portfolio/src/game/system-design && npx firebase deploy --only firestore:rules`
- First leaderboard read will prompt for a Firestore composite index — click the console URL, accept.
- Add authorized domains `connect4.hillmanchan.com` and `hillmanchan.com` in Firebase Console → Authentication → Settings → Authorized domains.

## Cost

| Item | Spark plan allowance | Our expected usage | Cost |
|---|---|---|---|
| Firestore reads | 50 000 / day | ~200/day (100 doc × 2 listeners × a few viewers) | $0 |
| Firestore writes | 20 000 / day | ~20/day (submissions) | $0 |
| Storage | 1 GiB | <1 MiB | $0 |
| Realtime listeners | 100 concurrent | peak ~10 (portfolio traffic) | $0 |
| Anonymous Auth | unlimited | 1 per browser | $0 |

At 1000× growth we'd still be in free tier. **Total recurring cost: $0/month.**

## Error Handling

- Firebase SDK fails to load (CDN outage, ad-blocker, offline): catch and hide leaderboard UI. Game continues.
- `signInAnonymously()` rejects: retry once, then hide leaderboard UI.
- Submission fails (rules reject, network drop): show inline error, keep modal open, let user retry.
- Replay validation throws: treat as invalid, skip entry.
- `onSnapshot` permission error: log and fallback to one-shot `get()` query.

## Acceptance Criteria

1. Beating Impossible (Human-first or Machine-first) pops the submit modal; Skip dismisses without writing anything.
2. A submitted entry appears on the relevant leaderboard tab within 2 seconds, on the submitter's screen AND on a second browser viewing the overlay simultaneously.
3. A manually crafted Firestore document with moves that do NOT produce a win against our AI is not shown on the leaderboard (replay filter succeeds).
4. Loading the game with the network blocked still plays normally; the Hall of Fame button is either hidden or gracefully shows "Offline".
5. Firestore rules reject:
   - writes without auth
   - `difficulty` other than `"impossible"`
   - `moves.size() != steps`
   - `steps` outside [7, 42]
   - `name` outside [3, 20] chars
6. Closing and reopening the overlay re-subscribes; closing unsubscribes (no leaked listeners).

## Out of Scope

- Multiplayer, spectator mode, profiles, chat, elo — all future features that would each need their own spec.
- Hard rate limiting via counter docs (add later only if abuse materializes).
- Account linking (anonymous → Google) — nice-to-have later.
- Translating the UI (Cantonese / Chinese) — leaderboard copy stays English for now, matching the rest of the game.
