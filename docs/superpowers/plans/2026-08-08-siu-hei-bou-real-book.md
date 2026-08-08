# 小氣簿 Real-Book — Implementation Plan

Spec: `docs/superpowers/specs/2026-08-08-siu-hei-bou-real-book-design.md`
Branch: `feat/siu-hei-bou-real-book` · frontend-only, all inside
`portfolio/src/game/siu-hei-bou/` (+ its test file).

## Task 1 — Pagination engine (TDD)

Files: `paginate.js` (new), `portfolio/src/game/siu-hei-bou/paginate.test.js` (new).

- `unitLen(str)` — CJK/fullwidth 1, halfwidth 0.5.
- `wrapText(str, unitsPerLine)` — greedy split into exact substrings.
- `paginateEntries(entries, {unitsPerLine, firstPageLines, pageLines})` → pages: arrays
  of line objects `{type:'meta'|'text', entry, text?, first?}`; entries split mid-entry
  across page boundaries.
- Jest first, then implementation. Run scoped:
  `npm test -- --watchAll=false paginate` (in `portfolio/`).

## Task 2 — Book shell

Files: `Book.jsx` (new), `siuHeiBouStyles.css`, `SiuHeiBouGame.jsx`, `CoverPage.jsx`.

- Book box + stacked layers; cover face from CoverPage content (rebranded copy) hinged
  left, driven by `user` presence; loading label while `user === undefined`.
- Leaf-flip overlay for page nav; `goTo(section, pageIdx)` API; corner buttons + 目錄 tab.
- Reduced-motion: transitions off.
- SiuHeiBouGame keeps auth/routing; renders `<Book …/>` instead of Cover/Home/Friend.

## Task 3 — Index page

Files: `IndexPage.jsx` (new, replaces `HomePage.jsx` which is deleted).

- Search input filters friends; 32px index lines with colour swatch, dotted leader,
  count, 滿喇 badge; add-friend line at bottom; index paginates via the same line grid.

## Task 4 — Friend chapter

Files: `FriendSection.jsx` (new, replaces `FriendPage.jsx` which is deleted).

- Loads grudges, feeds `paginateEntries`, renders page 1 (header + stamp card + card box
  + lines) and continuation pages; keeps share/open/settle/delete flows and both sheets.

## Task 5 — Pen animation

Files: `FriendSection.jsx`, `svgs.jsx` (add `PenNib`), CSS.

- After save: flip to landing page, char-by-char reveal with pen positioned at write tip;
  interval scaled so total ≤ ~2.5s; reduced-motion skips.

## Task 6 — Copy + line alignment

- Cover copy per spec; AddGrudgeSheet textarea on the shared 32px metric.

## Task 7 — Verify + PR

- `npm test -- --watchAll=false` (portfolio), `npm run build`.
- Browser walkthrough on localhost:3000 per spec checklist.
- Commit per task; push; `gh pr create`; **no merge** without explicit instruction; do
  not stage README.md or scripts/da-siu-yan (other session's work).
