# 小氣簿 — Real-Book Redesign

**Date:** 2026-08-08 · **Scope:** frontend only (`portfolio/src/game/siu-hei-bou/`). Backend, D1 schema, API and the public 找數卡 page are untouched.

## Goal

Turn the flat page-list app into a physical notebook: a closed cover when signed out, an
opening animation on login, per-friend chapters found via a searchable 目錄, text that
flows across ruled pages exactly like handwriting, and a pen that visibly writes each new
entry. Rebrand the cover copy so the app no longer calls its user 小器之人.

## Decisions (user-confirmed)

- **Name stays 小氣簿.** New tagline 「唔係小氣，係記性好」; cover footnote
  「朋友激嬲你嘅事，記低先，儲夠印就搵佢請返餐。」
- **Single-page leaf on every screen size** (no desktop spread).
- New branch + PR; no merge without explicit instruction.

## Architecture

### Book shell (`Book.jsx`)

One fixed-size book box: `width: min(94vw, 420px)`, height clamped to viewport
(`min(78dvh, 620px)` with a 4:5-ish feel). Cover and pages are absolutely positioned
layers filling the same box — closed and open are guaranteed the same size.

- **Cover layer:** the existing red-cover design (plate, band, AngryFace) moved into the
  book box. Hinged on the left spine: `transform-origin: left; transform: rotateY(0)`
  closed → `rotateY(-150deg)` open, under a perspective wrapper. Driven purely by auth
  state, so login animates open and logout animates shut with the same transition.
  While `user === undefined` the closed cover shows 開緊本簿⋯ instead of the button.
- **Leaf flip:** page navigation renders a temporary leaf overlay — front face is the
  outgoing page content, back face plain ruled paper — rotating `0 → -180deg` (forward)
  or reverse (back), ~450ms; the real target page sits beneath. `prefers-reduced-motion`
  swaps both animations for instant cuts.
- **Location state:** `{ section: 'index' | friendId, pageIdx }` lives in Book; corner
  page-turn buttons (bottom-left 上一頁 / bottom-right 下一頁) plus a 目錄 tab on the left
  edge of every friend page.

### Index — 目錄 (`IndexPage.jsx`, replaces `HomePage.jsx`)

- Each friend is one 32px index line: colour swatch (their existing tab colour), name,
  dotted leader, `stamps/threshold 印`; 滿喇 badge when full. Tap → flip to chapter.
- **Search box** at the top filters lines by name (client-side, no API).
- Add-friend input stays, styled as a pencil-note line at the bottom.
- More lines than fit one page → the index itself flows onto further index pages.

### Friend chapter (`FriendSection.jsx`, replaces `FriendPage.jsx`)

- **Page 1:** chapter header (name, `stamps/threshold 印`, settings gear), stamp-seal
  card, then 罪行紀錄 entries on ruled lines. 找數卡 box / 開找數卡 button keep their
  current behaviour, rendered above the entries.
- **Continuation pages:** slim one-line header 「{name} ·續」 then full-height lines.
- Entries keep: date + AngryFace severity meta line, faded style when claimed
  (`card_id`), delete × on unclaimed entries.
- Add/settings bottom sheets unchanged in behaviour (they slide over the book).

### Pagination engine (`paginate.js`, pure + Jest-tested)

- Width units: CJK/fullwidth = 1, halfwidth = 0.5 (`unitLen`, `splitLine`).
- Layout: shared metric `LINE_PX = 32`, `UNITS_PER_LINE = 19`. Page capacities passed in
  (`firstPageLines` smaller because of header/stamp card; `pageLines` for continuation).
- Each grudge = 1 meta line + greedy-wrapped content lines. Lines fill pages in order and
  an entry **splits mid-entry across pages** — real-writing behaviour. ~230 characters
  land per continuation page; that is the "X".
- The renderer prints each computed line as its own fixed-height div (`white-space:
  nowrap; overflow: hidden`), so computed pagination and visual wrapping cannot drift,
  and every glyph sits between the ruled lines.

### Ruled-line alignment (fix for add sheet too)

One shared metric: `--shb-lh: 32px` drives the page background
`repeating-linear-gradient`, every content line box, and the AddGrudgeSheet textarea
(`line-height: 32px`, gradient period 32px, zero top padding) so typed text sits on the
lines instead of drifting.

### Pen-writing animation

On successful save: sheet closes, book flips to the page where the entry lands, then the
new entry reveals character-by-character (~55ms/char, whole animation capped at ~2.5s by
scaling the interval). A small hand-drawn SVG pen (no emoji) is absolutely positioned at
the tip of the last revealed character — x = revealed units × unit width, y = line index ×
32px — with a slight writing wobble. Reduced-motion: entry just appears.

## Error handling

Unchanged from today: API failures toast Cantonese messages; localStorage cache of
`state` keeps the index readable offline-ish; grudges load per chapter with the existing
load-failure toast. Pagination is pure and cannot throw on user input (content is already
capped at 500 chars by the sheet).

## Testing

- Jest: `paginate.test.js` — unit counting (CJK vs ASCII), line splitting, first-page vs
  continuation capacity, mid-entry page splits, claimed flag passthrough.
- Existing `App.test.js` stays green; CI gate is `npm run build`.
- Manual browser walkthrough on `localhost:3000` (login works there): open/close
  animation, search, long-entry flow across pages, pen animation, no console errors.

## Out of scope

Backend/API changes, the public `/card/<token>` page, domain rename, desktop two-page
spread, offline/PWA work.
