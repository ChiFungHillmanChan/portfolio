(() => {
  const C = (globalThis.CASINO ??= {});
  C.tables = {
    roulette: { minPerSpot: 100, maxPerSpot: 5000, maxTotal: 20000 },
    blackjack: { main: { min: 500, max: 10000 }, side: { min: 100, max: 2500 } },
    baccarat: { main: { min: 500, max: 10000 }, side: { min: 100, max: 1000 } },
    uth: { ante: { min: 100, max: 1000, step: 100 }, trips: { min: 100, max: 5000 }, jackpot: 100 },
    chipDenoms: [100, 500, 1000, 5000],
  };

  const inRange = (a, { min, max }) => a >= min && a <= max;
  const bal = (total) => (C.wallet.canAfford(total) ? { ok: true, total } : { ok: false, reason: 'balance' });

  C.validate = {
    roulette(bets) {
      const entries = Object.entries(bets).filter(([, a]) => a > 0);
      if (!entries.length) return { ok: false, reason: 'no-bets' };
      let total = 0;
      for (const [, a] of entries) {
        if (a < C.tables.roulette.minPerSpot) return { ok: false, reason: 'spot-min' };
        if (a > C.tables.roulette.maxPerSpot) return { ok: false, reason: 'spot-max' };
        total += a;
      }
      if (total > C.tables.roulette.maxTotal) return { ok: false, reason: 'table-max' };
      return bal(total);
    },
    blackjack({ main = 0, perfectPair = 0, twentyOnePlusThree = 0 }) {
      if (!inRange(main, C.tables.blackjack.main)) return { ok: false, reason: 'main-range' };
      for (const s of [perfectPair, twentyOnePlusThree])
        if (s !== 0 && !inRange(s, C.tables.blackjack.side)) return { ok: false, reason: 'side-range' };
      return bal(main + perfectPair + twentyOnePlusThree);
    },
    baccarat({ player = 0, banker = 0, tie = 0, pPair = 0, bPair = 0 }) {
      const mains = [player, banker, tie].filter((a) => a > 0);
      if (!mains.length) return { ok: false, reason: 'no-bets' };
      for (const a of mains) if (!inRange(a, C.tables.baccarat.main)) return { ok: false, reason: 'main-range' };
      for (const s of [pPair, bPair])
        if (s !== 0 && !inRange(s, C.tables.baccarat.side)) return { ok: false, reason: 'side-range' };
      return bal(player + banker + tie + pPair + bPair);
    },
    uth({ ante = 0, trips = 0, jackpot = false }) {
      if (!inRange(ante, C.tables.uth.ante)) return { ok: false, reason: 'ante-range' };
      if (ante % C.tables.uth.ante.step !== 0) return { ok: false, reason: 'ante-step' };
      if (trips !== 0 && !inRange(trips, C.tables.uth.trips)) return { ok: false, reason: 'trips-range' };
      return bal(ante * 2 + trips + (jackpot ? C.tables.uth.jackpot : 0));
    },
  };
})();
