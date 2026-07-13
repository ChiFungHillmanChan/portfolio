#!/usr/bin/env node
// Inlines vendor + css + src into index.html. No dependencies.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

export const SRC_ORDER = [
  'src/logic/wallet.js',
  'src/logic/tables.js',
  'src/logic/layouts.js',
  'src/logic/outcomes.js',
  'src/engine/tween.js',
  'src/engine/app.js',
  'src/engine/assets.js',
  'src/engine/cards.js',
  'src/engine/chips3d.js',
  'src/engine/hud.js',
  'src/rooms/lobby.js',
  'src/rooms/roulette.js',
  'src/rooms/blackjack.js',
  'src/rooms/baccarat.js',
  'src/rooms/uth.js',
  'src/boot.js',
];

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const guard = (name, code) => {
  if (code.includes('</script')) throw new Error(`${name} contains "</script" — not inlinable`);
  return code;
};

export function build() {
  const vendor = guard('vendor', read('vendor/three-0.149.0.min.js'));
  const css = read('src/style.css');
  const app = SRC_ORDER.map((p) => `\n// ===== ${p} =====\n` + guard(p, read(p))).join('\n');
  let html = read('template.html');
  // Replacer functions avoid `$`-pattern substitution bugs with minified code.
  html = html.replace('/*__CSS__*/', () => css);
  html = html.replace('//__VENDOR__', () => vendor);
  html = html.replace('//__APP__', () => app);
  writeFileSync(join(ROOT, 'index.html'), html);
  return html.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bytes = build();
  console.log(`built index.html (${(bytes / 1024).toFixed(0)} KB)`);
}
