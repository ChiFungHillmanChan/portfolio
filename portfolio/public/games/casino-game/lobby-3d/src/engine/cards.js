(() => {
  const C = (globalThis.CASINO ??= {});

  // Texture canvas: 512x716 (2x the old 256x358) with JUMBO corner indices —
  // rank ≈30% of card height — so faces read clearly from the play camera.
  const TW = 512, TH = 716;

  // Card label maps (inlined from the retired demo outcomes module — v2 only
  // renders static ghost cards, no dealing logic).
  const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  for (let r = 2; r <= 10; r++) RANK_LABEL[r] = String(r);
  const SUIT_CHAR = ['♠', '♥', '♦', '♣'];

  function drawCardBack(ctx) {
    ctx.fillStyle = '#1e3a8a';
    C.assets.roundRect(ctx, 0, 0, TW, TH, 40); ctx.fill();
    ctx.save();
    C.assets.roundRect(ctx, 0, 0, TW, TH, 40); ctx.clip();
    ctx.strokeStyle = 'rgba(201,162,39,0.55)';
    ctx.lineWidth = 4;
    for (let x = -TH; x < TW + TH; x += 52) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + TH, TH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, TH); ctx.lineTo(x + TH, 0); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 12;
    C.assets.roundRect(ctx, 20, 20, TW - 40, TH - 40, 32); ctx.stroke();
    ctx.lineWidth = 4;
    C.assets.roundRect(ctx, 36, 36, TW - 72, TH - 72, 24); ctx.stroke();
  }

  function drawCardFace(ctx, card) {
    ctx.fillStyle = '#f8f6ee';
    C.assets.roundRect(ctx, 8, 8, TW - 16, TH - 16, 40); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#888';
    C.assets.roundRect(ctx, 8, 8, TW - 16, TH - 16, 40); ctx.stroke();

    const suit = SUIT_CHAR[card.s];
    const rank = RANK_LABEL[card.r];
    const red = card.s === 1 || card.s === 2;
    ctx.fillStyle = red ? '#c0392b' : '#141414';

    // Jumbo corner index (top-left) + rotated copy (bottom-right)
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold 190px Georgia, serif';
    ctx.fillText(rank, 28, 8, 180);       // maxWidth clamps '10'
    ctx.font = '140px Georgia, serif';
    ctx.fillText(suit, 34, 200);
    ctx.save();
    ctx.translate(TW - 28, TH - 8);
    ctx.rotate(Math.PI);
    ctx.font = 'bold 190px Georgia, serif';
    ctx.fillText(rank, 0, 0, 180);
    ctx.font = '140px Georgia, serif';
    ctx.fillText(suit, 6, 192);
    ctx.restore();

    // Big center pip on the right half so the corner index owns the left
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '300px Georgia, serif';
    ctx.fillText(suit, TW * 0.62, TH / 2 + 10);
  }

  function makeCard(card) {
    const geo = new THREE.PlaneGeometry(C.layouts.CARD_W, C.layouts.CARD_H);
    const faceTx = C.assets.canvasTexture(TW, TH, (ctx) => (card ? drawCardFace(ctx, card) : drawCardBack(ctx)));
    const backTx = C.assets.canvasTexture(TW, TH, drawCardBack);
    faceTx.anisotropy = 8; backTx.anisotropy = 8;
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTx, roughness: 0.5, metalness: 0 });
    const backMat = new THREE.MeshStandardMaterial({ map: backTx, roughness: 0.5, metalness: 0 });

    const face = new THREE.Mesh(geo, faceMat);
    face.position.z = 0.0006;
    face.castShadow = true; face.receiveShadow = true;
    const back = new THREE.Mesh(geo, backMat);
    back.rotation.y = Math.PI;
    back.position.z = -0.0006;
    back.castShadow = true; back.receiveShadow = true;

    const group = new THREE.Group();
    group.add(face, back);
    group.userData.card = card;
    group.userData.flip = (ms = 400, onDone) =>
      C.tween.to(group.rotation, { y: group.rotation.y + Math.PI }, ms, 'inOutCubic', onDone);
    return group;
  }

  // Painted card box: a thin transparent decal plane, dashed cream outline,
  // sized to the card footprint + margin. Lay at feltY + 0.002.
  function makeCardBoxDecal({ label = '', sideways = false } = {}) {
    const w = C.layouts.CARD_W + 0.024, h = C.layouts.CARD_H + 0.024;
    const pw = 128, ph = Math.round(pw * h / w);
    const tx = C.assets.canvasTexture(pw, ph, (ctx) => {
      ctx.clearRect(0, 0, pw, ph);
      ctx.strokeStyle = 'rgba(240,216,120,0.65)';
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 9]);
      C.assets.roundRect(ctx, 6, 6, pw - 12, ph - 12, 12); ctx.stroke();
      ctx.setLineDash([]);
      if (label) {
        ctx.fillStyle = 'rgba(240,216,120,0.8)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 26px Georgia, serif';
        ctx.fillText(label, pw / 2, ph / 2);
      }
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    if (sideways) mesh.rotation.z = Math.PI / 2;
    mesh.renderOrder = 1;
    return mesh;
  }

  C.cards = { makeCard, makeCardBoxDecal };
  C.assets.makeCard = makeCard;
})();
