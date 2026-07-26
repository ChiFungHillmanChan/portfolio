// Chant script — the classic 打小人口訣 as circulated in HK internet folklore
// (user-supplied transcript 2026-07-22), curated for a public game (a few
// crude lines dropped). No 呀 particles — they sound off in the AI voice.
// Shared by scripts/generate-granny-voice.mjs (dev-time TTS) and the game.
//
// `text` is the canonical chant. The game never renders it — game.js uses only
// `id` — so it is the record of what the granny says, and the default TTS input.
//
// `say` is an OPTIONAL, TTS-only respelling. Gemini TTS is the only engine that
// takes a style prompt, so it is the only one that can act the 鵝頸橋 婆婆, but
// it has no Cantonese pronunciation dictionary and no phoneme/jyutping input
// (both verified against the API — Cloud TTS answers "Requested language code
// 'yue-HK' is not supported for Gemini voices"). So the only lever on a
// mispronounced character is to feed the model a DIFFERENT character with the
// identical Cantonese reading. Those substitutes — 猴 for 喉, 鰓 for 腮, 失 for
// 膝, 消 for 燒 — are emphatically NOT the chant, which is why they live in
// `say` and never in `text`.
//
// Reviewed by ear 2026-07-26. Per-character reasoning and the confidence of
// each substitution: scripts/da-siu-yan/say-candidates.mjs.
//
// Editing `text` or `say` means regenerating the affected clips AND bumping
// CACHE in sw.js — otherwise returning players keep the old cached audio.
export const INTRO = {
  id: 'intro',
  text: '今日打小人!等我幫你出啖氣!',
  say: '金日打小人!等我幫你出啖氣!'          // 今 gam1 — 金 keeps the -m coda
};
export const FINALE = { id: 'finale', text: '打完小人!化走是非!出入平安!貴人扶持!' };
export const LINES = [
  { id: 'line-01', text: '打你個頭,打你個死人頭!' },
  { id: 'line-02', text: '打你隻手,打到你有氣冇掟抖!',
    say: '打你隻手,打到你有氣冇掟唞!' },      // 抖 tau2 — 唞 is the Cantonese word
  { id: 'line-03', text: '打你隻腳,打到你冇鞋著!' },
  { id: 'line-04', text: '打你個口,打到你係咁嘔!' },
  { id: 'line-05', text: '打你個鼻,打到你開口夾著脷!' },
  { id: 'line-06', text: '打你個肚,打到你嘔白泡!',
    say: '打你個肚,打到你嘔白抱!' },          // 泡 pou5 — 抱
  { id: 'line-07', text: '打你個胸,打到你無老公!' },
  { id: 'line-08', text: '打你隻耳,打到你做鬼都唔似!',
    say: '打你隻耳,打到你造鬼都唔似!' },      // 做 zou6 — 造
  { id: 'line-09', text: '打你隻眼,打到你返工唔偷懶!' },
  { id: 'line-10', text: '打你個腦,打到你咩都無!' },
  { id: 'line-11', text: '打你條腰,打到你發高燒!',
    say: '打你條腰,打到你發高消!' },          // 燒 siu1 — 消 (was read Mandarin shāo)
  { id: 'line-12', text: '打你個胃,打到你見人就要跪!' },
  { id: 'line-13', text: '打你條頸,打到你瞓到唔知醒!' },
  { id: 'line-14', text: '打你條腸,打到你放屁特別響!' },
  { id: 'line-15', text: '打你排牙,打到你矇查查!',
    say: '打你排芽,打到你矇查查!' },          // 牙 ngaa4 — 芽 keeps the ng- initial
  { id: 'line-16', text: '打你個肝,打到你無心安!' },
  { id: 'line-17', text: '打你個脾,打到你結婚即刻離!',
    say: '打你個髀,打到你結婚即刻離!' },      // 脾 — 髀 bei2, per review
  { id: 'line-18', text: '打你個肺,打到你口水嗲嗲渧!' },
  { id: 'line-19', text: '打你個腎,打到你行衰運!' },
  { id: 'line-20', text: '打你個喉,打到你冇自由!',
    say: '打你個猴,打到你冇自由!' },          // 喉 hau4 — 猴
  { id: 'line-21', text: '打你個膝頭哥,打到你係咁屙!',
    say: '打你個失頭哥,打到你係咁屙!' },      // 膝 sat1 — 失 keeps the -t stop
  { id: 'line-22', text: '打你排骨,打到你俾人屈!' },
  { id: 'line-23', text: '打你隻髀,打到你唔敢返屋企!' },
  { id: 'line-24', text: '打你左右臂,打到你骨都痺!' },
  { id: 'line-25', text: '打你個腮,打到你冇飯開!',
    say: '打你個鰓,打到你冇飯開!' },          // 腮 soi1 — 鰓 (no true homophone exists)
  { id: 'line-26', text: '打你層皮,打到你唔死就出奇!' },
  { id: 'line-27', text: '打你背脊骨,打到你成世要行乞!' },
  { id: 'line-28', text: '打你條支氣管,打到你食飯打爛碗!' }
];

/** The string that goes to the TTS engine: the respelling if there is one. */
export function ttsText(clip) {
  return clip.say ?? clip.text;
}
