(() => {
  const C = (globalThis.CASINO ??= {});
  // Baccarat has a compact two-hand service area in front of the chip bank.
  // Only cards travel to the outboard slots; the dealer never reaches across
  // their chest or drives a palm through the bank to reach those slots.
  const TRANSFER = [0, 0.945, -0.29];
  const RELEASE = [-0.12, 0.925, -0.28];

  async function deal(app, table, mesh, step, { durationScale = 1 } = {}) {
    const L = C.layouts.baccarat;
    const toWorld = (p) => table.localToWorld(new THREE.Vector3(...p)).toArray();
    const rig = table.userData.dealerRig;
    const gen = app.roomGen;
    mesh.rotation.set(-Math.PI / 2, Math.PI, 0);
    let revealed = false;
    const reveal = () => {
      if (revealed || app.roomGen !== gen) return;
      revealed = true;
      // The card turns in the receiving hand, above the clear service area.
      // A 21cm card turning here remains above the felt throughout the turn.
      mesh.userData.flip(app.REDUCED ? 0 : 220 * durationScale);
    };
    await C.cards.dealCardWithDealer(app, rig, mesh, toWorld(L.shoeMouth), toWorld(step.pos), {
      action: 'baccaratDeal', refs: { rack: toWorld(TRANSFER) },
      gestureMs: C.handPaths.PATHS.baccaratDeal.dur * durationScale,
      rigTarget: toWorld(RELEASE), onTransfer: reveal,
      rotationZ: step.sideways ? Math.PI / 2 : 0, fromRotationZ: 0, ms: 480 * durationScale,
    });
    if (app.roomGen === gen && !revealed) {
      // Reduced motion / missing character assets must still expose the card.
      mesh.rotation.y = 0;
    }
  }

  function rest(app, rig) { return rig?.play(app, 'baccaratRest') || Promise.resolve(); }

  // Collection uses the same compact service space. The hands stay behind
  // the display cards while those cards are squared into one discard packet.
  async function collect(app, table, cards) {
    if (!cards.length) return;
    const gen = app.roomGen, rig = table.userData.dealerRig;
    const toWorld = (p) => table.localToWorld(new THREE.Vector3(...p)).toArray();
    const pickup = toWorld(RELEASE), discard = toWorld(C.layouts.baccarat.discardPos);
    const packet = new THREE.Group();
    packet.position.set(...pickup); app.scene.add(packet);
    const carryPacket = () => C.cards.dealCardWithDealer(app, rig, packet, pickup,
      [discard[0], discard[1] + 0.029, discard[2]], {
        action: 'baccaratCollect', rigTarget: toWorld([-0.40, 0.925, -0.30]), ms: 420, spin: false,
      });
    try {
      const gathering = Promise.all(cards.map((mesh, index) => {
        mesh.rotation.z = 0;
        return C.cards.dealCardTo(app, mesh, mesh.position.toArray(),
          [pickup[0], pickup[1] + index * 0.0015, pickup[2]], { ms: 350, spin: false });
      }));
      // Reach while the cards gather, then grip the squared packet at 420ms.
      const carrying = app.REDUCED ? null : carryPacket();
      await gathering;
      if (app.roomGen !== gen) return;
      for (const mesh of cards) packet.attach(mesh);
      await (carrying || carryPacket());
      if (app.roomGen === gen) await rest(app, rig);
    } finally {
      packet.userData.cancelCardDeal?.(); packet.userData.cancelCardSlide?.();
      if (app.roomGen === gen) for (const mesh of [...packet.children]) app.scene.attach(mesh);
      packet.removeFromParent();
    }
  }

  // Far wagers travel on the cloth. The dealer's gathering / pushing action
  // is confined to the reachable bank edge, never aimed at a player's torso.
  async function settle(app, table, stack, won, amount) {
    const gen = app.roomGen;
    const L = C.layouts.baccarat, rig = table.userData.dealerRig;
    const toWorld = (p) => table.localToWorld(new THREE.Vector3(...p)).toArray();
    const service = [-0.12, L.feltY + 0.005, -0.28];
    const destination = [stack.position.x + 0.065, stack.position.y, stack.position.z];
    const moving = won ? new THREE.Group() : stack;
    if (won) {
      C.layouts.chipBreakdown(amount).forEach((value, index) => {
        const chip = C.chips.makeChip(value); chip.position.y = index * C.chips.CHIP_H; moving.add(chip);
      });
      moving.position.set(...service); table.add(moving);
    } else await C.chips.slideStack(app, moving, service, { ms: 520 });
    if (app.roomGen !== gen) { if (won) moving.removeFromParent(); return null; }
    const gesture = rig.play(app, 'baccaratCollect', {
      refs: { shoe: toWorld(RELEASE), target: toWorld(won ? [0.12, 0.925, -0.28] : [-0.30, 0.925, -0.31]) },
    });
    await C.chips.slideStack(app, moving, won ? destination : [L.rackPos[0], service[1], L.rackPos[2]], { ms: 600 });
    await gesture;
    if (app.roomGen === gen) await rest(app, rig);
    return won ? moving : null;
  }
  C.baccaratMotion = { deal, rest, collect, settle, TRANSFER, RELEASE };
})();
