// verify/fixtures.mjs
// Single source of truth for checkpoint test fixtures.
//
// `checkpoints`: [handN, expectedEvBefore_USD, expectedWinningsBefore_USD]
//   Pinned to the current compute pipeline output, cent precision. Original
//   anchor was the user's GG-app EV-graph reading; minor (≤±2¢) deltas vs the
//   GG chart UI come from per-hand equity quantization in evResult and are
//   within the chart's display precision. Both fixtures' values were captured
//   AFTER commit efcf7bb's rake-share fix.
//
// `final*` fields: pinned to current compute output. Filled by
// `node verify/verify-checkpoints.mjs --pin <key>`. `null` means "not yet
// pinned — tests will fail until you pin them" (intentional, prevents silent
// skipping).
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
      [  200,  +1.30,  +1.30],
      [  300,  -0.30,  +0.13],
      [  400,  +0.60,  +0.26],
      [  500,  -0.33,  -2.17],
      [  600,  -0.83,  -1.45],
      [  700,  -1.20,  -3.24],
      [  800,  +1.16,  -0.88],
      [  900,  +1.05,  -0.99],
      [ 1000,  +1.15,  -3.55],
      [ 1100,  +2.37,  -1.33],
      [ 1200,  +1.03,  -2.67],
      [ 1300,  +0.19,  -3.51],
      [ 1400,  +2.32,  -1.38],
      [ 1500,  +1.11,  -1.41],
      [ 1600,  +1.84,  -0.69],
      [ 1700,  +8.82,  +6.30],
      [ 1800, +11.04,  +8.52],
      [ 1815, +11.23,  +8.71],
    ],
    finalBbPer100Before: 23.986542699724517,
    finalBbPer100After:  17.079889807162534,
    finalRakePaidUC:     2397641n,
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
      [ 1000,  -0.45,  +0.51],
      [ 2000,  +4.44,  +5.28],
      [ 3000,  +5.39, +10.48],
      [ 4000,  +3.91,  +8.71],
      [ 5000, +11.26, +16.02],
      [ 6000, +27.13, +29.38],
      [ 7000, +24.92, +27.73],
      [ 8000, +25.36, +29.90],
      [ 9000, +29.39, +34.61],
      [10000, +31.70, +35.03],
      [11000, +28.91, +30.96],
      [12000, +30.82, +31.21],
      [13000, +35.97, +37.62],
      [14000, +37.82, +39.83],
      [15000, +35.37, +38.31],
      [16000, +37.47, +40.63],
      [17000, +32.43, +43.36],
      [18000, +39.83, +49.51],
      [19000, +44.38, +53.77],
      [20000, +45.70, +57.33],
      [21000, +46.71, +53.65],
      [22000, +57.41, +67.74],
      [23000, +65.65, +76.52],
      [23795, +65.35, +78.48],
    ],
    finalBbPer100Before: 16.491243328430347,
    finalBbPer100After:  8.781256566505569,
    finalRakePaidUC:     34480259n,
  },
};
