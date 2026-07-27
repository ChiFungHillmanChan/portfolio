# 打小人 — support button + mobile save fix

Date: 2026-07-27
Branch: `fix/mobile-save-and-coffee-button`
Status: design approved

## Scope

Two small changes to `portfolio/public/games/da-siu-yan/` only. The portfolio
header and the Never Have I Ever card game were considered and explicitly
dropped from this piece of work.

## 1. Buy Me a Coffee button

A support link so players can back the project.

- **Placement:** absolutely positioned top-**right** of `#stage-wrap`, mirroring
  `#hud-stop` at top-left. Icon only.
- **Icon:** the cup SVG already used in the casino hamburger menu
  (`portfolio/src/game/casino-game/calculator/index.html:63`), `stroke="currentColor"`.
  No emoji — the codebase uses SVG for UI icons.
- **Styling:** the game's own palette, copied from `#hud-stop` — `#7a5a30`
  border, `rgba(18,10,6,0.75)` fill, `#f3e6c8` ink. Not a generic dark grey.
- **z-index 3.** `#hud-stop` is z-index 1 and `.overlay` is z-index 2, so
  anything lower would be buried under the near-opaque entry overlay
  (`rgba(16,8,5,0.92)`) and be invisible exactly when it needs to be seen.
- **Hidden while a mode is running.** During 任摑 the player mashes the canvas;
  a live corner button is an accidental-tap magnet that would navigate away
  mid-ritual. Visible on the entry and end screens only, toggled in `start()`
  and `stop()`.
- **Never appears in saved videos** — recording uses `canvas.captureStream()`,
  which captures the canvas, not the DOM.
- `target="_blank" rel="noopener noreferrer"`, plus an `aria-label`.

### No currency or amount in the label

The button names no price. The account's `multiple_currency_enabled` is being
turned on by the owner, after which Buy Me a Coffee shows each visitor their own
currency (HKD in Hong Kong, GBP in the UK). Any hard-coded amount would
contradict what the visitor actually sees at checkout. Verified from the page's
embedded `creator_data` on 2026-07-27: `"currency":"USD"`,
`"coffee_price":"5.0000"`, `"multiple_currency_enabled":false` — the last of
which the owner is changing. Because no amount is rendered, no code change is
needed when it flips.

## 2. Mobile save fix

`儲存` is a plain `<a href="blob:…" download>` (`game.js:332-337`). On iOS Safari
that saves into Files → Downloads and **never the Photos app**, and inside
in-app browsers (Instagram, LINE, WeChat) the `download` attribute is commonly
ignored, failing silently. `navigator.share({files})` is the only path that
reaches the camera roll, yet today it renders *second* and only conditionally.

Changes, both inside the existing `if (recBlob && recBlob.size > 0)` branch:

- **Order:** build 分享 first, 儲存 second, so the reliable control is the
  leftmost/default one. `canShare` is hoisted to a `const` so both the button
  and the hint below read the same value.
- **Hint line**, a third `.fineprint` paragraph:
  - share available → `手機撳「分享」先入到相簿,「儲存」會存落「檔案」。`
  - share unavailable → `手機可以長撳條片,揀「儲存影片」。`

Out of scope: detecting a failed anchor download (not reliably detectable) and
persisting the recording beyond the session.

## Service worker

`sw.js` `CACHE` bumps `da-siu-yan-v10` → `da-siu-yan-v11`. `game.js` and
`styles.css` both change, so without the bump returning players keep the old
cached copies. No new files, so `ASSETS` is unchanged.

## Testing

- `pwa.test.mjs` already asserts `CACHE` matches `^da-siu-yan-v\d+$` and that
  every `ASSETS` entry exists; it also carries a reverse-drift guard for runtime
  references, so a new import would be caught.
- New assertions in a `support-link.test.js` beside the game: the game's
  `index.html`/`game.js` support link must carry both `target="_blank"` and
  `rel="noopener noreferrer"` — a cheap guard against a future edit dropping
  `rel` and leaking `window.opener`.
- Browser verification: button visible on entry, hidden during 開壇 and 任摑,
  visible again on the end screen, above the overlay; end-screen row shows 分享
  before 儲存 with the correct hint.
