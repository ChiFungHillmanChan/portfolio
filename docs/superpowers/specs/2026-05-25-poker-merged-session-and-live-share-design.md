# Poker — Merged Cloud Session + Live Share

**Status:** Approved (2026-05-25)
**Repos touched:** `HillmanChan_portfolio` (frontend), `system-architecture` (Lambda)

## Why

Two related problems with the current poker recorder cloud + share flow:

1. **Auto-merge is incomplete.** `auto-merge.js` only merges new uploads with the *latest* prior cloud session — users with multi-session legacy state retain orphans forever, and the "one growing snapshot per user" promise is silently broken.
2. **Shares are frozen snapshots.** Every `create-stats-share` produces an immutable R2 object. When the owner uploads new hands, viewers of the existing share URL never see the update. The user wants paid users to have one canonical, evergreen URL that always reflects their latest data.
3. **No auto-load on login.** Signed-in users currently have to manually click "Open last saved" in the inline-restore panel to see their chart. Round-trip is one click + one Lambda + one R2 GET. For "one user, one session" semantics we should restore on auth.

## Scope

In:
- New `pokerLiveShares/{uid}` Firestore collection + paid-tier-only "live share" feature.
- Auto-load latest cloud session on auth state change (cheap path: `series.json.gz` only).
- Multi-merge fix in `auto-merge.js` (merge ALL prior sessions, not just latest).
- "Consolidate all into one" explicit button in My Sessions list.
- Settings UI for live share (toggle, URL, password, frozen banner).

Out:
- Real-time push (WebSocket) updates to viewers — they refresh manually.
- Live share for free tier — feature is paid-only (Standard/Pro/Ultra).
- Username-based URLs — random base64url IDs only.
- Changes to existing snapshot-share semantics. Snapshots stay immutable.

## Decisions

| Question | Answer |
|---|---|
| Share update model | Live share per user — new canonical URL, alongside existing snapshot shares |
| Live share availability | Paid only (Standard / Pro / Ultra / Superadmin) |
| Auto-load on login | Yes — cheap path: download `series.json.gz`, render chart. No `hands.txt.gz` until explicit "Load replay data" |
| My Sessions list | Keep as archive + add "Consolidate all into one" button |
| Live share URL pattern | `/p/{shareId}` — same as snapshots. Resolved through the existing CloudFront rewrite and `get-stats-share` Lambda action |
| Password | Optional. Same scrypt scheme as snapshot shares |
| Downgrade behavior | Freeze: viewers see last snapshot, new uploads stop pushing, URL stays valid. On re-upgrade, updates resume |
| Multi-merge fix | Merge ALL prior sessions on next save (cap concurrency) |
| Spec for | Frontend (vanilla JS) + Lambda (Node 22) only — no migration script needed beyond a no-op (legacy users with no live share doc keep working) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Owner (logged-in)                       │
│                                                                  │
│  Upload .txt → parse → chart                                     │
│         │                                                        │
│         ▼                                                        │
│  Save to cloud ──→ auto-merge with ALL prior cloud sessions      │
│         │                                                        │
│         ▼                                                        │
│  saveSessionToCloud → cg-poker:commit-upload                     │
│         │                                                        │
│         ▼                                                        │
│  if pokerLiveShares/{uid}.enabled:                               │
│      cg-poker:update-live-share  (overwrite R2)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          Viewer (public)                         │
│                                                                  │
│  GET /p/{shareId}  → CF rewrite → share/index.html?id=…          │
│         │                                                        │
│         ▼                                                        │
│  share.js → cg-poker:get-stats-share({shareId})                  │
│         │                                                        │
│         ▼                                                        │
│  Lambda reads pokerShares/{shareId} (kind: 'live' | 'snapshot')  │
│  → reads R2 payload at meta.r2Key  → returns                     │
│         │                                                        │
│         ▼                                                        │
│  Same render code for both kinds (kind not surfaced to viewer)   │
└─────────────────────────────────────────────────────────────────┘
```

The read path is **identical** for live vs snapshot. Only the write path differs.

## Data model

### New collection: `pokerLiveShares/{uid}`

One doc per user. Stores the user-side pointer + auth config for their live share.

```typescript
{
  shareId: string,             // 16-char base64url, stable per user
  enabled: boolean,            // owner-facing toggle
  createdAt: Timestamp,
  lastUpdatedAt: Timestamp,    // when R2 payload last overwritten
  snapshotIndex: number,       // bumps on every R2 overwrite (cache-bust hint)
  passwordProtected: boolean,
  passwordHash: string | null, // scrypt; same scheme as snapshot shares
  passwordSalt: string | null,
  frozenAt: Timestamp | null,  // set when paid→free downgrade blocks an update
  r2Key: string,               // shared-stats/live/{shareId}.json — stable
  meta: {
    handsTotal: number,        // mirrored from latest snapshot, for owner UI
    lastUpdateSource: string,  // e.g. "auto-on-save" | "manual-refresh"
  },
}
```

**Read auth:** Admin SDK only. Frontend reads via `get-my-live-share` Lambda action, never directly.

### Existing `pokerShares/{shareId}` — extended

Add ONE field:

```typescript
{
  // existing fields unchanged:
  shareId, ownerUid, ownerEmail, type, title, createdAt, expiresAt, expireDays,
  revoked, views, passwordProtected, passwordHash, passwordSalt, r2Key, meta, …

  // NEW:
  kind: 'live' | 'snapshot',   // default 'snapshot' (omitted = snapshot for back-compat)
}
```

Live shares get a mirror doc in `pokerShares/{shareId}` so the existing `get-stats-share` endpoint resolves them with no code change. The mirror doc:
- `kind: 'live'`
- `expiresAt: null` (no expiry for live; freezing is handled separately)
- `revoked: false` while enabled; `revoked: true` when disabled
- `r2Key: shared-stats/live/{shareId}.json` (note the `live/` prefix)
- `passwordHash/Salt` mirrored from `pokerLiveShares` on toggle

### R2 layout

- `shared-stats/{shareId}.json` — existing snapshot shares (unchanged)
- `shared-stats/live/{shareId}.json` — NEW prefix for live shares

The `live/` prefix lets future R2 lifecycle rules target one or the other (e.g. shorter cache TTL for live).

### `pokerStorage/{uid}` — unchanged

The monthly counters (`shareGraphs.count`, `shareHands.count`) still apply to snapshot shares. **Live shares do NOT increment them** — they are an evergreen feature, not a monthly slot.

## Lambda actions (`cg-poker`)

All require Bearer auth + paid plan unless noted.

### `enable-live-share`

**Body:** `{ password?: string, summary, seriesBefore, seriesAfter, meta? }`

**Effect:**
1. Tier check → 403 `live_share_requires_paid` if free.
2. Idempotent: if `pokerLiveShares/{uid}` exists AND `enabled: false`, re-enable + overwrite R2 with new payload. If `enabled: true`, treat as a regular `update-live-share` call.
3. Generate `shareId = makeShareId()` (reuse existing helper).
4. Sanitize + write R2 payload at `shared-stats/live/{shareId}.json`.
5. In a Firestore transaction:
   - Write `pokerLiveShares/{uid}`.
   - Write `pokerShares/{shareId}` mirror (kind:'live').
6. Return `{ ok: true, shareId, url, passwordProtected }`.

### `update-live-share`

**Body:** `{ summary, seriesBefore, seriesAfter, meta? }`

**Effect:**
1. Read `pokerLiveShares/{uid}`. 404 if missing or disabled.
2. Tier check. If currently free AND was paid → set `frozenAt: now`, return 403 `live_share_frozen` (idempotent: `frozenAt` only set once).
3. Tier ok → sanitize + overwrite R2 at the stable `r2Key`. Bump `snapshotIndex`, set `lastUpdatedAt`, clear `frozenAt` (covers re-upgrade case).
4. Return `{ ok: true, snapshotIndex, lastUpdatedAt }`.

Failure modes:
- R2 write fails → return 500 `share_storage_failed`, leave Firestore unchanged (R2 + Firestore stay in sync).
- Firestore update fails after R2 write → log + return 500. Next save retries; R2 will be overwritten again.

### `disable-live-share`

**Body:** `{}`

**Effect:**
1. Read `pokerLiveShares/{uid}` → 404 if missing.
2. Delete R2 object at `r2Key`.
3. Transactionally: `pokerLiveShares/{uid}.enabled = false`, `pokerShares/{shareId}.revoked = true`.
4. The shareId and pointer doc are **preserved** so re-enable later restores the same URL.

### `get-my-live-share`

**Body:** `{}`

**Effect:**
- Read `pokerLiveShares/{uid}` → return owner-facing fields:
  `{ enabled, shareId, url, lastUpdatedAt, frozenAt, passwordProtected, snapshotIndex, views }`.
- Views are read live from `pokerShares/{shareId}.views` (the existing field maintained by `get-stats-share`).
- Returns `{ enabled: false, exists: false }` if no doc — the settings UI shows "Enable live share" CTA.

### `update-live-share-password`

**Body:** `{ password: string | null }`

**Effect:**
1. Tier check.
2. Hash password (or clear both fields if `null`).
3. Update both `pokerLiveShares/{uid}` and `pokerShares/{shareId}` so `get-stats-share` sees the password gate immediately.

### `get-stats-share` — unchanged

The existing implementation already does:
```js
const snap = await sharesCollection().doc(shareId).get();
…
const obj = await s3.send(new GetObjectCommand({ Bucket: SHARES_BUCKET, Key: meta.r2Key }));
```

This works identically for live shares because the mirror doc has the same shape. **No change required**, but we will add `kind` to the returned payload so the viewer can optionally show a "Live — updated 5 mins ago" badge in a future PR (not in this scope).

## Frontend changes

### A. Auto-load on login — `bootstrap.js`

In the `onAuthStateChanged` callback, after `refreshQuotaMeter()` resolves:

```js
if (user) {
  // … existing setup …
  await maybeAutoLoadLatestSession();  // NEW
}

async function maybeAutoLoadLatestSession() {
  if (getCurrentSession()) return;  // user already has hands loaded
  const list = await apiCall("list-sessions", {}).catch(() => null);
  if (!list?.ok || !list.sessions?.length) return;
  const latest = list.sessions
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  if (!latest.hasSeries) return;  // no cached series → don't pay the slow path
  const { openCloudSession } = await import("./load-session.js");
  const controller = new AbortController();
  window.addEventListener("pagehide", () => controller.abort(), { once: true });
  try {
    await openCloudSession(latest, { signal: controller.signal });
  } catch (err) {
    if (err?.name !== "AbortError") {
      console.warn("[poker auto-load] failed:", err.message);
    }
  }
}
```

Guard rails:
- Only fires when in-memory `getCurrentSession()` is null (won't override a mid-upload).
- Only when `hasSeries: true` — skips legacy sessions that would need a multi-MB recompute.
- AbortController tied to `pagehide` mirrors the inline-restore pattern.

### B. Save → push to live share — `bootstrap.js`

In the save handler, after `saveSessionToCloud` resolves successfully and the merge/UI sync is done:

```js
// Fire-and-forget live-share update. Failure is non-fatal.
try {
  const live = await apiCall("get-my-live-share", {}).catch(() => null);
  if (live?.enabled) {
    apiCall("update-live-share", {
      summary: sanitiseSummaryForShare(dataToSave.summary),
      seriesBefore: downsampleForShare(dataToSave.seriesBefore),
      seriesAfter: downsampleForShare(dataToSave.seriesAfter),
      meta: { stakes: …, firstHandAt: …, lastHandAt: … },
    }).catch((err) => {
      if (String(err.message).includes("live_share_frozen")) {
        setStatus("Live share frozen — upgrade to resume updates.", "warn");
      } else {
        console.warn("[poker live-share] update failed:", err.message);
      }
    });
  }
} catch (_) { /* non-fatal */ }
```

The payload reuses `buildSharePayload` helpers from `share-stats.js` — refactor those out so both `createStatsShare` and the new `update-live-share` call use the same sanitiser.

### C. Settings UI — new "Live share" card

Location: Settings drawer (existing). Card shown only for `tier !== 'free'`. For free users, show an upsell card with "Live share is a Standard/Pro feature" + link to upgrade.

States:
- **Disabled / never enabled:** "Enable live share" button.
- **Enabled, active:**
  - URL: `https://casino-game.hillmanchan.com/p/{shareId}` + copy button.
  - "Last updated: 5m ago · 47 views".
  - Password section: "Add password" / "Change password" / "Remove password".
  - "Disable live share" button (red, confirms before disabling).
- **Enabled but frozen** (paid→free downgrade):
  - Banner: "Your live share is frozen — viewers see your last snapshot. Upgrade to resume updates."
  - URL still shown, but no "Last updated" line.

### D. "Consolidate all into one" — `list.js`

In `renderSessions`, if `listResp.sessions.length >= 2`:
- Render a button above the list: "Combine all N sessions into one".
- On click:
  - Confirm dialog explaining the operation.
  - Trigger a new helper `consolidateAllSessions()` in `auto-merge.js` (see §E).
  - Progress UI mirrors the existing `migrateAllStaleSessions` banner pattern.
- Hide when only 1 session.

### E. Multi-merge fix — `auto-merge.js`

Current bug at line 94–96: only merges with `latest` (first session sorted desc). Change:

```js
export async function mergeWithLatestIfNeeded(session, opts = {}) {
  // … guards unchanged …
  const list = await apiCall("list-sessions", {});
  if (!list?.ok || !list.sessions?.length) return null;

  // CHANGED: merge with EVERY prior cloud session.
  const priorSessions = list.sessions
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));  // oldest first

  // Download hands.txt.gz for each (bounded concurrency to avoid R2 throttling)
  const downloads = await downloadAllHandsTexts(priorSessions, { signal, onProgress });

  // … parse + dedup all of them + current session's local files …
}

async function consolidateAllSessions(opts) {
  // Same flow but no current local session — just merge cloud sessions together.
  // Used by the "Consolidate" button when there's no in-memory upload to combine.
}
```

After the combined save commits, `bootstrap.js` deletes the previous-source session id (existing behavior). Extend that to delete **all** the source session ids — `mergeWithLatestIfNeeded` returns `mergedFromSessionIds: string[]` (array, not single).

Concurrency cap: download up to 4 sessions in parallel (R2 free-tier is generous, but avoid unbounded `Promise.all`).

Abort behavior: any `signal.aborted` aborts all in-flight downloads, parse loops yield as today.

## File-by-file change list

### Frontend (`portfolio/src/game/casino-game/calculator/poker/bb100/js/cloud/`)

| File | Change |
|---|---|
| `auto-merge.js` | Multi-merge: download all prior, dedup all hands. Return `mergedFromSessionIds: string[]`. Add `consolidateAllSessions()` export. |
| `bootstrap.js` | Add `maybeAutoLoadLatestSession()`. Update save handler to delete ALL source session ids. Fire `update-live-share` after save. |
| `list.js` | Add "Consolidate all into one" button when sessions.length >= 2. |
| `share-stats.js` | Extract `sanitiseSummaryForShare()` + `downsampleForShare()` into reusable exports (already mostly there). Add API wrappers for the 5 new actions. |
| `live-share.js` (NEW) | Settings card render + state management for the live-share UI. |
| `bootstrap.js` (UI mount) | Mount live-share card in settings drawer when paid tier. |

### Frontend (`portfolio/src/game/casino-game/calculator/poker/bb100/css/`)

| File | Change |
|---|---|
| `cloud.css` (or new `live-share.css`) | Styles for the live-share card, frozen banner, password modal. |

### Frontend mirror (`portfolio/public/games/casino-game/poker/bb100/`)

All changes in `src/` must be mirrored to `public/` for the portfolio build. Same files, copied 1:1.

### Backend (`/Users/hillmanchan/Desktop/system-architecture/lambda/poker/`)

| File | Change |
|---|---|
| `index.mjs` | Add 5 new actions: `enable-live-share`, `update-live-share`, `disable-live-share`, `get-my-live-share`, `update-live-share-password`. Route them in the action switch. Read live shares' R2 from the `live/` prefix. |
| `share-stats.mjs` | Add `makeLiveR2Key(shareId)`, optional helpers if needed. Existing helpers reused as-is. |
| `live-share.mjs` (NEW) | Encapsulates the 5 live-share action handlers. Keeps `index.mjs` from bloating further. |

## Edge cases

| Case | Behavior |
|---|---|
| Free user tries `enable-live-share` | 403 `live_share_requires_paid`. Frontend hides the card; this is defense-in-depth. |
| Paid user enables, downgrades, uploads | `update-live-share` returns 403 `live_share_frozen`, sets `frozenAt`. Viewers still see last snapshot. |
| Frozen user re-upgrades | Next save's `update-live-share` succeeds, clears `frozenAt`, overwrites R2. No explicit "unfreeze" call. |
| User disables → re-enables | Same shareId, same URL. R2 object recreated. Viewers' bookmarked URL keeps working. |
| User has 0 cloud sessions on login | `maybeAutoLoadLatestSession()` no-ops. Upload tab visible as today. |
| User has multi-session legacy state | Auto-load picks the latest. First save afterwards triggers multi-merge → all collapse into one. |
| Live share update races with concurrent reads | R2 GET is atomic. Old or new payload, never partial. |
| Two browser tabs save at once | Both call `update-live-share`. Last write wins on R2; `snapshotIndex` bumped in both transactions (Firestore atomic). |
| User changes password while a viewer is mid-load | Password is checked at `get-stats-share` request time, not at R2 fetch time. Worst case: viewer reloads, hits the new password gate. No data leak. |
| `update-live-share` succeeds R2 but fails Firestore | Logged. Next save retries the whole thing. Viewers see correct (new) data anyway because R2 is the source of truth for payload. |

## Failure modes

| Scenario | Mitigation |
|---|---|
| Multi-merge fails mid-download | Abort, fall back to single-session merge (existing behavior). Don't lose user's local upload. |
| Multi-merge succeeds but delete fails for some old sessions | New combined session is safely saved. Stale sessions remain in the list — user can manually delete or run Consolidate again. |
| Auto-load on login fails | Logged + non-fatal. User can manually open from inline-restore panel. |
| Live share enable racing with snapshot share create | Both write to `pokerShares` with different shareIds. No conflict. |

## Testing

Reuse the existing `bb100/tests/` fixture set.

### Unit tests
- `share-stats.mjs` extensions — already covered for snapshot. Add cases for the live R2 key shape.
- `live-share.mjs` (new) — enable / update / disable / password / freeze transitions. Mock Firestore + S3.

### Integration tests
- New `bb100/tests/live-share.spec.js`:
  - Enable live share, simulate save, verify R2 was overwritten and Firestore reflects the bump.
  - Disable, verify viewer gets 410.
  - Re-enable, verify same URL works again.
  - Freeze (force tier change in mock), verify 403.
- New `bb100/tests/multi-merge.spec.js`:
  - 3 prior cloud sessions + 1 local upload → merged into 1.
  - Dedup confirmed by hand id.
  - All 3 priors deleted on success.

### Manual smoke
1. Paid user logs in → chart auto-renders from latest cloud session.
2. Uploads new files → Save → reloads viewer URL → sees updated chart.
3. Logs into a free account → "Live share" card hidden, "Open last saved" still works.
4. Toggles password on → viewer prompted.

## Migration / backward compatibility

- **Existing `pokerShares` rows without `kind`** are treated as `kind: 'snapshot'` (the action layer already returns snapshot semantics).
- **Users with no `pokerLiveShares` doc** see the "Enable" CTA; no implicit creation.
- **Users with multi-session backlog** auto-collapse on next save (multi-merge). No data lost.
- **No DB migration script required.** The new collection is created lazily; the new field on `pokerShares` is read-with-default.

## Rollout

1. Deploy `cg-poker` Lambda with new actions (backward compatible — old endpoints unchanged).
2. Deploy frontend (standalone + portfolio builds). The UI gates the new feature behind `tier !== 'free'`, so free users see no change.
3. Manual smoke test with a paid account (Standard).
4. Monitor CloudWatch for `update-live-share` 5xx — if > 1% error rate, disable the auto-fire from save handler via a feature flag (`window.__ENABLE_LIVE_SHARE_AUTO_UPDATE`).

## Non-goals

- Real-time push to viewers (poll-based reload only).
- Custom domain mapping (`hillmanchan.com/u/<handle>`) — random shareIds only.
- Analytics dashboard for live share views — reuse existing `views` counter.
- Live share for the "hands" share type — graphs only in this iteration.
