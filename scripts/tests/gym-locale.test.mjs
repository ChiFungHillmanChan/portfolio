import assert from 'node:assert/strict';
import test from 'node:test';
import { LOCALE_STORAGE_KEY, readLocale, saveLocale } from '../../portfolio/public/gym/locale.mjs';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

test('language selection persists independently of workout records', () => {
  const workout = '{"version":1,"days":{"2026-09-19":{"notes":"今日狀態好"}}}';
  const storage = memoryStorage({ 'hillman-gym:v1': workout });
  assert.equal(readLocale(storage), 'zh-HK');
  saveLocale('en-GB', storage);
  assert.equal(readLocale(storage), 'en-GB');
  assert.equal(storage.getItem('hillman-gym:v1'), workout);
  assert.equal(storage.getItem('hillman-gym:locale'), 'en-GB');
  saveLocale('zh-HK', storage);
  assert.equal(readLocale(storage), 'zh-HK');
  assert.equal(storage.getItem('hillman-gym:v1'), workout);
  assert.equal(storage.values.size, 2);
});

test('unsupported stored values fall back to Cantonese without overwriting them', () => {
  for (const value of ['en', 'zh', 'en-US', 'EN-GB', '"en-GB"', '{invalid', '', 'null']) {
    const storage = memoryStorage({ 'hillman-gym:locale': value });
    assert.equal(readLocale(storage), 'zh-HK');
    assert.equal(storage.getItem('hillman-gym:locale'), value);
  }
});

test('unsupported language saves reject before touching the saved preference', () => {
  const storage = memoryStorage({ 'hillman-gym:locale': 'en-GB' });
  for (const value of ['en', 'en-US', 'zh-CN', '', null, undefined, {}, ['en-GB']]) {
    assert.throws(() => saveLocale(value, storage), /language|locale/i);
    assert.equal(readLocale(storage), 'en-GB');
  }
});

test('denied reads fall back without attempting a write', () => {
  const storage = {
    getItem() { throw new Error('Storage access denied'); },
    setItem() { assert.fail('Reading a preference must never write'); }
  };
  assert.equal(readLocale(storage), 'zh-HK');
  assert.equal(readLocale(null), 'zh-HK');
});

test('denied writes throw a useful error and preserve the previous preference', () => {
  const storage = memoryStorage({ 'hillman-gym:locale': 'zh-HK' });
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => saveLocale('en-GB', storage), /language.*sav|sav.*language/i);
  assert.equal(readLocale(storage), 'zh-HK');
  assert.throws(() => saveLocale('en-GB', null), /storage/i);
});

test('import is safe without browser storage and default storage access is caught inside functions', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('Browser storage property is unavailable'); }
  });
  try {
    const locale = await import('../../portfolio/public/gym/locale.mjs?without-browser-storage');
    assert.equal(locale.readLocale(), 'zh-HK');
    assert.throws(() => locale.saveLocale('en-GB'), /storage/i);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('omitted storage uses the current browser storage at call time', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = memoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    saveLocale('en-GB');
    assert.equal(readLocale(), 'en-GB');
    assert.equal(storage.getItem(LOCALE_STORAGE_KEY), 'en-GB');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
