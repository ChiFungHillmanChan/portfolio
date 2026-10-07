import * as THREE from 'three';

export function interiorBounds(room, overview = false) {
  return new THREE.Box3(
    new THREE.Vector3(overview ? .10 : .075, overview ? 1.40 : .075, -room.depth + .075),
    new THREE.Vector3(overview ? Math.min(room.width - .075, 1.30) : room.width - .075, room.height - .15, -.10),
  );
}

export function constrainInteriorPosition(position, room, overview = false) {
  const bounds = interiorBounds(room, overview);
  return position.clamp(bounds.min, bounds.max);
}

function maximumDistance(origin, direction, room) {
  const bounds = interiorBounds(room);
  let distance = Infinity;
  for (const axis of ['x', 'y', 'z']) {
    if (Math.abs(direction[axis]) < 1e-8) continue;
    const boundary = direction[axis] > 0 ? bounds.max[axis] : bounds.min[axis];
    distance = Math.min(distance, (boundary - origin[axis]) / direction[axis]);
  }
  return Math.max(.05, distance);
}

// A shorter screen distance with the corresponding wider FOV preserves its
// projected rectangle exactly: distance * tan(FOV / 2) stays constant.
export function constrainScreenPose(pose, normal, room) {
  const distance = pose.position.distanceTo(pose.target);
  const limit = Math.min(distance, maximumDistance(pose.target, normal, room));
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2) * distance / limit));
  return { ...pose, position: constrainInteriorPosition(pose.target.clone().addScaledVector(normal, limit), room), distance: limit, fov };
}

export function constrainObjectPose(pose, bounds, room, aspect) {
  const backward = pose.position.clone().sub(pose.target).normalize();
  const distance = Math.min(pose.position.distanceTo(pose.target), maximumDistance(pose.target, backward, room));
  const position = constrainInteriorPosition(pose.target.clone().addScaledVector(backward, distance), room);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position, pose.target, pose.up));
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
  let slope = Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2);
  if (!bounds.isEmpty()) for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(x, y, z).sub(position), depth = Math.max(.025, point.dot(forward));
    slope = Math.max(slope, Math.abs(point.dot(right)) / (depth * aspect * .88), Math.abs(point.dot(up)) / (depth * .86));
  }
  return { ...pose, position, quaternion, fov: Math.min(110, THREE.MathUtils.radToDeg(2 * Math.atan(slope))) };
}
