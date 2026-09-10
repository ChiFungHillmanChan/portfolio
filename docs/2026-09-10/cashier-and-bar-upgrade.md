# Cashier and bar service upgrade

The cashier and bartender now perform visible service actions in the existing 3D casino. The accepted table-game work is preserved.

## Cashier

- Replaced the obstructed grille with a clear service opening, walnut and brass cage, stone counter and warm task lighting.
- Added a safe, chip reserve shelves, cash drawer, transaction screen, receipt printer and motorized note counter.
- Buy-in counts the submitted notes and presents the corresponding chip values. Cash-out accepts chips, counts notes and slides the payout tray forward.
- Notes are fictional casino-credit vouchers. Prop totals match the amount exchanged, including fractional cash-out values.
- Machine feed, output and payout tray positions are within the actual character's reach. Eight pickup/release contacts are checked against the GLB character.

## Bar

- Added shaped, labelled bottles of whisky, gin, rum, vodka, tequila, orange liqueur and dry vermouth with visible liquid.
- Rebuilt the station with backlit shelves, a sink, speed rail, ice bin, shaker, jigger, spoon, strainer, soda siphon and glassware.
- Guests can order an Old Fashioned, vodka Martini or whisky Highball. Each has its own pouring, mixing and garnish sequence, followed by presentation on a napkin.
- The Martini's shaker is picked up and placed before pouring; shaking moves the forearm while keeping the shaker in the hand.
- Drink orders are complimentary and never call the wallet API.

## Shared movement and integration

`src/engine/service-motion.js` owns reusable palm-contact pickup, pose, placement and prop animation. Props remain attached to their local grip point through station transforms and rotation. Release settles the prop onto the requested surface before recovery. Room changes cancel pending work and remove service frame hooks.

The fallback character uses a service-only torso lean to reach the same workspace without stretching its arms. Static reserve chips use shared instanced geometry. Replaced drink and payout props dispose their owned GPU resources.

The cashier UI performs one wallet exchange and only then starts its presentation. Failure in presentation cannot report a committed transaction as failed. Controls prevent overlapping requests. Service cards sit to the side so the teller and bartender remain visible.

Service motion and liquid streams are directed animation, not a fluid simulation. Existing wallet logic and backend handlers are unchanged.

## Validation

- Full source and public test suites: **219 passed in each**, including service grip persistence during pouring and restoration on rest/cancellation.
- CRA production build: compiled successfully.
- Browser: both exchange directions completed; buying 1,000 then cashing out 1,000 returned the stub wallet to its initial balances.
- Browser: all three drinks completed; the integrated Martini and Old Fashioned orders left wallet balances unchanged.
- Browser: the procedural fallback bartender also completed the Old Fashioned; the main floor logged no warnings or errors during the service checks.
- Independent integration review found no actionable wallet-sequencing, teardown, concurrency or station-lifetime defects. Source/public comparison and `git diff --check` passed.
- Standalone inspection page: `lobby-3d/tools/services-review.html`, with station, counter/interior camera and recipe controls; `?fallback` exercises the procedural character.

Canonical code is in `portfolio/src/game/casino-game/calculator/lobby-3d/`, mirrored into `portfolio/public/games/casino-game/lobby-3d/`. No deployment or commit was made.
