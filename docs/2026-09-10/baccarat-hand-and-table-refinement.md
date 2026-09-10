# Baccarat hand and table refinement

Follow-up to the initial casino overhaul. The changes target baccarat; blackjack and roulette keep their existing choreography and table designs.

## Diagnosed causes

- The generic shoe-side pitch sent the left hand across the body to all Player slots. Actual GLB sampling showed its clamped release inside the chip rack and brief palm speeds around 20–25 m/s.
- Consecutive actions captured their starting position after the neutral pose had overwritten the preceding held pose, producing a visible reset.
- The ambient show started within nine metres, but the entrance walk triggered within six metres. Walking closer could relocate the dealer during a deal.
- The dealer post was too far behind the working area. The existing bay and rack also restricted how far the model could move forward.
- Separate tabletop flips lacked dealer contact, and settlement reused long, cross-body reaching gestures.

## Implemented

- Baccarat-specific two-hand draw, transfer, reveal hold, compact release and smooth rest. Cards turn at the transfer before landing face up; third cards turn sideways during the slide.
- Continuous action entry preserves the actual preceding palm position. This is opt-in for baccarat paths.
- Stationary dealer post at z=-0.74. A deeper knee recess, supported felt overhang and shallower chip rack accommodate the largest dealer model.
- Compact settlement gestures and a discard packet replace the long reaching gestures. Demonstration payouts now include the proper Banker commission instead of a fixed three-chip payout.
- Deep emerald woven felt, clearer Player/Banker/Tie markings, less decorative clutter, an upholstered rail, stitching and restrained brass trim. Existing bet and card coordinates remain aligned.
- Room-change guards prevent late actions and old cards returning to a new scene.

## Verification

- Canonical and published suites: **187 tests pass in each**.
- Production `npm run build`: successful.
- Source/public copies identical; `git diff --check` clean.
- Real GLB sampling across all nine dealer sizes: no palm penetration into the chip bank; dealing peak below 4.1 m/s. Regression checks cover shortest/tallest models, transfer event order, consecutive action continuity, rest and clearance.
- Browser: normal and slow six-card demos, fallback dealer, discard collection, and live-floor baccarat round/board update completed without warnings or errors.
- The preview offers Hand view, Slow motion and Collect cards controls.

[Baccarat preview](http://127.0.0.1:4321/games/casino-game/lobby-3d/tools/visual-review.html?game=baccarat)

![Updated baccarat table and dealer](../../output/playwright/casino-3d/baccarat-refined-hands.png)

The changes use authored contact and sliding animation; cards remain enlarged for readability. The existing long shoe-shuffle routine was not redesigned in this follow-up. No deployment or wallet/backend changes were made.

Procedure reference: [Tasmanian Treasury baccarat rules](https://www.treasury.tas.gov.au/Documents/BaccaratRules-Current8July2013.pdf) describe the initial Player–Banker–Player–Banker face-up sequence and subsequent face-up draws. The implementation exposes each card during the hand transfer.
