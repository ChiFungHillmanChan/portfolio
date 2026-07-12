(() => {
  const C = (globalThis.CASINO ??= {});

  const TABLE_R = 1.6;
  const RAIL_H = 0.8;
  const FELT_Y = 0.83;
  const SEAT_R = 1.95;
  const SEAT_COUNT = 6;
  const SEAT_ANGLE_START = 160;   // degrees; seats run 160 -> 20 in 28-degree steps (index0..5)
  const SEAT_ANGLE_STEP = 28;
  const GHOST_SEATS = [1, 5];
  const GHOST_R = TABLE_R - 0.35;

  const SHOE_POS = [1.1, 0.83, -0.75];
  const PLAYER_BASE = [0.35, 0.86, 0.35];
  const DEALER_BASE = [-0.15, 0.86, -0.55];
  const FAN_DX = 0.11;

  const WIDE_POSE = { pos: [0.6, 2.6, 5.2], look: [0, 1, -0.4] };
  const POSE_SEAT = { pos: [0.45, 1.28, 1.55], look: [0, 0.85, -0.6] };
  const POSE_DEAL = { pos: [0.2, 1.5, 1.1], look: [0, 0.86, -0.5] };

  const REASON_COPY = {
    'main-range': 'Main bet 500 – 10,000',
    'side-range': 'Side bets 100 – 2,500',
    balance: 'Insufficient chips',
  };

  // angle for seat index i, in radians; seats sweep 160deg -> 20deg so index3
  // (the brief's "middle-right" player seat) lands at ~76deg, matching the
  // brief's "~77deg" (world x = cos(a)*r is then slightly POSITIVE there,
  // i.e. just right of dead-center -- verified against the two "middle"
  // seats index2 (~104deg, x<0) and index3 (~76deg, x>0)).
  function seatAngle(i) {
    return (SEAT_ANGLE_START - i * SEAT_ANGLE_STEP) * Math.PI / 180;
  }
  function seatXZ(i, r = SEAT_R) {
    const a = seatAngle(i);
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  function cardPos(base, idx) {
    return [base[0] + idx * FAN_DX, base[1], base[2]];
  }

  // Reveal the hole card: rotation.x stays fixed at -PI/2 throughout (never
  // touched), so the existing userData.flip() (which only ever tweens
  // rotation.y) sweeps the flat card face-down -> up-on-edge -> face-up in
  // place -- verified empirically against real THREE.js output (see report).
  // Layered on top: a brief lift (+0.05 y, up then back down) purely as a
  // cheap visual flourish; it doesn't touch rotation and can't affect where
  // the card ends up.
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

  // ---------- betting overlay ----------
  function makeOverlay(onDeal) {
    const bets = { main: 0, perfectPair: 0, twentyOnePlusThree: 0 };
    const history = [];
    let selectedDenom = 100;

    const root = document.createElement('div');
    root.className = 'bet-overlay';
    const panel = document.createElement('div');
    panel.className = 'bet-panel';
    root.appendChild(panel);

    const title = document.createElement('div');
    title.className = 'bet-title';
    title.textContent = 'BLACKJACK — PLACE YOUR BETS';
    panel.appendChild(title);

    const circles = document.createElement('div');
    circles.className = 'bj-circles';
    panel.appendChild(circles);

    function makeCircle(id, label, cls) {
      const el = document.createElement('div');
      el.className = 'bj-circle ' + cls;
      el.dataset.spot = id;
      el.textContent = label;
      el.addEventListener('click', () => placeBet(id));
      circles.appendChild(el);
    }
    makeCircle('perfectPair', 'PERFECT PAIR', 'side');
    makeCircle('main', 'MAIN', 'main');
    makeCircle('twentyOnePlusThree', '21+3', 'side');

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
      bets.main = 0; bets.perfectPair = 0; bets.twentyOnePlusThree = 0;
      history.length = 0;
      refresh();
    });
    dealBtn.addEventListener('click', () => {
      if (dealBtn.disabled) return;
      // Disable synchronously, before any async work -- same re-entrancy guard
      // as roulette's SPIN button (see roulette.js): CSS (hidden-down) is the
      // primary defense once the overlay flies away, but nothing else stops a
      // second click from firing onDeal (and wallet.debit) again with the
      // SAME bets while the first round is still in flight.
      dealBtn.disabled = true;
      onDeal({ ...bets });
    });

    function refresh() {
      circles.querySelectorAll('.bj-circle').forEach((el) => {
        const amt = bets[el.dataset.spot] || 0;
        let badge = el.querySelector('.badge');
        if (amt > 0) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; el.appendChild(badge); }
          badge.textContent = amt.toLocaleString();
        } else if (badge) {
          badge.remove();
        }
      });
      const v = C.validate.blackjack(bets);
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
      bets.main = 0; bets.perfectPair = 0; bets.twentyOnePlusThree = 0;
      history.length = 0;
      refresh();
    }

    return { el: root, resetBets };
  }

  // ---------- room ----------
  let dealerHook = null;
  let ui = null;
  let actionsEl = null;
  let dealtMeshes = [];

  function disposeMesh(mesh) {
    mesh.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if (!m) return; m.map?.dispose(); m.dispose(); });
    });
  }

  C.rooms.blackjack = {
    title: 'BLACKJACK',

    enter(app) {
      const A = C.assets, O = C.outcomes;
      const scene = app.scene;
      const gen = app.roomGen;
      dealtMeshes = [];
      actionsEl = null;

      scene.add(A.makeRoomShell({
        w: 12, d: 12, h: 4.5, wallColor: '#3a2418',
        ceilingColor: '#20140c', coveEmissiveIntensity: 0.22,
        ambientIntensity: 0.17, p1Intensity: 0.42, p2Intensity: 0.32, pointDistance: 9,
      }));

      // half-cylinder skirt (solid support under the felt) -- CylinderGeometry's
      // own theta convention (x=r*cos(theta), z=r*sin(theta), no extra rotation
      // needed) already bulges toward +Z for thetaStart=0/thetaLength=PI,
      // matching the felt/rim/seats convention below. Verified empirically.
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(TABLE_R, TABLE_R, RAIL_H, 32, 1, false, 0, Math.PI),
        A.woodMaterial('#241408'),
      );
      skirt.position.y = RAIL_H / 2;
      skirt.castShadow = true; skirt.receiveShadow = true;
      scene.add(skirt);

      // felt half-disc: thetaStart=PI/thetaLength=PI + rotation.x=-PI/2 lands
      // the arc on the +Z side (seat side) with the face normal pointing up --
      // verified empirically against real THREE.js output (see report); the
      // "obvious" thetaStart=0 + rotation.x=-PI/2 combo instead bulges -Z
      // (dealer side) or points its face down, depending on which sign you pick.
      const felt = new THREE.Mesh(
        new THREE.CircleGeometry(TABLE_R, 48, Math.PI, Math.PI),
        new THREE.MeshStandardMaterial({ color: '#0b5d3b', roughness: 0.92 }),
      );
      felt.rotation.x = -Math.PI / 2;
      felt.position.y = FELT_Y;
      felt.receiveShadow = true;
      scene.add(felt);

      // wood rim: half-torus, arc=PI with rotation.x=+PI/2 traces the SAME
      // physical arc as the felt (verified empirically) -- no thetaStart
      // shift needed here since TorusGeometry has no such parameter.
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(TABLE_R, 0.05, 10, 48, Math.PI),
        A.woodMaterial('#3a2214'),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = FELT_Y;
      rim.castShadow = true; rim.receiveShadow = true;
      scene.add(rim);

      // dealer (default pose already faces +Z, i.e. toward the table/camera)
      const dealer = A.makeDealer();
      dealer.position.set(0, 0, -1.3);
      scene.add(dealer);
      dealerHook = dealer.userData.idle(app);

      // card shoe: angled black box with a gold trim lip
      const shoeGroup = new THREE.Group();
      const shoeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.16, 0.22),
        new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.3 }),
      );
      shoeBody.rotation.x = -0.35; // tilt so the dealing edge angles up, like a real card shoe
      shoeBody.castShadow = true; shoeBody.receiveShadow = true;
      shoeGroup.add(shoeBody);
      const shoeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), A.goldMaterial());
      shoeTrim.rotation.x = -0.35;
      shoeTrim.position.y = 0.09;
      shoeGroup.add(shoeTrim);
      shoeGroup.position.set(...SHOE_POS);
      scene.add(shoeGroup);

      // 6 stools on the arc; seats 1 and 5 get ghost occupant props (a chip
      // stack + a face-down card, pulled inward onto the felt). Seat index 3
      // (~76deg, "middle-right") is the player's own seat -- reserved, no props.
      for (let i = 0; i < SEAT_COUNT; i++) {
        const stool = A.makeStool();
        const [x, z] = seatXZ(i);
        stool.position.set(x, 0, z);
        scene.add(stool);
      }
      GHOST_SEATS.forEach((i) => {
        const a = seatAngle(i);
        const chips = A.makeChipStack(500, 4);
        chips.position.set(Math.cos(a) * GHOST_R, FELT_Y + 0.02, Math.sin(a) * GHOST_R);
        scene.add(chips);
        const card = A.makeCard(null);
        card.rotation.x = -Math.PI / 2;
        const cardR = GHOST_R - 0.2;
        card.position.set(Math.cos(a) * cardR, FELT_Y + 0.015, Math.sin(a) * cardR);
        scene.add(card);
      });

      // plaque
      const plaque = A.makePlaque(['BLACKJACK', 'MAIN 500 – 10,000', 'SIDES 100 – 2,500']);
      plaque.position.set(-1.9, 0, -0.4);
      scene.add(plaque);

      // focused table spotlight (no shadow cast, matches roulette's convention)
      const spot = new THREE.SpotLight(0xfff2d0, 0.9, 8, Math.PI / 5, 0.4, 1.2);
      spot.position.set(0, 3.2, 0.2);
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
      let bets = null, shoe = null, playerHand = [], dealerHand = [], ppRet = 0, tptRet = 0;

      function showActions() {
        actionsEl = document.createElement('div');
        actionsEl.id = 'bj-actions';
        const totalEl = document.createElement('span');
        totalEl.className = 'total';
        const hitBtn = document.createElement('button');
        hitBtn.className = 'btn-gold'; hitBtn.textContent = 'HIT';
        const standBtn = document.createElement('button');
        standBtn.className = 'btn-dim'; standBtn.textContent = 'STAND';
        actionsEl.append(totalEl, hitBtn, standBtn);
        document.body.appendChild(actionsEl);

        function updateTotal() {
          const v = O.handValue(playerHand.map((h) => h.card));
          totalEl.textContent = 'YOUR HAND: ' + v.total + (v.soft ? ' (soft)' : '');
        }
        updateTotal();

        let acting = false; // synchronous re-entrancy guard, mirrors DEAL/SPIN
        hitBtn.addEventListener('click', async () => {
          if (acting) return;
          acting = true;
          hitBtn.disabled = true; standBtn.disabled = true;
          const card = shoe.pop();
          const mesh = A.makeCard(card);
          mesh.rotation.x = -Math.PI / 2; // lie flat, face up
          const idx = playerHand.length;
          playerHand.push({ card, mesh });
          dealtMeshes.push(mesh);
          await A.dealCardTo(app, mesh, SHOE_POS, cardPos(PLAYER_BASE, idx), { ms: 420 });
          if (app.roomGen !== gen) return;
          const v = O.handValue(playerHand.map((h) => h.card));
          if (v.total > 21) {
            hideActions();
            await settle();
            return;
          }
          updateTotal();
          acting = false;
          hitBtn.disabled = false; standBtn.disabled = false;
        });
        standBtn.addEventListener('click', async () => {
          if (acting) return;
          acting = true;
          hitBtn.disabled = true; standBtn.disabled = true;
          hideActions();
          await resolveDealer();
        });
      }
      function hideActions() {
        if (actionsEl) { actionsEl.remove(); actionsEl = null; }
      }

      async function dealInitial() {
        const pc1 = shoe.pop(), dc1 = shoe.pop(), pc2 = shoe.pop(), dc2 = shoe.pop();
        const pm1 = A.makeCard(pc1), dm1 = A.makeCard(dc1), pm2 = A.makeCard(pc2), dm2 = A.makeCard(dc2);
        // lie flat on the felt, face up -- same rotation.x used by the static
        // ghost cards (verified empirically: rotation.x=-PI/2 alone puts the
        // face-mesh normal at world (0,1,0), matching the felt's own "up").
        [pm1, dm1, pm2, dm2].forEach((m) => { m.rotation.x = -Math.PI / 2; });
        dm2.rotation.y = Math.PI; // hole card: dealt face-down (still flat), revealed later via .flip()

        playerHand.push({ card: pc1, mesh: pm1 }, { card: pc2, mesh: pm2 });
        dealerHand.push({ card: dc1, mesh: dm1 }, { card: dc2, mesh: dm2 });
        dealtMeshes.push(pm1, dm1, pm2, dm2);

        const ms = 420, stagger = 320;
        await Promise.all([
          A.dealCardTo(app, pm1, SHOE_POS, cardPos(PLAYER_BASE, 0), { ms, delay: 0 }),
          A.dealCardTo(app, dm1, SHOE_POS, cardPos(DEALER_BASE, 0), { ms, delay: stagger }),
          A.dealCardTo(app, pm2, SHOE_POS, cardPos(PLAYER_BASE, 1), { ms, delay: stagger * 2 }),
          A.dealCardTo(app, dm2, SHOE_POS, cardPos(DEALER_BASE, 1), { ms, delay: stagger * 3 }),
        ]);
      }

      async function resolveDealer() {
        await flipFlatCard(dealerHand[1].mesh, 350);
        if (app.roomGen !== gen) return;

        const dealerRaw = dealerHand.map((h) => h.card);
        const before = dealerRaw.length;
        O.dealerPlay(dealerRaw, shoe);
        const newCards = dealerRaw.slice(before);
        const flights = newCards.map((card, i) => {
          const mesh = A.makeCard(card);
          mesh.rotation.x = -Math.PI / 2; // lie flat, face up
          dealerHand.push({ card, mesh });
          dealtMeshes.push(mesh);
          return A.dealCardTo(app, mesh, SHOE_POS, cardPos(DEALER_BASE, before + i), { ms: 420, delay: i * 500 });
        });
        await Promise.all(flights);
        if (app.roomGen !== gen) return;

        await settle();
      }

      async function settle() {
        const playerRaw = playerHand.map((h) => h.card);
        const dealerRaw = dealerHand.map((h) => h.card);
        const ret = O.settleBlackjack({ main: bets.main }, playerRaw, dealerRaw) + ppRet + tptRet;
        if (ret > 0) C.wallet.credit(ret);

        const p = O.handValue(playerRaw), d = O.handValue(dealerRaw);
        const pBJ = playerRaw.length === 2 && p.total === 21;
        const dBJ = dealerRaw.length === 2 && d.total === 21;
        let title;
        if (p.total > 21) title = 'BUST';
        else if (pBJ && dBJ) title = 'PUSH';
        else if (pBJ) title = 'BLACKJACK!';
        else if (dBJ) title = 'DEALER WINS';
        else if (d.total > 21 || p.total > d.total) title = 'YOU WIN';
        else if (p.total === d.total) title = 'PUSH';
        else title = 'DEALER WINS';

        const sideWins = [];
        if (ppRet > 0) sideWins.push('Perfect Pair +' + ppRet.toLocaleString());
        if (tptRet > 0) sideWins.push('21+3 +' + tptRet.toLocaleString());
        const sub = (ret > 0 ? 'You win ' + ret.toLocaleString() : 'No win') +
          (sideWins.length ? ' — ' + sideWins.join(', ') : '');

        hideActions();
        await app.banner(title, sub);
        if (app.roomGen !== gen) return;

        dealtMeshes.forEach((m) => { app.scene.remove(m); disposeMesh(m); });
        dealtMeshes = [];
        app.flyTo(POSE_SEAT, 900);
        ui.resetBets();
        ui.el.classList.remove('hidden-down');
      }

      async function startRound(betsSnapshot) {
        const v = C.validate.blackjack(betsSnapshot);
        if (!v.ok) return;                       // DEAL is disabled otherwise; defensive guard
        if (!C.wallet.debit(v.total)) return;     // defensive; validate already checked balance

        bets = betsSnapshot;
        shoe = O.makeShoe(6);
        playerHand = []; dealerHand = [];

        ui.el.classList.add('hidden-down');
        app.flyTo(POSE_DEAL, 800);

        await dealInitial();
        if (app.roomGen !== gen) return;          // room exited mid-deal

        const p1 = playerHand[0].card, p2 = playerHand[1].card, dUp = dealerHand[0].card;
        ppRet = O.perfectPairReturn(bets.perfectPair, [p1, p2]);
        tptRet = O.twentyOnePlusThreeReturn(bets.twentyOnePlusThree, p1, p2, dUp);

        const playerBJ = O.handValue([p1, p2]).total === 21;
        if (playerBJ) {
          await resolveDealer();
          return;
        }

        showActions();
      }
    },

    exit() {
      if (dealerHook) { C.app.offFrame(dealerHook); dealerHook = null; }
      if (actionsEl) { actionsEl.remove(); actionsEl = null; }
      dealtMeshes = [];
      ui = null;
    },
  };
})();
