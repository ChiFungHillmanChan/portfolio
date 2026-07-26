// Dev-time only. The homophone respellings fed to Gemini TTS.
//
// The problem: Gemini TTS has the right voice (it is the only engine that takes
// a style prompt, so it is the only one that can act the 鵝頸橋 婆婆) but it has
// no Cantonese pronunciation dictionary and no phoneme/jyutping input — both
// verified against the API. So the only way to correct a character is to feed
// the model a DIFFERENT character that it already reads correctly and that has
// the identical Cantonese reading.
//
// `say` is TTS-input only. The chant text players see is never changed by this
// file, which is why it does not conflict with the handoff prompt's rule about
// not rewriting the 口訣.
//
// Every substitute below is an exact-reading homophone unless marked otherwise.

export const CANDIDATES = {
  intro: {
    variants: ['low'],
    say: '金日打小人!等我幫你出啖氣!',
    targets: [{ from: '今', to: '金', jyut: 'gam1', heard: '「暈」(-m 變 -n)', confidence: 'high' }]
  },
  'line-02': {
    variants: ['std', 'low'],
    say: '打你隻手,打到你有氣冇掟唞!',
    targets: [
      { from: '無', to: '冇', jyut: 'mou5', heard: 'mou4', confidence: 'high',
        why: '你指出嘅正字:冇掟抖' },
      { from: '定', to: '掟', jyut: 'deng3', heard: '定 ding6', confidence: 'high',
        why: '你指出嘅正字:冇掟抖' },
      { from: '抖', to: '唞', jyut: 'tau2', heard: '「斗」dau2', confidence: 'high',
        why: '唞 才係粵語「休息」嘅本字;抖 在粵語主要讀 dau2(發抖)' }
    ]
  },
  'line-03': {
    variants: ['low'],
    say: '打你隻腳,打到你冇鞋著!',
    targets: [{ from: '無', to: '冇', jyut: 'mou5', heard: 'mou3', confidence: 'high',
      why: '無 = mou4(文言),冇 = mou5(口語)。全篇已用 唔/係/咁/俾,所以 無 係錯字' }]
  },
  'line-06': {
    variants: ['std', 'low'],
    say: '打你個肚,打到你嘔白抱!',
    targets: [{ from: '泡', to: '抱', jyut: 'pou5', heard: 'pao', confidence: 'medium',
      why: '你只講「should be pou」冇講聲調 — 抱 = pou5。如果應該係 pou1 就要換' }]
  },
  'line-08': {
    variants: ['std'],
    say: '打你隻耳,打到你造鬼都唔似!',
    targets: [{ from: '做', to: '造', jyut: 'zou6', heard: '「doe」', confidence: 'high' }]
  },
  'line-11': {
    variants: ['std', 'low'],
    say: '打你條腰,打到你發高消!',
    targets: [{ from: '燒', to: '消', jyut: 'siu1', heard: '普通話 shāo', confidence: 'high',
      why: '交接文件最初確認嘅 bug,佢自己都建議用「消」做參照' }]
  },
  'line-15': {
    variants: ['std', 'low'],
    say: '打你排芽,打到你矇查查!',
    targets: [{ from: '牙', to: '芽', jyut: 'ngaa4', heard: 'ng- 脫落', confidence: 'high' }]
  },
  'line-17': {
    variants: ['std', 'low'],
    say: '打你個髀,打到你結婚即刻離!',
    targets: [{ from: '脾', to: '髀', jyut: 'bei2', heard: 'pai', confidence: 'medium',
      why: '你話應該係 bai — 髀 就係 bei2 嗰個字。標準粵拼 脾(脾臟) 係 pei4,所以呢個要你確認' }]
  },
  'line-20': {
    variants: ['std'],
    say: '打你個猴,打到你冇自由!',
    targets: [
      { from: '喉', to: '猴', jyut: 'hau4', heard: 'hau1(聲調錯)', confidence: 'high' },
      { from: '無', to: '冇', jyut: 'mou5', heard: 'mou4', confidence: 'high' }
    ]
  },
  'line-21': {
    variants: ['std', 'low'],
    say: '打你個失頭哥,打到你係咁屙!',
    targets: [{ from: '膝', to: '失', jyut: 'sat1', heard: '入聲 -t 冇收', confidence: 'high' }]
  },
  'line-25': {
    variants: ['std', 'low'],
    say: '打你個鰓,打到你冇飯開!',
    targets: [
      { from: '腮', to: '鰓', jyut: 'soi1', heard: 'sai', confidence: 'low',
        why: 'soi1 冇常用同音字。鰓 係同一個詞嘅異體字,可能一樣讀錯 — 呢個最有機會失敗' },
      { from: '無', to: '冇', jyut: 'mou5', heard: 'mou4', confidence: 'high' }
    ]
  }
};

/**
 * Exact character-level diff, so a typo in a `say` string cannot slip through
 * as a silent extra change. Returns a list of {at, was, now} runs.
 *
 * Uses a full LCS table rather than a lookahead heuristic: these strings are
 * ~20 characters, so the DP is free, and a heuristic gives false alarms on
 * changes near the end of the string — which is exactly where most of the
 * substitutions are (the chant lines rhyme on their last character).
 */
export function diff(text, say) {
  const n = text.length, m = say.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = text[i] === say[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const runs = [];
  let i = 0, j = 0, cur = null;
  const flush = () => { if (cur) { runs.push(cur); cur = null; } };
  while (i < n || j < m) {
    if (i < n && j < m && text[i] === say[j]) { flush(); i++; j++; continue; }
    cur ??= { at: i, was: '', now: '' };
    if (j >= m || (i < n && L[i + 1][j] >= L[i][j + 1])) { cur.was += text[i++]; }
    else { cur.now += say[j++]; }
  }
  flush();
  // Adjacent substitutions land in one run (e.g. 無定抖 -> 冇掟唞). When the two
  // sides are the same length it is a pure 1:1 swap, so split it back into per
  // character pairs — that is the granularity the substitution table declares.
  return runs.flatMap((r) => (
    r.was.length === r.now.length && r.was.length > 1
      ? [...r.was].map((ch, k) => ({ at: r.at + k, was: ch, now: r.now[k] }))
      : [r]
  ));
}
