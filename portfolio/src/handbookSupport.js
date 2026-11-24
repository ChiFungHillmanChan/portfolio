// What this browser remembers about supporting a handbook.
// Nothing here gates a download: every released part is free, so a made-up value
// only skips the optional contribution pop-up.
const PENDING = 'handbook-pending-download';
const SUPPORTED = 'handbook-supported';
const PENDING_MS = 6 * 60 * 60 * 1000;

const read = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is unavailable (private browsing, blocked): the page still works without it.
  }
};

const remove = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // As above.
  }
};

// Called just before leaving for checkout, so the part can be delivered on the way back.
export function rememberPendingDownload(slug, number, now = Date.now()) {
  write(PENDING, JSON.stringify({ slug, number, at: now }));
}

// The part chosen before checkout, or null. It is forgotten once read.
export function takePendingDownload(slug, now = Date.now()) {
  const raw = read(PENDING);
  remove(PENDING);
  try {
    const pending = JSON.parse(raw);
    const fresh = pending && pending.slug === slug && now - pending.at >= 0 && now - pending.at < PENDING_MS;
    return fresh && Number.isInteger(pending.number) ? pending.number : null;
  } catch {
    return null;
  }
}

export function markSupported(slug) {
  write(`${SUPPORTED}:${slug}`, '1');
}

export function hasSupported(slug) {
  return read(`${SUPPORTED}:${slug}`) === '1';
}
