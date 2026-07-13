(() => {
  const C = (globalThis.CASINO ??= {});

  // Oversized cards (~1.55x a real 9x12.6cm card) — the "first-person casino"
  // readability trick. Every card mesh, painted box, and deal target derives
  // from these two numbers so they cannot drift apart.
  const CARD_W = 0.14, CARD_H = 0.196;

  // Greedy payout breakdown for 3D chip pushes. Amounts that aren't
  // representable (e.g. 750 blackjack natural, 475 banker win) round the
  // remainder UP to one visual 100 chip — display only, wallet math is
  // untouched. Capped at 20 chips so a jackpot can't spawn a mesh flood.
  const DENOMS = [5000, 1000, 500, 100];
  function chipBreakdown(amount) {
    const out = [];
    let left = amount;
    for (const d of DENOMS) {
      while (left >= d && out.length < 20) { out.push(d); left -= d; }
    }
    if (left > 0 && out.length < 20) out.push(100);
    return out;
  }

  // ---------- blackjack (half-disc table, radius 1.6, felt +Z side, FELT_Y 0.83)
  // The felt is a HALF-disc: its flat (dealer) edge is at z = 0 and felt only
  // exists for z in [0, 1.6]. The original room constants floated the dealer
  // cards and shoe at negative z — off the table. Everything here (cards,
  // shoe, chip endpoints) sits fully on the felt, i.e. footprint z >= 0.
  const blackjack = {
    feltY: 0.83, cardY: 0.86,
    shoePos: [1.05, 0.83, 0.18],
    chipSource: [1.0, 0.85, 1.05],          // near table edge at the player's right
    dealerChipPos: [0, 0.85, 0.10],
    playerSlots: [[0.27, 0.86, 0.50], [0.44, 0.86, 0.50]],
    dealerSlots: [[-0.24, 0.86, 0.16], [-0.07, 0.86, 0.16]],
    fanDx: 0.17,                             // 3rd+ card continues right of slot[1]
    spots: {
      main:               { pos: [0.36, 0.845, 0.78], r: 0.11,  label: 'MAIN' },
      perfectPair:        { pos: [0.10, 0.845, 0.88], r: 0.075, label: 'PP' },
      twentyOnePlusThree: { pos: [0.62, 0.845, 0.88], r: 0.075, label: '21+3' },
    },
    poseDeal: { pos: [0.12, 1.35, 1.25], look: [0.08, 0.84, 0.25] },
  };

  // ---------- baccarat (ellipse felt rx 1.692 / rz 0.799, FELT_Y 0.82)
  const baccarat = {
    feltY: 0.82, cardY: 0.85,
    shoePos: [0.85, 0.82, -0.55],
    chipSource: [1.05, 0.84, 0.35],
    dealerChipPos: [0, 0.84, -0.6],
    // two upright slots side by side + the third card laid SIDEWAYS next to
    // them (rotation.z = ±PI/2 on the flat card), as dealt in real baccarat.
    playerSlots: [[-0.78, 0.85, 0.08], [-0.61, 0.85, 0.08], [-0.37, 0.85, 0.08]],
    bankerSlots: [[0.61, 0.85, 0.08], [0.78, 0.85, 0.08], [0.37, 0.85, 0.08]],
    spots: {
      player: { pos: [-0.70, 0.84, 0.42], r: 0.13,  label: 'PLAYER' },
      banker: { pos: [0.70, 0.84, 0.42],  r: 0.13,  label: 'BANKER' },
      tie:    { pos: [0, 0.84, 0.48],     r: 0.10,  label: 'TIE' },
      pPair:  { pos: [-0.32, 0.84, 0.54], r: 0.07,  label: 'P PAIR' },
      bPair:  { pos: [0.32, 0.84, 0.54],  r: 0.07,  label: 'B PAIR' },
    },
    poseDeal: { pos: [0, 1.32, 0.82], look: [0, 0.85, -0.15] },
  };

  // ---------- uth (ellipse felt rx 1.504 / rz 0.846, FELT_Y 0.82)
  const uth = {
    feltY: 0.82, cardY: 0.85,
    deckPos: [0.75, 0.82, -0.65],
    chipSource: [0.95, 0.84, 0.42],
    dealerChipPos: [0, 0.84, -0.62],
    playerSlots: [[-0.11, 0.85, 0.55], [0.11, 0.85, 0.55]],
    dealerSlots: [[-0.11, 0.85, -0.55], [0.11, 0.85, -0.55]],
    boardSlots: [[-0.44, 0.85, 0], [-0.22, 0.85, 0], [0, 0.85, 0], [0.22, 0.85, 0], [0.44, 0.85, 0]],
    spots: {
      ante:    { pos: [-0.34, 0.84, 0.30], r: 0.085, label: 'ANTE' },
      blind:   { pos: [-0.12, 0.84, 0.30], r: 0.085, label: 'BLIND' },
      jackpot: { pos: [0.10, 0.84, 0.30],  r: 0.06,  label: 'JP' },
      trips:   { pos: [0.32, 0.84, 0.30],  r: 0.075, label: 'TRIPS' },
    },
    poseDeal: { pos: [0, 1.3, 0.95], look: [0, 0.85, -0.2] },
  };

  // ---------- roulette: map a 2D overlay spot id to a world (x, z) on the
  // painted felt. Mirrors makeFeltLayoutTexture's geometry EXACTLY
  // (src/rooms/roulette.js): 1024x512 canvas on a 3.28 x 1.48 box top.
  // Canvas u runs along world +x. The v->z SIGN is verified in-browser in
  // Task 9 — if the rows land mirrored, flip Z_SIGN there (one constant).
  const R_TEX = { W: 1024, H: 512, gx: 40, gy: 30, gw: 940, gh: 380, zeroW: 70, oy: 434, oh: 56 };
  const R_FELT = { w: 3.28, d: 1.48 };
  const Z_SIGN = 1;
  const ROWS = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];
  function rouletteSpotPx(id) {
    const { gx, gy, gw, gh, zeroW, oy, oh } = R_TEX;
    const cellW = (gw - zeroW) / 12, cellH = gh / 3, ow = gw / 6;
    if (id === 'n0') return [gx + zeroW / 2, gy + gh / 2];
    if (/^n\d+$/.test(id)) {
      const n = Number(id.slice(1));
      const r = ROWS.findIndex((row) => row.includes(n));
      const c = ROWS[r].indexOf(n);
      return [gx + zeroW + (c + 0.5) * cellW, gy + (r + 0.5) * cellH];
    }
    if (/^c[123]$/.test(id)) {
      const r = { c3: 0, c2: 1, c1: 2 }[id];
      return [gx + gw + 30, gy + (r + 0.5) * cellH];
    }
    if (/^d[123]$/.test(id)) {
      const i = Number(id.slice(1)) - 1;
      return [gx + (i + 0.5) * (gw / 3), oy - 40];
    }
    const i = ['low', 'even', 'red', 'black', 'odd', 'high'].indexOf(id);
    return [gx + (i + 0.5) * ow, oy + oh / 2];
  }
  function rouletteSpotPos(id) {
    const [px, py] = rouletteSpotPx(id);
    return [(px / R_TEX.W - 0.5) * R_FELT.w, Z_SIGN * (py / R_TEX.H - 0.5) * R_FELT.d];
  }

  C.layouts = { CARD_W, CARD_H, chipBreakdown, blackjack, baccarat, uth, rouletteSpotPos };
})();
