(() => {
  const C = globalThis.CASINO, canvas = document.querySelector('#stage');
  const status = document.querySelector('#status'), choice = document.querySelector('#choice');
  const run = document.querySelector('#run'), controls = document.querySelectorAll('[data-station], #run, #choice');
  THREE.ColorManagement.legacyMode = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#101619');
  const camera = new THREE.PerspectiveCamera(43, 1, 0.05, 45);
  const hooks = new Set();
  C.app = { scene, renderer, camera, roomGen: 1, REDUCED: matchMedia('(prefers-reduced-motion: reduce)').matches,
    IS_MOBILE: false, player: { x: 100, z: 100 },
    onFrame: fn => hooks.add(fn), offFrame: fn => hooks.delete(fn), addPickable() {},
  };
  scene.add(new THREE.HemisphereLight(0xe7eef6, 0x66523e, 0.85));
  const key = new THREE.DirectionalLight(0xffeddb, 1.2); key.position.set(-3, 5, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5; key.shadow.bias = -0.00015; scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9dcff, 0.55); rim.position.set(4, 3, -2); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#26332e', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.015; floor.receiveShadow = true; scene.add(floor);
  let station, kind = 'cashier', busy = false, yaw = 0.12, elevation = 0.16, distance = 6.5;
  const target = new THREE.Vector3(0, 1.35, 0);
  const clock = new THREE.Clock();
  const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    for (const hook of [...hooks]) hook(dt, clock.elapsedTime);
    if (busy && station?.userData.service.status) status.textContent = station.userData.service.status;
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance, target.z + Math.cos(yaw) * Math.cos(elevation) * distance);
    camera.lookAt(target); renderer.render(scene, camera);
  });
  let drag = null;
  canvas.addEventListener('pointerdown', event => { drag = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    yaw -= (event.clientX - drag[0]) * 0.006;
    elevation = THREE.MathUtils.clamp(elevation + (event.clientY - drag[1]) * 0.004, -0.08, 1.4);
    drag = [event.clientX, event.clientY];
  });
  canvas.addEventListener('pointerup', () => { drag = null; }); canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', event => { event.preventDefault(); distance = THREE.MathUtils.clamp(distance + event.deltaY * 0.003, 1.2, 10); }, { passive: false });
  function view(name) {
    if (name === 'counter') { target.set(0, 1.2, 0.05); yaw = 0.08; elevation = 0.38; distance = kind === 'cashier' ? 3.15 : 2.9; }
    else if (name === 'interior') { target.set(0, 1.25, -0.25); yaw = -0.68; elevation = 0.54; distance = 4.5; }
    else { target.set(0, 1.4, 0); yaw = 0.14; elevation = 0.16; distance = kind === 'cashier' ? 7.1 : 6.1; }
  }
  function dispose(object) {
    object.userData.service?.dispose?.();
    object.traverse(node => {
      node.geometry?.dispose();
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) { material?.map?.dispose(); material?.dispose(); }
    });
    object.removeFromParent();
  }
  function select(next) {
    if (busy) return;
    if (station) dispose(station);
    C.app.roomGen++; for (const hook of [...hooks]) hook.cancel?.(); hooks.clear();
    kind = next;
    station = kind === 'bar' ? C.floor.buildBarStation({ app: C.app, standalone: true }) : C.floor.buildCashierStation({ app: C.app, standalone: true });
    scene.add(station); view('overview');
    document.querySelector('#title').textContent = kind === 'bar' ? 'The bar' : 'Cashier';
    document.querySelectorAll('[data-station]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.station === kind)));
    choice.replaceChildren();
    const options = kind === 'bar' ? [['old-fashioned', 'Old Fashioned'], ['martini', 'Martini'], ['highball', 'Whisky Highball']]
      : [['buyIn', 'Notes → chips'], ['cashOut', 'Chips → cash']];
    for (const [value, label] of options) choice.add(new Option(label, value));
    status.textContent = kind === 'cashier' ? 'Preview exchange · 1,000 casino credits · no wallet changes' : 'Choose a drink to watch it being made';
    controls.forEach(control => { control.disabled = false; });
  }
  document.querySelectorAll('[data-station]').forEach(button => { button.onclick = () => select(button.dataset.station); });
  document.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => view(button.dataset.view); });
  run.onclick = async () => {
    if (busy) return;
    busy = true; controls.forEach(control => { control.disabled = true; });
    document.querySelector('#error').textContent = ''; status.textContent = 'Preparing your service…';
    try {
      const done = await station.userData.service.demo(choice.value, 1000);
      status.textContent = done === false ? 'Service stopped' : kind === 'cashier' ? 'Exchange complete · payout at the window' : 'Drink served · cheers';
    } catch (error) { document.querySelector('#error').textContent = error.message; console.error(error); }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); }
  };
  const params = new URLSearchParams(location.search), initial = params.get('station') === 'bar' ? 'bar' : 'cashier';
  if (params.has('fallback')) select(initial);
  else C.character.preload('../assets/').then(() => select(initial));
})();
