// js/parser/validator.mjs
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const HEADER_RE = /^Poker Hand #(?:RC|HD|SD|TM)\d+: /;

export function validateFile(name, content) {
  if (!name.toLowerCase().endsWith('.txt')) {
    return { valid: false, reason: 'wrong extension (must be .txt)' };
  }
  // Use content length as byte estimate (UTF-8 chars >1 byte possible; over-estimate is fine).
  if (content.length > MAX_FILE_BYTES) {
    return { valid: false, reason: `file size too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)` };
  }
  // Scan first 4KB for non-printable bytes (excluding common whitespace)
  const head = content.slice(0, 4096);
  for (let i = 0; i < head.length; i++) {
    const c = head.charCodeAt(i);
    const printable = (c >= 0x20 && c < 0x7F) || c === 0x09 || c === 0x0A || c === 0x0D;
    if (!printable) return { valid: false, reason: 'binary content detected' };
  }
  // First non-blank line must match GG header
  const firstLine = (content.split(/\r?\n/).find(l => l.trim().length > 0)) || '';
  if (!HEADER_RE.test(firstLine)) {
    return { valid: false, reason: 'missing GGPoker hand header' };
  }
  return { valid: true };
}
