(() => {
  const C = (globalThis.CASINO ??= {});
  const frameHooks = new Set();
  const pickables = [];   // { mesh, onClick }
  let currentRoom = null;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IS_MOBILE = matchMedia('(max-width: 768px)').matches;

  C.app = {
    scene: null, camera: null, camTarget: null, renderer: null,

    init() {
      const canvas = document.getElementById('stage');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1.5 : 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x080604);
      const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 100);
      const camTarget = new THREE.Vector3(0, 1.5, 0);
      Object.assign(C.app, { renderer, scene, camera, camTarget });

      addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
      });

      // picking
      const ray = new THREE.Raycaster();
      const ptr = new THREE.Vector2();
      canvas.addEventListener('pointerup', (e) => {
        ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        ray.setFromCamera(ptr, camera);
        const meshes = pickables.map((p) => p.mesh);
        const hit = ray.intersectObjects(meshes, true)[0];
        if (!hit) return;
        let obj = hit.object;
        while (obj) {
          const found = pickables.find((p) => p.mesh === obj);
          if (found) return found.onClick();
          obj = obj.parent;
        }
      });

      // wallet HUD
      const amt = document.getElementById('walletAmt');
      const pill = document.getElementById('walletPill');
      C.wallet.onChange((balance, delta) => {
        amt.textContent = balance.toLocaleString('en-US');
        pill.classList.remove('flash-up', 'flash-down');
        void pill.offsetWidth;   // restart animation
        pill.classList.add(delta >= 0 ? 'flash-up' : 'flash-down');
      });

      document.getElementById('backBtn').addEventListener('click', () => {
        if (currentRoom !== 'lobby') C.app.fade(() => C.app.switchRoom('lobby'));
      });

      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        frameHooks.forEach((fn) => fn(dt, now / 1000));
        camera.lookAt(camTarget);
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    onFrame: (fn) => frameHooks.add(fn),
    offFrame: (fn) => frameHooks.delete(fn),
    addPickable: (mesh, onClick) => pickables.push({ mesh, onClick }),
    clearPickables: () => (pickables.length = 0),

    jumpTo({ pos, look }) {
      C.app.camera.position.set(...pos);
      C.app.camTarget.set(...look);
    },
    flyTo({ pos, look }, ms, onDone) {
      const dur = REDUCED ? Math.min(ms, 250) : ms;
      const p = C.app.camera.position, t = C.app.camTarget;
      C.tween.to(p, { x: pos[0], y: pos[1], z: pos[2] }, dur, 'inOutCubic');
      C.tween.to(t, { x: look[0], y: look[1], z: look[2] }, dur, 'inOutCubic', onDone);
    },

    switchRoom(name) {
      if (currentRoom && C.rooms[currentRoom].exit) C.rooms[currentRoom].exit();
      C.app.clearPickables();
      C.app.setOverlay(null);
      // dispose everything
      const { scene } = C.app;
      while (scene.children.length) {
        const obj = scene.children[0];
        scene.remove(obj);
        obj.traverse?.((o) => {
          o.geometry?.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => { m?.map?.dispose(); m?.dispose(); });
        });
      }
      currentRoom = name;
      document.getElementById('roomTitle').textContent = C.rooms[name].title;
      document.getElementById('backBtn').hidden = name === 'lobby';
      C.rooms[name].enter(C.app);
    },

    banner(title, sub = '', ms = 2200) {
      const el = document.getElementById('banner');
      el.innerHTML = `<h2>${title}</h2>` + (sub ? `<p>${sub}</p>` : '');
      el.hidden = false;
      return new Promise((res) => setTimeout(() => { el.hidden = true; res(); }, ms));
    },

    fade(midFn) {
      const el = document.getElementById('fader');
      el.classList.add('on');
      return new Promise((res) => setTimeout(async () => {
        await midFn();
        el.classList.remove('on');
        res();
      }, 200));
    },

    setOverlay(el) {
      const root = document.getElementById('overlay-root');
      root.innerHTML = '';
      if (el) root.appendChild(el);
    },

    REDUCED, IS_MOBILE,
  };
  C.rooms = C.rooms || {};
})();
