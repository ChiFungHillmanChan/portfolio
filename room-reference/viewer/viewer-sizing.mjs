/** Bound rendering cost, including on high-DPR phones and large displays. */
export function calculateRenderSize({ width, height, dpr = 1, mobile = false, maxWidth = Infinity, maxHeight = Infinity }) {
  const pixels = Math.max(1, width * height);
  const pixelRatio = Math.min(Math.max(.5, dpr), mobile ? 1.35 : 1.75,
    Math.sqrt((mobile ? 1.5 : 3) * 1024 * 1024 / pixels), maxWidth / width, maxHeight / height);
  return { width: Math.floor(width * pixelRatio), height: Math.floor(height * pixelRatio), pixelRatio };
}

/** Corners are relative to the target, along the camera's right/up/backward axes. */
export function fitCameraDistance({ corners, fov, aspect, widthFraction, heightFraction }) {
  const verticalSlope = Math.tan(fov * Math.PI / 360) * heightFraction / 1.06;
  const horizontalSlope = Math.tan(fov * Math.PI / 360) * aspect * widthFraction / 1.06;
  return Math.max(...corners.map(([x, y, z]) => z + Math.max(Math.abs(x) / horizontalSlope, Math.abs(y) / verticalSlope)));
}
