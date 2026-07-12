(() => {
  const C = (globalThis.CASINO ??= {});

  const RAIL_H = 0.8;
  const FELT_Y = RAIL_H + 0.02;
  const RAIL_RX = 1.6;    // oval rail half-width (x) -- full table width 3.2
  const RAIL_RZ = 0.9;    // oval rail half-depth (z) -- full table depth 1.8
  const FELT_FRAC = 0.94; // felt inset inside the rail, leaves a wood rim visible
  const FELT_RX = RAIL_RX * FELT_FRAC;
  const FELT_RZ = RAIL_RZ * FELT_FRAC;
  const CARD_Y = FELT_Y + 0.03;

  const DECK_POS = [0.75, FELT_Y, -0.65];
  const PLAYER_BASE = [-0.11, CARD_Y, 0.55];
  const DEALER_BASE = [-0.11, CARD_Y, -0.55];
  const BOARD_BASE_X = -0.44;
  const FAN_DX = 0.22;

  // 6 stools around the near arc of the oval, symmetric about the 90-degree
  // (straight-ahead) axis -- the same angle set blackjack uses for its own
  // 6-seat arc (160/132/104/76/48/20), reused here for visual consistency
  // between the two rooms. Unlike blackjack, none of these 6 is "the
  // player's seat" -- the player's own implied position is a separate,
  // literal (0, *, 1.0) spot (see POSE_SEAT/POSE_DEAL below), since nothing
  // in this app ever renders a mesh where the camera itself sits. All 6
  // stools are other-player furniture; only indices 1 and 5 (mirroring
  // blackjack's own GHOST_SEATS) get chip + card props.
  const SEAT_ANGLES_DEG = [160, 132, 104, 76, 48, 20];
  const SEAT_RX = 1.85, SEAT_RZ = 1.1;
  const GHOST_SEATS = [1, 5];
  const CHIP_RX = 1.25, CHIP_RZ = 0.68;

  function seatAngle(i) { return (SEAT_ANGLES_DEG[i] * Math.PI) / 180; }

  const WIDE_POSE = { pos: [0, 2.6, 5.4], look: [0, 1, -0.4] };
  const POSE_SEAT = { pos: [0, 1.32, 1.7], look: [0, 0.85, -0.4] };
  const POSE_DEAL = { pos: [0, 1.5, 1.15], look: [0, 0.86, -0.4] };

  const REASON_COPY = {
    'ante-range': 'Ante 100 – 1,000',
    'ante-step': 'Ante in steps of 100',
    'trips-range': 'Trips 100 – 5,000',
    balance: 'Insufficient chips',
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ---------- felt texture: painted ANTE=BLIND / TRIPS circles + a dashed
  // community-card strip across the middle. Purely decorative -- all real
  // betting happens through the DOM overlay, same convention as roulette's
  // painted (non-interactive) layout and baccarat's painted zone tints. ----------
  function makeFeltTexture() {
    const W = 1024, H = 576, cx = W / 2, cy = H / 2;
    return C.assets.canvasTexture(W, H, (ctx) => {
      ctx.fillStyle = '#0b5d3b';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(240,216,120,.6)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(cx, cy, W / 2 - 14, H / 2 - 14, 0, 0, Math.PI * 2); ctx.stroke();

      // community strip
      ctx.fillStyle = 'rgba(14,107,69,.55)';
      ctx.fillRect(W * 0.22, cy - 60, W * 0.56, 120);
      ctx.strokeStyle = 'rgba(240,216,120,.5)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      for (let i = 0; i < 5; i++) {
        const x = W * 0.26 + i * (W * 0.48 / 4);
        ctx.strokeRect(x - 38, cy - 46, 76, 92);
      }
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '22px Georgia, serif';
      ctx.fillText('COMMUNITY CARDS', cx, cy - 90);

      // ANTE = BLIND circle (player side)
      ctx.fillStyle = 'rgba(46,109,180,.4)';
      ctx.beginPath(); ctx.arc(cx, cy + 160, 90, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(240,216,120,.6)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText('ANTE', cx, cy + 140);
      ctx.font = '20px Georgia, serif';
      ctx.fillText('= BLIND', cx, cy + 172);

      // TRIPS circle
      ctx.fillStyle = 'rgba(163,22,33,.4)';
      ctx.beginPath(); ctx.arc(cx + 260, cy + 150, 60, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(240,216,120,.6)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Georgia, serif';
      ctx.fillText('TRIPS', cx + 260, cy + 150);
    });
  }

  // Reveal a flat-lying card in place: rotation.x stays fixed throughout (the
  // existing userData.flip() only ever tweens rotation.y), same helper as
  // baccarat.js/blackjack.js's flipFlatCard.
  function flipFlatCard(mesh, ms) {
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
    const bets = { ante: 0, trips: 0, jackpot: false };
    const history = [];
    let selectedDenom = 100;

    const root = document.createElement('div');
    root.className = 'bet-overlay';
    const panel = document.createElement('div');
    panel.className = 'bet-panel';
    root.appendChild(panel);

    const title = document.createElement('div');
    title.className = 'bet-title';
    title.textContent = 'ULTIMATE HOLD’EM — PLACE YOUR BETS';
    panel.appendChild(title);

    const spots = document.createElement('div');
    spots.className = 'uth-spots';
    panel.appendChild(spots);

    const anteEl = document.createElement('div');
    anteEl.className = 'uth-circle ante';
    anteEl.dataset.spot = 'ante';
    anteEl.textContent = 'ANTE';
    anteEl.addEventListener('click', () => placeAnte());
    spots.appendChild(anteEl);

    const tripsEl = document.createElement('div');
    tripsEl.className = 'uth-circle trips';
    tripsEl.dataset.spot = 'trips';
    tripsEl.textContent = 'TRIPS';
    tripsEl.addEventListener('click', () => placeBet('trips'));
    spots.appendChild(tripsEl);

    const jackpotEl = document.createElement('div');
    jackpotEl.className = 'uth-jackpot';
    jackpotEl.textContent = 'JACKPOT';
    jackpotEl.addEventListener('click', () => toggleJackpot());
    spots.appendChild(jackpotEl);

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

    // Ante is capped to denominations <= its own max (1,000) -- clicking a
    // bigger chip (5,000) on the ante spot is rejected outright (no partial
    // bet applied) and flashes the exact 'ante-range' copy, per the brief.
    // Trips has no such per-click cap: its range (100-5,000) already spans
    // the whole chip rack, so ordinary accumulation + the shared validate()
    // pass (below) is enough to surface 'trips-range' if it's ever exceeded.
    function placeAnte() {
      if (selectedDenom > C.tables.uth.ante.max) {
        totalLine.innerHTML = '<span class="err">' + REASON_COPY['ante-range'] + '</span>';
        return;
      }
      bets.ante += selectedDenom;
      history.push({ id: 'ante', amt: selectedDenom });
      refresh();
    }
    function placeBet(id) {
      bets[id] = (bets[id] || 0) + selectedDenom;
      history.push({ id, amt: selectedDenom });
      refresh();
    }
    function toggleJackpot() {
      bets.jackpot = !bets.jackpot;
      history.push({ id: 'jackpot', toggle: true });
      refresh();
    }

    undoBtn.addEventListener('click', () => {
      const last = history.pop();
      if (!last) return;
      if (last.toggle) bets.jackpot = !bets.jackpot;
      else bets[last.id] -= last.amt;
      refresh();
    });
    clearBtn.addEventListener('click', () => {
      bets.ante = 0; bets.trips = 0; bets.jackpot = false;
      history.length = 0;
      refresh();
    });
    dealBtn.addEventListener('click', () => {
      if (dealBtn.disabled) return;
      // Disable synchronously, before any async work -- same re-entrancy guard
      // as the other rooms' DEAL/SPIN buttons.
      dealBtn.disabled = true;
      onDeal({ ...bets });
    });

    function setBadge(el, text) {
      let badge = el.querySelector('.badge');
      if (text) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; el.appendChild(badge); }
        badge.textContent = text;
      } else if (badge) {
        badge.remove();
      }
    }

    function refresh() {
      // ante mirrors to blind automatically -- one spot, one click sets both
      setBadge(anteEl, bets.ante > 0
        ? 'ANTE ' + bets.ante.toLocaleString() + ' + BLIND ' + bets.ante.toLocaleString()
        : null);
      setBadge(tripsEl, bets.trips > 0 ? bets.trips.toLocaleString() : null);
      jackpotEl.classList.toggle('on', bets.jackpot);
      setBadge(jackpotEl, bets.jackpot ? String(C.tables.uth.jackpot) : null);

      const v = C.validate.uth({ ante: bets.ante, trips: bets.trips, jackpot: bets.jackpot });
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
      bets.ante = 0; bets.trips = 0; bets.jackpot = false;
      history.length = 0;
      refresh();
    }

    return { el: root, resetBets };
  }

  // ---------- room ----------
  let dealerHook = null;
  let ui = null;
  let dealtMeshes = [];

  C.rooms.uth = {
    title: 'ULTIMATE HOLD’EM',

    enter(app) {
      const A = C.assets, O = C.outcomes;
      const scene = app.scene;
      const gen = app.roomGen;
      dealtMeshes = [];

      scene.add(A.makeRoomShell({
        w: 12, d: 12, h: 4.5, wallColor: '#2a3524',
        ceilingColor: '#141c11', coveEmissiveIntensity: 0.22,
        ambientIntensity: 0.17, p1Intensity: 0.42, p2Intensity: 0.32, pointDistance: 9,
      }));

      // oval rail + felt, same non-uniform-scaled-primitive technique as
      // baccarat.js (unit CylinderGeometry / CircleGeometry, scaled into a
      // true ellipse -- one seamless mesh each, no custom UV work needed).
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, RAIL_H, 56), A.woodMaterial('#3a2214'));
      rail.scale.set(RAIL_RX, 1, RAIL_RZ);
      rail.position.y = RAIL_H / 2;
      rail.castShadow = true; rail.receiveShadow = true;
      scene.add(rail);

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

      // deck stub: a small closed card box (single deck, not a multi-deck
      // shoe) with a thin gold trim base, sitting flat on the felt.
      const deckGroup = new THREE.Group();
      const deckBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.05, 0.19),
        new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.3 }),
      );
      deckBody.position.y = 0.031;
      deckBody.castShadow = true; deckBody.receiveShadow = true;
      deckGroup.add(deckBody);
      const deckTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.21), A.goldMaterial());
      deckTrim.position.y = 0.006;
      deckGroup.add(deckTrim);
      deckGroup.position.set(...DECK_POS);
      scene.add(deckGroup);

      // 6 stools on the near arc; seats 1 and 5 get ghost-occupant chip
      // stacks (their hole-card pairs are dealt fresh each round, alongside
      // the player's and dealer's, then cleaned up at round-end like every
      // other dealt card -- see dealInitial below).
      for (let i = 0; i < SEAT_ANGLES_DEG.length; i++) {
        const stool = A.makeStool();
        const a = seatAngle(i);
        stool.position.set(Math.cos(a) * SEAT_RX, 0, Math.sin(a) * SEAT_RZ);
        scene.add(stool);
      }
      GHOST_SEATS.forEach((i) => {
        const a = seatAngle(i);
        const chips = A.makeChipStack(500, 4);
        chips.position.set(Math.cos(a) * CHIP_RX, FELT_Y + 0.02, Math.sin(a) * CHIP_RZ);
        scene.add(chips);
      });

      // plaque
      const plaque = A.makePlaque(['ULTIMATE HOLD’EM', 'ANTE = BLIND 100 – 1,000', 'TRIPS 100 – 5,000 · JACKPOT 100']);
      plaque.position.set(2.1, 0, -0.6);
      scene.add(plaque);

      // focused table spotlight (no shadow cast, matches the other rooms)
      const spot = new THREE.SpotLight(0xfff2d0, 0.9, 8, Math.PI / 5, 0.4, 1.2);
      spot.position.set(0, 3.3, 0.1);
      spot.target.position.set(0, FELT_Y, -0.1);
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

      function playerCardPos(idx) { return [PLAYER_BASE[0] + idx * FAN_DX, CARD_Y, PLAYER_BASE[2]]; }
      function dealerCardPos(idx) { return [DEALER_BASE[0] + idx * FAN_DX, CARD_Y, DEALER_BASE[2]]; }
      function boardCardPos(idx) { return [BOARD_BASE_X + idx * FAN_DX, CARD_Y, 0]; }
      // ghost hole cards sit closer in than the ghost chip stacks (0.72 of
      // the same radius), with the pair's two cards nudged apart along
      // world x away from table-center -- purely decorative, never flipped.
      function ghostCardPos(seatIdx, cardIdx) {
        const a = seatAngle(seatIdx);
        const gx = Math.cos(a) * CHIP_RX * 0.72, gz = Math.sin(a) * CHIP_RZ * 0.72;
        const sign = gx < 0 ? -1 : 1;
        return [gx + sign * (cardIdx === 0 ? -0.05 : 0.05), CARD_Y, gz];
      }

      // Deals the whole opening round -- player (face up), dealer (face
      // down), and both ghost seats' hole-card pairs (face down, purely
      // decorative, never flipped) -- as one staggered cascade that visually
      // "goes around the table": ghost1, player, ghost5, dealer, twice.
      async function dealInitial(playerHole, dealerHole) {
        const meshes = { player: [], dealer: [] };
        const seq = [
          { arr: null, card: null, faceUp: false, pos: ghostCardPos(GHOST_SEATS[0], 0) },
          { arr: meshes.player, card: playerHole[0], faceUp: true, pos: playerCardPos(0) },
          { arr: null, card: null, faceUp: false, pos: ghostCardPos(GHOST_SEATS[1], 0) },
          { arr: meshes.dealer, card: dealerHole[0], faceUp: false, pos: dealerCardPos(0) },
          { arr: null, card: null, faceUp: false, pos: ghostCardPos(GHOST_SEATS[0], 1) },
          { arr: meshes.player, card: playerHole[1], faceUp: true, pos: playerCardPos(1) },
          { arr: null, card: null, faceUp: false, pos: ghostCardPos(GHOST_SEATS[1], 1) },
          { arr: meshes.dealer, card: dealerHole[1], faceUp: false, pos: dealerCardPos(1) },
        ];
        const flights = seq.map((d, i) => {
          const mesh = A.makeCard(d.card);
          mesh.rotation.x = -Math.PI / 2; // lie flat on the felt
          if (!d.faceUp) mesh.rotation.y = Math.PI;
          if (d.arr) d.arr.push(mesh);
          dealtMeshes.push(mesh);
          return A.dealCardTo(app, mesh, DECK_POS, d.pos, { ms: 380, delay: i * 220 });
        });
        await Promise.all(flights);
        return meshes;
      }

      // Deals `count` board cards (face down) starting at `board[startIdx]`.
      // Flipping is the caller's job (flop/turn/river each flip as a batch).
      async function dealBoardStreet(board, startIdx, count) {
        const meshes = [];
        const flights = [];
        for (let i = 0; i < count; i++) {
          const mesh = A.makeCard(board[startIdx + i]);
          mesh.rotation.x = -Math.PI / 2;
          mesh.rotation.y = Math.PI;
          meshes.push(mesh);
          dealtMeshes.push(mesh);
          flights.push(A.dealCardTo(app, mesh, DECK_POS, boardCardPos(startIdx + i), { ms: 380, delay: i * 220 }));
        }
        await Promise.all(flights);
        return meshes;
      }

      async function startRound(betsSnapshot) {
        const v = C.validate.uth(betsSnapshot);
        if (!v.ok) return;                       // DEAL is disabled otherwise; defensive guard
        if (!C.wallet.debit(v.total)) return;     // defensive; validate already checked balance

        bets = betsSnapshot;
        ui.el.classList.add('hidden-down');
        app.flyTo(POSE_DEAL, 900);

        const deck = O.shuffle(O.makeDeck());       // single deck, per spec
        const playerHole = [deck.pop(), deck.pop()];
        const dealerHole = [deck.pop(), deck.pop()];
        const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

        const meshes = await dealInitial(playerHole, dealerHole);
        if (app.roomGen !== gen) return;          // room exited mid-deal

        const flop = await dealBoardStreet(board, 0, 3);
        if (app.roomGen !== gen) return;
        await Promise.all(flop.map((m) => flipFlatCard(m, 350)));
        if (app.roomGen !== gen) return;
        await wait(600);
        if (app.roomGen !== gen) return;

        const turn = await dealBoardStreet(board, 3, 1);
        if (app.roomGen !== gen) return;
        await Promise.all(turn.map((m) => flipFlatCard(m, 350)));
        if (app.roomGen !== gen) return;
        await wait(600);
        if (app.roomGen !== gen) return;

        const river = await dealBoardStreet(board, 4, 1);
        if (app.roomGen !== gen) return;
        await Promise.all(river.map((m) => flipFlatCard(m, 350)));
        if (app.roomGen !== gen) return;

        await Promise.all(meshes.dealer.map((m) => flipFlatCard(m, 350)));
        if (app.roomGen !== gen) return;

        const result = O.settleUTH(
          { ante: bets.ante, blind: bets.ante, trips: bets.trips, jackpot: bets.jackpot },
          board, playerHole, dealerHole,
        );

        // Credit payout immediately after settle, before banner — mid-banner exit cannot skip the credit
        if (result.ret > 0) C.wallet.credit(result.ret);

        const title = result.cmp > 0 ? 'YOU WIN' : result.cmp === 0 ? 'PUSH' : 'DEALER WINS';
        const sub = O.HAND_NAMES[result.p.cat] + ' vs ' + O.HAND_NAMES[result.d.cat] +
          (bets.jackpot ? ' · Jackpot: no hit' : '');
        await app.banner(title, sub);
        if (app.roomGen !== gen) return;

        dealtMeshes.forEach((m) => { app.scene.remove(m); disposeMesh(m); });
        dealtMeshes = [];
        app.flyTo(POSE_SEAT, 900);
        ui.resetBets();
        ui.el.classList.remove('hidden-down');
      }
    },

    exit() {
      if (dealerHook) { C.app.offFrame(dealerHook); dealerHook = null; }
      dealtMeshes = [];
      ui = null;
    },
  };
})();
