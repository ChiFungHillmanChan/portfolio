import * as THREE from 'three';

const normalize = (name) => String(name).toLowerCase().replace(/[\/_]+/g, ' ').replace(/\s+/g, ' ').trim();
const noop = () => {};

/** Furniture uses the viewer's single scheduler. update receives seconds. */
export function createFurnitureInteractions(model, { invalidate = noop, onAction = noop, reducedMotion = false } = {}) {
  const entries = [], motions = [], added = [], moved = [], hidden = [];
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const state = {};
  let disposed = false;
  const geometry = (value) => { geometries.add(value); return value; };
  const material = (color, roughness = .86) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness });
    materials.add(value); return value;
  };
  const M = {
    wood: material(0xb4a493), floor: material(0x807466), charcoal: material(0x333e41),
    cream: material(0xe5dfd0), blue: material(0x637e90), rose: material(0xb58f90),
    red: material(0xad3c34), yellow: material(0xecc253),
    metal: material(0xaaa9a3, .32), card: material(0xf6efdc), white: material(0xe5e3d9, .46),
  };
  const cube = geometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = geometry(new THREE.SphereGeometry(1, 12, 8));
  function group(parent, name) {
    const object = new THREE.Group(); object.name = name; parent.add(object); added.push(object); return object;
  }
  function mesh(parent, name, shape, mat, position, scale) {
    const object = new THREE.Mesh(shape, mat); object.name = name;
    object.position.set(...position); if (scale) object.scale.set(...scale);
    object.castShadow = object.receiveShadow = true;
    object.userData.furnitureInterior = true; parent.add(object); return object;
  }
  const box = (parent, name, position, size, mat = M.wood) => mesh(parent, name, cube, mat, position, size);
  const ball = (parent, name, position, size, mat) => mesh(parent, name, sphere, mat, position, size);
  function relocate(object, parent) {
    moved.push({ object, parent: object.parent, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone(), matrix: object.matrix.clone() });
    parent.attach(object);
  }
  function hide(object) {
    hidden.push({ object, visible: object.visible, layoutHidden: object.userData.layoutHidden });
    object.visible = false; object.userData.layoutHidden = true;
  }
  function entry(id, label, objects, activate, extra = {}) {
    const value = { id, label, objects, activate, ...extra };
    for (const object of objects) object.userData.actionId = id;
    entries.push(value); return value;
  }
  function moving(id, label, object, apply, extra = {}) {
    const motion = { id, object, value: 0, target: 0, apply };
    motions.push(motion); state[id] = { open: false, amount: 0, ...extra };
    const value = entry(id, label, [object], () => {
      if (disposed) return;
      motion.target = motion.target ? 0 : 1;
      state[id].open = Boolean(motion.target);
      if (reducedMotion) { motion.value = motion.target; apply(motion.value); state[id].amount = motion.value; }
      invalidate();
    }, extra);
    return { motion, entry: value };
  }
  function folded(parent, x, y, z, width, depth, color, layers = 2) {
    for (let layer = 0; layer < layers; layer++) {
      const item = box(parent, 'Folded clothing / soft layer', [x, y + layer * .019, z], [width, .018, depth], color);
      // A shallow rolled edge catches light and makes each fold legible.
      ball(parent, 'Folded clothing / rounded edge', [x - width / 2, y + layer * .019, z], [.008, .009, depth / 2], color);
      item.rotation.y = layer * .025;
    }
  }
  function printedTop(parent, title, position, width, depth, background, ink, discovery) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 320;
    if (discovery) { canvas.width = 640; canvas.height = 500; }
    const context = canvas.getContext('2d'); if (!context) return;
    context.fillStyle = background; context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = ink; context.lineWidth = discovery ? 4 : 10; context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    context.fillStyle = ink; context.textAlign = 'center'; context.textBaseline = 'middle';
    if (discovery) {
      context.font = '600 27px sans-serif'; context.fillText(`DISCOVERY 0${discovery.row}`, 320, 75);
      context.font = 'bold 65px sans-serif'; context.fillText(title, 320, 210, 570);
      context.font = '500 29px sans-serif'; context.fillText(discovery.subtitle, 320, 278, 570);
      context.fillRect(88, 348, 464, 3);
      context.font = 'bold 31px sans-serif'; context.fillText('CLICK TO EXPLORE', 320, 410);
    } else {
      context.font = 'bold 53px sans-serif'; context.fillText(title, 256, 160, 455);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: .8 }); materials.add(mat);
    const label = mesh(parent, title + ' / printed lid', geometry(new THREE.PlaneGeometry(width, depth)), mat, position);
    label.rotation.set(-Math.PI / 2, 0, discovery ? -Math.PI / 2 : 0);
  }
  function game(id, label, parent, position, size, ownerMotion, color, title, discovery) {
    const prop = group(parent, 'Game prop / ' + label);
    box(prop, label + ' / box', position, size, color);
    printedTop(prop, title, [position[0], position[1] + size[1] / 2 + .0003, position[2]], (discovery ? size[2] : size[0]) * .95, (discovery ? size[0] : size[2]) * .95,
      discovery?.background || (id === 'cards' ? '#f6efdc' : '#ad3c34'), discovery?.ink || (id === 'cards' ? '#a63030' : '#fff3d0'), discovery);
    // Explicit eligibility supplements physical occlusion; keyboard/direct entry
    // activation must never bypass a closed drawer either.
    const enabled = () => !disposed && prop.visible && ownerMotion.value > .48;
    prop.userData.interactionEnabled = enabled;
    prop.visible = false;
    const previousApply = ownerMotion.apply;
    ownerMotion.apply = (amount) => { previousApply(amount); prop.visible = amount > .48; };
    entry(id, label, [prop], () => { if (enabled()) onAction(id); }, { enabled, available: enabled, ...(discovery ? { focusAction: `fabric-${discovery.row}` } : {}) });
    return prop;
  }

  const storage = model.getObjectByName('Storage • 30 cm fabric drawers');
  if (storage) {
    const discoveries = [
      { id: 'drawer-rubiks', label: 'Rubik’s Cube Practice', title: 'RUBIK’S CUBE', subtitle: 'PRACTICE', color: M.blue, background: '#385a6b', ink: '#fff4de' },
      { id: 'drawer-connect4', label: 'Connect 4', title: 'CONNECT 4', subtitle: 'YOU VS MACHINE', color: M.red, background: '#ad3c34', ink: '#fff3d0' },
      { id: 'drawer-siuheibou', label: '小氣簿 Siu Hei Bou', title: 'SIU HEI BOU', subtitle: '小氣簿 · LITTLE GRUDGES', color: M.cream, background: '#ede4cf', ink: '#35534a' },
      { id: 'drawer-dasiuyan', label: '打小人 Da Siu Yan', title: 'DA SIU YAN', subtitle: '打小人 · LET OFF STEAM', color: M.yellow, background: '#e9bf59', ink: '#603e28' },
      { id: 'cards', label: 'Playing cards · Card Drawer', title: 'CARD DRAWER', subtitle: 'CARDS FOR FRIENDS', color: M.card, background: '#f6efdc', ink: '#a63030' },
    ];
    for (const drawer of storage.children.filter((object) => object.userData.fabricDrawer)) {
      const row = drawer.userData.fabricDrawer;
      const y = .131 + (row - 1) * .185;
      const start = drawer.position.x;
      const { motion } = moving(`fabric-${row}`, `Fabric drawer ${row}`, drawer, (amount) => {
        drawer.position.x = start - amount * .29;
      });
      const discovery = discoveries[row - 1];
      game(discovery.id, discovery.label, drawer, [-.120, y - .048, 0], [.176, .034, .224], motion, discovery.color, discovery.title, { ...discovery, row });
    }
  }

  const bed = model.getObjectByName('Bed • photographed bedding and plush row');
  if (bed) {
    const carcass = bed.getObjectByName('Bed / storage bed carcass');
    const darkFront = bed.getObjectByName('Bed / dark gaps behind four drawers');
    if (carcass) {
      const bounds = new THREE.Box3().setFromObject(carcass), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      // The old carcass was a solid cuboid. Replace its unseen fill with the
      // same outer shell so open drawers reveal a real cavity.
      const shell = group(bed, 'Bed / hollow storage carcass');
      const white = Array.isArray(carcass.material) ? carcass.material[0] : carcass.material;
      for (const x of [bounds.min.x + .014, bounds.max.x - .014]) box(shell, 'Bed cabinet / side', [x, center.y, center.z], [.028, size.y, size.z], white);
      for (const y of [bounds.min.y + .012, bounds.max.y - .012]) box(shell, 'Bed cabinet / base and top', [center.x, y, center.z], [size.x, .024, size.z], white);
      box(shell, 'Bed cabinet / back', [center.x, center.y, bounds.min.z + .012], [size.x, size.y, .024], white);
      hide(carcass); if (darkFront) hide(darkFront);
    }
    const blockers = [];
    if (storage) {
      storage.updateWorldMatrix(true, true);
      // The fixed steel frame and fabric tray are real obstacles even with
      // fabric bins pulled out. Conservatively keep 5 mm before the shelf.
      blockers.push(new THREE.Box3().setFromObject(storage));
    }
    for (let column = 1; column <= 2; column++) for (let row = 1; row <= 2; row++) {
      const suffix = `${column}-${row}`;
      const face = bed.getObjectByName(`Bed / white storage drawer ${suffix}`);
      if (!face) continue;
      const bounds = new THREE.Box3().setFromObject(face), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
      const drawer = group(bed, `Bed / complete moving drawer ${suffix}`);
      for (const name of [`Bed / white storage drawer ${suffix}`, `Bed / recessed dark drawer pull ${suffix}`, `Bed / rounded drawer pull lower lip ${suffix}`]) {
        const part = bed.getObjectByName(name); if (part) relocate(part, drawer);
      }
      const depth = .43, insideWidth = size.x - .045, floorY = bounds.min.y + .023;
      const contents = group(drawer, `Bed drawer ${suffix} / interior`); contents.visible = false;
      box(contents, 'Bed drawer / interior floor', [center.x, floorY, center.z - depth / 2], [insideWidth, .016, depth], M.wood);
      box(contents, 'Bed drawer / interior back', [center.x, floorY + .069, center.z - depth], [insideWidth, .138, .014], M.wood);
      for (const x of [center.x - insideWidth / 2, center.x + insideWidth / 2]) box(contents, 'Bed drawer / interior side', [x, floorY + .069, center.z - depth / 2], [.014, .138, depth], M.wood);
      let travel = .37;
      for (const obstacle of blockers) {
        if (bounds.max.x > obstacle.min.x && bounds.min.x < obstacle.max.x && bounds.max.y > obstacle.min.y && bounds.min.y < obstacle.max.y && obstacle.min.z >= bounds.max.z) {
          travel = Math.min(travel, Math.max(0, obstacle.min.z - bounds.max.z - .005));
        }
      }
      const id = `bed-drawer-${(column - 1) * 2 + row}`;
      const clearanceNote = travel < .1 ? 'The shelf limits this drawer to a small opening.' : '';
      const { motion } = moving(id, `${column === 1 ? 'Left' : 'Right'} ${row === 1 ? 'lower' : 'upper'} bed drawer`, drawer, (amount) => {
        drawer.position.z = amount * travel; contents.visible = amount > .01;
      }, { travel, clearanceNote, note: clearanceNote });
      if (column === 1 && row === 2) {
        game('connect4', 'Connect 4', drawer, [center.x - .15, floorY + .039, center.z - .12], [.29, .054, .18], motion, M.red, 'CONNECT 4');
        folded(contents, center.x + .25, floorY + .025, center.z - .18, .19, .22, M.charcoal, 3);
      } else {
        folded(contents, center.x - .16, floorY + .024, center.z - .18, .31, .25, row === 1 ? M.cream : M.blue, 4);
        folded(contents, center.x + .21, floorY + .024, center.z - .16, .22, .22, row === 1 ? M.rose : M.charcoal, 3);
      }
    }
  }

  model.updateWorldMatrix(true, true);
  const wardrobeParts = [];
  model.traverse((object) => { if (object.isMesh && !object.userData.proceduralWardrobeDetail && object.visible && /^wardrobe door(?:[ .\d]|$)/.test(normalize(object.name))) wardrobeParts.push(object); });
  wardrobeParts.sort((a, b) => new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3()).z - new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3()).z);
  if (wardrobeParts.length === 2) {
    const doors = wardrobeParts.map((object) => ({ object, bounds: new THREE.Box3().setFromObject(object) }));
    const middle = (doors[0].bounds.max.z + doors[1].bounds.min.z) / 2;
    const frontX = Math.min(...doors.map(({ bounds }) => bounds.min.x));
    const wardrobeObjects = [];
    model.traverse((object) => {
      if (!object.isMesh || !object.visible) return;
      const name = normalize(object.name);
      if (/^(wardrobe (door|handle rose|horizontal rail|vertical stile)|inset wardrobe panel)/.test(name) || object.userData.proceduralWardrobeDetail) wardrobeObjects.push(object);
    });
    const pivots = doors.map(({ bounds }, index) => {
      const pivot = group(model, `Wardrobe / ${index === 0 ? 'left' : 'right'} hinged door`);
      pivot.position.set((bounds.min.x + bounds.max.x) / 2, 0, index === 0 ? bounds.min.z : bounds.max.z);
      pivot.updateWorldMatrix(true, true);
      moving(`wardrobe-${index === 0 ? 'left' : 'right'}`, `${index === 0 ? 'Left' : 'Right'} wardrobe door`, pivot, (amount) => { pivot.rotation.y = amount * (index === 0 ? -1 : 1) * 1.12; });
      return pivot;
    });
    // The hanger and all towel folds follow the door holding their anchor;
    // assigning folds by individual centres would incorrectly split the towel.
    const detail = model.getObjectByName('Wardrobe detail / pink hanger and mauve towel');
    const towelDoor = (detail?.userData.anchor?.z ?? middle - .01) < middle ? 0 : 1;
    for (const object of wardrobeObjects) {
      const name = normalize(object.name);
      const hardware = /wardrobe (grip|handle)|straight black/.test(name);
      const index = object.userData.proceduralWardrobeDetail && !hardware ? towelDoor : new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).z < middle ? 0 : 1;
      relocate(object, pivots[index]);
    }
    let cabinet;
    model.traverse((object) => { if (normalize(object.name) === 'wardrobe cabinet') cabinet = object; });
    if (cabinet) {
      const bounds = new THREE.Box3().setFromObject(cabinet), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
      const interior = group(model, 'Wardrobe / shelves clothing and boxes');
      const finish = Array.isArray(cabinet.material) ? cabinet.material[0] : cabinet.material;
      for (const z of [bounds.min.z + .016, bounds.max.z - .016]) box(interior, 'Wardrobe / outer side', [center.x, center.y, z], [size.x, size.y, .032], finish);
      for (const y of [bounds.min.y + .025, bounds.max.y - .025]) box(interior, 'Wardrobe / outer base and top', [center.x, y, center.z], [size.x, .05, size.z], finish);
      box(interior, 'Wardrobe / back panel', [bounds.max.x - .015, center.y, center.z], [.03, size.y, size.z], finish);
      const contents = group(interior, 'Wardrobe / contents revealed by doors'); contents.visible = false;
      for (const motion of motions.filter((value) => value.id.startsWith('wardrobe-'))) {
        const apply = motion.apply;
        motion.apply = (amount) => {
          apply(amount);
          contents.visible = pivots.some((pivot) => Math.abs(pivot.rotation.y) > .01);
        };
      }
      const insideFront = frontX + .045, innerDepth = bounds.max.x - insideFront - .035;
      const shelfX = insideFront + innerDepth / 2;
      for (const y of [.21, .73, 2.08]) box(contents, 'Wardrobe / interior shelf', [shelfX, y, center.z], [innerDepth, .026, size.z - .075], M.wood);
      const rail = mesh(contents, 'Wardrobe / hanging rail', geometry(new THREE.CylinderGeometry(.012, .012, size.z - .12, 12)), M.metal, [shelfX, 1.95, center.z]);
      rail.rotation.x = Math.PI / 2;
      const garment = new THREE.Shape();
      garment.moveTo(-.15, .17); garment.lineTo(-.075, .25); garment.lineTo(.075, .25); garment.lineTo(.15, .17);
      garment.lineTo(.20, -.03); garment.lineTo(.13, -.065); garment.lineTo(.105, .035);
      garment.lineTo(.11, -.48); garment.lineTo(-.11, -.48); garment.lineTo(-.105, .035);
      garment.lineTo(-.13, -.065); garment.lineTo(-.20, -.03); garment.closePath();
      const clothingShape = geometry(new THREE.ExtrudeGeometry(garment, { depth: .038, bevelEnabled: true, bevelSize: .007, bevelThickness: .007, bevelSegments: 2, steps: 1, curveSegments: 3 }));
      for (let i = 0; i < 7; i++) {
        const z = bounds.min.z + .15 + i * (size.z - .30) / 6;
        const coat = mesh(contents, 'Wardrobe / hanging shirt', clothingShape, [M.blue, M.cream, M.charcoal, M.rose][i % 4], [shelfX, 1.66, z]);
        coat.rotation.y = (i % 3 - 1) * .08;
        const hook = mesh(contents, 'Wardrobe / clothes hanger hook', geometry(new THREE.TorusGeometry(.023, .0023, 5, 14, Math.PI * 1.5)), M.metal, [shelfX, 1.93, z + .019]);
        hook.rotation.y = Math.PI / 2;
      }
      for (let i = 0; i < 3; i++) {
        const z = bounds.min.z + .23 + i * .34;
        box(contents, 'Wardrobe / upper storage box', [shelfX, 2.255, z], [innerDepth * .86, .28, .29], i === 1 ? M.charcoal : M.cream);
        box(contents, 'Wardrobe / storage box label', [insideFront + .025, 2.25, z], [.006, .051, .096], M.white);
      }
      folded(contents, shelfX, .28, middle - .25, innerDepth * .8, .28, M.cream, 5);
      folded(contents, shelfX, .29, middle + .24, innerDepth * .8, .29, M.blue, 4);
      hide(cabinet);
    }
  }

  return {
    entries, state,
    update(dt) {
      if (disposed) return false;
      const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(dt, .1)) : 0;
      let changed = false;
      for (const motion of motions) {
        if (motion.value === motion.target) continue;
        const remaining = motion.target - motion.value;
        motion.value += Math.sign(remaining) * Math.min(Math.abs(remaining), elapsed * 2.7);
        if (Math.abs(motion.target - motion.value) < .0001) motion.value = motion.target;
        // Ease the physical transform while preserving reversible logical state.
        const amount = motion.value * motion.value * (3 - 2 * motion.value);
        motion.apply(amount); state[motion.id].amount = motion.value; changed = true;
      }
      return changed;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const motion of motions) motion.apply(0);
      for (const record of moved) {
        record.parent.add(record.object); record.object.position.copy(record.position);
        record.object.quaternion.copy(record.quaternion); record.object.scale.copy(record.scale);
        record.object.matrix.copy(record.matrix); record.object.matrixWorldNeedsUpdate = true;
        delete record.object.userData.actionId;
      }
      for (const { object, visible, layoutHidden } of hidden) {
        object.visible = visible;
        if (layoutHidden === undefined) delete object.userData.layoutHidden;
        else object.userData.layoutHidden = layoutHidden;
      }
      for (const object of added) object.removeFromParent();
      for (const { objects } of entries) for (const object of objects) { delete object.userData.actionId; delete object.userData.interactionEnabled; }
      for (const shape of geometries) shape.dispose();
      for (const mat of materials) mat.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
