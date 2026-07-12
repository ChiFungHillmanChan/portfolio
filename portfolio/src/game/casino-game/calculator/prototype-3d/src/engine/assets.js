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

  // ---------- cards ----------
  function drawCardBack(ctx) {
    const w = 256, h = 358;
    ctx.fillStyle = '#1e3a8a';
    roundRect(ctx, 0, 0, w, h, 20); ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, w, h, 20); ctx.clip();
    ctx.strokeStyle = 'rgba(201,162,39,0.55)';
    ctx.lineWidth = 2;
    for (let x = -h; x < w + h; x += 26) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 6;
    roundRect(ctx, 10, 10, w - 20, h - 20, 16); ctx.stroke();
    ctx.lineWidth = 2;
    roundRect(ctx, 18, 18, w - 36, h - 36, 12); ctx.stroke();
  }

  function drawCardFace(ctx, card) {
    const w = 256, h = 358;
    const RANK_LABEL = C.outcomes.RANK_LABEL, SUIT_CHAR = C.outcomes.SUIT_CHAR;
    ctx.fillStyle = '#f6f3ea';
    roundRect(ctx, 4, 4, w - 8, h - 8, 20); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#999';
    roundRect(ctx, 4, 4, w - 8, h - 8, 20); ctx.stroke();

    const suit = SUIT_CHAR[card.s];
    const rank = RANK_LABEL[card.r];
    const red = card.s === 1 || card.s === 2; // hearts, diamonds
    ctx.fillStyle = red ? '#c0392b' : '#1a1a1a';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    ctx.font = '44px Georgia, serif';
    ctx.fillText(rank, 14, 8);
    ctx.font = '34px Georgia, serif';
    ctx.fillText(suit, 16, 54);

    ctx.save();
    ctx.translate(w - 14, h - 8);
    ctx.rotate(Math.PI);
    ctx.font = '44px Georgia, serif';
    ctx.fillText(rank, 0, 0);
    ctx.font = '34px Georgia, serif';
    ctx.fillText(suit, 2, 46);
    ctx.restore();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '120px Georgia, serif';
    ctx.fillText(suit, w / 2, h / 2 + 6);
  }

  function makeCard(card) {
    const geo = new THREE.PlaneGeometry(0.09, 0.126);
    const faceTx = canvasTexture(256, 358, (ctx) => (card ? drawCardFace(ctx, card) : drawCardBack(ctx)));
    const backTx = canvasTexture(256, 358, drawCardBack);
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

  // ---------- chips ----------
  const CHIP_COLORS = { 100: '#2e6db4', 500: '#8e44ad', 1000: '#c0392b', 5000: '#b8860b' };

  function makeChip(value) {
    const color = CHIP_COLORS[value] || '#555555';
    const topTx = canvasTexture(128, 128, (ctx) => {
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
      chip.position.y = i * 0.0072;
      chip.rotation.y = Math.random() * 0.3 - 0.15;
      group.add(chip);
    }
    group.userData.value = value;
    group.userData.count = n;
    return group;
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

  // ---------- dealer ----------
  function makeDealer() {
    const group = new THREE.Group();
    const blackMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6, metalness: 0.05 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#f2f0e8', roughness: 0.5, metalness: 0 });
    const skinMat = new THREE.MeshStandardMaterial({ color: '#e8c39e', roughness: 0.6, metalness: 0 });
    const gold = goldMaterial();

    // Two separate leg boxes (not one monolithic block) so the lower body
    // reads as legs, not a plinth. They run floor (0) to legTopY, and the
    // torso is extended down to meet legTopY exactly so there's no gap —
    // the torso's top (and everything anchored above it: vest, bow tie,
    // head/hair) is unchanged.
    const legTopY = 0.85, legW = 0.09, legGap = 0.02;
    const legGeo = new THREE.BoxGeometry(legW, legTopY, 0.2);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, blackMat);
      leg.position.set(sx * (legW / 2 + legGap / 2), legTopY / 2, 0);
      leg.castShadow = true; leg.receiveShadow = true;
      group.add(leg);
    }

    const torsoTopY = 1.45;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, torsoTopY - legTopY, 12), shirtMat);
    torso.position.y = (legTopY + torsoTopY) / 2;
    torso.castShadow = true; torso.receiveShadow = true;
    group.add(torso);

    // Vest: a slightly-larger-radius cylinder shell wrapping the torso, open
    // along a front arc (thetaStart/thetaLength) so the shirt shows through —
    // a flat box here would sit entirely inside the torso's curved radius and
    // never be visible.
    const vestGap = 0.34;
    const vest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.156, 0.176, 0.43, 16, 1, true, vestGap, Math.PI * 2 - vestGap * 2),
      blackMat,
    );
    vest.position.y = 1.225;
    vest.castShadow = true; vest.receiveShadow = true;
    group.add(vest);

    const coneGeo = new THREE.ConeGeometry(0.028, 0.05, 8);
    const bowL = new THREE.Mesh(coneGeo, gold);
    bowL.rotation.z = -Math.PI / 2;
    bowL.position.set(-0.03, 1.47, 0.15);
    bowL.castShadow = true;
    const bowR = new THREE.Mesh(coneGeo, gold);
    bowR.rotation.z = Math.PI / 2;
    bowR.position.set(0.03, 1.47, 0.15);
    bowR.castShadow = true;
    group.add(bowL, bowR);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skinMat);
    head.position.y = 1.57;
    head.castShadow = true; head.receiveShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.116, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), blackMat);
    hair.position.y = 1.57;
    hair.castShadow = true;
    group.add(hair);

    // Shoulder -> elbow -> forearm -> hand, each a child group so the bend
    // composes through the scene graph instead of by hand-rolled matrix math.
    // The shoulder's orientation is solved directly (align local -Y, the
    // direction children hang toward, to the shoulder->handTarget vector)
    // rather than guessed via Euler angles — guessed angles previously left
    // the arms jutting sideways in a T-pose from the front. Both hand targets
    // sit low and forward so the arms read as resting on a table edge.
    function makeArm(side) {
      const shoulderPos = new THREE.Vector3(side * 0.14, 1.35, 0.02);
      const handTarget = new THREE.Vector3(side * 0.05, 1.0, 0.24);
      const dir = new THREE.Vector3().subVectors(handTarget, shoulderPos).normalize();

      const shoulder = new THREE.Group();
      shoulder.position.copy(shoulderPos);
      shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);

      const upperLen = 0.22;
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.03, upperLen, 8), shirtMat);
      upperArm.position.y = -upperLen / 2;
      upperArm.castShadow = true; upperArm.receiveShadow = true;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.y = -upperLen;
      elbow.rotation.x = -0.3; // small extra forward kink so the elbow reads as a joint
      shoulder.add(elbow);

      const foreLen = 0.24;
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, foreLen, 8), shirtMat);
      forearm.position.y = -foreLen / 2;
      forearm.castShadow = true; forearm.receiveShadow = true;
      elbow.add(forearm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), skinMat);
      hand.position.y = -foreLen;
      hand.castShadow = true;
      elbow.add(hand);

      return shoulder;
    }
    group.add(makeArm(-1), makeArm(1));

    group.userData.idle = (app) => {
      const hook = (dt, elapsed) => { torso.rotation.z = Math.sin(elapsed * 0.8) * 0.02; };
      app.onFrame(hook);
      return hook;
    };
    return group;
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

  // ---------- room shell ----------
  function makeRoomShell({
    w = 12, d = 12, h = 4, wallColor = '#e8e0d0', floorMat,
    ceilingColor = '#2a2118', coveColor = '#ffe9c4', coveEmissive = '#ffcf8a', coveEmissiveIntensity = 0.6,
    ambientIntensity = 0.35, p1Intensity = 0.9, p2Intensity = 0.7, pointDistance,
  } = {}) {
    const group = new THREE.Group();
    const dist = pointDistance ?? w * 1.5;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat || carpetMaterial());
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9, metalness: 0 });
    const walls = [
      { pos: [0, h / 2, -d / 2], rot: [0, 0, 0], size: [w, h] },
      { pos: [0, h / 2, d / 2], rot: [0, Math.PI, 0], size: [w, h] },
      { pos: [-w / 2, h / 2, 0], rot: [0, Math.PI / 2, 0], size: [d, h] },
      { pos: [w / 2, h / 2, 0], rot: [0, -Math.PI / 2, 0], size: [d, h] },
    ];
    for (const wall of walls) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...wall.size), wallMat);
      mesh.position.set(...wall.pos);
      mesh.rotation.set(...wall.rot);
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: ceilingColor, roughness: 1 }));
    ceiling.position.y = h;
    ceiling.rotation.x = Math.PI / 2;
    ceiling.receiveShadow = true;
    group.add(ceiling);

    const cove = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.05, d * 0.96),
      new THREE.MeshStandardMaterial({ color: coveColor, emissive: coveEmissive, emissiveIntensity: coveEmissiveIntensity, roughness: 1 }));
    cove.position.y = h - 0.1;
    group.add(cove);

    group.add(new THREE.AmbientLight(0xffe9c4, ambientIntensity));

    const p1 = new THREE.PointLight(0xffe9c4, p1Intensity, dist, 2);
    p1.position.set(-w * 0.25, h - 0.4, -d * 0.25);
    p1.castShadow = true;
    p1.shadow.mapSize.set(1024, 1024);
    group.add(p1);

    const p2 = new THREE.PointLight(0xffe9c4, p2Intensity, dist, 2);
    p2.position.set(w * 0.25, h - 0.4, d * 0.25);
    group.add(p2);

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

  // ---------- dealing animation ----------
  function dealCardTo(app, cardMesh, from, to, { ms = 420, flip = false, delay = 0 } = {}) {
    if (app.REDUCED) ms = Math.min(ms, 180);
    return new Promise((resolve) => {
      const gen = app.roomGen;
      cardMesh.position.set(...from);
      app.scene.add(cardMesh);
      const ease = C.tween.easings.outCubic;
      const start = () => {
        const t0 = performance.now();
        if (app.roomGen !== gen) return resolve();
        const hook = (dt, elapsed) => {
          if (app.roomGen !== gen) { app.offFrame(hook); return resolve(); }
          const t = Math.min(1, (performance.now() - t0) / ms);
          const e = ease(t);
          cardMesh.position.x = from[0] + (to[0] - from[0]) * e;
          cardMesh.position.z = from[2] + (to[2] - from[2]) * e;
          const base = from[1] + (to[1] - from[1]) * e;
          cardMesh.position.y = base + 0.25 * 4 * t * (1 - t);
          if (t >= 1) {
            app.offFrame(hook);
            if (flip) cardMesh.userData.flip(Math.min(220, app.REDUCED ? 180 : 220), resolve);
            else resolve();
          }
        };
        hook.cancel = () => { app.offFrame(hook); resolve(); };
        app.onFrame(hook);
      };
      if (delay > 0) setTimeout(start, delay);
      else start();
    });
  }

  C.assets = {
    canvasTexture, feltMaterial, woodMaterial, goldMaterial, carpetMaterial,
    makeCard, makeChip, makeChipStack, makeStool, makeDealer, makePlaque,
    makeRoomShell, makeSign, dealCardTo,
  };
})();
