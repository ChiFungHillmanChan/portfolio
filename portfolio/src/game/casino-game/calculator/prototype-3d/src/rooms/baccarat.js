(() => {
  const C = (globalThis.CASINO ??= {});

  const RAIL_H = 0.8;
  const FELT_Y = RAIL_H + 0.02;
  const RAIL_RX = 1.8;    // oval rail half-width (x) -- full table width 3.6
  const RAIL_RZ = 0.85;   // oval rail half-depth (z) -- full table depth 1.7
  const FELT_FRAC = 0.94; // felt inset inside the rail, leaves a wood rim visible
  const FELT_RX = RAIL_RX * FELT_FRAC;
  const FELT_RZ = RAIL_RZ * FELT_FRAC;

  const PLAYER_X = -0.55, BANKER_X = 0.55;
  const ZONE_Z0 = 0.05, FAN_DZ = 0.15;
  const CARD_Y = FELT_Y + 0.03;

  const SHOE_POS = [0.85, FELT_Y, -0.55];

  // ghost-player stools: 4 points around the near half of the oval (2 each
  // side of the player's own implied seat at x=0), pulled outward from the
  // rail by SEAT_RX/RZ; their chip stacks + static cards sit further inward
  // at CHIP_RX/RZ, directly on the felt (same "pulled onto the felt" idea
  // blackjack uses for its own ghost seats).
  const GHOST_ANGLES_DEG = [40, 75, 105, 140];
  const SEAT_RX = 2.15, SEAT_RZ = 1.3;
  const CHIP_RX = 1.35, CHIP_RZ = 0.62;

  const WIDE_POSE = { pos: [0.6, 2.6, 5.4], look: [0, 1, -0.4] };
  const POSE_SEAT = { pos: [0, 1.35, 1.8], look: [0, 0.86, -0.3] };
  const POSE_CARDS = { pos: [0, 1.5, 1.0], look: [0, 0.86, -0.35] };

  const REASON_COPY = {
    'no-bets': 'Place a main bet (Player / Banker / Tie)',
    'main-range': 'Main bets 500 – 10,000',
    'side-range': 'Side bets 100 – 1,000',
    balance: 'Insufficient chips',
  };

  // ---------- felt texture: painted PLAYER | BANKER | TIE arcs + dashed
  // outlines marking the two card zones. CircleGeometry(1, ...) bakes UV as
  // (localX+1)/2, (localY+1)/2 (radius=1) -- the mesh's own non-uniform scale
  // (FELT_RX, FELT_RZ) happens after that, so world x maps back to canvas
  // fraction via (worldX/FELT_RX + 1)/2, independent of the z/y squish. ----------
  function makeFeltTexture() {
    const W = 1024, H = 512, cx = W / 2, cy = H / 2;
    return C.assets.canvasTexture(W, H, (ctx) => {
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(46,109,180,.38)';   // PLAYER tint (left)
      ctx.fillRect(0, 0, W * 0.37, H);
      ctx.fillStyle = 'rgba(163,22,33,.38)';    // BANKER tint (right)
      ctx.fillRect(W * 0.63, 0, W * 0.37, H);
      ctx.fillStyle = 'rgba(14,107,69,.5)';     // TIE tint (center)
      ctx.fillRect(W * 0.37, 0, W * 0.26, H);

      ctx.strokeStyle = 'rgba(240,216,120,.7)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(cx, cy, W / 2 - 14, H / 2 - 14, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 3;
      [0.37, 0.63].forEach((f) => {
        ctx.beginPath(); ctx.moveTo(W * f, 40); ctx.lineTo(W * f, H - 40); ctx.stroke();
      });

      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 58px Georgia, serif';
      ctx.fillText('PLAYER', W * 0.185, cy - 20);
      ctx.fillText('BANKER', W * 0.815, cy - 20);
      ctx.font = 'bold 42px Georgia, serif';
      ctx.fillText('TIE', cx, cy - 14);
      ctx.font = '22px Georgia, serif';
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText('PAYS 1 TO 1', W * 0.185, cy + 34);
      ctx.fillText('PAYS 0.95 TO 1', W * 0.815, cy + 34);
      ctx.fillText('PAYS 8 TO 1', cx, cy + 30);

      const zoneFrac = (x) => (x / FELT_RX + 1) / 2;
      ctx.strokeStyle = 'rgba(240,216,120,.55)'; ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      [PLAYER_X, BANKER_X].forEach((x) => {
        const zx = W * zoneFrac(x);
        ctx.strokeRect(zx - 95, cy - 70, 190, 210);
      });
      ctx.setLineDash([]);
    });
  }

  // Reveal a flat-lying card in place: rotation.x stays fixed throughout (the
  // existing userData.flip() only ever tweens rotation.y), same helper as
  // blackjack.js's flipFlatCard -- a brief lift-then-settle purely cosmetic.
  function flipFlatCard(mesh, ms) {
    if (C.app.REDUCED) ms = Math.min(ms, 180);
    return new Promise((resolve) => {
      const baseY = mesh.position.y;
      C.tween.to(mesh.position, { y: baseY + 0.05 }, ms / 2, 'outCubic', () => {
        C.tween.to(mesh.position, { y: baseY }, ms / 2, 'outQuart');
      });
      mesh.userData.flip(ms, resolve);
    });
  }

  function disposeMesh(mesh) {
    mesh.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if (!m) return; m.map?.dispose(); m.dispose(); });
    });
  }

  // ---------- betting overlay ----------
  function makeOverlay(onDeal) {
    const bets = { player: 0, banker: 0, tie: 0, pPair: 0, bPair: 0 };
    const history = [];
    let selectedDenom = 100;

    const root = document.createElement('div');
    root.className = 'bet-overlay';
    const panel = document.createElement('div');
    panel.className = 'bet-panel';
    root.appendChild(panel);

    const title = document.createElement('div');
    title.className = 'bet-title';
    title.textContent = 'BACCARAT — PLACE YOUR BETS';
    panel.appendChild(title);

    const mains = document.createElement('div');
    mains.className = 'bac-mains';
    panel.appendChild(mains);

    function makeCircle(container, id, label, cls) {
      const el = document.createElement('div');
      el.className = 'bac-circle ' + cls;
      el.dataset.spot = id;
      el.textContent = label;
      el.addEventListener('click', () => placeBet(id));
      container.appendChild(el);
    }
    makeCircle(mains, 'player', 'PLAYER', 'player');
    makeCircle(mains, 'tie', 'TIE', 'tie');
    makeCircle(mains, 'banker', 'BANKER', 'banker');

    const sides = document.createElement('div');
    sides.className = 'bac-sides';
    panel.appendChild(sides);
    makeCircle(sides, 'pPair', 'P PAIR', 'side');
    makeCircle(sides, 'bPair', 'B PAIR', 'side');

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
    const dealBtn = document.createElement('button');
    dealBtn.className = 'btn-gold'; dealBtn.textContent = 'DEAL'; dealBtn.disabled = true;
    actions.append(undoBtn, clearBtn, dealBtn);

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
      refresh();
    });
    clearBtn.addEventListener('click', () => {
      Object.keys(bets).forEach((k) => (bets[k] = 0));
      history.length = 0;
      refresh();
    });
    dealBtn.addEventListener('click', () => {
      if (dealBtn.disabled) return;
      // Disable synchronously, before any async work -- same re-entrancy guard
      // as roulette's SPIN / blackjack's DEAL: nothing else here stops a second
      // click from firing onDeal (and wallet.debit) again with the SAME bets
      // while the first round is still in flight.
      dealBtn.disabled = true;
      onDeal({ ...bets });
    });

    function refresh() {
      [mains, sides].forEach((container) => {
        container.querySelectorAll('.bac-circle').forEach((el) => {
          const amt = bets[el.dataset.spot] || 0;
          let badge = el.querySelector('.badge');
          if (amt > 0) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; el.appendChild(badge); }
            badge.textContent = amt.toLocaleString();
          } else if (badge) {
            badge.remove();
          }
        });
      });
      const v = C.validate.baccarat(bets);
      if (v.ok) {
        dealBtn.disabled = false;
        totalLine.textContent = 'Total: ' + v.total.toLocaleString();
      } else {
        dealBtn.disabled = true;
        totalLine.innerHTML = '<span class="err">' + (REASON_COPY[v.reason] || '') + '</span>';
      }
    }
    refresh();

    function resetBets() {
      Object.keys(bets).forEach((k) => (bets[k] = 0));
      history.length = 0;
      refresh();
    }

    return { el: root, resetBets };
  }

  // ---------- room ----------
  let dealerHook = null;
  let ui = null;
  let dealtMeshes = [];
  let tagEls = {};

  C.rooms.baccarat = {
    title: 'BACCARAT',

    enter(app) {
      const A = C.assets, O = C.outcomes;
      const scene = app.scene;
      const gen = app.roomGen;
      dealtMeshes = [];
      tagEls = {};

      scene.add(A.makeRoomShell({
        w: 13, d: 12, h: 4.5, wallColor: '#4a2620',
        ceilingColor: '#241410', coveEmissiveIntensity: 0.22,
        ambientIntensity: 0.17, p1Intensity: 0.42, p2Intensity: 0.32, pointDistance: 10,
      }));

      // oval rail: a unit CylinderGeometry (circular cross-section) scaled
      // non-uniformly in x/z into a true ellipse -- one seamless mesh, and
      // CylinderGeometry's cross-section is already a plain circle so the
      // scale turns it into an elliptical prism with no extra geometry work.
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, RAIL_H, 56), A.woodMaterial('#3a2214'));
      rail.scale.set(RAIL_RX, 1, RAIL_RZ);
      rail.position.y = RAIL_H / 2;
      rail.castShadow = true; rail.receiveShadow = true;
      scene.add(rail);

      // felt: a unit CircleGeometry with the same non-uniform x/z scale,
      // inset slightly smaller than the rail so a wood rim shows at the edge.
      const feltMat = new THREE.MeshStandardMaterial({ map: makeFeltTexture(), roughness: 0.9 });
      const felt = new THREE.Mesh(new THREE.CircleGeometry(1, 64), feltMat);
      felt.rotation.x = -Math.PI / 2;
      felt.scale.set(FELT_RX, FELT_RZ, 1);
      felt.position.y = FELT_Y;
      felt.receiveShadow = true;
      scene.add(felt);

      // dealer (default pose already faces +Z, i.e. toward the table/camera)
      const dealer = A.makeDealer();
      dealer.position.set(0, 0, -1.25);
      scene.add(dealer);
      dealerHook = dealer.userData.idle(app);

      // card shoe: angled black box with a gold trim lip, resting on the felt
      // near the dealer's side.
      const shoeGroup = new THREE.Group();
      const shoeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.16, 0.22),
        new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.3 }),
      );
      shoeBody.rotation.x = -0.35;
      shoeBody.castShadow = true; shoeBody.receiveShadow = true;
      shoeGroup.add(shoeBody);
      const shoeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), A.goldMaterial());
      shoeTrim.rotation.x = -0.35;
      shoeTrim.position.y = 0.09;
      shoeGroup.add(shoeTrim);
      shoeGroup.position.set(...SHOE_POS);
      scene.add(shoeGroup);

      // 4 ghost-player stools (2 each side of the player's own implied seat
      // at x=0), each with a chip stack + a static face-down card pulled
      // inward onto the felt -- same idea as blackjack's ghost seats.
      GHOST_ANGLES_DEG.forEach((deg) => {
        const rad = (deg * Math.PI) / 180;
        const stool = A.makeStool();
        stool.position.set(Math.cos(rad) * SEAT_RX, 0, Math.sin(rad) * SEAT_RZ);
        scene.add(stool);

        const chips = A.makeChipStack(500, 4);
        chips.position.set(Math.cos(rad) * CHIP_RX, FELT_Y + 0.02, Math.sin(rad) * CHIP_RZ);
        scene.add(chips);

        const card = A.makeCard(null);
        card.rotation.x = -Math.PI / 2;
        card.position.set(Math.cos(rad) * CHIP_RX * 0.7, FELT_Y + 0.015, Math.sin(rad) * CHIP_RZ * 0.7);
        scene.add(card);
      });

      // plaque
      const plaque = A.makePlaque(['BACCARAT', 'MAIN 500 – 10,000', 'SIDES 100 – 1,000']);
      plaque.position.set(2.4, 0, -0.8);
      scene.add(plaque);

      // focused table spotlight (no shadow cast, matches roulette/blackjack)
      const spot = new THREE.SpotLight(0xfff2d0, 0.9, 8, Math.PI / 5, 0.4, 1.2);
      spot.position.set(0, 3.3, 0.2);
      spot.target.position.set(0, FELT_Y, 0);
      spot.castShadow = false;
      scene.add(spot, spot.target);

      app.jumpTo(WIDE_POSE);
      app.flyTo(POSE_SEAT, 900);

      setTimeout(() => {
        if (app.roomGen !== gen) return;   // room switched during the delay
        ui = makeOverlay(startRound);
        app.setOverlay(ui.el);
      }, 800);

      // ---------- round state (reset at the top of every startRound) ----------
      let bets = null;

      function zonePos(x, idx) {
        return [x, CARD_Y, ZONE_Z0 + idx * FAN_DZ];
      }

      function showTag(side, total) {
        let el = tagEls[side];
        if (!el) {
          el = document.createElement('div');
          el.className = 'bac-tag ' + side;
          document.body.appendChild(el);
          tagEls[side] = el;
        }
        el.textContent = (side === 'player' ? 'PLAYER ' : 'BANKER ') + total;
      }
      function clearTags() {
        Object.values(tagEls).forEach((el) => el.remove());
        tagEls = {};
      }

      // P1, B1, P2, B2 -- face-down, 380ms stagger, alternating zones.
      async function dealInitial(round) {
        const seq = [
          { side: 'player', idx: 0, card: round.P[0] },
          { side: 'banker', idx: 0, card: round.B[0] },
          { side: 'player', idx: 1, card: round.P[1] },
          { side: 'banker', idx: 1, card: round.B[1] },
        ];
        const meshes = { player: [], banker: [] };
        const flights = seq.map((d, i) => {
          const mesh = A.makeCard(d.card);
          mesh.rotation.x = -Math.PI / 2; // lie flat on the felt
          mesh.rotation.y = Math.PI;      // dealt face-down, flipped later
          meshes[d.side][d.idx] = mesh;
          dealtMeshes.push(mesh);
          const x = d.side === 'player' ? PLAYER_X : BANKER_X;
          return A.dealCardTo(app, mesh, SHOE_POS, zonePos(x, d.idx), { ms: 420, delay: i * 380 });
        });
        await Promise.all(flights);
        return meshes;
      }

      async function dealThird(side, card, idx) {
        const mesh = A.makeCard(card);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.y = Math.PI;
        dealtMeshes.push(mesh);
        const x = side === 'player' ? PLAYER_X : BANKER_X;
        await A.dealCardTo(app, mesh, SHOE_POS, zonePos(x, idx), { ms: 420 });
        return mesh;
      }

      // Deals + flips the whole round visually from the precomputed `round`
      // (P/B arrays are already in rule-correct deal order). Returns false if
      // the room was exited mid-flight, so the caller knows not to settle.
      async function dealRound(round) {
        const meshes = await dealInitial(round);
        if (app.roomGen !== gen) return false;

        await Promise.all(meshes.player.map((m) => flipFlatCard(m, 350)));
        if (app.roomGen !== gen) return false;
        showTag('player', O.bacTotal(round.P.slice(0, 2)));

        await Promise.all(meshes.banker.map((m) => flipFlatCard(m, 350)));
        if (app.roomGen !== gen) return false;
        showTag('banker', O.bacTotal(round.B.slice(0, 2)));

        if (round.P.length === 3) {
          const mesh = await dealThird('player', round.P[2], 2);
          if (app.roomGen !== gen) return false;
          await flipFlatCard(mesh, 350);
          if (app.roomGen !== gen) return false;
          showTag('player', O.bacTotal(round.P));
        }
        if (round.B.length === 3) {
          const mesh = await dealThird('banker', round.B[2], 2);
          if (app.roomGen !== gen) return false;
          await flipFlatCard(mesh, 350);
          if (app.roomGen !== gen) return false;
          showTag('banker', O.bacTotal(round.B));
        }
        return true;
      }

      async function startRound(betsSnapshot) {
        const v = C.validate.baccarat(betsSnapshot);
        if (!v.ok) return;                       // DEAL is disabled otherwise; defensive guard
        if (!C.wallet.debit(v.total)) return;     // defensive; validate already checked balance

        bets = betsSnapshot;
        ui.el.classList.add('hidden-down');
        app.flyTo(POSE_CARDS, 900);

        const round = O.playBaccarat(O.makeShoe(8));

        const completed = await dealRound(round);
        if (!completed || app.roomGen !== gen) return;   // room exited mid-deal

        const ret = O.baccaratReturn(bets, round);
        if (ret > 0) C.wallet.credit(ret);

        const title = round.winner === 'player'
          ? `PLAYER WINS ${round.pT}–${round.bT}`
          : round.winner === 'banker'
            ? `BANKER WINS ${round.bT}–${round.pT}`
            : `ÉGALITÉ ${round.pT}–${round.bT}`;
        const sub = ret > 0 ? 'You win ' + ret.toLocaleString() : 'No win';
        await app.banner(title, sub);
        if (app.roomGen !== gen) return;

        dealtMeshes.forEach((m) => { app.scene.remove(m); disposeMesh(m); });
        dealtMeshes = [];
        clearTags();
        app.flyTo(POSE_SEAT, 900);
        ui.resetBets();
        ui.el.classList.remove('hidden-down');
      }
    },

    exit() {
      if (dealerHook) { C.app.offFrame(dealerHook); dealerHook = null; }
      Object.values(tagEls).forEach((el) => el.remove());   // DOM tags aren't scene children -- must remove ourselves
      tagEls = {};
      dealtMeshes = [];
      ui = null;
    },
  };
})();
