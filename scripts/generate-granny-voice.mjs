// Dev-time only: generates the granny voice clips for da-siu-yan.
// Usage: GEMINI_API_KEY=... node scripts/generate-granny-voice.mjs [--force] [--only id,id]
// Requires ffmpeg on PATH. Never runs at game runtime.
import { INTRO, FINALE, LINES } from '../portfolio/public/games/da-siu-yan/chant-lines.js';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE = 'Gacrux';
const RATE = 24000;
const PAD_S = 0.4;
const TRIM_THRESHOLD = 700; // int16 abs, ≈ -33 dBFS

const CANTO_RULE = '你必須由頭到尾用香港廣東話(粵語)發音讀出每一個字,特別係句尾嗰幾個字都一定要用粵語讀音,絕對唔可以用普通話讀任何一個字。';
const VARIANTS = {
  std: `你係香港鵝頸橋底打小人嘅老婆婆,把聲又嗲又惡,好有節奏咁一路打一路鬧。${CANTO_RULE}用大聲、憤怒、拉長音嘅廣東話嗌出以下呢句咒語:`,
  low: `你係香港鵝頸橋底打小人嘅老婆婆,把聲低沉沙啞,慢慢地、陰陰沉沉又惡死。${CANTO_RULE}用低沉嘅廣東話讀出以下呢句咒語:`
};

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'portfolio', 'public', 'games', 'da-siu-yan', 'voice');
const force = process.argv.includes('--force');
const onlyArg = process.argv.find((a) => a.startsWith('--only'));
const only = onlyArg ? process.argv[process.argv.indexOf(onlyArg) + 1].split(',') : null;
const CLIPS = [INTRO, ...LINES, FINALE];

async function tts(styles, text) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${styles}${text}` }] }],
      generationConfig: { responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } }
    })
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part) throw new Error(`no audio in response: ${JSON.stringify(data).slice(0, 300)}`);
  return Buffer.from(part.data, 'base64'); // raw s16le 24k mono PCM
}

function trimAndPad(pcm) {
  const s = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1);
  let a = 0, b = s.length - 1;
  while (a < b && Math.abs(s[a]) < TRIM_THRESHOLD) a++;
  while (b > a && Math.abs(s[b]) < TRIM_THRESHOLD) b--;
  const pad = new Int16Array(Math.round(PAD_S * RATE));
  const out = new Int16Array(pad.length * 2 + (b - a + 1));
  out.set(s.subarray(a, b + 1), pad.length);
  return Buffer.from(out.buffer);
}

function encodeMp3(pcm, file) {
  execFileSync('ffmpeg', ['-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-codec:a', 'libmp3lame', '-b:a', '64k', file], { input: pcm, stdio: ['pipe', 'ignore', 'ignore'] });
}

const manifest = { std: [], low: [] };
for (const variant of Object.keys(VARIANTS)) {
  mkdirSync(join(OUT, variant), { recursive: true });
  for (const clip of CLIPS) {
    const rel = `${variant}/${clip.id}.mp3`;
    const file = join(OUT, rel);
    let duration;
    if (!force && (!only || !only.includes(clip.id)) && existsSync(file)) {
      duration = parseFloat(execFileSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }));
      console.log(`skip  ${rel} (${duration.toFixed(2)}s)`);
    } else {
      const pcm = trimAndPad(await tts(VARIANTS[variant], clip.text));
      duration = pcm.byteLength / 2 / RATE;
      encodeMp3(pcm, file);
      console.log(`wrote ${rel} (${duration.toFixed(2)}s)`);
      await new Promise((r) => setTimeout(r, 1100));
    }
    manifest[variant].push({ id: clip.id, file: rel, duration: Math.round(duration * 100) / 100 });
  }
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('voice/manifest.json written');
