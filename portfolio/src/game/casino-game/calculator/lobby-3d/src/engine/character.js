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

  function buildCharacter(opts) {
    const seed = String(opts.seed ?? '');
    let h = 9;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 0x9e3779b1);
    h = Math.abs(h >>> 0);
    const group = THREE.SkeletonUtils.clone(state.template);
    group.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.castShadow = true; o.receiveShadow = true;
        o.material = o.material.clone();            // per-dealer tinting
      }
    });
    // Variation: tint + height. Palettes shared with rig.js via C.rigPalettes
    // (exported from rig.js Step 3). Real materials on this pack (see
    // assets/manifest.json + task-5-report.md inspection): MI_Hair_1 (the
    // Eyebrows mesh), MI_Eyes (the Eyes mesh), MI_Superhero_Male (the ENTIRE
    // body incl. face — this base-character pack has no separate clothing
    // mesh/material at all, textures were stripped in Task 1). Because body
    // and face share one material, tinting it with VESTS (a near-black suit
    // color, as the brief guessed from the material's name alone) would turn
    // the whole face the same dark color — clearly wrong. SKINS is the only
    // sensible default for that material (its baseColorFactor is already a
    // skin tone). 'vest'/'suit' substring branch kept for forward
    // compatibility in case a future asset swap adds real clothing geometry.
    const P = C.rigPalettes;
    group.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      const n = (o.material.name || '').toLowerCase();
      if (n.includes('eye')) return;                                   // MI_Eyes: leave as-is
      if (n.includes('hair')) { o.material.color.set(P.HAIRS[(h >>> 3) % P.HAIRS.length]); return; }
      if (n.includes('vest') || n.includes('suit')) { o.material.color.set(P.VESTS[(h >>> 6) % P.VESTS.length]); return; }
      o.material.color.set(P.SKINS[h % P.SKINS.length]);                // MI_Superhero_Male: body + face
    });
    group.scale.setScalar(0.96 + ((h >>> 9) % 9) * 0.01);   // 0.96–1.04
    const bones = {};
    for (const [logical, real] of Object.entries(BONE_MAP)) {
      bones[logical] = group.getObjectByName(real);
    }
    return { group, bones, mixer: new THREE.AnimationMixer(group), hash: h };
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
