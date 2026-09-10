(() => {
  const C = (globalThis.CASINO ??= {});
  C.floor = C.floor || {};

  const DRINKS = {
    'old-fashioned': { name: 'Old fashioned', spirit: 'WHISKY', glass: 'rocks', color: '#b57525', fill: 0.067, garnish: 'orange' },
    martini: { name: 'Vodka martini', spirit: 'VODKA', glass: 'coupe', color: '#e3e5cc', fill: 0.13, garnish: 'olive' },
    highball: { name: 'Whisky highball', spirit: 'WHISKY', glass: 'highball', color: '#c4a258', fill: 0.137, garnish: 'lemon' },
  };
  const SPIRITS = [
    ['WHISKY', '#cba459', '#99702f', 0.29], ['GIN', '#d0dccc', '#bfcfc8', 0.29],
    ['RUM', '#c4aa75', '#965218', 0.27], ['VODKA', '#d5e2e2', '#c8d8dc', 0.31],
    ['TEQUILA', '#bfd8bf', '#cec293', 0.27], ['ORANGE LIQUEUR', '#b78940', '#ae621b', 0.25],
    ['DRY VERMOUTH', '#809573', '#b3ac75', 0.30],
  ];

  function buildBarStation({ app = C.app, standalone = false } = {}) {
    const A = C.assets;
    const root = new THREE.Group(); root.name = 'cocktail-bar-station';
    const wood = A.woodMaterial('#261c1a');
    const dark = new THREE.MeshStandardMaterial({ color: '#121c21', roughness: 0.72 });
    const stone = new THREE.MeshStandardMaterial({ color: '#d1c6b2', roughness: 0.25, metalness: 0.08 });
    const steel = new THREE.MeshStandardMaterial({ color: '#a9b3b4', roughness: 0.24, metalness: 0.84 });
    const brass = new THREE.MeshStandardMaterial({ color: '#a48753', roughness: 0.34, metalness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: '#dce5e2', transparent: true, opacity: 0.26, roughness: 0.1, metalness: 0.04, side: THREE.DoubleSide, depthWrite: false });
    const iceMat = new THREE.MeshStandardMaterial({ color: '#e6f1ee', transparent: true, opacity: 0.48, roughness: 0.16, depthWrite: false });
    const rubber = new THREE.MeshStandardMaterial({ color: '#101416', roughness: 0.98 });
    const cream = new THREE.MeshStandardMaterial({ color: '#e9e2d5', roughness: 0.9 });
    const sharedMaterials = new Set([wood, dark, stone, steel, brass, glassMat, iceMat, rubber, cream]);
    const disposeModel = group => {
      const materials = new Set();
      group.traverse(part => {
        part.geometry?.dispose();
        for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
          if (material && !sharedMaterials.has(material)) materials.add(material);
        }
      });
      for (const material of materials) { material.map?.dispose(); material.dispose(); }
    };
    const add = (name, geometry, material, pos, parent = root) => {
      const part = new THREE.Mesh(geometry, material); part.name = name;
      part.position.set(...pos); part.castShadow = !material.transparent; part.receiveShadow = true;
      parent.add(part); return part;
    };
    const box = (name, size, pos, material = dark, parent = root) => add(name, new THREE.BoxGeometry(...size), material, pos, parent);
    const tube = (name, radius, length, pos, material = steel, parent = root) => add(name, new THREE.CylinderGeometry(radius, radius, length, 16), material, pos, parent);
    const label = (name, text, w, h, pos, parent = root, ink = '#eee0bb', background = '#182329') => {
      const tx = A.canvasTexture(512, 192, ctx => {
        ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 192);
        ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(12, 12, 488, 168);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '500 25px Georgia'; ctx.fillText('THE GRAND • LOUNGE', 256, 49);
        ctx.font = '600 44px Georgia'; ctx.fillText(text, 256, 116, 458);
      });
      return add(name, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.77 }), pos, parent);
    };

    // The solid front counter starts in front of the bartender's legs. A
    // separate, lower worktop keeps bottle and glass grips within arm reach.
    box('bar-counter-front', [4.0, 1.01, 0.38], [0, 0.505, 0.43], wood);
    box('bar-stone-top', [4.16, 0.055, 0.46], [0, 1.0575, 0.42], stone);
    box('bar-working-well', [1.12, 0.035, 0.38], [0, 0.9475, 0.02], steel);
    box('bar-work-mat', [0.97, 0.006, 0.29], [0, 0.968, 0.027], rubber);
    for (let i = 0; i < 28; i++) box('bar-mat-rib', [0.007, 0.004, 0.275], [-0.46 + i * 0.034, 0.973, 0.027], rubber);
    for (let i = 0; i < 25; i++) box('bar-front-flute', [0.025, 0.77, 0.014], [-1.87 + i * 0.156, 0.54, 0.628], wood);
    box('bar-front-brass-inlay', [3.9, 0.016, 0.017], [0, 0.88, 0.643], brass);
    box('bar-kickplate', [3.92, 0.13, 0.016], [0, 0.095, 0.63], brass);
    const footrail = tube('bar-footrail', 0.025, 3.85, [0, 0.23, 0.87], brass); footrail.rotation.z = Math.PI / 2;
    for (const x of [-1.72, 0, 1.72]) {
      const bracket = tube('bar-footrail-support', 0.016, 0.24, [x, 0.23, 0.75], brass); bracket.rotation.x = Math.PI / 2;
    }
    box('bar-back-cabinet', [4.18, 2.62, 0.11], [0, 1.31, -0.795], wood);
    box('bar-mirror', [3.9, 2.02, 0.016], [0, 1.49, -0.729], new THREE.MeshStandardMaterial({ color: '#64706b', roughness: 0.16, metalness: 0.72 }));
    for (const x of [-1.96, -0.66, 0.66, 1.96]) box('barback-upright', [0.028, 2.12, 0.035], [x, 1.45, -0.65], brass);
    for (const y of [1.29, 1.84, 2.39]) {
      box('barback-shelf', [3.99, 0.034, 0.27], [0, y, -0.60], wood);
      box('barback-shelf-lip', [4.0, 0.014, 0.015], [0, y + 0.016, -0.46], brass);
      const light = A.ledStrip('#ffe1ac', 3.94, 0.013, 0.018); light.position.set(0, y - 0.021, -0.49); root.add(light);
    }
    label('bar-sign', 'COCKTAIL LOUNGE', 2.42, 0.53, [0, 2.94, -0.58]);

    function makeBottle(spec, small = false) {
      const [kind, tint, liquidColor, height] = spec;
      const group = new THREE.Group(); group.name = `spirit-${kind.toLowerCase().replaceAll(' ', '-')}`;
      const r = kind === 'WHISKY' || kind === 'ORANGE LIQUEUR' ? 0.048 : 0.04;
      const profile = [[0, 0], [r * 0.8, 0], [r, 0.009], [r, height * 0.62], [r * 0.88, height * 0.68], [0.015, height * 0.78], [0.014, height - 0.013], [0.017, height - 0.009], [0.017, height], [0.011, height], [0.011, height * 0.8], [r - 0.004, height * 0.62], [r - 0.004, 0.014], [0, 0.014]];
      const bottleMat = new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.36, roughness: 0.15, metalness: 0.04, side: THREE.DoubleSide, depthWrite: false });
      add('bottle-glass', new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), 24), bottleMat, [0, 0, 0], group);
      const liquid = add('bottle-spirit', new THREE.CylinderGeometry(r - 0.006, r - 0.006, height * 0.54, 24), new THREE.MeshStandardMaterial({ color: liquidColor, transparent: true, opacity: 0.78, roughness: 0.19 }), [0, height * 0.27 + 0.012, 0], group);
      const cap = tube('bottle-cap', 0.0168, 0.024, [0, height + 0.008, 0], kind === 'GIN' || kind === 'VODKA' ? steel : dark, group);
      label('spirit-label', kind, r * 1.7, height * 0.30, [0, height * 0.37, r + 0.001], group, '#222b2b', '#e5ddc6');
      label('bottle-neck-label', '40% VOL', 0.031, 0.02, [0, height * 0.8, 0.016], group, '#c9b37d', '#172124');
      group.userData.kind = kind; group.userData.height = height; group.userData.mouth = [0, height, 0];
      group.userData.cap = cap; group.userData.liquid = liquid;
      if (small) group.scale.setScalar(0.72);
      return group;
    }

    // Readable labels, actual shoulders/necks and non-emissive spirit liquid.
    for (const [row, y] of [1.311, 1.861].entries()) for (let i = 0; i < 11; i++) {
      if (row === 0 && i >= 4 && i <= 6) continue;
      const bottle = makeBottle(SPIRITS[(i + row * 3) % SPIRITS.length]);
      bottle.position.set(-1.78 + i * 0.356, y, -0.568); root.add(bottle);
    }
    // Lower side workstations: rinsing sink, glass rack and concealed storage.
    for (const x of [-1.31, 1.31]) {
      box('bar-side-cabinet', [1.05, 0.91, 0.47], [x, 0.455, -0.30], dark);
      box('bar-side-steel-worktop', [1.08, 0.03, 0.50], [x, 0.925, -0.30], steel);
      for (const dx of [-0.26, 0.26]) {
        box('bar-storage-door', [0.50, 0.71, 0.014], [x + dx, 0.46, -0.057], wood);
        box('bar-storage-handle', [0.07, 0.012, 0.019], [x + dx, 0.67, -0.04], brass);
      }
    }
    box('bar-sink-basin', [0.46, 0.10, 0.32], [-1.38, 0.935, -0.27], rubber);
    for (const x of [-1.63, -1.13]) box('bar-sink-rim', [0.026, 0.02, 0.36], [x, 0.949, -0.27], steel);
    for (const z of [-0.445, -0.095]) box('bar-sink-rim', [0.52, 0.02, 0.022], [-1.38, 0.949, z], steel);
    tube('bar-faucet-base', 0.022, 0.19, [-1.38, 1.044, -0.48]);
    const faucet = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.012, 8, 18, Math.PI), steel);
    faucet.name = 'bar-faucet-arch'; faucet.position.set(-1.38, 1.14, -0.416); faucet.rotation.y = Math.PI / 2; root.add(faucet);
    tube('bar-faucet-spout', 0.012, 0.05, [-1.38, 1.116, -0.352]);
    box('bar-speed-rail', [0.75, 0.065, 0.10], [-1.22, 0.80, 0.015], steel);
    for (let i = 0; i < 5; i++) {
      const bottle = makeBottle(SPIRITS[i], true); bottle.position.set(-1.51 + i * 0.145, 0.834, 0.015); root.add(bottle);
    }
    box('bar-ice-bin', [0.30, 0.06, 0.24], [0.78, 0.956, -0.25], steel);
    box('bar-ice-bin-interior', [0.272, 0.016, 0.213], [0.78, 0.989, -0.25], rubber);
    for (let i = 0; i < 9; i++) {
      const ice = box('ice-bin-cube', [0.036, 0.032, 0.034], [0.69 + (i % 3) * 0.07, 1.006 + (i % 2) * 0.014, -0.31 + Math.floor(i / 3) * 0.059], iceMat);
      ice.rotation.set(0.2 * (i % 3), 0.45 * i, 0.1);
    }
    const scoop = add('ice-scoop', new THREE.SphereGeometry(0.028, 12, 8, 0, Math.PI), steel, [0.88, 1.026, -0.20]); scoop.scale.set(1, 0.5, 1.55); scoop.rotation.x = -Math.PI / 2;
    const scoopHandle = tube('ice-scoop-handle', 0.007, 0.1, [0.88, 1.035, -0.13]); scoopHandle.rotation.x = Math.PI / 2;

    function makeGlass(type) {
      const group = new THREE.Group(); group.name = `drink-glass-${type}`;
      const h = type === 'highball' ? 0.17 : type === 'coupe' ? 0.162 : 0.104;
      const r = type === 'highball' ? 0.037 : type === 'coupe' ? 0.067 : 0.048;
      let profile;
      if (type === 'coupe') profile = [[0, 0], [0.045, 0], [0.045, 0.005], [0.005, 0.009], [0.004, 0.078], [0.014, 0.083], [r, h], [r - 0.003, h], [0.01, 0.087], [0.001, 0.087]];
      else profile = [[0, 0], [r * 0.87, 0], [r, h], [r - 0.003, h], [r * 0.87 - 0.003, 0.011], [0, 0.011]];
      add('drink-glass-shell', new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), 32), glassMat, [0, 0, 0], group);
      const rim = add('drink-glass-rim', new THREE.TorusGeometry(r - 0.001, 0.0017, 6, 32), glassMat, [0, h, 0], group); rim.rotation.x = Math.PI / 2;
      const drinkMat = new THREE.MeshStandardMaterial({ color: '#b57525', transparent: true, opacity: 0.75, roughness: 0.17, depthWrite: false });
      const liquid = add('drink-liquid', new THREE.CylinderGeometry(type === 'coupe' ? 0.044 : r - 0.005, type === 'coupe' ? 0.006 : r * 0.88 - 0.003, 1, 32), drinkMat, [0, 0.012, 0], group);
      liquid.visible = false;
      group.userData.fill = amount => {
        const base = type === 'coupe' ? 0.087 : 0.013;
        const depth = Math.max(0.0001, amount - base);
        liquid.scale.y = depth; liquid.position.y = base + depth / 2; liquid.visible = amount > base;
        if (type === 'coupe') liquid.scale.x = liquid.scale.z = Math.min(1, depth / 0.043);
        group.userData.fillLevel = amount;
      };
      group.userData.liquid = liquid; group.userData.rimHeight = h;
      if (type !== 'coupe') for (let i = 0; i < (type === 'highball' ? 4 : 3); i++) {
        const ice = box('drink-ice-cube', [0.027, 0.027, 0.026], [((i % 2) - 0.5) * 0.033, 0.034 + i * 0.024, (i % 2 ? -1 : 1) * 0.009], iceMat, group);
        ice.rotation.set(0.16, i * 0.56, 0.16);
      }
      return group;
    }
    for (let i = 0; i < 6; i++) {
      const glass = makeGlass(i % 2 ? 'coupe' : 'highball'); glass.position.set(1.12 + (i % 3) * 0.20, 0.941, -0.39 + Math.floor(i / 3) * 0.23); root.add(glass);
    }
    for (const x of [1.24, 1.60]) {
      const rack = tube('hanging-glass-rack', 0.004, 0.25, [x, 2.324, -0.565], brass); rack.rotation.x = Math.PI / 2;
      const glass = makeGlass('coupe'); glass.position.set(x, 2.324, -0.56); glass.rotation.z = Math.PI; root.add(glass);
    }

    const shaker = new THREE.Group(); shaker.name = 'cocktail-shaker';
    add('shaker-body', new THREE.LatheGeometry([[0, 0], [0.027, 0], [0.039, 0.13], [0.036, 0.143], [0.022, 0.16], [0.018, 0.18], [0.014, 0.18], [0.014, 0.16], [0.032, 0.14], [0.026, 0.014], [0, 0.014]].map(p => new THREE.Vector2(...p)), 32), steel, [0, 0, 0], shaker);
    const shakerCap = tube('shaker-cap', 0.019, 0.028, [0, 0.187, 0], steel, shaker);
    shaker.userData.cap = shakerCap; shaker.userData.mouth = [0, 0.18, 0];
    const shakerHome = [-0.39, 0.977, 0.085]; shaker.position.set(...shakerHome); root.add(shaker);
    const jigger = new THREE.Group(); jigger.name = 'cocktail-jigger';
    add('jigger-upper-cup', new THREE.CylinderGeometry(0.026, 0.012, 0.045, 24, 1, true), brass, [0, 0.0675, 0], jigger);
    add('jigger-lower-cup', new THREE.CylinderGeometry(0.012, 0.021, 0.045, 24, 1, true), brass, [0, 0.0225, 0], jigger);
    jigger.position.set(-0.17, 0.977, 0.12); root.add(jigger);
    const spoon = new THREE.Group(); spoon.name = 'bar-spoon';
    tube('spoon-handle', 0.0022, 0.215, [0, 0.113, 0], brass, spoon);
    const spoonBowl = add('spoon-bowl', new THREE.SphereGeometry(0.011, 12, 8), brass, [0, 0.01, 0], spoon); spoonBowl.scale.set(0.68, 1.0, 0.2);
    const spoonHome = [0.35, 0.977, -0.045]; spoon.position.set(...spoonHome); root.add(spoon);
    const strainer = new THREE.Group(); strainer.name = 'hawthorne-strainer';
    const strainerFace = add('strainer-disc', new THREE.CircleGeometry(0.035, 20), steel, [0, 0, 0], strainer); strainerFace.rotation.x = -Math.PI / 2;
    const strainerSpring = add('strainer-spring', new THREE.TorusGeometry(0.03, 0.004, 6, 28), steel, [0, 0.004, 0], strainer); strainerSpring.rotation.x = Math.PI / 2;
    box('strainer-handle', [0.014, 0.004, 0.085], [0, 0.003, 0.067], steel, strainer);
    strainer.position.set(-0.45, 0.980, -0.08); root.add(strainer);
    const napkin = box('bar-service-napkin', [0.22, 0.002, 0.20], [0.22, 1.087, 0.49], cream);
    const garnishTray = box('garnish-tray', [0.30, 0.024, 0.14], [0.44, 0.981, -0.015], steel);
    for (const x of [0.35, 0.44, 0.53]) box('garnish-tray-well', [0.08, 0.006, 0.11], [x, 0.996, -0.015], rubber);
    for (let i = 0; i < 5; i++) {
      const slice = add('orange-garnish-slice', new THREE.CylinderGeometry(0.025, 0.025, 0.005, 20), new THREE.MeshStandardMaterial({ color: '#dfa022', roughness: 0.8 }), [0.34, 1.003 + i * 0.006, -0.02]); slice.rotation.z = 0.12;
      add('olive-garnish', new THREE.SphereGeometry(0.01, 12, 8), new THREE.MeshStandardMaterial({ color: '#77813a', roughness: 0.5 }), [0.44 + (i % 2) * 0.017, 1.006, -0.055 + i * 0.017]);
    }
    const soda = new THREE.Group(); soda.name = 'soda-siphon';
    add('soda-siphon-body', new THREE.CylinderGeometry(0.037, 0.044, 0.19, 24), glassMat, [0, 0.095, 0], soda);
    add('soda-siphon-water', new THREE.CylinderGeometry(0.035, 0.040, 0.15, 24), new THREE.MeshStandardMaterial({ color: '#c5d6d8', transparent: true, opacity: 0.3 }), [0, 0.079, 0], soda);
    tube('soda-siphon-head', 0.027, 0.04, [0, 0.208, 0], steel, soda);
    const spout = tube('soda-siphon-spout', 0.006, 0.062, [0.032, 0.221, 0], steel, soda); spout.rotation.z = Math.PI / 2;
    box('soda-siphon-trigger', [0.057, 0.008, 0.012], [0.009, 0.244, 0], dark, soda);
    const sodaHome = [-0.28, 0.977, -0.07]; soda.position.set(...sodaHome); root.add(soda);
    const bottle = makeBottle(SPIRITS[0]); bottle.name = 'service-spirit-bottle';
    const bottleHome = [-0.28, 0.977, 0.025]; bottle.position.set(...bottleHome); root.add(bottle);
    const bitters = makeBottle(['BITTERS', '#a16830', '#6b3917', 0.16]); bitters.name = 'aromatic-bitters'; bitters.scale.setScalar(0.78);
    const bittersHome = [-0.46, 0.977, 0.0]; bitters.position.set(...bittersHome); root.add(bitters);
    const vermouth = makeBottle(SPIRITS[6], true); vermouth.name = 'service-dry-vermouth';
    const vermouthHome = [-0.44, 0.977, -0.11]; vermouth.position.set(...vermouthHome); root.add(vermouth);

    const tender = A.makeDealer({ suit: '#182529', shirt: '#efeadf', seed: 'bartender-professional-v3' });
    tender.name = 'professional-bartender'; tender.position.set(0, 0, -0.40); root.add(tender);
    tender.userData.idle?.(app);
    const rig = tender.userData.rig;
    const apron = new THREE.Group(); apron.name = 'bartender-waist-apron';
    // Stationary service staff keep a tailored apron clear of elbows/hands.
    box('apron-waistband', [0.35, 0.043, 0.025], [0, 0.933, 0.139], dark, apron);
    const cloth = box('apron-front', [0.33, 0.36, 0.013], [0, 0.756, 0.144], dark, apron); cloth.rotation.x = -0.07;
    box('apron-pocket', [0.19, 0.075, 0.011], [0, 0.824, 0.161], wood, apron);
    tender.add(apron);
    const warm = new THREE.PointLight('#ffe7c1', 0.78, 6, 2); warm.position.set(0, 2.7, 0.85); root.add(warm);
    const fill = new THREE.PointLight('#d9e1e2', 0.48, 4, 2); fill.position.set(0.45, 1.96, 1.55); root.add(fill);
    if (!standalone) for (const x of [-1.55, -0.5, 0.55, 1.6]) {
      const stool = A.makeStool({ seatHeight: 0.75 }); stool.position.set(x, 0, 1.02); root.add(stool);
    }

    const pourMaterial = new THREE.MeshStandardMaterial({ color: '#d3b063', transparent: true, opacity: 0.77, roughness: 0.18, depthWrite: false });
    const stream = tube('pour-stream', 0.0024, 1, [0, 0, 0], pourMaterial); stream.visible = false;
    let activeGlass = null, garnish = null, motion = null, disposed = false, generation = 0;
    const yAxis = new THREE.Vector3(0, 1, 0);
    function drawStream(source, mouth, target) {
      root.updateMatrixWorld(true);
      const from = root.worldToLocal(source.localToWorld(new THREE.Vector3(...mouth)));
      const to = new THREE.Vector3(...target); const direction = to.clone().sub(from);
      stream.position.copy(from).add(to).multiplyScalar(0.5); stream.scale.y = direction.length();
      stream.quaternion.setFromUnitVectors(yAxis, direction.normalize()); stream.visible = true;
    }
    function clearDrink() {
      if (activeGlass) { root.remove(activeGlass); disposeModel(activeGlass); }
      activeGlass = null;
      if (garnish) { root.remove(garnish); disposeModel(garnish); garnish = null; }
    }
    function makeGarnish(kind) {
      const group = new THREE.Group(); group.name = `served-${kind}-garnish`;
      if (kind === 'olive') {
        const olive = add('olive', new THREE.SphereGeometry(0.009, 14, 10), new THREE.MeshStandardMaterial({ color: '#788143', roughness: 0.56 }), [0, 0, 0], group); olive.scale.y = 0.8;
        const pick = tube('olive-pick', 0.0012, 0.07, [0, 0, 0], cream, group); pick.rotation.z = -1.1;
      } else {
        const skin = new THREE.MeshStandardMaterial({ color: kind === 'orange' ? '#d68c11' : '#dac743', roughness: 0.87 });
        const fruit = new THREE.MeshStandardMaterial({ color: kind === 'orange' ? '#edae45' : '#efe499', roughness: 0.8 });
        const peel = add('citrus-peel', new THREE.TorusGeometry(0.022, 0.004, 8, 24), skin, [0, 0, 0], group);
        const flesh = add('citrus-flesh', new THREE.CircleGeometry(0.020, 24), fruit, [0, 0, 0], group);
        flesh.material.side = THREE.DoubleSide; peel.rotation.x = 0.3; flesh.rotation.x = 0.3;
      }
      return group;
    }
    const service = {
      rig, actor: tender, busy: false, status: 'Choose a freshly made cocktail', menu: Object.keys(DRINKS),
      get drink() { return activeGlass; },
      cancel() {
        generation++; motion?.cancel(); stream.visible = false; service.busy = false;
        bottle.rotation.set(0, 0, 0); bottle.position.set(...bottleHome); bottle.userData.cap.visible = true;
        shaker.rotation.set(0, 0, 0); shaker.position.set(...shakerHome); shakerCap.visible = true;
        spoon.rotation.set(0, 0, 0); spoon.position.set(...spoonHome);
        soda.rotation.set(0, 0, 0); soda.position.set(...sodaHome);
        bitters.rotation.set(0, 0, 0); bitters.position.set(...bittersHome); bitters.userData.cap.visible = true;
        vermouth.rotation.set(0, 0, 0); vermouth.position.set(...vermouthHome); vermouth.userData.cap.visible = true;
        clearDrink(); service.status = 'Choose a freshly made cocktail';
      },
      dispose() { if (disposed) return; service.cancel(); disposed = true; clearDrink(); },
      async demo(drink = 'old-fashioned') {
        if (disposed || service.busy || !DRINKS[drink]) return false;
        service.busy = true; const run = ++generation; const room = app.roomGen;
        const valid = () => !disposed && run === generation && app.roomGen === room;
        const recipe = DRINKS[drink];
        clearDrink(); activeGlass = makeGlass(recipe.glass); activeGlass.position.set(0.065, 0.977, 0.08);
        activeGlass.userData.liquid.material.color.set(recipe.color); root.add(activeGlass);
        const currentGlass = activeGlass;
        if (drink === 'old-fashioned') box('dissolving-sugar', [0.017, 0.012, 0.017], [0, 0.02, 0], cream, currentGlass);
        // Swap the service bottle's full labelled model to the ordered spirit.
        while (bottle.children.length) { const part = bottle.children[0]; bottle.remove(part); disposeModel(part); }
        const newBottle = makeBottle(SPIRITS.find(spec => spec[0] === recipe.spirit));
        bottle.userData = newBottle.userData; while (newBottle.children.length) bottle.add(newBottle.children[0]);
        bottle.position.set(...bottleHome); bottle.rotation.set(0, 0, 0);
        motion = C.serviceMotion.create(app, rig, root);
        const step = async promise => (await promise) !== false && valid();
        const stage = text => { if (valid()) service.status = text; };
        try {
          if (drink === 'old-fashioned') {
            stage('Adding aromatic bitters to sugar and ice');
            if (!await step(motion.pick(bitters, { side: 'R', grip: [0, 0.10, 0], target: [-0.46, 1.055, 0], ms: 700 }))) return false;
            bitters.userData.cap.visible = false;
            if (!await step(motion.pose({ side: 'R', target: [0.02, 1.19, 0.08], ms: 700 }))) return false;
            if (!await step(motion.animate({ ms: 350, onFrame: t => { bitters.rotation.z = -1.72 * t; } }))) return false;
            if (!await step(motion.animate({ ms: 650, onFrame: t => {
              drawStream(bitters, bitters.userData.mouth, [0.065, 1.006, 0.08]); stream.visible = (t > 0.1 && t < 0.34) || (t > 0.6 && t < 0.83);
            } }))) return false;
            stream.visible = false;
            if (!await step(motion.animate({ ms: 350, onFrame: t => { bitters.rotation.z = -1.72 * (1 - t); } }))) return false;
            bitters.userData.cap.visible = true;
            if (!await step(motion.place({ side: 'R', target: bittersHome, ms: 650 }))) return false;
          }
          if (drink === 'martini') {
            stage('Setting the shaker on the mixing mat');
            if (!await step(motion.pick(shaker, { side: 'R', grip: [0, 0.075, 0], target: [-0.39, 1.052, 0.085], ms: 600 }))) return false;
            if (!await step(motion.pose({ side: 'R', target: [-0.19, 1.14, 0.08], ms: 450 }))) return false;
            if (!await step(motion.place({ side: 'R', target: [-0.055, 0.977, 0.08], ms: 600 }))) return false;
            shakerCap.visible = false;
          }
          stage(`Pouring ${recipe.spirit.toLowerCase()}`);
          if (!await step(motion.pick(bottle, { side: 'R', grip: [0, 0.15, 0], target: [-0.28, 1.127, 0.025], ms: 750 }))) return false;
          bottle.userData.cap.visible = false;
          const pourTo = drink === 'martini' ? [-0.055, 1.15, 0.08] : [0.065, 1.015, 0.08];
          const palm = [pourTo[0] - (bottle.userData.height - 0.15) * 0.995, 1.29, 0.08];
          if (!await step(motion.pose({ side: 'R', target: palm, ms: 700 }))) return false;
          if (!await step(motion.animate({ ms: 450, onFrame: t => { bottle.rotation.z = -1.67 * t; } }))) return false;
          stage(drink === 'martini' ? 'Building vodka and dry vermouth over ice' : 'Pouring over clear ice');
          if (!await step(motion.animate({ ms: 1300, onFrame: t => {
            drawStream(bottle, bottle.userData.mouth, pourTo);
            if (drink !== 'martini') currentGlass.userData.fill(drink === 'highball' ? 0.05 * t : recipe.fill * t);
          } }))) return false;
          stream.visible = false;
          if (!await step(motion.animate({ ms: 380, onFrame: t => { bottle.rotation.z = -1.67 * (1 - t); } }))) return false;
          bottle.userData.cap.visible = true;
          if (!await step(motion.place({ side: 'R', target: bottleHome, ms: 700 }))) return false;

          if (drink === 'martini') {
            stage('Adding dry vermouth');
            if (!await step(motion.pick(vermouth, { side: 'R', grip: [0, 0.15, 0], target: [-0.44, 1.085, -0.11], ms: 650 }))) return false;
            vermouth.userData.cap.visible = false;
            if (!await step(motion.pose({ side: 'R', target: [-0.16, 1.29, 0.08], ms: 650 }))) return false;
            if (!await step(motion.animate({ ms: 350, onFrame: t => { vermouth.rotation.z = -1.67 * t; } }))) return false;
            if (!await step(motion.animate({ ms: 650, onFrame: () => { drawStream(vermouth, vermouth.userData.mouth, [-0.055, 1.15, 0.08]); } }))) return false;
            stream.visible = false;
            if (!await step(motion.animate({ ms: 350, onFrame: t => { vermouth.rotation.z = -1.67 * (1 - t); } }))) return false;
            vermouth.userData.cap.visible = true;
            if (!await step(motion.place({ side: 'R', target: vermouthHome, ms: 650 }))) return false;
            stage('Chilling in the cocktail shaker'); shakerCap.visible = true;
            if (!await step(motion.pick(shaker, { side: 'R', grip: [0, 0.075, 0], target: [-0.055, 1.052, 0.08], ms: 600 }))) return false;
            if (!await step(motion.pose({ side: 'R', target: [-0.08, 1.31, -0.03], ms: 650 }))) return false;
            if (!await step(motion.pose({ side: 'L', target: [0.14, 1.21, -0.13], ms: 480 }))) return false;
            if (!await step(motion.animate({ ms: 220, onFrame: t => { shaker.rotation.z = -0.62 * t; } }))) return false;
            // Carry the shaker with the forearm: the helper keeps its grip
            // on the actual palm throughout each short shaking stroke.
            for (let stroke = 0; stroke < 8; stroke++) {
              const target = stroke % 2 ? [-0.04, 1.26, 0.015] : [-0.09, 1.35, -0.065];
              if (!await step(motion.pose({ side: 'R', target, ms: 180 }))) return false;
            }
            stage('Straining into the chilled martini glass'); shakerCap.visible = false;
            if (!await step(motion.pose({ side: 'R', target: [-0.04, 1.285, 0.08], ms: 700 }))) return false;
            if (!await step(motion.animate({ ms: 450, onFrame: t => { shaker.rotation.z = -0.62 - 1.04 * t; } }))) return false;
            if (!await step(motion.animate({ ms: 1300, onFrame: t => { drawStream(shaker, shaker.userData.mouth, [0.065, 1.083 + t * 0.024, 0.08]); currentGlass.userData.fill(0.087 + (recipe.fill - 0.087) * t); } }))) return false;
            stream.visible = false;
            if (!await step(motion.animate({ ms: 380, onFrame: t => { shaker.rotation.z = -1.66 * (1 - t); } }))) return false;
            shakerCap.visible = true;
            if (!await step(motion.place({ side: 'R', target: shakerHome, ms: 700 }))) return false;
          } else if (drink === 'highball') {
            stage('Topping with sparkling soda');
            if (!await step(motion.pick(soda, { side: 'R', grip: [0, 0.17, 0], target: [-0.28, 1.147, -0.07], ms: 650 }))) return false;
            if (!await step(motion.pose({ side: 'R', target: [0.004, 1.20, 0.08], ms: 700 }))) return false;
            if (!await step(motion.animate({ ms: 1400, onFrame: t => { drawStream(soda, [0.062, 0.221, 0], [0.065, 1.027 + t * 0.087, 0.08]); currentGlass.userData.fill(0.05 + (recipe.fill - 0.05) * t); } }))) return false;
            stream.visible = false;
            if (!await step(motion.place({ side: 'R', target: sodaHome, ms: 700 }))) return false;
          } else {
            stage('Stirring gently over ice');
            if (!await step(motion.pick(spoon, { side: 'L', grip: [0, 0.17, 0], target: [0.35, 1.147, -0.045], ms: 650 }))) return false;
            if (!await step(motion.pose({ side: 'L', target: [0.065, 1.197, 0.08], ms: 650 }))) return false;
            if (!await step(motion.animate({ ms: 1650, onFrame: t => { spoon.rotation.z = Math.sin(t * Math.PI * 8) * 0.09; spoon.rotation.x = Math.cos(t * Math.PI * 8) * 0.09; } }))) return false;
            const sugar = currentGlass.getObjectByName('dissolving-sugar'); if (sugar) sugar.visible = false;
            spoon.rotation.set(0, 0, 0);
            if (!await step(motion.place({ side: 'L', target: spoonHome, ms: 650 }))) return false;
          }
          stage(`Finishing with ${recipe.garnish}`);
          garnish = makeGarnish(recipe.garnish); garnish.position.set(0.33, 1.014, -0.015); root.add(garnish);
          if (!await step(motion.pick(garnish, { side: 'L', grip: [0, 0, 0], target: [0.33, 1.014, -0.015], ms: 560 }))) return false;
          const garnishSpot = [0.088, 0.977 + currentGlass.userData.rimHeight - 0.005, 0.08];
          if (!await step(motion.place({ side: 'L', target: garnishSpot, ms: 640 }))) return false;
          currentGlass.attach(garnish); garnish = null;
          stage('Presenting your cocktail');
          if (!await step(motion.pick(currentGlass, { side: 'L', grip: [0, 0.058, 0], target: [0.065, 1.035, 0.08], ms: 560 }))) return false;
          if (!await step(motion.pose({ side: 'L', target: [0.20, 1.19, 0.18], ms: 580 }))) return false;
          if (!await step(motion.place({ side: 'L', target: [0.22, 1.089, 0.25], ms: 620 }))) return false;
          if (!await step(motion.animate({ ms: 700, onFrame: t => { currentGlass.position.z = 0.25 + 0.24 * (1 - (1 - t) ** 2); } }))) return false;
          if (!await step(motion.rest())) return false;
          currentGlass.userData.drink = drink;
          stage(`${recipe.name} ready · ${recipe.garnish} garnish`);
          return true;
        } finally {
          if (run === generation) { stream.visible = false; service.busy = false; }
        }
      },
    };
    root.userData.service = service;
    root.userData.sign = root.getObjectByName('bar-sign');
    root.userData.dimensions = { width: 4.16, front: 0.65, counterY: 1.085, workY: 0.977, actorZ: -0.4 };
    root.userData.models = { bottle, shaker, spoon, soda, stream, napkin, garnishTray };
    return root;
  }

  C.floor.buildBarStation = buildBarStation;
})();
