import { paginateEntries, unitLen } from './paginate';

// Every structural block on a book page is a multiple of LINE_PX so the ruled
// background (drawn once per page, offset by the top padding) lines up with every
// text line below it. The CSS mirrors these numbers via --shb-lh and fixed block
// heights — change them together or the ink drifts off the lines.
export const LINE_PX = 32;
export const UNITS_PER_LINE = 18;

export const PAD_TOP = 16;
export const PAD_BOTTOM = 28;

export const H = {
  chapterHeader: 64,
  banner: 32,
  fullBtn: 64,
  cardBox: 128,
  entriesHead: 32,
  slimHeader: 32,
  idxHeader: 64,
  idxSearch: 32,
  idxAdd: 64,
  idxFoot: 32,
};

export function computeGeom() {
  const vw = window.innerWidth || 400;
  const vh = window.innerHeight || 700;
  const w = Math.min(Math.round(vw * 0.94), 400);
  const h = Math.min(Math.round(vh * 0.74), 620);
  // charPx must match the .shb-book font-size (14px below 340px wide — see CSS)
  const charPx = vw <= 340 ? 14 : 17;
  return { w, h, charPx, contentH: h - PAD_TOP - PAD_BOTTOM };
}

export function stampCardMetrics(threshold, geom) {
  const seal = threshold > 30 ? 22 : 30;
  const cell = seal + 8;
  const perRow = Math.max(4, Math.floor((geom.w - 48) / cell));
  const rows = Math.ceil(threshold / perRow);
  const raw = rows * cell + 20;
  return { h: Math.ceil(raw / LINE_PX) * LINE_PX, seal };
}

export function indexLinesPerPage(geom) {
  return Math.max(
    3,
    Math.floor((geom.contentH - H.idxHeader - H.idxSearch - H.idxAdd - H.idxFoot) / LINE_PX),
  );
}

// friend + grudges (API order, newest first) + open card → renderable chapter.
export function buildChapter(friend, grudges, card, geom) {
  const { h: stampH, seal } = stampCardMetrics(friend.threshold, geom);
  const full = friend.stamps >= friend.threshold;
  const nearly = !full && friend.stamps >= friend.threshold * 0.8;
  const showBanner = nearly && !card;
  const showFullBtn = full && !card;

  let used = H.chapterHeader + stampH + H.entriesHead;
  if (showBanner) used += H.banner;
  if (showFullBtn) used += H.fullBtn;
  if (card) used += H.cardBox;

  const firstPageLines = Math.max(1, Math.floor((geom.contentH - used) / LINE_PX));
  const pageLines = Math.max(4, Math.floor((geom.contentH - H.slimHeader) / LINE_PX));

  const entries = grudges ? [...grudges].reverse() : null; // chronological, like a real diary
  const pages = entries
    ? paginateEntries(entries, { unitsPerLine: UNITS_PER_LINE, firstPageLines, pageLines })
    : [[]];

  return { friend, card, pages, stampH, seal, showBanner, showFullBtn, full, loaded: !!entries };
}

// Where each line of one entry sits, with its cumulative unit range — the pen
// animation walks progress through these ranges.
export function entryLineMap(pages, entryId) {
  const out = [];
  let acc = 0;
  pages.forEach((page, pageIdx) => {
    page.forEach((line, lineIdx) => {
      if (line.entry.id !== entryId) return;
      if (line.type === 'gap') return;
      if (line.type === 'meta') {
        out.push({ pageIdx, lineIdx, type: 'meta', start: 0, end: 0 });
      } else {
        const units = unitLen(line.text);
        out.push({ pageIdx, lineIdx, type: 'text', start: acc, end: acc + units });
        acc += units;
      }
    });
  });
  return out;
}
