(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Ambient baccarat show: when the player stands near a baccarat table, its
  // dealer runs real rounds — deal, flip, third-card rules, announce, settle
  // ghost bets, update the roads board. Pure round logic = C.baccaratRoads.
  // Visual only; pauses (after finishing the round) when the player leaves.
  const NEAR = 9, CHECK_EVERY = 0.8;

  C.floor.attachBaccaratShow = (group) => {
    const bac = group.userData.bac;
    if (!bac || !bac.dealerRig || C.app.REDUCED) return;
    const app = C.app, L = bac.L;
    const toW = (p) => group.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();
    const rig = bac.dealerRig;
    let running = false, wantRun = false, t = 0, cleared = false;
    let shoe = C.baccaratRoads.buildShoe(Math.random), si = 0;
    const draw = () => {
      if (si > shoe.length - 8) { shoe = C.baccaratRoads.buildShoe(Math.random); si = 0; }
      return shoe[si++];
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const disposeMesh = (m) => {
      m.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((mm) => { if (!mm) return; mm.map?.dispose(); mm.dispose(); });
      });
      m.parent && m.parent.remove(m);
    };

    async function runRound() {
      const round = C.baccaratRoads.playRound(draw);
      const dealt = [];
      // ghost bets: 2 random seats, biased to the round for a lively board
      const kinds = ['player', 'banker', round.outcome === 'T' ? 'tie' : 'banker'];
      const betStacks = [];
      for (let k = 0; k < 2; k++) {
        const seat = Math.floor(Math.random() * 6);
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const [bx, bz] = L.seatSpot(seat, kind);
        const stk = C.chips.makeChipStack([100, 500][k % 2], 3 + (seat % 3));
        stk.position.set(bx, bac.feltY + 0.005, bz);
        group.add(stk);
        betStacks.push({ stk, kind });
      }
      // deal P1 B1 P2 B2 face-down, alternating (cards pre-decided by playRound)
      const seq = [
        [L.playerSlots[0], round.playerCards[0]], [L.bankerSlots[0], round.bankerCards[0]],
        [L.playerSlots[1], round.playerCards[1]], [L.bankerSlots[1], round.bankerCards[1]],
      ];
      for (const [slot, cardDef] of seq) {
        const mesh = C.cards.makeCard(cardDef);
        mesh.rotation.set(-Math.PI / 2, 0, 0);
        mesh.rotateY(Math.PI);                    // face-down
        dealt.push(mesh);
        rig.play(app, 'dealCard', { refs: { shoe: toW(L.shoePos), target: toW(slot) } });
        // eslint-disable-next-line no-await-in-loop
        await C.cards.dealCardTo(app, mesh, toW(L.shoePos), toW(slot), { ms: 430 });
        // eslint-disable-next-line no-await-in-loop
        await wait(140);
      }
      // flip player then banker
      await C.cards.flipFlatCard(app, dealt[0], 320);
      await C.cards.flipFlatCard(app, dealt[2], 320);
      await C.cards.flipFlatCard(app, dealt[1], 320);
      await C.cards.flipFlatCard(app, dealt[3], 320);
      // third cards (sideways slot index 2), face-up
      const thirds = [[round.playerCards[2], L.playerSlots[2]], [round.bankerCards[2], L.bankerSlots[2]]];
      for (const [cardDef, slot] of thirds) {
        if (!cardDef) continue;
        const mesh = C.cards.makeCard(cardDef);
        mesh.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
        dealt.push(mesh);
        rig.play(app, 'dealCard', { refs: { shoe: toW(L.shoePos), target: toW(slot) } });
        // eslint-disable-next-line no-await-in-loop
        await C.cards.dealCardTo(app, mesh, toW(L.shoePos), toW(slot), { ms: 430 });
        // eslint-disable-next-line no-await-in-loop
        await wait(200);
      }
      // announce + settle ghost bets
      const line = round.outcome === 'T'
        ? `和 TIE  ${round.playerTotal} : ${round.bankerTotal}`
        : round.outcome === 'P'
          ? `閒 PLAYER wins ${round.playerTotal} over ${round.bankerTotal}`
          : `庄 BANKER wins ${round.bankerTotal} over ${round.playerTotal}`;
      rig.say(app, line, { ms: 2400 });
      const wins = { P: 'player', B: 'banker', T: 'tie' }[round.outcome];
      const payStacks = [];   // reaped at cleanup — kept OUT of betStacks so the
                              // settle loop below never treats a payout as a bet
      for (const { stk, kind } of betStacks) {
        const won = kind === wins;
        rig.play(app, won ? 'payChips' : 'sweepChips', {
          refs: { rack: toW(L.rackPos), target: toW([stk.position.x, bac.feltY, stk.position.z]) },
        });
        if (won) {
          const pay = C.chips.makeChipStack(100, 3);
          pay.position.set(stk.position.x + 0.1, stk.position.y, stk.position.z);
          group.add(pay);
          payStacks.push(pay);
        } else {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) =>
            C.tween.to(stk.position, { x: L.rackPos[0], z: L.rackPos[2] }, 420, 'inOutCubic', res));
        }
        // eslint-disable-next-line no-await-in-loop
        await wait(260);
      }
      bac.pushRound(round);
      await wait(2000);
      // clear: cards to the discard tray, chips away
      const disc = toW(L.discardPos);
      await Promise.all(dealt.map((mesh, i) => new Promise((res) => {
        C.tween.to(mesh.position, { x: disc[0], y: disc[1] + 0.05 + i * 0.002, z: disc[2] }, 360, 'inOutCubic', res);
      })));
      dealt.forEach(disposeMesh);
      betStacks.forEach(({ stk }) => disposeMesh(stk));
      payStacks.forEach(disposeMesh);
      await wait(1200);
    }

    async function loop() {
      running = true;
      // first activation: clear the static ghost cards baked at build time
      if (!cleared) {
        cleared = true;
        bac.staticCards.forEach(disposeMesh);
        bac.staticCards.length = 0;
      }
      while (wantRun) {
        // eslint-disable-next-line no-await-in-loop
        await runRound().catch((err) => {
          console.error('[bac-show]', err);
          // backoff so a runRound that rejects before its first await can
          // never hot-spin the loop and starve the frame budget
          return wait(1500);
        });
      }
      running = false;
    }

    const hook = (dt) => {
      t += dt;
      if (t < CHECK_EVERY) return;
      t = 0;
      const p = app.player;
      wantRun = Math.hypot(p.x - group.position.x, p.z - group.position.z) < NEAR;
      if (wantRun && !running) loop();
    };
    app.onFrame(hook);
  };
})();
