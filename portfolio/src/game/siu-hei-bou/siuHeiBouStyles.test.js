// 釘死兩件用 render 測唔到、但喺真手機上面會整死個 app 嘅 CSS 規矩。
// 同 public/games/pwa.test.mjs 一樣：唔係測「靚唔靚」，係測「會唔會壞」。
import fs from 'fs';
import path from 'path';

const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');

// 攤平 media query（剩返嗰個 } 對下面個 regex 冇影響），再逐條 rule 拆出嚟。
const css = read('siuHeiBouStyles.css')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/@media[^{]*\{/g, '');

const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));

const rulesFor = (name) => rules.filter((r) => r.selector === name);
const declOf = (body, prop) => {
  const found = [...body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'g'))];
  return found.map((m) => m[1].trim());
};

// input/textarea/select 嘅「正身」rule（:focus 嗰啲唔使有字型大細）
const CONTROL = /(^|[\s,>+~])(input|textarea|select)\b/;
const controlRules = rules.filter(
  (r) => CONTROL.test(r.selector) && !/:(focus|disabled|checked)|::/.test(r.selector),
);

test('每一個輸入框都 >= 16px —— 細過 16px iOS 就會自動放大成版嘢', () => {
  // 有 rule 先至測到嘢：呢句擋住「regex 執唔到嘢所以全部 pass」呢種假綠燈
  expect(controlRules.length).toBeGreaterThanOrEqual(4);

  controlRules.forEach(({ selector, body }) => {
    const sizes = declOf(body, 'font-size');
    expect({ selector, sizes }).toEqual({ selector, sizes: expect.arrayContaining([expect.any(String)]) });
    sizes.forEach((size) => {
      expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
      expect(size).toMatch(/px$/);   // em/rem 要睇 context 先計到，唔准喺呢度用
    });
  });
});

test('冇一個輸入框係冇 CSS rule 管住嘅', () => {
  // 一個完全冇 rule 嘅 input 會用瀏覽器預設嘅 ~13px，一樣會放大 —— 但上面條
  // test 係掃 CSS 嘅，睇唔到「根本冇寫過」。所以喺呢度數返 JSX 有幾多個掣：
  // 加咗個新輸入框呢條 test 就會紅，逼你去確認佢跟唔跟到 16px 先改呢個數。
  const count = fs.readdirSync(__dirname)
    .filter((f) => f.endsWith('.jsx'))
    .reduce((n, f) => n + (read(f).match(/<(input|textarea|select)\b/g) || []).length, 0);

  expect(count).toBe(8);
});

test('張 sheet 封咗頂又捲得到 —— 唔係鍵盤一彈出嚟就見唔到個標題', () => {
  const [sheet] = rulesFor('.shb-sheet');
  expect(sheet).toBeDefined();

  // vh 打頭、dvh 包底：唔識 dvh 嘅舊機用得返 vh，識嘅就用埋鍵盤同瀏覽器 bar 計。
  expect(declOf(sheet.body, 'max-height')).toEqual(['88vh', '88dvh']);
  expect(declOf(sheet.body, 'overflow-y')).toEqual(['auto']);
  expect(declOf(sheet.body, 'overscroll-behavior')).toEqual(['contain']);
});

// 封頂令張 sheet 變成一個捲軸，而 iOS 一彈鍵盤就會自己捲佢去就個 caret ——
// 即係話「封咗頂」本身唔夠，個標題照樣捲得走。sticky 先係真正頂得住嗰道。
test('個標題黐死喺 sheet 頂 —— iOS 點捲都好，你都知自己記緊邊個', () => {
  const [h3] = rulesFor('.shb-sheet h3');
  expect(h3).toBeDefined();
  expect(declOf(h3.body, 'position')).toEqual(['sticky']);
  expect(declOf(h3.body, 'top')).toEqual(['0']);
  // 冇底色就會見到啲字喺個標題後面捲過。
  expect(declOf(h3.body, 'background')).toEqual(['var(--shb-paper)']);
});

// autoFocus 係當初真兇：focus 咗，iOS 就捲個 sheet 去就 caret。要 focus，
// 但唔准佢捲。呢條 test 係防止有人「順手」改返做 autoFocus。
test('記一筆唔用 autoFocus，改用 focus({ preventScroll })', () => {
  const src = read('AddGrudgeSheet.jsx');
  // 剝走註解先——註解入面正正解釋緊點解唔用 autoFocus，唔應該當佢係違規。
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  expect(code).not.toMatch(/autoFocus/);
  expect(src).toMatch(/focus\(\{ preventScroll: true \}\)/);
  expect(src).toMatch(/scrollTop = 0/);
});
