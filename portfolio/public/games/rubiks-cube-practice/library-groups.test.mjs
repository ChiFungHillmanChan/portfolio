import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { renderLibraryGroups } from './library-groups.js';
import { setLocale } from './i18n.js';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const renderCase = (record) => `<button class="case-card" data-id="${record.id}">${record.name}</button>`;
const fragment = (records, options = {}) => JSDOM.fragment(renderLibraryGroups(records, {
  stage: 'O', renderCase, ...options,
}));

for (const [stage, count, groups] of [['F', 41, 8], ['O', 57, 15], ['P', 21, 3]]) {
  test(`${stage} library shows all ${count} cases in ${groups} open pattern chapters`, () => {
    const stageCases = cases.filter((record) => record.stage === stage);
    const root = fragment(stageCases, { stage });
    const cards = [...root.querySelectorAll('.case-card')];
    assert.equal(cards.length, count);
    assert.equal(root.querySelectorAll('.library-group').length, groups);
    assert.deepEqual(cards.map((card) => card.dataset.id).sort(), stageCases.map((record) => record.id).sort());
    assert.equal(new Set(cards.map((card) => card.dataset.id)).size, count);
    assert.equal(root.querySelectorAll('details, [hidden], [data-action="load-cases"]').length, 0);
    for (const card of cards) assert.ok(card.closest('.library-group .case-grid'));
  });
}

test('non-adjacent patterns share one chapter while retaining their original case order', () => {
  const root = fragment([
    { id: 'oll-a', name: 'A', group: 'Dot' },
    { id: 'oll-b', name: 'B', group: 'Cross' },
    { id: 'oll-c', name: 'C', group: 'Dot' },
  ]);
  const groups = [...root.querySelectorAll('.library-group')];
  assert.deepEqual(groups.map((group) => group.dataset.group), ['Dot', 'Cross']);
  assert.deepEqual([...groups[0].querySelectorAll('.case-card')].map((card) => card.dataset.id), ['oll-a', 'oll-c']);
  assert.equal(groups[0].querySelector('.library-group-count').textContent, '2 cases');
  assert.equal(groups[1].querySelector('.library-group-count').textContent, '1 case');
});

test('every quick jump targets a focusable chapter and filtered chapters retain the same ID', () => {
  const records = cases.filter((record) => record.stage === 'O');
  const root = fragment(records);
  const filtered = fragment(records.filter((record) => record.group === 'Small L Shape'));
  assert.equal(filtered.querySelector('h3').id, 'library-group-o-small-l-shape');
  assert.ok(root.querySelector('#library-group-o-small-l-shape'));
  const buttons = [...root.querySelectorAll('[data-action="library-group"]')];
  assert.equal(buttons.length, 15);
  for (const button of buttons) {
    const heading = root.querySelector(`#${button.dataset.value}`);
    assert.equal(heading.tagName, 'H3');
    assert.equal(heading.getAttribute('tabindex'), '-1');
    assert.equal(heading.closest('section').getAttribute('aria-labelledby'), heading.id);
  }
  assert.equal(root.querySelectorAll('[id]').length, new Set([...root.querySelectorAll('[id]')].map((node) => node.id)).size);
});

test('chapter headings and navigation use translated plain text without changing IDs', () => {
  setLocale('zh-HK');
  try {
    const root = fragment([{ id: 'oll-1', name: 'OLL 1', group: 'Dot' }]);
    assert.equal(root.querySelector('nav').getAttribute('aria-label'), '圖案分類');
    assert.equal(root.querySelector('h3').textContent, '點形');
    assert.equal(root.querySelector('.library-group-count').textContent, '1 個案');
    assert.equal(root.querySelector('h3').id, 'library-group-o-dot');
    const escaped = fragment([{ id: 'oll-1', name: 'OLL 1', group: 'Dot' }], { groupTitle: () => '<b>Dot & cross</b>' });
    assert.equal(escaped.querySelector('h3').textContent, '<b>Dot & cross</b>');
    assert.equal(escaped.querySelector('h3 b'), null);
  } finally { setLocale('en'); }
});

test('an empty filtered library creates no empty chapters or navigation', () => {
  const root = fragment([]);
  assert.equal(root.children.length, 0);
});
