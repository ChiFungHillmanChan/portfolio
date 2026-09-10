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

  // Yellow cut card: solid colour both sides, playing-card footprint. Same
  // group + flip contract as makeCard so dealCardTo can fly it.
  function makeCutCard() {
    const geo = new THREE.PlaneGeometry(C.layouts.CARD_W, C.layouts.CARD_H);
    const mat = new THREE.MeshStandardMaterial({
      color: '#e6c531', roughness: 0.55, metalness: 0, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    group.userData.card = null;
    group.userData.flip = (ms = 400, onDone) =>
      C.tween.to(group.rotation, { y: group.rotation.y + Math.PI }, ms, 'inOutCubic', onDone);
    return group;
  }

  // Open-front casino shoe. Local +Z is the dispensing mouth; table layout
  // supplies the same yaw and mouth transform to the dealer's grab target.
  function makeShoe() {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: '#101419', roughness: 0.34, metalness: 0.25 });
    const clear = new THREE.MeshStandardMaterial({
      color: '#9bb8b8', transparent: true, opacity: 0.24, roughness: 0.2, depthWrite: false,
    });
    const part = (name, size, at, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.name = name; mesh.position.set(...at);
      mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
      return mesh;
    };
    part('shoe-base', [0.23, 0.016, 0.40], [0, 0.008, 0], dark);
    for (const side of [-1, 1]) {
      part('shoe-side', [0.012, 0.14, 0.36], [side * 0.11, 0.086, -0.015], clear);
      part('shoe-top-rail', [0.013, 0.009, 0.36], [side * 0.11, 0.16, -0.015], dark);
    }
    part('shoe-back', [0.23, 0.14, 0.016], [0, 0.086, -0.187], dark);
    part('shoe-card-edges', [C.layouts.CARD_W, 0.056, C.layouts.CARD_H], [0, 0.047, -0.025],
      new THREE.MeshStandardMaterial({ color: '#e4dfce', roughness: 0.85 }));
    const top = makeCard(null);
    top.rotation.x = -Math.PI / 2; top.position.set(0, 0.076, -0.025); g.add(top);
    const lead = makeCard(null);
    lead.rotation.x = -Math.PI / 2; lead.position.set(0, 0.027, 0.10); g.add(lead);
    part('shoe-mouth', [0.19, 0.010, 0.025], [0, 0.019, 0.1975], dark);
    g.userData.mouthLocal = [0, 0.028, 0.215];
    return g;
  }

  function makeDiscardTray() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#1a1714', roughness: 0.42, metalness: 0.2 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.018, 0.27), mat);
    base.position.y = 0.009; base.receiveShadow = true; g.add(base);
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.27), mat);
      wall.position.set(side * 0.10, 0.045, 0); g.add(wall);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.07, 0.01), mat);
    back.position.set(0, 0.045, -0.13); g.add(back);
    for (let i = 0; i < 4; i++) {
      const card = makeCard(null);
      card.rotation.x = -Math.PI / 2;
      card.position.set(0, 0.020 + i * 0.0015, 0); g.add(card);
    }
    return g;
  }

  // A friction slide: horizontal speed decays to zero once, while the card
  // contacts the felt in the first third of travel. No ballistic hump or
  // elastic rebound, including when the shoe mouth starts above the felt.
  function sampleCardSlide(from, to, progress) {
    const t = Math.max(0, Math.min(1, progress));
    if (t === 1) return [...to];
    const travel = 1 - (1 - t) ** 2;
    const touch = Math.min(1, t / 0.3);
    const height = (1 - touch) ** 2;
    return [
      from[0] + (to[0] - from[0]) * travel,
      to[1] + (from[1] - to[1]) * height + Math.sin(touch * Math.PI) * 0.003,
      from[2] + (to[2] - from[2]) * travel,
    ];
  }

  function dealCardTo(app, cardMesh, from, to, { ms = 420, flip = false, delay = 0, spin = true, sound = false, fromRotationZ } = {}) {
    if (app.REDUCED) { ms = Math.min(ms, 180); spin = false; }
    cardMesh.userData.cancelCardSlide?.();
    return new Promise((resolve) => {
      const gen = app.roomGen;
      let hook = null, timer = null, cancelled = false;
      const cancel = () => {
        cancelled = true;
        clearTimeout(timer);
        if (hook) app.offFrame(hook);
        resolve();
      };
      cardMesh.userData.cancelCardSlide = cancel;
      cardMesh.position.set(...from);
      const zEnd = cardMesh.rotation.z;
      const zStart = fromRotationZ ?? (spin ? zEnd - 0.09 : zEnd);
      cardMesh.rotation.z = zStart;
      if (!cardMesh.parent) app.scene.add(cardMesh);
      const start = () => {
        const t0 = performance.now();
        if (cancelled || app.roomGen !== gen) return resolve();
        if (sound) C.sound?.play('card');
        hook = () => {
          if (app.roomGen !== gen) { app.offFrame(hook); return resolve(); }
          const t = Math.min(1, (performance.now() - t0) / ms);
          cardMesh.position.set(...sampleCardSlide(from, to, t));
          cardMesh.rotation.z = zStart + (zEnd - zStart) * (1 - (1 - t) ** 3);
          if (t >= 1) {
            cardMesh.position.set(...to);
            cardMesh.rotation.z = zEnd;
            app.offFrame(hook);
            if (flip) cardMesh.userData.flip(Math.min(220, ms), resolve);
            else resolve();
          }
        };
        hook.cancel = cancel;
        app.onFrame(hook);
      };
      if (delay > 0) timer = setTimeout(start, delay);
      else start();
    });
  }

  // Keep a visible card under the dealing palm from shoe contact to release.
  // Both rig implementations may provide grab/release events. A cancelled or
  // unavailable path completes safely; the next deal waits for arm recovery
  // as well as the card settling so sequential rounds never interrupt a draw.
  function dealCardWithDealer(app, rig, mesh, from, to, opts = {}) {
    if (!rig) return dealCardTo(app, mesh, from, to, opts);
    const gen = app.roomGen;
    mesh.position.set(...from);
    app.scene.add(mesh);
    let held = false, released = false, cancelled = false, side = 'R', finishFlight;
    let transferOffset = null, transferTime = 0;
    const flight = new Promise((resolve) => { finishFlight = resolve; });
    const point = (p) => Array.isArray(p) ? p : [p.x, p.y, p.z];
    const track = () => {
      if (app.roomGen !== gen) {
        held = false; app.offFrame(track); finishFlight(); return;
      }
      if (!held) return;
      const palm = rig.handContactWorld?.(side) || rig.handWorld?.(side);
      if (palm) {
        const position = point(palm);
        const remaining = transferOffset ? Math.max(0, 1 - (performance.now() - transferTime) / 140) : 0;
        const ease = remaining * remaining * (3 - 2 * remaining);
        mesh.position.set(...position.map((value, index) => value + (transferOffset?.[index] || 0) * ease));
      }
    };
    track.cancel = () => {
      cancelled = true; held = false; app.offFrame(track);
      mesh.userData.cancelCardSlide?.(); finishFlight();
    };
    mesh.userData.cancelCardDeal = track.cancel;
    const release = (world, meta = {}) => {
      if (cancelled || released || app.roomGen !== gen) return;
      released = true; held = false;
      app.offFrame(track);
      const start = meta.contactWorld || world;
      if (opts.rotationZ !== undefined) mesh.rotation.z = opts.rotationZ;
      dealCardTo(app, mesh, start ? point(start) : [mesh.position.x, mesh.position.y, mesh.position.z],
        to, opts).then(finishFlight);
    };
    const play = rig.play(app, opts.action || 'dealCard', {
      ms: opts.gestureMs,
      refs: { shoe: from, target: opts.rigTarget || to, ...opts.refs },
      on: {
        grab: (world, meta = {}) => {
          if (cancelled || app.roomGen !== gen) return;
          held = true; side = meta.side || 'R';
          const palm = meta.contactWorld || world;
          if (palm) mesh.position.set(...point(palm));
        },
        contact: (world, meta = {}) => {
          if (cancelled || released || !held || app.roomGen !== gen) return;
          const palm = meta.contactWorld || world;
          if (!palm) return;
          const incoming = point(palm);
          transferOffset = [mesh.position.x, mesh.position.y, mesh.position.z].map((value, index) => value - incoming[index]);
          transferTime = performance.now(); side = meta.side || side;
          opts.onTransfer?.(world, meta);
        },
        release,
      },
    });
    // Procedural rigs register their pose update in play(). Read the palm
    // afterwards, so a held card never trails that pose by one render frame.
    // Reduced-motion rigs can release synchronously during play().
    if (!released && !cancelled) app.onFrame(track);
    return Promise.resolve(play).then(() => {
      if (cancelled || app.roomGen !== gen) { app.offFrame(track); finishFlight(); }
      else if (!released) release(null);
      return flight;
    });
  }

  // Shared reveal for flat-lying cards (was duplicated in 3 room files).
  // A watcher frame hook carries the roomGen guard + cancel contract: a room
  // switch mid-flip resolves the promise promptly instead of leaving the
  // caller awaiting a tween on a torn-down room. (Double-resolve is safe.)
  function flipFlatCard(app, mesh, ms) {
    if (app.REDUCED) ms = Math.min(ms, 180);
    return new Promise((resolve) => {
      const gen = app.roomGen;
      const guard = () => {
        if (app.roomGen !== gen) { app.offFrame(guard); resolve(); }
      };
      guard.cancel = () => { app.offFrame(guard); resolve(); };
      app.onFrame(guard);
      const baseY = mesh.position.y;
      C.tween.to(mesh.position, { y: baseY + 0.05 }, ms / 2, 'outCubic', () => {
        C.tween.to(mesh.position, { y: baseY }, ms / 2, 'outQuart');
      });
      mesh.userData.flip(ms, () => { app.offFrame(guard); resolve(); });
    });
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

  C.cards = { makeCard, makeCutCard, makeShoe, makeDiscardTray, sampleCardSlide, dealCardTo, dealCardWithDealer, flipFlatCard, makeCardBoxDecal };
  C.assets.makeCard = makeCard;
})();
