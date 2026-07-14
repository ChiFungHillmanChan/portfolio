# HANDOFF PROMPT — Casino: finish blackjack wallet + stake tiers for EVERY game + UI/UX pass

> Paste everything below the line into a fresh Claude Code session started in
> `/Users/hillmanchan/Desktop/HillmanChan_portfolio`.

---

You are continuing the Casino Game **"Lobby + Credits"** redesign. Three jobs, in order:
**(1)** finish the blackjack game-mode → wallet wiring, **(2)** give **every** lobby game its own
set of stake tiers (Micro / Mini / Standard / High) — not just blackjack, **(3)** do a real UI/UX
pass with screenshots. Work on branch `feat/casino-lobby-credits`. The backend is a **separate repo**.

## 0 — Orient before touching anything (read these)

- Design spec (blackjack + tiers): `docs/superpowers/specs/2026-07-13-blackjack-stake-tiers-design.md`
- **Blackjack handoff plan (exact file anchors, line numbers, code sketches, gotchas):**
  `docs/superpowers/plans/2026-07-13-blackjack-stake-tiers.md` ← your step-by-step for job (1)
- Parent redesign spec: `docs/superpowers/specs/2026-07-12-casino-lobby-credits-design.md`
- Wallet platform (already built, just call it): `portfolio/src/game/casino-game/calculator/js/wallet/`
  = `game-session.js`, `wallet-client.js` (`bet`/`topUp`/`payout`), `table-config.js`, `game-gate.js`,
  `wallet-hud.js`, `wallet-bootstrap.js`.
- **Working precedents already converted:** roulette (`roulette/js/wallet/`) and baccarat
  (`baccarat/game-mode/js/wallet/`) — copy their `bet-map.js` + `*-wallet.js` + init-wiring shape.
- Repos & state: portfolio on `feat/casino-lobby-credits`; backend
  `/Users/hillmanchan/Desktop/system-architecture` on `feat/casino-wallet` (LOCAL-ONLY, **held
  undeployed**). Both already have **uncommitted** changes — do NOT `git reset`; build on top.
- Deploy target is `portfolio/public/games/casino-game/` (a mirror of `src/…/calculator/`, see
  `portfolio/CLAUDE.md` "Sync to public"). Nothing is deployed. Re-sync before any deploy.
- **Rules:** PR-only (never push `main`). Keep every `node --test` suite green. Server is
  authoritative; client caps are UX mirrors; the payout cap Σ(amount×maxReturn) is the anti-mint
  control. Don't re-litigate the multi-seat / topUp / cap math — it's settled in the blackjack plan.

## 1 — Finish blackjack (already ~half done + tested)

Already DONE + green (do not redo): backend 3 blackjack tier tables (`wallet-logic.mjs`, 35 tests),
client `table-config.js` mirror + `BLACKJACK_STAKES` (53 tests), pure `bet-map.js` (6 tests).
**Remaining = steps 1–4 of the blackjack handoff plan**: `blackjack-wallet.js` (stake picker + boot),
`game-mode.js` four seams (commit / topUp×2 / settle — blackjack is the FIRST `topUp` user; double &
split become async with **abort-on-reject**), `index.html` (HUD host + picker + module script), and
`css` picker styling. Test commands are at the bottom of that plan.

## 2 — Stake tiers for EVERY game (the new scope)

Apply the exact same tier pattern blackjack uses to **roulette, baccarat, and UTH**. Per game:

a. **Backend** `wallet-logic.mjs`: add `<game>-micro`, `<game>-mini` (keep `<game>` as Standard) and
   `<game>-high`. Scale `min`/`max`/`maxTotalBet`; keep each betType's `maxReturn` + `mergeFactor`
   unchanged from the base table. Update `wallet-logic.test.mjs` (the "covers exactly the gameIds"
   assertion + a per-game tier test, like the blackjack ones).
b. **Client** `table-config.js`: mirror the new tables + a `<GAME>_STAKES` metadata array; update the
   parity test.
c. **DRY the picker:** factor the blackjack stake picker + `?stake=` resolve into ONE shared module —
   `js/wallet/stake-picker.js` + a generic `gameStakes(gameKey)`/`resolveStake(gameKey, key)` in
   `table-config.js` — and refactor blackjack to use it. All four games must use the SAME picker.
d. Each game's `*-wallet.js` reads `?stake=` and boots the chosen `gameId` with that table's limits
   (roulette + baccarat already have `*-wallet.js` — add the stake param; roulette/baccarat have NO
   `topUp`, so no async double/split there).
e. **Lobby:** keep ONE card per game → picker inside (mirror the blackjack card).

**PROPOSED tier numbers — CONFIRM WITH THE USER FIRST via an AskUserQuestion per game (the user hand-
picked blackjack's tiers this way; do the same for each).** Starting point:

Blackjack (locked): Micro 50–1,000 · Mini 100–2,500 · Std 500–10,000 · High 1,000–20,000 (mergeFactor 8).

Roulette (aggregate caps: every betType `max` = `maxTotalBet`; `maxReturn` fixed 36/18/12/9/6/3/3/2; mergeFactor 1):
| Tier | min/spot | maxTotalBet | per-spot UX cap |
|---|---|---|---|
| Micro | 10 | 2,000 | 500 |
| Mini | 50 | 5,000 | 1,000 |
| Standard (current) | 100 | 20,000 | 5,000 |
| High | 500 | 100,000 | 25,000 |

Baccarat (mergeFactor 1; player/banker maxReturn 2 / 1.95; tie 9; pairs 12; dragon 31; egalite 226):
| Tier | player/banker | tie / pairs | dragon | egalite | maxTotalBet |
|---|---|---|---|---|---|
| Micro | 50 – 1,000 | 10 – 100 | 10 – 200 | 10 – 1,000 | 2,500 |
| Mini | 100 – 2,500 | 25 – 250 | 25 – 500 | 25 – 2,500 | 6,000 |
| Standard (current) | 500 – 10,000 | 100 – 1,000 | 100 – 2,000 | 100 – 10,000 | 25,000 |
| High | 1,000 – 20,000 | 200 – 2,000 | 200 – 4,000 | 200 – 20,000 | 50,000 |

**UTH is Plan 5** (buy-in escrow, a SEPARATE `cg-uth` Lambda + Firestore — NOT the `cg-poker`
`casinoWallet`). Its "tiers" are ante levels (proposed: ante 25 / 100 / 500 / 1,000 with buy-in
scaling ~2,500 / 10,000 / 50,000 / 100,000). Fold UTH tiers into the Plan 5 escrow design & build —
do NOT try to bolt them on now. Just include the ante-tier scheme when you write the Plan 5 spec.

## 3 — UI/UX edit checks (do a real pass; screenshot each game + the lobby)

**A. Lobby** (`index.html`)
- [ ] GAME LOBBY shows the 4 game cards with name/blurb/limitsText/tags; signed-OUT shows the login
      gate, not the games. PRACTICE section lists trainers with no login.
- [ ] Signed-IN: wallet HUD balance pill visible + thousands-formatted; reset control present.
- [ ] Each card's `limitsText` reflects the tier range (e.g. "50 – 20,000 · 4 stakes").
- [ ] Responsive: cards reflow on mobile; touch targets ≥ 44px; no horizontal scroll.

**B. Stake picker** (shared component, all 4 games identical)
- [ ] Entering a game with no `?stake=` shows the picker (4 tier cards: name, limits, blurb) — NOT the table.
- [ ] Each tier is a clear button → sets `?stake=<key>` → table boots on that tier. "Back to lobby" works.
- [ ] Current balance shown so the player picks an affordable tier.
- [ ] Keyboard accessible (focusable, Enter activates), visible focus ring, aria-labels.
- [ ] Matches the neon/felt theme; mobile fits with no horizontal scroll.

**C. Wallet HUD** (in-game)
- [ ] Balance pill updates immediately after commit (debit) and settle (credit) — the SERVER-confirmed
      balance, not just optimistic local. No negative/NaN flicker.
- [ ] Reset appears/enables when bust (balance < 100); cooldown 403 shows a retry time.

**D. Game gate overlay**
- [ ] Signed-OUT: covers the table, shows Google sign-in; NO flash of empty overlay on load.
- [ ] Insufficient (balance < tier min): message guides to "pick a lower stake (back to lobby)" or reset
      — never a dead-end. Confirm no 100–499 dead-zone (use blackjack **Micro**, min 50, to verify).
- [ ] Signed-IN + balance known: overlay clears, table interactive.

**E. Betting limits + errors**
- [ ] Chip placement caps at the tier's per-spot/side max; over → friendly toast (never a raw error code).
- [ ] Deal disabled until a valid main bet ≥ tier min; aggregate over `maxTotalBet` blocked.
- [ ] Server rejects surface via the `WALLET_ERR_MSG` map (insufficient-balance / too-fast /
      over-table-max / bad-bets / round-in-progress).
- [ ] Blackjack only: double/split disabled when unaffordable; a rejected `topUp` aborts cleanly (no
      phantom card or split hand).

**F. Cross-game consistency**
- [ ] All 4 games use the SAME HUD, gate, and stake-picker components (visually identical).
- [ ] Hamburger nav / back links work from every game.
- [ ] `prefers-reduced-motion`: animations shortened/disabled; rounds still complete.
- [ ] Sign-out mid-session clears the balance + returns the gate; a second user on the same tab never
      sees the prior balance. Refresh mid-hand: open round reconciles (warn), next commit blocked until settled.

**G. Visual polish**
- [ ] Consistent typography/colors with the rest of the casino (Orbitron / Rajdhani, felt/neon).
- [ ] No layout shift when HUD/gate mount; contrast passes on felt; focus states visible.

## 4 — Verify + test

- Unit: from `…/calculator/` → `node --test js/wallet/*.test.mjs` (platform + parity),
  `node --test <game>/**/tests/*.test.mjs` (each bet-map). From `system-architecture/lambda/poker` →
  `node --test wallet-logic.test.mjs`. ALL must stay green.
- Browser (the real gate): Firebase blocks localhost referrers → use a deploy or the custom-token trick
  (see the `project-uth-multiplayer` memory). Run the blackjack handoff plan's verification checklist on
  **Micro** (to exercise reset) and smoke-test **High** on each game. Signed-OUT lobby can be checked on
  a plain local static server (it was already verified once in Plan 2).

## 5 — Deploy (all HELD for the one release at the end of Plan 5)

1. Backend `cg-poker` (adds all the new tier tables server-side): `cd lambda/poker && npm run deploy`
   (or the zip + `aws lambda update-function-code`). New gameIds route through the existing
   `wallet-bet`/`wallet-payout` actions — **no new API Gateway routes needed**.
2. Frontend: re-sync `src/…/calculator/` → `public/games/casino-game/` (`rsync -a --delete`), then the
   portfolio CRA deploy (`npm run deploy`).
3. Merge `feat/casino-lobby-credits` → main via PR. Backend repo is LOCAL-only (no remote).

## Constraints (repeat — these bite if ignored)

- PR-only; never push `main`. Don't deploy piecemeal unless the user says so (one release at end).
- Follow existing patterns; keep pure logic pure + unit-tested; keep all suites green.
- Multi-seat is safe with mergeFactor 8; insurance does NOT exist (cosmetic only) — don't add it.
- Confirm every game's tier NUMBERS with the user (AskUserQuestion) before writing the tables.
