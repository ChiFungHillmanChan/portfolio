// Ground-plane placement for the 小人紙. The sheet lies flat on the brick, so
// its transform is an affine (rotate + vertical foreshorten) rather than the
// plain rotation the standing poster used. Canvas 2D cannot do true
// perspective; at this size the affine reads correctly as "lying flat", and it
// buys us zero changes to every bit of drawing done in sheet-local coords.
export const PLANE = { cx: 245, cy: 975, w: 340, h: 500, rot: -0.12, tilt: 0.5 };

export function planeMatrix(plane = PLANE) {
  const c = Math.cos(plane.rot), s = Math.sin(plane.rot);
  // a c e / b d f, matching ctx.setTransform(a, b, c, d, e, f)
  return [c, s, -plane.tilt * s, plane.tilt * c, plane.cx, plane.cy];
}

export function planeToScreen(u, v, plane = PLANE) {
  const [a, b, c, d, e, f] = planeMatrix(plane);
  return { x: a * u + c * v + e, y: b * u + d * v + f };
}

export function screenToPlane(x, y, plane = PLANE) {
  const [a, b, c, d, e, f] = planeMatrix(plane);
  const det = a * d - b * c;
  const px = x - e, py = y - f;
  return { u: (px * d - py * c) / det, v: (py * a - px * b) / det };
}

export function inPaper(x, y, plane = PLANE) {
  const { u, v } = screenToPlane(x, y, plane);
  const eps = 1e-9; // floating-point tolerance for round-trip conversion
  return Math.abs(u) <= plane.w / 2 + eps && Math.abs(v) <= plane.h / 2 + eps;
}

export function planeQuad(plane = PLANE) {
  const hw = plane.w / 2, hh = plane.h / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
    .map(([u, v]) => planeToScreen(u, v, plane));
}
