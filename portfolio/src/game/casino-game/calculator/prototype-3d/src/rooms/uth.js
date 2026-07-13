(() => {
  const C = (globalThis.CASINO ??= {});
  const L = C.layouts.uth;

  const RAIL_H = 0.8;
  const FELT_Y = RAIL_H + 0.02;
  const RAIL_RX = 1.6;    // oval rail half-width (x) -- full table width 3.2
  const RAIL_RZ = 0.9;    // oval rail half-depth (z) -- full table depth 1.8
  const FELT_FRAC = 0.94; // felt inset inside the rail, leaves a wood rim visible
  const FELT_RX = RAIL_RX * FELT_FRAC;
  const FELT_RZ = RAIL_RZ * FELT_FRAC;

  // 6 stools around the near arc of the oval, symmetric about the 90-degree
  // (straight-ahead) axis -- the same angle set blackjack uses for its own
  // 6-seat arc (160/132/104/76/48/20), reused here for visual consistency
  // between the two rooms. Unlike blackjack, none of these 6 is "the
  // player's seat" -- the player's own implied position is a separate,
  // literal (0, *, 1.0) spot (see POSE_SEAT/L.poseDeal below), since nothing
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

  const REASON_COPY = {
    'ante-range': 'Ante 100 – 1,000',
    'ante-step': 'Ante in steps of 100',
    'trips-range': 'Trips 100 – 5,000',
    balance: 'Insufficient chips',
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ---------- felt texture: a dashed community-card strip across the middle.
  // Purely decorative -- all real betting happens through the DOM overlay +
  // 3D chip stacks; card boxes + bet-spot decals (added on top of the felt,
  // see enter() below) replace the old painted ANTE=BLIND / TRIPS circles and
  // dashed community-slot outlines this texture used to paint. ----------
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
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '22px Georgia, serif';
      ctx.fillText('COMMUNITY CARDS', cx, cy - 90);
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
  function makeOverlay(onDeal, stacks) {
    const bets = { ante: 0, trips: 0, jackpot: false };
    const history = [];
    // per-spot denomination history, mirrored 1:1 into the 3D chip stacks
    // (stacks.add/removeTop/clear below) so the 2D badge, the 2D chip icons,
    // and the 3D felt chips never drift out of sync under UNDO/CLEAR. ante
    // mirrors into BOTH placed.ante and placed.blind (and both 3D stacks) --
    // there is no separate blind spot in the DOM overlay, only in 3D.
    const placed = { ante: [], blind: [], trips: [], jackpot: [] };
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
      // ante mirrors to blind automatically -- one click funds both the ante
      // spot and the blind spot, in both the local bookkeeping and 3D.
      placed.ante.push(selectedDenom);
      placed.blind.push(selectedDenom);
      stacks.add('ante', selectedDenom);
      stacks.add('blind', selectedDenom);
      refresh();
    }
    function placeBet(id) {
      bets[id] = (bets[id] || 0) + selectedDenom;
      history.push({ id, amt: selectedDenom });
      placed[id].push(selectedDenom);
      stacks.add(id, selectedDenom);
      refresh();
    }
    function toggleJackpot() {
      bets.jackpot = !bets.jackpot;
      history.push({ id: 'jackpot', toggle: true });
      if (bets.jackpot) { placed.jackpot = [100]; stacks.add('jackpot', 100); }
      else { placed.jackpot = []; stacks.removeTop('jackpot'); }
      refresh();
    }

    undoBtn.addEventListener('click', () => {
      const last = history.pop();
      if (!last) return;
      if (last.toggle) {
        // re-toggle the jackpot -- adds/removes the single 100 chip again
        bets.jackpot = !bets.jackpot;
        if (bets.jackpot) { placed.jackpot = [100]; stacks.add('jackpot', 100); }
        else { placed.jackpot = []; stacks.removeTop('jackpot'); }
      } else if (last.id === 'ante') {
        // ante entries pop BOTH ante and blind together
        bets.ante -= last.amt;
        placed.ante.pop();
        placed.blind.pop();
        stacks.removeTop('ante');
        stacks.removeTop('blind');
      } else {
        bets[last.id] -= last.amt;
        placed[last.id].pop();
        stacks.removeTop(last.id);
      }
      refresh();
    });
    clearBtn.addEventListener('click', () => {
      bets.ante = 0; bets.trips = 0; bets.jackpot = false;
      history.length = 0;
      Object.values(placed).forEach((a) => (a.length = 0));
      stacks.clear();
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
      C.hud.renderChips(anteEl, placed.ante);
      setBadge(tripsEl, bets.trips > 0 ? bets.trips.toLocaleString() : null);
      C.hud.renderChips(tripsEl, placed.trips);
      jackpotEl.classList.toggle('on', bets.jackpot);
      setBadge(jackpotEl, bets.jackpot ? String(C.tables.uth.jackpot) : null);
      C.hud.renderChips(jackpotEl, placed.jackpot);

      const v = C.validate.uth({ ante: bets.ante, trips: bets.trips, jackpot: bets.jackpot });
      const allZero = bets.ante === 0 && bets.trips === 0 && !bets.jackpot;
      if (allZero) {
        dealBtn.disabled = true;
        totalLine.textContent = 'Total: 0';
      } else if (v.ok) {
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
      // Clear the local denom-history only -- the 3D stacks were already
      // consumed (paid out / lost / pushed) by settle()'s stacks.settle()
      // calls, so calling stacks.clear() here would double-remove them.
      Object.values(placed).forEach((a) => (a.length = 0));
      refresh();
    }

    return { el: root, resetBets, placed };
  }

  // ---------- room ----------
  let dealerHook = null;
  let ui = null;
  let stacks = null;
  let mirror = null;
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

      // painted card boxes + bet spots — positions ARE the deal/chip targets.
      ['playerSlots', 'dealerSlots', 'boardSlots'].forEach((key) => {
        L[key].forEach((slot) => {
          const box = C.cards.makeCardBoxDecal();
          box.position.set(slot[0], L.feltY + 0.002, slot[2]);
          scene.add(box);
        });
      });
      Object.values(L.spots).forEach(({ pos, r, label }) => {
        const decal = C.chips.makeSpotDecal({ label, r });
        decal.position.set(pos[0], L.feltY + 0.002, pos[2]);
        scene.add(decal);
      });
      stacks = C.chips.createBetStacks(app, {
        getSpotPos: (id) => L.spots[id].pos,
        source: L.chipSource,
        dealerPos: L.dealerChipPos,
      });
      mirror = C.hud.createMirror([
        { id: 'dealer', label: 'DEALER' },
        { id: 'board', label: 'BOARD' },
        { id: 'player', label: 'YOUR HAND' },
      ]);

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
      deckGroup.position.set(...L.deckPos);
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
        ui = makeOverlay(startRound, stacks);
        app.setOverlay(ui.el);
      }, 800);

      // ---------- round state (reset at the top of every startRound) ----------
      let bets = null;

      // Fires the dealer's arm-sweep + head-turn toward a world position,
      // timed to line up with a card's flight (delay matches the dealCardTo
      // stagger it accompanies). Re-entrant/roomGen-guarded helpers live on
      // the dealer mesh itself (assets.js) -- this just schedules the call.
      const gesture = (pos, delay = 0) => {
        setTimeout(() => {
          if (app.roomGen !== gen) return;
          dealer.userData.dealGesture(app, pos);
          dealer.userData.lookToward(app, pos);
        }, delay);
      };

      // ghost hole cards sit closer in than the ghost chip stacks (0.72 of
      // the same radius), with the pair's two cards nudged apart along
      // world x away from table-center -- purely decorative, never flipped.
      function ghostCardPos(seatIdx, cardIdx) {
        const a = seatAngle(seatIdx);
        const gx = Math.cos(a) * CHIP_RX * 0.72, gz = Math.sin(a) * CHIP_RZ * 0.72;
        const sign = gx < 0 ? -1 : 1;
        return [gx + sign * (cardIdx === 0 ? -0.05 : 0.05), L.cardY, gz];
      }

      // Deals the whole opening round -- player (face up), dealer (face
      // down), and both ghost seats' hole-card pairs (face down, purely
      // decorative, never flipped) -- as one staggered cascade that visually
      // "goes around the table": ghost1, player, ghost5, dealer, twice.
      async function dealInitial(playerHole, dealerHole) {
        const meshes = { player: [], dealer: [] };
        const seq = [
          { arr: null, card: null, faceUp: false, pos: ghostCardPos(GHOST_SEATS[0], 0) },
          { arr: meshes.player, card: playerHole[0], faceUp: true, pos: L.playerSlots[0] },
          { arr: null, card: null, faceUp: false, pos: ghostCardPos(GHOST_SEATS[1], 0) },
          { arr: meshes.dealer, card: dealerHole[0], faceUp: false, pos: L.dealerSlots[0] },
          { arr: null, card: null, faceUp: false, pos: ghostCardPos(GHOST_SEATS[0], 1) },
          { arr: meshes.player, card: playerHole[1], faceUp: true, pos: L.playerSlots[1] },
          { arr: null, card: null, faceUp: false, pos: ghostCardPos(GHOST_SEATS[1], 1) },
          { arr: meshes.dealer, card: dealerHole[1], faceUp: false, pos: L.dealerSlots[1] },
        ];
        const flights = seq.map((d, i) => {
          const mesh = C.cards.makeCard(d.card);
          mesh.rotation.x = -Math.PI / 2; // lie flat on the felt
          if (!d.faceUp) mesh.rotation.y = Math.PI;
          if (d.arr) d.arr.push(mesh);
          dealtMeshes.push(mesh);
          if (d.arr) gesture(d.pos, i * 220); // non-ghost cards only -- ghost props are decorative
          return C.cards.dealCardTo(app, mesh, L.deckPos, d.pos, { ms: 380, delay: i * 220 });
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
          const mesh = C.cards.makeCard(board[startIdx + i]);
          mesh.rotation.x = -Math.PI / 2;
          mesh.rotation.y = Math.PI;
          meshes.push(mesh);
          dealtMeshes.push(mesh);
          const pos = L.boardSlots[startIdx + i];
          gesture(pos, i * 220);
          flights.push(C.cards.dealCardTo(app, mesh, L.deckPos, pos, { ms: 380, delay: i * 220 }));
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
        app.flyTo(L.poseDeal, 900);
        mirror.clear();
        mirror.show();

        const deck = O.shuffle(O.makeDeck());       // single deck, per spec
        const playerHole = [deck.pop(), deck.pop()];
        const dealerHole = [deck.pop(), deck.pop()];
        const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

        const meshes = await dealInitial(playerHole, dealerHole);
        if (app.roomGen !== gen) return;          // room exited mid-deal
        mirror.set('player', playerHole, '');
        mirror.set('dealer', [null, null], '');

        const flop = await dealBoardStreet(board, 0, 3);
        if (app.roomGen !== gen) return;
        await Promise.all(flop.map((m) => C.cards.flipFlatCard(app, m, 350)));
        if (app.roomGen !== gen) return;
        mirror.set('board', board.slice(0, 3), '');
        await wait(600);
        if (app.roomGen !== gen) return;

        const turn = await dealBoardStreet(board, 3, 1);
        if (app.roomGen !== gen) return;
        await Promise.all(turn.map((m) => C.cards.flipFlatCard(app, m, 350)));
        if (app.roomGen !== gen) return;
        mirror.set('board', board.slice(0, 4), '');
        await wait(600);
        if (app.roomGen !== gen) return;

        const river = await dealBoardStreet(board, 4, 1);
        if (app.roomGen !== gen) return;
        await Promise.all(river.map((m) => C.cards.flipFlatCard(app, m, 350)));
        if (app.roomGen !== gen) return;
        mirror.set('board', board.slice(0, 5), '');

        await Promise.all(meshes.dealer.map((m) => C.cards.flipFlatCard(app, m, 350)));
        if (app.roomGen !== gen) return;
        mirror.set('dealer', dealerHole, '');

        const result = O.settleUTH(
          { ante: bets.ante, blind: bets.ante, trips: bets.trips, jackpot: bets.jackpot },
          board, playerHole, dealerHole,
        );

        // Credit payout immediately after settle, before banner — mid-banner exit cannot skip the credit
        if (result.ret > 0) C.wallet.credit(result.ret);

        mirror.set('player', playerHole, O.HAND_NAMES[result.p.cat]);
        mirror.set('dealer', dealerHole, O.HAND_NAMES[result.d.cat]);

        const title = result.cmp > 0 ? 'YOU WIN' : result.cmp === 0 ? 'PUSH' : 'DEALER WINS';
        const sub = O.HAND_NAMES[result.p.cat] + ' vs ' + O.HAND_NAMES[result.d.cat] +
          (bets.jackpot ? ' · Jackpot: no hit' : '') + ' — ' +
          (result.ret > 0 ? 'You win ' + result.ret.toLocaleString('en-US') : 'No win');

        // settleUTH returns only the aggregate `ret` — per-bet outcomes are a
        // VISUAL approximation: win -> winnings pushed at the ante spot, other
        // stacks return to the player; lose -> dealer takes everything;
        // push -> everything returns.
        const placed = ui.placed;
        const spotIds = ['ante', 'blind', 'trips', 'jackpot'].filter((id) => placed[id].length);
        let chipsDone;
        if (result.cmp > 0) {
          const stakes = bets.ante * 2 + bets.trips + (bets.jackpot ? 100 : 0);
          chipsDone = Promise.all([
            stacks.settle('ante', 'win', Math.max(0, result.ret - stakes)),
            ...spotIds.filter((id) => id !== 'ante').map((id) => stacks.settle(id, 'push', 0)),
          ]);
        } else {
          const outcome = result.cmp === 0 ? 'push' : 'lose';
          chipsDone = Promise.all(spotIds.map((id) => stacks.settle(id, outcome, 0)));
        }

        await app.banner(title, sub);
        if (app.roomGen !== gen) return;

        await chipsDone;
        if (app.roomGen !== gen) return;   // room exited while chips were still settling
        mirror.hide();

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
      stacks?.disposeAll(); stacks = null;
      mirror?.destroy(); mirror = null;
    },
  };
})();
