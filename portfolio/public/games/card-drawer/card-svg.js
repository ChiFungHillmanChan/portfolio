// Pure SVG card renderer for Card Drawer. renderCardSVG(card, opts) returns a
// self-contained inline-SVG string. Every glyph is a hand-authored vector
// path — no emoji, no images, no webfonts. Colors flow through CSS custom
// properties (--card-red, --card-black, --card-joker, --card-face, ...) so
// the whole deck restyles from one place.

import { rankLabel } from './hand-eval.js';

const W = 250;
const H = 350;
const CX = W / 2;
const CY = H / 2;

const SUIT_LETTERS = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' };
const SUIT_NAMES = { spades: 'Spades', hearts: 'Hearts', diamonds: 'Diamonds', clubs: 'Clubs' };
const RED_SUITS = new Set(['hearts', 'diamonds']);

// Suit pips, hand-authored, centered on the origin, ~115 units tall.
const SUIT_PATHS = {
  spades:
    'M0 -55 C 12 -34 44 -12 44 12 C 44 30 30 40 17 40 C 11 40 5 38 2 33 ' +
    'C 4 46 10 54 18 60 L -18 60 C -10 54 -4 46 -2 33 C -5 38 -11 40 -17 40 ' +
    'C -30 40 -44 30 -44 12 C -44 -12 -12 -34 0 -55 Z',
  hearts:
    'M0 55 C -10 38 -46 16 -46 -12 C -46 -34 -30 -46 -16 -46 C -7 -46 -1 -40 0 -32 ' +
    'C 1 -40 7 -46 16 -46 C 30 -46 46 -34 46 -12 C 46 16 10 38 0 55 Z',
  diamonds:
    'M0 -55 C 12 -30 26 -14 40 0 C 26 14 12 30 0 55 C -12 30 -26 14 -40 0 ' +
    'C -26 -14 -12 -30 0 -55 Z',
  clubs:
    'M -17 -32 a 17 17 0 1 0 34 0 a 17 17 0 1 0 -34 0 Z ' +
    'M -36 -4 a 17 17 0 1 0 34 0 a 17 17 0 1 0 -34 0 Z ' +
    'M 2 -4 a 17 17 0 1 0 34 0 a 17 17 0 1 0 -34 0 Z ' +
    'M -4 -16 C -2 8 -8 28 -18 38 L 18 38 C 8 28 2 8 4 -16 Z',
};

// Canonical number-card pip positions: [x, y, inverted]. Bottom-half pips
// (and the lower middle-column pip on 8/10) are rotated 180, as on a real card.
const L = 80;
const C = 125;
const R = 170;
const PIP_LAYOUTS = {
  2: [[C, 95], [C, 255, 1]],
  3: [[C, 95], [C, 175], [C, 255, 1]],
  4: [[L, 95], [R, 95], [L, 255, 1], [R, 255, 1]],
  5: [[L, 95], [R, 95], [C, 175], [L, 255, 1], [R, 255, 1]],
  6: [[L, 95], [R, 95], [L, 175], [R, 175], [L, 255, 1], [R, 255, 1]],
  7: [[L, 95], [R, 95], [C, 135], [L, 175], [R, 175], [L, 255, 1], [R, 255, 1]],
  8: [[L, 95], [R, 95], [C, 135], [L, 175], [R, 175], [C, 215, 1], [L, 255, 1], [R, 255, 1]],
  9: [[L, 95], [R, 95], [L, 148], [R, 148], [C, 175], [L, 202, 1], [R, 202, 1], [L, 255, 1], [R, 255, 1]],
  10: [[L, 95], [R, 95], [C, 121], [L, 148], [R, 148], [L, 202, 1], [R, 202, 1], [C, 229, 1], [L, 255, 1], [R, 255, 1]],
};

const COURT = {
  11: {
    letter: 'J',
    emblem: 'pennant',
    // A herald's staff with a swallow-tailed pennant.
    path:
      'M -24 20 L 16 -20 L 22 -14 L -18 26 Z ' +
      'M 16 -20 C 24 -30 36 -32 42 -26 L 30 -18 L 38 -10 C 30 -6 22 -8 18 -14 Z ' +
      'M -28 16 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 Z',
  },
  12: {
    letter: 'Q',
    emblem: 'rose',
    // A five-petal rose.
    path:
      'M -6 -20 a 8 8 0 1 0 12 0 a 8 8 0 1 0 -12 0 Z ' +
      'M 8 -10 a 8 8 0 1 0 12 0 a 8 8 0 1 0 -12 0 Z ' +
      'M 2 6 a 8 8 0 1 0 12 0 a 8 8 0 1 0 -12 0 Z ' +
      'M -14 6 a 8 8 0 1 0 12 0 a 8 8 0 1 0 -12 0 Z ' +
      'M -20 -10 a 8 8 0 1 0 12 0 a 8 8 0 1 0 -12 0 Z ' +
      'M -5 -5 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 Z',
  },
  13: {
    letter: 'K',
    emblem: 'crown',
    // A three-peak crown with orbs.
    path:
      'M -30 14 L -30 -6 L -14 4 L 0 -12 L 14 4 L 30 -6 L 30 14 Z ' +
      'M -33 -13 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0 Z ' +
      'M -4 -19 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0 Z ' +
      'M 25 -13 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0 Z',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function svgOpen({ classes, label, dataCard, emblem }) {
  const emblemAttr = emblem ? ` data-emblem="${emblem}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
    `class="${classes.join(' ')}" role="img" aria-label="${esc(label)}" ` +
    `data-card="${esc(dataCard)}"${emblemAttr}>`
  );
}

function panel() {
  return (
    `<rect class="card-panel" x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="18" ` +
    `style="fill:var(--card-face,#fdfcf7);stroke:var(--card-edge,#cdc8bc);stroke-width:1.5"/>` +
    `<rect class="card-panel-shade" x="6" y="6" width="${W - 12}" height="${H - 12}" rx="13" ` +
    `style="fill:none;stroke:var(--card-inner-shadow,rgba(30,32,44,0.06));stroke-width:4"/>`
  );
}

function suitPath(suit, extra = '') {
  return `<path${extra} d="${SUIT_PATHS[suit]}" fill="currentColor"/>`;
}

function cornerIndex(rank, suit) {
  const inner =
    `<text class="corner-rank" x="0" y="0" text-anchor="middle" ` +
    `style="font:700 34px 'Georgia',serif;fill:currentColor">${rankLabel(rank)}</text>` +
    `<g class="corner-suit" transform="translate(0 17) scale(0.14)">${suitPath(suit)}</g>`;
  return (
    `<g class="corner" transform="translate(27 38)">${inner}</g>` +
    `<g class="corner" transform="rotate(180 ${CX} ${CY}) translate(27 38)">${inner}</g>`
  );
}

function numberPips(rank, suit) {
  return PIP_LAYOUTS[rank]
    .map(([x, y, inv]) => {
      const t = inv
        ? `translate(${x} ${y}) rotate(180) scale(0.30)`
        : `translate(${x} ${y}) scale(0.30)`;
      return `<g class="pip" transform="${t}">${suitPath(suit)}</g>`;
    })
    .join('');
}

function acePip(suit) {
  // One large ornate central pip inside a fine rosette ring.
  return (
    `<g class="ace-ornament" transform="translate(${CX} ${CY})">` +
    `<circle r="82" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35"/>` +
    `<circle r="90" fill="none" stroke="currentColor" stroke-width="0.75" opacity="0.2" stroke-dasharray="2 6"/>` +
    `</g>` +
    `<g class="pip pip-ace" transform="translate(${CX} ${CY}) scale(0.95)">${suitPath(suit)}</g>`
  );
}

function courtFace(rank, suit) {
  const { letter, path } = COURT[rank];
  // One half: emblem over an ornamental letter with a side suit pip; the
  // other half is the same group rotated 180 about the card center.
  const half =
    `<g class="court-emblem" transform="translate(${CX} 96) scale(1.1)">` +
    `<path d="${path}" fill="currentColor"/>` +
    `</g>` +
    `<text class="court-letter" x="${CX}" y="166" text-anchor="middle" ` +
    `style="font:700 76px 'Georgia',serif;fill:currentColor">${letter}</text>` +
    `<g class="court-suit" transform="translate(66 92) scale(0.17)">${suitPath(suit)}</g>`;
  return (
    `<g class="court">` +
    `<rect class="court-frame" x="38" y="50" width="${W - 76}" height="${H - 100}" rx="10" ` +
    `fill="none" stroke="currentColor" stroke-width="1.75"/>` +
    `<rect class="court-frame-inner" x="44" y="56" width="${W - 88}" height="${H - 112}" rx="7" ` +
    `fill="none" stroke="currentColor" stroke-width="0.75" opacity="0.45" stroke-dasharray="1 4"/>` +
    `<line x1="46" y1="${CY}" x2="${W - 46}" y2="${CY}" stroke="currentColor" stroke-width="0.75" opacity="0.4"/>` +
    `<g class="court-half">${half}</g>` +
    `<g class="court-half" transform="rotate(180 ${CX} ${CY})">${half}</g>` +
    `</g>`
  );
}

function jokerFace() {
  // Stylized harlequin: three-point cap with orb bells, mask, zigzag collar,
  // and a diamond-lattice band.
  const cap =
    '<path d="M-52 16 C -54 -14 -36 -26 -24 -40 C -19 -18 -10 -12 0 -44 ' +
    'C 10 -12 19 -18 24 -40 C 36 -26 54 -14 52 16 C 24 4 -24 4 -52 16 Z" fill="currentColor"/>' +
    '<path d="M -29 -44 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 Z M -5 -48 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 Z ' +
    'M 19 -44 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 Z" fill="currentColor"/>';
  const mask =
    '<circle cx="0" cy="34" r="17" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<path d="M-8 32 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 Z M 2 32 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 Z" fill="currentColor"/>' +
    '<path d="M-6 42 Q 0 47 6 42" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
  const collar =
    '<path d="M-34 58 L-17 70 L0 58 L17 70 L34 58 L20 82 L-20 82 Z" fill="currentColor" opacity="0.85"/>';
  const lattice = [-40, -20, 0, 20, 40]
    .map((x) => `M ${x} 104 L ${x + 10} 112 L ${x} 120 L ${x - 10} 112 Z`)
    .join(' ');
  const cornerWord =
    '<text class="corner-joker" text-anchor="middle" ' +
    'style="font:700 17px \'Georgia\',serif;fill:currentColor;letter-spacing:2px" ' +
    'transform="translate(26 44) rotate(-90) translate(-26 -44) translate(-40 44)">JOKER</text>';
  return (
    `<g class="corner" transform="translate(0 0)">${cornerWord}</g>` +
    `<g class="corner" transform="rotate(180 ${CX} ${CY})">${cornerWord}</g>` +
    `<g class="joker-motif" transform="translate(${CX} 148)">` +
    cap +
    mask +
    collar +
    `<path d="${lattice}" fill="currentColor" opacity="0.6"/>` +
    `</g>` +
    `<text class="joker-word" x="${CX}" y="316" text-anchor="middle" ` +
    `style="font:700 30px 'Georgia',serif;fill:currentColor;letter-spacing:8px">JOKER</text>`
  );
}

function backFace() {
  // Guilloche diamond lattice inside a double border, with a center medallion.
  const cells = [];
  for (let y = 42; y <= 308; y += 28) {
    for (let x = 40; x <= 210; x += 28) {
      cells.push(`M ${x} ${y - 10} L ${x + 10} ${y} L ${x} ${y + 10} L ${x - 10} ${y} Z`);
    }
  }
  const medallionSuits = ['spades', 'hearts', 'diamonds', 'clubs']
    .map((suit, i) => {
      const angle = i * 90;
      return (
        `<g transform="rotate(${angle}) translate(0 -26) scale(0.13)">` +
        `<path d="${SUIT_PATHS[suit]}" fill="var(--card-back-fg,#e8ddc8)"/>` +
        `</g>`
      );
    })
    .join('');
  return (
    `<rect class="back-field" x="10" y="10" width="${W - 20}" height="${H - 20}" rx="12" ` +
    `style="fill:var(--card-back-bg,#28407c)"/>` +
    `<rect class="back-border" x="16" y="16" width="${W - 32}" height="${H - 32}" rx="9" ` +
    `style="fill:none;stroke:var(--card-back-fg,#e8ddc8);stroke-width:1.5"/>` +
    `<rect class="back-border-inner" x="21" y="21" width="${W - 42}" height="${H - 42}" rx="7" ` +
    `style="fill:none;stroke:var(--card-back-fg,#e8ddc8);stroke-width:0.6;opacity:0.7"/>` +
    `<path class="back-lattice" d="${cells.join(' ')}" ` +
    `style="fill:none;stroke:var(--card-back-fg,#e8ddc8);stroke-width:0.8;opacity:0.5"/>` +
    `<g class="back-medallion" transform="translate(${CX} ${CY})">` +
    `<circle r="46" style="fill:var(--card-back-bg,#28407c);stroke:var(--card-back-fg,#e8ddc8);stroke-width:1.5"/>` +
    `<circle r="40" style="fill:none;stroke:var(--card-back-fg,#e8ddc8);stroke-width:0.6;opacity:0.7"/>` +
    medallionSuits +
    `</g>`
  );
}

export function renderCardSVG(card, opts = {}) {
  const classes = ['card-svg'];
  if (opts.dimmed) classes.push('card-dimmed');

  let label;
  let dataCard;
  let body;
  let emblem;

  if (card === 'back') {
    classes.push('card-back');
    label = 'Face-down card';
    dataCard = 'BACK';
    body = backFace();
  } else if (card.joker) {
    classes.push('card-face', 'card-joker');
    label = 'Joker';
    dataCard = 'JOKER';
    body = panel() + jokerFace();
  } else {
    const { rank, suit } = card;
    classes.push('card-face', RED_SUITS.has(suit) ? 'card-red' : 'card-black');
    label = `${rankLabel(rank)} of ${SUIT_NAMES[suit]}`;
    dataCard = `${rankLabel(rank)}${SUIT_LETTERS[suit]}`;
    let middle;
    if (rank === 14) {
      middle = acePip(suit);
    } else if (rank >= 11) {
      emblem = COURT[rank].emblem;
      middle = courtFace(rank, suit);
    } else {
      middle = numberPips(rank, suit);
    }
    body = panel() + cornerIndex(rank, suit) + middle;
  }

  if (opts.extraClass) classes.push(opts.extraClass);
  return `${svgOpen({ classes, label, dataCard, emblem })}${body}</svg>`;
}
