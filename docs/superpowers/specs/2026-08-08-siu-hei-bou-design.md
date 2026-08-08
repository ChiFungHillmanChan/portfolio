# 小氣簿 (Siu Hei Bou) — Design Spec

**Date:** 2026-08-08
**Domain:** `siu-hei-bou.hillmanchan.com`
**One-liner:** 得意廣東話「記仇簿」web app — 記低朋友激嬲你嘅事，儲滿印仔就開「找數卡」叫佢請食飯。

## Background & Research

A real 小氣簿 app exists on the HK App Store (4.8★, HK$38/month): users log
upsetting events per person, get an offender leaderboard, reason analysis, and
a **stamp-card system** that accumulates stamps per incident until a limit is
hit, plus shareable event cards. This project builds the same core loop as a
free, cute, Cantonese, mobile-first web app on Hillman's own subdomain.

## Product Decisions (confirmed with user)

1. **Single-account model.** Only the recorder logs in (Google). The friend
   never needs an account — they receive a **share link** (WhatsApp etc.) to a
   public 找數卡 page.
2. **Severity-weighted stamps.** Each grudge has 嬲爆度: 小嬲 = 1 印,
   中嬲 = 2 印, 勁嬲 = 3 印. Each friend has a stamp card; default 10 stamps
   fills it (per-friend configurable). Full card → user can open a 找數卡.
3. **Domain:** `siu-hei-bou.hillmanchan.com` (matches `da-siu-yan` naming).
4. **Build method:** same as card-drawer/casino-game — React component in the
   portfolio build, hostname-routed; login same as casino-game (shared
   Firebase project); backend is new: Cloudflare Worker + D1.

## Architecture

```
Browser (siu-hei-bou.hillmanchan.com)
  │  React SPA — portfolio build, hostname-routed (App.js), CloudFront + S3
  │  Firebase Auth (Google popup, project system-design-c84d3)
  │
  └─ siu-hei-bou-api.hillmanchan.com  (Cloudflare Worker, custom domain)
       ├─ verifies Firebase ID token via Google public certs (jose/JWKS-style,
       │  iss=https://securetoken.google.com/system-design-c84d3, aud=system-design-c84d3)
       └─ Cloudflare D1 (SQLite) — database "siu-hei-bou-db"
```

- **Frontend:** `portfolio/src/game/siu-hei-bou/SiuHeiBouGame.jsx` + styles.
  Add `'siu-hei-bou'` to the hostname map and a `/siu-hei-bou` dev route in
  `App.js`. Internal navigation is client-side off `location.pathname`
  (CloudFront already serves index.html for unknown paths). Public card page
  is the SPA route `/card/:token`.
- **Backend:** `siu-hei-bou-api/` folder at repo root (like `telegram-bot/`),
  a single Cloudflare Worker deployed with `wrangler deploy`. No framework —
  hand-rolled router like the Lambda style already used.
- **Database:** Cloudflare D1 free tier (5 GB, 5M reads/day, 100k writes/day)
  — first use of D1 in this stack; text-only data fits it perfectly.
- **Auth:** Firebase Google sign-in reusing `system-design-c84d3` (same public
  config as casino-game). The Worker verifies the ID token's RS256 signature
  against Google's published certs (cached), checks `iss`/`aud`/`exp`. No
  firebase-admin on Workers. On first authenticated call, upsert `users` row.
- **CORS:** allow `https://siu-hei-bou.hillmanchan.com`,
  `https://hillmanchan.com`, and `http://localhost:3000`.
  Note: the shared Firebase API key blocks localhost referers, so Google
  sign-in is tested on the deployed path (`hillmanchan.com/siu-hei-bou`) or
  via the custom-token trick used for UTH e2e.

## Data Model (D1 schema)

```sql
CREATE TABLE users (
  uid        TEXT PRIMARY KEY,          -- Firebase UID
  email      TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE friends (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  uid        TEXT NOT NULL,
  name       TEXT NOT NULL,             -- 罪人名／花名
  colour     TEXT NOT NULL DEFAULT '#e8a0a0',  -- bookmark tab colour
  threshold  INTEGER NOT NULL DEFAULT 10,      -- 滿卡印數
  reward     TEXT NOT NULL DEFAULT '請食飯',    -- 獎品文字
  archived   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_friends_uid ON friends(uid);

CREATE TABLE cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  share_token   TEXT NOT NULL UNIQUE,   -- unguessable (crypto random, 24 chars)
  uid           TEXT NOT NULL,
  friend_id     INTEGER NOT NULL REFERENCES friends(id),
  stamp_total   INTEGER NOT NULL,
  reward        TEXT NOT NULL,          -- snapshot of friend.reward at open time
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','acknowledged','settled')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT,
  settled_at    TEXT
);

CREATE TABLE grudges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uid         TEXT NOT NULL,
  friend_id   INTEGER NOT NULL REFERENCES friends(id),
  content     TEXT NOT NULL,            -- the grievance text
  severity    INTEGER NOT NULL CHECK (severity IN (1,2,3)),  -- 印仔數
  occurred_at TEXT NOT NULL,            -- user-editable date (YYYY-MM-DD)
  card_id     INTEGER REFERENCES cards(id),  -- NULL until claimed by a 找數卡
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_grudges_uid_friend ON grudges(uid, friend_id);
```

A friend's current stamp count = `SUM(severity)` of their grudges with
`card_id IS NULL`. Opening a card assigns those grudges' `card_id`, snapshots
`stamp_total` and `reward`, and thereby resets the live card to 0.

## API (Worker routes)

All `/api/*` require `Authorization: Bearer <Firebase ID token>`; rows are
always scoped by the verified `uid`. Errors: JSON `{error: <code>}` with
proper status; unknown route 404.

| Route | Purpose |
|---|---|
| `GET  /api/state` | Everything for first paint: friends + live stamp counts + open/uncleared cards. |
| `POST /api/friends` | Create friend `{name, colour?, threshold?, reward?}`. |
| `PATCH /api/friends/:id` | Edit name/colour/threshold/reward/archived. |
| `DELETE /api/friends/:id` | Delete friend + their grudges/cards (confirm in UI). |
| `GET  /api/grudges?friend_id=` | List grudges for a friend (newest first, includes claimed ones grouped by card). |
| `POST /api/grudges` | `{friend_id, content, severity, occurred_at}`. Content max 500 chars. |
| `PATCH /api/grudges/:id` | Edit content/severity/occurred_at (only while `card_id IS NULL`). |
| `DELETE /api/grudges/:id` | Delete (only while `card_id IS NULL`). |
| `POST /api/cards` | `{friend_id}` — server re-checks stamps ≥ threshold, claims open grudges, returns card + share URL. |
| `POST /api/cards/:id/settle` | Owner marks 找咗數. |
| `GET  /api/cards?friend_id=` | Card history. |
| `GET  /public/cards/:token` | **No auth.** Card + friend name + grudge list for the public page. |
| `POST /public/cards/:token/ack` | **No auth.** `open → acknowledged` only (idempotent, one-way). |

## UI / UX (廣東話, mobile-first, notebook aesthetic)

Visual language: 米黃紙 + 紅墨水 + washi-tape 粉色系; hand-drawn SVG only —
**no emoji** (repo-wide rule). Handwriting-feel font: 霞鶩文楷 TC (LXGW WenKai
TC), subsetted and self-hosted with `font-display: swap`.

1. **封面 (login)** — hard-cover notebook with elastic band; title 「小氣簿」,
   subtitle 「小器之人，專用此簿」; Google 登入 button styled as a bookplate
   sticker.
2. **罪人名單 (friend list)** — index page with coloured bookmark tabs, one per
   friend: name + mini progress 「7/10 印」. Add button: 「加個罪人」.
3. **朋友頁** — lined notebook page. Top: **儲印卡** grid (hand-drawn 嬲爆面
   SVG stamps fill circles; 80%+ shows 「就快滿喇」 banner). Below: diary-style
   grudge entries (date + severity stamp + text). Card full → bouncy
   「開找數卡」 button.
4. **記一筆** — bottom sheet: lined textarea, three hand-drawn faces to pick
   小嬲／中嬲／勁嬲, date defaults today (editable). Save plays an ink-stamp
   animation onto the card.
5. **找數卡 (public, `/card/:token`)** — coupon/certificate style: friend name,
   the full stamp card, 罪行清單 with dates, big 「請食飯啦！」 (or custom
   reward), 「認數」 button, footer 「由小氣簿發出」 linking to the app.
   Invalid token → cute 404 「搵唔到呢張卡喎」.
6. **設定** — per-friend threshold/reward/name/colour, settled-card history,
   logout, delete friend (with confirmation).

## Share / Notification Flow

Opening a 找數卡 triggers `navigator.share` (mobile native sheet, WhatsApp
first-class) with template:

> 【小氣簿】你喺我本簿度已經儲滿 N 個嬲爆印！睇下你做過啲乜 → \<link\>
> 依家{reward}，一筆勾銷。

Desktop fallback: copy-link button + `wa.me/?text=` link. No server-side
push/email in v1 — the user sends it themselves, which fits the single-account
model.

## Error Handling

- Worker: typed error codes (`unauthorized`, `not-found`, `threshold-not-met`,
  `card-claimed`, `too-long`, `bad-request`), correct HTTP statuses; public
  ack endpoint is rate-limited per-IP (simple in-Worker counter) and one-way.
- Frontend: failed API call → toast 「save 唔到，遲啲再試」; loading and empty
  states for every page; `/api/state` cached in `localStorage` for instant
  paint, refreshed on load.

## Testing

- Worker: pure logic (stamp maths, threshold check, token generation, route
  handlers with a stubbed D1) under `node --test`, matching the Lambda repos.
- Local dev: `wrangler dev` with local D1; frontend `npm start` against it.
- Frontend gate: `npm run build` (the only thing CI runs); jsdom App.test
  continues to pass (game is lazy-loaded like the others).
- Manual mobile verification on the deployed site before calling it done.

## Deployment / Infra Checklist

1. Cloudflare D1: create `siu-hei-bou-db`, apply schema migration.
2. Worker: `wrangler deploy` from `siu-hei-bou-api/`; add custom domain
   `siu-hei-bou-api.hillmanchan.com` (zone already on Cloudflare, TLS auto).
3. Cloudflare DNS: CNAME `siu-hei-bou` → CloudFront (grey cloud), same target
   as other game subdomains.
4. CloudFront: add alternate domain `siu-hei-bou.hillmanchan.com` to
   distribution `E2SYHEFLV89R32` (wildcard cert already covers it).
5. Firebase console: add `siu-hei-bou.hillmanchan.com` to authorized domains.
6. Portfolio: feature branch → PR → merge → auto-deploy (never direct main).

## Costs

$0/month: D1 + Workers free tier, Firebase Auth free, existing CloudFront/S3.

## Out of Scope (v1) / Later Ideas

- 年度回顧 (annual grudge review) like the App Store app
- Generated share-card **image** (canvas → PNG) in addition to the link
- Photos on grudges (D1 is text-only here; would need R2)
- Push/email notification to the friend
- English/Mandarin language toggle
- 罪人排行榜 analytics page
