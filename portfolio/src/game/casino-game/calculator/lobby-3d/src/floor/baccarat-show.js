(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  // Ambient baccarat show: when the player stands near a baccarat table, its
  // dealer runs real rounds — deal, flip, third-card rules, announce, settle
  // ghost bets, update the roads board. Pure round logic = C.baccaratRoads.
  // Visual only; pauses (after finishing the round) when the player leaves.
  // When the draw index crosses the yellow cut card the dealer performs the
  // full shuffle ritual (runShuffle) and the roads board wipes for a new shoe.
  const NEAR = 9, CHECK_EVERY = 0.8;
  const BRICK_H = 0.06;   // one "deck brick" ≈ 52 cards

  // Shared ritual props, cached across tables: 416 real card meshes would
  // blow the frame budget, so the bulk of the shoe travels as deck bricks and
  // only the detail riffle uses real (cloned, material-sharing) cards.
  let brickShared = null, cardBackProto = null;
  const brickAssets = () => {
    if (brickShared) return brickShared;
    const edge = C.assets.canvasTexture(128, 64, (ctx) => {
      ctx.fillStyle = '#efece0'; ctx.fillRect(0, 0, 128, 64);
      ctx.strokeStyle = 'rgba(125,118,100,0.55)'; ctx.lineWidth = 1;
      for (let y = 2; y < 64; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
    });
    const side = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.7 });
    const top = new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.55 });
    brickShared = {
      geo: new THREE.BoxGeometry(C.layouts.CARD_W, BRICK_H, C.layouts.CARD_H),
      mats: [side, side, top, side, side, side],
    };
    return brickShared;
  };
  const makeBrick = () => {
    const m = new THREE.Mesh(brickAssets().geo, brickAssets().mats);
    m.castShadow = true;
    return m;
  };
  // clone() shares geometry + materials with the proto (never scene-added);
  // clones must NOT go through disposeMesh — removeMesh only
  const makeBackCard = () => {
    if (!cardBackProto) cardBackProto = C.cards.makeCard(null);
    return cardBackProto.clone();
  };
  const removeMesh = (m) => { m.parent && m.parent.remove(m); };

  C.floor.attachBaccaratShow = (group) => {
    const bac = group.userData.bac;
    if (!bac || !bac.dealerRig || C.app.REDUCED) return;
    const app = C.app, L = bac.L;
    const toW = (p) => group.localToWorld(new THREE.Vector3(p[0], p[1], p[2])).toArray();
    const rig = bac.dealerRig;
    let running = false, wantRun = false, t = 0;
    let shoe = C.baccaratRoads.buildShoe(Math.random), si = 0;
    let cutIndex = C.baccaratRoads.pickCutIndex(Math.random);
    const draw = () => {
      // safety net only — the cut card (72-96) fires long before this
      if (si > shoe.length - 8) { shoe = C.baccaratRoads.buildShoe(Math.random); si = 0; }
      return shoe[si++];
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const tweenPos = (obj, [x, y, z], ms, ease = 'inOutCubic') =>
      new Promise((res) => C.tween.to(obj.position, { x, y, z }, ms, ease, res));
    const disposeMesh = (m) => {
      m.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((mm) => { if (!mm) return; mm.map?.dispose(); mm.dispose(); });
      });
      m.parent && m.parent.remove(m);
    };

    // Deal a card FROM the dealer's actual hand at the IK path's `release`
    // waypoint, instead of flying it from the static shoe point while the
    // hand is elsewhere. `rigToLocal` lets the rig's aim ref differ slightly
    // from the card's own landing spot (a couple of the ritual sites aim the
    // hand at table height while the card itself settles a few mm above the
    // felt) — defaults to `toLocal` for the common case where they're the
    // same point.
    //
    // Fallback (mandatory, not optional): playPath's promise always
    // resolves — even when the path is superseded/cancelled mid-flight —
    // but a superseded path NEVER fires its remaining waypoint events. If
    // `release` doesn't fire before `rig.play` resolves, the card would
    // otherwise never leave the shoe. `fired` tracks whether the callback
    // ran; if not, deal from the static from/to exactly like the
    // procedural-rig branch below.
    //
    // Second fallback layer: when the procedural rig is still active (GLB
    // failed to load), `play` silently ignores `on` altogether — so that
    // whole branch is skipped in favour of the original fire-and-forget
    // rig.play + dealCardTo pairing.
    const dealVia = (mesh, fromLocal, toLocal, opts = {}, rigToLocal = toLocal) => {
      const from = toW(fromLocal), to = toW(toLocal), rigTo = toW(rigToLocal);
      if (C.character.ready === 'ready') {
        return new Promise((resolve) => {
          let fired = false;
          const playDone = rig.play(app, 'dealCard', {
            refs: { shoe: from, target: rigTo },
            on: { release: (h) => {
              fired = true;
              resolve(C.cards.dealCardTo(app, mesh, [h.x, h.y, h.z], to, opts));
            } },
          });
          playDone.then(() => {
            if (!fired) resolve(C.cards.dealCardTo(app, mesh, from, to, opts));
          });
        });
      }
      rig.play(app, 'dealCard', { refs: { shoe: from, target: rigTo } });
      return C.cards.dealCardTo(app, mesh, from, to, opts);
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
        // eslint-disable-next-line no-await-in-loop
        await dealVia(mesh, L.shoePos, slot, { ms: 430 });
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
        // eslint-disable-next-line no-await-in-loop
        await dealVia(mesh, L.shoePos, slot, { ms: 430 });
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

    // Shuffle ritual (~80s): yellow cut card out → board splash → all cards
    // out as deck bricks → two-arm wash → detail riffle of ~1/20 of the shoe
    // as real cards → restack with the cut card inside → back into the shoe
    // → burn card → board wiped for the new shoe. Runs to completion once
    // started (like a real casino), even if the player wanders off.
    async function runShuffle() {
      const gen = app.roomGen;
      const alive = () => app.roomGen === gen;
      const feltY = bac.feltY;
      const owned = [];                        // cut + burn cards: dispose fully
      const shared = [];                       // bricks + riffle cards: remove only
      const STACK = [-0.42, feltY, 0.10];      // where the shoe rebuilds
      let trackHook = null;                    // Task 8: wash's hand-tracking frame hook, if installed
      try {
        // A) the yellow cut card comes out of the shoe
        rig.say(app, '黃牌到 Cut card — 洗牌 shuffle', { ms: 3200 });
        const cut = C.cards.makeCutCard();
        cut.rotation.set(-Math.PI / 2, 0, 0.25);
        owned.push(cut);
        await dealVia(cut, L.shoePos, [0, feltY + 0.008, 0.06], { ms: 560 }, [0, feltY, 0.06]);
        await wait(1100);
        bac.setShuffling(true);
        await wait(1100);
        if (!alive()) return;

        // B) every card comes out: 8 deck bricks fly into two piles
        const bricks = [];
        for (let i = 0; i < 8; i++) {
          const from = i < 4 ? L.shoePos : L.discardPos;
          const to = [(i % 2 ? -0.3 : 0.3) + (Math.random() - 0.5) * 0.05,
            feltY + BRICK_H / 2 + Math.floor(i / 2) * (BRICK_H + 0.004),
            0.12 + (Math.random() - 0.5) * 0.05];
          const b = makeBrick();
          b.position.set(...toW(from));
          app.scene.add(b);
          bricks.push(b); shared.push(b);
          rig.play(app, 'dealCard', { refs: { shoe: toW(from), target: toW(to) } });
          // eslint-disable-next-line no-await-in-loop
          await tweenPos(b, toW(to), 480);
          // eslint-disable-next-line no-await-in-loop
          await wait(200);
        }
        if (!alive()) return;

        // C) the wash: bricks smear around the felt under circling arms. The
        // wash target [0, feltY, 0.12] is the same z-center step B's fly-out
        // and the random smear below already use, so the IK hand-path (which
        // now orbits around this ref — hand-paths.js washCards) circles the
        // same patch of felt the cards have always washed over.
        const WASH_TARGET = toW([0, feltY, 0.12]);
        await Promise.all(bricks.map((b, i) => tweenPos(b,
          toW([(Math.random() - 0.5) * 0.7, feltY + BRICK_H / 2 + i * 0.0012, 0.12 + (Math.random() - 0.5) * 0.3]), 450)));
        let washing = true;
        // When the GLB dealer's real palms are available, each brick
        // (alternating L/R) eases toward that hand's ACTUAL current world
        // position every frame — washCards' own circular IK path does the
        // swirling, so the cards genuinely track under the palms instead of
        // roaming to independent random points. handWorld also resolves for
        // the procedural rig (joints.wrist* fallback), but that rig's
        // washCards is a fixed euler clip that never actually reaches the
        // felt, so tracking it would look wrong — gate on character.ready
        // so the procedural fallback stays pixel-identical to before.
        const trackingHands = C.character?.ready === 'ready' && !!rig.handWorld('L') && !!rig.handWorld('R');
        if (trackingHands) {
          // fixed per-brick offset from its tracked palm (show-local
          // meters) — same spread magnitude as the old random smear, now
          // anchored to a moving hand instead of a random felt point.
          const offsets = bricks.map((_, i) => new THREE.Vector3(
            (Math.random() - 0.5) * 0.14, BRICK_H / 2 + i * 0.0012, (Math.random() - 0.5) * 0.14));
          trackHook = () => {
            if (!washing || !alive()) { app.offFrame(trackHook); return; }
            // Hoisted out of the per-brick loop: 2 calls/frame, not 8.
            const handL = rig.handWorld('L');
            const handR = rig.handWorld('R');
            bricks.forEach((b, i) => {
              const handP = i % 2 === 0 ? handL : handR;
              if (!handP) return;   // transient miss — leave the brick where it is this frame
              // `b`'s parent is app.scene (world space) — handP is already
              // world-space too (rig.handWorld reads the palm bone's
              // getWorldPosition). offsets[i] is authored in show-local
              // (table-facing) meters, the same frame every other position
              // in this file uses (see toW() above), so it has to be rotated
              // into world space before landing on a world-space brick: a
              // worldToLocal with no return trip left the brick parked at
              // table-LOCAL coordinates while living in a world-space
              // parent, so it flew off toward whatever unrelated world point
              // happened to share those numbers. Round-tripping through
              // localToWorld(worldToLocal(...).add(offset)) rotates+adds the
              // offset in table space, then converts the result back to
              // world space, landing a few cm around the CURRENT palm.
              b.position.lerp(group.localToWorld(group.worldToLocal(handP.clone()).add(offsets[i])), 0.16);
            });
          };
          app.onFrame(trackHook);
        }
        const swirls = trackingHands ? [] : bricks.map(async (b, i) => {
          while (washing && alive()) {
            // eslint-disable-next-line no-await-in-loop
            await tweenPos(b, toW([
              (Math.random() - 0.5) * 0.72,
              feltY + BRICK_H / 2 + i * 0.0012,
              0.12 + (Math.random() - 0.5) * 0.34,
            ]), 620 + Math.random() * 480);
          }
        });
        for (let k = 0; k < 14 && alive(); k++) {
          // eslint-disable-next-line no-await-in-loop
          await rig.play(app, 'washCards', { refs: { target: WASH_TARGET } });
        }
        washing = false;
        if (trackHook) { app.offFrame(trackHook); trackHook = null; }
        await Promise.all(swirls);
        await rig.play(app, 'armsRest');
        if (!alive()) return;

        // D) square up into one stack, then the detail riffle: ~1/20 of the
        // shoe as real cards, split + interleaved one card at a time, ×4
        for (let i = 0; i < bricks.length; i++) {
          // eslint-disable-next-line no-await-in-loop
          await tweenPos(bricks[i], toW([STACK[0], feltY + BRICK_H / 2 + i * (BRICK_H + 0.003), STACK[2]]), 280);
        }
        const SPOT = [0.16, feltY, 0.10];
        const stackTopY = feltY + 8 * (BRICK_H + 0.003);
        const N = Math.round(shoe.length / 20);
        let cards = [];
        for (let i = 0; i < N; i++) {
          const cm = makeBackCard();
          cm.rotation.set(-Math.PI / 2, 0, (Math.random() - 0.5) * 0.12);
          cm.position.set(...toW([STACK[0], stackTopY + 0.02, STACK[2]]));
          app.scene.add(cm);
          cards.push(cm); shared.push(cm);
          tweenPos(cm, toW([SPOT[0], feltY + 0.006 + i * 0.0022, SPOT[2]]), 320, 'outCubic');
          // eslint-disable-next-line no-await-in-loop
          await wait(65);
        }
        await wait(400);
        let riffling = true;
        // riffleT0 marks the start of the CURRENT shuffleRiffle play — the
        // interleave loop below reads it to time each pass's card drops to
        // THIS cycle's own L-lift (at:0.45) / R-lift (at:0.70) waypoints
        // (hand-paths.js), so the cascade lands in sync with the hands
        // instead of running on its own unrelated clock.
        let riffleT0 = performance.now();
        const rigLoop = (async () => {
          while (riffling && alive()) {
            riffleT0 = performance.now();
            // eslint-disable-next-line no-await-in-loop
            await rig.play(app, 'shuffleRiffle', { refs: { target: toW(SPOT) } });
          }
        })();
        const RIFFLE_CYCLE = 1100, L_BEAT = RIFFLE_CYCLE * 0.45, R_BEAT = RIFFLE_CYCLE * 0.70;
        for (let pass = 0; pass < 4 && alive(); pass++) {
          const half = Math.ceil(cards.length / 2);
          // split into two packets…
          // eslint-disable-next-line no-await-in-loop
          await Promise.all(cards.map((cm, i) => {
            const left = i < half;
            const lvl = left ? i : i - half;
            return tweenPos(cm, toW([
              SPOT[0] + (left ? -0.13 : 0.13) + (Math.random() - 0.5) * 0.015,
              feltY + 0.006 + lvl * 0.0022,
              SPOT[2] + (Math.random() - 0.5) * 0.015,
            ]), 360, 'outCubic');
          }));
          // eslint-disable-next-line no-await-in-loop
          await wait(240);
          // …then interleave back into one pile in TWO bursts — left-origin
          // and right-origin cards (order[] already alternates them) — timed
          // to this riffle cycle's L-lift and R-lift beats, instead of one
          // flat per-card cadence. Same per-card position jitter as before.
          const order = [];
          for (let i = 0; i < half; i++) {
            order.push(cards[i]);
            if (half + i < cards.length) order.push(cards[half + i]);
          }
          const phase = (performance.now() - riffleT0) % RIFFLE_CYCLE;
          const delayTo = (beat) => ((beat - phase) % RIFFLE_CYCLE + RIFFLE_CYCLE) % RIFFLE_CYCLE;
          const dropBurst = async (side, beat) => {
            await wait(delayTo(beat));
            if (!alive()) return;
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(order
              .map((cm, i) => ({ cm, i, side: i % 2 === 0 ? 'L' : 'R' }))
              .filter((d) => d.side === side)
              .map(({ cm, i }) => tweenPos(cm, toW([
                SPOT[0] + (Math.random() - 0.5) * 0.01,
                feltY + 0.006 + i * 0.0022,
                SPOT[2] + (Math.random() - 0.5) * 0.01,
              ]), 160, 'outCubic')));
          };
          // eslint-disable-next-line no-await-in-loop
          await Promise.all([dropBurst('L', L_BEAT), dropBurst('R', R_BEAT)]);
          cards = order;
          // eslint-disable-next-line no-await-in-loop
          await wait(320);
        }
        riffling = false;
        await rigLoop;
        await rig.play(app, 'armsRest');
        if (!alive()) return;

        // E) riffled packet rejoins the stack; cut card goes in mid-stack;
        // the stack loads back into the shoe; burn the new shoe's first card
        for (let i = 0; i < cards.length; i++) {
          tweenPos(cards[i], toW([STACK[0], stackTopY + 0.01 + i * 0.0022, STACK[2]]), 300);
          // eslint-disable-next-line no-await-in-loop
          await wait(35);
        }
        await wait(450);
        cards.forEach(removeMesh);
        rig.say(app, '插黃牌 Cut card in', { ms: 2000 });
        rig.play(app, 'dealCard', { refs: { shoe: toW([0, feltY, 0.06]), target: toW(STACK) } });
        await tweenPos(cut, toW([STACK[0], feltY + 4 * (BRICK_H + 0.003), STACK[2]]), 550);
        await wait(500);
        for (let i = bricks.length - 1; i >= 0; i--) {
          rig.play(app, 'dealCard', { refs: { shoe: toW(STACK), target: toW(L.shoePos) } });
          // eslint-disable-next-line no-await-in-loop
          await tweenPos(bricks[i], toW(L.shoePos), 320);
          removeMesh(bricks[i]);
          if (i === 4) {                        // the cut card rides in mid-stack
            // eslint-disable-next-line no-await-in-loop
            await tweenPos(cut, toW(L.shoePos), 320);
            disposeMesh(cut);
          }
          // eslint-disable-next-line no-await-in-loop
          await wait(110);
        }
        // fresh shoe BEFORE the burn so the burn card is genuinely its first
        shoe = C.baccaratRoads.buildShoe(Math.random);
        si = 0;
        cutIndex = C.baccaratRoads.pickCutIndex(Math.random);
        const burn = C.cards.makeCard(draw());
        burn.rotation.set(-Math.PI / 2, 0, 0);
        owned.push(burn);
        await dealVia(burn, L.shoePos, [0, feltY + 0.008, -0.14], { ms: 460 }, [0, feltY, -0.14]);
        await wait(900);
        await tweenPos(burn, toW(L.discardPos), 360);
        disposeMesh(burn);

        // F) fresh board, back to dealing
        bac.resetBoard();
        rig.say(app, '新靴開始 New shoe — good luck', { ms: 2600 });
        rig.play(app, 'nod');
        await wait(1500);
      } finally {
        // normal end: everything is already off the felt (removeMesh/dispose
        // are no-ops on orphans). Early bail: this sweeps up the leftovers.
        if (trackHook) app.offFrame(trackHook);
        shared.forEach(removeMesh);
        owned.forEach((m) => m.parent && disposeMesh(m));
      }
    }

    async function loop() {
      running = true;
      while (wantRun) {
        const act = si >= cutIndex ? runShuffle : runRound;
        // eslint-disable-next-line no-await-in-loop
        await act().catch((err) => {
          console.error('[bac-show]', err);
          // backoff so a rejection before the first await can never
          // hot-spin the loop and starve the frame budget
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
