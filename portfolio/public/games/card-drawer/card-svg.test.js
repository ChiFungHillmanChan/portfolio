import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCardSVG } from './card-svg.js';
import { SUITS, RANKS, rankLabel } from './hand-eval.js';

// Any emoji / pictographic / symbol code point is banned from the output:
// arrows, misc symbols (incl. U+2660-2667 card suits), dingbats, variation
// selectors, and the whole SMP emoji range.
const EMOJI_RE = /[←-⯿︎️\u{1F000}-\u{1FAFF}]/u;

const count = (haystack, re) => (haystack.match(re) || []).length;

function assertWellFormedSVG(svg, label) {
  assert.match(svg, /^<svg[\s>]/, `${label}: must start with <svg`);
  assert.ok(svg.trimEnd().endsWith('</svg>'), `${label}: must end with </svg>`);
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^"'>])*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(svg))) {
    const [, closing, name, , selfClose] = m;
    if (selfClose) continue;
    if (closing) {
      assert.equal(stack.pop(), name, `${label}: mismatched </${name}>`);
    } else {
      stack.push(name);
    }
  }
  assert.equal(stack.length, 0, `${label}: unclosed tags ${stack.join(',')}`);
  assert.ok(
    !/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(svg),
    `${label}: raw ampersand`
  );
}

const allFaces = () =>
  SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));

test('every rank/suit face renders well-formed SVG with viewBox and data-card', () => {
  for (const card of allFaces()) {
    const svg = renderCardSVG(card);
    const label = `${rankLabel(card.rank)} of ${card.suit}`;
    assertWellFormedSVG(svg, label);
    assert.match(svg, /viewBox="0 0 250 350"/, label);
    assert.ok(svg.includes('data-card="'), label);
    assert.ok(svg.includes('aria-label="'), label);
  }
});

test('hearts/diamonds are red, spades/clubs are black', () => {
  assert.ok(renderCardSVG({ rank: 10, suit: 'hearts' }).includes('card-red'));
  assert.ok(renderCardSVG({ rank: 10, suit: 'diamonds' }).includes('card-red'));
  assert.ok(renderCardSVG({ rank: 10, suit: 'spades' }).includes('card-black'));
  assert.ok(renderCardSVG({ rank: 10, suit: 'clubs' }).includes('card-black'));
});

test('faces have two corner indices, one rotated 180', () => {
  for (const suit of SUITS) {
    const svg = renderCardSVG({ rank: 12, suit });
    assert.equal(count(svg, /class="corner"/g), 2, suit);
    assert.ok(/class="corner" transform="[^"]*rotate\(180/.test(svg), suit);
  }
});

test('number cards 2-10 have exactly rank pips', () => {
  for (let rank = 2; rank <= 10; rank++) {
    for (const suit of SUITS) {
      const svg = renderCardSVG({ rank, suit });
      assert.equal(count(svg, /class="pip"/g), rank, `${rank} of ${suit}`);
    }
  }
});

test('bottom-half pips are rotated 180 like a real card (8 has 3, 10 has 5)', () => {
  const invertedPips = (svg) =>
    count(svg, /<g class="pip" transform="[^"]*rotate\(180[^"]*"/g);
  for (let rank = 2; rank <= 10; rank++) {
    const svg = renderCardSVG({ rank, suit: 'clubs' });
    assert.ok(invertedPips(svg) >= 1, `rank ${rank} needs an inverted pip`);
  }
  assert.equal(invertedPips(renderCardSVG({ rank: 8, suit: 'clubs' })), 3);
  assert.equal(invertedPips(renderCardSVG({ rank: 10, suit: 'clubs' })), 5);
});

test('ace has one large ornate central pip', () => {
  for (const suit of SUITS) {
    const svg = renderCardSVG({ rank: 14, suit });
    assert.equal(count(svg, /class="pip pip-ace"/g), 1, suit);
    assert.equal(count(svg, /class="pip"/g), 0, suit);
  }
});

test('court cards are marked, rotationally symmetric, with distinct emblems', () => {
  const emblems = new Set();
  for (const rank of [11, 12, 13]) {
    const svg = renderCardSVG({ rank, suit: 'hearts' });
    assert.ok(svg.includes('class="court'), `rank ${rank}`);
    assert.ok(svg.includes('rotate(180'), `rank ${rank} needs 180 symmetry`);
    const m = svg.match(/data-emblem="([^"]+)"/);
    assert.ok(m, `rank ${rank} needs data-emblem`);
    emblems.add(m[1]);
  }
  assert.equal(emblems.size, 3, 'J/Q/K emblems must differ');
});

test('joker is a dedicated design with a JOKER wordmark and its own class', () => {
  const svg = renderCardSVG({ joker: true });
  assertWellFormedSVG(svg, 'joker');
  assert.ok(svg.includes('JOKER'));
  assert.ok(svg.includes('card-joker'));
  assert.ok(!svg.includes('card-red') && !svg.includes('card-black'));
});

test('card back renders a well-formed patterned design', () => {
  const svg = renderCardSVG('back');
  assertWellFormedSVG(svg, 'back');
  assert.ok(svg.includes('card-back'));
  assert.match(svg, /viewBox="0 0 250 350"/);
});

test('dimmed option adds the dimmed class', () => {
  const svg = renderCardSVG({ rank: 7, suit: 'spades' }, { dimmed: true });
  assert.ok(svg.includes('card-dimmed'));
  assert.ok(!renderCardSVG({ rank: 7, suit: 'spades' }).includes('card-dimmed'));
});

test('extra class option is appended to the root svg', () => {
  const svg = renderCardSVG({ rank: 7, suit: 'spades' }, { extraClass: 'fanned' });
  assert.match(svg, /^<svg[^>]*class="[^"]*fanned/);
});

test('no emoji or pictographic code points anywhere in any output', () => {
  const outputs = [
    ...allFaces().map((card) => renderCardSVG(card)),
    renderCardSVG({ joker: true }),
    renderCardSVG('back'),
    renderCardSVG({ rank: 14, suit: 'hearts' }, { dimmed: true }),
  ];
  for (const svg of outputs) {
    assert.ok(!EMOJI_RE.test(svg), `emoji code point found in: ${svg.slice(0, 80)}`);
  }
});
