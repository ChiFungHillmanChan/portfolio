import * as THREE from 'three';

/**
 * Runtime layout correction for the existing GLB; no source geometry is changed.
 * Blender's (x, y, z) room coordinates are Three's (x, z, -y).
 * Capture model-relative world matrices so exported meshes with baked coordinates
 * and meshes with ordinary object translations follow exactly the same mapping.
 */
export const SOURCE_DIMENSIONS = Object.freeze({ width: 2.65, depth: 3.70, height: 2.65 });
export const TARGET_DIMENSIONS = Object.freeze({ width: 2, depth: 3.90, height: 2.65 });
export const LAYOUT_SEGMENTS = Object.freeze({ bed: 1.20, shelf: .30, desk: 1.20, wardrobe: 1.20 });
export const layoutManifest = { applied: false };
const originals = new WeakMap();

/** Actual wall intervals, shared with procedurally built storage in the viewer. */
export function getLayoutSegments(depth = TARGET_DIMENSIONS.depth) {
  if (!Number.isFinite(depth) || depth <= 0) throw new RangeError('Room depth must be a positive number.');
  const nominalTotal = 3.9;
  const fitScale = Math.min(1, depth / nominalTotal);
  let cursor = Math.max(0, depth - nominalTotal);
  const result = {};
  for (const name of ['wardrobe', 'desk', 'shelf', 'bed']) {
    const start = cursor;
    const length = LAYOUT_SEGMENTS[name] * fitScale;
    const end = name === 'bed' ? depth : start + length;
    result[name] = { start, end, length: end - start, nominalLength: LAYOUT_SEGMENTS[name] };
    cursor = end;
  }
  return result;
}

function normalizedName(name) {
  // GLTFLoader sanitizes punctuation and spaces in node names.
  return String(name || '').toLowerCase().replace(/[\/_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function classifyLayoutObject(object) {
  const n = normalizedName(object.name);
  if (/^(drawer cabinet|drawer (ring pull|silver pull mount)|cabinet )/.test(n)) return 'replacedStorage';
  if (/^(daybed |bed end rail|storage dark reveal|recessed drawer pull)/.test(n) ||
      /duvet|pillow|plush|tiny teddy|^teddy |^peach patchwork fitted sheet/.test(n)) return 'bed';
  if (/^(door |oak entrance door|entrance |lever handle)/.test(n)) return 'door';
  if (/wardrobe|^towel |^thin towel |^mauve terry towel/.test(n)) return 'wardrobe';
  if (/^(bag front zipper|black bag carry|black fabric bag|bulging zip bag|canvas tote|crumpled pale canvas)/.test(n)) return 'wardrobeAccessories';
  if (/chair|armrest|arm support|caster|^seat |shoulder harness|jacket|^black ribbed sleeve cuff|^sleeve stitched seam|^charcoal center back pad|^folded bomber/.test(n)) return 'chair';
  if (/^(cream folded throw|oatmeal fleecy throw|heaped charcoal sweater|sweater sleeve|pale blue cloth)/.test(n)) return 'laundry';
  if (/radiator/.test(n)) return 'radiator';
  if (/^(uk wall socket|socket aperture)/.test(n)) return 'rightWallFittings';
  if (/^(desk |desk side |keyboard |laptop |laptop stand |monitor |mouse |webcam |speaker |footrest |wiring |under-desk |under desk |accessory tray |white monitor accessory tray |tray |right desk |binder |power strip |portable drive|puzzle |mat |oversized gaming mat)/.test(n)) return 'desk';
  if (/^(pendant |bulb socket|warm hanging bulb)/.test(n)) return 'pendant';
  if (/^(shell |skirting |foundation|oak plank |window |blind |dark grey roller blind)/.test(n)) return 'architecture';
  return 'unclassified';
}

function affine({ sx = 1, sy = 1, tx = 0, ty = 0 } = {}) {
  // sy and ty describe the original Blender room-depth axis, not height.
  return new THREE.Matrix4().set(sx, 0, 0, tx, 0, 1, 0, 0, 0, 0, sy, -ty, 0, 0, 0, 1);
}

function fitAxis(oldMin, oldMax, newMin, newMax) {
  const scale = (newMax - newMin) / (oldMax - oldMin);
  return { scale, offset: newMin - oldMin * scale };
}

function capture(model) {
  model.updateWorldMatrix(true, true);
  const inverseModel = model.matrixWorld.clone().invert();
  const entries = [];
  model.traverse((object) => {
    if (!object.isMesh) return;
    entries.push({
      object,
      name: object.name,
      category: classifyLayoutObject(object),
      originalModelMatrix: new THREE.Matrix4().multiplyMatrices(inverseModel, object.matrixWorld),
      originalVisible: object.visible,
      originalGeometry: object.geometry,
    });
  });
  const state = { entries };
  originals.set(model, state);
  return state;
}

function boundsSummary(box) {
  if (box.isEmpty()) return null;
  // Report in the room coordinate convention used for the measurements.
  const rounded = (value) => Math.round(value * 10000) / 10000;
  return {
    min: [box.min.x, -box.max.z, box.min.y].map(rounded),
    max: [box.max.x, -box.min.z, box.max.y].map(rounded),
    coordinateOrder: 'room x, room depth y, height z',
  };
}

function geometryWorldBounds(object, target) {
  if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
  if (object.geometry.boundingBox) target.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
}

/** Tuck the loose right corner away from the shelf without touching its UVs. */
function clearShelfCloth(record, modelMatrix, width, bedFront) {
  if (!/^(rumpled striped duvet|duvet stitched hanging edge)/.test(normalizedName(record.name))) return 0;
  const object = record.object;
  const source = record.originalGeometry.getAttribute('position');
  if (!source) return 0;
  record.warpedGeometry ||= record.originalGeometry.clone();
  object.geometry = record.warpedGeometry;
  const positions = object.geometry.getAttribute('position');
  const inverse = modelMatrix.clone().invert();
  const p = new THREE.Vector3();
  const safeDepth = bedFront + .018;
  const featherStart = width - .84;
  const featherEnd = width - .60; // fully tucked 2 cm before the shelf's side
  const softMax = (a, b, k) => Math.max(a, b) + k * Math.log1p(Math.exp(-Math.abs(a - b) / k));
  let changed = 0;
  for (let i = 0; i < source.count; i++) {
    p.fromBufferAttribute(source, i).applyMatrix4(modelMatrix);
    const feather = THREE.MathUtils.smoothstep(p.x, featherStart, featherEnd);
    const originalDepth = -p.z;
    if (feather > 0 && originalDepth < bedFront + .24) {
      const tuckedDepth = softMax(originalDepth, safeDepth, .015);
      const delta = feather * (tuckedDepth - originalDepth);
      p.z -= delta;
      // Raising the displaced hanging corner onto the mattress also avoids
      // burying its lower edge inside the bed's solid drawer frame.
      const lift = feather * THREE.MathUtils.smoothstep(safeDepth + .05 - originalDepth, 0, .15);
      const support = .784 + .004 * Math.sin(p.x * 19 + originalDepth * 11);
      p.y += lift * (softMax(p.y, support, .010) - p.y);
      if (delta > 1e-7 || lift > 1e-7) changed++;
    }
    p.applyMatrix4(inverse);
    positions.setXYZ(i, p.x, p.y, p.z);
  }
  positions.needsUpdate = true;
  object.geometry.computeVertexNormals();
  object.geometry.computeBoundingBox();
  object.geometry.computeBoundingSphere();
  return changed;
}

/**
 * Correct an already loaded GLTF scene. Returns a serializable verification manifest.
 * Calling again with another width is safe: transforms always use the original GLB.
 * All existing scene materials, geometry, wall metadata, and raycast names survive.
 */
export function applyLayout(model, { width = TARGET_DIMENSIONS.width, depth = TARGET_DIMENSIONS.depth } = {}) {
  if (!model?.isObject3D) throw new TypeError('applyLayout expects a loaded Three.js model.');
  if (!Number.isFinite(width) || width < 1.5 || width > 8) throw new RangeError('Room width must be between 1.5 and 8 metres.');
  if (!Number.isFinite(depth) || depth < 1.5 || depth > 12) throw new RangeError('Room depth must be between 1.5 and 12 metres.');
  const state = originals.get(model) || capture(model);
  model.updateWorldMatrix(true, true);
  const actualSegments = getLayoutSegments(depth);
  const segments = Object.fromEntries(Object.entries(actualSegments).map(([name, segment]) => [name, [segment.start, segment.end]]));
  // The side rails define the bed frame's real exported extents; the drawers
  // deliberately project a few centimetres past the front of the bed.
  const bedX = fitAxis(.0435, 2.0875, .03, width - .03);
  const bedY = fitAxis(2.485, 3.675, ...segments.bed);
  const deskY = fitAxis(1.28, 2.68, ...segments.desk);
  const wardrobeY = fitAxis(.175, 1.213, ...segments.wardrobe);
  const shiftRight = width - SOURCE_DIMENSIONS.width;
  const matrices = {
    architecture: affine({ sx: width / SOURCE_DIMENSIONS.width, sy: depth / SOURCE_DIMENSIONS.depth }),
    bed: affine({ sx: bedX.scale, sy: bedY.scale, tx: bedX.offset, ty: bedY.offset }),
    desk: affine({ sy: deskY.scale, tx: shiftRight, ty: deskY.offset }),
    wardrobe: affine({ sy: wardrobeY.scale, tx: shiftRight, ty: wardrobeY.offset }),
    wardrobeAccessories: affine({ sy: wardrobeY.scale, tx: shiftRight, ty: wardrobeY.offset }),
    chair: affine({ tx: width * .50 - 1.32, ty: 1.90 - 1.85 }),
    // These remain physical-size objects attached to the unchanged entrance end.
    door: affine(), laundry: affine(), radiator: affine(),
    rightWallFittings: affine({ tx: shiftRight }),
    pendant: affine({ tx: 1.26 * (width / SOURCE_DIMENSIONS.width - 1), ty: 1.9 * (depth / SOURCE_DIMENSIONS.depth - 1) }),
    replacedStorage: affine(), unclassified: affine(),
  };
  const leftAfterDoorY = fitAxis(.92, 3.70, .92, depth);
  const leftAfterDoor = affine({ sx: width / SOURCE_DIMENSIONS.width, sy: leftAfterDoorY.scale, ty: leftAfterDoorY.offset });
  const leftDoorOpening = affine({ sx: width / SOURCE_DIMENSIONS.width });
  const manifest = {
    applied: true,
    source: { ...SOURCE_DIMENSIONS },
    dimensions: { width, depth, height: SOURCE_DIMENSIONS.height },
    rightWallSegments: actualSegments,
    furnitureFitScale: Math.min(1, depth / 3.9),
    frontGap: Math.max(0, depth - 3.9),
    bedFrame: { left: .03, right: width - .03, front: segments.bed[0], back: depth },
    chairCenter: { x: width * .50, y: 1.90 },
    groups: {}, hiddenStorageNames: [], unclassifiedNames: [],
    clothClearance: { minimumDepth: segments.bed[0] + .018, fullyTuckedFromX: width - .60, featherStartsAtX: width - .84, changedVertices: 0 },
    notes: [
      'All bounds use room x, room depth y, height z. Three.js uses x, height, negative depth.',
      'Approximate furniture lengths are reduced proportionally when their nominal 3.9 m total exceeds the room length.',
      'Bed drawers and hanging cloth can extend forward of the frame footprint; the right-front duvet corner is tucked clear of the shelf.',
      'The actual shelf interval is reserved for the viewer storage module; the old drawer cabinet and its accessories are hidden.',
      'Door, radiator, and laundry retain their physical dimensions and entrance-end positions.',
      'The existing left-wall door opening keeps its width; only the wall behind it stretches toward the back.',
      'Desk and wardrobe retain their original cross-room depth; only their lengths along the right wall change.',
    ],
  };
  const inverseModel = model.matrixWorld.clone().invert();
  const parentInModel = new THREE.Matrix4();
  const desiredInModel = new THREE.Matrix4();
  // GLTF nodes in this asset are direct scene children. The parent inverse also
  // handles nested nodes, should a later exporter put them beneath groups.
  for (const record of state.entries) {
    const { object, category } = record;
    let transform = matrices[category];
    const n = normalizedName(record.name);
    if (/^(shell|skirting) left afterdoor/.test(n)) transform = leftAfterDoor;
    if (/^(shell|skirting) left beforedoor|^shell left doorlintel/.test(n)) transform = leftDoorOpening;
    desiredInModel.multiplyMatrices(transform, record.originalModelMatrix);
    if (object.parent) {
      object.parent.updateWorldMatrix(true, false);
      parentInModel.multiplyMatrices(inverseModel, object.parent.matrixWorld).invert();
      object.matrix.multiplyMatrices(parentInModel, desiredInModel);
    } else object.matrix.copy(desiredInModel);
    // Keep the affine matrix intact: nonuniform scaling of a rotated part can
    // contain shear which a position/quaternion/scale round trip would lose.
    object.matrixAutoUpdate = false;
    object.matrix.decompose(object.position, object.quaternion, object.scale);
    object.matrixWorldNeedsUpdate = true;
    object.userData.layoutCategory = category;
    manifest.clothClearance.changedVertices += clearShelfCloth(record, desiredInModel, width, segments.bed[0]);
    if (category === 'replacedStorage') {
      object.visible = false;
      object.userData.layoutHidden = true;
      manifest.hiddenStorageNames.push(record.name);
    }
    if (category === 'unclassified') manifest.unclassifiedNames.push(record.name);
    const group = manifest.groups[category] ||= { count: 0, visibleCount: 0, names: [], bounds: null };
    group.count++;
    if (object.visible) group.visibleCount++;
    group.names.push(record.name);
  }
  model.updateWorldMatrix(true, true);
  const boxes = {};
  for (const { object, category } of state.entries) {
    const box = boxes[category] ||= new THREE.Box3();
    geometryWorldBounds(object, box);
  }
  for (const [category, box] of Object.entries(boxes)) manifest.groups[category].bounds = boundsSummary(box);
  manifest.meshCount = state.entries.length;
  manifest.hiddenMeshCount = manifest.hiddenStorageNames.length;
  model.userData.layout = manifest;
  Object.keys(layoutManifest).forEach((key) => delete layoutManifest[key]);
  Object.assign(layoutManifest, manifest);
  return manifest;
}
