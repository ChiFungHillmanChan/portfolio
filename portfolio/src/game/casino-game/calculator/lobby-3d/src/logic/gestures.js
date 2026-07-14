(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure gesture data for the humanoid rig (src/engine/rig.js). No THREE/DOM —
  // node-testable. A clip animates named joints across keyframes on one track.
  //
  // Joint targets (exactly one per joint per key):
  //   {aim: 'refKey'} point the limb (local -Y) at a world ref resolved at
  //                   play time (rig.play refs option)
  //   {e: [x,y,z]}    euler offset (radians) applied relative to the REST pose
  //   {rest: true}    return to the stored rest pose
  const JOINTS = [
    'neck', 'spine',
    'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR',
    'hipL', 'hipR', 'kneeL', 'kneeR',
  ];
  const TRACKS = ['arms', 'head', 'body', 'mouth'];
  const EASINGS = ['inOutCubic', 'outCubic', 'outQuart', 'outBack'];

  const CLIPS = {
    // draw from the shoe (ref 'shoe') and sweep to the card spot (ref 'target')
    dealCard: { track: 'arms', dur: 520, keys: [
      { at: 0.30, ease: 'outCubic',   joints: { shoulderR: { aim: 'shoe' },   elbowR: { e: [-0.45, 0, 0] }, wristR: { e: [-0.2, 0, 0] } } },
      { at: 0.70, ease: 'inOutCubic', joints: { shoulderR: { aim: 'target' }, elbowR: { e: [-0.15, 0, 0] }, wristR: { e: [0.15, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true }, wristR: { rest: true } } },
    ] },
    // rake losing chips from 'target' into the rack ('rack')
    sweepChips: { track: 'arms', dur: 700, keys: [
      { at: 0.35, ease: 'outCubic',   joints: { shoulderR: { aim: 'target' }, elbowR: { e: [-0.2, 0, 0] } } },
      { at: 0.75, ease: 'inOutCubic', joints: { shoulderR: { aim: 'rack' } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    // push payout chips from 'rack' out to 'target'
    payChips: { track: 'arms', dur: 700, keys: [
      { at: 0.30, ease: 'outCubic',   joints: { shoulderR: { aim: 'rack' } } },
      { at: 0.70, ease: 'inOutCubic', joints: { shoulderR: { aim: 'target' }, wristR: { e: [0.3, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, wristR: { rest: true } } },
    ] },
    // reach to the wheel rim ('rim') — hold there (spinFollow completes it)
    spinReach: { track: 'arms', dur: 480, keys: [
      { at: 1.00, ease: 'outCubic', joints: { shoulderR: { aim: 'rim' }, elbowR: { e: [-0.35, 0, 0] } } },
    ] },
    // the flick + return to rest, fired as the wheel starts turning
    spinFollow: { track: 'arms', dur: 650, keys: [
      { at: 0.35, ease: 'outBack',    joints: { wristR: { e: [0, -1.2, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true }, wristR: { rest: true } } },
    ] },
    // carry the dolly from 'rack' to the winning number 'target'
    placeDolly: { track: 'arms', dur: 800, keys: [
      { at: 0.30, ease: 'outCubic',   joints: { shoulderR: { aim: 'rack' } } },
      { at: 0.75, ease: 'inOutCubic', joints: { shoulderR: { aim: 'target' }, elbowR: { e: [-0.2, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    // double-tap the chip rack ('rack') — the buy-in beat
    tapRack: { track: 'arms', dur: 620, keys: [
      { at: 0.30, ease: 'outCubic', joints: { shoulderR: { aim: 'rack' }, elbowR: { e: [-0.3, 0, 0] } } },
      { at: 0.50, ease: 'outCubic', joints: { elbowR: { e: [-0.15, 0, 0] } } },
      { at: 0.70, ease: 'outCubic', joints: { elbowR: { e: [-0.3, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    // greeting wave: raise the arm, two elbow swings, drop
    wave: { track: 'arms', dur: 1300, keys: [
      { at: 0.25, ease: 'outCubic',   joints: { shoulderR: { e: [0, 0, -2.4] }, elbowR: { e: [0, 0, -0.5] } } },
      { at: 0.45, ease: 'inOutCubic', joints: { elbowR: { e: [0, 0, 0.4] } } },
      { at: 0.62, ease: 'inOutCubic', joints: { elbowR: { e: [0, 0, -0.5] } } },
      { at: 0.80, ease: 'inOutCubic', joints: { elbowR: { e: [0, 0, 0.4] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    // open-palm sweep toward 'target' (this-way-please / old dealGesture)
    welcomeSweep: { track: 'arms', dur: 1100, keys: [
      { at: 0.35, ease: 'outCubic',   joints: { shoulderR: { aim: 'target' }, elbowR: { e: [-0.1, 0, 0] } } },
      { at: 0.75, ease: 'inOutCubic', joints: { shoulderR: { aim: 'target' } } },
      { at: 1.00, ease: 'inOutCubic', joints: { shoulderR: { rest: true }, elbowR: { rest: true } } },
    ] },
    nod: { track: 'head', dur: 550, keys: [
      { at: 0.40, ease: 'outCubic',   joints: { neck: { e: [0.28, 0, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { neck: { rest: true } } },
    ] },
    headShake: { track: 'head', dur: 650, keys: [
      { at: 0.20, ease: 'inOutCubic', joints: { neck: { e: [0, 0.3, 0] } } },
      { at: 0.45, ease: 'inOutCubic', joints: { neck: { e: [0, -0.3, 0] } } },
      { at: 0.70, ease: 'inOutCubic', joints: { neck: { e: [0, 0.18, 0] } } },
      { at: 1.00, ease: 'inOutCubic', joints: { neck: { rest: true } } },
    ] },
  };

  function validateClip(clip) {
    const errs = [];
    if (!clip || typeof clip !== 'object') return ['clip is not an object'];
    if (!TRACKS.includes(clip.track)) errs.push(`unknown track: ${clip.track}`);
    if (!(clip.dur > 0)) errs.push('dur must be > 0');
    if (!Array.isArray(clip.keys) || !clip.keys.length) { errs.push('keys empty'); return errs; }
    let prev = 0;
    clip.keys.forEach((k, i) => {
      if (!(k.at > prev && k.at <= 1)) errs.push(`key ${i}: at must increase within (0,1]`);
      prev = k.at;
      if (k.ease !== undefined && !EASINGS.includes(k.ease)) errs.push(`key ${i}: unknown ease ${k.ease}`);
      const joints = k.joints || {};
      if (!Object.keys(joints).length) errs.push(`key ${i}: no joints`);
      for (const [name, tgt] of Object.entries(joints)) {
        if (!JOINTS.includes(name)) errs.push(`key ${i}: unknown joint ${name}`);
        const kinds = ['aim', 'e', 'rest'].filter((f) => tgt[f] !== undefined);
        if (kinds.length !== 1) errs.push(`key ${i}: joint ${name} needs exactly one of aim/e/rest`);
        if (tgt.aim !== undefined && typeof tgt.aim !== 'string') errs.push(`key ${i}: ${name}.aim must be a string`);
        if (tgt.e !== undefined && !(Array.isArray(tgt.e) && tgt.e.length === 3 && tgt.e.every((n) => typeof n === 'number')))
          errs.push(`key ${i}: ${name}.e must be [x,y,z] numbers`);
      }
    });
    if (clip.keys[clip.keys.length - 1].at !== 1) errs.push('last key must be at 1');
    return errs;
  }

  // Word-wrap for speech bubbles: <= 3 lines, ellipsize overflow.
  function wrapLines(text, maxChars = 18) {
    const words = String(text).trim().split(/\s+/);
    const lines = [''];
    for (const w of words) {
      const cur = lines[lines.length - 1];
      if (!cur.length) lines[lines.length - 1] = w;
      else if ((cur + ' ' + w).length <= maxChars) lines[lines.length - 1] = cur + ' ' + w;
      else lines.push(w);
    }
    if (lines.length > 3) {
      const kept = lines.slice(0, 3);
      kept[2] = (kept[2].length >= maxChars ? kept[2].slice(0, maxChars - 1) : kept[2]) + '…';
      return kept;
    }
    return lines;
  }

  C.gestures = { JOINTS, TRACKS, EASINGS, CLIPS, validateClip, wrapLines };
})();
