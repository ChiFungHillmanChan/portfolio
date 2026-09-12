// Local, bounded-cost sticker sampling. A detected color is a suggestion to review,
// especially with glare, shadows, or unfamiliar sticker shades.
const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const DEFAULT_SCHEME = { U: 'yellow', R: 'red', F: 'green', D: 'white', L: 'orange', B: 'blue' };
const PALETTE = {
  yellow: [246, 216, 22], red: [205, 35, 42], green: [27, 151, 69],
  white: [238, 238, 238], orange: [244, 114, 23], blue: [31, 87, 211],
};
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const validRgb = rgb => (Array.isArray(rgb) || ArrayBuffer.isView(rgb)) && rgb.length >= 3 && Array.from(rgb).slice(0, 3).every(value => Number.isFinite(value) && value >= 0 && value <= 255);

function hsv(rgb) {
  const [r, g, b] = rgb.map(value => value / 255);
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta) {
    if (maximum === r) hue = ((g - b) / delta) % 6;
    else if (maximum === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return { h: hue, s: maximum ? delta / maximum : 0, v: maximum };
}

function chroma(rgb) {
  // Normalize brightness before comparing CIELAB chroma, so a shaded sticker
  // remains close to its measured center color.
  const maximum = Math.max(...rgb, 1);
  const [r, g, b] = rgb.map(value => {
    const normalized = value / maximum;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  const lab = value => value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116;
  const x = lab((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const y = lab(0.2126729 * r + 0.7151522 * g + 0.0721750 * b);
  const z = lab((0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883);
  return [500 * (x - y), 200 * (y - z)];
}

function makeReferences(scheme, referenceColors) {
  if (!scheme || FACES.some(face => !Object.hasOwn(PALETTE, scheme[face])) || new Set(FACES.map(face => scheme[face])).size !== 6) {
    throw new TypeError('The color scheme must assign all six cube colors once.');
  }
  return FACES.map(face => {
    let rgb = PALETTE[scheme[face]];
    const measured = referenceColors?.[face];
    if (validRgb(measured)) {
      const value = hsv(Array.from(measured).slice(0, 3));
      // A nearly black or grey sample cannot calibrate a colored sticker.
      if (value.v > 0.12 && (scheme[face] === 'white' ? value.s < 0.4 : value.s > 0.35)) rgb = Array.from(measured).slice(0, 3);
    }
    return { face, name: scheme[face], hsv: hsv(rgb), chroma: chroma(rgb) };
  });
}

function classify(rgb, references) {
  const value = hsv(rgb);
  const ab = chroma(rgb);
  const ranked = references.map(reference => {
    let distance;
    if (reference.name === 'white') {
      distance = Math.max(0, value.s - Math.min(reference.hsv.s, 0.15) - 0.06) * 2.4;
    } else {
      const rawHueDistance = Math.abs(value.h - reference.hsv.h);
      const hueDistance = Math.min(rawHueDistance, 360 - rawHueDistance) / 50;
      const labDistance = Math.hypot(ab[0] - reference.chroma[0], ab[1] - reference.chroma[1]) / 100;
      distance = hueDistance * 0.8 + labDistance * 0.2 + Math.max(0, 0.5 - value.s) * 2.2;
    }
    return { color: reference.face, distance };
  }).sort((a, b) => a.distance - b.distance);
  const margin = ranked[1].distance - ranked[0].distance;
  const fit = clamp(1 - ranked[0].distance / 1.1);
  const brightness = clamp((value.v - 0.025) / 0.16);
  return { color: ranked[0].color, confidence: clamp(fit * (0.2 + 0.8 * clamp(margin / 0.4)) * brightness) };
}

/** Suggest a face letter and confidence in [0,1] for one RGB sample. */
export function classifyColor(rgb, scheme = DEFAULT_SCHEME, referenceColors = {}) {
  if (!validRgb(rgb)) throw new TypeError('A valid RGB sample is required.');
  return classify(Array.from(rgb).slice(0, 3), makeReferences(scheme, referenceColors));
}

/** Corners are image-pixel coordinates, clockwise: top-left, top-right, bottom-right, bottom-left. */
export function validateCorners(corners, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 12 || height < 12 || !Array.isArray(corners) || corners.length !== 4) return false;
  if (corners.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || point.x > width - 1 || point.y > height - 1)) return false;
  let area = 0;
  for (let index = 0; index < 4; index++) {
    const a = corners[index], b = corners[(index + 1) % 4], c = corners[(index + 2) % 4];
    if (Math.hypot(b.x - a.x, b.y - a.y) < 9) return false;
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) <= 0) return false;
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2 >= 144;
}

export function projection(corners) {
  const [a, b, c, d] = corners;
  const dx1 = b.x - c.x, dx2 = d.x - c.x, dx3 = a.x - b.x + c.x - d.x;
  const dy1 = b.y - c.y, dy2 = d.y - c.y, dy3 = a.y - b.y + c.y - d.y;
  const determinant = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  const x1 = b.x - a.x + g * b.x, x2 = d.x - a.x + h * d.x;
  const y1 = b.y - a.y + g * b.y, y2 = d.y - a.y + h * d.y;
  return (u, v) => {
    const denominator = g * u + h * v + 1;
    return { x: (x1 * u + x2 * v + a.x) / denominator, y: (y1 * u + y2 * v + a.y) / denominator };
  };
}

function median(values) {
  values.sort((a, b) => a - b);
  return values.length ? values[Math.floor(values.length / 2)] : 0;
}

/** Sample only sticker interiors: 81 pixels per sticker, regardless of photo size. */
export function sampleFace(imageData, corners, { scheme = DEFAULT_SCHEME, referenceColors = {}, face } = {}) {
  const { width, height, data } = imageData || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || !data || data.length !== width * height * 4) throw new TypeError('Valid RGBA image data is required.');
  if (!validateCorners(corners, width, height)) throw new TypeError('Face corners must form a clockwise convex quadrilateral inside the image.');
  if (face !== undefined && !FACES.includes(face)) throw new TypeError('A valid cube face is required.');
  const references = makeReferences(scheme, referenceColors);
  const project = projection(corners);
  const colors = [], confidence = [], samples = [];
  for (let index = 0; index < 9; index++) {
    const channels = [[], [], []];
    for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
      const point = project((index % 3 + 0.28 + col * 0.055) / 3, (Math.floor(index / 3) + 0.28 + row * 0.055) / 3);
      const x = clamp(Math.round(point.x), 0, width - 1), y = clamp(Math.round(point.y), 0, height - 1);
      const offset = (y * width + x) * 4;
      if (data[offset + 3] < 128) continue;
      channels.forEach((channel, channelIndex) => channel.push(data[offset + channelIndex]));
    }
    const rgb = channels.map(channel => median(channel));
    const spread = Math.max(...channels.map((channel, channelIndex) => median(channel.map(value => Math.abs(value - rgb[channelIndex])))));
    const result = classify(rgb, references);
    samples.push(rgb);
    colors.push(index === 4 && face ? face : result.color);
    const quality = clamp(1 - spread / 100) * (channels[0].length / 81);
    confidence.push(clamp(result.confidence * quality * (index === 4 && face && result.color !== face ? 0.25 : 1)));
  }
  return { colors, confidence, samples };
}
