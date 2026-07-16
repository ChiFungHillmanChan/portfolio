(() => {
  const C = (globalThis.CASINO ??= {});

  // GLB dealer characters: preload once, clone per dealer, mocap idle via
  // AnimationMixer, with a two-bone IK arm layer (Task 7, see makeImpl's
  // "IK bone aiming" / "IK path runner" sections) driving hand-path actions
  // (dealCard, sweepChips, payChips, spinReach, spinFollow, placeDolly,
  // tapRack) over that mocap base.
  // Bone/clip names below are taken from the real committed
  // assets/manifest.json (Quaternius universal rig, UE-style names, one
  // deviation: 'Head' is capitalized) — confirmed against the actual parsed
  // GLB via a node:vm harness (every mapped bone resolves, mixer.clipAction
  // plays without throwing). See task-5-report.md for the harness + output.
  const BONE_MAP = {
    hips: 'pelvis', spine: 'spine_01', chest: 'spine_03',
    neck: 'neck_01', head: 'Head',
    shoulderL: 'clavicle_l', upperArmL: 'upperarm_l', foreArmL: 'lowerarm_l', handL: 'hand_l',
    shoulderR: 'clavicle_r', upperArmR: 'upperarm_r', foreArmR: 'lowerarm_r', handR: 'hand_r',
  };
  const IDLE_CLIP = 'Idle_Loop';

  // Task 6: gesture -> mocap clip map. The brief guessed Quaternius names
  // (Wave/Yes/No) that do NOT exist in this committed pack — see
  // assets/manifest.json (dumped in task-6-report.md). Real available clips:
  // A_TPose, Dance_Loop, Hit_Chest, Hit_Head, Idle_Loop, Idle_Talking_Loop,
  // Idle_Torch_Loop, Interact, Jog_Fwd_Loop, PickUp_Table, Punch_Cross,
  // Punch_Jab, Sitting_*, Spell_Simple_*, Sprint_Loop, Walk_Formal_Loop,
  // Walk_Loop. Candidates tried in the browser at the vestibule (receptionist
  // wave-on-approach + the gate welcomeSweep) — see task-6-report.md for the
  // full comparison:
  //   - 'Interact' (2.0s): a two-handed forward-reach-and-return, reads
  //     clearly as an inviting "come in / this way" gesture at both its
  //     native speed (wave) and sped up under an ms override (welcomeSweep).
  //   - 'Spell_Simple_Shoot' (0.5s): one arm snaps up to a raised
  //     palm-forward "halt!" pose almost instantly, then drops — too fast
  //     and forceful to land as a welcome, and over so quick it's barely
  //     perceptible at native speed — rejected for both.
  //   - 'PickUp_Table' (0.833s): both arms reach DOWN toward table height
  //     with a forward lean — wrong silhouette entirely for a standing
  //     greeting/usher gesture — rejected.
  // Chosen: BOTH gesture names map to 'Interact', same clip at different
  // speeds (native ~2s for the unhurried lobby-entry wave, sped up via the
  // caller's existing `ms: 900` override for the brisker gate-side sweep) —
  // exactly the "same clip, different ms" shape the task called out as an
  // acceptable outcome.
  const MOCAP_MAP = {
    wave: { clip: 'Interact', track: 'arms' },
    welcomeSweep: { clip: 'Interact', track: 'arms' },
  };

  // nod / headShake: NO mocap clip exists for either (nothing in the pack
  // reads as an acknowledgement nod or a refusal head-shake — the closest,
  // Hit_Head, is a reaction-to-impact flinch, not a voluntary gesture).
  // Implemented as procedural one-shot deltas on the neck_01 bone instead,
  // mirroring the OLD procedural rig's feel (src/logic/gestures.js
  // CLIPS.nod/headShake): nod pitches down ~0.28 rad and back over 550ms;
  // headShake yaws ±0.3 rad over 650ms. See makeImpl's applyHeadGesture()
  // for the post-mixer application mechanics (mixer.update() overwrites bone
  // transforms every call, so this must layer on AFTER it, every frame —
  // same trick applyLook() already uses for the look-at layer).
  const HEAD_GESTURES = {
    nod: { dur: 550, axis: 'pitch', keys: [
      { at: 0.40, ease: 'outCubic', v: 0.28 },
      { at: 1.00, ease: 'inOutCubic', v: 0 },
    ] },
    headShake: { dur: 650, axis: 'yaw', keys: [
      { at: 0.20, ease: 'inOutCubic', v: 0.3 },
      { at: 0.45, ease: 'inOutCubic', v: -0.3 },
      { at: 0.70, ease: 'inOutCubic', v: 0.18 },
      { at: 1.00, ease: 'inOutCubic', v: 0 },
    ] },
  };
  const HEAD_EASE = {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };
  // Samples a {at,ease,v} keyframe curve at fraction t in [0,1], with an
  // implicit (0, v:0) start key — the gesture is an ADDITIVE offset from
  // whatever the mixer/look-at layer already put on the bone this frame, so
  // it always starts and ends at 0 (a no-op offset) by construction.
  function sampleHeadCurve(keys, t) {
    let prevAt = 0, prevV = 0;
    for (const k of keys) {
      if (t <= k.at) {
        const span = k.at - prevAt;
        const lt = span <= 0 ? 1 : Math.max(0, Math.min(1, (t - prevAt) / span));
        return prevV + (k.v - prevV) * HEAD_EASE[k.ease](lt);
      }
      prevAt = k.at; prevV = k.v;
    }
    return keys[keys.length - 1].v;
  }

  const state = { ready: null, template: null, clips: null, pending: [], failed: false };

  async function fetchGlb(url, timeoutMs = 10000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return await res.arrayBuffer();
    } finally { clearTimeout(timer); }
  }

  const parseGlb = (buf) => new Promise((resolve, reject) =>
    new THREE.GLTFLoader().parse(buf, '', resolve, reject));

  async function preload(baseUrl = './assets/') {
    if (state.ready) return;
    state.ready = 'loading';
    try {
      const [charBuf, clipBuf] = await Promise.all([
        fetchGlb(baseUrl + 'dealer-characters.glb'),
        fetchGlb(baseUrl + 'dealer-clips.glb'),
      ]);
      const [charGltf, clipGltf] = await Promise.all([parseGlb(charBuf), parseGlb(clipBuf)]);
      // validate every mapped bone exists
      const names = new Set();
      charGltf.scene.traverse((o) => names.add(o.name));
      for (const bone of Object.values(BONE_MAP)) {
        if (!names.has(bone)) throw new Error(`bone missing from GLB: ${bone}`);
      }
      state.template = charGltf.scene;
      state.clips = clipGltf.animations.concat(charGltf.animations);
      if (!state.clips.find((c) => c.name === IDLE_CLIP)) throw new Error(`idle clip missing: ${IDLE_CLIP}`);
      // v2 GLBs carry the tuxedo-bake landmarks in scene.extras (GLTFLoader
      // surfaces extras as userData) — without them the tint regions can't
      // be computed, so treat their absence as a load failure (fallback).
      const extras = charGltf.scene.userData || {};
      if (!extras.dealerLandmarks?.skinBase) throw new Error('dealerLandmarks missing from GLB');
      state.landmarks = extras.dealerLandmarks;
      state.hairstyles = extras.hairstyles || [];
      state.ready = 'ready';
      state.pending.splice(0).forEach((fn) => fn());
    } catch (err) {
      state.ready = 'failed';
      state.pending.length = 0;
      console.warn('[character] GLB dealers unavailable, keeping procedural rigs:', err.message);
    }
  }

  function findClip(name) { return state.clips.find((c) => c.name === name) || null; }

  // ---------------------------------------------------------------------
  // v2 dressing (docs/superpowers/specs/2026-07-17-dealer-glb-v2-fixes-
  // design.md). The tuxedo is BAKED into the body base-color texture by
  // tools/build-dealer-assets.mjs — crisp lapel/placket/cuff/belt lines in
  // UV space, face + hand skin texels kept from the original pack texture
  // (so the face has real shading and the eyes mesh has its pupil texture
  // back). The texture is painted in light NEUTRAL tones; per-dealer variety
  // comes from a per-vertex tint multiplied with the texture in the shader:
  //   SKIN     tint = SKINS[seed] / landmarks.skinBase (ratio keeps the
  //            texture's own face shading, just shifts the tone)
  //   SUIT     tint = VESTS[seed] (jacket painted ~0.79 gray -> dark suit)
  //   TROUSERS fixed charcoal (belt texels are near-black already)
  //   WHITE    shirt/cuffs/buttons/shoes — painted final in the texture
  // Vertex regions use the SAME bind-pose position rules as the texture
  // bake — the numbers travel inside the GLB (scene.extras.dealerLandmarks),
  // so bake and runtime can never drift apart. Boundary triangles blend the
  // tint across one edge; the crisp texture lines dominate visually.
  const TROUSERS_TINT = [0.106, 0.118, 0.149];   // #1b1e26

  // Tint group of a bind-pose vertex — mirrors classify() in
  // tools/build-dealer-assets.mjs, collapsed to the four tint groups.
  function tintGroupAt(x, y, z, L) {
    const ax = Math.abs(x);
    if (y > L.collarY || ax > L.wristX) return 'SKIN';
    if (y < L.ankleY) return 'WHITE';                    // shoes: painted final
    if (ax > L.cuffX && y > 1.30) return 'WHITE';        // shirt cuffs
    if (y > L.collarBandY && z > 0 && ax < 0.09) return 'WHITE';  // collar edge
    if (y < L.beltTop) return 'TROUSERS';                // trousers + belt band
    if (z > L.frontZMin) {
      if (y >= L.vBottomY && y <= L.vTopY) {
        const half = L.vHalfTop * (y - L.vBottomY) / (L.vTopY - L.vBottomY);
        if (ax < half) return 'WHITE';                   // shirt V
      } else if (y < L.vBottomY && ax < L.placketHalf) {
        return 'WHITE';                                  // button placket
      }
    }
    return 'SUIT';
  }

  // Bakes the per-dealer tint as a 'color' BufferAttribute. The caller MUST
  // have cloned the geometry first — SkeletonUtils.clone() shares geometry
  // across every dealer clone, so writing here without cloning would leak
  // this dealer's tint onto all the others (see the call site).
  function bakeTintColors(geometry, L, skinTint, suitTint) {
    const pos = geometry.attributes.position;
    const groups = { SKIN: skinTint, SUIT: suitTint, TROUSERS: TROUSERS_TINT, WHITE: [1, 1, 1] };
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const g = groups[tintGroupAt(pos.getX(i), pos.getY(i), pos.getZ(i), L)];
      colors[i * 3] = g[0]; colors[i * 3 + 1] = g[1]; colors[i * 3 + 2] = g[2];
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  // Small gold bow tie riding the neck_01 BONE — an Object3D child of a
  // bone inherits its animated transform every frame for free (no per-frame
  // code needed), same trick rig.js's own procedural bow tie uses (see
  // rig.js ~L76-83), just parented to a GLB bone instead of a joint Group.
  //
  // Placement math: buildCharacter() runs before `group` is ever added to a
  // parent, and `group` itself carries an identity transform at this point
  // (table placement/rotation happens later, in floor/*.js, via
  // root.add(impl.group)) — so "world" space here IS the rig's own rest-
  // pose reference frame, and group-local +Z is "forward" (confirmed by
  // inspecting the Eyes mesh: its world-space Z sits well in front of the
  // Head bone's own Z in this rest pose). We express the collar offset in
  // that frame (small offset down + forward from neck_01's rest position,
  // wings splayed left/right) and convert into neck_01's local space via
  // its (already-updated) matrixWorld, so the result is correct regardless
  // of the neck bone's own local axis convention.
  function attachBowTie(group, neckBone) {
    if (!neckBone) return null;
    group.updateMatrixWorld(true);
    const gold = C.assets.goldMaterial();
    const coneGeo = new THREE.ConeGeometry(0.028, 0.05, 8);
    const knotGeo = new THREE.SphereGeometry(0.018, 8, 6);

    const neckWorldPos = new THREE.Vector3();
    neckBone.getWorldPosition(neckWorldPos);
    const neckWorldQuat = new THREE.Quaternion();
    neckBone.getWorldQuaternion(neckWorldQuat);
    const neckInvQuat = neckWorldQuat.clone().invert();
    const worldZAxis = new THREE.Vector3(0, 0, 1);

    const bow = new THREE.Group();
    bow.name = 'BowTie';
    for (const sx of [-1, 1]) {
      const cone = new THREE.Mesh(coneGeo, gold);
      const worldPos = neckWorldPos.clone().add(new THREE.Vector3(sx * 0.035, -0.05, 0.12));
      cone.position.copy(neckBone.worldToLocal(worldPos));
      const worldQuat = new THREE.Quaternion().setFromAxisAngle(worldZAxis, sx * Math.PI / 2);
      cone.quaternion.copy(neckInvQuat.clone().multiply(worldQuat));
      cone.castShadow = true;
      bow.add(cone);
    }
    const knot = new THREE.Mesh(knotGeo, gold);
    knot.position.copy(neckBone.worldToLocal(neckWorldPos.clone().add(new THREE.Vector3(0, -0.05, 0.125))));
    knot.castShadow = true;
    bow.add(knot);

    neckBone.add(bow);
    return bow;
  }

  function buildCharacter(opts) {
    const seed = String(opts.seed ?? '');
    let h = 9;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 0x9e3779b1);
    h = Math.abs(h >>> 0);
    const group = THREE.SkeletonUtils.clone(state.template);
    const L = state.landmarks;
    const P = C.rigPalettes;
    // skin tint = target palette tone / the texture's own average skin tone
    // (skinBase, measured by the bake tool) — a multiplier that re-tones the
    // textured face/hands without flattening their shading. Capped at 1.35
    // so pale palette entries can't blow out highlights.
    const base = L.skinBase;
    const skinC = new THREE.Color(P.SKINS[h % P.SKINS.length]);
    const skinTint = [
      Math.min(1.35, skinC.r * 255 / base[0]),
      Math.min(1.35, skinC.g * 255 / base[1]),
      Math.min(1.35, skinC.b * 255 / base[2]),
    ];
    const suitC = new THREE.Color(P.VESTS[(h >>> 6) % P.VESTS.length]);
    // jacket texels are painted ~0.79 gray — lift the dark vest palette a
    // touch so the suit reads as fabric, not a silhouette
    const suitTint = [Math.min(1, suitC.r * 2.2), Math.min(1, suitC.g * 2.2), Math.min(1, suitC.b * 2.2)];
    const hairColor = P.HAIRS[(h >>> 3) % P.HAIRS.length];

    // hairstyle pick: null = bald stays in rotation; beard composes on top.
    // Hair meshes ship in the GLB as static Armature children at bind-pose
    // world position; Object3D.attach() reparents one to the Head bone
    // keeping that placement, so it rides head animation rigidly (same trick
    // as the bow tie, minus the manual matrix math).
    const styles = [null, 'Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Buns', 'Hair_Long'];
    const hairPick = styles[(h >>> 9) % styles.length];
    const wantBeard = ((h >>> 13) % 10) < 3;

    group.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      o.material = o.material.clone();            // per-dealer tinting
      // match the flat-color lighting of the rest of the lobby: treat texel
      // values as-is instead of sRGB-decoding them (every other material in
      // the scene feeds plain hex colors through the same linear pipeline)
      if (o.material.map) o.material.map.encoding = THREE.LinearEncoding;
      const n = (o.material.name || '').toLowerCase();
      if (n.includes('eye')) return;              // MI_Eyes: pupil texture restored
      if (n.includes('hair')) { o.material.color.set(hairColor); return; }
      // MI_Superhero_Male: tuxedo texture × per-vertex tint
      if (o.isSkinnedMesh && o.geometry.attributes.position) {
        o.geometry = o.geometry.clone();
        bakeTintColors(o.geometry, L, skinTint, suitTint);
        o.material.vertexColors = true;
        o.material.color.set('#ffffff');
      }
    });

    const bones = {};
    for (const [logical, real] of Object.entries(BONE_MAP)) {
      bones[logical] = group.getObjectByName(real);
    }

    // attach the picked hairstyle (and maybe beard) to the Head bone; remove
    // the rest. updateMatrixWorld first so attach() sees bind-pose matrices.
    group.updateMatrixWorld(true);
    for (const name of state.hairstyles) {
      const node = group.getObjectByName(name);
      if (!node) continue;
      const keep = name === hairPick || (name === 'Hair_Beard' && wantBeard);
      if (keep && bones.head) bones.head.attach(node);
      else node.parent?.remove(node);
    }

    group.scale.setScalar(0.96 + ((h >>> 9) % 9) * 0.01);   // 0.96–1.04
    const bowTie = attachBowTie(group, bones.neck);
    return { group, bones, mixer: new THREE.AnimationMixer(group), hash: h, bowTie };
  }

  // charImpl: same method contract as rig.js's rig object.
  function makeImpl(app, built) {
    const { group, bones, mixer } = built;
    const tokens = { arms: 0, head: 0, body: 0, mouth: 0 };
    let idleHook = null;
    let idleAction = null;

    // ---- IK bone aiming (Task 7) ----
    // For each arm bone captured at build time: restDir = direction from the
    // bone to its child in the bone's LOCAL space (rest pose). Aiming =
    // rotate the bone so restDir points along a desired world direction.
    const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
    const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
    const armChains = {};
    for (const side of ['L', 'R']) {
      const upper = bones['upperArm' + side], fore = bones['foreArm' + side], hand = bones['hand' + side];
      if (!upper || !fore || !hand) continue;
      const upperLen = fore.position.length() * upper.getWorldScale(_v1).x;
      const foreLen = hand.position.length() * fore.getWorldScale(_v1).x;
      armChains[side] = {
        upper, fore, hand, upperLen, foreLen,
        restDirUpper: fore.position.clone().normalize(),   // child dir in upper's local space
        restDirFore: hand.position.clone().normalize(),
      };
    }

    // Rotate `bone` so that `restDir` (local) points at world direction `dirW`.
    function aimBone(bone, restDir, dirW, weight) {
      bone.parent.getWorldQuaternion(_q1);
      _v1.copy(dirW).applyQuaternion(_q2.copy(_q1).invert());   // desired dir, parent-local
      _q2.setFromUnitVectors(restDir, _v1.normalize());
      if (weight >= 1) bone.quaternion.copy(_q2);
      else bone.quaternion.slerp(_q2, weight);
    }

    // Solve + apply one arm toward a world-space hand target. Pole = down-
    // and-out from the shoulder in the character's own facing frame — the
    // ±0.6/-1/0.15 values are the brief's starting point, verified in the
    // browser (task-7-report.md) to keep the elbow bending naturally
    // downward-out at every routed path with no torso clipping / turret-arm.
    function applyArmIK(side, targetW, weight) {
      const ch = armChains[side];
      if (!ch || weight <= 0) return;
      ch.upper.getWorldPosition(_v3);
      const s = [_v3.x, _v3.y, _v3.z];
      group.getWorldQuaternion(_q1);
      _v2.set(side === 'L' ? -0.6 : 0.6, -1, 0.15).applyQuaternion(_q1);
      const r = C.ik.solveTwoBone({
        shoulder: s, target: [targetW.x, targetW.y, targetW.z],
        upperLen: ch.upperLen, foreLen: ch.foreLen, pole: [_v2.x, _v2.y, _v2.z],
      });
      aimBone(ch.upper, ch.restDirUpper,
        _v1.set(r.elbow[0] - s[0], r.elbow[1] - s[1], r.elbow[2] - s[2]), weight);
      ch.upper.updateWorldMatrix(true, false);
      ch.fore.getWorldPosition(_v3);
      aimBone(ch.fore, ch.restDirFore,
        _v1.set(r.hand[0] - _v3.x, r.hand[1] - _v3.y, r.hand[2] - _v3.z), weight);
    }

    // ---- IK path runner (single-hand for Task 7; Task 8 extends to
    // two-hand cycles — the per-hand data model already supports it) ----
    // rotQ: the character root group's WORLD quaternion, resolved ONCE per
    // playPath() call (see the call site below) and threaded through here —
    // never re-queried per waypoint. wp.offset is authored in the dealer's
    // own facing frame (hand-paths.js — e.g. washCards' counter-phase
    // circles), so it must be rotated into world space before being added.
    // wp.pos and refs[wp.ref] are already world-space (resolved by the
    // caller — table setup code converts local table coords via
    // toW()/group.localToWorld() before ever reaching playPath's refs), so
    // they must NOT be rotated again — only the offset rotates.
    function resolveWaypointPos(wp, refs, side, rotQ) {
      if (wp.rest) {
        const ch = armChains[side];
        ch.upper.getWorldPosition(_v1);
        return _v1.add(_v2.set(0, -(ch.upperLen + ch.foreLen) * 0.82, 0.10).applyQuaternion(rotQ)).clone();
      }
      const base = wp.pos ? _v1.set(...wp.pos) : _v1.set(...refs[wp.ref]);
      if (wp.offset) base.add(_v2.set(...wp.offset).applyQuaternion(rotQ));
      return base.clone();
    }

    // Table setups sometimes omit a ref that was already supplied by an
    // immediately-preceding call on the same arm (e.g. roulette-table.js
    // fires spinReach with a `rim` ref, then spinFollow with `{}` — that call
    // site is unchanged from the OLD procedural rig, whose spinFollow clip
    // needs no aim ref at all). `lastRefs` is a per-dealer cache of the last
    // WORLD position seen for each ref key; playPath resolves against
    // `{...lastRefs, ...callRefs}` (explicit refs from THIS call always win)
    // so a hand-path can still resolve without touching the frozen table
    // files. A ref that has NEVER been supplied (by this or any prior call)
    // still hits the missing-ref guard below.
    const lastRefs = {};
    const warnedMissingRefs = new Set();

    const RAMP = 120;
    let activePath = null;   // { token, gen, path, hands, on, dur, holdAtEnd, t0, holding,
                              //   resolved, released, resolveOnce, finish } | null

    function playPath(name, { refs: callRefs = {}, ms, on = {} } = {}) {
      const path = C.handPaths.PATHS[name];
      if (!path) return Promise.resolve();
      const refs = Object.assign({}, lastRefs, callRefs);
      // Missing-ref guard (Task 8 originally; pulled forward since this task
      // owns playPath): resolve every waypoint's ref BEFORE touching
      // tokens.arms — a call that can't resolve must not cancel whatever arm
      // action is already running, and must never hand a NaN target to the IK
      // solver. Warn once per path name (not per call) so a repeatedly-wrong
      // caller can't spam the console.
      for (const wps of Object.values(path.hands)) {
        for (const w of wps) {
          if (w.ref && !refs[w.ref]) {
            if (!warnedMissingRefs.has(name)) {
              warnedMissingRefs.add(name);
              console.warn(`[character] playPath('${name}'): missing ref '${w.ref}', skipping`);
            }
            return Promise.resolve();
          }
        }
      }
      Object.assign(lastRefs, callRefs);
      const token = ++tokens.arms;   // cancels any running mocap one-shot on 'arms' AND any active path
      const gen = app.roomGen;
      const dur = ms || path.dur;
      if (app.REDUCED) return Promise.resolve();
      // per-hand: waypoints resolved to world Vector3s up front (refs are
      // static per call, same semantics as gestures.js). rotQ resolved once
      // here (dealers don't rotate mid-path) and reused for every waypoint's
      // offset in resolveWaypointPos — not re-queried per waypoint/frame.
      group.getWorldQuaternion(_q1);
      const hands = Object.entries(path.hands).map(([side, wps]) => ({
        side,
        chain: armChains[side],
        start: null,               // filled on first frame (current hand pos)
        wps: wps.map((w) => ({
          at: w.at, ease: C.tween.easings[w.ease || 'inOutCubic'],
          arc: w.arc || 0, event: w.event || null, fired: false,
          pos: resolveWaypointPos(w, refs, side, _q1),
        })),
      })).filter((h) => h.chain);
      if (!hands.length) return Promise.resolve();
      const release = acquireDrive();   // keep driveFrame ticking even without setIdle()
      // Some paths deliberately END extended (no final `rest` waypoint) so a
      // FOLLOW-ON path can pick up from there — e.g. spinReach ends "hand on
      // the rim" by design (hand-paths.js: "hold there (spinFollow completes
      // it)"), never returning to neutral itself. The non-cycle ramp-OUT
      // below exists to blend an arm smoothly back toward mocap as it
      // reaches a rest pose; applying it to a hold-style path would decay
      // the IK weight to ~0 at the exact moment it "completes", sagging the
      // hand off the target right when the next path needs to continue from
      // it (confirmed in the browser — see task-7-report.md). Ramp-out only
      // applies when the path both isn't a cycle AND actually ends at rest.
      const holdAtEnd = !path.cycle && !Object.values(path.hands).every((wps) => wps[wps.length - 1].rest);
      return new Promise((resolve) => {
        // Finding 1 (task-7 review): a second playPath while one is still
        // running — or parked in a holdAtEnd 'holding' state, see Finding 3
        // below — must not silently clobber `activePath`. Doing so skips the
        // outgoing entry's own finish() entirely: its promise never
        // resolves (caller hangs forever) AND its acquireDrive() release is
        // never called (the drive hook leaks). This fires constantly in
        // production (e.g. blackjack deals cards every ~420ms while a
        // dealCard IK path takes 520ms). Fix: finish() the outgoing entry
        // SYNCHRONOUSLY, right here, before installing the new one.
        // This is a DIFFERENT trigger than the per-frame token/roomGen check
        // in applyArmPath below — that check is UNCHANGED and remains the
        // mechanism for armsRest / a mocap one-shot / a roomGen change
        // finishing a path that isn't being directly superseded by another
        // playPath() call.
        if (activePath) activePath.finish();
        const entry = {
          token, gen, path, hands, on, dur, holdAtEnd, t0: performance.now(),
          holding: false, resolved: false, released: false,
          // Resolves the caller's promise exactly once. Split out from
          // finish() so a holdAtEnd entry can resolve its await at logical
          // completion (Finding 3) while staying `activePath` — finish()
          // itself (which also releases the drive + nulls activePath) only
          // runs later, when something actually ends the hold.
          resolveOnce() {
            if (entry.resolved) return;
            entry.resolved = true;
            resolve();
          },
          finish() {
            entry.resolveOnce();
            if (activePath === entry) activePath = null;
            if (!entry.released) { entry.released = true; release(); }
          },
        };
        activePath = entry;
      });
    }

    // Advances the current IK path (if any) one frame. Called from
    // driveFrame, AFTER mixer.update() — see driveFrame's ordering comment.
    // Dropping `activePath` (natural completion OR a token/room-gen bump
    // from armsRest / a competing playPath / a mocap one-shot) is the entire
    // "release": the `w` ramp handles blend-in and non-cycle blend-out, and
    // once this stops running, mixer.update() simply keeps overwriting the
    // arm bones every frame — there is no separate rampOut step (see
    // task-7-report.md for why the brief's rampOut sketch was dropped).
    function applyArmPath() {
      const ap = activePath;
      if (!ap) return;
      if (tokens.arms !== ap.token || app.roomGen !== ap.gen) { ap.finish(); return; }
      const now = performance.now();
      const t = Math.min(1, (now - ap.t0) / ap.dur);
      const w = Math.min(1, (now - ap.t0) / RAMP)
        * (ap.path.cycle || ap.holdAtEnd ? 1 : Math.min(1, ((1 - t) * ap.dur) / RAMP + 0.001));
      for (const h of ap.hands) {
        if (!h.start) { h.chain.hand.getWorldPosition(_v3); h.start = _v3.clone(); }
        // find current segment
        let prevAt = 0, prevPos = h.start, cur = h.wps[h.wps.length - 1];
        for (const wp of h.wps) {
          if (t <= wp.at || wp === h.wps[h.wps.length - 1]) { cur = wp; break; }
          prevAt = wp.at; prevPos = wp.pos;
        }
        const span = Math.max(1e-4, cur.at - prevAt);
        const st = Math.min(1, (t - prevAt) / span);
        const e = cur.ease(st);
        const pos = _v1.copy(prevPos).lerp(cur.pos, e);
        pos.y += cur.arc * 4 * st * (1 - st);
        applyArmIK(h.side, pos, w);
        // Finding 2 (task-7 review): firing used to be tied to the CURRENT
        // segment's eased tail (`cur.event && st>=0.995`) — for a fast
        // segment (e.g. tapRack's first waypoint) that's a sub-millisecond
        // window; one jank frame skips it permanently, and Task 9 builds
        // card-release/wheel-kick timing on these events. Fix: decoupled,
        // catch-up semantics. Every frame, walk ALL of this hand's
        // waypoints in array order and fire every not-yet-fired event
        // waypoint whose `wp.at <= t` — so a big dt that jumps straight past
        // several waypoints in one tick still fires each of their events,
        // in waypoint order, using the hand bone's CURRENT world position
        // (wherever this frame's IK actually placed it — not the waypoint's
        // own historical target; there's no going back in time for that).
        // A path that gets superseded/cancelled — via the token/roomGen
        // check above or via playPath's supersession pre-emption — simply
        // stops ticking this loop from that point on: its remaining unfired
        // events stay unfired, by design. Task 9's callers own their
        // fallbacks for that case.
        for (const wp of h.wps) {
          if (wp.event && !wp.fired && wp.at <= t) {
            wp.fired = true;
            h.chain.hand.getWorldPosition(_v2);
            ap.on[wp.event]?.(_v2.clone());
          }
        }
      }
      if (t >= 1) {
        if (ap.holdAtEnd) {
          // Finding 3 (task-7 review): a real hold. At t>=1, ap.finish()
          // used to run unconditionally — nulling activePath so the very
          // next mixer.update() would sag the arm back toward the mocap
          // pose; a caller only ever *saw* a hold because it happened to
          // chain a follow-on path in the await microtask (e.g. spinReach ->
          // spinFollow). Fix: resolve the caller's await now (the contract
          // is "logically complete", callers must not hang) but keep this
          // entry installed as `activePath`, in a 'holding' state — the
          // per-hand loop above keeps running every frame at full weight
          // (the `w` ternary already treats holdAtEnd like a cycle), always
          // re-resolving to the SAME final waypoint (t stays clamped to 1,
          // so `cur`/`pos` are constant), so the arm keeps being aimed at
          // the resolved target instead of sagging. Ends the same way any
          // other active path ends: the token/roomGen check at the top of
          // this function (armsRest / a mocap one-shot / a roomGen change)
          // or playPath's supersession pre-emption — both funnel through
          // finish(), which is idempotent (resolveOnce + a `released` guard)
          // so there is no double-resolve/double-release no matter which
          // fires first or how many times this branch re-runs.
          if (!ap.holding) { ap.holding = true; ap.resolveOnce(); }
        } else {
          ap.finish();
        }
      }
    }

    // ---- Task 10: distance LOD (mixer throttle + shadow band) ----
    // lodAcc: dt accumulated while the mixer is being throttled — flushed
    // into the next mixer.update() call (whether that's another throttled
    // tick or a full-rate one) so animation TIME never skips or duplicates,
    // only the number of mixer.update() calls drops. wasFar: last known
    // distance band, so the castShadow traverse below only runs on the
    // frame the band actually changes, never every frame.
    let lodAcc = 0, wasFar = false;

    // Every per-frame "extra" layer (look-at, head gestures, IK arm paths) is
    // additive on TOP of whatever mixer.update() just wrote to the bones —
    // it must run in the SAME tick, right after mixer.update(), every single
    // frame, because AnimationMixer overwrites the bone transforms it drives
    // on every update() call (so anything applied on an earlier tick, or
    // before update(), gets silently stomped the very next frame). This is
    // the one function that is allowed to call mixer.update() — setIdle's own
    // hook and the temporary driver below both funnel through it so the
    // mixer is never advanced twice in the same frame.
    //
    // Task 10 LOD: a dealer whose root is beyond 10m from app.camera.position
    // AND is doing nothing but idle mocap has its mixer.update() batched down
    // to ~15Hz instead of every frame — dt accumulates in lodAcc and is
    // flushed as one lump update once it crosses 1/15s (still exactly one
    // mixer.update() call this function, same as before this task — just not
    // every call advances the mixer). The instant ANY transient action goes
    // active, this falls back to full-rate unconditionally (checked fresh
    // every frame, so a path starting/ending while far immediately reflects in
    // the very next tick) — chopping a dealing arm, a nod/shake, or a wave
    // down to 15Hz reads as visibly broken, per task-10-brief.md's caveat.
    // "Purely idle" = tempDriveRefs === 0: every one-shot that needs full-rate
    // mixer updates (an IK arm path, a procedural head gesture, OR a mocap
    // one-shot like wave/welcomeSweep) holds an acquireDrive() ref for its
    // whole duration, so that single count is the complete test. Checking
    // activePath/headGesture alone would MISS mocap one-shots (they set
    // neither) and drop a far wave to 15Hz. Any leftover lodAcc is folded into
    // that frame's dt so no animation time is lost on the throttled ->
    // full-rate transition. castShadow toggling is independent of the throttle
    // (a far dealer's shadow is imperceptible whether or not it happens to be
    // mid-gesture that frame) and only costs a traverse on the actual
    // band-change frame.
    function driveFrame(dt) {
      group.getWorldPosition(_v1);   // root position only — never bone-animated, safe pre-mixer
      const far = !!(app.camera && _v1.distanceTo(app.camera.position) > 10);
      if (far && tempDriveRefs === 0) {
        lodAcc += dt;
        if (lodAcc >= 1 / 15) { mixer.update(lodAcc); lodAcc = 0; }
      } else {
        mixer.update(lodAcc > 0 ? dt + lodAcc : dt);
        lodAcc = 0;
      }
      if (far !== wasFar) {
        wasFar = far;
        group.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = !far; });
      }
      applyLook();          // look-at layer, below
      applyHeadGesture();    // procedural nod/headShake layer, below
      applyArmPath();        // IK arm layer, above — also must run post-mixer
    }

    function setIdle() {
      if (app.REDUCED || idleHook) return idleHook;
      const gen = app.roomGen;
      idleAction = mixer.clipAction(findClip(IDLE_CLIP));
      idleAction.play();
      const hook = (dt) => {
        if (app.roomGen !== gen) { idleAction?.stop(); return app.offFrame(hook); }
        driveFrame(dt);
      };
      hook.cancel = () => app.offFrame(hook);
      app.onFrame(hook);
      idleHook = hook;
      return hook;
    }

    // ---- head look-at (same clamping/feel as rig.js) ----
    const look = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
    function applyLook() {
      look.yaw += (look.tYaw - look.yaw) * 0.12;
      look.pitch += (look.tPitch - look.pitch) * 0.12;
      if (bones.neck) {
        bones.neck.rotation.y += look.yaw * 0.4;
        bones.neck.rotation.x += look.pitch * 0.4;
      }
      if (bones.head) {
        bones.head.rotation.y += look.yaw * 0.6;
        bones.head.rotation.x += look.pitch * 0.6;
      }
    }
    function lookAt(_app, worldTarget) {
      const local = group.worldToLocal(new THREE.Vector3(...worldTarget));
      look.tYaw = Math.max(-0.7, Math.min(0.7, Math.atan2(local.x, local.z)));
      const flat = Math.hypot(local.x, local.z) || 1e-4;
      look.tPitch = Math.max(-0.35, Math.min(0.35, -Math.atan2(local.y - 1.5, flat)));
      if (app.REDUCED) { look.yaw = look.tYaw; look.pitch = look.tPitch; }
    }

    // ---- procedural head gesture layer (nod / headShake — see HEAD_GESTURES
    // doc comment up top for why these are procedural, not mocap clips) ----
    let headGesture = null;   // { spec: {dur,axis,keys}, t0, done } | null
    function applyHeadGesture() {
      if (!headGesture || !bones.neck) return;
      const g = headGesture;
      const t = g.spec.dur <= 0 ? 1 : Math.min(1, (performance.now() - g.t0) / g.spec.dur);
      const v = sampleHeadCurve(g.spec.keys, t);
      if (g.spec.axis === 'pitch') bones.neck.rotation.x += v;
      else bones.neck.rotation.y += v;
      if (t >= 1) g.done();
    }

    // Shared "keep the mixer + extra layers running" driver for one-shots
    // fired while setIdle() was never called (be safe — see Task 6 brief).
    // Ref-counted so a concurrent mocap one-shot (arms) and head gesture
    // (head) never both install their own hook and double-call
    // mixer.update() in the same frame; self-tears-down the instant a real
    // setIdle() hook takes over.
    let tempDriveHook = null, tempDriveRefs = 0;
    function acquireDrive() {
      tempDriveRefs += 1;
      if (!idleHook && !tempDriveHook) {
        const gen = app.roomGen;
        tempDriveHook = (dt) => {
          if (app.roomGen !== gen || idleHook) { app.offFrame(tempDriveHook); tempDriveHook = null; return; }
          driveFrame(dt);
        };
        app.onFrame(tempDriveHook);
      }
      return () => {
        tempDriveRefs = Math.max(0, tempDriveRefs - 1);
        if (tempDriveRefs === 0 && tempDriveHook) { app.offFrame(tempDriveHook); tempDriveHook = null; }
      };
    }

    function playHeadGesture(name, ms) {
      const spec = HEAD_GESTURES[name];
      const token = ++tokens.head;
      const gen = app.roomGen;
      if (app.REDUCED) return Promise.resolve();
      const release = acquireDrive();
      return new Promise((resolve) => {
        const entry = { spec: { ...spec, dur: ms || spec.dur }, t0: performance.now() };
        const done = () => {
          if (headGesture === entry) headGesture = null;
          app.offFrame(watch);
          release();
          resolve();
        };
        entry.done = done;
        headGesture = entry;
        const watch = () => {
          if (tokens.head !== token || app.roomGen !== gen) done();
        };
        watch.cancel = done;
        app.onFrame(watch);
      });
    }

    function playMocap(name, ms) {
      const entry = MOCAP_MAP[name];
      const clip = findClip(entry.clip);
      if (!clip) return Promise.resolve();
      const token = ++tokens[entry.track];
      const gen = app.roomGen;
      const action = mixer.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
      action.timeScale = ms ? (clip.duration * 1000) / ms : 1;
      if (app.REDUCED) return Promise.resolve();
      idleAction && action.crossFadeFrom(idleAction, 0.25, false);
      action.play();
      const release = acquireDrive();
      return new Promise((resolve) => {
        const done = () => {
          mixer.removeEventListener('finished', onFin);
          app.offFrame(watch);
          if (idleAction) { idleAction.reset(); idleAction.play(); action.crossFadeTo(idleAction, 0.25, false); }
          release();
          resolve();
        };
        const onFin = (e) => { if (e.action === action) done(); };
        const watch = () => {
          if (tokens[entry.track] !== token || app.roomGen !== gen) { action.stop(); done(); }
        };
        watch.cancel = () => { action.stop(); done(); };
        mixer.addEventListener('finished', onFin);
        app.onFrame(watch);
      });
    }

    // play(): Task 6 adds mocap gestures (wave/welcomeSweep) + procedural
    // head one-shots (nod/headShake). Task 7 adds the IK action layer:
    // armsRest bumps tokens.arms alone (cancels a running mocap one-shot on
    // 'arms' AND any active IK path — see applyArmPath's token check; bones
    // fall back to the mixer's pose the very next frame, no separate ramp
    // needed), and every C.handPaths.PATHS name routes through playPath().
    function play(_a, name, opts = {}) {
      if (MOCAP_MAP[name]) return playMocap(name, opts.ms);
      if (HEAD_GESTURES[name]) return playHeadGesture(name, opts.ms);
      if (name === 'armsRest') { tokens.arms += 1; return Promise.resolve(); }
      if (C.handPaths.PATHS[name]) return playPath(name, opts);
      return Promise.resolve();
    }
    // See rig.js's stop() for why 'mouth' also cancels via stopBubble.
    const stop = (track) => {
      tokens[track] += 1;
      if (track === 'mouth') C.assets.stopBubble(group);
    };
    function say(_app, text, o = {}) {
      // GLB face is static — subtle head bob stands in for the mouth flap
      return C.assets.speechBubbleOn(app, group, text, {
        ...o,
        mouthPulse: (t) => { if (bones.head) bones.head.rotation.x += Math.sin(t / 140) * 0.02; },
      });
    }
    function dispose() {
      idleHook?.cancel(); idleHook = null;
      mixer.stopAllAction();
      group.parent?.remove(group);
    }

    return { group, bones, mixer, tokens, play, stop, say, lookAt, setIdle, dispose };
  }

  function attach(app, root, opts, onReady) {
    const build = () => {
      if (state.ready !== 'ready') return;
      const impl = makeImpl(app, buildCharacter(opts));
      root.add(impl.group);
      onReady(impl);
    };
    if (state.ready === 'ready') build();
    else if (state.ready === 'loading') state.pending.push(build);
    // 'failed' / null → never fires; procedural rig stays
  }

  C.character = { preload, attach, get ready() { return state.ready; } };
})();
