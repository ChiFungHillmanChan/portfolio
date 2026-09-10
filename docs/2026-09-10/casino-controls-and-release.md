# Casino movement and wallet access

- Corrected camera-relative strafing: D/Right move to the visible right; A/Left move to the visible left at every heading. W/Up and S/Down follow camera forward/back.
- Shift runs at 1.8 times walking speed (5.76 m/s versus 3.2 m/s), with normalized diagonal movement.
- Navigation buttons no longer swallow movement keys. Text inputs, selects and editable content retain normal editing; arrow steering prevents page scrolling, and blur clears held keys.
- Added a Buy chips action beside the wallet. It exchanges wallet money for chips immediately without moving the player or starting cashier choreography. It is also available during live table sessions.
- Live roulette receives a same-origin wallet refresh after purchases, including those made before the iframe finishes loading. Reads wait for initial wallet loading and active rounds; the iframe and current table remain open.
- Cashing chips back into money remains at the cashier. Existing cashier presentations and table minimum buy-ins remain available.
- Added a short controls hint on the entry screen and corrected the blackjack insufficient-chips message.

## Verification

- **234 tests passed** in each lobby source/public tree, plus **8 roulette bet-map tests**.
- Movement tests run the real application frame loop and THREE camera at six headings, covering all WASD/arrow keys, diagonal normalization, Shift, focus and blur.
- UI tests cover direct purchase, busy/double-click protection, invalid amounts, failure reporting and the absence of cash-out in the global wallet action.
- Browser purchase at the bar changed the stub balance from 100,000 chips / 50,000 wallet to 101,000 / 49,000 without camera navigation.
- Production CRA build compiled successfully; source/public comparison and `git diff --check` passed.

This release also includes the accepted dealer, roulette, baccarat, table, cashier and bar improvements recorded in the other September 10 reviews. Deployment uses the existing push-to-main GitHub Actions workflow and S3 target; no backend or deployment configuration is changed.
