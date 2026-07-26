// Verifies the GATE, not the rig: exercises evaluate() from check-occlusion.mjs
// against synthetic and real-snapshot sample series, entirely independent of
// Python/PNG decoding (evaluate() is a pure function of pre-measured
// {aim, since, forearmPct, handPct} samples — importing check-occlusion.mjs
// does not run its measurement sweep, see the isMain guard at the bottom of
// that file). Fast enough to run on every `node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluate, STRIKE_LO, STRIKE_HI,
  HAND_IN_WINDOW_MAX_PCT, FOREARM_IN_WINDOW_MAX_PCT, OUTSIDE_WINDOW_TOLERANCE_PCT
} from './check-occlusion.mjs';
import { SWING_S } from '../../portfolio/public/games/da-siu-yan/rig.js';

const zero = (aim, since) => ({ aim, since, forearmPct: 0, handPct: 0 });

test('the strike window matches the Fix Round 1 adjudication', () => {
  assert.equal(STRIKE_LO, 0.090);
  assert.ok(Math.abs(STRIKE_HI - 0.165) < 1e-9, `expected 0.165, got ${STRIKE_HI}`);
});

// ── case 1 (required): a well-behaved series — coverage only appears at a
// single spike strictly inside the strike window, zero everywhere else —
// must pass. This is the shape the gate exists to ALLOW (the slap landing),
// synthesised the same way as cases 2-4 below so it isolates gate logic from
// measurement noise. ─────────────────────────────────────────────────────
test('a synthetic well-behaved series (spike inside the window only) passes', () => {
  const since0 = SWING_S / 2; // arbitrary point, reset below to land in-window
  const contactSince = (STRIKE_LO + STRIKE_HI) / 2; // dead centre of the window
  const samples = [
    zero(0, 0), zero(0, 0.03), zero(0, 0.06),
    { aim: 0, since: contactSince, forearmPct: 3.5, handPct: 30 }, // < caps, inside window
    zero(0, 0.20), zero(0, 0.30), zero(0, 0.45), zero(0, SWING_S)
  ];
  const result = evaluate(samples);
  assert.equal(result.pass, true, JSON.stringify(result.failures));
  assert.deepEqual(result.failures, []);
});

// ── case 1b (honesty check, not in the original 4): the REAL current
// 20-step x 3-aim sweep — transcribed from an actual `node
// check-occlusion.mjs` run against the live sprites/rig on 2026-07-26 — is
// NOT all-zero-outside-the-spike the way Fix Round 1's adjudication assumed.
// Only the nonzero rows are listed (every omitted (aim, since) combination
// in the real 60-row sweep measures exactly 0/0). This is exactly the shape
// case 1 above was meant to test for, EXCEPT for one thing: at aim=-0.22,
// since=0.0813 — 8.7ms BEFORE the strike window opens — the incoming swing
// already covers 2.4% of the sheet with the hand, rising to a measured
// ~32% by since=0.085 in a finer sweep (see task-6-report.md, Fix Round 2
// section). That is neither the round-1 recoil bug (window's upper end
// already accounts for that) nor anti-aliasing noise (2.4% is ~1225px, two
// orders of magnitude above OUTSIDE_WINDOW_TOLERANCE_PCT) — it is the
// swing's final approach sweeping over the sheet before CONTACT_S is
// reached, which the current window (grace only on the liftoff/high side)
// does not budget for. Documented here as a live regression indicator
// rather than silently omitted: this asserts what the gate ACTUALLY finds
// today, not what Fix Round 1 assumed it would find.
test('the real current 20-step sweep still fails — a pre-contact windup overlap, not the recoil bug', () => {
  const samples = [
    { aim: -0.22, since: 0.08131578947368421, forearmPct: 0, handPct: 2.4020 },
    { aim: -0.22, since: 0.10842105263157895, forearmPct: 4.0510, handPct: 29.9686 },
    { aim: -0.22, since: 0.13552631578947367, forearmPct: 0.8137, handPct: 33.6157 },
    { aim: 0, since: 0.10842105263157895, forearmPct: 1.2471, handPct: 31.5902 },
    { aim: 0, since: 0.13552631578947367, forearmPct: 0, handPct: 26.5745 },
    { aim: 0.22, since: 0.10842105263157895, forearmPct: 0, handPct: 26.8922 },
    { aim: 0.22, since: 0.13552631578947367, forearmPct: 0, handPct: 8.1431 },
    // representative all-zero rows from elsewhere in the real 60-row sweep
    zero(-0.22, 0), zero(-0.22, 0.16256578947368421), zero(-0.22, SWING_S),
    zero(0, 0.02710526315789474), zero(0.22, 0.4879605263157895)
  ];
  const result = evaluate(samples);
  assert.equal(result.pass, false);
  assert.equal(result.failures.length, 1, JSON.stringify(result.failures));
  const [f] = result.failures;
  assert.equal(f.metric, 'hand');
  assert.equal(f.aim, -0.22);
  assert.ok(Math.abs(f.since - 0.08131578947368421) < 1e-9);
  assert.equal(f.inWindow, false);
});

// ── case 2 (required): the ORIGINAL defect — the forearm covering the sheet
// across a broad plateau (since=0.054 through 0.190, not a spike) — must be
// rejected, and the OUT-OF-WINDOW samples in that plateau must be named in
// the failures so a reader can see exactly where the plateau breaches.
// (0.108/0.136/0.163 also breach — the in-window 5% cap — since 15% is well
// above it too; that is correct and expected, not asserted away here.) ────
test('the original broad-plateau forearm bug is rejected, naming the out-of-window points', () => {
  const plateauSince = [0.054, 0.081, 0.108, 0.136, 0.163, 0.190];
  const samples = plateauSince.map((since) => ({ aim: 0, since, forearmPct: 15, handPct: 0 }));
  const result = evaluate(samples);
  assert.equal(result.pass, false);

  const outOfWindowSince = plateauSince.filter((s) => s < STRIKE_LO || s > STRIKE_HI);
  assert.deepEqual(outOfWindowSince, [0.054, 0.081, 0.190]);
  const namedForearmFailures = result.failures
    .filter((f) => f.metric === 'forearm' && !f.inWindow)
    .map((f) => f.since);
  for (const since of outOfWindowSince) {
    assert.ok(namedForearmFailures.includes(since), `expected since=${since} in failures, got ${JSON.stringify(namedForearmFailures)}`);
  }
});

// ── case 3 (required): a hand parked on the sheet during late recoil — well
// past any plausible liftoff grace — must be rejected. ─────────────────────
test('a hand still on the sheet during late recoil is rejected', () => {
  assert.ok(0.25 > STRIKE_HI, 'fixture assumption: since=0.25 must be outside the window');
  const samples = [{ aim: 0, since: 0.25, forearmPct: 0, handPct: 30 }];
  const result = evaluate(samples);
  assert.equal(result.pass, false);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].metric, 'hand');
  assert.equal(result.failures[0].since, 0.25);
  assert.equal(result.failures[0].inWindow, false);
});

// ── case 4 (required): zero coverage everywhere passes, including samples
// that land inside the strike window (contact simply didn't paint any
// opaque sprite pixel over the sheet at that instant — legal, if unusual). ─
test('zero coverage everywhere passes, inside and outside the window alike', () => {
  const samples = [
    zero(-0.22, 0), zero(-0.22, STRIKE_LO), zero(-0.22, (STRIKE_LO + STRIKE_HI) / 2),
    zero(-0.22, STRIKE_HI), zero(0, 0.2), zero(0, SWING_S),
    zero(0.22, STRIKE_LO), zero(0.22, STRIKE_HI), zero(0.22, SWING_S)
  ];
  const result = evaluate(samples);
  assert.equal(result.pass, true);
  assert.deepEqual(result.failures, []);
});

// ── boundary sanity: caps are inclusive (<=), and the window edges
// themselves count as "inside". ─────────────────────────────────────────
test('values exactly at a cap pass; window boundaries count as inside', () => {
  const atCaps = evaluate([
    { aim: 0, since: STRIKE_LO, forearmPct: FOREARM_IN_WINDOW_MAX_PCT, handPct: HAND_IN_WINDOW_MAX_PCT },
    { aim: 0, since: STRIKE_HI, forearmPct: FOREARM_IN_WINDOW_MAX_PCT, handPct: HAND_IN_WINDOW_MAX_PCT },
    { aim: 0, since: STRIKE_LO - 1e-6, forearmPct: OUTSIDE_WINDOW_TOLERANCE_PCT, handPct: OUTSIDE_WINDOW_TOLERANCE_PCT }
  ]);
  assert.equal(atCaps.pass, true, JSON.stringify(atCaps.failures));

  const overCaps = evaluate([
    { aim: 0, since: STRIKE_LO - 1e-6, forearmPct: OUTSIDE_WINDOW_TOLERANCE_PCT + 0.001, handPct: 0 }
  ]);
  assert.equal(overCaps.pass, false);
});
