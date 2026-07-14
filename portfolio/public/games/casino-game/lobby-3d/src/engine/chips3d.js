(() => {
  const C = (globalThis.CASINO ??= {});

  // ---------- chips ----------
  const CHIP_COLORS = {
    1: '#9aa0a8', 5: '#8d6e63', 10: '#2f9e5b', 25: '#207f6e', 50: '#c26a1f',
    100: '#2e6db4', 500: '#8e44ad', 1000: '#c0392b', 5000: '#b8860b',
  };
  const CHIP_H = 0.0072;

  function makeChip(value) {
    const color = CHIP_COLORS[value] || '#555555';
    const topTx = C.assets.canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.arc(64, 64, 50, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText(value >= 1000 ? `${value / 1000}K` : String(value), 64, 68);
    });
    const sideMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15 });
    const topMat = new THREE.MeshStandardMaterial({ map: topTx, roughness: 0.35, metalness: 0.1 });
    const geo = new THREE.CylinderGeometry(0.034, 0.034, 0.007, 32);
    const mesh = new THREE.Mesh(geo, [sideMat, topMat, sideMat]);
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
    mesh.geometry?.dispose();
    new Set(Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      .forEach((m) => { if (!m) return; m.map?.dispose(); m.dispose(); });
  }

  // Live 3D wager stacks for one room. Every animation carries the roomGen
  // guard + hook.cancel, mirroring dealCardTo.
  function createBetStacks(app, { getSpotPos, source, dealerPos }) {
    const gen = app.roomGen;
    const stacks = {};            // spotId -> [chip meshes]
    const inFlight = new Set();   // frame hooks, for disposeAll

    // One flight owns a chip at a time: starting a new flight SUPERSEDES the
    // mesh's previous hook (without firing its onDone — the new flight owns
    // the mesh from here). cancel() — the room-switch sweep and disposeAll —
    // DOES fire onDone so awaited promises settle instead of hanging.
    function fly(mesh, from, to, ms, onDone) {
      mesh.userData.flyHook?.supersede();
      if (app.REDUCED) {
        mesh.position.set(...to);
        onDone && onDone();
        return;
      }
      mesh.position.set(...from);
      const t0 = performance.now();
      const ease = C.tween.easings.outCubic;
      const done = () => {
        app.offFrame(hook);
        inFlight.delete(hook);
        if (mesh.userData.flyHook === hook) mesh.userData.flyHook = null;
      };
      const hook = () => {
        if (app.roomGen !== gen) { done(); onDone && onDone(); return; }
        const t = Math.min(1, (performance.now() - t0) / ms);
        const e = ease(t);
        mesh.position.x = from[0] + (to[0] - from[0]) * e;
        mesh.position.z = from[2] + (to[2] - from[2]) * e;
        mesh.position.y = from[1] + (to[1] - from[1]) * e + 0.12 * 4 * t * (1 - t);
        if (t >= 1) {
          mesh.position.set(...to);
          done();
          onDone && onDone();
        }
      };
      hook.cancel = () => { done(); onDone && onDone(); };
      hook.supersede = done;
      mesh.userData.flyHook = hook;
      inFlight.add(hook);
      app.onFrame(hook);
    }

    function stackTop(spotId) {
      const [x, y, z] = getSpotPos(spotId);
      const n = (stacks[spotId] || []).length;
      return [x, y + 0.005 + n * CHIP_H, z];
    }

    function add(spotId, value) {
      const chip = makeChip(value);
      chip.rotation.y = Math.random() * 0.5 - 0.25;
      (stacks[spotId] ??= []);
      const to = stackTop(spotId);
      stacks[spotId].push(chip);
      app.scene.add(chip);
      C.sound?.play('chip');
      fly(chip, source, to, 340);
    }

    function removeTop(spotId) {
      const chip = (stacks[spotId] || []).pop();
      if (!chip) return;
      C.sound?.play('chip');
      fly(chip, chip.position.toArray(), source, 280, () => {
        app.scene.remove(chip); disposeChip(chip);
      });
    }

    function clear() {
      for (const id of Object.keys(stacks)) {
        while (stacks[id].length) removeTop(id);
      }
    }

    // Glide a batch of chips to a point, shrink out, dispose.
    function sweep(chips, to, ms) {
      if (app.REDUCED) {
        chips.forEach((chip) => { app.scene.remove(chip); disposeChip(chip); });
        return Promise.resolve();
      }
      return Promise.all(chips.map((chip, i) => new Promise((res) => {
        setTimeout(() => {
          if (app.roomGen !== gen) { app.scene.remove(chip); disposeChip(chip); return res(); }
          fly(chip, chip.position.toArray(), [to[0], to[1] + i * CHIP_H, to[2]], ms, () => {
            C.tween.to(chip.scale, { x: 0.01, y: 0.01, z: 0.01 }, 140, 'outCubic', () => {
              // switchRoom's scene sweep may have disposed the chip already
              if (app.roomGen === gen) { app.scene.remove(chip); disposeChip(chip); }
              res();
            });
          });
        }, i * 40);
      })));
    }

    // outcome: 'win'  -> payoutExtra chips fly in from the dealer beside the
    //                    stack, brief beat, then everything glides to source.
    //          'lose' -> stack glides to dealerPos.
    //          'push' -> stack glides back to source.
    async function settle(spotId, outcome, payoutExtra = 0) {
      const chips = stacks[spotId] || [];
      stacks[spotId] = [];
      if (!chips.length && outcome !== 'win') return;
      C.sound?.play('chipSweep');
      if (outcome === 'lose') return sweep(chips, dealerPos, 420);
      if (outcome === 'push') return sweep(chips, source, 420);
      const [x, y, z] = getSpotPos(spotId);
      const pay = C.layouts.chipBreakdown(payoutExtra);
      const payChips = pay.map((v, i) => {
        const chip = makeChip(v);
        chip.rotation.y = Math.random() * 0.5 - 0.25;
        app.scene.add(chip);
        fly(chip, dealerPos, [x + 0.085, y + 0.005 + i * CHIP_H, z], 380);
        return chip;
      });
      await new Promise((r) => setTimeout(r, app.REDUCED ? 60 : 450));
      return sweep([...chips, ...payChips], source, 460);
    }

    function disposeAll() {
      inFlight.forEach((hook) => hook.cancel());
      inFlight.clear();
      for (const id of Object.keys(stacks)) {
        stacks[id].forEach((chip) => { app.scene.remove(chip); disposeChip(chip); });
      }
      Object.keys(stacks).forEach((k) => delete stacks[k]);
    }

    return { add, removeTop, clear, settle, disposeAll };
  }

  C.chips = { CHIP_COLORS, CHIP_H, makeChip, makeChipStack, makeSpotDecal, createBetStacks, disposeChip };
  C.assets.makeChip = makeChip;
  C.assets.makeChipStack = makeChipStack;
})();
