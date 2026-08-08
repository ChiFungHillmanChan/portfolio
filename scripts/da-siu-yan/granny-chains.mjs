// Dev-time only. The ffmpeg post-processing chains that turn a clean Cloud TTS
// yue-HK voice into the 鵝頸橋 打小人 婆婆.
//
// Why post-processing at all: Chirp3-HD voices take no style prompt and no
// SSML, so unlike the Gemini pipeline (which was steered with 「把聲又嗲又惡」
// in the prompt) the character has to be applied after synthesis.
//
// Why asetrate rather than a pitch shifter: this ffmpeg build has no
// `rubberband`, so formant-preserving pitch shift is unavailable. asetrate
// resamples, which moves pitch AND formants together — that reads as a
// different vocal-tract size, which is what actually makes a voice sound old
// rather than just transposed. atempo then restores the original duration.
//
// Every chain ends in alimiter: without it the vibrato/tremolo chains can push
// samples far enough to trip a libmp3lame psymodel assertion.
//
// asetrate value = 24000 * r, and the matching atempo = 1 / r.
import { execFileSync } from 'node:child_process';

export const RATE = 24000;

/** r < 1 lowers pitch and enlarges the apparent vocal tract; r > 1 raises it. */
function shift(r) {
  return `asetrate=${Math.round(RATE * r)},atempo=${(1 / r).toFixed(4)},aresample=${RATE}`;
}

export const CHAINS = [
  {
    key: 'raw',
    label: '原聲',
    desc: '完全冇處理 — 用嚟做基準',
    filter: null
  },
  {
    key: 'aged-light',
    label: '輕微老化',
    desc: '音高同聲腔輕微降低,削走高頻(老人聲高頻會流失)',
    filter: `${shift(0.94)},lowpass=f=7000,alimiter=limit=0.95`
  },
  {
    key: 'aged-mid',
    label: '中度老化 + 顫音',
    desc: '再低沉啲,加輕微抖音同中頻,聽落年紀更大',
    filter: `${shift(0.88)},tremolo=f=5.5:d=0.13,equalizer=f=2600:t=q:w=1.2:g=4,lowpass=f=6200,alimiter=limit=0.95`
  },
  {
    key: 'hoarse',
    label: '沙啞',
    desc: '加粗糙質感,提亮中頻 — 對應 low 版「低沉沙啞」',
    filter: `${shift(0.92)},acrusher=bits=7:mode=log:aa=0.4,equalizer=f=3000:t=q:w=1.5:g=5,lowpass=f=6800,alimiter=limit=0.95`
  },
  {
    key: 'shrill-angry',
    label: '尖銳惡聲',
    desc: '略升音高 + 強壓縮 + 中高頻突出,穿透力強 — 對應 std 版「大聲又嗲又惡」',
    filter: `${shift(1.04)},acompressor=threshold=0.08:ratio=6:attack=5:release=120,equalizer=f=3200:t=q:w=1.4:g=6,tremolo=f=6:d=0.08,alimiter=limit=0.95`
  },
  {
    key: 'quaver-deep',
    label: '低沉抖顫',
    desc: '最低沉,明顯顫抖 — 最「老」嘅一款',
    filter: `${shift(0.86)},vibrato=f=5:d=0.18,tremolo=f=4.5:d=0.14,equalizer=f=2400:t=q:w=1.3:g=3,lowpass=f=5800,alimiter=limit=0.95`
  }
];

export const CHAIN_BY_KEY = new Map(CHAINS.map((c) => [c.key, c]));

/**
 * Encode `input` (a WAV/LINEAR16 buffer from Cloud TTS) to MP3 at `outFile`,
 * applying `chain`. Output matches what generate-granny-voice.mjs ships:
 * mono, 24 kHz, 64 kbps.
 */
export function encodeWithChain(input, chain, outFile) {
  const args = ['-y', '-v', 'error', '-i', 'pipe:0'];
  if (chain.filter) args.push('-filter:a', chain.filter);
  args.push('-ac', '1', '-ar', String(RATE), '-codec:a', 'libmp3lame', '-b:a', '64k', outFile);
  execFileSync('ffmpeg', args, { input, stdio: ['pipe', 'ignore', 'pipe'] });
}

export function duration(file) {
  return parseFloat(execFileSync('ffprobe',
    ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    { encoding: 'utf8' }));
}
