// 支筆寫字嘅節奏。呢度唔係測動畫好唔好睇 —— 係釘死嗰個令佢似「寫字」而唔似
// 「loading」嘅不變量：每格行少過一個字。
//
// 舊版係 step = max(0.5, total / 55)，即係「幾長都 55 格走完」。一筆 100 格嘅
// 嬲爆事每格要彈 1.8 個字出嚟，眼見嘅唔係人手寫字，係一嚿嚿字跳出嚟。
import { PEN_TICK_MS, penSteps } from './Book';
import { entryLineMap } from './geometry';

// 支筆跟住嘅係「邊一筆嬲爆事」，而嗰筆嘢喺寫緊嘅時候會換身份：排隊嗰陣個 id 係
// client id（'abc'），寄咗上去再 pull 返嚟就變成 server 派嘅 id（123）。
// 兩者之間唯一連得埋嘅就係 client_id —— 就係令重試唔會寫兩次嗰個。
// 淨係認 entry.id 嘅話，一寄得成功支筆就即刻搵唔到自己寫緊邊行，動畫當場死。
// 有網嘅時候個來回快過寫完，所以症狀係「成句嘢啪一聲彈晒出嚟，冇寫字效果」。
const pagesFor = (entry) => [[
  { type: 'meta', entry },
  { type: 'text', text: '佢遲到一個鐘', entry },
]];

test('寄咗上去、個 id 由 client id 換成 server id 之後，支筆仲跟得到嗰一筆', () => {
  const pending = { id: 'abc', client_id: 'abc' };
  const synced = { id: 123, client_id: 'abc' };

  expect(entryLineMap(pagesFor(pending), 'abc')).toHaveLength(2);
  expect(entryLineMap(pagesFor(synced), 'abc')).toHaveLength(2);
});

test('唔會撈錯第二筆 —— 冇 client_id 或者對唔上就唔算', () => {
  expect(entryLineMap(pagesFor({ id: 456, client_id: 'xyz' }), 'abc')).toHaveLength(0);
  expect(entryLineMap(pagesFor({ id: 456, client_id: null }), 'abc')).toHaveLength(0);
  expect(entryLineMap(pagesFor({ id: 456 }), 'abc')).toHaveLength(0);
});

// null == undefined 喺鬆散比較下係 true，所以「兩邊都冇 client_id」唔可以當夾到。
test('兩筆都冇 client_id 都唔會夾埋一齊', () => {
  expect(entryLineMap(pagesFor({ id: 7, client_id: null }), null)).toHaveLength(0);
  expect(entryLineMap(pagesFor({ id: 7 }), undefined)).toHaveLength(0);
});

const stepFor = (total) => total / penSteps(total);
const secondsFor = (total) => (penSteps(total) * PEN_TICK_MS) / 1000;

// 封頂喺 140 格。140 格以下 —— 即係實際上絕大多數嘅嬲爆事 —— 每格行少過一個
// 字，所以真係一個字一個字咁浮出嚟。
test('140 格以下：每格行少過一個字，一個字一個字咁浮出嚟', () => {
  for (let total = 1; total <= 140; total += 1) {
    expect(stepFor(total)).toBeLessThanOrEqual(1);
  }
});

// 140 格以上就要取捨：唔加速嘅話，寫足 500 字要 22 秒。所以夠鐘就加速，
// 但加得有限 —— 呢個係故意嘅取捨，唔係手民之誤，所以連上限都釘住。
test('140 格以上：肯加速，但加得有限（500 格都唔會一格彈四個字）', () => {
  expect(stepFor(141)).toBeGreaterThan(1);
  for (let total = 141; total <= 500; total += 1) {
    expect(stepFor(total)).toBeLessThanOrEqual(500 / 140);
  }
});

test('短嘅一筆都慢得夠睇到，唔會一眨眼就寫完', () => {
  // 一句「佢遲到」咁短都要有大半秒，唔係「叮」一聲就出咗嚟
  expect(secondsFor(3)).toBeGreaterThan(1.2);
  expect(secondsFor(12)).toBeGreaterThan(1.2);
});

test('長嘅一筆封頂 —— 冇人想望住支筆寫足半分鐘', () => {
  expect(secondsFor(500)).toBeLessThan(7);
  expect(secondsFor(200)).toBeLessThan(7);
});

test('越長寫得越耐（封頂之前）—— 唔係「幾長都同一個時間」', () => {
  expect(secondsFor(40)).toBeGreaterThan(secondsFor(20));
  expect(secondsFor(70)).toBeGreaterThan(secondsFor(40));
});

test('一格都唔會行 0 步 —— 唔係嘅話支筆會永遠寫唔完', () => {
  for (const total of [1, 2, 5, 33, 140, 500]) {
    expect(stepFor(total)).toBeGreaterThan(0);
  }
});
