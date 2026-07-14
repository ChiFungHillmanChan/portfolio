(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure baccarat shoe simulation + roadmap derivations. No THREE/DOM —
  // node-testable; consumed by the baccarat floor table's scoreboard.
  // Cards reuse the lobby shape {r: 2..14, s: 0..3} (14 = Ace).

  const bacValue = (c) => (c.r === 14 ? 1 : c.r >= 10 ? 0 : c.r);
  const total = (cards) => cards.reduce((t, c) => (t + bacValue(c)) % 10, 0);

  function buildShoe(rng, decks = 8) {
    const cards = [];
    for (let d = 0; d < decks; d++)
      for (let s = 0; s < 4; s++)
        for (let r = 2; r <= 14; r++) cards.push({ r, s });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  // Banker third-card table: banker two-card total vs the VALUE of the
  // player's third card (null = player stood).
  function bankerDraws(bt, p3) {
    if (bt >= 7) return false;
    if (p3 === null) return bt <= 5;
    if (bt <= 2) return true;
    if (bt === 3) return p3 !== 8;
    if (bt === 4) return p3 >= 2 && p3 <= 7;
    if (bt === 5) return p3 >= 4 && p3 <= 7;
    return p3 === 6 || p3 === 7; // bt === 6
  }

  function playRound(draw) {
    const p = [draw(), draw()], b = [draw(), draw()];
    let natural = false;
    if (total(p) >= 8 || total(b) >= 8) {
      natural = true;
    } else {
      let p3 = null;
      if (total(p) <= 5) { p.push(draw()); p3 = bacValue(p[2]); }
      if (bankerDraws(total(b), p3)) b.push(draw());
    }
    const pt = total(p), bt = total(b);
    return {
      outcome: pt > bt ? 'P' : bt > pt ? 'B' : 'T',
      playerCards: p, bankerCards: b,
      playerTotal: pt, bankerTotal: bt,
      playerPair: p[0].r === p[1].r, bankerPair: b[0].r === b[1].r,
      natural,
    };
  }

  // Full shoe: 8 decks, cut card ~14 from the end (~60-80 rounds).
  function simulateShoe(rng = Math.random) {
    const shoe = buildShoe(rng);
    let i = 0;
    const draw = () => shoe[i++];
    const rounds = [];
    while (shoe.length - i > 14 + 6) rounds.push(playRound(draw));
    return rounds;
  }

  function stats(rounds) {
    const s = { banker: 0, player: 0, tie: 0, bPair: 0, pPair: 0, natural: 0, games: rounds.length };
    for (const r of rounds) {
      if (r.outcome === 'B') s.banker++;
      else if (r.outcome === 'P') s.player++;
      else s.tie++;
      if (r.bankerPair) s.bPair++;
      if (r.playerPair) s.pPair++;
      if (r.natural) s.natural++;
    }
    return s;
  }

  // ---------- big road (LOGICAL streak columns) ----------
  // Ties never occupy a cell: they increment `ties` on the previous cell;
  // ties before any B/P result are held in leadingTies.
  function buildBigRoad(rounds) {
    const cols = [];
    let leadingTies = 0;
    for (const r of rounds) {
      if (r.outcome === 'T') {
        const col = cols[cols.length - 1];
        if (col) col.cells[col.cells.length - 1].ties++;
        else leadingTies++;
        continue;
      }
      const col = cols[cols.length - 1];
      if (col && col.outcome === r.outcome) col.cells.push({ ties: 0 });
      else cols.push({ outcome: r.outcome, cells: [{ ties: 0 }] });
    }
    return { cols, leadingTies };
  }

  // ---------- display placement (6-row grid + dragon tail) ----------
  // seq: [{key, ...payload}] — consecutive equal keys stack in a column.
  // Stacking past the last row, or into an occupied cell, turns right and
  // continues along the current row (the "dragon tail"). New columns start
  // one to the right of the previous column's START (row 0 is never a tail
  // row, so column starts cannot collide).
  function layoutRoad(seq, rows = 6) {
    const out = [], used = new Set(), key = (c, r) => c + ':' + r;
    let colStart = -1, prevKey = null, c = 0, r = 0;
    for (const item of seq) {
      if (item.key !== prevKey) {
        colStart += 1; c = colStart; r = 0;
      } else if (r + 1 < rows && !used.has(key(c, r + 1))) {
        r += 1;
      } else {
        c += 1;
        while (used.has(key(c, r))) c += 1;
      }
      used.add(key(c, r));
      out.push({ col: c, row: r, ...item });
      prevKey = item.key;
    }
    return out;
  }

  const bigRoadCells = (big, rows = 6) => layoutRoad(
    big.cols.flatMap((col) => col.cells.map((cell) => ({ key: col.outcome, outcome: col.outcome, ties: cell.ties }))),
    rows,
  );

  // ---------- bead plate (every round incl. ties; newest columns kept) ----------
  function beadPlate(rounds, cols = 12, rows = 6) {
    const totalCols = Math.ceil(rounds.length / rows);
    const skip = Math.max(0, (totalCols - cols) * rows);
    return rounds.slice(skip).map((r, i) => ({
      col: Math.floor(i / rows), row: i % rows,
      outcome: r.outcome, playerPair: r.playerPair, bankerPair: r.bankerPair,
    }));
  }

  // ---------- derived roads ----------
  // offset 1 = big eye boy (大眼仔), 2 = small road (小路),
  // 3 = cockroach pig (曱甴路). For each big-road cell at LOGICAL (col c,
  // row r) with c > offset or (c === offset, r >= 1):
  //   r === 0: red if depth(c-1) === depth(c-1-offset) else blue
  //   r >= 1:  blue if column c-offset ends exactly at row r-1, else red
  function deriveRoad(big, offset) {
    const depth = (i) => big.cols[i].cells.length;
    const colors = [];
    big.cols.forEach((col, c) => {
      col.cells.forEach((_, r) => {
        if (!(c > offset || (c === offset && r >= 1))) return;
        if (r === 0) colors.push(depth(c - 1) === depth(c - 1 - offset) ? 'r' : 'b');
        else colors.push(depth(c - offset) === r ? 'b' : 'r');
      });
    });
    return colors;
  }

  // 下局預告: the symbol each derived road would print if the next result
  // were B / P — computed by actually appending the hypothetical round.
  function predictNext(big) {
    const out = {};
    for (const oc of ['B', 'P']) {
      const cols = big.cols.map((c) => ({ outcome: c.outcome, cells: c.cells.map((x) => ({ ...x })) }));
      const last = cols[cols.length - 1];
      if (last && last.outcome === oc) last.cells.push({ ties: 0 });
      else cols.push({ outcome: oc, cells: [{ ties: 0 }] });
      out[oc] = [1, 2, 3].map((k) => {
        const after = deriveRoad({ cols }, k);
        const before = deriveRoad(big, k);
        return after.length > before.length ? after[after.length - 1] : null;
      });
    }
    return out;
  }

  C.baccaratRoads = { bacValue, total, bankerDraws, buildShoe, playRound, simulateShoe, stats, buildBigRoad, layoutRoad, bigRoadCells, beadPlate, deriveRoad, predictNext };
})();
