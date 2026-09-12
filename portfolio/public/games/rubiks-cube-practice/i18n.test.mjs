import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import {
  LANGUAGE_KEY, LOCALES, getLocale, initializeLocale, localizeError,
  resolveLocale, setLocale, sharedMessages, t,
} from './i18n.js';
import { messages } from './ui-translations.js';
import { inputMessages } from './input-messages.js';
import { captureMessages } from './capture-messages.js';
import { uxMessages } from './ux-messages.js';
import { timerMessages } from './timer-messages.js';
import * as english from './chapters.js';
import * as chinese from './chapters-zh-HK.js';
import { FACE_ORDER, parseAlgorithm, solvedCube } from './cube-engine.js';
import { colors, cubeNet, cubeSvg, defaultScheme, faceNames, stickerLabel, topSvg } from './cube-view.js';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const engineSource = await readFile(new URL('./cube-engine.js', import.meta.url), 'utf8');
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

function installGlobals(context, values) {
  const descriptors = new Map();
  for (const [name, value] of Object.entries(values)) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  context.after(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    setLocale('en');
  });
}

function chapterShape(value) {
  if (value instanceof Set) return [...value];
  if (Array.isArray(value)) return value.map(chapterShape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, chapterShape(child)]));
  }
  return typeof value;
}

test('a supported saved language takes precedence over the browser language', () => {
  assert.deepEqual(LOCALES, ['en', 'zh-HK']);
  assert.equal(resolveLocale('en', ['yue-HK', 'zh-HK']), 'en');
  assert.equal(resolveLocale('zh-HK', ['en-GB']), 'zh-HK');
});

test('Chinese and Cantonese browser languages select Hong Kong Traditional Chinese', () => {
  for (const language of ['zh', 'zh-HK', 'zh-Hant-HK', 'zh-TW', 'zh-CN', 'yue', 'yue-HK', 'YUE-Hant-HK']) {
    assert.equal(resolveLocale(null, [language]), 'zh-HK', language);
  }
  for (const languages of [[], ['en'], ['en-GB'], ['fr-FR'], ['en-US', 'zh-HK']]) {
    assert.equal(resolveLocale(null, languages), 'en', JSON.stringify(languages));
  }
  assert.equal(resolveLocale('unsupported', ['zh-HK']), 'zh-HK');
  assert.equal(resolveLocale('unsupported', ['en']), 'en');
});

test('initialization restores the saved choice and switching persists only supported locales', (context) => {
  const stored = new Map([[LANGUAGE_KEY, 'zh-HK']]);
  installGlobals(context, {
    window: { navigator: { languages: ['en-GB'] } },
    localStorage: { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) },
  });
  assert.equal(initializeLocale(), 'zh-HK');
  assert.equal(getLocale(), 'zh-HK');
  assert.equal(setLocale('en'), 'en');
  assert.equal(stored.get(LANGUAGE_KEY), 'en');
  assert.equal(setLocale('invalid'), 'en');
  assert.equal(stored.get(LANGUAGE_KEY), 'en');
});

test('blocked browser storage does not prevent detection or language switching', (context) => {
  installGlobals(context, {
    window: { navigator: { languages: ['yue-HK'] } },
    localStorage: {
      getItem() { throw new Error('Storage blocked'); },
      setItem() { throw new Error('Storage blocked'); },
    },
  });
  assert.equal(initializeLocale(), 'zh-HK');
  assert.equal(setLocale('en'), 'en');
  assert.equal(setLocale('zh-HK'), 'zh-HK');
  assert.equal(t('yellow'), '黃色');
});

test('language switching updates document language, title and search description', (context) => {
  const dom = new JSDOM('<html><head><meta name="description" content=""></head><body></body></html>');
  installGlobals(context, { document: dom.window.document });
  context.after(() => dom.window.close());
  setLocale('zh-HK');
  assert.equal(document.documentElement.lang, 'zh-Hant-HK');
  assert.match(document.title, /魔方練習/);
  assert.match(document.querySelector('meta[name="description"]').content, /41 個 F2L、57 個 OLL 及 21 個 PLL/);
  setLocale('en');
  assert.equal(document.documentElement.lang, 'en');
  assert.match(document.title, /Rubik's Cube Practice/);
  assert.match(document.querySelector('meta[name="description"]').content, /Learn the full CFOP method/);
});

test('translated chapters preserve every chapter, section, URL, stage color and case identifier', () => {
  assert.deepEqual(Object.keys(chinese.chapters), ['N', 'C', 'F', 'O', 'P']);
  assert.deepEqual(chapterShape(chinese), chapterShape(english));
  for (const [key, stage] of Object.entries(english.stages)) {
    assert.equal(chinese.stages[key].color, stage.color);
    for (const field of ['title', 'short', 'subtitle', 'count']) {
      assert.match(chinese.stages[key][field], /\p{Script=Han}/u, `${key}.${field}`);
    }
  }
  for (const [key, chapter] of Object.entries(english.chapters)) {
    const translated = chinese.chapters[key];
    assert.deepEqual(translated.links.map((link) => link[1]), chapter.links.map((link) => link[1]));
    for (const field of ['title', 'subtitle', 'time', 'intro', 'drill']) {
      assert.match(translated[field], /\p{Script=Han}/u, `${key}.${field}`);
    }
    translated.sections.forEach((section, index) => {
      assert.match(section.title, /\p{Script=Han}/u, `${key}.sections[${index}].title`);
      assert.match(section.text, /\p{Script=Han}/u, `${key}.sections[${index}].text`);
    });
    translated.links.forEach(([label]) => assert.match(label, /\p{Script=Han}/u));
  }
  assert.deepEqual(chinese.twoLookIds, english.twoLookIds);
});

test('chapter translations retain complete move sequences and standard CFOP notation', () => {
  const sequences = /(?<![A-Za-z])(?:[URFDLBMESxyzurfdlb](?:′|'|2)?)(?:\s+[URFDLBMESxyzurfdlb](?:′|'|2)?)+(?![A-Za-z])/g;
  for (const [key, chapter] of Object.entries(english.chapters)) {
    const source = [chapter.intro, ...chapter.sections.map((section) => section.text), chapter.drill].join('\n');
    const translated = chinese.chapters[key];
    const target = [translated.intro, ...translated.sections.map((section) => section.text), translated.drill].join('\n');
    assert.deepEqual([...target.matchAll(sequences)].map((match) => match[0]), [...source.matchAll(sequences)].map((match) => match[0]), key);
    for (const notation of ['CFOP', 'F2L', 'OLL', 'PLL', 'AUF', 'Sune', 'anti-Sune']) {
      if (source.includes(notation)) assert.ok(target.includes(notation), `${key} preserves ${notation}`);
    }
  }
});

test('all translated messages retain their interpolation placeholders', () => {
  for (const [name, dictionary] of Object.entries({ messages, sharedMessages, inputMessages, captureMessages, uxMessages, timerMessages })) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.equal(typeof value, 'string', `${name}: ${key}`);
      assert.ok(value.trim().length, `${name}: ${key} must not be empty`);
      assert.deepEqual(placeholders(value), placeholders(key), `${name}: ${key}`);
    }
  }
});

test('translation interpolation preserves values and falls back without losing unknown text', () => {
  setLocale('zh-HK');
  assert.equal(t('{face} row {row} column {column}: {color}', { face: '頂面', row: 0, column: 2, color: '黃色' }), '頂面第 0 行第 2 列：黃色');
  assert.equal(t('Unknown message {value}', { value: 0 }), 'Unknown message 0');
  assert.equal(t('Unknown message {value}'), 'Unknown message {value}');
  setLocale('en');
  assert.equal(t('{face} center: {color}', { face: 'Top', color: 'yellow' }), 'Top center: yellow');
});

test('every case group has a Chinese label while technical case names remain searchable unchanged', () => {
  setLocale('zh-HK');
  for (const group of new Set(cases.map((item) => item.group))) {
    assert.notEqual(t(group), group, `Missing group translation: ${group}`);
    assert.match(t(group), /\p{Script=Han}/u, group);
  }
  for (const item of cases) {
    assert.equal(t(item.name), item.name, `${item.id} keeps its standard case name`);
  }
});

test('all cube diagrams and all 54 sticker labels localize without changing colors or face identifiers', () => {
  setLocale('zh-HK');
  const cube = solvedCube();
  const net = cubeNet(cube, defaultScheme, true);
  const dom = new JSDOM(net);
  const stickers = [...dom.window.document.querySelectorAll('.sticker')];
  assert.equal(stickers.length, 54);
  assert.equal(dom.window.document.querySelectorAll('[data-action="paint"]').length, 54);
  for (const [faceIndex, face] of FACE_ORDER.entries()) {
    const color = defaultScheme[face];
    const name = t(faceNames[face]);
    for (let index = 0; index < 9; index += 1) {
      const sticker = stickers[faceIndex * 9 + index];
      assert.equal(sticker.getAttribute('aria-label'), stickerLabel(face, index, color));
      assert.ok(sticker.getAttribute('aria-label').startsWith(name));
      assert.ok(sticker.getAttribute('aria-label').endsWith(t(color)));
      assert.equal(sticker.style.getPropertyValue('--sticker'), colors[color]);
      if (index === 4) assert.equal(sticker.textContent, face);
    }
  }
  assert.equal(stickerLabel('U', 4, 'yellow'), '頂面中心：黃色');
  assert.equal(stickerLabel('F', 8, 'green'), '正面第 3 行第 3 列：綠色');
  assert.match(cubeSvg(cube), /aria-label="魔方示意圖，顯示頂面、正面及右面"/);
  assert.match(topSvg(cube), /aria-label="頂面及背面、左面、右面、正面的頂層色格"/);
  setLocale('en');
  assert.equal(stickerLabel('U', 4, 'yellow'), 'Top center: yellow');
  assert.equal(stickerLabel('F', 8, 'green'), 'Front row 3 column 3: green');
  assert.match(cubeNet(cube), /aria-label="Top center: yellow"/);
  dom.window.close();
});

test('engine validation and algorithm errors translate including dynamic colors and unknown moves', () => {
  setLocale('zh-HK');
  const staticErrors = [...engineSource.matchAll(/(?:throw new Error\(|error:\s*)'([^']+)'/g)].map((match) => match[1]);
  assert.ok(staticErrors.length >= 15);
  for (const error of staticErrors) {
    assert.notEqual(localizeError(error), error, `Missing engine error translation: ${error}`);
    assert.match(localizeError(error), /\p{Script=Han}/u, error);
  }
  for (const face of FACE_ORDER) {
    assert.equal(localizeError(`Each color needs exactly 9 stickers. Check the ${face} color.`), `每種顏色必須剛好有 9 個色格。請檢查 ${face} 面所代表的顏色。`);
  }
  let unknown;
  try { parseAlgorithm('R @ U'); } catch (error) { unknown = error.message; }
  assert.equal(localizeError(unknown), '「@ U」附近有無法辨識的轉動符號。');
  assert.equal(localizeError('Unexpected network error'), 'Unexpected network error');
  setLocale('en');
  assert.equal(localizeError(unknown), unknown);
  assert.equal(localizeError('Each color needs exactly 9 stickers. Check the U color.'), 'Each color needs exactly 9 stickers. Check the U color.');
});
