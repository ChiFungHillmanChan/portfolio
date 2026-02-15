# System Design 教室 — 1,000 Users/Day Scale Plan

> Created: 2026-02-15
> Status: Planning
> Target: Support 1,000 daily active users while keeping costs under $300/month

## Current Architecture

```
Browser (Vite SPA, HashRouter)
  ├── Firebase Auth (Google Sign-In)
  ├── Firestore (premium status — 1 read per login)
  ├── api.system-design.hillmanchan.com (backend)
  │     ├── POST /ai/chat  — search, viber, coaching, projects judge
  │     └── POST /auth/login — access code redemption
  └── Stripe (payment link, webhook → backend → Firestore Admin SDK)
```

## Current Cost Baseline (10 users/day)

| Service | Cost |
|---------|------|
| Firebase Auth | $0 |
| Firestore | $0 |
| Hosting | $0 |
| AI API | ~$6/month |
| **Total** | **~$6/month** |

## Projected Cost at 1,000 Users/Day (No Changes)

| Service | Daily Usage | Monthly Cost |
|---------|------------|--------------|
| Firebase Auth | 1,000 logins | $0 |
| Firestore | ~1,000 reads, ~100 writes | $0 |
| Hosting (Firebase) | ~150GB/month | ~$21 |
| Backend (Lambda/Workers) | ~7,000 calls | $0 |
| AI API (GPT-4) | ~7,000 calls × $0.003 | ~$630 |
| Stripe fees | ~50 txns | ~$150 |
| **Total** | | **~$800/month** |

AI API is 78% of total cost. All optimizations below target this.

---

## Optimization 1: AI Response Caching

**Problem:** Identical search queries hit the AI API every time.
**Impact:** Reduce 50-70% of AI API calls.

### Implementation

- Add a cache layer in the backend (Redis or in-memory LRU)
- Cache key: `mode + normalized_query + topicContext`
- TTL: 24 hours for search, 1 hour for viber/coaching
- Search queries are highly repetitive (users search same topics)

### Cache Strategy

| Mode | Cacheable? | TTL | Expected Hit Rate |
|------|-----------|-----|-------------------|
| search | Yes | 24h | 60-70% |
| viber (prompt gen) | Yes | 24h | 40-50% |
| suggest | No | — | 0% |
| coaching | No (conversational) | — | 0% |
| projects judge | No (unique input) | — | 0% |

### Cost Savings

- Current: 7,000 AI calls/day
- After cache: ~3,500 AI calls/day
- Savings: ~$315/month (50% reduction)

---

## Optimization 2: Cloudflare Pages Hosting

**Problem:** Firebase Hosting charges $0.15/GB after 10GB free.
**Impact:** Eliminate hosting bandwidth costs entirely.

### Migration Steps

1. Move static SPA build output to Cloudflare Pages
2. Connect GitHub repo → auto-deploy on push
3. Set environment variables in Cloudflare dashboard
4. Update DNS: point `system-design.hillmanchan.com` to Cloudflare Pages
5. Keep Firebase only for Auth + Firestore (no hosting)

### Cloudflare Pages Free Tier

- Unlimited bandwidth
- 500 builds/month
- Custom domains + SSL
- Global CDN

### Cost Savings

- Current at 1K users: ~$21/month
- After migration: $0
- Savings: ~$21/month

---

## Optimization 3: Tiered AI Models

**Problem:** All AI calls use the same expensive model.
**Impact:** 10x cost reduction on non-critical calls.

### Model Assignment

| Feature | Current | Proposed | Cost/call |
|---------|---------|----------|-----------|
| Search (keyword match) | GPT-4 | GPT-4o-mini | ~$0.0003 |
| Viber (prompt gen) | GPT-4 | GPT-4o-mini | ~$0.0003 |
| Suggest | GPT-4 | GPT-4o-mini | ~$0.0003 |
| Coaching (1:1 teaching) | GPT-4 | GPT-4 (keep) | ~$0.003 |
| Projects judge | GPT-4 | GPT-4 (keep) | ~$0.003 |

### Implementation

- Backend `/ai/chat` handler: switch model based on `mode` parameter
- Search/viber/suggest → `gpt-4o-mini`
- Coaching/projects → `gpt-4` (quality matters here)

### Cost Savings

- Search+viber+suggest = ~60% of calls → 10x cheaper
- Coaching+projects = ~40% of calls → same price
- Net: ~$0.001 avg per call (down from $0.003)
- Monthly AI cost: ~$210 (down from $630)
- Savings: ~$420/month

---

## Optimization 4: Rate Limiting

**Problem:** No per-user rate limits. Abuse or bot traffic could spike costs.
**Impact:** Cost protection ceiling + fair usage.

### Rate Limits

| Tier | Daily AI Calls | Weekly Plan Gen | Coaching Sessions |
|------|---------------|-----------------|-------------------|
| Free (not logged in) | 0 | 0 | 0 |
| Free (logged in) | 5 | 1/week (existing) | 1 topic trial |
| Premium | 50 | 1/week | Unlimited |

### Implementation

- Backend middleware: check `user.uid` against daily counter in Firestore/Redis
- Return `429 Too Many Requests` with reset time
- Frontend: show remaining quota in chat widget header

### Firestore Cost for Rate Limiting

- 1 read + 1 write per AI call (counter doc)
- At 1K users: +7,000 reads + 7,000 writes/day = still within free tier (50K/20K)

---

## Cost Summary After All Optimizations

| Service | Before | After | Savings |
|---------|--------|-------|---------|
| AI API | $630 | ~$105 | $525 |
| Hosting | $21 | $0 | $21 |
| Firebase | $0 | $0 | $0 |
| Backend infra | $0 | $0 | $0 |
| Stripe fees | $150 | $150 | $0 |
| **Total** | **$800** | **~$255** | **$545** |

## Revenue Projection (1,000 users/day)

| Scenario | Conversion | Monthly Revenue |
|----------|-----------|-----------------|
| Conservative (2%) | 20 × HK$150 | HK$3,000 (~$384) |
| Moderate (5%) | 50 × HK$150 | HK$7,500 (~$960) |
| Optimistic (8%) | 80 × HK$150 | HK$12,000 (~$1,536) |

**Break-even: ~2% conversion rate** (20 paying users out of 1,000 daily visitors)

---

## Implementation Priority

| # | Task | Effort | Impact | Priority |
|---|------|--------|--------|----------|
| 1 | Tiered AI models | 1 hour (backend config) | $420/month saved | **P0** |
| 2 | Rate limiting | 2-3 hours | Cost protection | **P0** |
| 3 | AI response caching | 3-4 hours | $315/month saved | **P1** |
| 4 | Cloudflare Pages migration | 1-2 hours | $21/month saved | **P2** |

Total implementation: ~1 day of work for ~$545/month savings.
