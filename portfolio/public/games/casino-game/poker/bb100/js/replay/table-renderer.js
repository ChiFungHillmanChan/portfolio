// table-renderer.js — Build + diff-render a poker table SVG from snapshot state.
//
// The renderer builds an SVG once (`buildTable`) with stable element IDs, then
// each `renderSnapshot(snapshot)` call diffs and updates only what changed:
// classes for folded/all-in, transforms (none in v1), text content for stacks
// and pot, board card content. CSS transitions on classes provide the animation.

const VIEW_W = 720;
const VIEW_H = 460;

// Seat positions around an ellipse-ish table. Indexed by seats.length.
// Each entry is { x, y, betX, betY } where (x,y) is seat center, (betX,betY)
// is the chip-stack target between the seat and the pot.
// Hero is always anchored at the bottom (seat order rotates so Hero is last).
const SEAT_LAYOUT = {
  2: [
    { x: 360, y: 90,  betX: 360, betY: 180 },
    { x: 360, y: 370, betX: 360, betY: 280 }, // hero
  ],
  3: [
    { x: 140, y: 200, betX: 240, betY: 230 },
    { x: 580, y: 200, betX: 480, betY: 230 },
    { x: 360, y: 380, betX: 360, betY: 280 }, // hero
  ],
  4: [
    { x: 360, y: 80,  betX: 360, betY: 170 },
    { x: 120, y: 230, betX: 230, betY: 240 },
    { x: 600, y: 230, betX: 490, betY: 240 },
    { x: 360, y: 380, betX: 360, betY: 280 }, // hero
  ],
  5: [
    { x: 200, y: 90,  betX: 270, betY: 180 },
    { x: 520, y: 90,  betX: 450, betY: 180 },
    { x: 100, y: 260, betX: 210, betY: 260 },
    { x: 620, y: 260, betX: 510, betY: 260 },
    { x: 360, y: 380, betX: 360, betY: 280 }, // hero
  ],
  6: [
    { x: 200, y: 80,  betX: 270, betY: 170 },
    { x: 520, y: 80,  betX: 450, betY: 170 },
    { x: 80,  y: 230, betX: 200, betY: 240 },
    { x: 640, y: 230, betX: 520, betY: 240 },
    { x: 220, y: 380, betX: 280, betY: 290 },
    { x: 360, y: 400, betX: 360, betY: 290 }, // hero
    // Note: 6-max uses 5 villains + hero; if extracted has 6 the 6th is hero last
  ],
  7: [
    { x: 180, y: 70,  betX: 250, betY: 160 },
    { x: 540, y: 70,  betX: 470, betY: 160 },
    { x: 70,  y: 200, betX: 190, betY: 220 },
    { x: 650, y: 200, betX: 530, betY: 220 },
    { x: 130, y: 350, betX: 240, betY: 280 },
    { x: 590, y: 350, betX: 480, betY: 280 },
    { x: 360, y: 400, betX: 360, betY: 290 }, // hero
  ],
  8: [
    { x: 180, y: 60,  betX: 240, betY: 150 },
    { x: 540, y: 60,  betX: 480, betY: 150 },
    { x: 60,  y: 170, betX: 180, betY: 200 },
    { x: 660, y: 170, betX: 540, betY: 200 },
    { x: 60,  y: 310, betX: 180, betY: 270 },
    { x: 660, y: 310, betX: 540, betY: 270 },
    { x: 240, y: 400, betX: 290, betY: 290 },
    { x: 480, y: 400, betX: 430, betY: 290 }, // hero
  ],
  9: [
    { x: 360, y: 50,  betX: 360, betY: 145 },
    { x: 170, y: 80,  betX: 240, betY: 160 },
    { x: 550, y: 80,  betX: 480, betY: 160 },
    { x: 50,  y: 200, betX: 170, betY: 220 },
    { x: 670, y: 200, betX: 550, betY: 220 },
    { x: 60,  y: 340, betX: 180, betY: 270 },
    { x: 660, y: 340, betX: 540, betY: 270 },
    { x: 240, y: 410, betX: 290, betY: 290 },
    { x: 480, y: 410, betX: 430, betY: 290 }, // hero
  ],
};

// Order players so Hero ends up at the bottom seat. Returns a NEW ordered
// array where the last element is Hero (if Hero is among the players).
function orderPlayersHeroLast(players) {
  // Sort by seat number first (preserves natural order around the table)
  const arr = Object.values(players).sort((a, b) => a.seat - b.seat);
  const heroIdx = arr.findIndex((p) => p.isHero);
  if (heroIdx === -1) return arr;
  // Rotate so Hero is last
  return [...arr.slice(heroIdx + 1), ...arr.slice(0, heroIdx + 1)];
}

function layoutForSeats(n) {
  if (SEAT_LAYOUT[n]) return SEAT_LAYOUT[n];
  // Fallback: spread evenly around an ellipse
  const layout = [];
  const cx = VIEW_W / 2, cy = VIEW_H / 2;
  const rx = VIEW_W * 0.42, ry = VIEW_H * 0.38;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2;
    layout.push({
      x: cx + Math.cos(t) * rx,
      y: cy + Math.sin(t) * ry,
      betX: cx + Math.cos(t) * rx * 0.55,
      betY: cy + Math.sin(t) * ry * 0.55,
    });
  }
  return layout;
}

function svgEl(tag, attrs = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const e = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    e.setAttribute(k, String(v));
  }
  return e;
}

function suitClass(card) {
  if (!card || card.length < 2) return "";
  return "suit-" + card[card.length - 1];
}

function cardRankText(card) {
  if (!card || card.length < 2) return card || "";
  return card.slice(0, -1); // strip suit
}

function cardSuitGlyph(card) {
  if (!card || card.length < 2) return "";
  const s = card[card.length - 1];
  return { h: "♥", d: "♦", s: "♠", c: "♣" }[s] || s;
}

/**
 * Build the SVG skeleton + return refs we'll update each frame.
 *
 * @param {HTMLElement} mountEl  Element to mount the SVG into.
 * @param {Object}      snap0    Initial snapshot (uses meta-derived seats).
 * @returns {Object}             Refs keyed by element role.
 */
export function buildTable(mountEl, snap0) {
  const ordered = orderPlayersHeroLast(snap0.players);
  const layout = layoutForSeats(ordered.length);

  const svg = svgEl("svg", {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    class: "poker-table",
    preserveAspectRatio: "xMidYMid meet",
    width: "100%",
  });

  // Felt
  const felt = svgEl("ellipse", {
    cx: VIEW_W / 2,
    cy: VIEW_H / 2,
    rx: VIEW_W * 0.46,
    ry: VIEW_H * 0.42,
    class: "felt",
  });
  svg.appendChild(felt);

  // Inner felt highlight
  const feltInner = svgEl("ellipse", {
    cx: VIEW_W / 2,
    cy: VIEW_H / 2,
    rx: VIEW_W * 0.38,
    ry: VIEW_H * 0.32,
    class: "felt-inner",
  });
  svg.appendChild(feltInner);

  // Board cards (group of 5 placeholders)
  const boardGroup = svgEl("g", { class: "board", transform: `translate(${VIEW_W / 2 - 130}, ${VIEW_H / 2 - 35})` });
  const boardSlots = [];
  for (let i = 0; i < 5; i++) {
    const slot = svgEl("g", { class: "board-slot", transform: `translate(${i * 56}, 0)`, opacity: 0 });
    const rect = svgEl("rect", { x: 0, y: 0, width: 50, height: 70, rx: 6, class: "card-bg" });
    const rank = svgEl("text", { x: 25, y: 30, "text-anchor": "middle", class: "card-rank" });
    const suit = svgEl("text", { x: 25, y: 55, "text-anchor": "middle", class: "card-suit" });
    slot.appendChild(rect);
    slot.appendChild(rank);
    slot.appendChild(suit);
    boardGroup.appendChild(slot);
    boardSlots.push({ slot, rect, rank, suit });
  }
  svg.appendChild(boardGroup);

  // Pot indicator
  const potGroup = svgEl("g", { class: "pot-group", transform: `translate(${VIEW_W / 2}, ${VIEW_H / 2 + 60})` });
  const potBg = svgEl("rect", { x: -50, y: -14, width: 100, height: 22, rx: 11, class: "pot-bg" });
  const potText = svgEl("text", { x: 0, y: 2, "text-anchor": "middle", class: "pot-text" });
  potGroup.appendChild(potBg);
  potGroup.appendChild(potText);
  svg.appendChild(potGroup);

  // Seats
  const seatRefs = {};
  ordered.forEach((p, i) => {
    const pos = layout[i];
    const group = svgEl("g", { class: "seat", "data-name": p.name, transform: `translate(${pos.x}, ${pos.y})` });

    // Avatar bg + ring
    const ring = svgEl("circle", { r: 28, class: "seat-ring" });
    const avatar = svgEl("circle", { r: 22, class: "seat-avatar" + (p.isHero ? " seat-hero" : "") });
    const initial = svgEl("text", { x: 0, y: 5, "text-anchor": "middle", class: "seat-initial" });
    initial.textContent = p.name === "Hero" ? "H" : (p.name.length > 8 ? p.name.slice(0, 1).toUpperCase() : p.name.slice(0, 2).toUpperCase());

    // Name + stack
    const labelY = pos.y > VIEW_H / 2 ? 50 : 50; // always below avatar for simplicity
    const labelGroup = svgEl("g", { transform: `translate(0, ${labelY})` });
    const labelBg = svgEl("rect", { x: -55, y: -16, width: 110, height: 32, rx: 5, class: "seat-label-bg" });
    const nameText = svgEl("text", { x: 0, y: -3, "text-anchor": "middle", class: "seat-name" });
    nameText.textContent = p.name === "Hero" ? "Hero" : (p.name.length > 8 ? p.name.slice(0, 8) + "…" : p.name);
    const stackText = svgEl("text", { x: 0, y: 12, "text-anchor": "middle", class: "seat-stack" });
    labelGroup.appendChild(labelBg);
    labelGroup.appendChild(nameText);
    labelGroup.appendChild(stackText);

    // Action text (above avatar)
    const actionText = svgEl("text", { x: 0, y: -36, "text-anchor": "middle", class: "seat-action" });

    // Hole cards (two slots, slightly fanned)
    const cardOffsetY = pos.y > VIEW_H / 2 ? -56 : 32;
    const cardsGroup = svgEl("g", { class: "hole-cards", transform: `translate(0, ${cardOffsetY})`, opacity: 0 });
    const cardSlots = [];
    for (let c = 0; c < 2; c++) {
      const card = svgEl("g", { class: "hole-card", transform: `translate(${c === 0 ? -16 : 16}, 0) rotate(${c === 0 ? -8 : 8})` });
      const rect = svgEl("rect", { x: -14, y: -20, width: 28, height: 40, rx: 4, class: "card-bg card-back" });
      const rank = svgEl("text", { x: 0, y: -4, "text-anchor": "middle", class: "card-rank-small" });
      const suit = svgEl("text", { x: 0, y: 11, "text-anchor": "middle", class: "card-suit-small" });
      card.appendChild(rect);
      card.appendChild(rank);
      card.appendChild(suit);
      cardsGroup.appendChild(card);
      cardSlots.push({ card, rect, rank, suit });
    }

    // Dealer button marker (only for the player on the button)
    const dealerBtn = svgEl("g", { class: "dealer-btn", transform: `translate(${pos.x > VIEW_W / 2 ? -32 : 32}, 26)`, opacity: p.isButton ? 1 : 0 });
    const dealerCircle = svgEl("circle", { r: 9, class: "dealer-btn-bg" });
    const dealerText = svgEl("text", { y: 4, "text-anchor": "middle", class: "dealer-btn-text" });
    dealerText.textContent = "D";
    dealerBtn.appendChild(dealerCircle);
    dealerBtn.appendChild(dealerText);

    // Bet chip — a small disc positioned between the seat and the pot
    const chipDx = pos.betX - pos.x;
    const chipDy = pos.betY - pos.y;
    const chipGroup = svgEl("g", { class: "bet-chip", transform: `translate(${chipDx}, ${chipDy})`, opacity: 0 });
    const chipBg = svgEl("rect", { x: -28, y: -10, width: 56, height: 20, rx: 10, class: "chip-bg" });
    const chipText = svgEl("text", { x: 0, y: 4, "text-anchor": "middle", class: "chip-text" });
    chipGroup.appendChild(chipBg);
    chipGroup.appendChild(chipText);

    group.appendChild(ring);
    group.appendChild(avatar);
    group.appendChild(initial);
    group.appendChild(labelGroup);
    group.appendChild(actionText);
    group.appendChild(cardsGroup);
    group.appendChild(dealerBtn);
    group.appendChild(chipGroup);
    svg.appendChild(group);

    seatRefs[p.name] = {
      group,
      avatar,
      stackText,
      actionText,
      cardsGroup,
      cardSlots,
      dealerBtn,
      chipGroup,
      chipText,
      ring,
    };
  });

  // Event description ribbon at top
  const eventRibbon = svgEl("g", { class: "event-ribbon", transform: `translate(${VIEW_W / 2}, 24)`, opacity: 0 });
  const eventBg = svgEl("rect", { x: -180, y: -14, width: 360, height: 28, rx: 14, class: "event-ribbon-bg" });
  const eventText = svgEl("text", { x: 0, y: 4, "text-anchor": "middle", class: "event-ribbon-text" });
  eventRibbon.appendChild(eventBg);
  eventRibbon.appendChild(eventText);
  svg.appendChild(eventRibbon);

  // Street label (top-right)
  const streetLabel = svgEl("text", { x: VIEW_W - 14, y: 24, "text-anchor": "end", class: "street-label" });
  svg.appendChild(streetLabel);

  mountEl.replaceChildren();
  mountEl.appendChild(svg);

  return {
    svg,
    boardSlots,
    potText,
    seatRefs,
    eventRibbon,
    eventText,
    streetLabel,
    orderedNames: ordered.map((p) => p.name),
  };
}

/**
 * Apply a snapshot to the SVG, only updating what changed.
 *
 * @param {Object} refs    Output of buildTable.
 * @param {Object} snap    Snapshot from state-engine.
 * @param {{instant?:boolean}} [opts]  If true, suppress CSS transitions for the next paint.
 */
export function renderSnapshot(refs, snap, opts = {}) {
  const { boardSlots, potText, seatRefs, eventRibbon, eventText, streetLabel, svg } = refs;
  if (opts.instant) {
    svg.classList.add("instant");
    requestAnimationFrame(() => svg.classList.remove("instant"));
  }

  // Board
  for (let i = 0; i < 5; i++) {
    const card = snap.board[i];
    const slot = boardSlots[i];
    if (card) {
      slot.rank.textContent = cardRankText(card);
      slot.suit.textContent = cardSuitGlyph(card);
      slot.suit.setAttribute("class", "card-suit " + suitClass(card));
      slot.rank.setAttribute("class", "card-rank " + suitClass(card));
      slot.slot.setAttribute("opacity", "1");
    } else {
      slot.slot.setAttribute("opacity", "0");
    }
  }

  // Pot
  potText.textContent = `Pot $${(snap.pot || 0).toFixed(2)}`;

  // Players
  for (const [name, ref] of Object.entries(seatRefs)) {
    const p = snap.players[name];
    if (!p) continue;

    // Folded → dim
    if (p.folded) ref.group.classList.add("folded");
    else ref.group.classList.remove("folded");

    // All-in highlight
    if (p.allIn) ref.group.classList.add("allin");
    else ref.group.classList.remove("allin");

    // Stack text
    ref.stackText.textContent = `$${(p.stack || 0).toFixed(2)}`;

    // Action text — last action of this street
    ref.actionText.textContent = p.lastAction || "";

    // Hole cards visibility + content
    if (p.cards && p.cards.length > 0) {
      ref.cardsGroup.setAttribute("opacity", "1");
      const showFace = p.isHero || p.revealed;
      p.cards.forEach((card, ci) => {
        const slot = ref.cardSlots[ci];
        if (!slot) return;
        if (showFace) {
          slot.rect.setAttribute("class", "card-bg card-face " + suitClass(card));
          slot.rank.textContent = cardRankText(card);
          slot.suit.textContent = cardSuitGlyph(card);
          slot.rank.setAttribute("class", "card-rank-small " + suitClass(card));
          slot.suit.setAttribute("class", "card-suit-small " + suitClass(card));
        } else {
          slot.rect.setAttribute("class", "card-bg card-back");
          slot.rank.textContent = "";
          slot.suit.textContent = "";
        }
      });
    } else {
      ref.cardsGroup.setAttribute("opacity", "0");
    }

    // Bet chip — visible iff the player has a current-street commitment
    if (p.committedStreet > 0) {
      ref.chipGroup.setAttribute("opacity", "1");
      ref.chipText.textContent = `$${p.committedStreet.toFixed(2)}`;
    } else {
      ref.chipGroup.setAttribute("opacity", "0");
    }
  }

  // Event ribbon
  if (snap.eventDescription) {
    eventText.textContent = snap.eventDescription;
    eventRibbon.setAttribute("opacity", "1");
  } else {
    eventRibbon.setAttribute("opacity", "0");
  }

  // Street label
  streetLabel.textContent = snap.street ? snap.street.toUpperCase() : "";
}
