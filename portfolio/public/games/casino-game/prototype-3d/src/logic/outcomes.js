(() => {
  const C = (globalThis.CASINO ??= {});
  const rand = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

  // ---------- cards ----------
  const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  for (let r = 2; r <= 10; r++) RANK_LABEL[r] = String(r);
  const SUIT_CHAR = ['♠', '♥', '♦', '♣'];

  function makeDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
    return d;
  }
  function shuffle(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  const makeShoe = (decks = 6) => shuffle(Array.from({ length: decks }, makeDeck).flat());

  // ---------- roulette ----------
  const EU_WHEEL = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const rouletteResult = () => EU_WHEEL[rand(37)];

  function rouletteReturn(bets, result) {
    let ret = 0;
    for (const [spot, amt] of Object.entries(bets)) {
      if (!amt) continue;
      if (spot[0] === 'n') { if (Number(spot.slice(1)) === result) ret += amt * 36; continue; }
      if (result === 0) continue;
      const col = ((result - 1) % 3) + 1;
      const doz = Math.ceil(result / 12);
      if ((spot === 'red' && RED.has(result)) || (spot === 'black' && !RED.has(result)) ||
          (spot === 'odd' && result % 2 === 1) || (spot === 'even' && result % 2 === 0) ||
          (spot === 'low' && result <= 18) || (spot === 'high' && result >= 19)) { ret += amt * 2; continue; }
      if (spot === 'd' + doz || spot === 'c' + col) ret += amt * 3;
    }
    return ret;
  }

  // ---------- blackjack ----------
  function handValue(cards) {
    let total = 0, aces = 0;
    for (const c of cards) {
      if (c.r === 14) { aces++; total += 11; } else total += Math.min(c.r, 10);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return { total, soft: aces > 0 };
  }
  function dealerPlay(hand, shoe) {
    while (handValue(hand).total < 17) hand.push(shoe.pop());
    return hand;
  }
  function settleBlackjack({ main }, player, dealer) {
    const p = handValue(player), d = handValue(dealer);
    const pBJ = player.length === 2 && p.total === 21;
    const dBJ = dealer.length === 2 && d.total === 21;
    if (pBJ && dBJ) return main;
    if (pBJ) return main + Math.floor(main * 1.5);
    if (dBJ) return 0;
    if (p.total > 21) return 0;
    if (d.total > 21) return main * 2;
    if (p.total > d.total) return main * 2;
    if (p.total === d.total) return main;
    return 0;
  }
  const perfectPairReturn = (stake, [a, b]) => (a.r === b.r ? stake * 12 : 0);
  function twentyOnePlusThreeReturn(stake, p1, p2, dUp) {
    const cs = [p1, p2, dUp];
    const trips = cs.every((c) => c.r === cs[0].r);
    const flushy = cs.every((c) => c.s === cs[0].s);
    const rs = cs.map((c) => c.r).sort((x, y) => x - y);
    const straight = (rs[1] === rs[0] + 1 && rs[2] === rs[1] + 1) ||
                     (rs[0] === 2 && rs[1] === 3 && rs[2] === 14);
    return trips || flushy || straight ? stake * 10 : 0;
  }

  // ---------- baccarat ----------
  const bacValue = (c) => (c.r >= 10 && c.r <= 13 ? 0 : c.r === 14 ? 1 : c.r);
  const bacTotal = (cards) => cards.reduce((t, c) => t + bacValue(c), 0) % 10;

  function playBaccarat(shoe) {
    const P = [shoe.pop(), null], B = [shoe.pop(), null];   // P1, B1
    P[1] = shoe.pop(); B[1] = shoe.pop();                    // P2, B2
    let pT = bacTotal(P), bT = bacTotal(B);
    if (pT < 8 && bT < 8) {
      let p3 = null;
      if (pT <= 5) { p3 = shoe.pop(); P.push(p3); }
      const v3 = p3 ? bacValue(p3) : null;
      const bankerDraws = p3 === null
        ? bT <= 5
        : bT <= 2 ||
          (bT === 3 && v3 !== 8) ||
          (bT === 4 && v3 >= 2 && v3 <= 7) ||
          (bT === 5 && v3 >= 4 && v3 <= 7) ||
          (bT === 6 && (v3 === 6 || v3 === 7));
      if (bankerDraws) B.push(shoe.pop());
      pT = bacTotal(P); bT = bacTotal(B);
    }
    const winner = pT > bT ? 'player' : bT > pT ? 'banker' : 'tie';
    return { P, B, pT, bT, winner };
  }
  function baccaratReturn(bets, r) {
    let ret = 0;
    if (r.winner === 'player') ret += (bets.player || 0) * 2;
    if (r.winner === 'banker') ret += Math.floor((bets.banker || 0) * 1.95);
    if (r.winner === 'tie') ret += (bets.tie || 0) * 9 + (bets.player || 0) + (bets.banker || 0);
    if (bets.pPair && r.P[0].r === r.P[1].r) ret += bets.pPair * 12;
    if (bets.bPair && r.B[0].r === r.B[1].r) ret += bets.bPair * 12;
    return ret;
  }

  // ---------- poker / UTH ----------
  function eval5(cs) {
    const rs = cs.map((c) => c.r).sort((a, b) => b - a);
    const flushy = cs.every((c) => c.s === cs[0].s);
    const counts = {};
    for (const r of rs) counts[r] = (counts[r] || 0) + 1;
    const groups = Object.entries(counts)
      .map(([r, n]) => ({ r: +r, n }))
      .sort((a, b) => b.n - a.n || b.r - a.r);
    const uniq = groups.map((g) => g.r);
    let straightHigh = 0;
    if (uniq.length === 5) {
      const sorted = [...uniq].sort((a, b) => b - a);
      if (sorted[0] - sorted[4] === 4) straightHigh = sorted[0];
      else if (sorted[0] === 14 && sorted[1] === 5 && sorted[1] - sorted[4] === 3) straightHigh = 5;
    }
    const kick = groups.flatMap((g) => Array(g.n).fill(g.r));
    if (flushy && straightHigh) return { cat: straightHigh === 14 ? 9 : 8, kick: [straightHigh] };
    if (groups[0].n === 4) return { cat: 7, kick };
    if (groups[0].n === 3 && groups[1] && groups[1].n === 2) return { cat: 6, kick };
    if (flushy) return { cat: 5, kick: rs };
    if (straightHigh) return { cat: 4, kick: [straightHigh] };
    if (groups[0].n === 3) return { cat: 3, kick };
    if (groups[0].n === 2 && groups[1] && groups[1].n === 2) return { cat: 2, kick };
    if (groups[0].n === 2) return { cat: 1, kick };
    return { cat: 0, kick: rs };
  }
  function cmpEval(a, b) {
    if (a.cat !== b.cat) return a.cat - b.cat;
    const len = Math.max(a.kick.length, b.kick.length);
    for (let i = 0; i < len; i++) {
      const d = (a.kick[i] || 0) - (b.kick[i] || 0);
      if (d) return d;
    }
    return 0;
  }
  function evaluate7(cards) {
    let best = null;
    for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) {
      const five = cards.filter((_, k) => k !== i && k !== j);
      const e = eval5(five);
      if (!best || cmpEval(e, best) > 0) best = e;
    }
    return best;
  }
  const HAND_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
    'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
  const BLIND_PAY = { 4: 1, 5: 1.5, 6: 3, 7: 10, 8: 50, 9: 500 };
  const TRIPS_PAY = { 3: 3, 4: 4, 5: 7, 6: 8, 7: 30, 8: 40, 9: 50 };

  function settleUTH(bets, board, playerHole, dealerHole) {
    const p = evaluate7([...playerHole, ...board]);
    const d = evaluate7([...dealerHole, ...board]);
    const cmp = cmpEval(p, d);
    let ret = 0;
    if (cmp > 0) {
      ret += bets.ante * 2;                                        // demo: dealer always qualifies
      ret += bets.blind + Math.floor(bets.blind * (BLIND_PAY[p.cat] || 0));
    } else if (cmp === 0) {
      ret += bets.ante + bets.blind;
    }
    if (bets.trips) {
      const m = TRIPS_PAY[p.cat] || 0;
      ret += m ? bets.trips * (m + 1) : 0;
    }
    // jackpot: demo prototype — flat 100 always loses (spec: dummy outcomes)
    return { ret, p, d, cmp };
  }

  C.outcomes = { RANK_LABEL, SUIT_CHAR, makeDeck, shuffle, makeShoe,
    EU_WHEEL, RED, rouletteResult, rouletteReturn,
    handValue, dealerPlay, settleBlackjack, perfectPairReturn, twentyOnePlusThreeReturn,
    bacValue, bacTotal, playBaccarat, baccaratReturn,
    eval5, cmpEval, evaluate7, HAND_NAMES, settleUTH };
})();
