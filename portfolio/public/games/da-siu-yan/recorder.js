// Recording: mime negotiation (pure) + MediaRecorder wrapper (browser-only).
// Chrome's MP4 MediaRecorder output is fragmented and carries zero duration in
// its movie metadata. Android system players commonly display that as 0:00, so
// Android gets a duration-repaired WebM instead. Safari keeps the MP4 path.
const MP4_FIRST = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
const WEBM_FIRST = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', ...MP4_FIRST];

export function pickMimeType(isSupported, preferWebm = false) {
  return (preferWebm ? WEBM_FIRST : MP4_FIRST).find((m) => isSupported(m)) || null;
}

export const extFor = (mime) => (mime.includes('mp4') ? 'mp4' : 'webm');

export const isAndroid = (userAgent = '') => /Android/i.test(userAgent);

export function createRecorder(stream, options = {}) {
  if (typeof MediaRecorder === 'undefined') return null;
  const userAgent = options.userAgent ?? globalThis.navigator?.userAgent ?? '';
  const now = options.now ?? (() => performance.now());
  const fixWebmDuration = options.fixWebmDuration ?? globalThis.ysFixWebmDuration;
  const mimeType = pickMimeType(
    (m) => MediaRecorder.isTypeSupported(m),
    isAndroid(userAgent)
  );
  if (!mimeType) return null;
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks = [];
  let activeSince = null;
  let durationMs = 0;
  let recorderError = null;

  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onerror = (e) => {
    recorderError = e.error || new Error('MediaRecorder failed');
  };

  function closeActivePeriod() {
    if (activeSince === null) return;
    durationMs += Math.max(0, now() - activeSince);
    activeSince = null;
  }

  async function buildBlob() {
    closeActivePeriod();
    if (recorderError) throw recorderError;
    const actualMimeType = rec.mimeType || chunks.find((chunk) => chunk.type)?.type || mimeType;
    const blob = new Blob(chunks, { type: actualMimeType });
    if (!actualMimeType.includes('webm') || !fixWebmDuration || !blob.size) return blob;
    try {
      return await fixWebmDuration(blob, durationMs, { logger: false });
    } catch (err) {
      console.warn('WebM duration repair failed', err);
      return blob;
    }
  }

  return {
    mimeType,
    start: () => {
      activeSince = now();
      rec.start(1000);
    },
    pause: () => {
      if (rec.state !== 'recording') return;
      closeActivePeriod();
      rec.pause();
    },
    resume: () => {
      if (rec.state !== 'paused') return;
      activeSince = now();
      rec.resume();
    },
    stop: () => new Promise((resolve, reject) => {
      let finished = false;
      const finish = async () => {
        if (finished) return;
        finished = true;
        try {
          resolve(await buildBlob());
        } catch (err) {
          reject(err);
        }
      };
      rec.onstop = finish;
      if (rec.state !== 'inactive') rec.stop(); else void finish();
    })
  };
}
