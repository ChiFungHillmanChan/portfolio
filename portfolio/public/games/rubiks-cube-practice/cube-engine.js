// Facelets use the standard URFDLB order, each face viewed from outside.
// Every move is a sticker permutation; validation uses corner/edge coordinates.
export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

const CORNERS = [[8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51]];
const CORNER_COLORS = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'];
const EDGES = [[5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25],
  [30, 43], [34, 52], [23, 12], [21, 41], [50, 39], [48, 14]];
const EDGE_COLORS = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];
const AUFS = ['', 'U', 'U2', "U'"];
const MOVES = FACE_ORDER.flatMap(face => [face, `${face}2`, `${face}'`]);

export function solvedCube() {
  return FACE_ORDER.flatMap(face => Array(9).fill(face));
}

const facelets = FACE_ORDER.flatMap(face => Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  switch (face) {
    case 'U': return { p: [column - 1, 1, row - 1], n: [0, 1, 0] };
    case 'R': return { p: [1, 1 - row, 1 - column], n: [1, 0, 0] };
    case 'F': return { p: [column - 1, 1 - row, 1], n: [0, 0, 1] };
    case 'D': return { p: [column - 1, -1, 1 - row], n: [0, -1, 0] };
    case 'L': return { p: [-1, 1 - row, column - 1], n: [-1, 0, 0] };
    default: return { p: [1 - column, 1 - row, -1], n: [0, 0, -1] };
  }
}));
const faceletKey = (p, n) => `${p.join(',')}/${n.join(',')}`;
const positions = new Map(facelets.map(({ p, n }, index) => [faceletKey(p, n), index]));

function rotate(vector, axis, direction) {
  const result = [...vector];
  const a = (axis + 1) % 3;
  const b = (axis + 2) % 3;
  result[a] = -direction * vector[b];
  result[b] = direction * vector[a];
  return result;
}

const specs = {
  U: [1, 1, -1], R: [0, 1, -1], F: [2, 1, -1],
  D: [1, -1, 1], L: [0, -1, 1], B: [2, -1, 1],
  M: [0, 0, 1], E: [1, 0, 1], S: [2, 0, -1],
  x: [0, null, -1], y: [1, null, -1], z: [2, null, -1],
  u: [1, 1, -1, true], r: [0, 1, -1, true], f: [2, 1, -1, true],
  d: [1, -1, 1, true], l: [0, -1, 1, true], b: [2, -1, 1, true],
};
const permutations = new Map();

function movePermutation(token) {
  if (permutations.has(token)) return permutations.get(token);
  const base = token[0];
  const [axis, layer, direction, wide] = specs[base];
  const turns = token.includes('2') ? 2 : token.includes("'") ? 3 : 1;
  const permutation = facelets.map(({ p, n }, index) => {
    const selected = layer === null || (wide ? p[axis] * layer >= 0 : p[axis] === layer);
    if (!selected) return index;
    let nextP = p;
    let nextN = n;
    for (let turn = 0; turn < turns; turn += 1) {
      nextP = rotate(nextP, axis, direction);
      nextN = rotate(nextN, axis, direction);
    }
    return positions.get(faceletKey(nextP, nextN));
  });
  permutations.set(token, permutation);
  return permutation;
}

export function parseAlgorithm(algorithm = '') {
  if (Array.isArray(algorithm)) return parseAlgorithm(algorithm.join(' '));
  const text = String(algorithm).replace(/[’′]/g, "'").trim();
  let position = 0;
  function readGroup(nested = false) {
    const tokens = [];
    while (position < text.length) {
      if (/\s/.test(text[position])) { position += 1; continue; }
      if (text[position] === ')') {
        if (!nested) throw new Error('Unexpected closing parenthesis in algorithm.');
        position += 1;
        return tokens;
      }
      if (text[position] === '(') {
        position += 1;
        const group = readGroup(true);
        const repeat = text.slice(position).match(/^\d+/)?.[0] || '1';
        if (repeat !== '1' || text[position] === '1') position += repeat.length;
        const count = Number(repeat);
        if (count < 1 || count > 100) throw new Error('Algorithm repetition must be between 1 and 100.');
        for (let index = 0; index < count; index += 1) tokens.push(...group);
        continue;
      }
      const match = text.slice(position).match(/^([URFDLB]w|[URFDLBMESxyzurfdlb])((?:2'?|'2?)?)/);
      if (!match) throw new Error(`Unknown move near “${text.slice(position, position + 12)}”.`);
      const base = match[1].endsWith('w') ? match[1][0].toLowerCase() : match[1];
      const suffix = match[2].includes('2') ? '2' : match[2];
      tokens.push(base + suffix);
      position += match[0].length;
    }
    if (nested) throw new Error('Unclosed parenthesis in algorithm.');
    return tokens;
  }
  return readGroup();
}

function applyTokens(state, tokens) {
  let result = [...state];
  for (const token of tokens) {
    const next = Array(54);
    movePermutation(token).forEach((destination, index) => { next[destination] = result[index]; });
    result = next;
  }
  return result;
}

export function applyAlgorithm(state, algorithm) {
  if (!Array.isArray(state) || state.length !== 54) throw new Error('A cube needs 54 stickers.');
  return applyTokens(state, parseAlgorithm(algorithm));
}

export function invertAlgorithm(algorithm) {
  return parseAlgorithm(algorithm).reverse().map(token =>
    token.includes('2') ? token : token.includes("'") ? token[0] : `${token}'`).join(' ');
}

// Relabeling commutes with moves, so inverse-generated cases still solve when an
// algorithm has an unclosed whole-cube rotation. Face centers stay canonical.
export function normalizeCenters(state) {
  const colors = new Map(FACE_ORDER.map((face, index) => [state[index * 9 + 4], face]));
  return state.map(color => colors.get(color));
}

export function makeCase(algorithm) {
  return normalizeCenters(applyAlgorithm(solvedCube(), invertAlgorithm(algorithm)));
}

function cubies(state) {
  const normalized = normalizeCenters(state);
  const cp = [], co = [], ep = [], eo = [];
  for (const indices of CORNERS) {
    const colors = indices.map(index => normalized[index]);
    const orientation = colors.findIndex(color => color === 'U' || color === 'D');
    if (orientation < 0) throw new Error('A corner has an impossible color combination.');
    const ordered = colors.slice(orientation).concat(colors.slice(0, orientation)).join('');
    const piece = CORNER_COLORS.indexOf(ordered);
    if (piece < 0) throw new Error('A corner has an impossible or mirrored color combination.');
    cp.push(piece); co.push(orientation);
  }
  for (const indices of EDGES) {
    const colors = indices.map(index => normalized[index]).join('');
    const normal = EDGE_COLORS.indexOf(colors);
    const reverse = EDGE_COLORS.indexOf([...colors].reverse().join(''));
    if (normal < 0 && reverse < 0) throw new Error('An edge has an impossible color combination.');
    ep.push(normal < 0 ? reverse : normal); eo.push(normal < 0 ? 1 : 0);
  }
  return { cp, co, ep, eo };
}

function parity(permutation) {
  let inversions = 0;
  for (let a = 0; a < permutation.length; a += 1) {
    for (let b = a + 1; b < permutation.length; b += 1) {
      if (permutation[a] > permutation[b]) inversions += 1;
    }
  }
  return inversions % 2;
}

let centerFrames;
function legalCenterFrames() {
  if (centerFrames) return centerFrames;
  centerFrames = new Set();
  const queue = [solvedCube()];
  for (const state of queue) {
    const key = FACE_ORDER.map((_, index) => state[index * 9 + 4]).join('');
    if (centerFrames.has(key)) continue;
    centerFrames.add(key);
    queue.push(applyAlgorithm(state, 'x'), applyAlgorithm(state, 'y'));
  }
  return centerFrames;
}

export function validateCube(state) {
  if (!Array.isArray(state) || state.length !== 54) return { valid: false, error: 'Fill all 54 stickers.' };
  for (const face of FACE_ORDER) {
    if (state.filter(color => color === face).length !== 9) {
      return { valid: false, error: `Each color needs exactly 9 stickers. Check the ${face} color.` };
    }
  }
  if (new Set(FACE_ORDER.map((_, index) => state[index * 9 + 4])).size !== 6) {
    return { valid: false, error: 'The six center colors must be different.' };
  }
  if (!legalCenterFrames().has(FACE_ORDER.map((_, index) => state[index * 9 + 4]).join(''))) {
    return { valid: false, error: 'The center colors do not match the standard cube layout. Check opposite faces and orientation.' };
  }
  try {
    const { cp, co, ep, eo } = cubies(state);
    if (new Set(cp).size !== 8 || new Set(ep).size !== 12) {
      return { valid: false, error: 'A corner or edge appears twice. Check its sticker colors.' };
    }
    if (co.reduce((sum, value) => sum + value, 0) % 3) {
      return { valid: false, error: 'Corner twist error: this state cannot be reached with legal turns.' };
    }
    if (eo.reduce((sum, value) => sum + value, 0) % 2) {
      return { valid: false, error: 'Edge flip error: this state cannot be reached with legal turns.' };
    }
    if (parity(cp) !== parity(ep)) {
      return { valid: false, error: 'Permutation parity error: two pieces appear to be swapped.' };
    }
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function indicesSolved(state, indices) {
  return indices.every(index => state[index] === state[Math.floor(index / 9) * 9 + 4]);
}

export function isCrossSolved(state) {
  return indicesSolved(state, EDGES.slice(4, 8).flat());
}

export function isF2LSolved(state) {
  return isCrossSolved(state) && indicesSolved(state, [...CORNERS.slice(4).flat(), ...EDGES.slice(8).flat()]);
}

export function isOLLSolved(state) {
  return isF2LSolved(state) && indicesSolved(state, Array.from({ length: 9 }, (_, index) => index));
}

export function isSolved(state) {
  return indicesSolved(state, Array.from({ length: 54 }, (_, index) => index));
}

// One exact pattern database covers all 12P4 × 2^4 = 190,080 cross states.
// Four oriented edge positions fit in a base-24 integer (331,776 entries).
let crossDatabase;
function encodeCross(positions) {
  return ((positions[0] * 24 + positions[1]) * 24 + positions[2]) * 24 + positions[3];
}

function decodeCross(code) {
  const result = Array(4);
  for (let index = 3; index >= 0; index -= 1) {
    result[index] = code % 24;
    code = Math.floor(code / 24);
  }
  return result;
}

function getCrossDatabase() {
  if (crossDatabase) return crossDatabase;
  const transitions = MOVES.map(move => {
    const { ep, eo } = cubies(applyAlgorithm(solvedCube(), move));
    const map = new Uint8Array(24);
    for (let destination = 0; destination < 12; destination += 1) {
      for (let orientation = 0; orientation < 2; orientation += 1) {
        map[ep[destination] * 2 + orientation] = destination * 2 + (orientation ^ eo[destination]);
      }
    }
    return map;
  });
  const distances = new Uint8Array(24 ** 4).fill(255);
  const queue = new Uint32Array(190080);
  const start = encodeCross([8, 10, 12, 14]);
  distances[start] = 0; queue[0] = start;
  let head = 0, tail = 1;
  while (head < tail) {
    const code = queue[head++];
    const p = decodeCross(code);
    for (const move of transitions) {
      const next = encodeCross([move[p[0]], move[p[1]], move[p[2]], move[p[3]]]);
      if (distances[next] === 255) {
        distances[next] = distances[code] + 1;
        queue[tail++] = next;
      }
    }
  }
  crossDatabase = { distances, transitions };
  return crossDatabase;
}

export function findCrossSolution(state) {
  const validation = validateCube(state);
  if (!validation.valid) return { algorithm: '', moves: 0, error: validation.error };
  const { ep, eo } = cubies(state);
  let positions = [4, 5, 6, 7].map(piece => {
    const position = ep.indexOf(piece);
    return position * 2 + eo[position];
  });
  const { distances, transitions } = getCrossDatabase();
  let distance = distances[encodeCross(positions)];
  const solution = [];
  while (distance > 0 && distance < 255) {
    const move = transitions.findIndex(transition =>
      distances[encodeCross(positions.map(position => transition[position]))] === distance - 1);
    if (move < 0) throw new Error('Cross solution lookup failed.');
    positions = positions.map(position => transitions[move][position]);
    solution.push(MOVES[move]);
    distance -= 1;
  }
  return { algorithm: solution.join(' '), setup: '', moves: solution.length, optimal: true, solved: solution.length === 0 };
}

const correctionCache = new Map();
function orientationCorrection(algorithm) {
  if (correctionCache.has(algorithm)) return correctionCache.get(algorithm);
  const start = applyAlgorithm(solvedCube(), algorithm);
  const queue = [{ state: start, algorithm: '' }];
  const seen = new Set();
  for (const current of queue) {
    const key = FACE_ORDER.map((_, index) => current.state[index * 9 + 4]).join('');
    if (seen.has(key)) continue;
    seen.add(key);
    if (key === FACE_ORDER.join('')) {
      correctionCache.set(algorithm, current.algorithm);
      return current.algorithm;
    }
    for (const move of ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2']) {
      queue.push({ state: applyAlgorithm(current.state, move), algorithm: `${current.algorithm} ${move}`.trim() });
    }
  }
  throw new Error('Could not restore the cube orientation.');
}

function result(record, setup, auf = '', extra = {}) {
  const regrip = orientationCorrection(record.algorithm);
  return { case: record, setup, auf, regrip, caseAlgorithm: record.algorithm, ...extra,
    algorithm: [extra.slotRotation, extra.extraction, setup, record.algorithm, regrip, auf, extra.slotReturn].filter(Boolean).join(' ') };
}

export function matchOLL(state, cases) {
  if (!isF2LSolved(state)) return null;
  if (isOLLSolved(state)) return { case: null, algorithm: '', setup: '', solved: true };
  for (const record of cases) {
    for (const setup of AUFS) {
      if (isOLLSolved(applyAlgorithm(state, result(record, setup).algorithm))) {
        return result(record, setup);
      }
    }
  }
  return null;
}

export function matchPLL(state, cases) {
  if (!isOLLSolved(state)) return null;
  if (isSolved(state)) return { case: null, algorithm: '', setup: '', auf: '', solved: true };
  for (const auf of AUFS.slice(1)) {
    if (isSolved(applyAlgorithm(state, auf))) return { case: null, algorithm: auf, setup: '', auf, solved: false };
  }
  for (const record of cases) {
    for (const setup of AUFS) {
      const after = applyAlgorithm(state, result(record, setup).algorithm);
      for (const auf of AUFS) {
        if (isSolved(applyAlgorithm(after, auf))) return result(record, setup, auf);
      }
    }
  }
  return null;
}

function pairSignature(state) {
  const { cp, co, ep, eo } = cubies(state);
  const corner = cp.indexOf(4);
  const edge = ep.indexOf(8);
  return `${corner}:${co[corner]}/${edge}:${eo[edge]}`;
}

const SLOTS = {
  FR: { corner: 4, edge: 8, rotation: '', trigger: 'R' },
  FL: { corner: 5, edge: 9, rotation: "y'", trigger: "L'" },
  BR: { corner: 7, edge: 11, rotation: 'y', trigger: "R'" },
  BL: { corner: 6, edge: 10, rotation: 'y2', trigger: 'L' },
};

export function matchF2L(state, cases, slot = 'FR') {
  if (!isCrossSolved(state)) return null;
  const selected = SLOTS[slot];
  if (!selected) throw new Error('Choose an F2L slot: FR, FL, BR or BL.');
  const rotated = applyAlgorithm(state, selected.rotation);
  if (indicesSolved(rotated, [...CORNERS[4], ...EDGES[8]])) {
    return { case: null, algorithm: '', setup: '', solved: true };
  }
  const preservedSlots = Object.entries(SLOTS).filter(([name, value]) => name !== 'FR'
    && indicesSolved(rotated, [...CORNERS[value.corner], ...EDGES[value.edge]]));
  const signatures = new Map();
  for (const record of cases) {
    const signature = pairSignature(makeCase(record.algorithm));
    signatures.set(signature, record);
  }
  const queue = [{ state: rotated, extraction: '', depth: 0 }];
  const seen = new Set();
  for (const current of queue) {
    const currentSignature = pairSignature(current.state);
    if (seen.has(currentSignature)) continue;
    seen.add(currentSignature);
    for (const setup of AUFS) {
      const record = signatures.get(pairSignature(applyAlgorithm(current.state, setup)));
      if (!record) continue;
      const answer = result(record, setup, '', { slot, slotRotation: selected.rotation,
        slotReturn: invertAlgorithm(selected.rotation), extraction: current.extraction });
      const after = applyAlgorithm(current.state, result(record, setup).algorithm);
      if (isCrossSolved(after) && indicesSolved(after, [...CORNERS[4], ...EDGES[8]])
        && preservedSlots.every(([, value]) => indicesSolved(after, [...CORNERS[value.corner], ...EDGES[value.edge]]))) {
        return answer;
      }
    }
    if (current.depth >= 2) continue;
    const { cp, ep } = cubies(current.state);
    const cornerPosition = cp.indexOf(4);
    const edgePosition = ep.indexOf(8);
    // Pull a target piece out of another slot. Three-move triggers preserve the
    // cross and every other slot; at most two target pieces need extraction.
    const buriedSlots = Object.entries(SLOTS).filter(([name, value]) => name !== 'FR'
      && (value.corner === cornerPosition || value.edge === edgePosition));
    for (const [, value] of buriedSlots) {
      for (const setup of AUFS) {
        for (const top of AUFS.slice(1)) {
          const extraction = [setup, value.trigger, top, invertAlgorithm(value.trigger)].filter(Boolean).join(' ');
          queue.push({ state: applyAlgorithm(current.state, extraction),
            extraction: [current.extraction, extraction].filter(Boolean).join(' '), depth: current.depth + 1 });
        }
      }
    }
  }
  return null;
}
