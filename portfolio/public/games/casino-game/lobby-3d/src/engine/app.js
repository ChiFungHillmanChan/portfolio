(() => {
  const C = (globalThis.CASINO ??= {});
  const frameHooks = new Set();
  const pickables = [];   // { mesh, onClick }
  let bannerTimer = null;
  let fadeGen = 0;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A phone held LANDSCAPE is wider than 768px, so the old max-width test
  // silently gave phones the desktop budget (shadows, antialias, 2x pixel
  // ratio). Detect the DEVICE instead: coarse pointer + a screen whose
  // short side is phone/small-tablet sized (orientation-proof via min()).
  const IS_MOBILE = matchMedia('(pointer: coarse)').matches &&
    Math.min(screen.width, screen.height) <= 820;
  // gates #rotate-gate (style.css): portrait phones must turn landscape
  if (IS_MOBILE) document.documentElement.classList.add('is-mobile');

  // First-person player: position on the floor plane + yaw/pitch. yaw 0 faces
  // +Z (south); yaw π/2 faces +X (east, into the casino).
  const P = { x: -25.5, z: 0, yaw: Math.PI / 2, pitch: 0, eyeY: null };   // eyeY: glideTo height override (null = standing EYE)
  const SPEED = 3.2, GLIDE = 5.0, RADIUS = 0.35;
  const keys = Object.create(null);
  let ui = null;
  let glide = null;      // tap-to-move target {x, z, onDone}
  let flyHook = null;    // exact-pose camera tween (stage.goTo)
  let lastBlocked = 0;

  const to2D = () => location.replace('../index.html?toast=3d-unavailable');

  const inRect = (r, px, pz) =>
    px > r.x0 + RADIUS && px < r.x1 - RADIUS && pz > r.z0 + RADIUS && pz < r.z1 - RADIUS;

  function walkableRects() {
    return C.floorplan.WALK_RECTS.filter((r) => r.id !== 'gate' || C.world.gateOpen);
  }

  // Returns a corrected {x,z} if the point (after obstacle push-out) is
  // walkable, else null.
  function clampWalk(x, z) {
    const rects = walkableRects();
    if (!rects.some((r) => inRect(r, x, z))) return null;
    for (const o of C.world.obstacles) {
      const dx = x - o.x, dz = z - o.z, d2 = dx * dx + dz * dz, min = o.r + RADIUS;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 1e-4;
        x = o.x + (dx / d) * min; z = o.z + (dz / d) * min;
        if (!rects.some((r) => inRect(r, x, z))) return null;
      }
    }
    return { x, z };
  }

  function tryMove(nx, nz) {
    let r = clampWalk(nx, nz);
    if (!r) r = clampWalk(nx, P.z);      // axis-separated slide along walls
    if (!r) r = clampWalk(P.x, nz);
    if (r) { P.x = r.x; P.z = r.z; return true; }
    // Pushed against the closed turnstile? (moving east near the gate line)
    if (!C.world.gateOpen && nx > P.x &&
        Math.abs(P.x - C.floorplan.GATE_X) < 1.4 && Math.abs(P.z) < 1.7) {
      const now = performance.now();
      if (now - lastBlocked > 1500) { lastBlocked = now; ui?.onTurnstileBlocked?.(); }
    }
    return false;
  }

  function cancelFly() {
    if (flyHook) { const h = flyHook; flyHook = null; h.cancel(); }
  }

  C.app = {
    scene: null, camera: null, renderer: null, player: P,
    REDUCED, IS_MOBILE,

    init(opts = {}) {
      ui = opts.ui || null;
      if (new URLSearchParams(location.search).has('nowebgl')) return to2D();
      const canvas = document.getElementById('stage');
      let renderer;
      try {
        // r149 gotcha: legacyMode=true double-encodes hex colors under sRGB
        // output — must be off before any THREE.Color is constructed.
        THREE.ColorManagement.legacyMode = false;
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_MOBILE });
        renderer.outputEncoding = THREE.sRGBEncoding;
      } catch (err) {
        console.error('WebGL init failed:', err);
        return to2D();
      }
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); to2D(); });
      renderer.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1.5 : 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = !IS_MOBILE;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 120);
      Object.assign(C.app, { renderer, scene, camera });

      addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
      });

      // ----- input: drag-look (mouse AND touch) vs tap (move / pick) -----
      // Pointer capture keeps the drag alive even when the pointer leaves the
      // canvas (releasing outside used to leave the camera glued to the
      // mouse), and only the primary pointer steers (multi-touch ignored).
      // A drag of ANY pointer type never falls through to tap-to-move —
      // swiping to look on an iPad must not send the player walking.
      const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      let look = null;   // { id, x, y, yaw, pitch, dragging }
      canvas.addEventListener('pointerdown', (e) => {
        if (C.app.inputLocked || !e.isPrimary) return;
        look = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: P.yaw, pitch: P.pitch, dragging: false };
        canvas.setPointerCapture?.(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!look || e.pointerId !== look.id) return;
        const dx = e.clientX - look.x, dy = e.clientY - look.y;
        const threshold = e.pointerType === 'touch' ? 10 : 6;
        if (!look.dragging && Math.hypot(dx, dy) > threshold) look.dragging = true;
        if (look.dragging) {
          cancelFly();
          if (glide) glide.turn = false;   // user owns the camera — stop auto-facing
          const sens = e.pointerType === 'touch' ? 0.0052 : 0.004;
          P.yaw = look.yaw - dx * sens;
          P.pitch = Math.max(-0.5, Math.min(0.42, look.pitch - dy * sens * 0.75));
        }
      });
      canvas.addEventListener('pointerup', (e) => {
        if (!look || e.pointerId !== look.id) return;
        const wasDrag = look.dragging;
        look = null;
        if (wasDrag) return;
        ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        ray.setFromCamera(ptr, camera);
        const hit = ray.intersectObjects(pickables.map((p) => p.mesh), true)[0];
        if (hit) {
          let obj = hit.object;
          while (obj) {
            const found = pickables.find((p) => p.mesh === obj);
            if (found) return found.onClick();
            obj = obj.parent;
          }
        }
        const pt = new THREE.Vector3();
        if (ray.ray.intersectPlane(floorPlane, pt)) C.app.walkTo(pt.x, pt.z);
      });
      canvas.addEventListener('pointercancel', () => { look = null; });
      addEventListener('keydown', (e) => {
        if (e.target instanceof HTMLElement &&
            ['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        keys[e.code] = true;
      });
      addEventListener('keyup', (e) => { keys[e.code] = false; });
      addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

      // ----- frame loop -----
      let last = performance.now(), proxTimer = 0, nearId, zoneId, stepAccum = 0;
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const locked = C.app.inputLocked;
        const f = locked ? 0 : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
        const s = locked ? 0 : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
        if (f || s) {
          glide = null; cancelFly();
          // sprint: hold E or Shift while moving
          const speed = SPEED * (keys.KeyE || keys.ShiftLeft || keys.ShiftRight ? 1.8 : 1);
          const len = Math.hypot(f, s) || 1;
          const dx = (Math.sin(P.yaw) * f + Math.cos(P.yaw) * s) / len;
          const dz = (Math.cos(P.yaw) * f - Math.sin(P.yaw) * s) / len;
          if (tryMove(P.x + dx * speed * dt, P.z + dz * speed * dt)) stepAccum += dt;
        } else if (glide) {
          const dx = glide.x - P.x, dz = glide.z - P.z, d = Math.hypot(dx, dz);
          if (d < 0.05) { const done = glide.onDone; glide = null; done?.(); }
          else {
            // ease-out arrival: decelerate over the last metre instead of a hard stop
            const speed = Math.min(GLIDE, Math.max(1.4, d * 2.2));
            const moved = tryMove(P.x + (dx / d) * Math.min(speed * dt, d),
                                  P.z + (dz / d) * Math.min(speed * dt, d));
            if (moved) stepAccum += dt;
            if (!moved) { const done = glide.onDone; glide = null; done?.(); }
            else if (glide && glide.turn) {
              // yawTarget is FIXED at walkTo time — re-aiming at the noisy
              // remaining vector each frame made the camera shake on arrival
              let dy = glide.yawTarget - P.yaw;
              while (dy > Math.PI) dy -= 2 * Math.PI;
              while (dy < -Math.PI) dy += 2 * Math.PI;
              P.yaw += dy * Math.min(1, dt * 3.5);
              if (Math.abs(dy) < 0.02) glide.turn = false;
            }
          }
        }
        if (stepAccum > 0.45) { stepAccum = 0; C.sound?.play('step'); }   // footsteps
        // proximity + zone checks at ~10 Hz
        proxTimer += dt;
        if (proxTimer > 0.1) {
          proxTimer = 0;
          let best = null, bestD = Infinity;
          for (const a of C.world.anchors) {
            const d = Math.hypot(P.x - a.pos[0], P.z - a.pos[1]);
            if (d < a.radius && d < bestD) { best = a; bestD = d; }
          }
          if ((best && best.id) !== nearId) { nearId = best && best.id; ui?.onNear?.(best || null); }
          const zone = C.floorplan.ZONES.find((zz) => P.x >= zz.x0 && P.x <= zz.x1 && P.z >= zz.z0 && P.z <= zz.z1);
          if ((zone && zone.id) !== zoneId) { zoneId = zone && zone.id; ui?.onSectionChange?.(zoneId || null); }
        }
        // Raised-eye poses (glideTo's eyeY — e.g. the roulette spin's
        // overhead wheel shot) hold their height while the camera is
        // parked; any player-driven movement eases back to standing EYE.
        if (P.eyeY != null && (f || s || glide)) {
          P.eyeY += (C.floorplan.EYE - P.eyeY) * Math.min(1, dt * 3.5);
          if (Math.abs(P.eyeY - C.floorplan.EYE) < 0.01) P.eyeY = null;
        }
        const eye = P.eyeY ?? C.floorplan.EYE;
        camera.position.set(P.x, eye, P.z);
        camera.lookAt(
          P.x + Math.sin(P.yaw) * Math.cos(P.pitch),
          eye + Math.sin(P.pitch),
          P.z + Math.cos(P.yaw) * Math.cos(P.pitch),
        );
        frameHooks.forEach((fn) => fn(dt, now / 1000));
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    // Tap-to-move: glide the player toward a floor point (clamped walkable).
    walkTo(x, z, onDone) {
      cancelFly();
      const c = clampWalk(x, z) || { x, z };
      if (REDUCED) {
        if (!tryMove(c.x, c.z)) { /* blocked — stay put */ }
        onDone?.();
        return;
      }
      const dist = Math.hypot(c.x - P.x, c.z - P.z);
      glide = {
        x: c.x, z: c.z, onDone,
        // gently face where you're walking — but a short reposition
        // shouldn't swing the camera around at all
        turn: dist > 1.2,
        yawTarget: Math.atan2(c.x - P.x, c.z - P.z),
      };
    },

    // A closed turnstile must block click-to-fly the same way it blocks
    // walking: glideTo deliberately ignores collision, so flying a signed-out
    // player from the vestibule to a floor-side pose would skip the ID check.
    // (East→west stays allowed — sign-out pulls the player back to spawn.)
    canFlyTo(pos) {
      if (C.world.gateOpen) return true;
      const gx = C.floorplan.GATE_X;
      if (P.x < gx && pos[0] > gx) { ui?.onTurnstileBlocked?.(); return false; }
      return true;
    },

    // Fly the camera to an exact pose (stage.goTo / walkToDesk). Ignores
    // collision — poses are always chosen inside walkable space.
    // opts.eyeY raises/lowers the camera off the standing EYE height for
    // this pose (the roulette spin's overhead wheel shot); omitting it
    // glides any previous override back to the default.
    glideTo(pos, look, ms = 1100, opts = {}) {
      cancelFly();
      glide = null;
      return new Promise((res) => {
        const wantEye = opts.eyeY ?? C.floorplan.EYE;
        const wantYaw = Math.atan2(look[0] - pos[0], look[2] - pos[2]);
        const flat = Math.hypot(look[0] - pos[0], look[2] - pos[2]);
        const wantPitch = Math.atan2(look[1] - wantEye, flat) * 0.9;
        if (REDUCED) {
          Object.assign(P, { x: pos[0], z: pos[2], yaw: wantYaw, pitch: wantPitch });
          P.eyeY = opts.eyeY == null ? null : wantEye;
          return res();
        }
        const from = { x: P.x, z: P.z, yaw: P.yaw, pitch: P.pitch, eye: P.eyeY ?? C.floorplan.EYE };
        let dyaw = wantYaw - from.yaw;
        while (dyaw > Math.PI) dyaw -= 2 * Math.PI;
        while (dyaw < -Math.PI) dyaw += 2 * Math.PI;
        const t0 = performance.now();
        const hook = () => {
          const t = Math.min(1, (performance.now() - t0) / ms);
          const e = C.tween.easings.inOutCubic(t);
          P.x = from.x + (pos[0] - from.x) * e;
          P.z = from.z + (pos[2] - from.z) * e;
          P.yaw = from.yaw + dyaw * e;
          P.pitch = from.pitch + (wantPitch - from.pitch) * e;
          P.eyeY = from.eye + (wantEye - from.eye) * e;
          if (t >= 1) {
            if (opts.eyeY == null) P.eyeY = null;
            C.app.offFrame(hook); if (flyHook === hook) flyHook = null; res();
          }
        };
        hook.cancel = () => { C.app.offFrame(hook); res(); };
        flyHook = hook;
        C.app.onFrame(hook);
      });
    },
    goToAnchor(a) {
      if (!C.app.canFlyTo(a.approach.pos)) return Promise.resolve();
      return C.app.glideTo(a.approach.pos, a.approach.look);
    },

    spawn() {
      const s = C.floorplan.SPAWN;
      P.x = s.pos[0]; P.z = s.pos[2];
      P.yaw = Math.atan2(s.look[0] - s.pos[0], s.look[2] - s.pos[2]);
      P.pitch = 0;
    },

    // While true, walk/look/tap input is ignored (set by the live-play
    // session so betting can't wander the camera away from the table).
    inputLocked: false,
    onFrame: (fn) => frameHooks.add(fn),
    offFrame: (fn) => frameHooks.delete(fn),
    addPickable: (mesh, onClick) => pickables.push({ mesh, onClick }),

    banner(title, sub = '', ms = 2600) {
      const el = document.getElementById('banner');
      if (bannerTimer) { clearTimeout(bannerTimer.id); bannerTimer.res(); bannerTimer = null; }
      el.innerHTML = `<h2>${title}</h2>` + (sub ? `<p>${sub}</p>` : '');
      el.hidden = false;
      return new Promise((res) => {
        const id = setTimeout(() => { el.hidden = true; bannerTimer = null; res(); }, ms);
        bannerTimer = { id, res };
      });
    },

    fade(midFn) {
      const el = document.getElementById('fader');
      const gen = ++fadeGen;
      el.classList.add('on');
      return new Promise((res) => setTimeout(async () => {
        if (gen !== fadeGen) return res();   // superseded by a newer fade — it owns the fader now
        try { await midFn(); } catch (err) { console.error('fade midFn failed:', err); }
        el.classList.remove('on');
        res();
      }, 200));
    },
  };
})();
