(() => {
  const C = (globalThis.CASINO ??= {});

  // Humanoid rig: jointed procedural figure + a generic pose-clip player.
  // Clip DATA lives in src/logic/gestures.js (pure, node-tested); this file
  // owns the THREE side: building the body and animating joint quaternions.
  // All hooks carry the roomGen guard + .cancel (same idiom as dealCardTo).

  const SKINS = ['#e8c39e', '#d9a877', '#c98f63', '#a06a44', '#f0d0b0'];
  const HAIRS = ['#161616', '#2e1d10', '#4a3520', '#3a3a3f', '#241a12'];
  const VESTS = ['#1a1a1a', '#2a1018', '#10222e', '#1c2416', '#221c30'];
  const HAIR_STYLES = ['cap', 'side', 'long', 'bun'];

  const hashSeed = (s) => {
    let h = 9;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 0x9e3779b1);
    return Math.abs(h >>> 0);
  };

  function makeHumanRig({ suit = '#1a1a1a', shirt = '#f2f0e8', seed = '' } = {}) {
    const h = hashSeed(seed || Math.floor(performance.now()));
    const skin = SKINS[h % SKINS.length];
    const hairC = HAIRS[(h >> 3) % HAIRS.length];
    const vestC = seed ? VESTS[(h >> 6) % VESTS.length] : suit;
    const hairStyle = HAIR_STYLES[(h >> 9) % HAIR_STYLES.length];

    const suitMat = new THREE.MeshStandardMaterial({ color: suit, roughness: 0.6, metalness: 0.05 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vestC, roughness: 0.55, metalness: 0.08 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.65, metalness: 0 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.5, metalness: 0 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6, metalness: 0 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#22160e', roughness: 0.5, metalness: 0 });

    const group = new THREE.Group();
    const joints = {};
    const jointAt = (name, parent, x, y, z) => {
      const j = new THREE.Group();
      j.position.set(x, y, z);
      parent.add(j);
      joints[name] = j;
      return j;
    };
    const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // ---- legs: hip -> thigh capsule -> knee -> shin capsule (feet at y 0)
    const HIP_Y = 0.85, THIGH = 0.44, SHIN = 0.41;
    for (const [side, sx] of [['L', -1], ['R', 1]]) {
      const hip = jointAt('hip' + side, group, sx * 0.075, HIP_Y, 0);
      const thigh = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, THIGH - 0.11, 4, 10), suitMat));
      thigh.position.y = -THIGH / 2;
      hip.add(thigh);
      const knee = jointAt('knee' + side, hip, 0, -THIGH, 0);
      const shin = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.048, SHIN - 0.1, 4, 10), suitMat));
      shin.position.y = -SHIN / 2;
      knee.add(shin);
      const shoe = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.19), darkMat));
      shoe.position.set(0, -SHIN + 0.02, 0.04);
      knee.add(shoe);
    }

    // ---- spine + torso + vest + bow tie
    const spine = jointAt('spine', group, 0, HIP_Y, 0);
    const TORSO = 0.60;
    const torso = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, TORSO, 14), shirtMat));
    torso.position.y = TORSO / 2;
    spine.add(torso);
    const vestGap = 0.34;
    const vest = shadow(new THREE.Mesh(
      new THREE.CylinderGeometry(0.156, 0.176, 0.43, 16, 1, true, vestGap, Math.PI * 2 - vestGap * 2), vestMat));
    vest.position.y = 0.375;
    spine.add(vest);
    const gold = C.assets.goldMaterial();
    const coneGeo = new THREE.ConeGeometry(0.028, 0.05, 8);
    for (const sx of [-1, 1]) {
      const bow = new THREE.Mesh(coneGeo, gold);
      bow.rotation.z = sx * Math.PI / 2;
      bow.position.set(sx * 0.03, 0.62, 0.15);
      bow.castShadow = true;
      spine.add(bow);
    }

    // ---- neck + head + face (all children of neck so looks/nods compose)
    const neck = jointAt('neck', spine, 0, 0.62, 0);
    const neckMesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 10), skinMat));
    neckMesh.position.y = 0.035;
    neck.add(neckMesh);
    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), skinMat));
    head.position.y = 0.12;
    neck.add(head);
    // hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.116, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    hair.castShadow = true;
    hair.position.y = 0.12;
    if (hairStyle === 'side') hair.rotation.z = 0.22;
    neck.add(hair);
    if (hairStyle === 'long') {
      const back = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.26, 12), hairMat));
      back.position.set(0, 0.02, -0.055);
      neck.add(back);
    } else if (hairStyle === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), hairMat);
      bun.position.set(0, 0.17, -0.1);
      bun.castShadow = true;
      neck.add(bun);
    }
    // eyes (scaled to blink) + brows + mouth
    const eyes = [];
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), darkMat);
      eye.position.set(sx * 0.04, 0.135, 0.098);
      neck.add(eye);
      eyes.push(eye);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.007, 0.008), hairMat);
      brow.position.set(sx * 0.04, 0.162, 0.099);
      brow.rotation.z = sx * -0.12;
      neck.add(brow);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.008),
      new THREE.MeshStandardMaterial({ color: '#7a3b30', roughness: 0.7 }));
    mouth.position.set(0, 0.078, 0.102);
    neck.add(mouth);

    // ---- arms: shoulder -> elbow -> wrist -> palm + thumb
    const UPPER = 0.22, FORE = 0.20;
    for (const [side, sx] of [['L', -1], ['R', 1]]) {
      const shoulderPos = new THREE.Vector3(sx * 0.14, 0.50, 0.02); // spine-local
      const shoulder = jointAt('shoulder' + side, spine, shoulderPos.x, shoulderPos.y, shoulderPos.z);
      const handTarget = new THREE.Vector3(sx * 0.05, 1.0, 0.24);   // group-local rest
      const worldPos = new THREE.Vector3(sx * 0.14, HIP_Y + 0.50, 0.02);
      const dir = handTarget.clone().sub(worldPos).normalize();
      shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      const upper = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.032, UPPER - 0.06, 4, 8), shirtMat));
      upper.position.y = -UPPER / 2;
      shoulder.add(upper);
      const elbow = jointAt('elbow' + side, shoulder, 0, -UPPER, 0);
      elbow.rotation.x = -0.3;
      const fore = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.027, FORE - 0.05, 4, 8), shirtMat));
      fore.position.y = -FORE / 2;
      elbow.add(fore);
      const wrist = jointAt('wrist' + side, elbow, 0, -FORE, 0);
      const palm = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.07), skinMat));
      palm.position.y = -0.03;
      wrist.add(palm);
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.03), skinMat);
      thumb.position.set(sx * -0.03, -0.025, 0.02);
      thumb.castShadow = true;
      wrist.add(thumb);
    }

    // ---- store rest pose + group-local base positions for aim solving
    group.updateMatrixWorld(true);
    const _wv = new THREE.Vector3();
    for (const [name, j] of Object.entries(joints)) {
      j.userData.restQ = j.quaternion.clone();
      j.getWorldPosition(_wv);
      j.userData.basePos = group.worldToLocal(_wv.clone());
    }

    // ---- clip player ----
    const tokens = { arms: 0, head: 0, body: 0, mouth: 0 };
    const DOWN = new THREE.Vector3(0, -1, 0);
    const _v = new THREE.Vector3();
    const _e = new THREE.Euler();
    const _q = new THREE.Quaternion();

    function targetQuat(joint, tgt, refs) {
      if (tgt.rest) return joint.userData.restQ.clone();
      if (tgt.e) {
        _e.set(tgt.e[0], tgt.e[1], tgt.e[2]);
        return joint.userData.restQ.clone().multiply(_q.setFromEuler(_e).clone());
      }
      const ref = refs[tgt.aim];
      if (!ref) return joint.userData.restQ.clone();   // missing ref -> rest, never crash
      const local = group.worldToLocal(new THREE.Vector3(ref[0], ref[1], ref[2]));
      _v.copy(local).sub(joint.userData.basePos).normalize();
      return new THREE.Quaternion().setFromUnitVectors(DOWN, _v);
    }

    function play(app, clipName, { refs = {}, ms } = {}) {
      const clip = C.gestures.CLIPS[clipName];
      if (!clip) return Promise.resolve();
      const token = ++tokens[clip.track];
      const dur = ms || clip.dur;
      const gen = app.roomGen;
      // Precompute each key's absolute-quat targets once, up front.
      const keyTargets = clip.keys.map((k) => ({
        at: k.at,
        ease: C.tween.easings[k.ease || 'inOutCubic'],
        targets: Object.entries(k.joints).map(([name, tgt]) => ({
          joint: joints[name], to: targetQuat(joints[name], tgt, refs),
        })),
      }));
      if (app.REDUCED) {
        keyTargets.forEach((k) => k.targets.forEach(({ joint, to }) => joint.quaternion.copy(to)));
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        let ki = 0, segStart = 0;
        let seg = null;   // { from: [{joint, fromQ, to}], t0, len, ease }
        const startSeg = () => {
          const k = keyTargets[ki];
          seg = {
            pairs: k.targets.map(({ joint, to }) => ({ joint, from: joint.quaternion.clone(), to })),
            t0: performance.now(), len: (k.at - segStart) * dur, ease: k.ease,
          };
        };
        startSeg();
        const hook = () => {
          if (tokens[clip.track] !== token || app.roomGen !== gen) { app.offFrame(hook); return resolve(); }
          const t = seg.len <= 0 ? 1 : Math.min(1, (performance.now() - seg.t0) / seg.len);
          const e = seg.ease(t);
          seg.pairs.forEach(({ joint, from, to }) => joint.quaternion.slerpQuaternions(from, to, e));
          if (t >= 1) {
            segStart = keyTargets[ki].at;
            ki += 1;
            if (ki >= keyTargets.length) { app.offFrame(hook); return resolve(); }
            startSeg();
          }
        };
        hook.cancel = () => { app.offFrame(hook); resolve(); };
        app.onFrame(hook);
      });
    }

    const stop = (track) => { tokens[track] += 1; };

    // ---- speech bubble + mouth ----
    let bubble = null;
    function say(app, text, { ms = 2600 } = {}) {
      if (bubble) { group.remove(bubble.sprite); bubble.dispose(); bubble = null; }
      const lines = C.gestures.wrapLines(text, 18);
      const PW = 512, LH = 88, PH = lines.length * LH + 72;
      const tx = C.assets.canvasTexture(PW, PH, (ctx) => {
        ctx.clearRect(0, 0, PW, PH);
        ctx.fillStyle = 'rgba(16,13,9,0.88)';
        C.assets.roundRect(ctx, 6, 6, PW - 12, PH - 30, 26);
        ctx.fill();
        ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 5;
        C.assets.roundRect(ctx, 6, 6, PW - 12, PH - 30, 26);
        ctx.stroke();
        ctx.beginPath();                       // tail
        ctx.moveTo(PW / 2 - 22, PH - 26); ctx.lineTo(PW / 2, PH - 2); ctx.lineTo(PW / 2 + 22, PH - 26);
        ctx.closePath();
        ctx.fillStyle = 'rgba(16,13,9,0.88)'; ctx.fill();
        ctx.fillStyle = '#f0d878';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `600 56px 'Segoe UI', system-ui, sans-serif`;
        lines.forEach((ln, i) => ctx.fillText(ln, PW / 2, 44 + LH / 2 + i * LH));
      });
      const mat = new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false, fog: false });
      const sprite = new THREE.Sprite(mat);
      const W = 0.95;
      sprite.scale.set(W, W * PH / PW, 1);
      sprite.position.set(0, 1.62 + 0.35 + (W * PH / PW) / 2, 0);
      sprite.renderOrder = 5;
      group.add(sprite);
      bubble = { sprite, dispose: () => { mat.map.dispose(); mat.dispose(); } };

      const token = ++tokens.mouth;
      const gen = app.roomGen;
      return new Promise((resolve) => {
        const t0 = performance.now();
        const cleanup = () => {
          mouth.scale.set(1, 1, 1);
          if (bubble && bubble.sprite === sprite) { group.remove(sprite); bubble.dispose(); bubble = null; }
          resolve();
        };
        if (app.REDUCED) { setTimeout(cleanup, ms); return; }
        const hook = () => {
          if (tokens.mouth !== token || app.roomGen !== gen) { app.offFrame(hook); return cleanup(); }
          const t = (performance.now() - t0);
          mouth.scale.y = 1 + Math.abs(Math.sin(t / 90)) * 2.6;
          if (t >= ms) { app.offFrame(hook); cleanup(); }
        };
        hook.cancel = () => { app.offFrame(hook); cleanup(); };
        app.onFrame(hook);
      });
    }

    // ---- head look (neck yaw + slight pitch, clamped) ----
    let lookToken = 0;
    function lookAt(app, worldTarget) {
      const token = ++lookToken;
      const local = group.worldToLocal(new THREE.Vector3(worldTarget[0], worldTarget[1], worldTarget[2]));
      const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(local.x, local.z)));
      const flat = Math.hypot(local.x, local.z) || 1e-4;
      const pitch = Math.max(-0.35, Math.min(0.35, -Math.atan2(local.y - 1.5, flat)));
      if (app.REDUCED) { neck.rotation.y = yaw; neck.rotation.x = pitch; return; }
      const t0 = performance.now(), fy = neck.rotation.y, fx = neck.rotation.x;
      const hook = () => {
        if (lookToken !== token) return app.offFrame(hook);
        const t = Math.min(1, (performance.now() - t0) / 300);
        const e = C.tween.easings.outCubic(t);
        neck.rotation.y = fy + (yaw - fy) * e;
        neck.rotation.x = fx + (pitch - fx) * e;
        if (t >= 1) app.offFrame(hook);
      };
      hook.cancel = () => app.offFrame(hook);
      app.onFrame(hook);
    }

    // ---- idle: breath sway + weight shift + blink ----
    function setIdle(app) {
      if (app.REDUCED) return null;
      let nextBlink = 2 + Math.random() * 3, blinkEnd = 0;
      let shiftPhase = Math.random() * Math.PI * 2;
      const hook = (dt, elapsed) => {
        spine.rotation.z = Math.sin(elapsed * 0.8 + shiftPhase) * 0.02;
        spine.rotation.x = Math.sin(elapsed * 0.55 + shiftPhase) * 0.012;
        const shift = Math.sin(elapsed * 0.25 + shiftPhase) * 0.05;
        joints.hipL.rotation.z = shift;
        joints.hipR.rotation.z = shift;
        if (elapsed > nextBlink) { blinkEnd = elapsed + 0.13; nextBlink = elapsed + 2 + Math.random() * 3.5; }
        const blinking = elapsed < blinkEnd;
        eyes.forEach((e) => { e.scale.y = blinking ? 0.08 : 1; });
      };
      app.onFrame(hook);
      return hook;
    }

    return { group, joints, play, stop, say, lookAt, setIdle };
  }

  C.rig = { makeHumanRig };
})();
