import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/build/three.module.js';

const source = (await readFile(new URL('./camera-interior.js', import.meta.url), 'utf8')).replace("from 'three'", `from '${new URL('./vendor/build/three.module.js', import.meta.url).href}'`);
const { interiorBounds, constrainInteriorPosition, constrainObjectPose, constrainScreenPose } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const room = { width: 2, height: 2.65, depth: 3.9 };

test('every interior bound has near-plane clearance and overview stays above furniture and left of the wardrobe', () => {
  for (const overview of [false, true]) for (const x of [-100, .4, 100]) for (const y of [-100, 1.7, 100]) for (const z of [-100, -1.8, 100]) {
    const point = constrainInteriorPosition(new THREE.Vector3(x, y, z), room, overview);
    assert.ok(interiorBounds(room).containsPoint(point));
    if (overview) assert.ok(point.x <= 1.3 && point.y >= 1.4);
  }
});

test('portrait screen confinement preserves projected corners by trading distance for field of view', () => {
  const target = new THREE.Vector3(1.84, 1.15, -1.59), normal = new THREE.Vector3(-1, 0, 0), up = new THREE.Vector3(0, 1, 0);
  const original = { position: target.clone().addScaledVector(normal, 3), target, up, fov: 48 };
  original.quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(original.position, target, up));
  const constrained = constrainScreenPose(original, normal, room);
  assert.ok(interiorBounds(room).containsPoint(constrained.position));
  assert.ok(constrained.fov > original.fov);
  const cameras = [original, constrained].map(pose => {
    const camera = new THREE.PerspectiveCamera(pose.fov, 320 / 844, .025, 100);
    camera.position.copy(pose.position); camera.quaternion.copy(pose.quaternion); camera.updateMatrixWorld(true); return camera;
  });
  for (const y of [.97, 1.27]) for (const z of [-1.89, -1.29]) {
    const point = new THREE.Vector3(1.84, y, z);
    const before = point.clone().project(cameras[0]), after = point.clone().project(cameras[1]);
    assert.ok(Math.abs(before.x - after.x) < 1e-12 && Math.abs(before.y - after.y) < 1e-12);
  }
});

test('physical focus fits within the shell rather than backing through the opposite wall', () => {
  const target = new THREE.Vector3(1.98, 1.9, -2.8), up = new THREE.Vector3(0, 1, 0);
  const bounds = new THREE.Box3(new THREE.Vector3(1.975, 1.6, -3.29), new THREE.Vector3(1.985, 2.2, -2.31));
  const pose = constrainObjectPose({ position: new THREE.Vector3(-2, 1.9, -2.8), target, up, fov: 64 }, bounds, room, 390 / 844);
  assert.ok(interiorBounds(room).containsPoint(pose.position));
  const camera = new THREE.PerspectiveCamera(pose.fov, 390 / 844, .025, 100);
  camera.position.copy(pose.position); camera.quaternion.copy(pose.quaternion); camera.updateMatrixWorld(true);
  for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(1.98, y, z).project(camera);
    assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1);
  }
});
