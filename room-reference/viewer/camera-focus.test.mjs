import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/build/three.module.js';

const source = (await readFile(new URL('./camera-focus.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${new URL('./vendor/build/three.module.js', import.meta.url).href}'`);
const { screenFrameFromMesh, fitScreenCamera, projectScreenRect, interpolateCameraPose, fitObjectCamera } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function screen() {
  const geometry = new THREE.PlaneGeometry(.5, .30);
  // GLTF convention, where the top edge is v=0.
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const mesh = new THREE.Mesh(geometry);
  mesh.position.set(1.7, 1.1, -1.8); mesh.rotation.set(-.15, -Math.PI / 2, .07);
  return mesh;
}

test('physical UV corners frame upright, front-facing, axis-aligned screens across phone and tablet rotations', () => {
  const frame = screenFrameFromMesh(screen());
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [768, 1024], [1024, 768]]) {
    const pose = fitScreenCamera(frame, { aspect: width / height });
    const camera = new THREE.PerspectiveCamera(pose.fov, width / height, .025, 100);
    camera.position.copy(pose.position); camera.quaternion.copy(pose.quaternion); camera.up.copy(pose.up);
    const rect = projectScreenRect(frame, camera);
    const corners = frame.corners.map((point) => point.clone().project(camera));
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 1 && rect.y + rect.height <= 1);
    assert.ok(rect.width > .2 && rect.height > .1);
    assert.ok(Math.abs(corners[0].y - corners[1].y) < 1e-6, 'top edge must be horizontal');
    assert.ok(Math.abs(corners[0].x - corners[3].x) < 1e-6, 'left edge must be vertical');
    assert.ok(corners[0].y > corners[3].y, 'v=0 is the top of the displayed page');
    assert.ok(pose.position.clone().sub(frame.center).dot(frame.normal) > 0);
  }
});

test('fitted computer screens reserve space for the viewport return button after rotation', () => {
  const frame = screenFrameFromMesh(screen());
  for (const [width, height] of [[1440, 900], [320, 740], [844, 390], [768, 1024], [1024, 768]]) {
    const pose = fitScreenCamera(frame, { aspect: width / height, viewportHeight: height });
    const camera = new THREE.PerspectiveCamera(pose.fov, width / height, .025, 100);
    camera.position.copy(pose.position); camera.quaternion.copy(pose.quaternion); camera.up.copy(pose.up);
    const rect = projectScreenRect(frame, camera);
    assert.ok(rect.y * height >= 74 - 1e-6, 'screen header clears the 44px return control plus padding');
    assert.ok(rect.y + rect.height <= 1, 'framing keeps the bottom of the physical screen visible');
  }
});

test('focus interpolation has exact endpoints, a clearance arc, and can reverse from its interrupted pose', () => {
  const from = { position: new THREE.Vector3(-3, 3, 3), quaternion: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), fov: 52 };
  const to = fitScreenCamera(screenFrameFromMesh(screen()), { aspect: 1.6 });
  const first = interpolateCameraPose(from, to, 0, .4);
  const last = interpolateCameraPose(from, to, 1, .4);
  assert.ok(first.position.distanceTo(from.position) < 1e-10);
  assert.ok(last.position.distanceTo(to.position) < 1e-10);
  assert.ok(last.quaternion.angleTo(to.quaternion) < 1e-7);
  const half = interpolateCameraPose(from, to, .5, .4);
  assert.ok(half.position.y > (from.position.y + to.position.y) / 2 + .39);
  const reverse = interpolateCameraPose(half, from, 0);
  assert.ok(reverse.position.distanceTo(half.position) < 1e-10);
  assert.ok(interpolateCameraPose(half, from, 1).position.distanceTo(from.position) < 1e-10);
});

test('portrait physical focus keeps the entire wall plaque and wardrobe within the viewport', () => {
  for (const bounds of [new THREE.Box3(new THREE.Vector3(1.975, 1.64, -3.29), new THREE.Vector3(2, 2.24, -2.31)), new THREE.Box3(new THREE.Vector3(1.46, .1, -1.19), new THREE.Vector3(1.51, 2.56, -.02))]) {
    const target = bounds.getCenter(new THREE.Vector3());
    const position = target.clone().add(new THREE.Vector3(-1.13, 0, 0));
    const up = new THREE.Vector3(0, 1, 0);
    const initial = { position, target, up, quaternion: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position, target, up)), fov: 64 };
    for (const aspect of [1440 / 900, 390 / 844]) {
      const pose = fitObjectCamera(initial, bounds, { aspect });
      const camera = new THREE.PerspectiveCamera(pose.fov, aspect, .025, 100);
      camera.position.copy(pose.position); camera.quaternion.copy(pose.quaternion); camera.updateMatrixWorld(true);
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const projected = new THREE.Vector3(x, y, z).project(camera);
        assert.ok(Math.abs(projected.x) <= .9 && Math.abs(projected.y) <= .88);
      }
    }
  }
});
