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

  C.baccaratRoads = { bacValue, total, bankerDraws, simulateShoe, stats };
})();
