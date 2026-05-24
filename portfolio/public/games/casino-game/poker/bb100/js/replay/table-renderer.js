// table-renderer.js — Build + diff-render a poker table SVG from snapshot state.
//
// The renderer builds an SVG once (`buildTable`) with stable element IDs, then
// each `renderSnapshot(snapshot)` call diffs and updates only what changed:
// classes for folded/all-in, transforms (none in v1), text content for stacks
// and pot, board card content. CSS transitions on classes provide the animation.

const VIEW_W = 720;
const VIEW_H = 460;
// Hero (bottom seat) sits at cy + ry ≈ y=414 and its name/stack label is
// rendered +50 below that with a 32px-tall background — the bottom edge lands
// near y=480. We extend the SVG viewBox vertically so this label stays
// inside the visible area; seat layout math still uses VIEW_H unchanged.
const VIEWBOX_PAD_BOTTOM = 30;

// Build seat positions clockwise from Hero. ordered[i] is i+1 clockwise
// steps away from Hero (who sits at the bottom). With this convention the
// action sequence on screen — BTN → SB → BB → UTG → ... → BTN — also
// follows a literal clockwise rotation around the table.
//
// Hero index is N-1 and lands at clock-angle 180° (bottom). ordered[i]
// lands at 180° + (i+1)*(360°/N), which puts ordered[0] one step
// clockwise from Hero (lower-LEFT for N>=4), and ordered[N-2] one step
// counter-clockwise from Hero (lower-RIGHT — the SB seat when Hero is BB).
//
// Chip position: centerline seats (top/bottom) get the chip stacked
// above/below the cards, vertically inline with the avatar but clear of
// the card bounding box. Side seats use a fraction of the seat→pot line,
// which is mostly horizontal so the chip lands beside the cards instead
// of on top of them. Constants below match the card/chip BG sizes in
// buildTable so the geometry stays sound if those rects ever resize.
const POT_CENTER_Y = VIEW_H / 2 + 60;
const CARD_HALF_HEIGHT = 20;
const CHIP_HALF_HEIGHT = 10;
const CARD_CLEAR_PX = 5;

function computeSeatLayout(n) {
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  // Radii: shrink the ellipse a bit for smaller player counts so seats
  // don't look stranded at the edges of a too-wide table.
  const rx = n <= 3 ? VIEW_W * 0.30 : VIEW_W * 0.40;
  const ry = n <= 3 ? VIEW_H * 0.34 : VIEW_H * 0.40;
  const layout = [];
  for (let i = 0; i < n; i++) {
    const angleDeg = 180 + ((i + 1) * 360 / n);
    const angleRad = angleDeg * Math.PI / 180;
    const x = cx + rx * Math.sin(angleRad);
    const y = cy - ry * Math.cos(angleRad);

    // Mirrors cardOffsetY in buildTable: cards above avatar for lower
    // seats, below avatar for upper seats.
    const cardOffsetY = y > cy ? -56 : 32;
    const cardsY = y + cardOffsetY;

    let betX, betY;
    if (Math.abs(x - cx) < 30) {
      // Centerline seat (e.g. Hero at bottom, or BTN at top). Stack the
      // chip past the card box toward the pot, clamping so it never
      // crashes into the pot label either.
      const minOffset = CARD_HALF_HEIGHT + CARD_CLEAR_PX + CHIP_HALF_HEIGHT;
      const dyToPot = POT_CENTER_Y - cardsY;
      const dir = Math.sign(dyToPot) || -1;
      const maxOffset = Math.max(minOffset, Math.abs(dyToPot) - 18);
      const offset = Math.min(minOffset + 5, maxOffset);
      betX = x;
      betY = cardsY + dir * offset;
    } else {
      // Side seat: place chip horizontally next to the cards on the inside
      // (pot-facing) edge, vertically aligned with the cards. Earlier this
      // used a 35% seat→pot interpolation that visually fused the chip with
      // the hole cards in short-handed layouts (e.g. 3-max upper-left seat).
      // Sitting beside the cards keeps the chip legible and mirrors how live
      // tables stack a player's bet next to their cards.
      const sign = x < cx ? 1 : -1;
      betX = x + sign * 58;
      betY = cardsY;
    }
    layout.push({ x, y, betX, betY });
  }
  return layout;
}

const SEAT_LAYOUT = {
  2: computeSeatLayout(2),
  3: computeSeatLayout(3),
  4: computeSeatLayout(4),
  5: computeSeatLayout(5),
  6: computeSeatLayout(6),
  7: computeSeatLayout(7),
  8: computeSeatLayout(8),
  9: computeSeatLayout(9),
};

// Clockwise position names indexed off the button, matching standard
// 6-max / full-ring nomenclature. positionLabels(N)[k] is the position
// k clockwise steps from BTN (so [0]=BTN, [1]=SB, [2]=BB, ...).
const POSITION_NAMES_BY_COUNT = {
  2: ['BTN', 'BB'],                                              // heads-up: BTN is SB
  3: ['BTN', 'SB', 'BB'],
  4: ['BTN', 'SB', 'BB', 'UTG'],
  5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
  6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
  7: ['BTN', 'SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO'],
  8: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'LJ', 'HJ', 'CO'],
  9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'],
};

// Walk the (already clockwise-sorted) ordered list starting from the BTN
// and tag each player with their position label. Returns
// { [playerName]: positionString }.
function computePositionLabels(ordered) {
  const n = ordered.length;
  const names = POSITION_NAMES_BY_COUNT[n];
  if (!names) return {};
  const btnIdx = ordered.findIndex((p) => p.isButton);
  if (btnIdx === -1) return {};
  const result = {};
  for (let i = 0; i < n; i++) {
    const player = ordered[(btnIdx + i) % n];
    result[player.name] = names[i];
  }
  return result;
}

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
  // Fallback for unusual seat counts (>9 or <2)
  return computeSeatLayout(n);
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
  const positionLabels = computePositionLabels(ordered);

  const svg = svgEl("svg", {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H + VIEWBOX_PAD_BOTTOM}`,
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
    const group = svgEl("g", { class: "seat" + (p.isHero ? " is-hero" : ""), "data-name": p.name, transform: `translate(${pos.x}, ${pos.y})` });

    // Avatar bg + ring
    const ring = svgEl("circle", { r: 28, class: "seat-ring" });
    const avatar = svgEl("circle", { r: 22, class: "seat-avatar" + (p.isHero ? " seat-hero" : "") });
    // Show position (BTN, SB, BB, UTG, HJ, CO, …) inside the avatar — it's
    // the single most useful identifier in a hand replay. The player's
    // hash/name still appears in the label below; Hero is identified by
    // the green ring on the avatar.
    const positionLabel = positionLabels[p.name] || (p.name === "Hero" ? "H" : "?");
    const initial = svgEl("text", { x: 0, y: 5, "text-anchor": "middle", class: "seat-initial seat-position" });
    initial.textContent = positionLabel;

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

    // Hole cards (two slots, slightly fanned). Cards sit above the avatar
    // for lower-half seats and below the avatar for upper-half seats.
    // We control the base position via CSS custom properties so the .folded
    // CSS rule can compose its own translate-to-table-center on top.
    const cardOffsetY = pos.y > VIEW_H / 2 ? -56 : 32;
    const cardsGroup = svgEl("g", { class: "hole-cards", opacity: 0 });
    // Fold animation target: translate the cards from their resting place
    // toward the table center so a fold visually flows into the muck.
    const foldDx = (VIEW_W / 2 - pos.x) * 0.65;
    const foldDy = (VIEW_H / 2 - (pos.y + cardOffsetY)) * 0.65;
    cardsGroup.style.setProperty("--card-base-y", `${cardOffsetY}px`);
    cardsGroup.style.setProperty("--fold-dx", `${foldDx}px`);
    cardsGroup.style.setProperty("--fold-dy", `${foldDy}px`);
    cardsGroup.style.transform = `translate(0, ${cardOffsetY}px)`;
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

    // Dealer button marker (only for the player on the button). Choose
    // a side that doesn't crash into the seat label below the avatar.
    let dealerOffsetX = pos.x > VIEW_W / 2 + 10 ? -32 : (pos.x < VIEW_W / 2 - 10 ? 32 : -36);
    const dealerOffsetY = pos.y > VIEW_H / 2 ? -28 : 26;
    const dealerBtn = svgEl("g", { class: "dealer-btn", transform: `translate(${dealerOffsetX}, ${dealerOffsetY})`, opacity: p.isButton ? 1 : 0 });
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

// Format a dollar amount as either "$X.XX" or "X.X bb" depending on unit.
function fmtAmount(amount, unit, bbDollars) {
  if (unit === "bb" && bbDollars > 0) {
    const bb = amount / bbDollars;
    return `${bb < 0 ? "-" : ""}${Math.abs(bb).toFixed(1)}bb`;
  }
  return `${amount < 0 ? "-" : ""}$${Math.abs(amount).toFixed(2)}`;
}

/**
 * Apply a snapshot to the SVG, only updating what changed.
 *
 * @param {Object} refs    Output of buildTable.
 * @param {Object} snap    Snapshot from state-engine.
 * @param {{instant?:boolean, unit?:'dollars'|'bb', bbDollars?:number}} [opts]
 *   instant: suppress CSS transitions for the next paint.
 *   unit + bbDollars: control whether stacks/pot/chips are shown in $ or BB.
 */
export function renderSnapshot(refs, snap, opts = {}) {
  const { boardSlots, potText, seatRefs, eventRibbon, eventText, streetLabel, svg } = refs;
  const unit = opts.unit || "dollars";
  const bbDollars = opts.bbDollars || 0;
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

  // Pot — show only chips already swept to the center. Chips still sitting
  // in front of players on the CURRENT street (tracked as p.committedStreet)
  // belong to the player visually until the street ends; the state engine's
  // running `snap.pot` adds them eagerly for accounting correctness, so we
  // subtract them back out here at render time. On a street transition the
  // engine resets committedStreet to 0, so the pot label naturally absorbs
  // the previous street's commitments at exactly the right moment.
  const committedInFront = Object.values(snap.players || {})
    .reduce((sum, p) => sum + (p.committedStreet || 0), 0);
  const displayedPot = Math.max(0, (snap.pot || 0) - committedInFront);
  potText.textContent = `Pot ${fmtAmount(displayedPot, unit, bbDollars)}`;

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
    ref.stackText.textContent = fmtAmount(p.stack || 0, unit, bbDollars);

    // Action text was the legacy per-seat verb label ("checks", "raises to $X").
    // It used to live at y=-36 from the avatar — which for lower-side seats
    // (cards above avatar) landed right at the bottom edge of the hole cards,
    // visually reading as "under the cards". Now the bet chip below carries
    // the same info (amount for bets/calls/raises, "Check" for checks), and
    // the event ribbon at top describes the action verbosely. Clear this
    // element so it doesn't compete with the chip for the user's attention.
    ref.actionText.textContent = "";

    // Hole cards: visible (face-down) for any dealt player. Hero always
    // shows face; villains show face only after their `shows` event.
    // Folded players keep the cards mounted so the CSS fold animation
    // (.folded .hole-cards) can play; opacity 0 is reached via the rule.
    if (p.dealt || (p.cards && p.cards.length > 0)) {
      ref.cardsGroup.setAttribute("opacity", "1");
      const realCards = (p.cards && p.cards.length > 0) ? p.cards : null;
      const showFace = realCards && (p.isHero || p.revealed);
      for (let ci = 0; ci < 2; ci++) {
        const slot = ref.cardSlots[ci];
        if (!slot) continue;
        const card = realCards ? realCards[ci] : null;
        if (showFace && card) {
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
      }
    } else {
      ref.cardsGroup.setAttribute("opacity", "0");
    }

    // Bet chip — visible iff the player has a current-street commitment, OR
    // the player's last action this street was a check. Checks share the
    // same yellow chip style as bets/calls/raises so they read as part of
    // the same row of indicators around the table; the .check-chip modifier
    // only adjusts the text size since "Check" is wider than "$5.00". The
    // check chip persists until the player acts again (lastAction
    // overwritten) or the street advances (resetStreetCommitments clears
    // lastAction in state-engine).
    if (p.committedStreet > 0) {
      ref.chipGroup.setAttribute("opacity", "1");
      ref.chipGroup.classList.remove("check-chip");
      ref.chipText.textContent = fmtAmount(p.committedStreet, unit, bbDollars);
    } else if (p.lastAction === "checks") {
      ref.chipGroup.setAttribute("opacity", "1");
      ref.chipGroup.classList.add("check-chip");
      ref.chipText.textContent = "Check";
    } else {
      ref.chipGroup.setAttribute("opacity", "0");
      ref.chipGroup.classList.remove("check-chip");
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
