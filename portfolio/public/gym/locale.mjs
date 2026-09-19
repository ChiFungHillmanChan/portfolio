export const LOCALE_STORAGE_KEY = 'hillman-gym:locale';
const SUPPORTED_LOCALES = new Set(['zh-HK', 'en-GB']);

export function readLocale(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const saved = target.getItem(LOCALE_STORAGE_KEY);
    return SUPPORTED_LOCALES.has(saved) ? saved : 'zh-HK';
  } catch {
    return 'zh-HK';
  }
}

export function saveLocale(locale, storage) {
  if (!SUPPORTED_LOCALES.has(locale)) {
    throw new Error('Unsupported language. Choose zh-HK or en-GB.');
  }
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    target.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    throw new Error('The language preference could not be saved. Allow browser storage, then try again.');
  }
  return locale;
}
