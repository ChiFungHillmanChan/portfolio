import { readFile, writeFile, mkdir, cp, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'room-reference/viewer');
// Bump this tracked revision when publishing changed room assets. The whole
// relative-import tree gets a fresh URL, independent of an intermediary cache.
const { version } = JSON.parse(await readFile(path.join(root, 'portfolio/src/room/roomAssetRevision.json')));
if (typeof version !== 'string' || !/^[1-9]\d*$/.test(version)) throw new Error('Room asset version must be a positive integer string.');
const legacyDestination = path.join(root, 'portfolio/public/room-viewer');
const destination = path.join(legacyDestination, `v${version}`);
const destinations = [legacyDestination, destination];
await Promise.all(destinations.map(directory => mkdir(directory, { recursive: true })));
for (const item of await readdir(source, { withFileTypes: true })) {
  if (item.name === 'vendor' || (/\.(?:js|mjs|css|html)$/.test(item.name) && !/test\.|hillman-character|life-motion|room-life|quilt-motion/.test(item.name))) {
    // Always copy individual source files, never a delivery directory containing
    // another revision. Legacy URLs remain available for older open clients.
    await Promise.all(destinations.map(directory => cp(path.join(source, item.name), path.join(directory, item.name), { recursive: true })));
  }
}
// The CV is private; remove any stale public copy from earlier preparation.
await rm(path.join(root, 'portfolio/public/ChiFungHillmanChan.pdf'), { force: true });

// Preserve node names and bounding boxes used by the existing refiners, replacing
// ONLY meshes measured permanently hidden by the accepted scene with bounds proxies.
// All visible geometry and texture pixels are byte-for-byte preserved.
const hidden = new Set(JSON.parse(await readFile(path.join(root, 'scripts/room-hidden-meshes.json'))));
const original = await readFile(path.join(source, 'room.glb'));
const jsonLength = original.readUInt32LE(12);
const document = JSON.parse(original.subarray(20, 20 + jsonLength).toString());
const binStart = 20 + jsonLength + 8;
const originalBin = original.subarray(binStart);
const parts = [originalBin];
let offset = originalBin.length, replaced = 0;
const sanitize = name => name.replace(/\s/g, '_').replace(/[\[\]\.:/]/g, '');
for (const node of document.nodes) {
  if (node.mesh === undefined || !hidden.has(sanitize(node.name || ''))) continue;
  const mesh = document.meshes[node.mesh];
  for (const primitive of mesh.primitives) {
    const position = document.accessors[primitive.attributes.POSITION];
    if (!position.min || !position.max) continue;
    const values = [];
    for (const corner of [0,1,3,0,3,2,4,6,7,4,7,5,0,4,5,0,5,1,2,3,7,2,7,6,0,2,6,0,6,4,1,5,7,1,7,3]) for (let axis = 0; axis < 3; axis++) values.push((corner & (1 << axis)) ? position.max[axis] : position.min[axis]);
    const bytes = Buffer.from(new Float32Array(values).buffer);
    const viewIndex = document.bufferViews.length;
    document.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target: 34962 });
    parts.push(bytes); offset += bytes.length;
    const accessorIndex = document.accessors.length;
    document.accessors.push({ bufferView: viewIndex, componentType: 5126, count: 36, type: 'VEC3', min: position.min, max: position.max });
    primitive.attributes = { POSITION: accessorIndex };
    delete primitive.indices; delete primitive.targets;
    // A box retains Mesh identity and bounds for the procedural refiners.
    primitive.mode = 4;
  }
  replaced++;
}
const combined = Buffer.concat(parts);
const usedAccessors = new Set();
for (const mesh of document.meshes) for (const primitive of mesh.primitives) {
  Object.values(primitive.attributes).forEach(i => usedAccessors.add(i));
  if (primitive.indices !== undefined) usedAccessors.add(primitive.indices);
}
const accessorMap = new Map([...usedAccessors].map((old, index) => [old, index]));
document.accessors = [...usedAccessors].map(i => document.accessors[i]);
for (const mesh of document.meshes) for (const primitive of mesh.primitives) {
  for (const name of Object.keys(primitive.attributes)) primitive.attributes[name] = accessorMap.get(primitive.attributes[name]);
  if (primitive.indices !== undefined) primitive.indices = accessorMap.get(primitive.indices);
}
const usedViews = new Set(document.accessors.map(a => a.bufferView));
for (const image of document.images || []) if (image.bufferView !== undefined) usedViews.add(image.bufferView);
const packed = []; const viewMap = new Map(); let length = 0;
for (const old of usedViews) {
  const view = document.bufferViews[old];
  const bytes = combined.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const pad = (4 - length % 4) % 4;
  if (pad) {packed.push(Buffer.alloc(pad));length += pad;}
  viewMap.set(old, { index: viewMap.size, value: { ...view, byteOffset: length } });
  packed.push(bytes); length += bytes.length;
}
for (const accessor of document.accessors) accessor.bufferView = viewMap.get(accessor.bufferView).index;
for (const image of document.images || []) if (image.bufferView !== undefined) image.bufferView = viewMap.get(image.bufferView).index;
document.bufferViews = [...viewMap.values()].map(v => v.value);
const binPad = (4 - length % 4) % 4; if (binPad) packed.push(Buffer.alloc(binPad));
const bin = Buffer.concat(packed); document.buffers[0].byteLength = bin.length;
let json = Buffer.from(JSON.stringify(document));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const header = Buffer.alloc(20); header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28 + json.length + bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binHeader = Buffer.alloc(8);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);
const output = Buffer.concat([header,json,binHeader,bin]);
await Promise.all(destinations.map(directory => writeFile(path.join(directory,'room.glb'),output)));
const report = { version, assetPath: `/room-viewer/v${version}/`, originalBytes: original.length, deliveryBytes: output.length, replacedHiddenMeshes: replaced, reductionPercent: Math.round((1-output.length/original.length)*1000)/10 };
await Promise.all(destinations.map(directory => writeFile(path.join(directory,'delivery-report.json'),JSON.stringify(report,null,2)+'\n')));
console.log('Prepared room assets:', report);
