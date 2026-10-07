import * as THREE from 'three';

/** The GLB screens use v=0 at the printed top edge. Preserve that orientation. */
export function screenFrameFromMesh(mesh) {
  const positions = mesh.geometry?.getAttribute('position');
  const uv = mesh.geometry?.getAttribute('uv');
  if (!positions || !uv) throw new Error('A screen needs positions and UV coordinates.');
  mesh.updateWorldMatrix(true, false);
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => {
    let closest = 0, distance = Infinity;
    for (let index = 0; index < uv.count; index++) {
      const candidate = (uv.getX(index) - u) ** 2 + (uv.getY(index) - v) ** 2;
      if (candidate < distance) { closest = index; distance = candidate; }
    }
    return new THREE.Vector3().fromBufferAttribute(positions, closest).applyMatrix4(mesh.matrixWorld);
  });
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const right = topRight.clone().sub(topLeft).normalize();
  const up = topLeft.clone().sub(bottomLeft).normalize();
  const normal = new THREE.Vector3().crossVectors(right, up).normalize();
  // Remove tiny numerical/shear error from the camera basis, not the real corners.
  up.crossVectors(normal, right).normalize();
  return {
    corners, right, up, normal,
    center: topLeft.clone().add(bottomRight).multiplyScalar(.5),
    width: topLeft.distanceTo(topRight), height: topLeft.distanceTo(bottomLeft),
  };
}

/** Head-on framing leaves the real bezel and a little desk/keyboard in view. */
export function fitScreenCamera(frame, { aspect, fov = 48, widthFraction = .9, heightFraction = .78, viewportHeight = 0, topInset = 74 } = {}) {
  const slope = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const reservedTop = viewportHeight > 0 ? Math.min(.4, topInset / viewportHeight) : 0;
  const availableHeight = Math.min(heightFraction, 1 - reservedTop - .03);
  const distance = Math.max(frame.width / (2 * slope * aspect * widthFraction), frame.height / (2 * slope * availableHeight));
  // Keep the display large while shifting it below the room return control.
  // The original 5.5% downward target offset puts its top at .5 - .555H.
  const projectedHeight = frame.height / (2 * distance * slope);
  const shift = Math.max(0, reservedTop - (.5 - .555 * projectedHeight)) * 2 * distance * slope;
  const target = frame.center.clone().addScaledVector(frame.up, -frame.height * .055 + shift);
  const position = target.clone().addScaledVector(frame.normal, distance);
  const matrix = new THREE.Matrix4().lookAt(position, target, frame.up);
  return { position, target, up: frame.up.clone(), quaternion: new THREE.Quaternion().setFromRotationMatrix(matrix), fov, distance };
}

export function projectScreenRect(frame, camera) {
  camera.updateMatrixWorld(true);
  const points = frame.corners.map((point) => point.clone().project(camera));
  const left = Math.min(...points.map((point) => (point.x + 1) / 2));
  const right = Math.max(...points.map((point) => (point.x + 1) / 2));
  const top = Math.min(...points.map((point) => (1 - point.y) / 2));
  const bottom = Math.max(...points.map((point) => (1 - point.y) / 2));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function interpolateCameraPose(from, to, progress, lift = 0) {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  const eased = t * t * (3 - 2 * t);
  const position = from.position.clone().lerp(to.position, eased);
  position.y += Math.sin(Math.PI * eased) * lift;
  return {
    position,
    quaternion: from.quaternion.clone().slerp(to.quaternion, eased),
    up: from.up.clone().lerp(to.up, eased).normalize(),
    fov: THREE.MathUtils.lerp(from.fov, to.fov, eased),
  };
}

/** Keep a chosen physical area inside the viewport, including portrait phones. */
export function fitObjectCamera(pose, bounds, { aspect, widthFraction = .88, heightFraction = .86 } = {}) {
  if (bounds.isEmpty()) return pose;
  const backward = pose.position.clone().sub(pose.target).normalize();
  const right = new THREE.Vector3().crossVectors(pose.up, backward).normalize();
  const up = new THREE.Vector3().crossVectors(backward, right).normalize();
  const slope = Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2);
  let distance = pose.position.distanceTo(pose.target);
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(x, y, z).sub(pose.target);
    distance = Math.max(distance, point.dot(backward) + Math.max(Math.abs(point.dot(right)) / (slope * aspect * widthFraction), Math.abs(point.dot(up)) / (slope * heightFraction)));
  }
  return { ...pose, position: pose.target.clone().addScaledVector(backward, distance) };
}
