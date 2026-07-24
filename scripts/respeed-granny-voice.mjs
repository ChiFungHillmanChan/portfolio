// Dev-time only: re-derives the da-siu-yan granny voice clips at a different
// speed. ffmpeg `atempo` time-stretches, so the pitch and the granny timbre
// survive — unlike playbackRate, which would shift her up an octave.
//
// Usage: node scripts/respeed-granny-voice.mjs [--tempo 2] [--from <git-ref>]
//
// Every run reads the PRISTINE originals out of git rather than whatever is on
// disk, so speeds never stack: after shipping 2x, `--tempo 1.6` gives 1.6x of
// the original, not 1.6x of the 2x file. No GEMINI_API_KEY, no network.
// Requires ffmpeg + ffprobe on PATH. Bump sw.js CACHE afterwards.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// The single commit that introduced the Gemini-generated clips (PR #73).
const ORIGIN_REF = '2934677';
const VOICE_REL = 'portfolio/public/games/da-siu-yan/voice';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(REPO, VOICE_REL);

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const tempo = Number(flag('tempo', '2'));
const ref = flag('from', ORIGIN_REF);
if (!(tempo > 0)) { console.error(`--tempo must be a positive number, got ${flag('tempo')}`); process.exit(1); }

// Per-clip overrides. The intro is the first thing anyone hears and sets the
// tone, so it needs room to land; the chant lines want to rattle along.
// Override from the CLI with e.g. --tempo-intro 1.6.
const CLIP_TEMPO = { intro: 1.4 };
function tempoFor(id) {
  const cli = flag(`tempo-${id}`);
  const t = cli !== undefined ? Number(cli) : (CLIP_TEMPO[id] ?? tempo);
  if (!(t > 0)) { console.error(`--tempo-${id} must be a positive number, got ${cli}`); process.exit(1); }
  return t;
}

// ffmpeg's atempo is only well-behaved within [0.5, 2] per instance, so a
// larger or smaller factor is expressed as a chain of in-range instances.
function atempoChain(rate) {
  const parts = [];
  let left = rate;
  while (left > 2) { parts.push(2); left /= 2; }
  while (left < 0.5) { parts.push(0.5); left /= 0.5; }
  parts.push(left);
  return parts.map((p) => `atempo=${p}`).join(',');
}

const git = (args) => execFileSync('git', args, { cwd: REPO, maxBuffer: 64 << 20 });
const original = JSON.parse(git(['show', `${ref}:${VOICE_REL}/manifest.json`]).toString('utf8'));

const tmp = mkdtempSync(join(tmpdir(), 'granny-respeed-'));
const manifest = {};
let clips = 0;
try {
  for (const [variant, list] of Object.entries(original)) {
    manifest[variant] = [];
    for (const clip of list) {
      const src = join(tmp, 'src.mp3');
      writeFileSync(src, git(['show', `${ref}:${VOICE_REL}/${clip.file}`]));
      const dest = join(OUT, clip.file);
      const rate = tempoFor(clip.id);
      if (rate === 1) {
        writeFileSync(dest, git(['show', `${ref}:${VOICE_REL}/${clip.file}`]));
      } else {
        execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-filter:a', atempoChain(rate),
          '-codec:a', 'libmp3lame', '-b:a', '64k', dest]);
      }
      const duration = parseFloat(execFileSync('ffprobe',
        ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest], { encoding: 'utf8' }));
      manifest[variant].push({ id: clip.id, file: clip.file, duration: Math.round(duration * 100) / 100 });
      console.log(`${clip.file}  ${clip.duration.toFixed(2)}s -> ${duration.toFixed(2)}s  (${rate}x)`);
      clips++;
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
const overrides = Object.entries(CLIP_TEMPO).map(([id, t]) => `${id} ${t}x`).join(', ');
console.log(`\n${clips} clips from ${ref} at ${tempo}x${overrides ? ` (${overrides})` : ''}; voice/manifest.json written.`);
console.log('Remember to bump CACHE in portfolio/public/games/da-siu-yan/sw.js.');
