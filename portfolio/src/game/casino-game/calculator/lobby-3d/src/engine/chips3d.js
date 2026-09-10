(() => {
  const C = (globalThis.CASINO ??= {});

  // ---------- chips ----------
  const CHIP_COLORS = {
    0.5: '#b9b5a9',
    1: '#9aa0a8', 5: '#8d6e63', 10: '#2f9e5b', 25: '#207f6e', 50: '#c26a1f',
    100: '#2e6db4', 500: '#8e44ad', 1000: '#c0392b', 5000: '#b8860b',
  };
  const CHIP_H = 0.005;
  const CHIP_RADIUS = 0.026;

  // A stack is a rigid stack on the cloth, not a projectile. Quadratic
  // travel gives constant surface deceleration and zero terminal speed.
  // All consumers share cancellation and room-lifetime semantics.
  function slideStack(app, mesh, to, { ms = 480, onDone } = {}) {
    mesh.userData.chipSlide?.cancel();
    const from = mesh.position.clone();
    const gen = app.roomGen, t0 = performance.now();
    let resolve, finished = false;
    const result = new Promise((res) => { resolve = res; });
    const finish = (landed) => {
      if (finished) return;
      finished = true;
      app.offFrame(hook);
      if (mesh.userData.chipSlide === result) delete mesh.userData.chipSlide;
      if (landed) onDone?.();
      resolve(landed);
    };
    const hook = () => {
      if (app.roomGen !== gen) return finish(false);
      const t = Math.max(0, Math.min(1, (performance.now() - t0) / Math.max(1, ms)));
      const travel = 1 - (1 - t) * (1 - t);
      mesh.position.set(
        from.x + (to[0] - from.x) * travel,
        from.y + (to[1] - from.y) * travel,
        from.z + (to[2] - from.z) * travel,
      );
      if (t === 1) finish(true);
    };
    result.cancel = hook.cancel = () => finish(false);
    mesh.userData.chipSlide = result;
    if (app.REDUCED || ms <= 0) {
      mesh.position.set(...to); finish(true);
    } else app.onFrame(hook);
    return result;
  }

  function makeChip(value) {
    const color = CHIP_COLORS[value] || '#555555';
    // Large or consolidated amounts use a counted rectangular plaque so
    // the geometry budget never changes the displayed payout value.
    const plaque = !(value in CHIP_COLORS);
    const topTx = C.assets.canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
      if (plaque) {
        ctx.strokeStyle = '#d3ba85'; ctx.lineWidth = 5; ctx.strokeRect(7, 7, 114, 114);
        ctx.fillStyle = '#eee7d7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '14px sans-serif'; ctx.fillText('COUNTED VALUE', 64, 34);
        ctx.font = 'bold 24px Georgia, serif';
        ctx.fillText(Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }), 64, 70, 108);
        return;
      }
      ctx.strokeStyle = '#eee7d7'; ctx.lineWidth = 10; ctx.setLineDash([12, 15]);
      ctx.beginPath(); ctx.arc(64, 64, 57, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#eee7d7'; ctx.beginPath(); ctx.arc(64, 64, 39, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(64, 64, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#292521';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText(value >= 1000 ? `${value / 1000}K` : String(value), 64, 68);
    });
    const edgeTx = C.assets.canvasTexture(256, 16, (ctx) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 16);
      ctx.fillStyle = '#eee7d7';
      for (let i = 0; i < 8; i++) ctx.fillRect(i * 32 + 8, 0, 10, 16);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, 256, 2); ctx.fillRect(0, 14, 256, 2);
    });
    const sideMat = new THREE.MeshStandardMaterial({ map: edgeTx, roughness: 0.74, metalness: 0 });
    const topMat = new THREE.MeshStandardMaterial({ map: topTx, roughness: 0.68, metalness: 0 });
    const geo = plaque ? new THREE.BoxGeometry(0.074, CHIP_H - 0.0002, 0.048)
      : new THREE.CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_H - 0.0002, 32);
    const mesh = new THREE.Mesh(geo, plaque
      ? [sideMat, sideMat, topMat, topMat, sideMat, sideMat] : [sideMat, topMat, topMat]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.value = value;
    return mesh;
  }

  function makeChipStack(value, n) {
    const group = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const chip = makeChip(value);
      chip.position.y = i * CHIP_H;
      chip.rotation.y = Math.random() * 0.3 - 0.15;
      group.add(chip);
    }
    group.userData.value = value;
    group.userData.count = n;
    return group;
  }

  // Painted circular bet spot decal (MAIN / ANTE / TRIPS ... ) laid on the felt.
  function makeSpotDecal({ label = '', r = 0.09, color = 'rgba(240,216,120,0.65)' } = {}) {
    const P = 128;
    const tx = C.assets.canvasTexture(P, P, (ctx) => {
      ctx.clearRect(0, 0, P, P);
      ctx.strokeStyle = color; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(P / 2, P / 2, P / 2 - 6, 0, Math.PI * 2); ctx.stroke();
      if (label) {
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 24px Georgia, serif';
        ctx.fillText(label, P / 2, P / 2);
      }
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2, r * 2),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 1;
    return mesh;
  }

  function disposeChip(mesh) {
    if (mesh.userData.chipDisposed) return;
    mesh.userData.chipDisposed = true;
    mesh.userData.chipSlide?.cancel();
    mesh.geometry?.dispose();
    new Set(Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      .forEach((m) => { if (!m) return; m.map?.dispose(); m.dispose(); });
  }

  // Live 3D wager stacks for one room. Every animation carries the roomGen
  // guard + hook.cancel, mirroring dealCardTo.
  function createBetStacks(app, { getSpotPos, source, dealerPos }) {
    const gen = app.roomGen;
    const stacks = {};
    const owned = new Set();
    const inFlight = new Set();
    let disposed = false;
    const alive = () => !disposed && app.roomGen === gen;

    function discard(chip) {
      app.scene.remove(chip);
      owned.delete(chip);
      disposeChip(chip);
    }

    function create(value, position) {
      const chip = makeChip(value);
      chip.position.set(...position);
      chip.rotation.y = Math.random() * 0.3 - 0.15;
      owned.add(chip);
      app.scene.add(chip);
      return chip;
    }

    function slide(chip, to, ms) {
      if (!alive()) return Promise.resolve(false);
      const movement = slideStack(app, chip, to, { ms });
      inFlight.add(movement);
      movement.then(() => inFlight.delete(movement));
      return movement;
    }

    function stackTop(spotId) {
      const [x, y, z] = getSpotPos(spotId);
      return [x, y + CHIP_H / 2 + (stacks[spotId] || []).length * CHIP_H, z];
    }

    function add(spotId, value) {
      if (!alive()) return;
      const to = stackTop(spotId);
      const chip = create(value, source);
      (stacks[spotId] ??= []).push(chip);
      C.sound?.play('chip');
      slide(chip, to, 340);
    }

    function removeTop(spotId) {
      const chip = (stacks[spotId] || []).pop();
      if (!chip) return;
      C.sound?.play('chip');
      slide(chip, source, 320).then(() => discard(chip));
    }

    function clear() {
      for (const id of Object.keys(stacks)) {
        while (stacks[id].length) removeTop(id);
      }
    }

    async function sweep(chips, to, ms) {
      // Move a stack together; chips retain their spacing during the push.
      await Promise.all(chips.map((chip, i) =>
        slide(chip, [to[0], to[1] + CHIP_H / 2 + i * CHIP_H, to[2]], ms)));
      chips.forEach(discard);
    }

    async function settle(spotId, outcome, payoutExtra = 0) {
      if (!alive()) return;
      const chips = stacks[spotId] || [];
      stacks[spotId] = [];
      if (!chips.length && outcome !== 'win') return;
      C.sound?.play('chipSweep');
      if (outcome === 'lose') return sweep(chips, dealerPos, 560);
      if (outcome === 'push') return sweep(chips, source, 500);
      const [x, y, z] = getSpotPos(spotId);
      const payChips = C.layouts.chipBreakdown(payoutExtra).map((v, i) =>
        create(v, [dealerPos[0], dealerPos[1] + CHIP_H / 2 + i * CHIP_H, dealerPos[2]]));
      await Promise.all(payChips.map((chip, i) =>
        slide(chip, [x + CHIP_RADIUS * 2.4, y + CHIP_H / 2 + i * CHIP_H, z], 540)));
      if (alive()) await sweep([...chips, ...payChips], source, 560);
      else [...chips, ...payChips].forEach(discard);
    }

    function disposeAll() {
      disposed = true;
      [...inFlight].forEach((movement) => movement.cancel());
      inFlight.clear();
      [...owned].forEach(discard);
      Object.keys(stacks).forEach((k) => delete stacks[k]);
    }

    return { add, removeTop, clear, settle, disposeAll };
  }

  C.chips = { CHIP_COLORS, CHIP_H, CHIP_RADIUS, makeChip, makeChipStack, makeSpotDecal, createBetStacks, disposeChip, slideStack };
  C.assets.makeChip = makeChip;
  C.assets.makeChipStack = makeChipStack;
})();
