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
    // >>> keeps the shifted index unsigned — a signed >> on a hash above 2^31
    // went negative, so HAIRS[-4]/VESTS[-4] were undefined and THREE fell
    // back to white hair/vests for half of all seeds.
    const skin = SKINS[h % SKINS.length];
    const hairC = HAIRS[(h >>> 3) % HAIRS.length];
    const vestC = seed ? VESTS[(h >>> 6) % VESTS.length] : suit;
    const hairStyle = HAIR_STYLES[(h >>> 9) % HAIR_STYLES.length];

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

    const ellipsoid = (name, parent, material, position, size, segments = 20) => {
      const mesh = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, segments, 14), material));
      mesh.name = name;
      mesh.position.set(...position); mesh.scale.set(...size);
      parent.add(mesh);
      return mesh;
    };
    const surface = (name, parent, rings, material) => {
      const positions = [], indices = [], sides = 24;
      rings.forEach(([y, width, depth], row) => {
        for (let i = 0; i <= sides; i++) {
          const angle = i / sides * Math.PI * 2;
          positions.push(Math.cos(angle) * width, y, Math.sin(angle) * depth);
          if (row && i < sides) {
            const n = row * (sides + 1) + i;
            indices.push(n, n + 1, n - sides - 1, n + 1, n - sides, n - sides - 1);
          }
        }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      if (rings[1][0] < rings[0][0]) {
        for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
      }
      geometry.setIndex(indices); geometry.computeVertexNormals();
      const mesh = shadow(new THREE.Mesh(geometry, material)); mesh.name = name;
      parent.add(mesh);
      return mesh;
    };
    const panel = (name, parent, points, material) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
      const indices = [];
      for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
      geometry.setIndex(indices); geometry.computeVertexNormals();
      const mesh = shadow(new THREE.Mesh(geometry, material)); mesh.name = name; parent.add(mesh);
      return mesh;
    };
    const satinMat = new THREE.MeshStandardMaterial({ color: '#111722', roughness: 0.35, metalness: 0.12, side: THREE.DoubleSide });
    shirtMat.side = THREE.DoubleSide;
    const gold = C.assets.goldMaterial();

    // The fallback uses the same proportions and anatomical side convention
    // as the imported skeleton: +X is the dealer's left, +Z faces the table.
    const HIP_Y = 0.88, THIGH = 0.44, SHIN = 0.42;
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      const hip = jointAt('hip' + side, group, sign * 0.085, HIP_Y, 0);
      surface('TrouserThigh' + side, hip, [[0, 0.077, 0.078], [-0.12, 0.070, 0.072],
        [-THIGH, 0.047, 0.052]], suitMat);
      const knee = jointAt('knee' + side, hip, 0, -THIGH, 0);
      surface('TrouserShin' + side, knee, [[0, 0.048, 0.053], [-0.24, 0.045, 0.048],
        [-SHIN + 0.035, 0.043, 0.047]], suitMat);
      ellipsoid('OxfordShoe' + side, knee, darkMat, [0, -SHIN + 0.018, 0.042], [0.052, 0.038, 0.117]);
    }

    const spine = jointAt('spine', group, 0, HIP_Y, 0);
    surface('TailoredJacket', spine, [[-0.035, 0.154, 0.097], [0.055, 0.162, 0.106],
      [0.19, 0.147, 0.102], [0.35, 0.184, 0.118], [0.46, 0.196, 0.109],
      [0.52, 0.112, 0.081], [0.54, 0.056, 0.058]], vestMat);
    panel('ShirtFront', spine, [[-0.051, 0.535, 0.072], [0.051, 0.535, 0.072],
      [0.017, 0.205, 0.113], [-0.017, 0.205, 0.113]], shirtMat);
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      const mirror = points => points.map(([x, y, z]) => [sign * x, y, z]);
      panel('Lapel' + side, spine, mirror([[0.050, 0.54, 0.077], [0.128, 0.475, 0.097],
        [0.09, 0.40, 0.121], [0.11, 0.38, 0.122], [0.014, 0.19, 0.118], [0.035, 0.40, 0.125]]), satinMat);
      panel('Collar' + side, spine, mirror([[0.003, 0.567, 0.052], [0.043, 0.565, 0.044],
        [0.068, 0.526, 0.080], [0.026, 0.492, 0.098]]), shirtMat);
      ellipsoid('BowTie' + side, spine, satinMat, [sign * 0.027, 0.531, 0.096], [0.034, 0.019, 0.013], 12);
    }
    ellipsoid('BowKnot', spine, gold, [0, 0.531, 0.100], [0.012, 0.014, 0.010], 12);
    for (const y of [0.29, 0.355, 0.42]) ellipsoid('ShirtButton', spine, darkMat, [0, y, 0.121], [0.005, 0.005, 0.003], 8);
    panel('BreastPocket', spine, [[0.094, 0.371, 0.113], [0.159, 0.367, 0.079],
      [0.159, 0.353, 0.079], [0.094, 0.357, 0.114]], satinMat);
    panel('PocketSquare', spine, [[0.099, 0.37, 0.115], [0.114, 0.394, 0.108],
      [0.131, 0.376, 0.098], [0.143, 0.388, 0.092], [0.153, 0.369, 0.084]], shirtMat);

    // An oval cranium, shaped jaw and bridge replace the old sphere face.
    const neck = jointAt('neck', spine, 0, 0.55, 0);
    const neckMesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.047, 0.09, 16), skinMat));
    neckMesh.position.y = 0.032; neck.add(neckMesh);
    surface('Head', neck, [[0.052, 0.021, 0.032], [0.065, 0.052, 0.057],
      [0.09, 0.073, 0.075], [0.13, 0.086, 0.089], [0.18, 0.085, 0.084],
      [0.221, 0.074, 0.074], [0.252, 0.039, 0.042], [0.258, 0.001, 0.001]], skinMat);
    ellipsoid('NoseBridge', neck, skinMat, [0, 0.145, 0.083], [0.012, 0.030, 0.015]);
    ellipsoid('Nose', neck, skinMat, [0, 0.126, 0.095], [0.018, 0.015, 0.023]);
    const lips = new THREE.MeshStandardMaterial({ color: '#9c6354', roughness: 0.82 });
    const mouth = ellipsoid('Mouth', neck, lips, [0, 0.088, 0.075], [0.023, 0.004, 0.006], 16);
    const white = new THREE.MeshStandardMaterial({ color: '#f2ece0', roughness: 0.40 });
    const iris = new THREE.MeshStandardMaterial({ color: '#4c463a', roughness: 0.34 });
    const eyes = [];
    for (const sign of [-1, 1]) {
      ellipsoid('Ear', neck, skinMat, [sign * 0.087, 0.13, -0.001], [0.014, 0.027, 0.018], 12);
      const eye = new THREE.Group(); eye.position.set(sign * 0.033, 0.157, 0.077); neck.add(eye); eyes.push(eye);
      ellipsoid('EyeWhite', eye, white, [0, 0, 0], [0.020, 0.011, 0.009], 16);
      ellipsoid('Iris', eye, iris, [0, 0, 0.008], [0.008, 0.008, 0.003], 12);
      ellipsoid('Pupil', eye, darkMat, [0, 0, 0.011], [0.004, 0.005, 0.002], 10);
      ellipsoid('EyeCatchlight', eye, white, [-0.002, 0.002, 0.013], [0.0017, 0.0017, 0.001], 8);
      const brow = ellipsoid('Eyebrow', neck, hairMat, [sign * 0.034, 0.180, 0.079], [0.022, 0.0045, 0.004], 12);
      brow.rotation.z = -sign * 0.10;
    }
    const hair = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, 1.36), hairMat));
    hair.name = 'StyledHair'; hair.position.set(0, 0.159, -0.007); hair.scale.set(0.090, 0.105, 0.089);
    neck.add(hair);
    if (hairStyle === 'bun' || hairStyle === 'long') {
      ellipsoid('NeatBun', neck, hairMat, [0, 0.188, -0.090], [0.047, 0.043, 0.041]);
    } else {
      const part = ellipsoid('SidePart', neck, hairMat, [-0.019, 0.221, 0.055], [0.066, 0.028, 0.040]);
      part.rotation.z = 0.15;
    }

    // Sleeves taper into shaped palms, four separate fingers and opposed
    // thumbs. The wrist frame is +Z fingers / -Y palm normal.
    const UPPER = 0.27, FORE = 0.25;
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      const shoulder = jointAt('shoulder' + side, spine, sign * 0.185, 0.46, -0.008);
      surface('JacketSleeve' + side, shoulder, [[0, 0.060, 0.062], [-0.08, 0.056, 0.057],
        [-UPPER, 0.041, 0.043]], vestMat);
      ellipsoid('ShoulderSeam' + side, shoulder, vestMat, [0, 0, 0], [0.060, 0.044, 0.061]);
      const elbow = jointAt('elbow' + side, shoulder, 0, -UPPER, 0);
      surface('ForeSleeve' + side, elbow, [[0.015, 0.042, 0.044], [-0.14, 0.036, 0.037],
        [-FORE + 0.024, 0.028, 0.031]], vestMat);
      const wrist = jointAt('wrist' + side, elbow, 0, -FORE, 0);
      ellipsoid('Palm' + side, wrist, skinMat, [0, 0, 0.037], [0.038, 0.018, 0.052]);
      const cuff = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.030, 0.034, 16), shirtMat));
      cuff.name = 'ShirtCuff' + side; cuff.position.y = 0.013; elbow.add(cuff); cuff.position.y = -FORE + 0.012;
      for (const [index, length] of [0.060, 0.070, 0.064, 0.048].entries()) {
        const x = (index - 1.5) * 0.018;
        const finger = new THREE.Group(); finger.name = 'Finger' + index + side;
        finger.position.set(x, -0.001, 0.073); finger.rotation.x = 0.17 + index * 0.018;
        wrist.add(finger);
        ellipsoid('FingerProximal', finger, skinMat, [0, 0, length * 0.28], [0.008, 0.009, length * 0.34], 12);
        ellipsoid('FingerTip', finger, skinMat, [0, -0.006, length * 0.73], [0.007, 0.008, length * 0.27], 12);
      }
      const thumb = new THREE.Group(); thumb.name = 'Thumb' + side;
      thumb.position.set(-sign * 0.035, -0.006, 0.029); thumb.rotation.y = -sign * 0.70;
      wrist.add(thumb);
      ellipsoid('ThumbBase', thumb, skinMat, [0, 0, 0.014], [0.014, 0.013, 0.027], 12);
      ellipsoid('ThumbTip', thumb, skinMat, [0, -0.006, 0.042], [0.010, 0.010, 0.017], 12);

      group.updateMatrixWorld(true);
      const shoulderPos = shoulder.getWorldPosition(new THREE.Vector3());
      const target = new THREE.Vector3(sign * 0.22, 1.04, 0.23);
      if (C.ik) {
        const solve = C.ik.solveTwoBone({ shoulder: shoulderPos.toArray(), target: target.toArray(),
          upperLen: UPPER, foreLen: FORE, pole: [sign * 0.45, -1, -0.1] });
        shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(...solve.elbow).sub(shoulderPos).normalize());
        shoulder.updateWorldMatrix(true, false);
        const localDir = new THREE.Vector3(...solve.hand).sub(new THREE.Vector3(...solve.elbow))
          .applyQuaternion(shoulder.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
        elbow.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), localDir);
      } else { shoulder.rotation.x = -0.32; elbow.rotation.x = -1.05; }
      elbow.updateWorldMatrix(true, false);
      wrist.quaternion.copy(elbow.getWorldQuaternion(new THREE.Quaternion()).invert());
    }

    // ---- store rest pose + group-local base positions for aim solving
    group.updateMatrixWorld(true);
    const _wv = new THREE.Vector3();
    for (const [name, j] of Object.entries(joints)) {
      j.userData.restQ = j.quaternion.clone();
      j.getWorldPosition(_wv);
      j.userData.basePos = group.worldToLocal(_wv.clone());
      if (name.startsWith('wrist')) {
        j.userData.basePalmPos = group.worldToLocal(j.localToWorld(new THREE.Vector3(0, -0.017, 0.068)));
      }
    }

    // ---- clip player ----
    const tokens = { arms: 0, head: 0, body: 0, mouth: 0 };
    const DOWN = new THREE.Vector3(0, -1, 0);
    const _v = new THREE.Vector3();
    const _e = new THREE.Euler();
    const _q = new THREE.Quaternion();
    let activePathHook = null;
    let serviceLean = 0;
    const lastRefs = {};

    function handContactWorld(side = 'R') {
      const wrist = joints['wrist' + side];
      wrist.updateWorldMatrix(true, false);
      return wrist.localToWorld(new THREE.Vector3(0, -0.017, 0.068));
    }

    function poseArm(side, target, palmAnchor) {
      const shoulder = joints['shoulder' + side], elbow = joints['elbow' + side], wrist = joints['wrist' + side];
      const rootQ = group.getWorldQuaternion(new THREE.Quaternion());
      const scale = group.getWorldScale(new THREE.Vector3()).x;
      const pole = new THREE.Vector3(side === 'L' ? 0.48 : -0.48, -1, -0.1).applyQuaternion(rootQ);
      const wristTarget = target.clone();
      for (let pass = 0; pass < (palmAnchor ? 3 : 1); pass++) {
        const s = shoulder.getWorldPosition(new THREE.Vector3());
        const limited = C.ik.clampTableReach(s.toArray(), wristTarget.toArray(), (UPPER + FORE) * scale * 0.97);
        const solved = C.ik.solveTwoBone({ shoulder: s.toArray(), target: limited,
          upperLen: UPPER * scale, foreLen: FORE * scale, pole: pole.toArray() });
        const aim = (joint, from, to) => {
          const dir = new THREE.Vector3(...to).sub(from).normalize();
          dir.applyQuaternion(joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
          joint.quaternion.setFromUnitVectors(DOWN, dir);
          joint.updateWorldMatrix(true, true);
        };
        aim(shoulder, s, solved.elbow);
        aim(elbow, elbow.getWorldPosition(new THREE.Vector3()), solved.hand);
        const forward = wrist.getWorldPosition(new THREE.Vector3()).sub(elbow.getWorldPosition(new THREE.Vector3()));
        forward.y = 0;
        if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1).applyQuaternion(rootQ);
        forward.normalize();
        const up = new THREE.Vector3(0, 1, 0), right = up.clone().cross(forward).normalize();
        const handQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
        wrist.quaternion.copy(elbow.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(handQ));
        if (palmAnchor) {
          const delta = target.clone().sub(handContactWorld(side));
          wristTarget.copy(wrist.getWorldPosition(new THREE.Vector3())).add(delta);
        }
      }
    }

    function playPath(app, path, { refs: incoming = {}, ms, on = {} }) {
      const refs = { ...lastRefs, ...incoming };
      if (Object.values(path.hands).some(wps => wps.some(w => w.ref && !refs[w.ref]))) return Promise.resolve();
      Object.assign(lastRefs, incoming);
      const service = path.grip === 'service';
      activePathHook?.cancel(service);
      const initialLean = serviceLean;
      const token = ++tokens.arms, gen = app.roomGen, t0 = performance.now(), duration = ms || path.dur;
      const rotation = group.getWorldQuaternion(new THREE.Quaternion());
      let hands = path.hands;
      if (path.mirrorBySide && hands.R && !hands.L
        && group.worldToLocal(new THREE.Vector3(...refs[path.mirrorBySide])).x > 0.05) {
        hands = { L: hands.R.map(w => w.offset ? { ...w, offset: [-w.offset[0], w.offset[1], w.offset[2]] } : w) };
      }
      const tracks = Object.entries(hands).map(([side, waypoints]) => ({
        side, start: path.anchor === 'palm' ? handContactWorld(side)
          : joints['wrist' + side].getWorldPosition(new THREE.Vector3()),
        waypoints: waypoints.map(w => {
          const base = path.continuous && path.anchor === 'palm' ? 'basePalmPos' : 'basePos';
          const pos = w.rest ? group.localToWorld(joints['wrist' + side].userData[base].clone())
            : new THREE.Vector3(...(w.pos || refs[w.ref]));
          if (w.offset) pos.add(new THREE.Vector3(...w.offset).applyQuaternion(rotation));
          return { ...w, pos, fired: false };
        }),
      }));
      const hold = !path.cycle && Object.values(hands).some(wps => !wps[wps.length - 1].rest);
      return new Promise(resolve => {
        const hook = () => {
          if (tokens.arms !== token || app.roomGen !== gen) { hook.cancel(); return; }
          const t = app.REDUCED ? 1 : Math.min(1, (performance.now() - t0) / duration);
          if (service) {
            // Lean from the hips to bring the real shoulders over the
            // service well. Arm lengths and all casino paths stay intact.
            const targetLean = hold ? 0.20 : 0;
            const portion = Math.min(1, t / (hold ? 0.24 : 1));
            const lean = initialLean + (targetLean - initialLean) * C.tween.easings.inOutCubic(portion);
            spine.rotation.x += lean - serviceLean;
            serviceLean = lean;
            spine.updateWorldMatrix(true, true);
          }
          for (const track of tracks) {
            let previousAt = 0, previous = track.start;
            let current = track.waypoints[track.waypoints.length - 1];
            for (const waypoint of track.waypoints) {
              if (t <= waypoint.at || waypoint === current) { current = waypoint; break; }
              previousAt = waypoint.at; previous = waypoint.pos;
            }
            const portion = Math.min(1, Math.max(0, (t - previousAt) / (current.at - previousAt)));
            const ease = C.tween.easings[current.ease || 'inOutCubic'];
            const position = previous.clone().lerp(current.pos, ease(portion));
            position.y += (current.arc || 0) * 4 * portion * (1 - portion);
            poseArm(track.side, position, path.anchor === 'palm');
            for (const wp of track.waypoints) {
              if (wp.event && !wp.fired && wp.at <= t) {
                wp.fired = true;
                on[wp.event]?.(joints['wrist' + track.side].getWorldPosition(new THREE.Vector3()),
                  { side: track.side, contactWorld: handContactWorld(track.side) });
              }
            }
          }
          if (t >= 1) { resolve(); if (!hold || app.REDUCED) hook.cancel(); }
        };
        hook.cancel = (preserveLean = false) => {
          app.offFrame(hook);
          if (activePathHook === hook) {
            if (!preserveLean) { spine.rotation.x -= serviceLean; serviceLean = 0; }
            activePathHook = null;
          }
          resolve();
        };
        activePathHook = hook;
        if (app.REDUCED) hook();
        else app.onFrame(hook);
      });
    }

    let travelCancel = null;
    function walkTo(app, worldTarget, { ms } = {}) {
      travelCancel?.(); activePathHook?.cancel();
      group.updateWorldMatrix(true, true);
      const destination = new THREE.Vector3(...worldTarget);
      if (group.parent) group.parent.worldToLocal(destination);
      const start = group.position.clone(), facing = group.quaternion.clone();
      const duration = ms || Math.max(350, start.distanceTo(destination) / 0.9 * 1000);
      if (app.REDUCED) { group.position.copy(destination); return Promise.resolve(); }
      const token = ++tokens.body, gen = app.roomGen, t0 = performance.now();
      const yaw = Math.atan2(destination.x - start.x, destination.z - start.z);
      const travelQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      return new Promise(resolve => {
        const hook = () => {
          if (tokens.body !== token || app.roomGen !== gen) { hook.cancel(); return; }
          const t = Math.min(1, (performance.now() - t0) / duration);
          group.position.lerpVectors(start, destination, t);
          group.quaternion.slerpQuaternions(facing, travelQ, Math.min(1, t / 0.16, (1 - t) / 0.16));
          const phase = (performance.now() - t0) * 0.008;
          for (const [side, sign] of [['L', 1], ['R', -1]]) {
            const swing = Math.sin(phase) * sign;
            joints['hip' + side].rotation.x = swing * 0.32;
            joints['knee' + side].rotation.x = Math.max(0, -swing) * 0.46;
          }
          if (t >= 1) hook.cancel();
        };
        hook.cancel = () => {
          app.offFrame(hook); group.quaternion.copy(facing);
          for (const side of ['L', 'R']) {
            joints['hip' + side].quaternion.copy(joints['hip' + side].userData.restQ);
            joints['knee' + side].quaternion.copy(joints['knee' + side].userData.restQ);
          }
          if (travelCancel === hook.cancel) travelCancel = null;
          resolve();
        };
        travelCancel = hook.cancel; app.onFrame(hook);
      });
    }

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

    function play(app, clipName, { refs = {}, ms, on = {} } = {}) {
      if (C.ik && C.handPaths?.PATHS[clipName]) return playPath(app, C.handPaths.PATHS[clipName], { refs, ms, on });
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

    // Bumping tokens[track] alone cancels play()'s clip loop; 'mouth' also
    // needs to cancel the bubble helper's own frame hook in assets.js (its
    // cancellation state lives in a module-local, group-keyed map there, not
    // in this rig's tokens object — see stopBubble's comment).
    const stop = (track) => {
      tokens[track] += 1;
      if (track === 'arms') activePathHook?.cancel();
      if (track === 'body') travelCancel?.();
      if (track === 'mouth') C.assets.stopBubble(group);
    };

    // ---- speech bubble + mouth ----
    // Bubble sprite/timer bookkeeping now lives in assets.js's speechBubbleOn
    // (shared with the GLB character impl) — this just supplies the
    // procedural mouth-flap pulse.
    function say(app, text, o = {}) {
      return C.assets.speechBubbleOn(app, group, text, {
        ...o,
        mouthPulse: (t) => { mouth.scale.y = 1 + Math.abs(Math.sin(t / 90)) * 2.6; },
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
      const gen = app.roomGen;
      const t0 = performance.now(), fy = neck.rotation.y, fx = neck.rotation.x;
      const hook = () => {
        if (lookToken !== token || app.roomGen !== gen) return app.offFrame(hook);
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
      const gen = app.roomGen;
      let nextBlink = 2 + Math.random() * 3, blinkEnd = 0;
      let shiftPhase = Math.random() * Math.PI * 2;
      const hook = (dt, elapsed) => {
        if (app.roomGen !== gen) return app.offFrame(hook);
        spine.rotation.z = Math.sin(elapsed * 0.8 + shiftPhase) * 0.02;
        spine.rotation.x = Math.sin(elapsed * 0.55 + shiftPhase) * 0.012 + serviceLean;
        const shift = Math.sin(elapsed * 0.25 + shiftPhase) * 0.05;
        joints.hipL.rotation.z = shift;
        joints.hipR.rotation.z = shift;
        if (elapsed > nextBlink) { blinkEnd = elapsed + 0.13; nextBlink = elapsed + 2 + Math.random() * 3.5; }
        const blinking = elapsed < blinkEnd;
        eyes.forEach((e) => { e.scale.y = blinking ? 0.08 : 1; });
      };
      hook.cancel = () => app.offFrame(hook);
      app.onFrame(hook);
      return hook;
    }

    return { group, joints, play, stop, say, lookAt, setIdle, walkTo, handContactWorld };
  }

  C.rig = { makeHumanRig };
  C.rigPalettes = { SKINS, HAIRS, VESTS };
})();
