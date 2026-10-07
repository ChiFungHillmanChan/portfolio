import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
async function glb(file) {
  const bytes = await readFile(new URL(file, root));
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length));
  const bin = bytes.subarray(28 + length);
  return { json, view: index => {const v=json.bufferViews[index];return bin.subarray(v.byteOffset || 0,(v.byteOffset || 0)+v.byteLength);} };
}
const original = await glb('room-reference/viewer/room.glb');
const { version } = JSON.parse(await readFile(new URL('portfolio/src/room/roomAssetRevision.json', root)));
const revisionRoot = new URL(`portfolio/public/room-viewer/v${version}/`, root);
const delivery = await glb(`portfolio/public/room-viewer/v${version}/room.glb`);
const hidden = new Set(JSON.parse(await readFile(new URL('scripts/room-hidden-meshes.json',root))));
const sanitize = name => name.replace(/\s/g,'_').replace(/[\[\]\.:/]/g,'');

async function filesBelow(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory()) files.push(...(await filesBelow(new URL(`${item.name}/`, directory))).map(name => `${item.name}/${name}`));
    else files.push(item.name);
  }
  return files;
}

test('revisioned viewer is self-contained and preserves compatible legacy files', async () => {
  assert.match(version, /^[1-9]\d*$/);
  const files = await filesBelow(revisionRoot);
  for (const required of ['index.html', 'app.js', 'style.css', 'viewer-sizing.mjs', 'frame-scheduler.mjs', 'room.glb', 'vendor/build/three.module.js', 'vendor/examples/jsm/loaders/GLTFLoader.js']) {
    assert.ok(files.includes(required), `revision tree includes ${required}`);
  }
  assert.equal(files.some(name => /(?:^|\/)v\d+\//.test(name)), false, 'delivery never recursively copies another revision into itself');
  for (const file of files) {
    const delivered = await readFile(new URL(file, revisionRoot));
    assert.deepEqual(delivered, await readFile(new URL(`portfolio/public/room-viewer/${file}`, root)), `${file} retains its legacy URL`);
    if (!/\.(?:js|mjs|html)$/.test(file)) continue;
    const content = delivered.toString();
    for (const match of content.matchAll(/(?:from\s+|import\s*|(?:src|href)=)["'](\.[^"']+)["']/g)) {
      const reference = new URL(match[1], new URL(file, revisionRoot));
      assert.ok(reference.href.startsWith(revisionRoot.href), `${file} dependency stays in its revision: ${match[1]}`);
      await readFile(reference);
    }
  }
  const html = await readFile(new URL('index.html', revisionRoot), 'utf8');
  assert.match(html, /"three":"\.\/vendor\/build\/three\.module\.js"/);
  assert.match(await readFile(new URL('app.js', revisionRoot), 'utf8'), /loadAsync\('\.\/room\.glb'/);
});

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
