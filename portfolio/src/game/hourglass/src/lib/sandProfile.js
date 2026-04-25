// Hourglass internal geometry (scene units; 1 unit ≈ 10cm)
export const BULB_RADIUS = 0.5;     // max radius of the glass bulb interior
export const BULB_HEIGHT = 0.55;    // half-height of one bulb (top OR bottom)
export const NECK_RADIUS = 0.04;    // radius at the narrowest point
const SEGMENTS = 32;                // profile resolution

// Boundary contract for consumers (e.g. SandBulk): at progress=1 (top) or
// progress=0 (bottom) the returned profile has near-zero volume and may
// degenerate to collinear points at the same y. THREE.LatheGeometry will
// happily accept the array but produce a zero-thickness disc; the renderer
// must guard with `if (volumeOfRevolution(p) < ε) skip` to avoid z-fighting.

const lerp = (a, b, t) => a + (b - a) * t;

// Volume of revolution around the y-axis using disc summation: ∑ π r² dy.
// Profile is array of [r, y] pairs ordered by y ascending.
export function volumeOfRevolution(profile) {
  if (profile.length < 2) return 0;
  let v = 0;
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1];
    const [r1, y1] = profile[i];
    const dy = Math.abs(y1 - y0);
    // Average disc area (frustum approx)
    const area = Math.PI * (r0 * r0 + r0 * r1 + r1 * r1) / 3;
    v += area * dy;
  }
  return v;
}

// Radius function for the interior of one bulb at normalised height t ∈ [0,1],
// where t=0 is the neck and t=1 is the equator.
// Uses a sine arch so the bulb is widest at its equator and tapers smoothly to the neck.
function bulbRadius(t) {
  return lerp(NECK_RADIUS, BULB_RADIUS, Math.sin(t * Math.PI * 0.5));
}

// Build a full-bulb profile (neck→equator) for the top half (y > 0).
// Returns [[r, y], ...] ascending in y.
function buildFullTopProfile() {
  const pts = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const r = bulbRadius(t);
    // y range: start slightly above the neck (×1.1 = 10% clearance so the
    // sand surface never touches the glass neck wall) and stop slightly
    // below the bulb crest (×0.95 = 5% safety margin against the glass
    // wall thickness Task 9 will add).
    const y = lerp(NECK_RADIUS * 1.1, BULB_HEIGHT * 0.95, t);
    pts.push([r, y]);
  }
  // Seal the top at the y-axis
  pts.push([0, pts[pts.length - 1][1]]);
  return pts;
}

// Cumulative volume table for the top bulb, indexed by number of segments from neck.
// cumulativeTop[i] = volume from neck up to segment i.
const fullTopProfile = buildFullTopProfile();
const cumulativeTop = (() => {
  const table = [0];
  for (let i = 1; i < fullTopProfile.length; i++) {
    const [r0, y0] = fullTopProfile[i - 1];
    const [r1, y1] = fullTopProfile[i];
    const dy = Math.abs(y1 - y0);
    const area = Math.PI * (r0 * r0 + r0 * r1 + r1 * r1) / 3;
    table.push(table[i - 1] + area * dy);
  }
  return table;
})();
const TOTAL_TOP_VOLUME = cumulativeTop[cumulativeTop.length - 1];

// Given a target volume (fraction of TOTAL_TOP_VOLUME), return the profile points
// for the top sand from the neck up to the iso-volume surface.
function topProfileByVolumeFraction(fraction) {
  const targetV = fraction * TOTAL_TOP_VOLUME;
  // Find which segment contains the target volume (binary search)
  let lo = 0, hi = cumulativeTop.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumulativeTop[mid] <= targetV) lo = mid; else hi = mid;
  }
  // Interpolate within the segment [lo, hi]
  const segFrac = hi < cumulativeTop.length && cumulativeTop[hi] > cumulativeTop[lo]
    ? (targetV - cumulativeTop[lo]) / (cumulativeTop[hi] - cumulativeTop[lo])
    : 0;
  const cutIdx = lo + segFrac; // fractional index

  const pts = [];
  // Always start at the neck
  pts.push([fullTopProfile[0][0], fullTopProfile[0][1]]);
  for (let i = 1; i < fullTopProfile.length; i++) {
    if (i < cutIdx) {
      pts.push([...fullTopProfile[i]]);
    } else {
      // Interpolate to find exact cut point
      const t = cutIdx - (i - 1);
      const [r0, y0] = fullTopProfile[i - 1];
      const [r1, y1] = fullTopProfile[i];
      const rCut = lerp(r0, r1, t);
      const yCut = lerp(y0, y1, t);
      pts.push([rCut, yCut]);
      break;
    }
  }
  // Seal surface at y-axis
  const last = pts[pts.length - 1];
  pts.push([0, last[1]]);
  return pts;
}

// Top sand: dome shrinking as progress goes 0→1 (volume fraction goes 1→0).
// At progress=0: full bulb volume. At progress=1: collapses to ~zero.
export function topProfile(progress) {
  const p = Math.max(0, Math.min(1, progress));
  return topProfileByVolumeFraction(1 - p);
}

// Bottom sand: pile that holds exactly what has drained from the top.
// V_bottom(p) = p * TOTAL_TOP_VOLUME, mirrored below the neck.
// Shares the same cross-section as the top (sine-arch), so it looks natural.
// Built by reflecting a top profile of the same fill fraction, then flipping y downward.
export function bottomProfile(progress) {
  const p = Math.max(0, Math.min(1, progress));
  // Get the same shape as if the top were filled to fraction p
  const topPts = topProfileByVolumeFraction(p);
  // Mirror: y → -y, then reverse so y ascends (from most-negative to neck)
  return topPts.map(([r, y]) => [r, -y]).reverse();
}
