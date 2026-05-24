// verify/fixtures.mjs
// Single source of truth for checkpoint test fixtures.
//
// `checkpoints`: [handN, expectedEvBefore_USD, expectedWinningsBefore_USD]
//   USER-PROVIDED VALUES from the GGPoker app's EV graph, before-rake view.
//   These are the source of truth — code must match them exactly. If a
//   checkpoint mismatches, the bug is in compute / parser / equity, NOT in
//   the expected values.
//
// `final*` fields: filled by `node verify/verify-checkpoints.mjs --pin <key>`
//   only AFTER every checkpoint matches. `null` means "not yet pinned — tests
//   will fail" (intentional, prevents silent skipping).
//
// Paths are overridable via env vars so the fixture data can move without
// editing this file.

export const FIXTURES = {
  '30125': {
    label: '30125 hands (Downloads, two folders combined) — user-provided GGpoker checkpoints',
    folders: [
      process.env.POKER_FIXTURE_30125_A
        ?? '/Users/hillmanchan/Downloads/0000019e-5ad9-b554-0000-0000280dc4e8',
      process.env.POKER_FIXTURE_30125_B
        ?? '/Users/hillmanchan/Downloads/0000019e-5ada-9f72-0000-0000280dc4e8',
    ],
    // We parse 30,122 unique hands; GG dashboard reports 30,125 (3 missing in our parse).
    // The user wants us to focus on the 30k checkpoints — final at 30,125 is informational.
    expectedHands: 30122,
    checkpoints: [
      [ 1000,  -0.44,  +0.47],
      [ 2000,  +4.46,  +5.27],
      [ 3000,  +5.40, +10.48],
      [ 4000,  +3.92,  +8.70],
      [ 5000, +11.29, +16.04],
      [ 6000, +27.18, +29.43],
      [ 7000, +24.98, +27.80],
      [ 8000, +25.46, +29.98],
      [ 9000, +29.50, +34.71],
      [10000, +31.86, +35.16],
      [11000, +29.00, +31.03],
      [12000, +30.71, +31.28],
      [13000, +35.87, +37.69],
      [14000, +37.76, +39.94],
      [15000, +35.31, +38.41],
      [16000, +37.33, +40.68],
      [17000, +32.32, +43.42],
      [18000, +39.72, +49.59],
      [19000, +44.19, +53.88],
      [20000, +45.53, +57.44],
      [21000, +46.50, +53.73],
      [22000, +57.30, +67.79],
      [23000, +65.39, +76.44],
      [24000, +61.11, +73.26],
      [25000, +66.32, +76.54],
      [26000, +64.86, +76.47],
      [27000, +76.20, +87.09],
      [28000, +69.61, +71.85],
      [29000, +76.40, +82.43],
      [30000, +71.99, +82.08],
    ],
    finalBbPer100Before: null,
    finalBbPer100After:  null,
    finalRakePaidUC:     null,
  },
};
