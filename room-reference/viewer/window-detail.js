import * as THREE from 'three';

// The owner uses the low windowsill as a continuation of the mattress surface.
export function refineWindow(model, { width = 2, depth = 3.9 } = {}) {
  model.updateWorldMatrix(true, true);
  const inverseModel = model.matrixWorld.clone().invert();
  const top = .780;
  const anchor = 2.150;
  const stretch = (anchor - .778) / (anchor - .957);
  const windowTransform = new THREE.Matrix4().makeScale(1, stretch, 1);
  windowTransform.setPosition(0, anchor * (1 - stretch), 0);
  const belowTransform = new THREE.Matrix4().makeScale(1, top / .960, 1);
  const modified = [];
  model.traverse(object => {
    if (!object.isMesh) return;
    const name = object.name.toLowerCase().replace(/[\/_]+/g, ' ');
    if (/^window sill/.test(name)) {
      object.visible = false;
      object.userData.layoutHidden = true;
      return;
    }
    const transform = /^shell back below/.test(name) ? belowTransform
      : /^(window |blind |dark grey roller blind)/.test(name) ? windowTransform : null;
    if (!transform) return;
    const original = new THREE.Matrix4().multiplyMatrices(inverseModel, object.matrixWorld);
    const desired = new THREE.Matrix4().multiplyMatrices(transform, original);
    const parentInverse = new THREE.Matrix4().multiplyMatrices(inverseModel, object.parent.matrixWorld).invert();
    object.matrix.multiplyMatrices(parentInverse, desired);
    object.matrixAutoUpdate = false;
    object.matrix.decompose(object.position, object.quaternion, object.scale);
    object.matrixWorldNeedsUpdate = true;
    object.userData.windowHeightRefined = true;
    modified.push(object.name);
  });

  const ledge = new THREE.Group();
  ledge.name = 'Window / low white display sill';
  ledge.userData.inspectionTarget = true;
  ledge.userData.display_name = 'Windowsill at mattress height';
  ledge.userData.description = 'A low white windowsill level with the bed, holding the plush toys in the left-to-right order of your latest photographs.';
  ledge.userData.topHeight = top;
  ledge.userData.windowPartsAdjusted = modified;
  const paint = new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: .73 });
  const box = (name, size, center) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), paint);
    mesh.name = 'Window / ' + name;
    mesh.position.set(...center);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.wall_side = 'back';
    ledge.add(mesh);
    return mesh;
  };
  // The rear edge overlaps the plaster by 5 mm to leave no light-catching gap.
  box('white sill top', [width - .06, .035, .335], [width / 2, top - .0175, -(depth - .1625)]);
  box('white sill front fascia', [width - .06, .047, .016], [width / 2, top - .039, -(depth - .322)]);
  model.add(ledge);
  model.updateWorldMatrix(true, true);
  return ledge;
}
