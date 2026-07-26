// Dev-time only. Regenerates just the defective clips through Gemini TTS using
// the homophone respellings in say-candidates.mjs, so the granny voice is kept
// and only the mispronounced characters change.
//
// Output goes to scripts/da-siu-yan/compare/say/ (gitignored). The game's
// voice/ directory is NOT touched — this is still an experiment.
//
// Usage: node scripts/da-siu-yan/gen-say-test.mjs [--only line-11,line-21]
// Requires ffmpeg + ffprobe. Key comes from portfolio/.env (see gemini-tts.mjs).
import { INTRO, FINALE, LINES } from '../../portfolio/public/games/da-siu-yan/chant-lines.js';
import { CANDIDATES, diff } from './say-candidates.mjs';
import { VARIANTS, TEMPO, tts, trimAndPad, encodeMp3, duration, MODEL, VOICE } from './gemini-tts.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The shipped intro is 1.4x, not 2x — respeed-granny-voice.mjs carries
// CLIP_TEMPO = { intro: 1.4 } and PR #77 slowed it deliberately. Encoding a
// replacement intro at 2x would silently undo that, so match per clip.
const CLIP_TEMPO = { intro: 1.4 };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'compare', 'say');
const SHIPPED = join(HERE, '..', '..', 'portfolio', 'public', 'games', 'da-siu-yan', 'voice');

const TEXT = new Map([[INTRO.id, INTRO.text], [FINALE.id, FINALE.text],
  ...LINES.map((l) => [l.id, l.text])]);

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx === -1 ? null : process.argv[onlyIdx + 1].split(',');
const ids = Object.keys(CANDIDATES).filter((id) => !only || only.includes(id));
if (!ids.length) { console.error('nothing to do'); process.exit(1); }

// Refuse to spend API calls if any respelling changed something undeclared.
let fatal = 0;
for (const id of ids) {
  const text = TEXT.get(id);
  if (!text) { console.error(`${id}: not in chant-lines.js`); fatal++; continue; }
  const declared = new Set(CANDIDATES[id].targets.map((t) => `${t.from}->${t.to}`));
  const actual = diff(text, CANDIDATES[id].say).map((r) => `${r.was}->${r.now}`);
  for (const a of actual) if (!declared.has(a)) { console.error(`${id}: undeclared change ${a}`); fatal++; }
  for (const d of declared) if (!actual.includes(d)) { console.error(`${id}: declared but absent ${d}`); fatal++; }
}
if (fatal) { console.error(`\n${fatal} problem(s) — refusing to generate.`); process.exit(1); }

console.log(`model ${MODEL}  voice ${VOICE}\n`);
const manifest = { model: MODEL, voice: VOICE, clips: [] };

for (const id of ids) {
  const c = CANDIDATES[id];
  const text = TEXT.get(id);
  const tempo = CLIP_TEMPO[id] ?? TEMPO;
  const takes = [];
  for (const variant of c.variants) {
    mkdirSync(join(OUT, variant), { recursive: true });
    const file = join(OUT, variant, `${id}.mp3`);
    const pcm = trimAndPad(await tts(VARIANTS[variant], c.say));
    encodeMp3(pcm, file, tempo);
    const d = +duration(file).toFixed(2);
    const shipped = +duration(join(SHIPPED, variant, `${id}.mp3`)).toFixed(2);
    takes.push({ variant, file: `say/${variant}/${id}.mp3`, duration: d, shipped, tempo });
    console.log(`  ${id.padEnd(9)} ${variant.padEnd(4)} new ${d.toFixed(2)}s  (shipped ${shipped.toFixed(2)}s, tempo ${tempo}x)`);
    await new Promise((r) => setTimeout(r, 1100));
  }
  manifest.clips.push({
    id, text, say: c.say, targets: c.targets,
    diff: diff(text, c.say), takes
  });
}

writeFileSync(join(HERE, 'compare', 'say.json'), JSON.stringify(manifest, null, 1));
const n = manifest.clips.reduce((a, c) => a + c.takes.length, 0);
console.log(`\n${manifest.clips.length} clip(s), ${n} take(s) -> ${OUT}`);
console.log('compare/say.json written');
