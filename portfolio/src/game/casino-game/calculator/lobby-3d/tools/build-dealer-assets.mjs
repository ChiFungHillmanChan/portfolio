#!/usr/bin/env node
// tools/build-dealer-assets.mjs — dealer GLB v2 asset build (see
// docs/superpowers/specs/2026-07-17-dealer-glb-v2-fixes-design.md).
//
// Rebuilds assets/dealer-characters.glb from the Quaternius Universal Base
// Characters pack (Superhero_Male_FullBody + Origin-at-0 hairstyles):
//   - bakes a tuxedo (jacket / shirt V + placket / cuffs / trousers / shoes)
//    into the body base-color texture with crisp 3D-rule boundaries,
//   - restores the eye texture (pupils) as-is,
//   - embeds hairstyle meshes as static nodes for runtime Head-bone attach,
//   - writes the classification landmarks + skin base tone into scene.extras
//     so runtime vertex tint regions use IDENTICAL numbers,
// and trims assets/dealer-clips.glb down to the clips the lobby uses.
//
// The tuxedo texture is painted in LIGHT NEUTRAL tones and multiplied at
// runtime by per-dealer vertex-color tints (skin palette ratio, vest palette,
// trousers charcoal) — one texture, full seed variety.
//
// usage: node tools/build-dealer-assets.mjs "<path to Universal Base Characters[Standard]>"
// Reads the pack from that dir; writes into assets/ next to this script's ..
// Zero npm deps: minimal PNG codec + GLB writer inlined (node:zlib only).

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const packDir = process.argv[2];
if (!packDir) {
  console.error('usage: node tools/build-dealer-assets.mjs "<pack dir>"');
  process.exit(1);
}

// ---------------------------------------------------------------- PNG codec
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (bitDepth !== 8 || data[12] !== 0) throw new Error('unsupported PNG (need 8-bit non-interlaced)');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!ch) throw new Error('unsupported PNG color type ' + colorType);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, ch, data: out };
}

function encodePng(w, h, rgb /* Buffer, 3ch */) {
  const stride = w * 3;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- glTF read
const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readGltf(gltfPath) {
  const json = JSON.parse(readFileSync(gltfPath, 'utf8'));
  const bin = readFileSync(join(dirname(gltfPath), json.buffers[0].uri));
  return { json, bin };
}
function readAccessor({ json, bin }, idx) {
  const acc = json.accessors[idx];
  const bv = json.bufferViews[acc.bufferView];
  const T = COMP[acc.componentType];
  const n = NCOMP[acc.type];
  const off = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  return new T(bin.buffer, bin.byteOffset + off, acc.count * n);
}

function readGlb(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(path + ': not a GLB');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  let bin = Buffer.alloc(0);
  const binStart = 20 + jsonLen;
  if (binStart < buf.length && buf.readUInt32LE(binStart + 4) === 0x004e4942) {
    bin = buf.subarray(binStart + 8, binStart + 8 + buf.readUInt32LE(binStart));
  }
  return { json, bin };
}

// ---------------------------------------------------------------- GLB write
class GlbBuilder {
  constructor() {
    this.json = {
      asset: { version: '2.0', generator: 'build-dealer-assets.mjs' },
      scene: 0, scenes: [], nodes: [], meshes: [], skins: [],
      materials: [], textures: [], images: [], samplers: [],
      accessors: [], bufferViews: [], buffers: [{}], animations: [],
    };
    this.chunks = [];
    this.byteLength = 0;
  }
  pushBufferView(buf, extra = {}) {
    const pad = (4 - (this.byteLength % 4)) % 4;
    if (pad) { this.chunks.push(Buffer.alloc(pad)); this.byteLength += pad; }
    const idx = this.json.bufferViews.length;
    this.json.bufferViews.push({ buffer: 0, byteOffset: this.byteLength, byteLength: buf.length, ...extra });
    this.chunks.push(Buffer.from(buf.buffer ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf));
    this.byteLength += buf.length;
    return idx;
  }
  pushAccessor(typed, componentType, type, extra = {}) {
    const bv = this.pushBufferView(Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength));
    const idx = this.json.accessors.length;
    this.json.accessors.push({ bufferView: bv, componentType, count: typed.length / NCOMP[type], type, ...extra });
    return idx;
  }
  write(path) {
    this.json.buffers[0].byteLength = this.byteLength;
    for (const k of Object.keys(this.json)) {
      if (Array.isArray(this.json[k]) && !this.json[k].length) delete this.json[k];
    }
    let jsonBuf = Buffer.from(JSON.stringify(this.json), 'utf8');
    const jpad = (4 - (jsonBuf.length % 4)) % 4;
    if (jpad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jpad, 0x20)]);
    let binBuf = Buffer.concat(this.chunks);
    const bpad = (4 - (binBuf.length % 4)) % 4;
    if (bpad) binBuf = Buffer.concat([binBuf, Buffer.alloc(bpad)]);
    const total = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
    const out = Buffer.alloc(total);
    out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
    out.writeUInt32LE(jsonBuf.length, 12); out.writeUInt32LE(0x4e4f534a, 16);
    jsonBuf.copy(out, 20);
    let o = 20 + jsonBuf.length;
    out.writeUInt32LE(binBuf.length, o); out.writeUInt32LE(0x004e4942, o + 4);
    binBuf.copy(out, o + 8);
    writeFileSync(path, out);
    return total;
  }
}

// ------------------------------------------------------- landmarks (bind pose)
function bindWorldPositions(json) {
  const nodes = json.nodes;
  const parents = {};
  nodes.forEach((n, i) => (n.children || []).forEach((c) => { parents[c] = i; }));
  const qrot = (q, v) => {
    const [x, y, z, w] = q, [vx, vy, vz] = v;
    const uvx = y * vz - z * vy, uvy = z * vx - x * vz, uvz = x * vy - y * vx;
    const uuvx = y * uvz - z * uvy, uuvy = z * uvx - x * uvz, uuvz = x * uvy - y * uvx;
    return [vx + 2 * (w * uvx + uuvx), vy + 2 * (w * uvy + uuvy), vz + 2 * (w * uvz + uuvz)];
  };
  const world = (i) => {
    const chain = [];
    for (let c = i; c !== undefined; c = parents[c]) chain.unshift(c);
    let pos = [0, 0, 0], rot = [0, 0, 0, 1], scl = [1, 1, 1];
    for (const ni of chain) {
      const t = nodes[ni].translation || [0, 0, 0];
      const r = nodes[ni].rotation || [0, 0, 0, 1];
      const s = nodes[ni].scale || [1, 1, 1];
      const st = [t[0] * scl[0], t[1] * scl[1], t[2] * scl[2]];
      const rt = qrot(rot, st);
      pos = [pos[0] + rt[0], pos[1] + rt[1], pos[2] + rt[2]];
      const [ax, ay, az, aw] = rot, [bx, by, bz, bw] = r;
      rot = [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
      scl = [scl[0] * s[0], scl[1] * s[1], scl[2] * s[2]];
    }
    return pos;
  };
  const byName = {};
  nodes.forEach((n, i) => { byName[n.name] = world(i); });
  return byName;
}

// ------------------------------------------------- tuxedo texel classification
// All thresholds in bind-pose world meters. Exported to scene.extras so the
// runtime vertex-tint uses the exact same numbers (character.js).
function makeLandmarks(bones) {
  const neckY = bones.neck_01[1];          // 1.52
  const wristX = Math.abs(bones.hand_r[0]); // 0.706
  const waistY = bones.pelvis[1];          // 0.949
  const ankleY = bones.foot_r[1];          // 0.086
  return {
    collarY: neckY + 0.025,     // above this = bare neck/head skin
    wristX: wristX - 0.020,     // beyond this (T-pose |x|) = hand skin
    cuffX: wristX - 0.065,      // shirt-cuff band [cuffX, wristX)
    hemY: waistY - 0.075,       // jacket hem (covers hips a little)
    beltTop: waistY + 0.010, beltBot: waistY - 0.030,  // cummerbund band
    ankleY: ankleY + 0.035,     // below = shoes
    // white shirt collar peeking above the jacket at the front
    collarBandY: neckY + 0.005,
    // shirt V (front only): from collar down to vBottomY the opening narrows
    vTopY: neckY + 0.02, vBottomY: 1.24, vHalfTop: 0.050,
    // button placket strip continues from the V down to the belt
    placketHalf: 0.011, lapelBand: 0.008,
    frontZMin: 0.015,           // torso front shell (chest z ~ +0.06..+0.13)
    skinBase: null,             // filled after reading the texture
  };
}

// region of a bind-pose point: SKIN | SHIRT | JACKET | LAPEL | BELT | TROUSERS
// | SHOES | BUTTON. Same rules drive texel painting AND (collapsed to tint
// groups) the runtime per-vertex tint in character.js.
function classify(p, L) {
  const [x, y, z] = p, ax = Math.abs(x);
  if (y > L.collarY) return 'SKIN';
  if (ax > L.wristX) return 'SKIN';
  if (y < L.ankleY) return 'SHOES';
  if (ax > L.cuffX && y > 1.30) return 'CUFF';   // shirt cuff peeking (arms are at y~1.455 in T-pose)
  if (y > L.collarBandY && z > 0 && ax < 0.09) return 'SHIRT';  // collar edge above the jacket
  if (y < L.beltTop && y > L.beltBot) return 'BELT';
  if (y <= L.beltBot) return 'TROUSERS';
  // torso front detail (shirt V + placket + lapel edging)
  if (z > L.frontZMin) {
    let inShirt = false, halfAtY = 0;
    if (y >= L.vBottomY && y <= L.vTopY) {
      halfAtY = L.vHalfTop * (y - L.vBottomY) / (L.vTopY - L.vBottomY);
      inShirt = ax < halfAtY;
    } else if (y < L.vBottomY && y > L.beltTop) {
      halfAtY = L.placketHalf;
      inShirt = ax < L.placketHalf;
    }
    if (inShirt) {
      // buttons down the placket
      for (const by of [1.20, 1.10, 1.00]) {
        if (Math.hypot(x, (y - by) * 1.4) < 0.0125) return 'BUTTON';
      }
      return 'SHIRT';
    }
    if (halfAtY > 0 && ax < halfAtY + L.lapelBand) return 'LAPEL';
  }
  return 'JACKET';
}

// texture-space paint colors (light neutrals; runtime tint multiplies)
const PAINT = {
  JACKET: [0xc9, 0xc9, 0xd2],
  LAPEL: [0x40, 0x40, 0x4a],
  SHIRT: [0xf6, 0xf4, 0xee],
  BUTTON: [0x2e, 0x2e, 0x36],
  CUFF: [0xf6, 0xf4, 0xee],
  BELT: [0x3a, 0x3a, 0x42],
  TROUSERS: [0xb9, 0xb9, 0xc1],
  SHOES: [0x35, 0x32, 0x30],
};

// ---------------------------------------------------------------- main build
const gltfPath = join(packDir, 'Base Characters/Godot - UE/Superhero_Male_FullBody.gltf');
const src = readGltf(gltfPath);
const bones = bindWorldPositions(src.json);
const L = makeLandmarks(bones);

// --- bake the tuxedo into the light-skin base color -------------------------
const tex = decodePng(readFileSync(join(packDir, 'Base Characters/Textures/T_Superhero_Male_Ligh.png')));
const W = tex.w, H = tex.h;
// working copy as RGB + a pristine copy (shade term must read SOURCE texels —
// reading the working canvas would re-shade texels already painted by an
// adjacent triangle, drawing the triangulation as white edge lines)
const canvas = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  canvas[i * 3] = tex.data[i * tex.ch];
  canvas[i * 3 + 1] = tex.data[i * tex.ch + 1];
  canvas[i * 3 + 2] = tex.data[i * tex.ch + 2];
}
const source = Buffer.from(canvas);

const bodyMeshIdx = src.json.meshes.findIndex((m) => m.name === 'Sphere.005_Retopology.004');
const bodyPrim = src.json.meshes[bodyMeshIdx].primitives[0];
const P = readAccessor(src, bodyPrim.attributes.POSITION);
const UV = readAccessor(src, bodyPrim.attributes.TEXCOORD_0);
const IDX = readAccessor(src, bodyPrim.indices);

// average skin tone of texels referenced by SKIN-classified verts (head area)
// — the runtime divides target skin palette colors by this base to get tints.
let sr = 0, sg = 0, sb = 0, sn = 0;
for (let v = 0; v < P.length / 3; v++) {
  if (classify([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], L) !== 'SKIN') continue;
  const px = Math.min(W - 1, Math.max(0, Math.round(UV[v * 2] * (W - 1))));
  const py = Math.min(H - 1, Math.max(0, Math.round(UV[v * 2 + 1] * (H - 1))));
  sr += canvas[(py * W + px) * 3]; sg += canvas[(py * W + px) * 3 + 1]; sb += canvas[(py * W + px) * 3 + 2];
  sn++;
}
L.skinBase = [Math.round(sr / sn), Math.round(sg / sn), Math.round(sb / sn)];

// rasterize every triangle; paint non-skin texels by classified region
const covered = new Uint8Array(W * H);   // 1 = covered by any triangle
for (let t = 0; t < IDX.length; t += 3) {
  const vi = [IDX[t], IDX[t + 1], IDX[t + 2]];
  const uv = vi.map((v) => [UV[v * 2] * (W - 1), UV[v * 2 + 1] * (H - 1)]);
  const pos = vi.map((v) => [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]);
  const minX = Math.max(0, Math.floor(Math.min(uv[0][0], uv[1][0], uv[2][0])) - 1);
  const maxX = Math.min(W - 1, Math.ceil(Math.max(uv[0][0], uv[1][0], uv[2][0])) + 1);
  const minY = Math.max(0, Math.floor(Math.min(uv[0][1], uv[1][1], uv[2][1])) - 1);
  const maxY = Math.min(H - 1, Math.ceil(Math.max(uv[0][1], uv[1][1], uv[2][1])) + 1);
  const [[x0, y0], [x1, y1], [x2, y2]] = uv;
  const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (Math.abs(denom) < 1e-9) continue;
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      let b0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denom;
      let b1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denom;
      let b2 = 1 - b0 - b1;
      const eps = -0.15; // slight tolerance: cover seam-edge texels
      if (b0 < eps || b1 < eps || b2 < eps) continue;
      b0 = Math.max(b0, 0); b1 = Math.max(b1, 0); b2 = Math.max(b2, 0);
      const s = b0 + b1 + b2 || 1;
      b0 /= s; b1 /= s; b2 /= s;
      const p3 = [
        b0 * pos[0][0] + b1 * pos[1][0] + b2 * pos[2][0],
        b0 * pos[0][1] + b1 * pos[1][1] + b2 * pos[2][1],
        b0 * pos[0][2] + b1 * pos[1][2] + b2 * pos[2][2],
      ];
      const o = (py * W + px) * 3;
      covered[py * W + px] = 1;
      const region = classify(p3, L);
      if (region === 'SKIN') continue;      // keep original skin texels
      const c = PAINT[region];
      // keep a whisper of the source shading so cloth isn't dead flat —
      // kept subtle so pec/ab highlights don't print through the jacket
      const shade = (source[o] + source[o + 1] + source[o + 2]) / (3 * 255);
      const m = 0.92 + shade * 0.16;
      canvas[o] = Math.min(255, c[0] * m);
      canvas[o + 1] = Math.min(255, c[1] * m);
      canvas[o + 2] = Math.min(255, c[2] * m);
    }
  }
}
// dilate painted/covered colors into uncovered background — this must run
// DEEP (16 px), not cosmetic: distant dealers sample low mip levels, and any
// background texel near an island edge (the source atlas background is tan
// skin) bleeds a light band into belts/cuffs. After dilation, flatten the
// remaining background to a neutral suit grey so even the deepest mips stay
// island-consistent.
for (let pass = 0; pass < 16; pass++) {
  const nextCovered = Uint8Array.from(covered);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (covered[y * W + x]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !covered[ny * W + nx]) continue;
        canvas.copy(canvas, (y * W + x) * 3, (ny * W + nx) * 3, (ny * W + nx) * 3 + 3);
        nextCovered[y * W + x] = 1;
        break;
      }
    }
  }
  covered.set(nextCovered);
}
for (let i = 0; i < W * H; i++) {
  if (!covered[i]) { canvas[i * 3] = 0x6a; canvas[i * 3 + 1] = 0x6a; canvas[i * 3 + 2] = 0x72; }
}

// full 2048 output — the tuxedo lines live in high-frequency texture detail;
// a 1024 downscale visibly softened the placket/lapel edges at table distance
const bodyPng = encodePng(W, H, canvas);
const eyePngRaw = decodePng(readFileSync(join(packDir, 'Base Characters/Textures/T_Eye_Brown.png')));
// eyes texture is RGBA; re-encode as RGB (alpha unused by an opaque material)
const eyeRgb = Buffer.alloc(eyePngRaw.w * eyePngRaw.h * 3);
for (let i = 0; i < eyePngRaw.w * eyePngRaw.h; i++) {
  eyeRgb[i * 3] = eyePngRaw.data[i * eyePngRaw.ch];
  eyeRgb[i * 3 + 1] = eyePngRaw.data[i * eyePngRaw.ch + 1];
  eyeRgb[i * 3 + 2] = eyePngRaw.data[i * eyePngRaw.ch + 2];
}
const eyePng = encodePng(eyePngRaw.w, eyePngRaw.h, eyeRgb);

// --- assemble dealer-characters.glb -----------------------------------------
const b = new GlbBuilder();
b.json.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 });
const imgBody = b.json.images.length;
b.json.images.push({ bufferView: b.pushBufferView(bodyPng), mimeType: 'image/png', name: 'T_Dealer_Tuxedo' });
const imgEye = b.json.images.length;
b.json.images.push({ bufferView: b.pushBufferView(eyePng), mimeType: 'image/png', name: 'T_Eye_Brown' });
b.json.textures.push({ sampler: 0, source: imgBody }, { sampler: 0, source: imgEye });

// material order preserved from the v1 GLB: MI_Hair_1, MI_Eyes, MI_Superhero_Male
b.json.materials.push(
  { name: 'MI_Hair_1', pbrMetallicRoughness: { baseColorFactor: [0.16, 0.12, 0.08, 1], metallicFactor: 0, roughnessFactor: 0.75 } },
  { name: 'MI_Eyes', pbrMetallicRoughness: { baseColorTexture: { index: 1 }, metallicFactor: 0, roughnessFactor: 0.35 } },
  { name: 'MI_Superhero_Male', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.8 } },
);

// meshes: keep POSITION/NORMAL/JOINTS/WEIGHTS (+TEXCOORD_0 where textured)
const KEEP_UV = { 1: true, 2: true };   // eyes + body keep UVs; eyebrows flat
for (let mi = 0; mi < src.json.meshes.length; mi++) {
  const prim = src.json.meshes[mi].primitives[0];
  const attrs = {};
  const posAcc = src.json.accessors[prim.attributes.POSITION];
  attrs.POSITION = b.pushAccessor(readAccessor(src, prim.attributes.POSITION), 5126, 'VEC3', { min: posAcc.min, max: posAcc.max });
  attrs.NORMAL = b.pushAccessor(readAccessor(src, prim.attributes.NORMAL), 5126, 'VEC3');
  if (KEEP_UV[mi]) attrs.TEXCOORD_0 = b.pushAccessor(readAccessor(src, prim.attributes.TEXCOORD_0), 5126, 'VEC2');
  attrs.JOINTS_0 = b.pushAccessor(readAccessor(src, prim.attributes.JOINTS_0), 5121, 'VEC4');
  attrs.WEIGHTS_0 = b.pushAccessor(readAccessor(src, prim.attributes.WEIGHTS_0), 5126, 'VEC4');
  const indices = b.pushAccessor(readAccessor(src, prim.indices), 5123, 'SCALAR');
  b.json.meshes.push({ name: src.json.meshes[mi].name, primitives: [{ attributes: attrs, indices, material: prim.material }] });
}

// nodes: copy the whole tree verbatim (bone hierarchy + 3 mesh nodes + Armature)
b.json.nodes = src.json.nodes.map((n) => JSON.parse(JSON.stringify(n)));
const armatureIdx = src.json.scenes[0].nodes[0];

// skin
const ibm = b.pushAccessor(readAccessor(src, src.json.skins[0].inverseBindMatrices), 5126, 'MAT4');
b.json.skins.push({ joints: src.json.skins[0].joints.slice(), inverseBindMatrices: ibm, skeleton: src.json.skins[0].skeleton });

// hairstyles: static meshes at bind-pose world position; runtime reparents to
// the Head bone (three's Object3D.attach) and tints. Beard composes with hair.
const HAIRSTYLES = ['Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Buns', 'Hair_Long', 'Hair_Beard'];
for (const name of HAIRSTYLES) {
  const hg = readGltf(join(packDir, `Hairstyles/Origin at 0/glTF (Godot)/${name}.gltf`));
  const prim = hg.json.meshes[0].primitives[0];
  const posAcc = hg.json.accessors[prim.attributes.POSITION];
  const attrs = {
    POSITION: b.pushAccessor(readAccessor(hg, prim.attributes.POSITION), 5126, 'VEC3', { min: posAcc.min, max: posAcc.max }),
    NORMAL: b.pushAccessor(readAccessor(hg, prim.attributes.NORMAL), 5126, 'VEC3'),
  };
  const idxArr = readAccessor(hg, prim.indices);
  const indices = b.pushAccessor(idxArr, hg.json.accessors[prim.indices].componentType === 5125 ? 5125 : 5123, 'SCALAR');
  const meshIdx = b.json.meshes.length;
  b.json.meshes.push({ name, primitives: [{ attributes: attrs, indices, material: 0 }] });
  const nodeIdx = b.json.nodes.length;
  b.json.nodes.push({ name, mesh: meshIdx });
  b.json.nodes[armatureIdx].children.push(nodeIdx);
}

b.json.scenes.push({ name: 'Scene', nodes: [armatureIdx] });
// landmarks + skin base for the runtime tint (character.js reads scene.extras)
b.json.scenes[0].extras = { dealerLandmarks: L, hairstyles: HAIRSTYLES };

const charBytes = b.write(join(ROOT, 'assets/dealer-characters.glb'));

// --- trim dealer-clips.glb ---------------------------------------------------
const KEEP_CLIPS = ['Idle_Loop', 'Idle_Talking_Loop', 'Interact', 'PickUp_Table', 'Walk_Formal_Loop', 'Walk_Loop'];
const clips = readGlb(join(ROOT, 'assets/dealer-clips.glb'));
const cb = new GlbBuilder();
cb.json.nodes = clips.json.nodes.map((n) => JSON.parse(JSON.stringify(n)));
cb.json.scenes.push(JSON.parse(JSON.stringify(clips.json.scenes[clips.json.scene || 0])));
for (const anim of clips.json.animations) {
  if (!KEEP_CLIPS.includes(anim.name)) continue;
  const samplers = anim.samplers.map((s) => {
    const readClipAcc = (idx) => {
      const acc = clips.json.accessors[idx];
      const bv = clips.json.bufferViews[acc.bufferView];
      const T = COMP[acc.componentType];
      const off = (bv.byteOffset || 0) + (acc.byteOffset || 0);
      const typed = new T(clips.bin.buffer, clips.bin.byteOffset + off, acc.count * NCOMP[acc.type]);
      return cb.pushAccessor(typed, acc.componentType, acc.type, acc.min ? { min: acc.min, max: acc.max } : {});
    };
    return { input: readClipAcc(s.input), output: readClipAcc(s.output), interpolation: s.interpolation };
  });
  cb.json.animations.push({ name: anim.name, samplers, channels: JSON.parse(JSON.stringify(anim.channels)) });
}
const clipBytes = cb.write(join(ROOT, 'assets/dealer-clips.glb'));

console.log(`dealer-characters.glb: ${(charBytes / 1024).toFixed(0)} KB`);
console.log(`dealer-clips.glb: ${(clipBytes / 1024).toFixed(0)} KB (kept: ${KEEP_CLIPS.join(', ')})`);
console.log(`combined: ${((charBytes + clipBytes) / 1024 / 1024).toFixed(2)} MB (budget 5 MB)`);
console.log(`skinBase: rgb(${L.skinBase.join(',')})`);
console.log('now run: node tools/prep-dealer-assets.mjs assets/dealer-characters.glb assets/dealer-clips.glb');
