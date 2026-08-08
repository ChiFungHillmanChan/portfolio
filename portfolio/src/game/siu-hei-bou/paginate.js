// 分頁引擎 — pure functions, no DOM. The renderer prints each computed line as its
// own fixed-height div, so what these functions return is exactly what appears on
// the ruled lines.

// Width heuristic: code points above Latin-1 (CJK, fullwidth punctuation) take one
// ruled-line unit, everything else half a unit. Content here is Cantonese with the
// odd Latin word, so this stays accurate without a font metrics table.
const unitWidth = (ch) => (ch.codePointAt(0) > 0xff ? 1 : 0.5);

export function unitLen(str) {
  let units = 0;
  for (const ch of str) units += unitWidth(ch);
  return units;
}

export function wrapText(str, unitsPerLine) {
  const lines = [];
  let line = '';
  let used = 0;
  for (const ch of str) {
    const w = unitWidth(ch);
    if (used + w > unitsPerLine && line) {
      lines.push(line);
      line = '';
      used = 0;
    }
    line += ch;
    used += w;
  }
  if (line) lines.push(line);
  return lines;
}

// entries → pages of line objects. Page 0 holds `firstPageLines` lines (the chapter
// header and stamp card sit above it), continuation pages hold `pageLines`. Entries
// flow continuously and split mid-entry at page boundaries, like real handwriting.
export function paginateEntries(entries, { unitsPerLine, firstPageLines, pageLines }) {
  const pages = [[]];
  const capacity = (idx) => (idx === 0 ? firstPageLines : pageLines);
  const push = (line) => {
    if (pages[pages.length - 1].length >= capacity(pages.length - 1)) pages.push([]);
    pages[pages.length - 1].push(line);
  };
  for (const entry of entries) {
    push({ type: 'meta', entry });
    for (const text of wrapText(entry.content, unitsPerLine)) {
      push({ type: 'text', entry, text });
    }
  }
  return pages;
}

// Longest prefix of `str` that fits within `units` — drives the pen-writing reveal.
export function takeUnits(str, units) {
  let out = '';
  let used = 0;
  for (const ch of str) {
    const w = unitWidth(ch);
    if (used + w > units) break;
    out += ch;
    used += w;
  }
  return out;
}

export function findEntryStart(pages, entryId) {
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx += 1) {
    const lineIdx = pages[pageIdx].findIndex((l) => l.entry.id === entryId);
    if (lineIdx !== -1) return { pageIdx, lineIdx };
  }
  return null;
}
