/* Local model review uses the same builders and actions as the casino. */
(async () => {
  const C = globalThis.CASINO;
  const { betSpots } = await import('../roulette-map.js');
  const { planPlayerCard } = await import('../blackjack-live.js');
  const canvas = document.querySelector('#stage');
  const status = document.querySelector('#status');
  const run = document.querySelector('#run');
  const result = document.querySelector('#result');
  const collect = document.querySelector('#collect');
  document.querySelectorAll('[data-game], #run').forEach((button) => { button.disabled = true; });
  for (let n = 0; n <= 36; n++) result.add(new Option(String(n), String(n)));
  result.value = '17';
  THREE.ColorManagement.legacyMode = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#101619');
  scene.fog = new THREE.Fog('#101619', 12, 26);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
  const hooks = new Set();
  C.app = {
    scene, renderer, camera, roomGen: 1, REDUCED: matchMedia('(prefers-reduced-motion: reduce)').matches,
    IS_MOBILE: false, player: { x: 100, z: 100 },
    onFrame: (fn) => hooks.add(fn), offFrame: (fn) => hooks.delete(fn), addPickable() {},
  };
  scene.add(new THREE.HemisphereLight(0xdbe9ef, 0x554334, 0.8));
  const key = new THREE.DirectionalLight(0xffedcf, 1.3); key.position.set(-3, 6, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = key.shadow.camera.bottom = -6;
  key.shadow.camera.right = key.shadow.camera.top = 6; key.shadow.bias = -0.00015;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd7e6ff, 0.6); rim.position.set(3, 3, -4); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#192923', roughness: .9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.015; floor.receiveShadow = true; scene.add(floor);
  let table, game = 'blackjack', busy = false;
  const cards = [];
  const target = new THREE.Vector3(0, .9, .3);
  let yaw = 0.15, elevation = .48, distance = 5;
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05);
    for (const fn of [...hooks]) fn(dt, clock.elapsedTime);
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance, target.z + Math.cos(yaw) * Math.cos(elevation) * distance);
    camera.lookAt(target); renderer.render(scene, camera);
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => { drag = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    yaw -= (event.clientX - drag[0]) * .006;
    elevation = THREE.MathUtils.clamp(elevation + (event.clientY - drag[1]) * .004, .05, 1.53);
    drag = [event.clientX, event.clientY];
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => { event.preventDefault(); distance = THREE.MathUtils.clamp(distance + event.deltaY * .003, .7, 11); }, { passive: false });
  function setView(kind) {
    if (kind === 'wheel') { target.set(-2.35, .95, 0); yaw = .16; elevation = 1.1; distance = 2.9; }
    else if (kind === 'hands') { target.set(0, 1.04, -.23); yaw = .12; elevation = .65; distance = 2.65; }
    else if (kind === 'dealer') { target.set(game === 'roulette' ? -1.88 : 0, 1.25, game === 'baccarat' ? -1.08 : game === 'roulette' ? -1.1 : -.28); yaw = .12; elevation = .08; distance = 2; }
    else if (kind === 'overhead') { target.set(game === 'roulette' ? -1.1 : 0, .82, .12); yaw = 0; elevation = 1.49; distance = game === 'roulette' ? 6.6 : 4.6; }
    else { target.set(game === 'roulette' ? -.8 : 0, .9, .2); yaw = .16; elevation = .44; distance = game === 'roulette' ? 7.8 : 5.3; }
  }
  function disposeObject(object) {
    object.userData.cancelCardDeal?.(); object.userData.cancelCardSlide?.();
    object.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) { mat?.map?.dispose(); mat?.dispose(); }
    });
    object.removeFromParent();
  }
  function clearCards() { cards.splice(0).forEach(disposeObject); }
  function selectGame(next) {
    if (busy) return;
    C.app.roomGen++;
    [...hooks].forEach((hook) => hook.cancel?.()); hooks.clear(); clearCards();
    if (table) disposeObject(table);
    game = next;
    table = C.floor.tables[game]({ withDealer: true, dealerSeed: 'review-' + game, accent: '#cfb781' }); scene.add(table);
    setView('table');
    document.querySelector('#title').textContent = game[0].toUpperCase() + game.slice(1);
    document.querySelectorAll('[data-game]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.game === game)));
    result.hidden = game !== 'roulette';
    document.querySelector('#speed').hidden = game !== 'baccarat';
    document.querySelector('#hands').hidden = game !== 'baccarat';
    collect.hidden = game !== 'baccarat'; collect.disabled = true;
    document.querySelector('#wheel').hidden = game !== 'roulette';
    run.textContent = game === 'roulette' ? 'Spin & settle' : 'Deal demonstration';
    status.textContent = 'Ready · ' + (C.app.REDUCED ? 'reduced motion' : 'drag to inspect');
    document.querySelectorAll('[data-game], #run').forEach((button) => { button.disabled = false; });
  }
  document.querySelectorAll('[data-game]').forEach((button) => { button.onclick = () => selectGame(button.dataset.game); });
  for (const kind of ['overview', 'dealer', 'hands', 'overhead', 'wheel']) document.querySelector('#' + kind).onclick = () => setView(kind);
  collect.onclick = async () => {
    if (busy || !cards.length) return;
    busy = true; document.querySelectorAll('[data-game], #run, #speed, #collect').forEach((button) => { button.disabled = true; });
    try {
      status.textContent = 'Gathering the discard packet';
      await C.baccaratMotion.collect(C.app, table, cards); clearCards();
      status.textContent = 'Cards collected · ready for the next round';
    } catch (error) { document.querySelector('#error').textContent = error.message; console.error(error); }
    finally {
      busy = false; document.querySelectorAll('[data-game], #run, #speed').forEach((button) => { button.disabled = false; });
      collect.disabled = !cards.length;
    }
  };
  run.onclick = async () => {
    if (busy) return;
    busy = true; document.querySelectorAll('[data-game], #run, #result, #speed').forEach((b) => { b.disabled = true; });
    collect.disabled = true;
    try {
      clearCards();
      if (game === 'roulette') {
        status.textContent = 'Counter-rotation → track → descent → pocket capture';
        setView('wheel');
        const n = Number(result.value);
        const G = C.floor.ROULETTE_FELT;
        const spot = betSpots({ straight: { [n]: 100 } }, G)[0];
        const losing = betSpots({ straight: { [n === 0 ? 1 : 0]: 100 } }, G)[0];
        table.userData.setBets([{ x: spot.x, z: spot.z, amount: 100 }, { x: losing.x, z: losing.z, amount: 100 }]);
        await table.userData.spinTo(n);
        setView('table'); await table.userData.placeDolly(n);
        await table.userData.settleBets({ losingSpots: [{ x: losing.x, z: losing.z }], winningSpots: [{ x: spot.x, z: spot.z, amount: 100, factor: 35 }] });
        status.textContent = 'Pocket ' + n + ' · losers collected, 35:1 profit placed beside stake';
      } else {
        const L = C.layouts[game], rig = table.userData.dealerRig;
        const seat = game === 'blackjack' ? { ...L.seat, angle: table.userData.bj.seatAngle(2), feltY: L.feltY } : null;
        const playerCard = (index) => planPlayerCard(seat, { card: index });
        const demoShoe = [{ r: 4, s: 0 }, { r: 3, s: 1 }, { r: 14, s: 2 }, { r: 14, s: 3 }, { r: 2, s: 1 }, { r: 4, s: 2 }];
        let drawIndex = 0;
        const round = game === 'baccarat' ? C.baccaratRoads.playRound(() => demoShoe[drawIndex++]) : null;
        const seq = game === 'baccarat'
          ? L.dealSequence(round).map((step) => [step.pos, step.card, step.sideways, step.faceDown])
          : [[playerCard(0).pos, { r: 9, s: 0 }, playerCard(0).spin], [L.dealerSlots[0], { r: 6, s: 1 }, 0], [playerCard(1).pos, { r: 7, s: 2 }, playerCard(1).spin]];
        for (let i = 0; i < seq.length; i++) {
          status.textContent = 'Dealing card ' + (i + 1) + ' of ' + seq.length;
          const [to, value, orientation, faceDown] = seq[i];
          const spin = game === 'baccarat' ? (orientation ? Math.PI / 2 : 0) : orientation || 0;
          const mesh = C.cards.makeCard(value); mesh.rotation.set(-Math.PI / 2, faceDown ? Math.PI : 0, spin); scene.add(mesh); cards.push(mesh);
          if (game === 'baccarat') await C.baccaratMotion.deal(C.app, table, mesh, L.dealSequence(round)[i], { durationScale: Number(document.querySelector('#speed').value) });
          else await C.cards.dealCardWithDealer(C.app, rig, mesh, L.shoeMouth, to, {});
        }
        if (game === 'baccarat') await C.baccaratMotion.rest(C.app, rig);
        else await rig.play(C.app, 'armsRest');
        status.textContent = game === 'blackjack' ? 'European opening · player, dealer upcard, player' : `Player ${round.playerTotal} · Banker ${round.bankerTotal} · sideways third cards`;
      }
    } catch (error) { document.querySelector('#error').textContent = error.message; console.error(error); }
    finally {
      busy = false; document.querySelectorAll('[data-game], #run, #result, #speed').forEach((b) => { b.disabled = false; });
      collect.disabled = game !== 'baccarat' || !cards.length;
    }
  };
  const params = new URLSearchParams(location.search);
  const initial = ['blackjack', 'baccarat', 'roulette'].includes(params.get('game')) ? params.get('game') : 'blackjack';
  if (params.has('fallback')) selectGame(initial);
  else C.character.preload('../assets/').then(() => selectGame(initial));
})();
