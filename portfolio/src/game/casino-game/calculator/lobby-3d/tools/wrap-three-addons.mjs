#!/usr/bin/env node
// tools/wrap-three-addons.mjs — fetch three r149 example modules and wrap
// them for this build's classic-script global-THREE style. Run once; output
// vendor/three-addons-0.149.js is committed.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VER = '0.149.0';

async function fetchSrc(path) {
  const res = await fetch(`https://unpkg.com/three@${VER}/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

const THREE_IMPORT_RE = /import\s*\{([\s\S]*?)\}\s*from\s*['"]three['"];?/;

// Converts a module's `import { A, B } from 'three'` into a destructure off
// the global THREE, and strips `export` keywords/blocks. Does NOT handle
// non-'three' imports — callers must inline those first (see below).
function toGlobalBody(code) {
  code = code.replace(new RegExp(THREE_IMPORT_RE, 'g'), 'const {$1} = THREE;');
  code = code.replace(/export\s*\{[\s\S]*?\};?/g, '');
  code = code.replace(/export\s+(class|function|const)/g, '$1');
  return code;
}

function wrap(code, name, exports) {
  code = toGlobalBody(code);
  if (/^\s*import\s/m.test(code)) throw new Error(`${name}: unhandled non-'three' import — inline it manually`);
  return `// ==== ${name} (three@${VER}, wrapped by tools/wrap-three-addons.mjs) ====\n` +
    `(() => {\n${code}\n${exports.map((e) => `THREE.${e.global} = ${e.local};`).join('\n')}\n})();\n`;
}

// Adaptation vs. the task brief: r149's GLTFLoader.js does NOT import only
// from 'three' — it also does
//   import { toTrianglesDrawMode } from '../utils/BufferGeometryUtils.js';
// Per the brief's own fallback note, fetch that module too and prepend its
// body inside GLTFLoader's wrapped closure, ahead of GLTFLoader's own code,
// so `toTrianglesDrawMode` resolves as a plain in-scope function.
// BufferGeometryUtils.js itself only imports from 'three', so it needs no
// further recursion, and there are no top-level name collisions between the
// two files' own declarations (verified by hand against r149 sources).
//
// Second-order adaptation found while smoke-testing: GLTFLoader.js and
// BufferGeometryUtils.js both destructure overlapping names from THREE
// (BufferAttribute, BufferGeometry, InterleavedBuffer,
// InterleavedBufferAttribute, TriangleFanDrawMode, TriangleStripDrawMode,
// Vector3). Converting each file's `import {...} from 'three'` into its own
// `const {...} = THREE;` independently — which is what the brief's wrap()
// does when simply concatenating two already-wrapped bodies — produces two
// `const BufferAttribute = ...` bindings in the same closure scope, a
// `SyntaxError: Identifier 'BufferAttribute' has already been declared`.
// Fix: pull the two files' three-import name lists out, dedupe/union them,
// and emit exactly one `const { ... } = THREE;` for the combined GLTFLoader
// closure instead of one per source file.
let gltfSrc = await fetchSrc('examples/jsm/loaders/GLTFLoader.js');
const BGU_IMPORT = "import { toTrianglesDrawMode } from '../utils/BufferGeometryUtils.js';";
if (!gltfSrc.includes(BGU_IMPORT)) {
  throw new Error('GLTFLoader: expected BufferGeometryUtils relative import not found — three version likely changed, re-check imports manually');
}
let bguSrc = await fetchSrc('examples/jsm/utils/BufferGeometryUtils.js');

const gltfNamesMatch = gltfSrc.match(THREE_IMPORT_RE);
const bguNamesMatch = bguSrc.match(THREE_IMPORT_RE);
if (!gltfNamesMatch || !bguNamesMatch) throw new Error('expected a `from \'three\'` import in both GLTFLoader.js and BufferGeometryUtils.js');
const splitNames = (s) => s.split(',').map((n) => n.trim()).filter(Boolean);
const combinedNames = [...new Set([...splitNames(gltfNamesMatch[1]), ...splitNames(bguNamesMatch[1])])];

// Strip export syntax first, then remove (not convert) each file's own
// `import {...} from 'three'` — the single combined const below replaces both.
bguSrc = bguSrc.replace(/export\s*\{[\s\S]*?\};?/g, '').replace(/export\s+(class|function|const)/g, '$1');
bguSrc = bguSrc.replace(THREE_IMPORT_RE, '');
if (/^\s*import\s/m.test(bguSrc)) throw new Error('BufferGeometryUtils: unhandled non-\'three\' import — inline it manually');

gltfSrc = gltfSrc.replace(BGU_IMPORT, '');
gltfSrc = gltfSrc.replace(/export\s*\{[\s\S]*?\};?/g, '').replace(/export\s+(class|function|const)/g, '$1');
gltfSrc = gltfSrc.replace(THREE_IMPORT_RE, '');
if (/^\s*import\s/m.test(gltfSrc)) throw new Error('GLTFLoader: unhandled non-\'three\' import — inline it manually');

const combinedGltfBody = `const { ${combinedNames.join(', ')} } = THREE;\n` +
  `// ---- BufferGeometryUtils (inlined: GLTFLoader needs toTrianglesDrawMode) ----\n${bguSrc}\n// ---- end BufferGeometryUtils ----\n${gltfSrc}`;
const gltf = `// ==== GLTFLoader (three@${VER}, wrapped by tools/wrap-three-addons.mjs) ====\n` +
  `(() => {\n${combinedGltfBody}\nTHREE.GLTFLoader = GLTFLoader;\n})();\n`;
const skel = wrap(await fetchSrc('examples/jsm/utils/SkeletonUtils.js'), 'SkeletonUtils',
  [{ global: 'SkeletonUtils', local: '{ clone }' }]);

const out = gltf + skel;
if (out.includes('</script')) throw new Error('output contains </script — not inlinable');
writeFileSync(join(ROOT, 'vendor/three-addons-0.149.js'), out);
console.log(`wrote vendor/three-addons-0.149.js (${(out.length / 1024).toFixed(0)} KB)`);
