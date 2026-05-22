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
  '1815': {
    label: '1815 hands (Desktop, single folder)',
    folders: [
      process.env.POKER_FIXTURE_1815
        ?? '/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8',
    ],
    expectedHands: 1815,
    checkpoints: [
      [  100,  +0.81,  +0.81],
      [  200,  +1.31,  +1.31],
      [  300,  -0.28,  +0.15],
      [  400,  +0.61,  +0.27],
      [  500,  -0.33,  -2.17],
      [  600,  -0.84,  -1.46],
      [  700,  -1.22,  -3.25],
      [  800,  +1.15,  -0.88],
      [  900,  +1.04,  -0.99],
      [ 1000,  +1.13,  -3.55],
      [ 1100,  +2.35,  -1.33],
      [ 1200,  +1.01,  -2.67],
      [ 1300,  +0.17,  -3.51],
      [ 1400,  +2.30,  -1.38],
      [ 1500,  +1.10,  -1.41],
      [ 1600,  +1.83,  -0.68],
      [ 1700,  +8.82,  +6.31],
      [ 1800, +11.04,  +8.53],
      [ 1815, +11.23,  +8.72],
    ],
    finalBbPer100Before: null,
    finalBbPer100After:  null,
    finalRakePaidUC:     null,
  },

  '23795': {
    label: '23795 hands (Desktop, two folders combined)',
    folders: [
      process.env.POKER_FIXTURE_23795_A
        ?? '/Users/hillmanchan/Desktop/0000019e-4e65-4d50-0000-0000280dc4e8',
      process.env.POKER_FIXTURE_23795_B
        ?? '/Users/hillmanchan/Desktop/0000019e-4eed-7dc3-0000-0000280dc4e8',
    ],
    expectedHands: 23795,
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
      [23795, +65.28, +78.59],
    ],
    finalBbPer100Before: null,
    finalBbPer100After:  null,
    finalRakePaidUC:     null,
  },
};
