# 打小人 — image-rights consent gate + disclaimer gaps

Date: 2026-07-27
Branch: `feat/da-siu-yan-image-consent`
Status: design approved, implementation pending

## Problem

打小人 lets a player type a real person's name (`game.js:19`) and upload their
photograph (`game.js:21`), then produces a shareable 9:16 video of that person's
effigy being beaten while a Cantonese voice chants curses. The video is
recorded on-device and offered through 儲存 / 分享 (`game.js:296-309`).

Two gaps in the shipped build:

1. **Nothing is asked of the player about the image they upload.** There is no
   point at which they affirm they have the right to use it, or that it is not
   of a minor, not an intimate image, and not a third party's likeness used
   without consent.
2. **The end screen carries no disclaimer at all.** Its only text is 條片淨係喺你
   部機入面,唔儲存就會冇咗。(`game.js:313`) — yet 分享 is precisely the moment at
   which real-world exposure is created (in HK, the PDPO s.64 doxxing offence
   turns on *disclosure* of personal data with intent or recklessness as to
   causing specified harm, and Cap. 200 s.24 criminal intimidation can bite if
   the video is sent to its subject).

The entry screen's existing fineprint (`game.js:32`) covers on-device
processing, purpose, and AI voice. Its claim that 名同相只喺你部機處理 is
accurate and verified: `downscale()` (`game.js:85`) decodes to a local canvas,
and the only `fetch()` calls in the runtime are the same-origin voice manifest
and clips (`audio.js:15,18`) plus the service-worker passthrough (`sw.js:116`).

## Scope

In scope:

- A rights-confirmation checkbox gating both game modes whenever a photo is loaded.
- Rewritten entry fineprint: no-efficacy wording + a content/age note.
- A responsibility line on the end screen, beside 儲存 / 分享.
- A pure, tested `consent.js` module holding the gate rules.
- Service-worker precache + cache-version updates.

Out of scope (considered, deliberately excluded):

- Surfacing the chant's folk provenance in the UI. It is recorded in a code
  comment (`chant-lines.js:1`) and adds screen text for no protective benefit.
- Persisting consent to `localStorage`. A fresh affirmative act per session is
  both stronger and simpler; nothing needs to survive a reload.
- Any server-side check. The game is 100% client-side and stays that way.
- Auditing the Canva provenance of `art/granny-*.png`. That is a licensing
  question, not a disclaimer question, and is tracked separately.

## Design

### 1. Entry-screen UI

A new row in the `app.innerHTML` template, inserted between the photo button
(`game.js:20-21`) and the voice toggle (`game.js:22`):

```html
<label id="photo-consent" class="consent" hidden>
  <input id="photo-consent-box" type="checkbox" />
  <span>我確認我擁有此圖片的使用權,且此圖片不涉及未成年人、私密影像或未經同意的他人肖像。</span>
</label>
```

The row is `hidden` until a photo decodes successfully, so the ~majority of
players who never upload an image never see legal text.

The confirmation sentence is kept **verbatim in 書面語**, unlike every other
string in the app. This is deliberate: it is the one line carrying an
undertaking, and the formal register signals that rather than reading as
flavour text. Punctuation uses the ASCII `,` used throughout the codebase, not
`，`.

Wrapping the input in `<label>` makes the sentence part of the tap target,
clearing the 44px minimum that the rest of `styles.css` observes (`styles.css:34`).

New CSS in `styles.css`:

- `.consent` — flex row, `align-items: flex-start`, `max-width: min(340px, 86%)`,
  `font-size: 0.8rem`, `line-height: 1.6`, `text-align: left`, bordered and
  inset to match `.toggle button` (`#7a5a30` border, `#120a06` background).
- `.consent input` — `22px` square, `flex: 0 0 auto`, `accent-color: var(--paper)`.
- `.consent--nudge` — a short keyframe flash (border + background pulse, ~600ms)
  applied when a locked mode button is pressed.
- `.mode-btn.is-locked` — reduced opacity.

### 2. Locking the mode buttons

The mode buttons take `aria-disabled="true"` and a `.is-locked` class — **not**
the HTML `disabled` attribute. Disabled buttons do not emit click events in most
browsers, which would make the "press 開壇 → the checkbox flashes" feedback
impossible.

The authoritative gate is inside `start()` (`game.js:173`): if
`consent.canStart()` is false it flashes the consent row and returns before
anything else happens. `.is-locked` is presentation only.

### 3. `consent.js`

A new module mirroring the closure-factory shape of `damage-model.js:7`:

```js
export function createConsent() {
  let hasPhoto = false, confirmed = false;
  return {
    photoChanged(accepted) { hasPhoto = accepted; confirmed = false; },
    setConfirmed(v) { confirmed = v; },
    canStart: () => !hasPhoto || confirmed,
    state: () => ({ hasPhoto, confirmed })
  };
}
```

Rules:

| Situation | `canStart()` | Rationale |
|---|---|---|
| No photo | `true` | Name-only play is unaffected; the undertaking is about an image |
| Photo loaded, unticked | `false` | Both 開壇 and 任摑 are gated — both render the photo (`game.js:180`) |
| Photo loaded, ticked | `true` | — |
| Photo swapped for another | resets to `false` | A new image must not inherit the previous image's undertaking |
| Photo decode failed | resets to `false`, row hides | `game.js:79-82` already clears `photoCanvas`; treated as "no photo" |

Consent survives 再打過, because `backToEntry()` (`game.js:341`) intentionally
keeps `photoCanvas` — it is the same image, so the same undertaking holds. It is
not written to `localStorage`.

### 4. Copy changes

`game.js:32` — entry fineprint. Replaces 娛樂用途,旨在祈福減壓, whose 祈福
implies efficacy:

```
名同相只喺你部機處理,唔會上載去任何地方。
本遊戲只係模仿民間習俗,唔係宗教服務,亦冇任何實際效力。
口訣有咒罵字句,建議成年人玩。聲音由 AI 生成。
```

`game.js:311-314` — end-screen note gains a second line. It stays inside the
existing `if (recBlob && recBlob.size > 0)` branch, so it appears exactly when a
shareable video exists and never in free mode (which produces no video):

```
條片淨係喺你部機入面,唔儲存就會冇咗。
如果用咗真人個名或者張相,後果你要自己負責 —— 唔好用嚟騷擾、恐嚇或者公開針對任何人。
```

Cantonese conventions followed: 淨係 not 只係 for "only" on the end screen
(matches the shipped line); 冇 not 無, per the correction recorded for
`chant-lines.js`; 用咗真人個名或者張相 rather than the bookish 使用真人姓名或相片;
口訣 because that is the term the codebase already uses for the chant.

### 5. Service worker

`sw.js` must gain `"./consent.js"` in `ASSETS` and bump `CACHE` from
`da-siu-yan-v9` to `da-siu-yan-v10`. Both are load-bearing:

- Without the `ASSETS` entry, `game.js`'s new `import` 404s on an offline first
  load, taking the whole game down.
- Without the version bump, returning players keep the cached `game.js` and
  never receive the checkbox — i.e. the gate silently does not ship.

`CACHE` and `ASSETS` must remain strict JSON; `portfolio/public/games/pwa.test.mjs`
parses them textually.

## Testing

`consent.test.js`, beside the module, run with `node --test`:

1. No photo, unconfirmed → `canStart()` is `true`.
2. Photo accepted, unconfirmed → `false`.
3. Photo accepted, then `setConfirmed(true)` → `true`.
4. Photo accepted and confirmed, then a second `photoChanged(true)` → `false`
   (the swap-resets-consent rule).
5. `photoChanged(false)` after a confirmed photo → `true` and
   `state().hasPhoto === false` (the decode-failure path).
6. `setConfirmed(true)` with no photo → `canStart()` stays `true` and
   `state()` reports `{hasPhoto: false, confirmed: true}` (the module records
   what it is told; it does not silently correct the caller).

Wiring: `photoChanged(true)` is called in the `photoInput` change handler after
`downscale()` resolves, and `photoChanged(false)` in its `catch` — the same two
points that already set and clear `photoCanvas` (`game.js:72-83`).

`portfolio/public/games/pwa.test.mjs` already asserts that every `ASSETS` entry
exists on disk and that `CACHE` matches `^da-siu-yan-v\d+$`, so a forgotten
precache entry fails without new test code.

Manual verification before opening the PR: serve the game, confirm the row is
absent with no photo, appears on upload, blocks both buttons with a visible
flash, unlocks when ticked, and re-locks after swapping the image.

## Delivery

New branch `feat/da-siu-yan-image-consent` off `main`, PR opened, **not merged
without explicit instruction**. The working tree carries unrelated pre-existing
changes (`README.md`, untracked `scripts/da-siu-yan/*`) belonging to other work;
they must be left uncommitted.
