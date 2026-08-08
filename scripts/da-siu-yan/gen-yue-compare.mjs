// Dev-time only. Generates yue-HK Cloud TTS versions of just the lines the
// human review found defective, so the two engines can be A/B'd on exactly
// the characters that failed. Writes to scripts/da-siu-yan/compare/ (gitignored)
// — nothing here is shipped, and the game's voice/ directory is not touched.
//
// Usage: node scripts/da-siu-yan/gen-yue-compare.mjs [--only line-02,line-06]
// Requires ffmpeg on PATH and the service-account JSON (see yue-tts.mjs).
//
// Audio is requested as LINEAR16 and encoded to MP3 mono 64k @24kHz — the same
// settings scripts/generate-granny-voice.mjs ships — so the comparison is not
// biased by bitrate. NO atempo: the Gemini clips needed 2x because Gemini read
// them too slowly; whether yue-HK needs any stretch is a separate question and
// judging pronunciation is easiest at the natural pace.
import { INTRO, FINALE, LINES } from '../../portfolio/public/games/da-siu-yan/chant-lines.js';
import { synthesize, VOICE_NAME, LANGUAGE_CODE } from './yue-tts.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The defects the human review reported, keyed by clip. `chars` is what to
// listen for; `variants` is which of the shipped Gemini clips were bad.
const DEFECTS = {
  intro:     [{ char: '今', should: 'gam1',   heard: '讀成「暈」(-m 變 -n)', variants: ['low'] }],
  'line-02': [{ char: '抖', should: 'tau2',   heard: '讀成「斗」dau2',        variants: ['std', 'low'] }],
  'line-03': [{ char: '無', should: 'mou4',   heard: 'mou3(聲調錯)',        variants: ['low'] }],
  'line-06': [{ char: '泡', should: 'pou',    heard: 'pao',                   variants: ['std', 'low'] }],
  'line-08': [{ char: '做', should: 'zou6',   heard: '「doe」',               variants: ['std'] }],
  'line-15': [{ char: '牙', should: 'ngaa4',  heard: 'ng- 脫落',              variants: ['std', 'low'] }],
  'line-17': [{ char: '脾', should: 'bai(你嘅判斷)', heard: 'pai',           variants: ['std', 'low'] }],
  'line-20': [{ char: '喉', should: 'hau4',   heard: 'hau1(聲調錯)',        variants: ['std'] }],
  'line-21': [{ char: '膝', should: 'sat1',   heard: '入聲 -t 冇收',          variants: ['std', 'low'] }],
  'line-25': [{ char: '腮', should: 'soi1',   heard: 'sai',                   variants: ['std', 'low'] }]
};

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'compare', 'yue');
const SHIPPED = join(HERE, '..', '..', 'portfolio', 'public', 'games', 'da-siu-yan', 'voice');

const TEXT = new Map([[INTRO.id, INTRO.text], [FINALE.id, FINALE.text],
  ...LINES.map((l) => [l.id, l.text])]);

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx === -1 ? null : process.argv[onlyIdx + 1].split(',');
const ids = Object.keys(DEFECTS).filter((id) => !only || only.includes(id));
if (!ids.length) { console.error('nothing to do'); process.exit(1); }

function duration(file) {
  return parseFloat(execFileSync('ffprobe',
    ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    { encoding: 'utf8' }));
}

mkdirSync(OUT, { recursive: true });
const manifest = { voice: VOICE_NAME, languageCode: LANGUAGE_CODE, clips: [] };

for (const id of ids) {
  const text = TEXT.get(id);
  if (!text) { console.error(`no text for ${id}`); process.exit(1); }
  const pcm = await synthesize(text, { audioEncoding: 'LINEAR16' });
  const file = join(OUT, `${id}.mp3`);
  // LINEAR16 comes back as a WAV container, so let ffmpeg read it as-is.
  execFileSync('ffmpeg', ['-y', '-i', 'pipe:0', '-ac', '1', '-ar', '24000',
    '-codec:a', 'libmp3lame', '-b:a', '64k', file],
    { input: pcm, stdio: ['pipe', 'ignore', 'ignore'] });

  const dur = duration(file);
  const shipped = {};
  for (const v of ['std', 'low']) shipped[v] = duration(join(SHIPPED, v, `${id}.mp3`));
  manifest.clips.push({ id, text, duration: +dur.toFixed(2), shipped, defects: DEFECTS[id] });
  console.log(`${id.padEnd(9)} yue ${dur.toFixed(2)}s   (shipped std ${shipped.std.toFixed(2)}s / low ${shipped.low.toFixed(2)}s)`);
  await new Promise((r) => setTimeout(r, 300));
}

writeFileSync(join(HERE, 'compare', 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`\n${manifest.clips.length} clip(s) -> ${OUT}`);
console.log('compare/manifest.json written');
