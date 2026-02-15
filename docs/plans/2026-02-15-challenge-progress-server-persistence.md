# Plan: Challenge Progress Server-side Persistence

## Background

All challenge data (design text, AI conversations, evaluation results, completion status) currently lives in `localStorage`:
- Users lose progress when switching browsers/devices
- Clearing cache wipes everything
- Paid HK$150 but data doesn't follow their account — bad experience

Users are paying customers. Progress should follow their account.

---

## AWS Cost Analysis

### Per-user Data Size

| Data | Size |
|------|------|
| Challenge statuses (8) | ~0.5KB |
| Design text (per challenge) | ~2-5KB |
| AI chat history (per challenge) | ~5-20KB |
| Evaluation results (per challenge) | ~2KB |
| **Total per user (all 8 challenges)** | **~100-200KB** |

### Recommended: DynamoDB On-Demand

| Item | 500 users/mo | 5000 users/mo |
|------|-------------|---------------|
| Storage | 100MB (within 25GB free tier) | 1GB (within free tier) |
| Writes | 32K → **$0.04** | 320K → **$0.40** |
| Reads | 10K → **$0.003** | 100K → **$0.03** |
| **Monthly** | **~$0.05** | **~$0.43** |

Effectively **$0/month** within free tier.

### Why Not Other Options

- **S3**: Small JSON frequent read/write per-request cost higher than DynamoDB, no query capability
- **RDS/Aurora**: Minimum $15+/month, overkill for this scale

---

## DynamoDB Table Design

```
Table: sd_challenge_progress

Partition Key: userId (String)      ← from JWT payload
Sort Key:      challengeId (String) ← e.g. "url-shortener-challenge"

Attributes:
  status:       String ("in-progress" | "passed")
  designText:   String (user's design)
  chatMessages: String (JSON: [{role, content, ts}])
  evalResult:   String (JSON: {keywordResults, aiComment})
  updatedAt:    Number (Unix timestamp)

# Extra item for overview status map:
# userId=X, challengeId="_overview" → { statuses: { "url-shortener-challenge": "passed", ... } }
```

---

## New API Endpoints (Backend Contract)

> Backend is NOT in this repo. This only defines the contract.

### `GET /challenges/progress`
- Auth: `Bearer {token}`
- Response: `{ "url-shortener-challenge": "passed", "chat-system-challenge": "in-progress" }`
- Used by challenge list view

### `GET /challenges/:challengeId/progress`
- Auth: `Bearer {token}`
- Response: `{ designText, chatMessages, evalResult, status }` or `404`

### `PUT /challenges/:challengeId/progress`
- Auth: `Bearer {token}`
- Body: `{ designText?, chatMessages?, evalResult?, status? }` (partial update)
- Response: `{ ok: true }`

---

## Frontend Changes

### File to Modify

Only one file: `system-design-react/src/pages/Projects.jsx`

### Sync Strategy

```
Logged in (has token):
  On load → call API to fetch data → update state
  On action → update state + debounce 2s → PUT API
  API down → silent failure, sync next time

Not logged in (no token):
  Same as current — use localStorage
  After login → don't merge old data (user confirms)
```

### Specific Changes

#### 1. Add API helper functions (top of file, after constants)

```javascript
const CHALLENGE_API = `${API_BASE}/challenges`;

async function fetchAllChallengeStatus(token) {
  // GET /challenges/progress
  // Returns: { "url-shortener-challenge": "passed", ... }
  const res = await fetch(`${CHALLENGE_API}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('fetch-status-failed');
  return res.json();
}

async function fetchChallengeProgress(token, challengeId) {
  // GET /challenges/:id/progress
  // Returns: { designText, chatMessages, evalResult, status } or throws
  const res = await fetch(`${CHALLENGE_API}/${challengeId}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('fetch-progress-failed');
  return res.json();
}

async function saveChallengeProgressAPI(token, challengeId, data) {
  // PUT /challenges/:id/progress
  // Body: { designText?, chatMessages?, evalResult?, status? }
  await fetch(`${CHALLENGE_API}/${challengeId}/progress`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}
```

#### 2. Add debounce helper (top of file)

```javascript
function useDebouncedCallback(callback, delay) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return (...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  };
}
```

#### 3. Projects component — challenge list status loading

In the `Projects` component, add a `useEffect` that fetches status from API when token exists:

```javascript
// After: const [challengeStatus, setChallengeStatus] = useState(loadChallengeStatus);

useEffect(() => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  fetchAllChallengeStatus(token)
    .then((serverStatus) => setChallengeStatus(serverStatus))
    .catch(() => {}); // silent fallback to localStorage
}, []);
```

#### 4. ChallengeSession — load from API on mount

Replace the existing "Load saved state" `useEffect` (lines 177-186):

```javascript
// Load saved state — prefer API if logged in
useEffect(() => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    fetchChallengeProgress(token, challenge.id)
      .then((data) => {
        if (data) {
          if (data.designText) setDesignText(data.designText);
          if (data.chatMessages) setChatMessages(
            typeof data.chatMessages === 'string'
              ? JSON.parse(data.chatMessages)
              : data.chatMessages
          );
        }
      })
      .catch(() => {
        // Fallback to localStorage
        try {
          const savedDesign = localStorage.getItem(challengeDesignKey(challenge.id));
          if (savedDesign) setDesignText(savedDesign);
        } catch {}
        try {
          const savedChat = JSON.parse(localStorage.getItem(challengeChatKey(challenge.id)) || '[]');
          if (savedChat.length) setChatMessages(savedChat);
        } catch {}
      });
  } else {
    // No token — use localStorage as before
    try {
      const savedDesign = localStorage.getItem(challengeDesignKey(challenge.id));
      if (savedDesign) setDesignText(savedDesign);
    } catch {}
    try {
      const savedChat = JSON.parse(localStorage.getItem(challengeChatKey(challenge.id)) || '[]');
      if (savedChat.length) setChatMessages(savedChat);
    } catch {}
  }
}, [challenge.id]);
```

#### 5. ChallengeSession — debounced save on designText change

Replace the existing "Save design text on change" `useEffect` (lines 189-191):

```javascript
const debouncedSaveDesign = useDebouncedCallback((text) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    saveChallengeProgressAPI(token, challenge.id, { designText: text }).catch(() => {});
  }
}, 2000);

useEffect(() => {
  localStorage.setItem(challengeDesignKey(challenge.id), designText);
  debouncedSaveDesign(designText);
}, [designText, challenge.id]);
```

#### 6. ChallengeSession — save chat messages to API

Replace the existing "Save chat messages on change" `useEffect` (lines 194-198):

```javascript
useEffect(() => {
  if (chatMessages.length > 0) {
    localStorage.setItem(challengeChatKey(challenge.id), JSON.stringify(chatMessages));
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      saveChallengeProgressAPI(token, challenge.id, {
        chatMessages: JSON.stringify(chatMessages),
      }).catch(() => {});
    }
  }
}, [chatMessages, challenge.id]);
```

#### 7. ChallengeSession — save status to API on "Mark as in-progress"

Replace the existing "Mark as in-progress" `useEffect` (lines 201-207):

```javascript
useEffect(() => {
  const status = loadChallengeStatus();
  if (status[challenge.id] !== 'passed') {
    status[challenge.id] = 'in-progress';
    saveChallengeStatus(status);
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      saveChallengeProgressAPI(token, challenge.id, { status: 'in-progress' }).catch(() => {});
    }
  }
}, [challenge.id]);
```

#### 8. handleSubmit — save eval result + status to API

After `saveChallengeStatus(status)` on line 292, add:

```javascript
const token = localStorage.getItem(TOKEN_KEY);
// (token already declared above at line 301 — move it up or reuse)
```

After the final result is computed (both keyword + AI comment), save to API:

```javascript
// After localStorage.setItem(challengeResultKey(...), ...) for the final result:
if (token) {
  saveChallengeProgressAPI(token, challenge.id, {
    status: status[challenge.id],
    evalResult: JSON.stringify(finalResult),
    designText,
    chatMessages: JSON.stringify(chatMessages),
  }).catch(() => {});
}
```

#### 9. handleRetry in Projects — clear API data too

After `localStorage.removeItem(...)` calls in `handleRetry` (lines 500-505):

```javascript
const token = localStorage.getItem(TOKEN_KEY);
if (token) {
  saveChallengeProgressAPI(token, selectedId, {
    status: 'in-progress',
    designText: '',
    chatMessages: '[]',
    evalResult: '',
  }).catch(() => {});
}
```

#### 10. EvaluationResult — no changes needed

Data is already passed in from parent.

---

## Verification Checklist

1. `npx vite build` — 0 errors
2. No token → localStorage works as before (backward compatible)
3. Has token but backend not deployed → API calls fail silently, no impact on UX
4. Has token + backend deployed → API sync works
5. Login on different browser → see previous progress

---

## Summary of Changes

| What | Where | Lines (approx) |
|------|-------|-----------------|
| API helper functions | Top of file | +30 lines |
| `useDebouncedCallback` hook | Top of file | +8 lines |
| List view: fetch status from API | `Projects` component | +5 lines |
| Session: load from API | `ChallengeSession` useEffect | Replace ~10 lines → ~30 lines |
| Session: debounced save design | `ChallengeSession` useEffect | Replace ~3 lines → ~8 lines |
| Session: save chat to API | `ChallengeSession` useEffect | +5 lines |
| Session: save status to API | `ChallengeSession` useEffect | +4 lines |
| Submit: save result to API | `handleSubmit` | +7 lines |
| Retry: clear API data | `handleRetry` in Projects | +5 lines |
| **Total net addition** | | **~70 lines** |
