// Dev-time only. The Gemini TTS call, extracted verbatim from
// generate-granny-voice.mjs so that experiments and the real generator cannot
// drift apart. Values here are the single source of truth.
//
// Why Gemini and not Cloud TTS: Gemini TTS is the only one of the two that
// accepts a style prompt, which is what produces the 鵝頸橋 婆婆 character.
// Cloud TTS refuses it outright — "Prompt is only supported for Gemini TTS" —
// and refuses Gemini voices for Cantonese — "Requested language code 'yue-HK'
// is not supported for Gemini voices". So the voice has to come from here.
//
// The cost of that choice: Gemini has no Cantonese pronunciation dictionary,
// so individual characters come out wrong. There is no phoneme or jyutping
// input to fix that (verified: Gemini TTS is text-in only). The only lever is
// the text itself — see the `say` field in chant-lines.js.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const MODEL = 'gemini-3.1-flash-tts-preview';
export const VOICE = 'Gacrux';
export const RATE = 24000;
export const PAD_S = 0.4;
export const TRIM_THRESHOLD = 700; // int16 abs, ~ -33 dBFS
// Gemini reads the chants too slowly, so every clip is time-stretched on the
// way out. atempo preserves pitch, so the granny still sounds like the granny.
export const TEMPO = 2;

export const CANTO_RULE = '你必須由頭到尾用香港廣東話(粵語)發音讀出每一個字,特別係句尾嗰幾個字都一定要用粵語讀音,絕對唔可以用普通話讀任何一個字。';
export const VARIANTS = {
  std: `你係香港鵝頸橋底打小人嘅老婆婆,把聲又嗲又惡,好有節奏咁一路打一路鬧。${CANTO_RULE}用大聲、憤怒、拉長音嘅廣東話嗌出以下呢句咒語:`,
  low: `你係香港鵝頸橋底打小人嘅老婆婆,把聲低沉沙啞,慢慢地、陰陰沉沉又惡死。${CANTO_RULE}用低沉嘅廣東話讀出以下呢句咒語:`
};

/**
 * The key lives in portfolio/.env (gitignored) alongside the other server
 * secrets. process.env wins so CI or a one-off export can override it.
 * The value is never logged.
 */
export function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  let env;
  try {
    env = readFileSync(join(REPO, 'portfolio', '.env'), 'utf8');
  } catch {
    throw new Error('GEMINI_API_KEY not set and portfolio/.env is unreadable');
  }
  const line = env.split('\n').find((l) => /^GEMINI_API_KEY\s*=/.test(l));
  if (!line) throw new Error('portfolio/.env has no GEMINI_API_KEY');
  const key = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error('GEMINI_API_KEY in portfolio/.env is empty');
  return key;
}

/** Returns raw s16le 24k mono PCM. */
export async function tts(styles, text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${styles}${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } }
        }
      })
    }
  );
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part) throw new Error(`no audio in response: ${JSON.stringify(data).slice(0, 300)}`);
  return Buffer.from(part.data, 'base64');
}

export function trimAndPad(pcm) {
  const s = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1);
  let a = 0, b = s.length - 1;
  while (a < b && Math.abs(s[a]) < TRIM_THRESHOLD) a++;
  while (b > a && Math.abs(s[b]) < TRIM_THRESHOLD) b--;
  const pad = new Int16Array(Math.round(PAD_S * RATE));
  const out = new Int16Array(pad.length * 2 + (b - a + 1));
  out.set(s.subarray(a, b + 1), pad.length);
  return Buffer.from(out.buffer);
}

export function encodeMp3(pcm, file, tempo = TEMPO) {
  execFileSync('ffmpeg', ['-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0',
    '-filter:a', `atempo=${tempo}`,
    '-codec:a', 'libmp3lame', '-b:a', '64k', file], { input: pcm, stdio: ['pipe', 'ignore', 'ignore'] });
}

/** Duration of the encoded file, in seconds. */
export function duration(file) {
  return parseFloat(execFileSync('ffprobe',
    ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    { encoding: 'utf8' }));
}
