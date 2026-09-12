import { messages } from './ui-translations.js';
import { inputMessages } from './input-messages.js';
import { captureMessages } from './capture-messages.js';
import { uxMessages } from './ux-messages.js';
import { timerMessages } from './timer-messages.js';
import { fullSolveMessages } from './full-solve-messages.js';

export const LANGUAGE_KEY = 'rubiks-practice-language';
export const LOCALES = ['en', 'zh-HK'];

// These terms are shared by the diagrams, validation and case library.
export const sharedMessages = {
  yellow: '黃色', red: '紅色', green: '綠色', white: '白色', orange: '橙色', blue: '藍色',
  Top: '頂面', Right: '右面', Front: '正面', Bottom: '底面', Left: '左面', Back: '背面',
  'Cube diagram showing top, front and right faces': '魔方示意圖，顯示頂面、正面及右面',
  'Top face with back, left, right and front side stickers': '頂面及背面、左面、右面、正面的頂層色格',
  '{face} center: {color}': '{face}中心：{color}',
  '{face} row {row} column {column}: {color}': '{face}第 {row} 行第 {column} 列：{color}',
  'Adjacent Corner Swap': '相鄰角塊互換', 'Awkward Shape': '不規則形',
  'Basic Insert': '基本插入', 'Big Lightning Bolt': '大閃電形', 'Both In Slot': '兩塊均在槽內',
  'C Shape': 'C 形', 'Corner In Edge Out': '角塊在槽內、邊塊在槽外',
  'Corners Oriented': '角塊方向已完成', Cross: '十字', 'Diagonal Corner Swap': '對角角塊互換',
  'Different Facing Up': '頂面顏色不同', Dot: '點形', 'Edge In Corner Out': '邊塊在槽內、角塊在槽外',
  'Edges Only': '僅移動邊塊', 'Fish Shape': '魚形', 'I Shape': 'I 形',
  'Incorrectly Connected': '錯誤配對', 'Knight Move Shape': '騎士步形', 'P Shape': 'P 形',
  'Same Facing Up': '頂面顏色相同', 'Small L Shape': '小 L 形', 'Small Lightning Bolt': '小閃電形',
  'Square Shape': '方塊形', 'T Shape': 'T 形', 'W Shape': 'W 形', 'White Facing Up': '白色朝上',
  'Unexpected closing parenthesis in algorithm.': '公式中出現了多餘的右括號。',
  'Algorithm repetition must be between 1 and 100.': '公式的重複次數必須介乎 1 至 100 次。',
  'Unknown move near “{move}”.': '「{move}」附近有無法辨識的轉動符號。',
  'Unclosed parenthesis in algorithm.': '公式中有尚未配對的左括號。',
  'A cube needs 54 stickers.': '魔方需要填入 54 個色格。',
  'A corner has an impossible color combination.': '某個角塊的顏色組合不可能出現在正常魔方上。',
  'A corner has an impossible or mirrored color combination.': '某個角塊的顏色組合不正確，或輸入時左右倒轉了。',
  'An edge has an impossible color combination.': '某個邊塊的顏色組合不可能出現在正常魔方上。',
  'Fill all 54 stickers.': '請填妥全部 54 個色格。',
  'Each color needs exactly 9 stickers. Check the {face} color.': '每種顏色必須剛好有 9 個色格。請檢查 {face} 面所代表的顏色。',
  'The six center colors must be different.': '六個中心塊的顏色必須各不相同。',
  'The center colors do not match the standard cube layout. Check opposite faces and orientation.': '中心塊的顏色排列不符合標準魔方。請檢查相對面的配色及方向。',
  'A corner or edge appears twice. Check its sticker colors.': '同一種角塊或邊塊出現了兩次。請檢查各色格的顏色。',
  'Corner twist error: this state cannot be reached with legal turns.': '角塊扭轉錯誤：正常轉動無法形成這個狀態。',
  'Edge flip error: this state cannot be reached with legal turns.': '邊塊翻轉錯誤：正常轉動無法形成這個狀態。',
  'Permutation parity error: two pieces appear to be swapped.': '排列奇偶性錯誤：似乎有兩塊被互換了位置。',
  'Cross solution lookup failed.': '未能找出十字的解法，請重新輸入後再試。',
  'Could not restore the cube orientation.': '未能還原魔方的握持方向。',
  'Choose an F2L slot: FR, FL, BR or BL.': '請選擇 F2L 目標槽：右前（FR）、左前（FL）、右後（BR）或左後（BL）。',
};

export function resolveLocale(saved, languages = []) {
  if (LOCALES.includes(saved)) return saved;
  return /^(zh|yue)(-|$)/i.test(languages[0] || '') ? 'zh-HK' : 'en';
}

let locale = 'en';
export function getLocale() { return locale; }

function updateDocument() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale === 'zh-HK' ? 'zh-Hant-HK' : 'en';
  document.title = locale === 'zh-HK' ? '魔方練習 — 學習及練習 CFOP' : "Rubik's Cube Practice — Learn & practice CFOP";
  document.querySelector('meta[name="description"]')?.setAttribute('content', locale === 'zh-HK'
    ? '學習完整 CFOP 復原法：41 個 F2L、57 個 OLL 及 21 個 PLL 個案。輸入魔方顏色，逐步跟隨公式及轉動動畫練習。'
    : "Learn the full CFOP method. Explore 41 F2L, 57 OLL and 21 PLL cases, enter your cube's colors, and follow algorithms one move at a time.");
}

export function initializeLocale() {
  let saved;
  try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* Storage is optional. */ }
  const navigator = globalThis.window?.navigator || globalThis.navigator;
  locale = resolveLocale(saved, navigator?.languages || [navigator?.language]);
  updateDocument();
  return locale;
}

export function setLocale(value) {
  if (!LOCALES.includes(value)) return locale;
  locale = value;
  try { localStorage.setItem(LANGUAGE_KEY, locale); } catch { /* Language switching still works. */ }
  updateDocument();
  return locale;
}

export function t(key, values = {}) {
  const text = locale === 'zh-HK' ? (messages[key] ?? sharedMessages[key] ?? inputMessages[key] ?? captureMessages[key] ?? uxMessages[key] ?? timerMessages[key] ?? fullSolveMessages[key] ?? key) : key;
  return String(text).replace(/\{(\w+)\}/g, (token, name) => values[name] === undefined ? token : String(values[name]));
}

export function localizeError(message = '') {
  const count = message.match(/^Each color needs exactly 9 stickers\. Check the ([URFDLB]) color\.$/);
  if (count) return t('Each color needs exactly 9 stickers. Check the {face} color.', { face: count[1] });
  const unknown = message.match(/^Unknown move near “(.*)”\.$/);
  if (unknown) return t('Unknown move near “{move}”.', { move: unknown[1] });
  return t(message);
}
