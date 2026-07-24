// Recording: mime negotiation (pure) + MediaRecorder wrapper (browser-only).
const PREFERENCE = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];

export function pickMimeType(isSupported) {
  return PREFERENCE.find((m) => isSupported(m)) || null;
}

export const extFor = (mime) => (mime.includes('mp4') ? 'mp4' : 'webm');

export function createRecorder(stream) {
  if (typeof MediaRecorder === 'undefined') return null;
  const mimeType = pickMimeType((m) => MediaRecorder.isTypeSupported(m));
  if (!mimeType) return null;
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  return {
    mimeType,
    start: () => rec.start(1000),
    pause: () => { if (rec.state === 'recording') rec.pause(); },
    resume: () => { if (rec.state === 'paused') rec.resume(); },
    stop: () => new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      if (rec.state !== 'inactive') rec.stop(); else resolve(new Blob(chunks, { type: mimeType }));
    })
  };
}
