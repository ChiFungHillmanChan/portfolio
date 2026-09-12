import { parseAlgorithm } from './cube-engine.js';
import { colors, defaultScheme } from './cube-view.js';

// Coordinates and turn directions follow cube-engine.js: +x right, +y up, +z front.
// A frame rotates actual cubies, including the dark faces exposed between layers.
const MOVE_SPECS = {
  U: [1, 1, -1], R: [0, 1, -1], F: [2, 1, -1],
  D: [1, -1, 1], L: [0, -1, 1], B: [2, -1, 1],
  M: [0, 0, 1], E: [1, 0, 1], S: [2, 0, -1],
  x: [0, null, -1], y: [1, null, -1], z: [2, null, -1],
  u: [1, 1, -1, true], r: [0, 1, -1, true], f: [2, 1, -1, true],
  d: [1, -1, 1, true], l: [0, -1, 1, true], b: [2, -1, 1, true],
};
const NORMALS = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], [-1, 0, 0], [0, 0, -1]];
const UNIT = Math.SQRT1_2;
const CAMERA_Y = 0.56;
const CAMERA_VERTICAL = Math.sqrt(1 - CAMERA_Y * CAMERA_Y);
const CAMERA_XZ = Math.sqrt((1 - CAMERA_Y * CAMERA_Y) / 2);
const SCALE = 52;
const moveCache = new Map();

function stickerIndex(position, face) {
  const [x, y, z] = position;
  const rows = [z + 1, 1 - y, 1 - y, 1 - z, 1 - y, 1 - y];
  const columns = [x + 1, 1 - z, x + 1, x + 1, z + 1, 1 - x];
  return face * 9 + rows[face] * 3 + columns[face];
}

function surface(position, normal, halfSize, offset, sticker = -1) {
  const axis = normal.findIndex(value => value !== 0);
  const a = (axis + 1) % 3;
  const b = (axis + 2) % 3;
  const center = position.map((value, index) => value + normal[index] * offset);
  const vertices = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
    const vertex = [...center];
    vertex[a] += u * halfSize;
    vertex[b] += v * halfSize;
    return vertex;
  });
  return { position, center, normal, vertices, sticker };
}

const SURFACES = [];
for (let x = -1; x <= 1; x += 1) {
  for (let y = -1; y <= 1; y += 1) {
    for (let z = -1; z <= 1; z += 1) {
      if (x === 0 && y === 0 && z === 0) continue;
      const position = [x, y, z];
      NORMALS.forEach((normal, face) => {
        SURFACES.push(surface(position, normal, 0.482, 0.482));
        if (position.every((value, axis) => !normal[axis] || value === normal[axis])) {
          SURFACES.push(surface(position, normal, 0.408, 0.486, stickerIndex(position, face)));
        }
      });
    }
  }
}

function moveSpec(move) {
  if (!move) return null;
  if (moveCache.has(move)) return moveCache.get(move);
  const tokens = parseAlgorithm(move);
  if (tokens.length !== 1) throw new Error('The cube renderer animates one move at a time.');
  const token = tokens[0];
  const [axis, layer, direction, wide] = MOVE_SPECS[token[0]];
  const turns = token.includes('2') ? 2 : token.includes("'") ? -1 : 1;
  const selected = SURFACES.map(({ position }) => layer === null || (wide ? position[axis] * layer >= 0 : position[axis] === layer));
  const spec = { axis, angle: direction * turns * Math.PI / 2, selected };
  moveCache.set(move, spec);
  return spec;
}

function rotateInto(input, output, axis, sine, cosine) {
  const a = (axis + 1) % 3;
  const b = (axis + 2) % 3;
  output[axis] = input[axis];
  output[a] = cosine * input[a] - sine * input[b];
  output[b] = sine * input[a] + cosine * input[b];
}

function copyInto(input, output) {
  output[0] = input[0]; output[1] = input[1]; output[2] = input[2];
}

function createFrameBuffer() {
  return SURFACES.map(({ sticker }) => ({ center: [0, 0, 0], normal: [0, 0, 0],
    vertices: Array.from({ length: 4 }, () => [0, 0, 0]), sticker, color: null,
    points: Array.from({ length: 4 }, () => [0, 0]), depth: 0 }));
}

// The renderer reuses its buffer; callers may omit it to inspect an independent frame.
export function buildCubeFrame(cube, move = null, progress = 0, buffer = createFrameBuffer()) {
  const spec = moveSpec(move);
  const angle = (spec?.angle || 0) * Math.min(1, Math.max(0, Number(progress) || 0));
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  for (let index = 0; index < SURFACES.length; index += 1) {
    const source = SURFACES[index];
    const target = buffer[index];
    const rotating = spec && spec.selected[index];
    if (rotating) {
      rotateInto(source.center, target.center, spec.axis, sine, cosine);
      rotateInto(source.normal, target.normal, spec.axis, sine, cosine);
      for (let vertex = 0; vertex < 4; vertex += 1) rotateInto(source.vertices[vertex], target.vertices[vertex], spec.axis, sine, cosine);
    } else {
      copyInto(source.center, target.center);
      copyInto(source.normal, target.normal);
      for (let vertex = 0; vertex < 4; vertex += 1) copyInto(source.vertices[vertex], target.vertices[vertex]);
    }
    target.color = source.sticker < 0 ? null : cube[source.sticker];
  }
  return buffer;
}

export function projectPoint(point, view = 'front', output = [0, 0]) {
  const side = view === 'back' ? -1 : 1;
  output[0] = 160 + SCALE * UNIT * side * (point[0] - point[2]);
  output[1] = 144 + SCALE * (CAMERA_Y * UNIT * side * (point[0] + point[2]) - CAMERA_VERTICAL * point[1]);
  return output;
}

function depth(point, view) {
  const side = view === 'back' ? -1 : 1;
  return CAMERA_XZ * side * (point[0] + point[2]) + CAMERA_Y * point[1];
}

function roundedPolygon(context, points, rounding) {
  const first = points[0];
  const last = points[3];
  context.beginPath();
  context.moveTo(first[0] + (last[0] - first[0]) * rounding, first[1] + (last[1] - first[1]) * rounding);
  for (let index = 0; index < 4; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % 4];
    context.quadraticCurveTo(point[0], point[1], point[0] + (next[0] - point[0]) * rounding, point[1] + (next[1] - point[1]) * rounding);
    context.lineTo(next[0] + (point[0] - next[0]) * rounding, next[1] + (point[1] - next[1]) * rounding);
  }
  context.closePath();
}

export function createCubeRenderer(canvas) {
  const context = canvas.getContext('2d', { alpha: true });
  const frame = createFrameBuffer();
  const visible = [];
  let lastDraw = null;
  let destroyed = false;
  let width = 320;
  let height = 300;

  function paint() {
    if (destroyed || !context || !lastDraw) return;
    const [cube, scheme, move, progress, view] = lastDraw;
    context.setTransform(canvas.width / 320, 0, 0, canvas.height / 300, 0, 0);
    context.clearRect(0, 0, 320, 300);
    context.fillStyle = 'rgba(35, 49, 75, 0.075)';
    context.beginPath();
    context.ellipse(160, 277, 75, 8, 0, 0, Math.PI * 2);
    context.fill();

    buildCubeFrame(cube, move, progress, frame);
    visible.length = 0;
    for (const face of frame) {
      if (depth(face.normal, view) <= 0.001) continue;
      face.depth = depth(face.center, view);
      for (let vertex = 0; vertex < 4; vertex += 1) projectPoint(face.vertices[vertex], view, face.points[vertex]);
      visible.push(face);
    }
    visible.sort((a, b) => a.depth - b.depth);
    for (const face of visible) {
      const sticker = face.sticker >= 0;
      roundedPolygon(context, face.points, sticker ? 0.075 : 0.025);
      const brightness = Math.round(24 + Math.max(0, face.normal[1]) * 9);
      context.fillStyle = sticker ? colors[scheme[face.color]] || '#b9c3d2' : `rgb(${brightness - 5}, ${brightness + 5}, ${brightness + 13})`;
      context.fill();
      context.strokeStyle = sticker ? 'rgba(255, 255, 255, 0.21)' : 'rgba(8, 17, 25, 0.7)';
      context.lineWidth = sticker ? 0.7 : 0.65;
      context.stroke();
    }
  }

  function resize(entries) {
    if (destroyed) return;
    const box = entries?.[0]?.contentRect || canvas.getBoundingClientRect();
    width = box.width || width;
    height = box.height || height;
    const pixelRatio = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
    const nextWidth = Math.round(width * pixelRatio);
    const nextHeight = Math.round(height * pixelRatio);
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    paint();
  }

  // CSS owns the element's aspect ratio; only the backing pixel buffer changes here.
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  if (!observer) globalThis.addEventListener?.('resize', resize);
  resize();

  return {
    draw(cube, scheme = defaultScheme, move = null, progress = 0, view = 'front') {
      if (destroyed) return;
      lastDraw = [cube, scheme, move, progress, view];
      paint();
    },
    destroy() {
      destroyed = true;
      observer?.disconnect();
      if (!observer) globalThis.removeEventListener?.('resize', resize);
      lastDraw = null;
      visible.length = 0;
    },
  };
}
