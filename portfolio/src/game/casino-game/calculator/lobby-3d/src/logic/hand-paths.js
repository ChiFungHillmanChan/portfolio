(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure IK hand-path data for engine/character.js. No THREE/DOM — node-
  // tested. See tests/hand-paths.test.mjs and the plan doc for the data
  // model. Positions are WORLD-space refs resolved at play() time, exactly
  // like gestures.js aim refs; offsets/arcs are meters.
  const REFS = ['shoe', 'target', 'rack', 'rim'];
  const EVENTS = ['grab', 'contact', 'release'];
  const EASINGS = ['inOutCubic', 'outCubic', 'outQuart', 'outBack'];

  const PATHS = {
    // draw from the shoe, sweep to the card spot, hand back to rest
    dealCard: { dur: 520, hands: { R: [
      { at: 0.28, ref: 'shoe', offset: [0, 0.03, 0], ease: 'outCubic', event: 'grab' },
      { at: 0.72, ref: 'target', offset: [0, 0.04, 0], arc: 0.10, event: 'release' },
      { at: 1.00, rest: true },
    ] } },
    // rake losing chips: touch the stack, drag to the rack
    sweepChips: { dur: 700, hands: { R: [
      { at: 0.32, ref: 'target', offset: [0, 0.03, 0], ease: 'outCubic', event: 'contact' },
      { at: 0.78, ref: 'rack', offset: [0, 0.05, 0], arc: 0.05 },
      { at: 1.00, rest: true },
    ] } },
    // pay from the rack out to the winning spot
    payChips: { dur: 700, hands: { R: [
      { at: 0.30, ref: 'rack', offset: [0, 0.04, 0], ease: 'outCubic', event: 'grab' },
      { at: 0.74, ref: 'target', offset: [0, 0.04, 0], arc: 0.07, event: 'release' },
      { at: 1.00, rest: true },
    ] } },
    // reach and rest fingers on the wheel rim (spinFollow completes it)
    spinReach: { dur: 480, hands: { R: [
      { at: 1.00, ref: 'rim', offset: [0, 0.02, 0], ease: 'outCubic', event: 'contact' },
    ] } },
    // the flick: drag along the rim tangent, then return to rest
    spinFollow: { dur: 650, hands: { R: [
      { at: 0.30, ref: 'rim', offset: [0.16, 0.02, 0.10], ease: 'outBack', event: 'release' },
      { at: 1.00, rest: true },
    ] } },
    // carry the dolly from the rack to the winning number
    placeDolly: { dur: 800, hands: { R: [
      { at: 0.28, ref: 'rack', offset: [0, 0.04, 0], ease: 'outCubic', event: 'grab' },
      { at: 0.76, ref: 'target', offset: [0, 0.05, 0], arc: 0.12, event: 'release' },
      { at: 1.00, rest: true },
    ] } },
    // double-tap the chip rack (buy-in beat)
    tapRack: { dur: 620, hands: { R: [
      { at: 0.30, ref: 'rack', offset: [0, 0.03, 0], ease: 'outCubic', event: 'contact' },
      { at: 0.48, ref: 'rack', offset: [0, 0.09, 0] },
      { at: 0.66, ref: 'rack', offset: [0, 0.03, 0], event: 'contact' },
      { at: 1.00, rest: true },
    ] } },
    // two-hand circular wash over the felt around 'target'; counter-phase
    // circles; cycle:true so consecutive plays chain into a smear
    washCards: { dur: 1600, cycle: true, hands: {
      L: [
        { at: 0.25, ref: 'target', offset: [-0.16, 0.03, -0.08] },
        { at: 0.50, ref: 'target', offset: [-0.06, 0.03, -0.16] },
        { at: 0.75, ref: 'target', offset: [0.02, 0.03, -0.06] },
        { at: 1.00, ref: 'target', offset: [-0.16, 0.03, -0.08] },
      ],
      R: [
        { at: 0.25, ref: 'target', offset: [0.14, 0.03, 0.06] },
        { at: 0.50, ref: 'target', offset: [0.04, 0.03, 0.14] },
        { at: 0.75, ref: 'target', offset: [-0.04, 0.03, 0.04] },
        { at: 1.00, ref: 'target', offset: [0.14, 0.03, 0.06] },
      ],
    } },
    // riffle at 'target': hands together, alternate lift/drop; cycle:true
    shuffleRiffle: { dur: 1100, cycle: true, hands: {
      L: [
        { at: 0.20, ref: 'target', offset: [-0.07, 0.05, 0], ease: 'outCubic' },
        { at: 0.45, ref: 'target', offset: [-0.05, 0.10, 0.02] },
        { at: 0.70, ref: 'target', offset: [-0.07, 0.04, 0] },
        { at: 1.00, ref: 'target', offset: [-0.07, 0.05, 0] },
      ],
      R: [
        { at: 0.20, ref: 'target', offset: [0.07, 0.05, 0], ease: 'outCubic' },
        { at: 0.45, ref: 'target', offset: [0.05, 0.04, 0.02] },
        { at: 0.70, ref: 'target', offset: [0.07, 0.10, 0] },
        { at: 1.00, ref: 'target', offset: [0.07, 0.05, 0] },
      ],
    } },
  };

  function validatePath(p) {
    const errs = [];
    if (!p || typeof p !== 'object') return ['path is not an object'];
    if (!(p.dur > 0)) errs.push('dur must be > 0');
    const hands = p.hands || {};
    const sides = Object.keys(hands);
    if (!sides.length) errs.push('hands empty');
    for (const side of sides) {
      if (side !== 'L' && side !== 'R') { errs.push(`unknown hand ${side}`); continue; }
      const wps = hands[side];
      if (!Array.isArray(wps) || !wps.length) { errs.push(`${side}: no waypoints`); continue; }
      let prev = 0;
      wps.forEach((w, i) => {
        if (!(w.at > prev && w.at <= 1)) errs.push(`${side}[${i}]: at must increase within (0,1]`);
        prev = w.at;
        const kinds = ['ref', 'pos', 'rest'].filter((k) => w[k] !== undefined);
        if (kinds.length !== 1) errs.push(`${side}[${i}]: exactly one of ref/pos/rest`);
        if (w.ref !== undefined && !REFS.includes(w.ref)) errs.push(`${side}[${i}]: unknown ref ${w.ref}`);
        if (w.pos !== undefined && !(Array.isArray(w.pos) && w.pos.length === 3))
          errs.push(`${side}[${i}]: pos must be [x,y,z]`);
        if (w.offset !== undefined && !(Array.isArray(w.offset) && w.offset.length === 3))
          errs.push(`${side}[${i}]: offset must be [x,y,z]`);
        if (w.event !== undefined && !EVENTS.includes(w.event)) errs.push(`${side}[${i}]: unknown event ${w.event}`);
        if (w.ease !== undefined && !EASINGS.includes(w.ease)) errs.push(`${side}[${i}]: unknown ease ${w.ease}`);
        if (w.arc !== undefined && !(w.arc >= 0)) errs.push(`${side}[${i}]: arc must be >= 0`);
      });
      if (wps[wps.length - 1].at !== 1) errs.push(`${side}: last waypoint must be at 1`);
    }
    return errs;
  }

  C.handPaths = { PATHS, REFS, EVENTS, validatePath };
})();
