(() => {
  const C = (globalThis.CASINO ??= {});

  // GLB dealer characters: preload once, clone per dealer, mocap idle via
  // AnimationMixer. The IK action layer lands in a later task; play() for
  // IK-action names resolves immediately until then (procedural rig has
  // usually been swapped out by the time tables call them — acceptable
  // mid-implementation state, NOT shippable until Task 7).
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
    // is derived from this mesh's own bind-pose geometry, not guessed.
    const bib = computeBibBounds(geometry, skeletonBones);
    const bibColor = regionColors.SHIRT;
    for (let i = 0; i < count; i++) {
      const bi = dominantBoneIndexAt(i, iArr, wArr, size);
      if (bi !== bib.spine02Idx && bi !== bib.spine03Idx) continue;
      const x = pArr[i * 3], y = pArr[i * 3 + 1], z = pArr[i * 3 + 2];
      if (Math.abs(x) < bib.lateralThresh && y >= bib.bibYMin && y <= bib.bibYMax && z > bib.forwardZMin) {
        colors[i * 3] = bibColor.r; colors[i * 3 + 1] = bibColor.g; colors[i * 3 + 2] = bibColor.b;
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

    function setIdle() {
      if (app.REDUCED || idleHook) return idleHook;
      const gen = app.roomGen;
      idleAction = mixer.clipAction(findClip(IDLE_CLIP));
      idleAction.play();
      const hook = (dt) => {
        if (app.roomGen !== gen) { idleAction?.stop(); return app.offFrame(hook); }
        mixer.update(dt);
        applyLook();          // look-at layer, below
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

    // play(): Task 6 adds mocap gestures, Task 7 adds IK actions. For now,
    // resolve immediately so awaited sequences never hang mid-implementation.
    function play() { return Promise.resolve(); }
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
