import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
async function glb(file) {
  const bytes = await readFile(new URL(file, root));
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length));
  const bin = bytes.subarray(28 + length);
  return { json, view: index => {const v=json.bufferViews[index];return bin.subarray(v.byteOffset || 0,(v.byteOffset || 0)+v.byteLength);} };
}
const original = await glb('room-reference/viewer/room.glb');
const delivery = await glb('portfolio/public/room-viewer/room.glb');
const hidden = new Set(JSON.parse(await readFile(new URL('scripts/room-hidden-meshes.json',root))));
const sanitize = name => name.replace(/\s/g,'_').replace(/[\[\]\.:/]/g,'');

test('delivery preserves every visible vertex attribute/index and every texture pixel', () => {
  assert.equal(delivery.json.nodes.length,original.json.nodes.length);
  for (const node of original.json.nodes) {
    if (node.mesh === undefined || hidden.has(sanitize(node.name))) continue;
    const before=original.json.meshes[node.mesh], after=delivery.json.meshes[node.mesh];
    assert.equal(after.primitives.length,before.primitives.length);
    before.primitives.forEach((primitive,i)=> {
      for (const name of [...Object.keys(primitive.attributes),'indices']) {
        const a = name === 'indices' ? primitive.indices : primitive.attributes[name];
        const b = name === 'indices' ? after.primitives[i].indices : after.primitives[i].attributes[name];
        if (a === undefined) continue;
        const aa=original.json.accessors[a], bb=delivery.json.accessors[b];
        assert.deepEqual({...bb,bufferView:null},{...aa,bufferView:null},node.name);
        assert.deepEqual(delivery.view(bb.bufferView),original.view(aa.bufferView),node.name);
      }
    });
  }
  original.json.images.forEach((image,i)=>assert.deepEqual(delivery.view(delivery.json.images[i].bufferView),original.view(image.bufferView),image.name));
});

test('hidden proxies retain measured layout bounds and mesh triangle topology', () => {
  let count=0;
  for (const node of original.json.nodes) {
    if (node.mesh === undefined || !hidden.has(sanitize(node.name))) continue;
    count++;
    original.json.meshes[node.mesh].primitives.forEach((primitive,i)=> {
      const source=original.json.accessors[primitive.attributes.POSITION];
      const proxy=delivery.json.meshes[node.mesh].primitives[i];
      const position=delivery.json.accessors[proxy.attributes.POSITION];
      assert.deepEqual(position.min,source.min);assert.deepEqual(position.max,source.max);
      assert.equal(proxy.mode,4);assert.equal(position.count,36);
    });
  }
  assert.equal(count,234);
});
