#!/usr/bin/env node
// tools/prep-dealer-assets.mjs — parse GLB headers, emit assets/manifest.json.
// GLB layout: 12-byte header (magic 0x46546C67, version, length), then chunks:
// chunk header = uint32 length + uint32 type; type 0x4E4F534A is JSON.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseGlbJson(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path}: not a GLB`);
  const jsonLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${path}: first chunk not JSON`);
  return { json: JSON.parse(buf.toString('utf8', 20, 20 + jsonLen)), bytes: buf.length };
}

function describe(path) {
  const { json, bytes } = parseGlbJson(path);
  const nodes = json.nodes ?? [];
  const boneSet = new Set();
  for (const skin of json.skins ?? []) {
    for (const j of skin.joints) boneSet.add(nodes[j].name ?? `node${j}`);
  }
  const clips = (json.animations ?? []).map((a) => {
    let dur = 0;
    for (const s of a.samplers) {
      const acc = json.accessors[s.input];
      if (acc?.max?.[0] > dur) dur = acc.max[0];
    }
    return { name: a.name ?? '', dur: Math.round(dur * 1000) / 1000 };
  });
  const meshes = (json.meshes ?? []).map((m) => m.name ?? '');
  return { name: basename(path), bytes, bones: [...boneSet].sort(), clips, meshes };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node tools/prep-dealer-assets.mjs assets/*.glb');
  process.exit(1);
}
const manifest = { files: files.map(describe) };
writeFileSync(join(ROOT, 'assets/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest.files.map((f) =>
  `${f.name}: ${(f.bytes / 1024).toFixed(0)} KB, ${f.bones.length} bones, ${f.clips.length} clips`).join('\n'));
