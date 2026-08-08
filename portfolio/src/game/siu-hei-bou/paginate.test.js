import {
  unitLen, wrapText, paginateEntries, findEntryStart, takeUnits, continuesOverleaf,
} from './paginate';

const entry = (id, content, extra = {}) =>
  ({ id, content, severity: 1, occurred_at: '2026-08-08', card_id: null, ...extra });

describe('unitLen', () => {
  it('counts CJK as 1 unit and halfwidth as 0.5', () => {
    expect(unitLen('嬲爆')).toBe(2);
    expect(unitLen('abc')).toBe(1.5);
    expect(unitLen('嬲a')).toBe(1.5);
    expect(unitLen('')).toBe(0);
  });

  it('counts fullwidth punctuation as 1 unit', () => {
    expect(unitLen('，。')).toBe(2);
  });
});

describe('wrapText', () => {
  it('splits greedily at the unit limit and loses no characters', () => {
    const text = '好'.repeat(40);
    const lines = wrapText(text, 19);
    expect(lines.map((l) => l.length)).toEqual([19, 19, 2]);
    expect(lines.join('')).toBe(text);
  });

  it('fits twice as many halfwidth characters per line', () => {
    const lines = wrapText('a'.repeat(40), 19);
    expect(lines.map((l) => l.length)).toEqual([38, 2]);
  });

  it('returns a single line for short text', () => {
    expect(wrapText('佢遲到', 19)).toEqual(['佢遲到']);
  });
});

describe('paginateEntries', () => {
  const opts = { unitsPerLine: 19, firstPageLines: 6, pageLines: 10 };

  it('renders one entry as a meta line followed by its text lines', () => {
    const pages = paginateEntries([entry(1, '佢遲到成個鐘')], opts);
    expect(pages).toHaveLength(1);
    expect(pages[0][0]).toMatchObject({ type: 'meta', entry: { id: 1 } });
    expect(pages[0][1]).toMatchObject({ type: 'text', text: '佢遲到成個鐘' });
  });

  it('splits a long entry across pages mid-entry like real writing', () => {
    const text = '嬲'.repeat(19 * 8); // 8 full lines of text
    const pages = paginateEntries([entry(1, text)], opts);
    // page 0: meta + 5 text lines, page 1: remaining 3 text lines
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(6);
    expect(pages[1]).toHaveLength(3);
    const joined = pages.flat().filter((l) => l.type === 'text').map((l) => l.text).join('');
    expect(joined).toBe(text);
  });

  it('separates entries with one blank gap line', () => {
    const pages = paginateEntries([entry(1, '一句'), entry(2, '另一句')], opts);
    expect(pages).toHaveLength(1);
    expect(pages[0].map((l) => l.type)).toEqual(['meta', 'text', 'gap', 'meta', 'text']);
    expect(pages[0][3].entry.id).toBe(2);
  });

  it('drops the gap when it would start a fresh page', () => {
    const tight = { unitsPerLine: 19, firstPageLines: 2, pageLines: 10 };
    const pages = paginateEntries([entry(1, '一句'), entry(2, '另一句')], tight);
    // entry 1 exactly fills page 0 — page 1 must open with entry 2's meta, not a blank
    expect(pages[0].map((l) => l.type)).toEqual(['meta', 'text']);
    expect(pages[1].map((l) => l.type)).toEqual(['meta', 'text']);
  });

  it('uses the larger capacity for continuation pages', () => {
    const text = '好'.repeat(19 * 20); // 20 text lines total
    const pages = paginateEntries([entry(1, text)], opts);
    // 21 lines incl. meta → 6 on page 0, 10 on page 1, 5 on page 2
    expect(pages.map((p) => p.length)).toEqual([6, 10, 5]);
  });

  it('carries the full entry object on every line for styling', () => {
    const claimed = entry(1, '被人claim咗嘅罪', { card_id: 7 });
    const pages = paginateEntries([claimed], opts);
    pages.flat().forEach((line) => expect(line.entry.card_id).toBe(7));
  });

  it('returns one empty page for no entries', () => {
    expect(paginateEntries([], opts)).toEqual([[]]);
  });
});

describe('continuesOverleaf', () => {
  const opts = { unitsPerLine: 19, firstPageLines: 4, pageLines: 10 };

  it('is true when the page-ending entry runs onto the next page', () => {
    const pages = paginateEntries([entry(1, '嬲'.repeat(19 * 6))], opts);
    expect(continuesOverleaf(pages, 0)).toBe(true);
    expect(continuesOverleaf(pages, 1)).toBe(false);
  });

  it('is false when the next page starts a new entry', () => {
    const tight = { unitsPerLine: 19, firstPageLines: 2, pageLines: 10 };
    const pages = paginateEntries([entry(1, '一句'), entry(2, '另一句')], tight);
    expect(continuesOverleaf(pages, 0)).toBe(false);
  });
});

describe('takeUnits', () => {
  it('returns the longest prefix fitting the unit budget', () => {
    expect(takeUnits('嬲嬲嬲', 2)).toBe('嬲嬲');
    expect(takeUnits('abcd', 1)).toBe('ab');
    expect(takeUnits('嬲a嬲', 1.5)).toBe('嬲a');
    expect(takeUnits('嬲嬲', 10)).toBe('嬲嬲');
    expect(takeUnits('嬲', 0)).toBe('');
  });
});

describe('findEntryStart', () => {
  it('locates the page and line where an entry begins', () => {
    const opts = { unitsPerLine: 19, firstPageLines: 4, pageLines: 6 };
    const long = entry(1, '嬲'.repeat(19 * 5)); // meta + 5 lines → spills to page 1
    const pages = paginateEntries([long, entry(2, '短')], opts);
    expect(findEntryStart(pages, 1)).toEqual({ pageIdx: 0, lineIdx: 0 });
    const start = findEntryStart(pages, 2);
    expect(pages[start.pageIdx][start.lineIdx]).toMatchObject({ type: 'meta', entry: { id: 2 } });
  });

  it('returns null for an unknown entry', () => {
    expect(findEntryStart([[]], 99)).toBeNull();
  });
});
