(() => {
  const C = (globalThis.CASINO ??= {});

  // ---------- canvas texture ----------
  function canvasTexture(w, h, draw) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    draw(cv.getContext('2d'));
    const tx = new THREE.CanvasTexture(cv);
    tx.encoding = THREE.sRGBEncoding;
    tx.anisotropy = 4;
    return tx;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- dealer speech bubble ----------
  // Shared dealer speech bubble: sprite on `group`, auto-removed after ms.
  // mouthPulse(t) is optional — procedural rig scales its mouth mesh each
  // tick, GLB characters do a subtle head bob instead. Calling it with t=0
  // at cleanup doubles as the "reset to neutral" step (sin(0)=0), so no
  // separate reset hook is needed. Bubble/token bookkeeping is per-group
  // (group.userData._bubble, a module-local Map keyed by group.uuid) since
  // this single function now serves every dealer group, procedural or GLB.
  const mouthTokens = new Map();
  function speechBubbleOn(app, group, text, { ms = 2600, mouthPulse = null } = {}) {
    const prevBubble = group.userData._bubble;
    if (prevBubble) { group.remove(prevBubble.sprite); prevBubble.dispose(); group.userData._bubble = null; }
    const lines = C.gestures.wrapLines(text, 18);
    const PW = 512, LH = 88, PH = lines.length * LH + 72;
    const tx = canvasTexture(PW, PH, (ctx) => {
      ctx.clearRect(0, 0, PW, PH);
      ctx.fillStyle = 'rgba(16,13,9,0.88)';
      roundRect(ctx, 6, 6, PW - 12, PH - 30, 26);
      ctx.fill();
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 5;
      roundRect(ctx, 6, 6, PW - 12, PH - 30, 26);
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
    const bubble = { sprite, dispose: () => { mat.map.dispose(); mat.dispose(); } };
    group.userData._bubble = bubble;

    const key = group.uuid;
    const token = (mouthTokens.get(key) || 0) + 1;
    mouthTokens.set(key, token);
    const gen = app.roomGen;
    return new Promise((resolve) => {
      const t0 = performance.now();
      const cleanup = () => {
        mouthPulse && mouthPulse(0);
        if (group.userData._bubble === bubble) { group.remove(sprite); bubble.dispose(); group.userData._bubble = null; }
        resolve();
      };
      if (app.REDUCED) { setTimeout(cleanup, ms); return; }
      const hook = () => {
        if (mouthTokens.get(key) !== token || app.roomGen !== gen) { app.offFrame(hook); return cleanup(); }
        const t = (performance.now() - t0);
        mouthPulse && mouthPulse(t);
        if (t >= ms) { app.offFrame(hook); cleanup(); }
      };
      hook.cancel = () => { app.offFrame(hook); cleanup(); };
      app.onFrame(hook);
    });
  }

  // Cancel any in-flight bubble on `group`: bumps its mouthTokens entry so
  // the active bubble's frame hook (running in speechBubbleOn's Promise
  // above) sees a stale token on its next tick and runs its own cleanup path
  // (sprite removed, mouthPulse(0), promise resolved). This is the same
  // idiom stop() already uses for arms/head/body tokens — mouth just lives
  // in a different (module-local, group-keyed) map since the bubble helper
  // is shared across the procedural rig and GLB character impls.
  function stopBubble(group) {
    const key = group.uuid;
    mouthTokens.set(key, (mouthTokens.get(key) || 0) + 1);
  }

  // ---------- materials ----------
  function feltMaterial(color = '#0b5d3b') {
    const tx = canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
      }
      const g = ctx.createRadialGradient(256, 256, 60, 256, 256, 360);
      g.addColorStop(0, 'rgba(255,255,255,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    });
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.95, metalness: 0 });
  }

  function woodMaterial(color = '#4a2c17') {
    const tx = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 256;
        ctx.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(x + (Math.random() * 6 - 3), 0);
        ctx.bezierCurveTo(x + (Math.random() * 10 - 5), 85, x + (Math.random() * 10 - 5), 170, x + (Math.random() * 6 - 3), 256);
        ctx.stroke();
      }
      const g = ctx.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, 'rgba(255,220,180,0.06)');
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(255,220,180,0.06)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    });
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.55, metalness: 0.05 });
  }

  function goldMaterial() {
    return new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 0.85, roughness: 0.25 });
  }

  function carpetMaterial(color = '#7a1f1f') {
    const tx = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      for (let y = -32; y < 288; y += 32) {
        ctx.beginPath();
        for (let x = -32; x <= 288; x += 32) {
          ctx.moveTo(x, y + 16); ctx.lineTo(x + 16, y); ctx.lineTo(x + 32, y + 16); ctx.lineTo(x + 16, y + 32); ctx.closePath();
        }
        ctx.stroke();
      }
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
      }
    });
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(6, 6);
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9, metalness: 0 });
  }

  // ---------- stool ----------
  function makeStool() {
    const group = new THREE.Group();
    const seatH = 0.05;
    const seatMat = new THREE.MeshStandardMaterial({ color: '#5a1f1a', roughness: 0.6, metalness: 0.05 });
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, seatH, 24), seatMat);
    seat.position.y = 0.75 - seatH / 2; // top surface at 0.75
    seat.castShadow = true; seat.receiveShadow = true;
    group.add(seat);

    // Each leg is built to its own exact top/foot points (rather than a fixed
    // geometry rotated by a guessed angle), so it always spans exactly from
    // the seat underside down to the floor with no gap or overshoot.
    const legMat = woodMaterial();
    const topY = 0.7, topR = 0.15, footR = 0.19; // topY == seat underside (0.75 - seatH)
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + i * Math.PI / 2;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const top = new THREE.Vector3(topR * cos, topY, topR * sin);
      const foot = new THREE.Vector3(footR * cos, 0, footR * sin);
      const dir = new THREE.Vector3().subVectors(foot, top);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(top, foot).multiplyScalar(0.5);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 10), legMat);
      leg.position.copy(mid);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      leg.castShadow = true; leg.receiveShadow = true;
      group.add(leg);
    }
    return group;
  }

  // ---------- dealer / staff figure ----------
  // Returns a root Group whose userData.rig is a STABLE facade: procedural
  // rig first, GLB character swapped in when C.character assets arrive.
  // Call sites hold the facade reference — it never changes identity.
  function makeDealer(opts = {}) {
    const app = C.app;
    const procedural = C.rig.makeHumanRig(opts);
    const root = new THREE.Group();
    root.add(procedural.group);
    let impl = procedural;
    let idleWanted = false;
    let procIdle = null;
    const facade = {
      play: (a, name, o) => impl.play(a, name, o),
      stop: (t) => impl.stop(t),
      say: (a, text, o) => impl.say(a, text, o),
      lookAt: (a, tgt) => impl.lookAt(a, tgt),
      setIdle: (a) => {
        idleWanted = true;
        const hook = impl.setIdle(a);
        if (impl === procedural) procIdle = hook;
        return hook;
      },
      get joints() { return impl.joints; },
      // World-space palm position for the current impl (GLB char exposes
      // `bones.handL/handR`; procedural rig exposes `joints.wristL/wristR`).
      // Used by baccarat-show.js (Task 8) + Task 9's prop-release sync.
      // Returns null when neither impl has the joint (shouldn't happen for
      // either rig, but keeps callers' existing-authored-fallback branch
      // reachable without a throw).
      handWorld: (side) => {
        const v = new THREE.Vector3();
        if (impl.bones?.['hand' + side]) return impl.bones['hand' + side].getWorldPosition(v);
        if (impl.joints?.['wrist' + side]) return impl.joints['wrist' + side].getWorldPosition(v);
        return null;
      },
      // The actual hand bone object (not just its world position) — Task 9
      // parents props (e.g. the roulette dolly) to it between an IK path's
      // grab/release events so they physically ride in the dealer's hand.
      // Procedural rig has no bone hierarchy for this, so it returns null;
      // callers gate on C.character.ready === 'ready' before using it, same
      // as every other GLB-only capability in this facade.
      handBone: (side) => impl.bones?.['hand' + side] ?? null,
    };
    if (app && !app.REDUCED) {
      C.character?.attach(app, root, opts, (charImpl) => {
        ['arms', 'head', 'body', 'mouth'].forEach((t) => procedural.stop(t));
        procIdle?.cancel?.();
        root.remove(procedural.group);
        impl = charImpl;
        if (idleWanted) impl.setIdle(app);
      });
    }
    root.userData.rig = facade;
    root.userData.idle = (a) => facade.setIdle(a);
    root.userData.lookToward = (a, worldTarget) => facade.lookAt(a, worldTarget);
    root.userData.headShake = (a) => facade.play(a, 'headShake');
    root.userData.dealGesture = (a, worldTarget, ms) =>
      facade.play(a, 'welcomeSweep', { refs: { target: worldTarget }, ms });
    return root;
  }

  // ---------- plaque ----------
  function makePlaque(lines) {
    const w = 0.5, h = 0.32, d = 0.03;
    const faceTx = canvasTexture(512, 328, (ctx) => {
      ctx.fillStyle = '#1a1208'; ctx.fillRect(0, 0, 512, 328);
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 492, 308);
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 472, 288);
      ctx.fillStyle = '#f0d878';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const startY = 164 - (lines.length - 1) * 26;
      lines.forEach((line, i) => {
        ctx.font = i === 0 ? 'bold 42px Georgia, serif' : '26px Georgia, serif';
        ctx.fillText(line, 256, startY + i * 52);
      });
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 0.7, roughness: 0.3 });
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTx, roughness: 0.4, metalness: 0.1 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      [brassMat, brassMat, brassMat, brassMat, faceMat, brassMat]);
    box.position.y = 0.55 + h / 2;
    box.castShadow = true; box.receiveShadow = true;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 10), woodMaterial());
    pole.position.y = 0.275;
    pole.castShadow = true; pole.receiveShadow = true;

    const group = new THREE.Group();
    group.add(pole, box);
    return group;
  }

  // ---------- sign ----------
  function makeSign(text) {
    const upper = text.toUpperCase();
    const tx = canvasTexture(560, 144, (ctx) => {
      ctx.fillStyle = '#1a1208'; ctx.fillRect(0, 0, 560, 144);
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 5;
      ctx.strokeRect(8, 8, 544, 128);
      ctx.fillStyle = '#f0d878';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fontSize = 60;
      ctx.font = `bold ${fontSize}px Georgia, serif`;
      // shrink until it fits the plate, with a floor so a pathological string can't spin forever.
      // ctx.font must be re-applied inside the loop -- measureText reads the CURRENT font,
      // so re-measuring without updating it first would just re-check the original size forever.
      while (ctx.measureText(upper).width > 560 - 40 && fontSize > 16) {
        fontSize -= 4;
        ctx.font = `bold ${fontSize}px Georgia, serif`;
      }
      ctx.shadowColor = '#f0d878'; ctx.shadowBlur = 18;
      ctx.fillText(upper, 280, 76);
    });
    const mat = new THREE.MeshStandardMaterial({
      map: tx, emissive: '#c9a227', emissiveMap: tx, emissiveIntensity: 0.9,
      roughness: 0.35, metalness: 0.4,
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.36), mat);
  }

  // ---------- v2 modern-casino materials ----------
  function carpetModern(base = '#15171e', accent = '#242838') {
    const tx = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      for (let y = 0; y <= 256; y += 32) {
        for (let x = 0; x <= 256; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x + 16, y); ctx.lineTo(x + 32, y + 16);
          ctx.lineTo(x + 16, y + 32); ctx.lineTo(x, y + 16);
          ctx.closePath(); ctx.stroke();
          ctx.fillStyle = accent;
          ctx.beginPath(); ctx.arc(x + 16, y + 16, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
      }
    });
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(9, 6);
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.95, metalness: 0 });
  }

  function marbleMaterial(base = '#c9ccd2') {
    const tx = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9; i++) {
        const x = Math.random() * 256;
        ctx.strokeStyle = `rgba(90,96,110,${0.10 + Math.random() * 0.14})`;
        ctx.lineWidth = 0.8 + Math.random() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 50 - Math.random() * 100, 85, x + 50 - Math.random() * 100, 170, x + 40 - Math.random() * 80, 256);
        ctx.stroke();
      }
      const g = ctx.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0, 'rgba(255,255,255,0.07)');
      g.addColorStop(1, 'rgba(0,0,0,0.06)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    });
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(5, 3);
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.3, metalness: 0.08 });
  }

  const steelMaterial = () =>
    new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: 0.85, roughness: 0.35 });

  const glassMaterial = (opacity = 0.16) =>
    new THREE.MeshStandardMaterial({
      color: '#aec7d4', transparent: true, opacity, roughness: 0.12, metalness: 0.3,
      side: THREE.DoubleSide, depthWrite: false,
    });

  // Unlit emissive strip — reads as an LED light source regardless of scene light.
  function ledStrip(color, w, h, d) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color, fog: false }));
  }

  // Neon sign: glow-text canvas on a transparent plane + slim dark backing.
  // Double-sided so it reads from both aisle directions.
  function makeNeonSign(text, color = '#ffd27f', { w = 2.4, h = 0.6 } = {}) {
    const upper = text.toUpperCase();
    const PW = 1024, PH = Math.max(128, Math.round(1024 * h / w));
    const tx = canvasTexture(PW, PH, (ctx) => {
      ctx.clearRect(0, 0, PW, PH);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fs = Math.round(PH * 0.62);
      ctx.font = `600 ${fs}px 'Segoe UI', system-ui, sans-serif`;
      while (ctx.measureText(upper).width > PW - 90 && fs > 20) {
        fs -= 4;
        ctx.font = `600 ${fs}px 'Segoe UI', system-ui, sans-serif`;
      }
      ctx.shadowColor = color; ctx.shadowBlur = PH * 0.32;
      ctx.fillStyle = color;
      ctx.fillText(upper, PW / 2, PH / 2 + PH * 0.03);
      ctx.shadowBlur = PH * 0.10;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.fillText(upper, PW / 2, PH / 2 + PH * 0.03);
      ctx.globalAlpha = 1;
    });
    const group = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.1, 0.05),
      new THREE.MeshStandardMaterial({ color: '#0b0d12', roughness: 0.8, metalness: 0.3 }));
    group.add(back);
    const mat = new THREE.MeshBasicMaterial({ map: tx, transparent: true, fog: false, side: THREE.DoubleSide });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    front.position.z = 0.032;
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    rear.rotation.y = Math.PI;
    rear.position.z = -0.032;
    group.add(front, rear);
    return group;
  }

  // Tier-colored LED glow pad under a table: soft radial wash on the floor
  // that doubles as the proximity-highlight rig (setBright flips intensity).
  function makeGlowPad(w, d, color) {
    const tx = canvasTexture(128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    });
    const mat = new THREE.MeshBasicMaterial({
      map: tx, color, transparent: true, opacity: 0.4, depthWrite: false, fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.015;
    mesh.renderOrder = 1;
    mesh.userData.setBright = (on) => { mat.opacity = on ? 0.95 : 0.4; };
    return mesh;
  }

  C.assets = {
    canvasTexture, roundRect, speechBubbleOn, stopBubble, feltMaterial, woodMaterial, goldMaterial, carpetMaterial,
    carpetModern, marbleMaterial, steelMaterial, glassMaterial, ledStrip, makeNeonSign,
    makeGlowPad, makeStool, makeDealer, makePlaque, makeSign,
  };
})();
