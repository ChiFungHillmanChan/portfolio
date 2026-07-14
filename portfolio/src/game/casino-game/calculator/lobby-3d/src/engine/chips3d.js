(() => {
  const C = (globalThis.CASINO ??= {});

  // ---------- chips ----------
  const CHIP_COLORS = { 100: '#2e6db4', 500: '#8e44ad', 1000: '#c0392b', 5000: '#b8860b' };
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

  C.chips = { CHIP_COLORS, CHIP_H, makeChip, makeChipStack, makeSpotDecal, disposeChip };
  C.assets.makeChip = makeChip;
  C.assets.makeChipStack = makeChipStack;
})();
