// Dev-time only. Builds the material for granny-audition.html, which answers
// two questions the machine cannot answer for itself:
//
//   1. Which yue-HK voice sounds most like the 打小人 婆婆?
//   2. How much ageing / rasp on top?
//
// Output goes to scripts/da-siu-yan/compare/ (gitignored). The game's voice/
// directory is never touched.
//
// Usage: node scripts/da-siu-yan/gen-granny-audition.mjs
// Requires ffmpeg + ffprobe and the service-account JSON (see yue-tts.mjs).
//
// Cost: one API call per female voice (16), no call for the chains — they are
// ffmpeg passes over the incumbent voice's already-synthesized audio.
import { LINES } from '../../portfolio/public/games/da-siu-yan/chant-lines.js';
import { listVoices, synthesize, VOICE_NAME } from './yue-tts.mjs';
import { CHAINS, CHAIN_BY_KEY, encodeWithChain, duration } from './granny-chains.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// line-02 does double duty: 12 syllables is enough to judge a voice, and it
// contains 抖 — one of the characters the human review found mispronounced.
const CLIP = LINES.find((l) => l.id === 'line-02');

// Applied to every voice as a second sample, so a voice that sounds flat when
// clean but good when aged is not discarded at the raw stage.
const PREVIEW_CHAIN = 'aged-mid';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, 'compare');
const V_DIR = join(ROOT, 'voices');
const C_DIR = join(ROOT, 'chains');

mkdirSync(V_DIR, { recursive: true });
mkdirSync(C_DIR, { recursive: true });

const all = await listVoices();
const female = all
  .filter((v) => v.ssmlGender === 'FEMALE')
  .sort((a, b) => {
    const rank = (n) => (n.includes('Chirp3-HD') ? 0 : 1);
    return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
  });
console.log(`${female.length} FEMALE yue-HK voices\n`);

const preview = CHAIN_BY_KEY.get(PREVIEW_CHAIN);
const manifest = {
  text: CLIP.text,
  clipId: CLIP.id,
  incumbent: VOICE_NAME,
  previewChain: { key: preview.key, label: preview.label },
  reference: { std: `${CLIP.id}.mp3`, low: `${CLIP.id}.mp3` },
  voices: [],
  chains: []
};

let incumbentPcm = null;

for (const v of female) {
  const short = v.name.replace('yue-HK-', '');
  const pcm = await synthesize(CLIP.text, { voiceName: v.name, audioEncoding: 'LINEAR16' });
  if (v.name === VOICE_NAME) incumbentPcm = pcm;

  const rawFile = join(V_DIR, `${short}.raw.mp3`);
  const agedFile = join(V_DIR, `${short}.${preview.key}.mp3`);
  encodeWithChain(pcm, CHAIN_BY_KEY.get('raw'), rawFile);
  encodeWithChain(pcm, preview, agedFile);

  manifest.voices.push({
    name: v.name,
    short,
    kind: v.name.includes('Chirp3-HD') ? 'Chirp3-HD' : 'Standard',
    incumbent: v.name === VOICE_NAME,
    raw: { file: `voices/${short}.raw.mp3`, duration: +duration(rawFile).toFixed(2) },
    aged: { file: `voices/${short}.${preview.key}.mp3`, duration: +duration(agedFile).toFixed(2) }
  });
  console.log(`  ${short.padEnd(24)} raw ${duration(rawFile).toFixed(2)}s  ${preview.key} ${duration(agedFile).toFixed(2)}s`);
  await new Promise((r) => setTimeout(r, 250));
}

if (!incumbentPcm) {
  console.error(`\nIncumbent voice ${VOICE_NAME} was not in the FEMALE list — cannot build the chain matrix.`);
  process.exit(1);
}

console.log(`\nchain matrix on ${VOICE_NAME}:`);
for (const chain of CHAINS) {
  const file = join(C_DIR, `${chain.key}.mp3`);
  encodeWithChain(incumbentPcm, chain, file);
  const d = +duration(file).toFixed(2);
  manifest.chains.push({ ...chain, file: `chains/${chain.key}.mp3`, duration: d });
  console.log(`  ${chain.key.padEnd(14)} ${d.toFixed(2)}s`);
}

writeFileSync(join(ROOT, 'audition.json'), JSON.stringify(manifest, null, 1));
console.log(`\n${manifest.voices.length} voices x2 + ${manifest.chains.length} chains`);
console.log('compare/audition.json written');
