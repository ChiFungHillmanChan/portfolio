(() => {
  const C = (globalThis.CASINO ??= {});

  const WHEEL_X = -1.9;
  const BOWL_TOP_Y = 0.78;
  const RAIL_H = 0.82;
  const FELT_Y = RAIL_H + 0.02;
  const STEP = (Math.PI * 2) / 37;   // shared by separators/ring texture/spinTo below

  const POSE_TABLE = { pos: [0, 1.55, 1.9], look: [0, 0.85, 0] };
  const POSE_WHEEL = { pos: [-1.9, 1.35, 1.15], look: [-1.9, 0.8, 0] };
  const WIDE_POSE = { pos: [0.6, 2.6, 5.4], look: [-0.9, 1, -0.4] };

  const REASON_COPY = {
    'spot-min': 'Min 100 per spot',
    'spot-max': 'Max 5,000 per spot',
    'table-max': 'Max 20,000 per spin',
    balance: 'Insufficient chips',
  };

  // ---------- decorative felt layout texture (1024x512) ----------
  function makeFeltLayoutTexture() {
    const RED = C.outcomes.RED;
    return C.assets.canvasTexture(1024, 512, (ctx) => {
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, 1024, 512);

      const gx = 40, gy = 30, gw = 940, gh = 380, zeroW = 70;
      const cellW = (gw - zeroW) / 12, cellH = gh / 3;

      ctx.fillStyle = '#0e6b45';
      ctx.fillRect(gx, gy, zeroW, gh);
      ctx.strokeStyle = 'rgba(240,216,120,.6)'; ctx.lineWidth = 2;
      ctx.strokeRect(gx, gy, zeroW, gh);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 34px Georgia, serif';
      ctx.fillText('0', gx + zeroW / 2, gy + gh / 2);

      const ROWS = [
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
      ];
      ROWS.forEach((row, r) => {
        row.forEach((n, c) => {
          const x = gx + zeroW + c * cellW, y = gy + r * cellH;
          ctx.fillStyle = RED.has(n) ? '#a31621' : '#111';
          ctx.fillRect(x, y, cellW, cellH);
          ctx.strokeStyle = 'rgba(240,216,120,.4)'; ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, cellW, cellH);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 24px Georgia, serif';
          ctx.fillText(String(n), x + cellW / 2, y + cellH / 2);
        });
      });

      const oy = gy + gh + 24, oh = 56;
      const labels = ['1-18', 'EVEN', 'RED', 'BLACK', 'ODD', '19-36'];
      const ow = gw / labels.length;
      labels.forEach((label, i) => {
        const x = gx + i * ow;
        ctx.fillStyle = label === 'RED' ? '#a31621' : label === 'BLACK' ? '#111' : 'rgba(0,0,0,.28)';
        ctx.fillRect(x, oy, ow, oh);
        ctx.strokeStyle = 'rgba(240,216,120,.4)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x, oy, ow, oh);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Georgia, serif';
        ctx.fillText(label, x + ow / 2, oy + oh / 2);
      });
    });
  }

  // ---------- wheel number-ring texture (1024^2, drawn in the ring's own
  // canvas-arc angle convention, which — after RingGeometry's planar UV
  // mapping and the ring's rotation.x=-PI/2 to lay it flat — lands at the
  // SAME group-local angle i*STEP used by the pocket separators and by the
  // ball's final resting position below. Verified empirically, see report. ----------
  function makeNumberRingTexture() {
    const EU = C.outcomes.EU_WHEEL, RED = C.outcomes.RED;
    const W = 1024, cx = 512, cy = 512;
    return C.assets.canvasTexture(W, W, (ctx) => {
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, W);
      for (let i = 0; i < 37; i++) {
        const n = EU[i];
        const a0 = i * STEP - STEP / 2, a1 = i * STEP + STEP / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 500, a0, a1);
        ctx.closePath();
        ctx.fillStyle = n === 0 ? '#0e6b45' : RED.has(n) ? '#a31621' : '#111';
        ctx.fill();
        ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * STEP);
        ctx.translate(410, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 44px Georgia, serif';   // legible at the POSE_WHEEL camera distance (~1.2m)
        ctx.fillText(String(n), 0, 0);
        ctx.restore();
      }
    });
  }

  // ---------- wheel (returns { group, spinTo(pocket) -> Promise }) ----------
  // `scene` here is the wheel MOUNT passed in by enter() below: a non-rotating
  // Group already positioned at the bowl's world location. `group` (returned)
  // is its rotating child at zero relative offset. During flight the ball is
  // a direct child of that same non-rotating mount, so its plain cos/sin
  // position math lines up with wherever the wheel visually sits.
  function buildWheel(scene) {
    const gold = C.assets.goldMaterial();
    const darkWood = new THREE.MeshStandardMaterial({ color: '#241408', roughness: 0.55, metalness: 0.1 });

    const group = new THREE.Group();

    const base = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.16, 64), darkWood);
    base.rotation.x = Math.PI;   // flip so the wide flat face is up (apex points down into the bowl)
    base.position.y = 0.08;
    base.castShadow = true; base.receiveShadow = true;
    group.add(base);

    // Classic low turned-cone spinner (not an oversized dome): a small
    // truncated cone plus a finial sphere on top, both sitting on the ring
    // surface (y=0.161).
    const RING_Y = 0.161;
    const hubCone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.06, 24), gold);
    hubCone.position.y = RING_Y + 0.03;
    hubCone.castShadow = true;
    group.add(hubCone);

    const hubFinial = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), gold);
    hubFinial.position.y = RING_Y + 0.06 + 0.03;
    hubFinial.castShadow = true;
    group.add(hubFinial);

    const ringMat = new THREE.MeshStandardMaterial({ map: makeNumberRingTexture(), roughness: 0.4, metalness: 0.1 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.30, 0.52, 148), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = RING_Y;
    ring.receiveShadow = true;
    group.add(ring);

    // Pocket-boundary separators: small nubs sitting on the ring surface,
    // between pockets (at (i+0.5)*STEP) rather than on top of the numbers.
    const SEP_RADIUS = 0.44, SEP_H = 0.014;
    const sepGeo = new THREE.BoxGeometry(0.10, SEP_H, 0.008);
    for (let i = 0; i < 37; i++) {
      // pivot.rotation.y = -angle places a box offset along local +X at
      // group-local angle +angle AND orients its long axis (also local +X)
      // radially outward — both position and orientation ride the same
      // rotation, so they can't disagree. Verified empirically, see report.
      const angle = (i + 0.5) * STEP;
      const pivot = new THREE.Group();
      pivot.rotation.y = -angle;
      const box = new THREE.Mesh(sepGeo, gold);
      box.position.set(SEP_RADIUS, RING_Y + SEP_H / 2, 0);
      box.castShadow = true;
      pivot.add(box);
      group.add(pivot);
    }

    const R_OUT = 0.50, R_IN = 0.36;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#fdfdf5', roughness: 0.25, metalness: 0.05 }),
    );
    ball.castShadow = true;
    // resting position before any spin: parked in pocket index 0, same
    // formula spinTo uses to park a winning pocket.
    ball.position.set(R_IN, 0.055, 0);
    group.add(ball);

    // fixed reference marker at the drop point (world angle 0 relative to the
    // mount) — does NOT rotate with `group`, so it stays put while the wheel
    // spins; makes the ball's approach path visually verifiable.
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 8), gold);
    marker.rotation.x = Math.PI;
    marker.position.set(R_OUT, 0.22, 0);
    scene.add(marker);

    function spinTo(pocket) {
      return new Promise((resolve) => {
        const O = C.outcomes;
        const idx = O.EU_WHEEL.indexOf(pocket);
        const step = (Math.PI * 2) / 37;
        const wheelTurns = 4 + (crypto.getRandomValues(new Uint32Array(1))[0] % 4);   // 4–7
        const ballTurns = 6 + (crypto.getRandomValues(new Uint32Array(1))[0] % 5);    // 6–10
        const ms = C.app.REDUCED ? 2200 : 4200 + Math.random() * 1600;
        const w0 = group.rotation.y % (Math.PI * 2);
        // ball parks at world angle 0; pocket idx must end under it. THREE's
        // rotation.y convention puts a local-angle-a point at world angle
        // (a - rotation.y), so the wheel must land on rotation.y ≡ +idx*step
        // (mod 2π) — NOT -idx*step (that sign was carried over from the CSS
        // reference wheel-physics.js, which is clockwise-positive, i.e. the
        // opposite handedness). See report fix-wave for the empirical proof.
        const w1 = w0 + wheelTurns * Math.PI * 2 + ((idx * step - w0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const b0 = 0;
        const b1 = b0 - ballTurns * Math.PI * 2;   // counter-rotation, ends at world angle 0
        const t0 = performance.now();
        const ease = C.tween.easings.outQuart;
        scene.remove(ball); // (already removed if this is a repeat spin — harmless no-op otherwise)
        scene.add(ball);
        const hook = (dt) => {
          const t = Math.min(1, (performance.now() - t0) / ms);
          const e = ease(t);
          group.rotation.y = w0 + (w1 - w0) * e;
          const ba = b0 + (b1 - b0) * e;
          const drop = Math.max(0, (t - 0.72) / 0.28);              // radius eases in over last 28%
          const r = R_OUT + (R_IN - R_OUT) * drop * drop;
          ball.position.set(Math.cos(ba) * r, 0.10 - 0.045 * drop, Math.sin(ba) * r);
          if (t === 1) {
            C.app.offFrame(hook);
            // lock the ball into the winning pocket: reparent into the wheel group
            // at the pocket's LOCAL angle so it keeps riding the wheel if nudged.
            scene.remove(ball);                       // ball was a direct scene child during flight
            group.add(ball);
            ball.position.set(Math.cos(idx * step) * R_IN, 0.055, Math.sin(idx * step) * R_IN);
            resolve();
          }
        };
        hook.cancel = () => { C.app.offFrame(hook); resolve(); };
        C.app.onFrame(hook);
      });
    }

    return { group, spinTo };
  }

  // ---------- betting overlay ----------
  function makeOverlay(onSpin) {
    const bets = {};
    const history = [];
    let selectedDenom = 100;

    const root = document.createElement('div');
    root.className = 'bet-overlay';
    const panel = document.createElement('div');
    panel.className = 'bet-panel';
    root.appendChild(panel);

    const title = document.createElement('div');
    title.className = 'bet-title';
    title.textContent = 'ROULETTE — PLACE YOUR BETS';
    panel.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'rgrid';
    panel.appendChild(grid);

    function makeSpot(id, label, cls, col, row) {
      const el = document.createElement('div');
      el.className = 'rspot ' + cls;
      el.dataset.spot = id;
      el.style.gridColumn = col;
      el.style.gridRow = row;
      el.textContent = label;
      el.addEventListener('click', () => placeBet(id));
      grid.appendChild(el);
    }

    makeSpot('n0', '0', 'green', '1 / 2', '1 / 4');

    const RED = C.outcomes.RED;
    const ROWS = [
      [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],   // top row    -> column bet c3
      [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],   // mid row    -> column bet c2
      [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],   // bottom row -> column bet c1
    ];
    ROWS.forEach((row, r) => {
      row.forEach((n, c) => {
        makeSpot('n' + n, String(n), RED.has(n) ? 'red' : 'black', (c + 2) + ' / ' + (c + 3), (r + 1) + ' / ' + (r + 2));
      });
    });
    makeSpot('c3', '2 to 1', 'outside', '14 / 15', '1 / 2');
    makeSpot('c2', '2 to 1', 'outside', '14 / 15', '2 / 3');
    makeSpot('c1', '2 to 1', 'outside', '14 / 15', '3 / 4');

    makeSpot('d1', '1st 12', 'outside', '2 / 6', '4 / 5');
    makeSpot('d2', '2nd 12', 'outside', '6 / 10', '4 / 5');
    makeSpot('d3', '3rd 12', 'outside', '10 / 14', '4 / 5');

    makeSpot('low', '1-18', 'outside', '2 / 4', '5 / 6');
    makeSpot('even', 'EVEN', 'outside', '4 / 6', '5 / 6');
    makeSpot('red', 'RED', 'red', '6 / 8', '5 / 6');
    makeSpot('black', 'BLACK', 'black', '8 / 10', '5 / 6');
    makeSpot('odd', 'ODD', 'outside', '10 / 12', '5 / 6');
    makeSpot('high', '19-36', 'outside', '12 / 14', '5 / 6');

    const rack = document.createElement('div');
    rack.className = 'chip-rack';
    panel.appendChild(rack);
    C.tables.chipDenoms.forEach((v) => {
      const b = document.createElement('button');
      b.className = 'chip-btn' + (v === selectedDenom ? ' sel' : '');
      b.dataset.v = v;
      b.textContent = v >= 1000 ? v / 1000 + 'K' : String(v);
      b.addEventListener('click', () => {
        selectedDenom = v;
        rack.querySelectorAll('.chip-btn').forEach((x) => x.classList.toggle('sel', x === b));
      });
      rack.appendChild(b);
    });

    const actions = document.createElement('div');
    actions.className = 'bet-actions';
    panel.appendChild(actions);

    const undoBtn = document.createElement('button');
    undoBtn.className = 'btn-dim'; undoBtn.textContent = 'UNDO';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-dim'; clearBtn.textContent = 'CLEAR';
    const spinBtn = document.createElement('button');
    spinBtn.className = 'btn-gold'; spinBtn.textContent = 'SPIN'; spinBtn.disabled = true;
    actions.append(undoBtn, clearBtn, spinBtn);

    const totalLine = document.createElement('div');
    totalLine.className = 'bet-total';
    panel.appendChild(totalLine);

    function placeBet(id) {
      bets[id] = (bets[id] || 0) + selectedDenom;
      history.push({ id, amt: selectedDenom });
      refresh();
    }
    undoBtn.addEventListener('click', () => {
      const last = history.pop();
      if (!last) return;
      bets[last.id] -= last.amt;
      if (bets[last.id] <= 0) delete bets[last.id];
      refresh();
    });
    clearBtn.addEventListener('click', () => {
      Object.keys(bets).forEach((k) => delete bets[k]);
      history.length = 0;
      refresh();
    });
    spinBtn.addEventListener('click', () => {
      if (spinBtn.disabled) return;
      // Disable synchronously, before any async work: CSS (hidden-down ->
      // pointer-events:none) is the primary defense against further clicks
      // during a live spin, but nothing else in this handler previously
      // stopped a second/rapid click from firing onSpin (and therefore
      // wallet.debit) again with the SAME bets while the first round was
      // still in flight -- refresh() (which is what normally re-enables
      // this button) isn't called again until resetBets() at the round's
      // end. This flag is the actual re-entrancy guard; refresh() will
      // re-evaluate and correctly re-enable it once bets are reset.
      spinBtn.disabled = true;
      onSpin({ ...bets });
    });

    function refresh() {
      grid.querySelectorAll('.rspot').forEach((el) => {
        const amt = bets[el.dataset.spot] || 0;
        let badge = el.querySelector('.badge');
        if (amt > 0) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; el.appendChild(badge); }
          badge.textContent = amt.toLocaleString();
        } else if (badge) {
          badge.remove();
        }
      });
      const v = C.validate.roulette(bets);
      if (v.ok) {
        spinBtn.disabled = false;
        totalLine.textContent = 'Total: ' + v.total.toLocaleString();
      } else {
        spinBtn.disabled = true;
        if (v.reason === 'no-bets') {
          totalLine.textContent = 'Total: 0';
        } else {
          totalLine.innerHTML = '<span class="err">' + (REASON_COPY[v.reason] || '') + '</span>';
        }
      }
    }
    refresh();

    function resetBets() {
      Object.keys(bets).forEach((k) => delete bets[k]);
      history.length = 0;
      refresh();
    }

    return { el: root, resetBets };
  }

  // ---------- room ----------
  let dealerHook = null;
  let wheel = null;
  let ui = null;

  C.rooms.roulette = {
    title: 'ROULETTE',

    enter(app) {
      const A = C.assets, O = C.outcomes;
      const scene = app.scene;
      const gen = app.roomGen;

      scene.add(A.makeRoomShell({
        w: 12, d: 12, h: 4.5, wallColor: '#403020',
        ceilingColor: '#241a12', coveEmissiveIntensity: 0.25,
        ambientIntensity: 0.18, p1Intensity: 0.45, p2Intensity: 0.35, pointDistance: 9,
      }));

      // table: wood rail + felt top with the painted (decorative) layout
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, RAIL_H, 1.6), A.woodMaterial('#3a2214'));
      rail.position.y = RAIL_H / 2;
      rail.castShadow = true; rail.receiveShadow = true;
      scene.add(rail);

      const railTopMat = A.woodMaterial('#3a2214');
      const feltMat = new THREE.MeshStandardMaterial({ map: makeFeltLayoutTexture(), roughness: 0.9 });
      const felt = new THREE.Mesh(new THREE.BoxGeometry(3.28, 0.04, 1.48),
        [railTopMat, railTopMat, feltMat, railTopMat, railTopMat, railTopMat]);
      felt.position.y = FELT_Y;
      felt.receiveShadow = true;
      scene.add(felt);

      // wheel bowl (static) + spinning wheel mounted on top
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.34, 48), A.woodMaterial('#241408'));
      bowl.position.set(WHEEL_X, BOWL_TOP_Y - 0.17, 0);
      bowl.castShadow = true; bowl.receiveShadow = true;
      scene.add(bowl);

      const wheelMount = new THREE.Group();
      wheelMount.position.set(WHEEL_X, BOWL_TOP_Y, 0);
      scene.add(wheelMount);
      wheel = buildWheel(wheelMount);
      wheelMount.add(wheel.group);

      // dealer (default pose already faces +Z, i.e. toward the table/camera)
      const dealer = A.makeDealer();
      dealer.position.set(0, 0, -1.2);
      scene.add(dealer);
      dealerHook = dealer.userData.idle(app);

      // ghost chip piles on the felt near the far end
      const pileA = A.makeChipStack(500, 6);
      pileA.position.set(0.9, FELT_Y + 0.02, -0.55);
      scene.add(pileA);
      const pileB = A.makeChipStack(100, 4);
      pileB.position.set(1.25, FELT_Y + 0.02, -0.55);
      scene.add(pileB);

      // plaque
      const plaque = A.makePlaque(['ROULETTE', '100 – 5,000 PER SPOT', 'MAX 20,000 PER SPIN']);
      plaque.position.set(1.8, 0, -1);
      scene.add(plaque);

      // focused table spotlight (per brief: allowed, no shadow cast)
      const spot = new THREE.SpotLight(0xfff2d0, 0.9, 8, Math.PI / 5, 0.4, 1.2);
      spot.position.set(0, 3.2, 0.4);
      spot.target.position.set(0, FELT_Y, 0);
      spot.castShadow = false;
      scene.add(spot, spot.target);

      app.jumpTo(WIDE_POSE);
      app.flyTo(POSE_TABLE, 900);

      setTimeout(() => {
        if (app.roomGen !== gen) return;   // room switched during the delay
        ui = makeOverlay(startRound);
        app.setOverlay(ui.el);
      }, 800);

      async function startRound(betsSnapshot) {
        const v = C.validate.roulette(betsSnapshot);
        if (!v.ok) return;                       // SPIN is disabled otherwise; defensive guard
        if (!C.wallet.debit(v.total)) return;     // defensive; validate already checked balance

        ui.el.classList.add('hidden-down');
        app.flyTo(POSE_WHEEL, 1100);

        const result = O.rouletteResult();
        await wheel.spinTo(result);
        if (app.roomGen !== gen) return;          // room exited mid-spin

        const ret = O.rouletteReturn(betsSnapshot, result);
        if (ret > 0) C.wallet.credit(ret);

        const colorWord = result === 0 ? 'GREEN' : O.RED.has(result) ? 'RED' : 'BLACK';
        await app.banner(result + ' ' + colorWord, ret > 0 ? 'You win ' + ret.toLocaleString() : 'No win', 2600);
        if (app.roomGen !== gen) return;

        app.flyTo(POSE_TABLE, 900);
        ui.resetBets();
        ui.el.classList.remove('hidden-down');
      }
    },

    exit() {
      if (dealerHook) { C.app.offFrame(dealerHook); dealerHook = null; }
      wheel = null;
      ui = null;
    },
  };
})();
