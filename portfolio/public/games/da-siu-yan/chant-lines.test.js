// Guards the `say` respelling mechanism in chant-lines.js.
//
// A `say` string is what actually reaches the TTS engine, and it differs from
// the chant by single homophone characters (猴 for 喉, 失 for 膝 …). A typo there
// is invisible — the build still succeeds, the clip still generates, and the
// granny just says the wrong word. These tests make that failure loud.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTRO, FINALE, LINES, ttsText } from './chant-lines.js';

const ALL = [INTRO, ...LINES, FINALE];

test('every clip has a non-empty id and text', () => {
  for (const c of ALL) {
    assert.match(c.id, /^(intro|finale|line-\d{2})$/, `bad id: ${c.id}`);
    assert.ok(c.text.length > 0, `${c.id} has empty text`);
  }
});

test('clip ids are unique', () => {
  const ids = ALL.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the clip list is intro, 28 lines, finale', () => {
  assert.equal(INTRO.id, 'intro');
  assert.equal(FINALE.id, 'finale');
  assert.equal(LINES.length, 28);
});

test('ttsText returns say when present, otherwise text', () => {
  assert.equal(ttsText({ id: 'x', text: 'a' }), 'a');
  assert.equal(ttsText({ id: 'x', text: 'a', say: 'b' }), 'b');
});

test('a say string is the same length as its text — substitutions are 1:1', () => {
  // Every respelling swaps one character for one homophone. A length change
  // means a character was dropped or added, which would alter the chant.
  for (const c of ALL.filter((x) => x.say)) {
    assert.equal([...c.say].length, [...c.text].length,
      `${c.id}: say is ${[...c.say].length} chars, text is ${[...c.text].length}`);
  }
});

test('a say string differs from its text in at least one, and at most four, characters', () => {
  for (const c of ALL.filter((x) => x.say)) {
    const t = [...c.text], s = [...c.say];
    const diffs = t.reduce((n, ch, i) => n + (ch === s[i] ? 0 : 1), 0);
    assert.ok(diffs >= 1, `${c.id}: say is identical to text — drop the say field`);
    assert.ok(diffs <= 4, `${c.id}: ${diffs} characters differ, which is too many to be homophone swaps`);
  }
});

test('say never changes punctuation or 打你 — only the mispronounced characters', () => {
  for (const c of ALL.filter((x) => x.say)) {
    const t = [...c.text], s = [...c.say];
    t.forEach((ch, i) => {
      if (/[,!。、?]/.test(ch)) {
        assert.equal(s[i], ch, `${c.id}: punctuation changed at index ${i}`);
      }
    });
    assert.ok(c.say.startsWith(c.text.slice(0, 2)) || c.id === 'intro',
      `${c.id}: say changed the opening 打你`);
  }
});

test('no say string still contains a character it was meant to replace', () => {
  // The point of a respelling is that the bad character is gone. If both the
  // original and the substitute appear, the swap was applied in the wrong place.
  const SWAPS = [
    ['intro', '今', '金'], ['line-02', '抖', '唞'], ['line-06', '泡', '抱'],
    ['line-08', '做', '造'], ['line-11', '燒', '消'], ['line-15', '牙', '芽'],
    ['line-17', '脾', '髀'], ['line-20', '喉', '猴'], ['line-21', '膝', '失'],
    ['line-25', '腮', '鰓']
  ];
  const byId = new Map(ALL.map((c) => [c.id, c]));
  for (const [id, from, to] of SWAPS) {
    const c = byId.get(id);
    assert.ok(c, `${id} missing from chant-lines`);
    assert.ok(c.say, `${id} lost its say field`);
    assert.ok(c.text.includes(from), `${id}: text no longer contains ${from}`);
    assert.ok(c.say.includes(to), `${id}: say does not contain ${to}`);
    assert.ok(!c.say.includes(from), `${id}: say still contains the bad character ${from}`);
  }
});
