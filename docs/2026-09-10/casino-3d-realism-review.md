# Casino 3D model and motion review — 10 September 2026

Implemented in the existing Three.js casino. Canonical source and published mirror are synchronized. No deployment or wallet/backend changes were made.

Later baccarat refinements and the updated 187-test verification are recorded in [Baccarat hand and table refinement](baccarat-hand-and-table-refinement.md).

## What was wrong and what changed

| Area | Root cause | Result |
| --- | --- | --- |
| Dealer appearance | Muscular character geometry under painted clothing; coarse procedural fallback | Resculpted jacket/sleeve silhouettes, raised lapels and cuffs, collar coverage, pocket squares, softer hand poses; rebuilt fallback face/body/five-digit hands |
| Dealer elbows and hands | Elbows bent inward; palms followed forearms; finger curl formed a claw | Outward elbow constraints, horizontal dealing palm frame, relaxed fingers, explicit palm contact points |
| Shoe contact | Cached T-pose arm lengths disagreed with animated bone translations; shoe positions were outside practical reach | Current bone lengths, closer shoe/dealer positions, real shoe mouth geometry, tested pickup contact within 7 mm |
| Card movement | Tall 25 cm arcs, overshooting easing, invisible cards until release, competing animation hooks | Visible shoe pickup and hand tracking, release followed by decelerating low slides, sequential action recovery and cancellable lifetimes |
| Blackjack geometry | Half-cylinder base faced +X while felt faced +Z; solid floor-height cabinet and excessively high stools | Aligned half-disc, shallow apron and inset supports, aligned card zones, properly proportioned padded seating |
| Blackjack procedure | Rendering and split-hand gestures could interrupt each other | Explicit dealer order, preserved European no-hole-card rules, sequential split-hand actions and collection |
| Baccarat geometry | Dealer intersected a solid ellipse; shoe/card zones and working height disagreed | Shallow dealer cutout, open lower support, unchanged felt UV mapping, card zones/shoe/discard/rack alignment |
| Baccarat procedure | Cards visually alternated but were removed from the shoe in pairs | Actual shoe consumption P1–B1–P2–B2, followed by the existing third-card rule table; sideways third cards |
| Roulette construction | Flat number ring, inconsistent ball/pocket heights, abrupt endpoint reparenting | Stationary bowl and running track, sloped apron, fixed deflectors, raised rotor center, 37 recessed European pockets and brass dividers |
| Roulette motion | One easing curve drove both objects; the ball snapped into its result | Independent angular drag, fixed-step gravity descent, bounded pocket rebounds/capture, continuous exact result alignment and rotor coasting |
| Roulette collection | Distant chips flew toward an unmoving dealer | Dealer approaches along the table, uses a visible rake, collects on felt, returns to the bank and pushes exact payouts beside original stakes |
| Chip appearance and totals | Metallic-looking cylinders; 475 displayed as 500, 750 as 800; capped stacks lost value | Matte chips with edge inserts, stable stack spacing, exact denominations and counted remainder plaques |
| Cleanup | Timers and interrupted gestures could leave chips/cards moving after disposal | Frame-owned cancellable slides, card cancellation and late-event guards, spin/settlement generation guards |
| Lighting | Dark blue ambient obscured faces | Neutral fill and table lamps aimed to reveal faces and materials |

## Architecture retained and strengthened

The existing Three.js renderer and stable dealer facade remain. Table builders consume shared layout dimensions. Cards use one hand-contact/release helper; chips use one cancellable slide primitive. Roulette construction and motion consume the same geometry constants. Pure procedure, geometry and motion tests run with Node, including tests against the actual GLB skeleton.

The licensed GLB face, skeleton and animation assets are retained, with runtime geometry/clothing/pose improvements. The procedural fallback is rebuilt and supports the same pickup contact events. No new externally downloaded character assets are required.

## Verification

- Baseline: 130 tests passing.
- Final canonical casino suite: **178 tests passing**.
- Final published mirror suite: **178 tests passing**.
- `npm run build` in `portfolio`: **compiled successfully**.
- `git diff --check`: clean.
- Source/public directory comparison: identical.
- Full local blackjack flow: entered a table, placed a stub-wallet wager, dealt, hit, stood, completed dealer play/settlement and returned to betting; no browser warnings/errors observed.
- Dedicated review screen exercises the actual table builders, dealer rigs, card helper and roulette settlement with deterministic fixtures and no wallet.
- Final browser checks: baccarat completed its six-card Player 7 / Banker 8 demonstration, roulette settled in pocket 17 and completed collection/payout, and the rebuilt fallback dealer completed the three-card European blackjack opening. No warnings/errors were observed in these checks.
- Roulette tests cover every pocket, phase continuity, frame-rate independence, ball/divider clearance, exact payouts, cancellation and repeated-spin ownership. Independent trajectory sampling found no divider penetration across 333 sampled combinations.
- Geometry tests cover aligned blackjack footprint, shoe-mouth transforms, supported baccarat card/bet positions, fixed felt UVs, dealer cutout and lower foot clearance.

Reproduce:

```sh
node --test --test-concurrency=2 portfolio/src/game/casino-game/calculator/lobby-3d/tests/*.test.mjs
node --test --test-concurrency=2 portfolio/public/games/casino-game/lobby-3d/tests/*.test.mjs
cd portfolio && npm run build
```

Local full casino: `http://127.0.0.1:4319/games/casino-game/lobby-3d/index.html?stubwallet`

Local model review: `http://127.0.0.1:4319/games/casino-game/lobby-3d/tools/visual-review.html`

Fallback review: append `?fallback&game=blackjack` to the model-review URL. The normal casino only enables the stub wallet on localhost.

## Physical and product boundaries

Roulette is an **outcome-conditioned presentation simulation**. The existing game remains the authority for its result and wallet. This is not an independent rigid-body gambling outcome generator. The ball uses drag, gravity and collision clearance with a constrained capture stage; cards and chips use authored dealer contact and friction-like slides, not a general-purpose rigid-body engine.

Cards remain enlarged for first-person readability. Dealers are stylized, with runtime tailoring of the existing licensed model rather than newly authored cinematic characters. Baccarat remains the existing ambient demonstration in the floor; this task does not add a new native wager interface. The full roulette wallet/iframe backend transaction path was not exercised; wheel and settlement actions were exercised through the no-wallet review screen and tests.

The local server must remain running to use the preview. Screenshots are saved under `output/playwright/casino-3d/` and are excluded by the repository's existing PNG ignore rule.

Final captures: [dealer](../../output/playwright/casino-3d/dealer-final.png), [baccarat](../../output/playwright/casino-3d/baccarat-final.png), [roulette](../../output/playwright/casino-3d/roulette-final.png).

## Procedure and construction references

- [GRA blackjack rules, dealing procedure §3.18](https://www.gra.gov.sg/docs/default-source/game-rules/mbs/blackjack-pontoon-games/mbs-blackjack-v6.pdf): clockwise procedure from the dealer's left. Existing European no-hole-card rules are preserved.
- [GRA baccarat rules §3.10](https://www.gra.gov.sg/docs/default-source/game-rules/rws/baccarat-games/rws-game-rules---commission-baccarat-with-super-six-plus-v5.pdf): Player and Banker dealing order and third-card rules.
- [Roulette wheel patent US20200211327A1](https://patents.google.com/patent/US20200211327A1/en): upper running track, lower inclined surface, deflectors, rotor and pockets.

These references informed construction and procedure; they do not certify the simulation or establish one universal casino layout.
