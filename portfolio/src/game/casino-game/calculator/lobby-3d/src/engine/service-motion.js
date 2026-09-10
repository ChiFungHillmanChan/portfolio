(() => {
  const C = (globalThis.CASINO ??= {});

  // Register once, after hand-paths.js. Per-service coordinates are refs,
  // never edits to shared paths while another station is performing.
  for (const side of ['R', 'L']) {
    const other = side === 'R' ? 'L' : 'R';
    const path = (dur, points) => ({ dur, continuous: true, anchor: 'palm', grip: 'service',
      hands: { [side]: points, [other]: [{ at: 1, ref: 'rack' }] } });
    C.handPaths.PATHS['servicePick' + side] = path(900, [
      { at: 0.24, ref: 'shoe', offset: [0, 0.07, 0] },
      { at: 0.42, ref: 'shoe', event: 'grab' },
      { at: 0.88, ref: 'target' }, { at: 1, ref: 'target' },
    ]);
    C.handPaths.PATHS['servicePose' + side] = path(600, [{ at: 1, ref: 'target' }]);
    C.handPaths.PATHS['servicePlace' + side] = path(900, [
      { at: 0.65, ref: 'target', event: 'release' }, { at: 1, rest: true },
    ]);
  }
  C.handPaths.PATHS.serviceRest = { dur: 600, continuous: true, anchor: 'palm', grip: 'service', hands: {
    L: [{ at: 1, rest: true }], R: [{ at: 1, rest: true }],
  } };

  function create(app, rig, spaceRoot) {
    const generation = app.roomGen, held = {}, pending = new Set(), animations = new Set(), settles = new Set();
    let active = true, tracking = false, pathJob = null;
    const vector = value => value?.isVector3 ? value.clone() : new THREE.Vector3(...value);
    const duration = (value, fallback) => Number.isFinite(value) ? Math.max(1, value) : fallback;
    const localWorld = point => spaceRoot.localToWorld(vector(point));
    const palm = side => (rig.handContactWorld?.(side) || rig.handWorld?.(side))?.clone();
    const otherSide = side => side === 'R' ? 'L' : 'R';
    const validSide = side => side === 'R' || side === 'L';

    function cancel() {
      if (!active) return;
      active = false;
      rig.stop?.('arms');
      app.offFrame(tick); tracking = false;
      delete held.R; delete held.L;
      animations.clear(); settles.clear();
      for (const job of [...pending]) job.finish(false);
      pathJob = null;
    }
    function live() {
      if (active && app.roomGen !== generation) cancel();
      return active;
    }
    function updateTracking(reorder = false) {
      const needed = active && (pending.size || held.R || held.L);
      if (tracking && (!needed || reorder)) { app.offFrame(tick); tracking = false; }
      if (needed && !tracking) { app.onFrame(tick); tracking = true; }
    }
    function job() {
      let resolve;
      const result = new Promise(done => { resolve = done; });
      const item = { result, done: false, finish(ok) {
        if (item.done) return;
        item.done = true; pending.delete(item);
        if (!ok) for (const settle of settles) if (settle.owner === item) settles.delete(settle);
        resolve(ok); updateTracking();
      } };
      pending.add(item);
      return item;
    }
    // Work in the prop parent's coordinates, allowing nested service props.
    // Recompute the grip offset after every user rotation/scale update.
    function align(item, contact) {
      if (!contact || !item.prop.parent) return;
      const point = item.prop.parent.worldToLocal(contact.clone());
      const offset = item.grip.clone().multiply(item.prop.scale).applyQuaternion(item.prop.quaternion);
      item.prop.position.copy(point.sub(offset));
      item.prop.updateMatrixWorld(true);
    }
    function trackHeld() {
      for (const side of ['R', 'L']) if (held[side]) {
        align(held[side], app.REDUCED ? held[side].anchor : palm(side));
      }
    }
    function tick() {
      if (!live()) return;
      const now = performance.now(), finished = [];
      for (const item of [...animations]) {
        const t = Math.min(1, Math.max(0, (now - item.start) / item.ms));
        try { item.onFrame?.(t); } catch (_) {
          animations.delete(item); item.job.finish(false); continue;
        }
        if (!live()) return;
        if (t === 1) { animations.delete(item); finished.push(item.job); }
      }
      trackHeld();
      for (const item of [...settles]) {
        const t = Math.min(1, Math.max(0, (now - item.start) / item.ms));
        const ease = t * t * (3 - 2 * t);
        if (item.prop.parent) {
          item.prop.position.copy(item.prop.parent.worldToLocal(item.from.clone().lerp(item.target, ease)));
        }
        if (t === 1) { settles.delete(item); item.finish(); }
      }
      for (const item of finished) item.finish(true);
      updateTracking();
    }
    tick.cancel = cancel;
    function runPath(name, options, complete) {
      if (pathJob && !pathJob.done) pathJob.finish(false);
      const current = job(); pathJob = current;
      const on = {};
      for (const [event, fn] of Object.entries(options.on || {})) {
        on[event] = (wrist, meta) => {
          if (live() && pathJob === current && !current.done) fn(meta?.contactWorld || wrist, meta, current);
        };
      }
      try {
        const playing = rig.play(app, name, { ...options, on });
        // The fallback rig installs its pose hook in play(). Tracking must
        // follow that hook, including on each successive action.
        updateTracking(true);
        Promise.resolve(playing).then(() => {
          if (!live() || pathJob !== current || current.done) return;
          trackHeld();
          if (complete) complete(current); else current.finish(true);
        }, () => current.finish(false));
      } catch (_) { current.finish(false); }
      return current.result;
    }
    function refs(side, target, source) {
      const other = palm(otherSide(side));
      return { target: target.toArray(), rack: (other || target).toArray(),
        ...(source ? { shoe: source.toArray() } : {}) };
    }

    function pick(prop, { side = 'R', grip = [0, 0, 0], target, ms = 900 } = {}) {
      if (!live() || !validSide(side) || !prop?.parent || held[side]) return Promise.resolve(false);
      const item = { prop, grip: vector(grip) };
      const source = prop.localToWorld(item.grip.clone());
      const destination = target ? localWorld(target) : source.clone().add(new THREE.Vector3(0, 0.08, 0));
      if (app.REDUCED) {
        item.anchor = destination; held[side] = item; trackHeld(); updateTracking();
        return Promise.resolve(true);
      }
      let grabbed = false;
      return runPath('servicePick' + side, { ms: duration(ms, 900), refs: refs(side, destination, source), on: {
        grab(contact) { grabbed = true; held[side] = item; align(item, contact); },
      } }, current => current.finish(grabbed));
    }
    function pose({ side = 'R', target, ms = 600 } = {}) {
      if (!live() || !validSide(side) || !target) return Promise.resolve(false);
      const destination = localWorld(target);
      if (app.REDUCED) {
        if (held[side]) held[side].anchor = destination;
        trackHeld(); return Promise.resolve(true);
      }
      return runPath('servicePose' + side, { ms: duration(ms, 600), refs: refs(side, destination) });
    }
    function place({ side = 'R', target, ms = 900 } = {}) {
      if (!live() || !validSide(side) || !target || !held[side]) return Promise.resolve(false);
      const item = held[side], base = localWorld(target), span = duration(ms, 900);
      const offset = item.prop.localToWorld(item.grip.clone()).sub(item.prop.getWorldPosition(new THREE.Vector3()));
      const destination = base.clone().add(offset);
      if (app.REDUCED) {
        delete held[side];
        item.prop.position.copy(item.prop.parent.worldToLocal(base));
        updateTracking(); return Promise.resolve(true);
      }
      let released = false, settled = false, recovery = null;
      return runPath('servicePlace' + side, { ms: span, refs: refs(side, destination), on: {
        release(contact, _meta, current) {
          if (released) return;
          released = true; align(item, contact); delete held[side];
          // Real IK can miss a requested point by a few millimetres. Keep
          // continuity at release, then settle the base onto the counter.
          settles.add({ owner: current, prop: item.prop, from: item.prop.getWorldPosition(new THREE.Vector3()), target: base,
            start: performance.now(), ms: Math.min(180, span * 0.2),
            finish() { settled = true; recovery?.finish(true); } });
        },
      } }, current => {
        if (!released) current.finish(false);
        else if (settled) current.finish(true);
        else recovery = current;
      });
    }
    function animate({ ms = 600, onFrame } = {}) {
      if (!live()) return Promise.resolve(false);
      const current = job();
      animations.add({ job: current, start: performance.now(), ms: app.REDUCED ? 0 : duration(ms, 600), onFrame });
      if (app.REDUCED) {
        // Reduced motion still updates the final prop orientation/base.
        const item = [...animations].at(-1); item.start -= 1; item.ms = 1;
        tick();
      } else updateTracking();
      return current.result;
    }
    function rest() {
      if (!live()) return Promise.resolve(false);
      if (app.REDUCED) return Promise.resolve(true);
      return runPath('serviceRest', { ms: 600 });
    }
    return { pick, pose, place, animate, rest, cancel };
  }
  C.serviceMotion = { create };
})();
