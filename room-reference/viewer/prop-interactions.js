import * as THREE from 'three';

const normalize = name => String(name || '').toLowerCase().replace(/[\\/_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const ease = t => 1 - Math.pow(1 - t, 3);

export function scoreStopwatch(milliseconds) {
  const difference = (milliseconds - 5000) / 1000;
  return {
    seconds: (milliseconds / 1000).toFixed(2),
    difference: Math.abs(difference).toFixed(2),
    message: Math.abs(difference) < .005 ? 'Exactly five seconds. Perfect timing!'
      : `${Math.abs(difference).toFixed(2)} seconds ${difference < 0 ? 'early' : 'late'}. Try again?`,
  };
}

/** Uses the viewer's scheduler. Nothing animates, plays, or starts a timer on its own. */
export function createPropInteractions(model, {
  invalidate = () => {}, onAction = () => {}, toast = () => {}, reducedMotion = false,
  onLightingChange = () => {}, onModalChange = () => {},
} = {}) {
  const entries = [], animations = new Map(), undo = [], owned = new Set();
  let disposed = false, dialog = null, watch = null, sound = null;
  let webcamState = null;
  const lighting = { warmOn: true, blindOpen: false };
  const added = new THREE.Group(); added.name = 'Interactions / room discoveries'; model.add(added);
  model.updateWorldMatrix(true, true);
  const findAll = predicate => {
    const result = []; model.traverse(object => { if (!object.userData.layoutHidden && predicate(object, normalize(object.name))) result.push(object); }); return result;
  };
  const meshes = pattern => findAll((object, name) => object.isMesh && pattern.test(name));
  const own = resource => { owned.add(resource); return resource; };
  const material = (color, extra = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: .65, ...extra }));
  const mesh = (parent, name, geometry, mat, position = [0, 0, 0]) => {
    const object = new THREE.Mesh(own(geometry), mat); object.name = `Interactions / ${name}`;
    object.position.fromArray(position); object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  };
  const box = (parent, name, position, size, mat) => mesh(parent, name, new THREE.BoxGeometry(...size), mat, position);
  const addEntry = (id, label, objects, activate) => {
    if (!objects.length) return;
    const entry = { id, label, objects, activate: () => { if (!disposed) activate(); } };
    entries.push(entry);
    for (const object of objects) {
      const old = object.userData.actionId; object.userData.actionId = id;
      undo.push(() => { if (old === undefined) delete object.userData.actionId; else object.userData.actionId = old; });
    }
    return entry;
  };
  function animate(key, duration, apply, delay = 0) {
    if (reducedMotion) { apply(1); invalidate(); return; }
    animations.set(key, { elapsed: -delay, duration, apply }); invalidate();
  }
  function pivot(objects, parent, point, name) {
    const group = new THREE.Group(); group.name = `Interactions / ${name}`;
    group.position.copy(point); parent.add(group); group.updateWorldMatrix(true, true);
    for (const object of objects) {
      object.updateWorldMatrix(true, true);
      const previous = { parent: object.parent, matrix: object.matrix.clone(), auto: object.matrixAutoUpdate };
      const relative = new THREE.Matrix4().multiplyMatrices(group.matrixWorld.clone().invert(), object.matrixWorld);
      group.add(object); object.matrix.copy(relative); object.matrix.decompose(object.position, object.quaternion, object.scale);
      object.matrixAutoUpdate = false; object.matrixWorldNeedsUpdate = true;
      undo.push(() => {
        previous.parent.add(object); object.matrix.copy(previous.matrix);
        object.matrix.decompose(object.position, object.quaternion, object.scale);
        object.matrixAutoUpdate = previous.auto; object.matrixWorldNeedsUpdate = true;
      });
    }
    undo.push(() => group.removeFromParent()); return group;
  }
  const localBounds = (objects, parent) => {
    parent.updateWorldMatrix(true, true);
    const inverse = parent.matrixWorld.clone().invert(), bounds = new THREE.Box3();
    for (const root of objects) root.traverse(object => {
      if (!object.isMesh || object.userData.layoutHidden) return;
      object.geometry.computeBoundingBox();
      bounds.union(object.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld)));
    });
    return bounds;
  };

  // Rotate only the chair above the gas lift; ignore repeat clicks until it settles.
  const chair = model.getObjectByName('Chair / clean black gaming chair');
  if (chair) {
    const upper = chair.children.filter(object => !/gas lift|telescoping|five.star hub|caster assembly/i.test(object.name));
    const swivel = pivot(upper, chair, new THREE.Vector3(), 'chair swivel');
    addEntry('chair', 'Spin the gaming chair', [chair], () => {
      if (animations.has('chair')) return;
      animate('chair', 2.7, t => { swivel.rotation.y = t === 1 ? 0 : Math.PI * 2 * ease(t); });
    });
  }

  // Pivot each plush at its feet because the original meshes use room coordinates.
  const row = model.getObjectByName('Bed / photographed dolls on windowsill');
  const toys = row ? [...row.children].map((toy, i) => {
    const bounds = localBounds([toy], row), point = bounds.getCenter(new THREE.Vector3()); point.y = bounds.min.y;
    const group = pivot([toy], row, point, `plush ${i + 1} reaction`);
    return { toy, group, point, index: i };
  }) : [];
  const react = (toy, delay = 0) => {
    if (animations.has(`plush-${toy.index}`)) return;
    animate(`plush-${toy.index}`, 1.05, t => {
      const pulse = Math.sin(t * Math.PI * 3) * Math.pow(1 - t, 2);
      toy.group.scale.set(1 + Math.max(0, pulse) * .1, 1 - Math.max(0, pulse) * .19, 1 + Math.max(0, pulse) * .08);
      toy.group.position.y = toy.point.y + Math.max(0, -pulse) * .055;
      toy.group.rotation.x = toy.index % 3 === 1 ? pulse * .13 : 0;
      if (t === 1) { toy.group.scale.setScalar(1); toy.group.position.copy(toy.point); toy.group.rotation.x = 0; }
    }, delay);
  };
  const ripple = () => { toys.forEach((toy, i) => react(toy, i * .075)); };
  toys.forEach(toy => addEntry(`plush-${toy.index + 1}`, `${toy.toy.userData.display_name || toy.toy.name.replace('Bed / ', '')} — tap to play`, [toy.toy], () => {
    if (toy.index === 0) { ripple(); toast('A little hello from the whole windowsill.'); } else react(toy);
  }));
  if (row) addEntry('plush-ripple', 'Make the plush row wave', [row], ripple);

  const pillows = meshes(/^bed full charcoal warm white striped cotton pillow/);
  if (pillows.length) {
    const bounds = localBounds(pillows, model), point = bounds.getCenter(new THREE.Vector3()); point.y = bounds.min.y;
    const group = pivot(pillows, model, point, 'pillow spring'); let presses = 0;
    addEntry('pillow', 'Five more minutes — squish the pillow', [group], () => {
      if (animations.has('pillow')) return;
      if (++presses % 3 === 0) toast('Five more minutes…');
      animate('pillow', 1.05, t => {
        const spring = Math.sin(t * Math.PI * 3) * Math.pow(1 - t, 2);
        group.scale.set(1 + spring * .06, 1 - spring * .27, 1 + spring * .06);
      });
    });
  }

  const doorParts = meshes(/^(oak entrance door|door |lever handle)/).filter(object => object.userData.closedEntranceDoor);
  if (doorParts.length) {
    const hinge = new THREE.Vector3().fromArray(model.userData.closedEntranceDoor?.hinge || [0, 0, -.1]);
    const door = pivot(doorParts, model, hinge, 'entrance hinge');
    const levers = doorParts.filter(object => /^lever handle/.test(normalize(object.name)));
    const handles = levers.map((lever, i) => {
      const bounds = localBounds([lever], door), point = bounds.getCenter(new THREE.Vector3()); point.z = bounds.max.z;
      return pivot([lever], door, point, `door handle ${i + 1}`);
    });
    let open = false;
    addEntry('door', 'Try the door', [door], () => {
      open = !open; const from = door.rotation.y, to = open ? -.21 : 0;
      animate('door', .8, t => { door.rotation.y = THREE.MathUtils.lerp(from, to, ease(t)); });
      animate('handle', .7, t => { handles.forEach(handle => { handle.rotation.x = Math.sin(t * Math.PI) * .24; }); });
      onAction('door');
    });
  }

  const blindCloth = meshes(/^dark grey roller blind/), blindBars = meshes(/^blind lower weighted bar/);
  let blindGroup = null, blindBarGroup = null, blindTravel = 0;
  if (blindCloth.length) {
    const bounds = localBounds(blindCloth, model), point = bounds.getCenter(new THREE.Vector3()); point.y = bounds.max.y;
    blindTravel = bounds.max.y - bounds.min.y;
    blindGroup = pivot(blindCloth, model, point, 'blind roll');
    if (blindBars.length) blindBarGroup = pivot(blindBars, model, new THREE.Vector3(), 'blind weighted bar');
  }
  function setLighting(next = {}) {
    const changedBlind = typeof next.blindOpen === 'boolean' && next.blindOpen !== lighting.blindOpen;
    if (typeof next.warmOn === 'boolean') lighting.warmOn = next.warmOn;
    if (typeof next.blindOpen === 'boolean') lighting.blindOpen = next.blindOpen;
    if (changedBlind && blindGroup) {
      const from = blindGroup.scale.y, to = lighting.blindOpen ? .12 : 1;
      animate('blind', 1.2, t => {
        const amount = THREE.MathUtils.lerp(from, to, ease(t)); blindGroup.scale.y = amount;
        if (blindBarGroup) blindBarGroup.position.y = blindTravel * (1 - amount);
      });
    }
    invalidate();
  }
  addEntry('blind', 'Roll the blind / change daylight', [...blindCloth, ...blindBars, ...meshes(/^blind (pull loop|chain bead|roll)/)], () => {
    setLighting({ blindOpen: !lighting.blindOpen }); onLightingChange({ ...lighting });
    toast(lighting.blindOpen ? 'Good morning, daylight.' : 'Blind down. A little privacy.');
  });
  addEntry('pendant', 'Switch the warm pendant light', meshes(/^(pendant |bulb socket|warm hanging bulb)/), () => {
    setLighting({ warmOn: !lighting.warmOn }); onLightingChange({ ...lighting });
    toast(lighting.warmOn ? 'Warm light on.' : 'Warm light off.');
  });

  function labelTexture(title, subtitle, dark = true) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 448;
    const context = canvas.getContext('2d'); if (!context) return null;
    context.fillStyle = dark ? '#17252d' : '#f3ecdc'; context.fillRect(0, 0, 768, 448);
    context.fillStyle = dark ? '#89c6b3' : '#48766a'; context.font = '500 27px Arial'; context.fillText('HILLMAN CHAN', 50, 66);
    context.fillStyle = dark ? '#faf6ec' : '#243f42'; context.font = `600 ${title.length > 12 ? 62 : 75}px Arial`; context.fillText(title, 48, 208);
    context.fillStyle = dark ? '#bed0d0' : '#586965'; context.font = '28px Arial'; context.fillText(subtitle, 51, 274);
    context.fillStyle = dark ? '#89c6b3' : '#48766a'; context.fillRect(50, 326, 668, 2); context.font = '24px Arial'; context.fillText('CLICK TO EXPLORE  →', 51, 377);
    const texture = own(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }
  for (const [id, title, subtitle, pattern] of [
    ['experience', 'Experience', 'Career, skills & education', /^laptop illuminated document/],
    ['projects', 'Projects', 'Selected work & experiments', /^monitor illuminated display/],
  ]) {
    const screens = meshes(pattern);
    for (const screen of screens) {
      const previous = screen.material;
      const map = labelTexture(title, subtitle);
      // GLTF UVs have their origin at the top, unlike our procedural cards.
      if (map) map.flipY = false;
      screen.material = own(new THREE.MeshBasicMaterial({ map, color: 0xffffff, toneMapped: false, side: THREE.DoubleSide }));
      undo.push(() => { screen.material = previous; });
    }
    const objects = meshes(id === 'experience' ? /^(laptop |computers macbook)/ : /^(monitor |computers dell)/);
    addEntry(id, title, objects, () => onAction(id));
  }

  const webcam = model.getObjectByName('Computers / Logitech Brio webcam');
  const webcamLeaves = meshes(/^computers logitech brio privacy shutter (upper|lower) leaf$/);
  if (webcam && webcamLeaves.length === 2) {
    const slides = webcamLeaves.map(leaf => ({ leaf, closedY: leaf.position.y, travel: leaf.userData.privacySlideDirection * leaf.userData.privacySlideTravel }));
    undo.push(() => slides.forEach(({ leaf, closedY }) => { leaf.position.y = closedY; }));
    webcamState = { open: false, amount: 0 };
    // A raycast-only target surrounds the small webcam body. Its lower edge
    // remains above the monitor housing, so it cannot steal display clicks.
    const body = webcam.getObjectByName('Computers / Logitech Brio / graphite rounded horizontal body');
    const bodyCenter = localBounds([body], webcam).getCenter(new THREE.Vector3());
    const target = box(webcam, 'webcam touch target', [bodyCenter.x - .002, bodyCenter.y + .0015, bodyCenter.z], [.072, .051, .112], own(new THREE.MeshBasicMaterial({ visible: false })));
    target.castShadow = target.receiveShadow = false;
    target.userData.interactionHitTarget = true;
    undo.push(() => target.removeFromParent());
    addEntry('webcam', 'Open / close the webcam privacy cover', [webcam], () => {
      webcamState.open = !webcamState.open;
      const from = webcamState.amount, to = webcamState.open ? 1 : 0;
      animate('webcam', .45, t => {
        webcamState.amount = THREE.MathUtils.lerp(from, to, ease(t));
        for (const { leaf, closedY, travel } of slides) leaf.position.y = closedY + travel * webcamState.amount;
      });
    });
  }

  const desk = meshes(/^desk laminate surface/)[0];
  const deskBounds = desk ? localBounds([desk], model) : new THREE.Box3(new THREE.Vector3(1.4, .72, -2.4), new THREE.Vector3(2, .76, -1.2));
  const deskY = deskBounds.max.y + .008, front = deskBounds.max.z;

  // A paper-and-oak wall guide sits above the shelf and bed. Its inward face is
  // measured from the actual wall, so no text floats through the plaster.
  const rightWall = meshes(/^shell right$/)[0];
  const wallX = rightWall ? localBounds([rightWall], model).min.x : model.userData.layout?.dimensions?.width || deskBounds.max.x + .02;
  const guide = new THREE.Group(); guide.name = 'Interactions / CLICK ME wall guide';
  // Keep it behind the desk so the tall wardrobe cannot hide it in the overview.
  guide.position.set(wallX - .013, 1.94, deskBounds.min.z - .40);
  guide.rotation.y = -Math.PI / 2;
  Object.assign(guide.userData, {
    wall_side: 'right', display_name: 'CLICK ME — room guide', guideExpanded: false,
    description: 'A handwritten invitation. Tap to reveal a few ways to explore the room.',
  });
  added.add(guide);
  box(guide, 'wall guide oak backing', [0, 0, 0], [.98, .60, .016], material(0x8f7050, { roughness: .86 }));
  const guideCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (guideCanvas) { guideCanvas.width = 1024; guideCanvas.height = 620; }
  const guideContext = guideCanvas?.getContext('2d');
  const guideMap = guideContext ? own(new THREE.CanvasTexture(guideCanvas)) : null;
  if (guideMap) { guideMap.colorSpace = THREE.SRGBColorSpace; guideMap.anisotropy = 4; }
  const guideFace = mesh(guide, 'wall guide printed face', new THREE.PlaneGeometry(.948, .568),
    own(new THREE.MeshBasicMaterial({ map: guideMap, color: guideMap ? 0xffffff : 0xf4e6c8, toneMapped: false })), [0, 0, .0085]);
  guideFace.castShadow = false;
  function paintGuide(expanded) {
    guide.userData.guideExpanded = expanded;
    if (!guideContext) return;
    const c = guideContext;
    c.fillStyle = '#f4e6c8'; c.fillRect(0, 0, 1024, 620);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // Slightly uneven ink lines and corner marks make this feel pinned in a room.
    c.strokeStyle = '#657a69'; c.lineWidth = 3; c.beginPath();
    c.moveTo(28, 38); c.lineTo(993, 31); c.lineTo(988, 587); c.lineTo(34, 592); c.closePath(); c.stroke();
    c.strokeStyle = '#b7b694'; c.lineWidth = 1.5; c.beginPath();
    c.moveTo(35, 30); c.lineTo(997, 39); c.lineTo(996, 580); c.stroke();
    const hand = "'Chalkboard SE', 'Comic Sans MS', 'Trebuchet MS', cursive";
    if (!expanded) {
      c.textAlign = 'center';
      c.fillStyle = '#657a69'; c.font = `29px ${hand}`; c.fillText('A LITTLE NOTE FOR YOU', 512, 122);
      c.fillStyle = '#29483f'; c.font = `bold 150px ${hand}`; c.fillText('CLICK ME', 512, 321);
      c.strokeStyle = '#b7684e'; c.lineWidth = 8; c.beginPath();
      c.moveTo(153, 351); c.quadraticCurveTo(509, 365, 858, 346); c.stroke();
      c.fillStyle = '#526454'; c.font = `38px ${hand}`; c.fillText('There’s more to this little room.', 512, 433);
      c.font = `29px ${hand}`; c.fillText('Tap for a few friendly pointers.', 512, 502);
      c.fillStyle = '#9b684f'; c.font = `24px ${hand}`; c.fillText('— make yourself comfortable —', 512, 556);
    } else {
      c.textAlign = 'left'; c.fillStyle = '#29483f'; c.font = `bold 55px ${hand}`;
      c.fillText('Hi! I’m Hillman', 70, 112);
      const instructions = [
        'MacBook · Experience',
        'Dell · Projects',
        'Little objects · Games & surprises',
        'Make your own house',
      ];
      instructions.forEach((line, index) => {
        const y = 205 + index * 84;
        c.fillStyle = '#ad7652'; c.font = `25px ${hand}`; c.fillText(String(index + 1).padStart(2, '0'), 72, y);
        c.fillStyle = '#394f45'; c.font = `39px ${hand}`; c.fillText(line, 124, y);
      });
      c.fillStyle = '#8e654d'; c.textAlign = 'center'; c.font = `24px ${hand}`;
      c.fillText('Make yourself at home.', 512, 562);
    }
    guideMap.needsUpdate = true;
  }
  paintGuide(false);
  addEntry('wall-guide', 'CLICK ME — a little room guide', [guide], () => {
    paintGuide(true); invalidate(); onAction('guide');
  });

  function flatCard(id, title, subtitle, position, size, color) {
    const group = new THREE.Group(); group.name = `Interactions / ${title}`; added.add(group); group.position.fromArray(position);
    box(group, `${title} body`, [0, 0, 0], size, material(color));
    const face = mesh(group, `${title} printed cover`, new THREE.PlaneGeometry(size[2] * .94, size[0] * .94), own(new THREE.MeshBasicMaterial({ map: labelTexture(title, subtitle, false), color: 0xffffff, toneMapped: false })), [0, size[1] / 2 + .0002, 0]);
    face.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));
    addEntry(id, `${title}${id === 'contact' ? ' — email & social links' : ' — discover the game'}`, [group], () => onAction(id)); return group;
  }
  flatCard('contact', 'Say hello', 'Email · LinkedIn · GitHub', [deskBounds.min.x + .10, deskY, front - .18], [.11, .004, .18], 0xf0e7d6);
  const notebook = flatCard('siuheibou', 'Siu Hei Bou', '小氣簿 · a little red notebook', [deskBounds.max.x - .13, deskY + .006, front - .16], [.115, .016, .16], 0x9a2633);
  notebook.children[1].material.color.set(0xeaaa9e);
  // Narrow shelf props stay inside the existing top, keeping the floor clear.
  const shelf = findAll(object => object.userData.proceduralStorage)[0];
  const cube = new THREE.Group(); cube.name = 'Interactions / Rubik’s Cube'; (shelf || added).add(cube);
  if (shelf) { cube.position.set(-.215, 1.048, .057); undo.push(() => cube.removeFromParent()); }
  else cube.position.set(1.55, 1.05, -2.56);
  const cubeBlack = material(0x101819), cubeSize = .055;
  box(cube, 'Rubik cube core', [0, 0, 0], [cubeSize, cubeSize, cubeSize], cubeBlack);
  const colors = [0xe6e4d8, 0xeeb52b, 0xcf3d37, 0xe48433, 0x3e9371, 0x4278b0].map(color => material(color));
  const faces = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]];
  for (const [f, [axis, sign]] of faces.entries()) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const position = [0, 0, 0], size = [.0158, .0158, .0158], other = [0, 1, 2].filter(value => value !== axis);
    position[axis] = sign * (cubeSize / 2 + .0003); position[other[0]] = a * .018; position[other[1]] = b * .018; size[axis] = .001;
    box(cube, 'Rubik coloured tile', position, size, colors[f]);
  }
  addEntry('rubiks', 'Rubik’s Cube — Rubik’s Cube Practice', [cube], () => onAction('rubiks'));
  const slippers = new THREE.Group(); slippers.name = 'Interactions / slippers by wardrobe'; added.add(slippers);
  const fabric = material(0x48565b), sole = material(0xb7b5a9);
  for (const [index, x] of [1.08, 1.21].entries()) {
    const slipper = new THREE.Group(); slipper.position.set(x, .025, -.48 - index * .03); slipper.rotation.y = -.18 + index * .25; slippers.add(slipper);
    const foot = mesh(slipper, 'slipper soft sole', new THREE.SphereGeometry(1, 18, 10), sole); foot.scale.set(.047, .015, .102);
    const top = mesh(slipper, 'slipper fabric upper', new THREE.SphereGeometry(1, 18, 10), fabric, [0, .020, -.030]); top.scale.set(.049, .035, .062);
  }
  addEntry('dasiuyan', 'Slippers — 打小人 Da Siu Yan', [slippers], () => onAction('dasiuyan'));

  // The HUGO print moves with the upper lid; glasses are contained below it.
  const hugo = model.getObjectByName('Storage / Stacked red HUGO eyewear boxes');
  if (hugo) {
    const lids = [...hugo.children].filter(object => /red HUGO hinged lid/.test(object.name)).sort((a, b) => b.position.y - a.position.y);
    const top = lids[0];
    if (top) {
      const bounds = localBounds([top], hugo), point = bounds.getCenter(new THREE.Vector3()); point.x = bounds.max.x;
      const lettering = hugo.children.filter(object => /black HUGO lettering/.test(object.name));
      const lid = pivot([top, ...lettering], hugo, point, 'HUGO lid');
      const contents = new THREE.Group(); hugo.add(contents); undo.push(() => contents.removeFromParent());
      const base = [...hugo.children].filter(object => /red HUGO case base/.test(object.name)).sort((a, b) => b.position.y - a.position.y)[0];
      if (base) {
        const original = base.geometry; base.geometry = own(openBoxTop(original));
        undo.push(() => { base.geometry = original; });
      }
      const center = bounds.getCenter(new THREE.Vector3()); center.y -= .016;
      const velvet = material(0x291e24);
      box(contents, 'HUGO velvet lining', center.toArray(), [.075, .002, .137], velvet);
      for (const side of [-1, 1]) {
        box(contents, 'HUGO inside long wall', [center.x + side * .038, center.y + .006, center.z], [.002, .014, .139], velvet);
        box(contents, 'HUGO inside end wall', [center.x, center.y + .006, center.z + side * .069], [.077, .014, .002], velvet);
      }
      for (const z of [-.027, .027]) {
        const lens = mesh(contents, 'glasses rim', new THREE.TorusGeometry(.017, .0013, 6, 24), material(0x121717), [center.x, center.y + .002, center.z + z]);
        lens.rotation.x = Math.PI / 2; lens.scale.x = .8;
      }
      box(contents, 'glasses bridge', [center.x, center.y + .002, center.z], [.002, .002, .020], material(0x151818));
      contents.visible = false; let open = false;
      addEntry('hugo', 'Open the HUGO eyewear box', [hugo], () => {
        open = !open; const from = lid.rotation.z, to = open ? -1.15 : 0;
        animate('hugo', .65, t => { lid.rotation.z = THREE.MathUtils.lerp(from, to, ease(t)); contents.visible = Math.abs(lid.rotation.z) > .08; });
      });
    }
  }

  const airpods = model.getObjectByName('Storage / White AirPods Pro case');
  if (airpods) {
    const body = airpods.getObjectByName('Storage / AirPods Pro charging case');
    if (body) {
      const originalGeometry = body.geometry, cut = .004;
      body.geometry = own(sliceGeometry(originalGeometry, cut, false)); undo.push(() => { body.geometry = originalGeometry; });
      const top = mesh(airpods, 'AirPods opening lid', sliceGeometry(originalGeometry, cut, true), body.material, body.position.toArray());
      undo.push(() => top.removeFromParent());
      const lining = mesh(airpods, 'AirPods lid inner lining', new THREE.SphereGeometry(1, 24, 12), material(0xeceee7), [body.position.x, body.position.y + cut + .001, body.position.z]);
      lining.scale.set(.021, .0014, .030); undo.push(() => lining.removeFromParent());
      const lid = pivot([top, lining], airpods, new THREE.Vector3(body.position.x + .022, body.position.y + cut, body.position.z), 'AirPods hinge');
      const contents = new THREE.Group(); airpods.add(contents); undo.push(() => contents.removeFromParent());
      box(contents, 'AirPods interior tray', [body.position.x, body.position.y + cut - .001, body.position.z], [.034, .003, .049], material(0xd9dfd9));
      for (const z of [-.015, .015]) {
        const bud = mesh(contents, 'AirPods white earbud', new THREE.SphereGeometry(.008, 14, 10), material(0xf4f5ee), [body.position.x - .003, body.position.y + cut + .002, body.position.z + z]);
        bud.scale.set(.9, .65, 1);
      }
      contents.visible = false; let open = false;
      addEntry('airpods', 'Open the AirPods case', [airpods], () => {
        open = !open; const from = lid.rotation.z, to = open ? -1.35 : 0;
        animate('airpods', .6, t => { lid.rotation.z = THREE.MathUtils.lerp(from, to, ease(t)); contents.visible = Math.abs(lid.rotation.z) > .08; });
      });
    }
  }

  function closeDialog() {
    if (!dialog) return;
    sound?.dispose(); sound = null;
    watch = null; const previous = dialog.previous;
    dialog.node.close(); dialog.node.remove(); dialog = null; onModalChange(false);
    const returnTarget = previous?.getClientRects?.().length ? previous : document.getElementById('actions-button');
    returnTarget?.focus?.(); invalidate();
  }
  function openDialog(title) {
    if (typeof document === 'undefined') return null;
    closeDialog();
    const previous = document.activeElement, node = document.createElement('dialog');
    node.setAttribute('aria-label', title);
    node.style.cssText = '--muted:#52665f;width:min(420px,calc(100vw - 36px));max-height:calc(100dvh - 40px);overflow:auto;box-sizing:border-box;border:1px solid #cec6b7;border-radius:20px;padding:26px;background:#f6f0e5;color:#263b3b;box-shadow:0 24px 100px #0008;font:16px/1.55 system-ui,sans-serif;';
    const heading = document.createElement('h2'); heading.textContent = title; heading.style.cssText = 'font-size:26px;line-height:1.15;margin:0 0 14px'; node.append(heading);
    const content = document.createElement('div'); node.append(content);
    const close = button(node, 'Back to room', closeDialog); close.style.marginTop = '22px';
    node.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
    node.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...node.querySelectorAll('button,input,a[href],iframe')].filter(element => !element.disabled);
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    });
    document.body.append(node); dialog = { node, previous }; onModalChange(true); node.showModal(); return content;
  }
  function button(parent, text, action) {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
    element.style.cssText = 'min-height:46px;padding:10px 17px;margin:6px 8px 0 0;border:1px solid #718984;border-radius:10px;background:#244c48;color:#fff;font:600 15px system-ui;cursor:pointer;';
    element.addEventListener('click', action); parent.append(element); return element;
  }
  function paragraph(parent, text) { const element = document.createElement('p'); element.textContent = text; parent.append(element); return element; }

  const watchObjects = findAll(object => object.name === 'Storage / Black G-Shock watch');
  addEntry('watch', 'G-Shock — stop at exactly 5 seconds', watchObjects, () => {
    const content = openDialog('Stop at exactly 5 seconds'); if (!content) return;
    paragraph(content, 'Start, count in your head, then stop. Your watch keeps the result to a hundredth of a second.');
    const readout = paragraph(content, '0.00'); readout.style.cssText = 'font:600 44px ui-monospace,monospace;letter-spacing:3px;margin:16px 0';
    const feedback = paragraph(content, 'Ready when you are.'); feedback.setAttribute('aria-live', 'polite');
    let startTime = 0, running = false;
    const trigger = button(content, 'Start challenge', () => {
      if (!running) {
        running = true; startTime = performance.now(); readout.textContent = '?.??'; trigger.textContent = 'Stop the watch'; feedback.textContent = 'Counting…';
        watch = { expire: startTime + 30000, stop: () => finish('Time is up — try again.') }; invalidate();
      } else finish();
    });
    function finish(timeout) {
      const score = scoreStopwatch(performance.now() - startTime); running = false; watch = null;
      readout.textContent = score.seconds; feedback.textContent = timeout || score.message; trigger.textContent = 'Play again'; invalidate();
    }
    trigger.focus();
  });
  addEntry('speakers', 'Speakers — Sk8er Boi', meshes(/^speaker [12] /), () => {
    const content = openDialog('Sk8er Boi'); if (!content) return;
    content.parentElement.style.width = 'min(640px,calc(100vw - 24px))';
    paragraph(content, 'Avril Lavigne · Official music video');
    const status = paragraph(content, 'Sound is off. Play opens the official YouTube player.'); status.setAttribute('role', 'status');
    const play = button(content, 'Play Sk8er Boi', () => { if (sound.active) sound.pause(); else sound.play(); });
    const playerHost = document.createElement('div'); playerHost.style.marginTop = '16px'; content.append(playerHost);
    paragraph(content, 'Use the player controls to pause, mute, or change the volume.');
    const fallback = document.createElement('a'); fallback.href = 'https://www.youtube.com/watch?v=TIy3n2b7V9k';
    fallback.target = '_blank'; fallback.rel = 'noopener noreferrer'; fallback.textContent = 'Open the official video on YouTube ';
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [name, value] of Object.entries({ class: 'room-icon', viewBox: '0 0 24 24', width: '1em', height: '1em', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) arrow.setAttribute(name, value);
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M7 17 17 7M7 7h10v10'); arrow.append(arrowPath); fallback.append(arrow);
    fallback.style.cssText = 'display:inline-block;padding:10px 0;color:#244c48;text-underline-offset:3px;'; content.append(fallback);
    sound = createRoomSong(playerHost, status, active => { play.textContent = active ? 'Stop music' : 'Play Sk8er Boi'; });
    play.focus();
  });

  return {
    entries, setLighting, get lighting() { return { ...lighting }; }, closeDialog,
    get webcam() { return webcamState ? { ...webcamState } : null; },
    suspendAudio() { sound?.pause(); },
    update(dt) {
      if (disposed) return false;
      for (const [key, animation] of animations) {
        animation.elapsed += Math.max(0, Number.isFinite(dt) ? dt : 0);
        if (animation.elapsed < 0) continue;
        const t = Math.min(1, animation.elapsed / animation.duration); animation.apply(t);
        if (t === 1) animations.delete(key);
      }
      if (watch && performance.now() >= watch.expire) watch.stop();
      return animations.size > 0 || Boolean(watch);
    },
    dispose() {
      if (disposed) return; disposed = true; closeDialog(); animations.clear(); sound?.dispose();
      for (const restore of undo.reverse()) restore(); added.removeFromParent();
      owned.forEach(resource => resource.dispose());
    },
  };
}

function openBoxTop(source) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  const names = Object.keys(geometry.attributes), output = Object.fromEntries(names.map(name => [name, []]));
  for (let i = 0; i < position.count; i += 3) {
    // Remove just the upward flat surface. The exterior bevel and sides stay intact.
    if ([0, 1, 2].every(offset => normal.getY(i + offset) > .99)) continue;
    for (const name of names) {
      const attribute = geometry.getAttribute(name);
      for (let n = i * attribute.itemSize; n < (i + 3) * attribute.itemSize; n++) output[name].push(attribute.array[n]);
    }
  }
  const result = new THREE.BufferGeometry();
  for (const name of names) result.setAttribute(name, new THREE.Float32BufferAttribute(output[name], geometry.getAttribute(name).itemSize));
  geometry.dispose(); result.computeBoundingBox(); result.computeBoundingSphere(); return result;
}

// Clip the existing rounded case into complementary surfaces, retaining its
// photographed exterior instead of replacing it with a generic box.
function sliceGeometry(source, height, upper) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const names = ['position', 'normal', 'uv'].filter(name => geometry.getAttribute(name));
  const output = Object.fromEntries(names.map(name => [name, []]));
  for (let i = 0; i < geometry.attributes.position.count; i += 3) {
    let vertices = [0, 1, 2].map(offset => Object.fromEntries(names.map(name => {
      const attribute = geometry.getAttribute(name); return [name, Array.from({ length: attribute.itemSize }, (_, k) => attribute.array[(i + offset) * attribute.itemSize + k])];
    })));
    const clipped = [];
    for (let v = 0; v < vertices.length; v++) {
      const a = vertices[v], b = vertices[(v + 1) % vertices.length];
      const insideA = upper ? a.position[1] >= height : a.position[1] <= height;
      const insideB = upper ? b.position[1] >= height : b.position[1] <= height;
      if (insideA) clipped.push(a);
      if (insideA !== insideB) {
        const t = (height - a.position[1]) / (b.position[1] - a.position[1]);
        clipped.push(Object.fromEntries(names.map(name => [name, a[name].map((value, k) => THREE.MathUtils.lerp(value, b[name][k], t))])));
      }
    }
    for (let v = 1; v < clipped.length - 1; v++) for (const vertex of [clipped[0], clipped[v], clipped[v + 1]]) for (const name of names) output[name].push(...vertex[name]);
  }
  const result = new THREE.BufferGeometry();
  for (const name of names) result.setAttribute(name, new THREE.Float32BufferAttribute(output[name], geometry.getAttribute(name).itemSize));
  geometry.dispose(); result.computeBoundingBox(); result.computeBoundingSphere(); return result;
}

function createRoomSong(host, status, onActiveChange) {
  const document = host.ownerDocument, window = document.defaultView;
  let frame = null, timeout = null, disposed = false;
  const clearTimer = () => { if (timeout !== null) window.clearTimeout(timeout); timeout = null; };
  const pause = (message = 'Music stopped. Press Play to start again.') => {
    clearTimer(); frame?.remove(); frame = null;
    status.textContent = message; onActiveChange(false);
  };
  const visibility = () => { if (document.hidden) pause(); };
  document.addEventListener('visibilitychange', visibility);
  return {
    get active() { return Boolean(frame); },
    play() {
      if (disposed || frame || document.hidden) return;
      // Official Artist Channel video, verified 2026-10-07. The iframe is
      // created only by the explicit Play click; no media is fetched earlier.
      const next = document.createElement('iframe'); frame = next;
      next.title = 'Avril Lavigne — Sk8er Boi (Official Video)';
      next.src = 'https://www.youtube-nocookie.com/embed/TIy3n2b7V9k?autoplay=1&controls=1&playsinline=1&rel=0';
      next.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; next.allowFullscreen = true;
      next.referrerPolicy = 'strict-origin-when-cross-origin';
      next.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;min-height:200px;border:0;border-radius:10px;background:#101918;';
      next.addEventListener('load', () => {
        if (frame !== next) return;
        clearTimer(); status.textContent = 'Use YouTube’s controls to play, pause, mute, and adjust volume. If it cannot play here, use the official YouTube link below.';
      });
      const failed = () => { if (frame === next) pause('The player could not open here. Use the official YouTube link below.'); };
      next.addEventListener('error', failed);
      timeout = window.setTimeout(failed, 12000);
      status.textContent = 'Opening the official player…'; host.append(next); onActiveChange(true);
    },
    pause,
    dispose() { if (disposed) return; disposed = true; pause(); document.removeEventListener('visibilitychange', visibility); },
  };
}
