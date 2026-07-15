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
  // Task 5b: dress the dealers. This asset pack's body mesh (material
  // MI_Superhero_Male) is the ENTIRE figure — face, hands, torso, legs —
  // in one draw call with no separate clothing geometry (see
  // task-5-report.md). Task 5 could only tint that one material a flat
  // skin tone (readable but "naked"). This bakes a per-vertex 'color'
  // attribute from the mesh's own skinIndex/skinWeight so different bone
  // regions read as different uniform pieces, with soft blending exactly
  // where the skin weights blend (collar, cuffs, waistband) instead of a
  // hard per-triangle cutoff.
  //
  // v2 (dealer uniform v2 — see task-5b-report.md "v2" section): the v1
  // light SHIRT sleeves read as bare skin at distance on this muscled
  // model. Sleeves now fold into VEST (dark suit-jacket arms + torso as one
  // fitted suit), and a separate position-gated "bib" override paints a
  // narrow white shirt-front onto the front-central-chest VEST vertices
  // (spine_02/spine_03-dominant) so there's still a visible shirt collar
  // under the bow tie, just no longer bare-looking sleeves.
  //
  // Bone -> region bucketing table (all 65 bones in assets/manifest.json;
  // see task-5b-report.md for the full reasoning):
  //   SKIN     Head, neck_01, hand_l/r, every finger bone (index/middle/
  //            ring/pinky/thumb, incl. the _04_leaf tip bones)
  //   VEST     spine_01/02/03, clavicle_l/r, upperarm_l/r, lowerarm_l/r
  //            (per-dealer, VESTS — v2: sleeves moved here from SHIRT, see
  //            above; torso + arms now read as one dark suit)
  //   TROUSERS pelvis, thigh_l/r, calf_l/r                (fixed dark charcoal)
  //   SHOES    foot_l/r, ball_l/r, ball_leaf_l/r          (fixed near-black)
  //   (none of the above) root, and anything unforeseen  -> walk up to the
  //            nearest ancestor BONE that resolves; if none does (root's
  //            own parent is the non-bone "Armature" node), default SHIRT
  //            (the light fabric tone — no bone maps here directly anymore,
  //            it only survives as this fallback + the bib override color).
  //            No actual vertices are expected to weight to 'root' — this
  //            path exists purely as a safety net for asset-pack surprises.
  const REGION_SHIRT_HEX = '#f2f0e8';     // rig.js's shirt tone; also the bib color (v2)
  const REGION_TROUSERS_HEX = '#1b1e26';  // dark charcoal
  const REGION_SHOES_HEX = '#14100c';     // near-black

  function regionForBoneName(name) {
    if (name === 'Head' || name === 'neck_01') return 'SKIN';
    if (/^hand_[lr]$/.test(name)) return 'SKIN';
    if (/^(index|middle|ring|pinky|thumb)_(0[1-3]|04_leaf)_[lr]$/.test(name)) return 'SKIN';
    // v2: sleeves (clavicle/upperarm/lowerarm) now VEST, not a separate light
    // SHIRT tone — see task-5b-report.md "v2" section for why (bare-skin
    // read at distance on this model).
    if (/^(clavicle|upperarm|lowerarm)_[lr]$/.test(name)) return 'VEST';
    if (/^spine_0[1-3]$/.test(name)) return 'VEST';
    if (name === 'pelvis' || /^(thigh|calf)_[lr]$/.test(name)) return 'TROUSERS';
    if (/^(foot|ball)(_leaf)?_[lr]$/.test(name)) return 'SHOES';
    return null;
  }
  function resolveBoneRegion(bone) {
    let cur = bone;
    while (cur) {
      const r = regionForBoneName(cur.name);
      if (r) return r;
      cur = cur.isBone ? cur.parent : null;
    }
    return 'SHIRT';
  }

  // Per-vertex "dominant" bone index = the single skinIndex/skinWeight slot
  // with the highest weight for that vertex (distinct from the full 4-slot
  // BLEND used elsewhere: the bib override needs a categorical yes/no —
  // "is this vertex primarily owned by spine_02/03" — not a blended color).
  function dominantBoneIndexAt(i, iArr, wArr, size) {
    let bestW = -1, bestIdx = -1;
    for (let k = 0; k < size; k++) {
      const w = wArr[i * size + k];
      if (w > bestW) { bestW = w; bestIdx = iArr[i * size + k]; }
    }
    return bestIdx;
  }

  // Computes the "shirt-front bib" bounding box directly from THIS mesh's
  // own bind-pose vertex positions (never guessed/hardcoded — see
  // task-5b-report.md "v2" for the node-probe numbers this was verified
  // against). All bounds are derived proportionally from real geometry:
  //   - lateralThresh: 15% of the chest's own lateral (X) extent, measured
  //     from spine_02/03-dominant vertices only (NOT the full body bbox —
  //     the full mesh bbox is T-pose arms-out and would give a wildly wrong
  //     "chest width").
  //   - forwardZMin: this body mesh is two open shells (front torso surface
  //     + back/spine surface) with a real gap between them near the
  //     centerline — confirmed empirically: restricted to |x| < lateralThresh,
  //     spine_02/03-dominant vertices split cleanly into a back cluster
  //     (z ~ -0.16..-0.07) and a front cluster (z ~ +0.06..+0.13) with
  //     nothing in between. forwardZMin is the midpoint of that real gap.
  //     (Away from the centerline the two shells nearly touch at the sides
  //     of the ribcage — this is why the gap MUST be measured only within
  //     the lateral band already established above, not across the whole
  //     chest.)
  //   - bibYMin/bibYMax: the vertical band actually spanned by those same
  //     front-cluster, laterally-centered spine_02/03 vertices, capped above
  //     by the base of the neck (min Y among neck_01-dominant vertices) —
  //     i.e. "upper chest, below the neck", matching the brief's wording.
  //   - Axis convention (+Z forward) is NOT guessed: task-5b-report.md
  //     already established +Z is forward for this rig (Eyes mesh sits at a
  //     more positive world Z than the Head bone itself, in this same rest
  //     pose). This function reuses that same convention for "front".
  function computeBibBounds(geometry, skeletonBones) {
    const posAttr = geometry.attributes.position;
    const skinIndexAttr = geometry.attributes.skinIndex;
    const skinWeightAttr = geometry.attributes.skinWeight;
    const pArr = posAttr.array, iArr = skinIndexAttr.array, wArr = skinWeightAttr.array;
    const size = skinIndexAttr.itemSize;
    const count = posAttr.count;
    const spine02Idx = skeletonBones.findIndex((b) => b.name === 'spine_02');
    const spine03Idx = skeletonBones.findIndex((b) => b.name === 'spine_03');
    const neckIdx = skeletonBones.findIndex((b) => b.name === 'neck_01');
    const isChestBone = (idx) => idx === spine02Idx || idx === spine03Idx;

    // Pass 1: chest lateral extent -> lateral threshold.
    let chestMinX = Infinity, chestMaxX = -Infinity;
    for (let i = 0; i < count; i++) {
      if (!isChestBone(dominantBoneIndexAt(i, iArr, wArr, size))) continue;
      const x = pArr[i * 3];
      if (x < chestMinX) chestMinX = x;
      if (x > chestMaxX) chestMaxX = x;
    }
    const lateralThresh = 0.15 * (chestMaxX - chestMinX);

    // Pass 2: within that lateral band only, find the real front/back gap.
    let negMaxZ = -Infinity, posMinZ = Infinity;
    for (let i = 0; i < count; i++) {
      if (!isChestBone(dominantBoneIndexAt(i, iArr, wArr, size))) continue;
      const x = pArr[i * 3];
      if (Math.abs(x) >= lateralThresh) continue;
      const z = pArr[i * 3 + 2];
      if (z < 0) { if (z > negMaxZ) negMaxZ = z; } else if (z < posMinZ) posMinZ = z;
    }
    const forwardZMin = (negMaxZ + posMinZ) / 2;

    // Pass 3: vertical band actually spanned by the front-cluster chest
    // vertices, capped above by the base of the neck.
    let neckBaseY = Infinity;
    let bibYMin = Infinity, bibYMax = -Infinity;
    for (let i = 0; i < count; i++) {
      const bi = dominantBoneIndexAt(i, iArr, wArr, size);
      const y = pArr[i * 3 + 1];
      if (bi === neckIdx && y < neckBaseY) neckBaseY = y;
      if (isChestBone(bi)) {
        const x = pArr[i * 3], z = pArr[i * 3 + 2];
        if (Math.abs(x) < lateralThresh && z > forwardZMin) {
          if (y < bibYMin) bibYMin = y;
          if (y > bibYMax) bibYMax = y;
        }
      }
    }
    if (Number.isFinite(neckBaseY)) bibYMax = neckBaseY;

    // Reviewer guard: if the chest-vertex filter found nothing (no
    // spine_02/03-dominant vertices at all, or none within the lateral
    // band, or none in the front cluster) any of these bounds comes out
    // non-finite (±Infinity from the untouched min/max seeds, or NaN from
    // averaging two of them — see the passes above). A future asset swap
    // or bone-name/region change could silently hit this on a mesh whose
    // topology doesn't match this pack's assumptions. Fail loud instead of
    // baking a garbage (possibly Infinity-sized) box: warn once and return
    // a sentinel bakeUniformColors() treats as "skip the bib override" —
    // affected vertices simply keep their normal region-blend (VEST) color.
    const degenerate = !Number.isFinite(lateralThresh) || !Number.isFinite(forwardZMin)
      || !Number.isFinite(bibYMin) || !Number.isFinite(bibYMax) || bibYMin > bibYMax;
    if (degenerate) {
      console.warn('[character] bib bounds degenerate — skipping bib');
      return null;
    }

    return { lateralThresh, forwardZMin, bibYMin, bibYMax, spine02Idx, spine03Idx };
  }

  // Bakes a per-vertex 'color' BufferAttribute onto `geometry` (which the
  // caller MUST already have cloned — see the call site for why) by
  // blending each region's color across a vertex's (up to 4) skinIndex
  // bones weighted by skinWeight. `skeletonBones` must be the mesh's own
  // `skeleton.bones` array — that's the ONLY array whose order matches the
  // skinIndex values baked into this geometry (NOT assets/manifest.json's
  // order, which is alphabetical).
  //
  // v2: after the normal region blend, a second pass overrides the narrow
  // front-central-chest patch of VEST (spine_02/03-dominant) vertices to the
  // light shirt tone — a "shirt-front bib" peeking out under the bow tie,
  // between what reads as an open dark suit jacket.
  function bakeUniformColors(geometry, skeletonBones, regionColors) {
    const skinIndexAttr = geometry.attributes.skinIndex;
    const skinWeightAttr = geometry.attributes.skinWeight;
    const posAttr = geometry.attributes.position;
    const count = posAttr.count;
    const boneColor = skeletonBones.map((b) => regionColors[resolveBoneRegion(b)]);
    const iArr = skinIndexAttr.array, wArr = skinWeightAttr.array, pArr = posAttr.array;
    const size = skinIndexAttr.itemSize; // 4
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let r = 0, g = 0, b = 0, wSum = 0;
      for (let k = 0; k < size; k++) {
        const w = wArr[i * size + k];
        if (w <= 0) continue;
        const c = boneColor[iArr[i * size + k]] || regionColors.SHIRT;
        r += c.r * w; g += c.g * w; b += c.b * w;
        wSum += w;
      }
      if (wSum > 0) { r /= wSum; g /= wSum; b /= wSum; }
      else { r = regionColors.SHIRT.r; g = regionColors.SHIRT.g; b = regionColors.SHIRT.b; }
      colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
    }

    // v2 bib override — see computeBibBounds() for how every threshold here
    // is derived from this mesh's own bind-pose geometry, not guessed. A
    // null result means the geometry didn't have the chest landmarks this
    // needs (see the guard at the end of computeBibBounds()) — skip the
    // override entirely rather than bake against garbage bounds; affected
    // vertices simply keep whatever the region blend above already gave them.
    const bib = computeBibBounds(geometry, skeletonBones);
    if (bib) {
      const bibColor = regionColors.SHIRT;
      for (let i = 0; i < count; i++) {
        const bi = dominantBoneIndexAt(i, iArr, wArr, size);
        if (bi !== bib.spine02Idx && bi !== bib.spine03Idx) continue;
        const x = pArr[i * 3], y = pArr[i * 3 + 1], z = pArr[i * 3 + 2];
        if (Math.abs(x) < bib.lateralThresh && y >= bib.bibYMin && y <= bib.bibYMax && z > bib.forwardZMin) {
          colors[i * 3] = bibColor.r; colors[i * 3 + 1] = bibColor.g; colors[i * 3 + 2] = bibColor.b;
        }
      }
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
    // Variation: tint + height. Palettes shared with rig.js via C.rigPalettes
    // (exported from rig.js Step 3). Real materials on this pack (see
    // assets/manifest.json + task-5-report.md inspection): MI_Hair_1 (the
    // Eyebrows mesh), MI_Eyes (the Eyes mesh), MI_Superhero_Male (the ENTIRE
    // body incl. face — this base-character pack has no separate clothing
    // mesh/material at all, textures were stripped in Task 1).
    const P = C.rigPalettes;
    const regionColors = {
      SKIN: new THREE.Color(P.SKINS[h % P.SKINS.length]),
      SHIRT: new THREE.Color(REGION_SHIRT_HEX),
      VEST: new THREE.Color(P.VESTS[(h >>> 6) % P.VESTS.length]),
      TROUSERS: new THREE.Color(REGION_TROUSERS_HEX),
      SHOES: new THREE.Color(REGION_SHOES_HEX),
    };
    group.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      o.material = o.material.clone();            // per-dealer tinting
      const n = (o.material.name || '').toLowerCase();
      if (n.includes('eye')) return;                                   // MI_Eyes: leave as-is
      if (n.includes('hair')) { o.material.color.set(P.HAIRS[(h >>> 3) % P.HAIRS.length]); return; }
      // MI_Superhero_Male: body + face, one mesh, one material — bake a
      // bone-weighted vertex-color uniform instead of a flat tint (Task 5b).
      // SkeletonUtils.clone() shares GEOMETRY across every cloned dealer
      // (only materials + the scene graph get duplicated per clone) —
      // baking a per-dealer 'color' attribute onto the shared geometry
      // would leak across every OTHER dealer sharing this template, so the
      // geometry must be cloned here first. Cost: BufferGeometry.clone()
      // duplicates ALL attributes (position/normal/uv/skinIndex/skinWeight),
      // not just the new color one — roughly 7.3k verts x ~68 bytes/vert
      // (~0.5MB) of EXTRA memory per dealer clone, on top of what Task 5
      // already carried. With 5-6 dealers on screen at once that's a low
      // single-digit MB of duplicated geometry — not free, but small next
      // to the ~1MB GLB payload itself, and there's no cheaper option in
      // this three.js version (no per-instance vertex-color mechanism for
      // SkinnedMesh).
      if (o.isSkinnedMesh && o.geometry.attributes.skinIndex) {
        o.geometry = o.geometry.clone();
        bakeUniformColors(o.geometry, o.skeleton.bones, regionColors);
        o.material.vertexColors = true;
        o.material.color.set('#ffffff');            // show baked colors unmodified
        return;
      }
      o.material.color.set(regionColors.SKIN);       // fallback safety net (not expected to hit)
    });
    group.scale.setScalar(0.96 + ((h >>> 9) % 9) * 0.01);   // 0.96–1.04
    const bones = {};
    for (const [logical, real] of Object.entries(BONE_MAP)) {
      bones[logical] = group.getObjectByName(real);
    }
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
    function resolveWaypointPos(wp, refs, side) {
      if (wp.rest) {
        const ch = armChains[side];
        ch.upper.getWorldPosition(_v1);
        group.getWorldQuaternion(_q1);
        return _v1.add(_v2.set(0, -(ch.upperLen + ch.foreLen) * 0.82, 0.10).applyQuaternion(_q1)).clone();
      }
      const base = wp.pos ? _v1.set(...wp.pos) : _v1.set(...refs[wp.ref]);
      if (wp.offset) base.add(_v2.set(...wp.offset));
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
    let activePath = null;   // { token, gen, path, hands, on, dur, t0, finish } | null

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
      // static per call, same semantics as gestures.js)
      const hands = Object.entries(path.hands).map(([side, wps]) => ({
        side,
        chain: armChains[side],
        start: null,               // filled on first frame (current hand pos)
        wps: wps.map((w) => ({
          at: w.at, ease: C.tween.easings[w.ease || 'inOutCubic'],
          arc: w.arc || 0, event: w.event || null, fired: false,
          pos: resolveWaypointPos(w, refs, side),
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
        const entry = {
          token, gen, path, hands, on, dur, holdAtEnd, t0: performance.now(),
          finish() {
            if (activePath === entry) activePath = null;
            release();
            resolve();
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
        if (cur.event && !cur.fired && st >= 0.995) {
          cur.fired = true;
          h.chain.hand.getWorldPosition(_v2);
          ap.on[cur.event]?.(_v2.clone());
        }
      }
      if (t >= 1) ap.finish();
    }

    // Every per-frame "extra" layer (look-at, head gestures, IK arm paths) is
    // additive on TOP of whatever mixer.update() just wrote to the bones —
    // it must run in the SAME tick, right after mixer.update(), every single
    // frame, because AnimationMixer overwrites the bone transforms it drives
    // on every update() call (so anything applied on an earlier tick, or
    // before update(), gets silently stomped the very next frame). This is
    // the one function that is allowed to call mixer.update() — setIdle's own
    // hook and the temporary driver below both funnel through it so the
    // mixer is never advanced twice in the same frame.
    function driveFrame(dt) {
      mixer.update(dt);
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
