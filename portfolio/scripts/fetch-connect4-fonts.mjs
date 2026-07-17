/* One-shot: download the exact Google Fonts CSS connect4 uses (latin subsets
   only), store woff2 files locally, emit fonts/fonts.css with local URLs.
   Re-run only if the font families in connect4/index.html ever change. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=JetBrains+Mono:wght@400;600&display=swap';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'games', 'connect4', 'fonts');

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
const parts = css.split(/\/\* ([a-z-]+) \*\//).slice(1); // [subset, block, subset, block, ...]
let out = '';
const files = new Map(); // remote url -> local name
for (let i = 0; i < parts.length; i += 2) {
  if (parts[i] !== 'latin') continue;
  let block = parts[i + 1];
  for (const url of block.match(/https:\/\/[^)]+\.woff2/g) ?? []) {
    if (!files.has(url)) files.set(url, `f${files.size}.woff2`);
    block = block.split(url).join(files.get(url));
  }
  out += `/* latin */${block}`;
}
if (files.size === 0) throw new Error('no latin woff2 URLs found — Google CSS format changed?');
mkdirSync(OUT, { recursive: true });
for (const [url, name] of files) {
  writeFileSync(join(OUT, name), Buffer.from(await (await fetch(url)).arrayBuffer()));
}
writeFileSync(join(OUT, 'fonts.css'), out);
console.log(`wrote ${files.size} woff2 files + fonts.css to ${OUT}`);
