import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch static siblings without crossing an articulated pivot or action boundary. */
export function batchStaticSiblings(model, protectedObjects) {
  model.updateWorldMatrix(true, true);
  const parents = []; model.traverse(object => { if (object.children.length) parents.push(object); });
  let mergedMeshes = 0, batches = 0;
  const detached = new Set();
  for (const parent of parents) {
    const buckets = new Map();
    for (const object of parent.children) {
      if (!object.isMesh || object.children.length || !object.visible || object.userData.layoutHidden || protectedObjects.has(object) ||
          object.userData.wall_side || /^shell|^skirting/i.test(object.name) || Array.isArray(object.material) || object.geometry.morphAttributes.position || object.isSkinnedMesh) continue;
      const signature = Object.entries(object.geometry.attributes).map(([name,a]) => `${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join(',');
      const key = `${object.material.uuid}:${signature}:${object.castShadow}:${object.receiveShadow}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    }
    for (const objects of buckets.values()) {
      if (objects.length < 3) continue;
      const geometries = objects.map(object => {
        const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        geometry.applyMatrix4(object.matrix); return geometry;
      });
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach(g => g.dispose());
      if (!geometry) continue;
      const batch = new THREE.Mesh(geometry, objects[0].material);
      batch.name = `Static batch / ${parent.name || 'room'} / ${batches}`;
      batch.castShadow = objects[0].castShadow; batch.receiveShadow = objects[0].receiveShadow;
      parent.add(batch);
      for (const object of objects) {object.removeFromParent();detached.add(object.geometry);}
      mergedMeshes += objects.length; batches++;
    }
  }
  // Shared source geometry may still be owned by an unbatched object.
  model.traverse(object => { if (object.geometry) detached.delete(object.geometry); });
  detached.forEach(geometry => geometry.dispose());
  return { mergedMeshes, batches, savedDrawCalls: mergedMeshes - batches };
}
