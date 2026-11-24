import { lazy } from 'react';

const RELOADED_AT = 'page-script-reloaded-at';
const RETRY_WINDOW_MS = 30000;

const readTime = (storage) => {
  try {
    return Number(storage.getItem(RELOADED_AT)) || 0;
  } catch {
    return 0;
  }
};

const writeTime = (storage, time) => {
  try {
    storage.setItem(RELOADED_AT, String(time));
    return true;
  } catch {
    return false;
  }
};

// A page's script can fail to load when the site was updated underneath an open tab (the old file
// names are gone) or on a network blip. Reload the page once so it picks up the current files.
// If a reload has just happened, or cannot be recorded, let the error surface instead of looping.
const thisPage = { reloading: false };
const stillLoading = () => new Promise(() => {}); // stay on the loading state until the reload lands

export function loadWithReload(importer, {
  storage = window.sessionStorage,
  reload = () => window.location.reload(),
  now = Date.now,
  page = thisPage,
} = {}) {
  return importer().catch((error) => {
    // Several scripts usually fail together; the first one starts the reload and the rest wait for it.
    if (page.reloading) return stillLoading();
    const time = now();
    if (time - readTime(storage) < RETRY_WINDOW_MS || !writeTime(storage, time)) throw error;
    page.reloading = true;
    reload();
    return stillLoading();
  });
}

export default function lazyWithReload(importer) {
  return lazy(() => loadWithReload(importer));
}
