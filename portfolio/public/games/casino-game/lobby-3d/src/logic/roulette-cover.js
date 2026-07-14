(() => {
  const C = (globalThis.CASINO ??= {});

  // Pure EU-roulette coverage + payout factors, used ONLY for 3D settle
  // choreography (which chip stacks the dealer sweeps vs pays). The 2D game
  // remains authoritative for money. Bet shape mirrors roulette-map.js.
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const parseNums = (key) => String(key).split('-').map((t) => (t === '00' ? 0 : Number(t)));

  const FACTORS = {
    straight: 35, split: 17, street: 11, trio: 11, corner: 8,
    firstFour: 8, topLine: 8, line: 5, column: 2, dozen: 2,
    low: 1, even: 1, red: 1, black: 1, odd: 1, high: 1,
  };
  const factorOf = (type) => FACTORS[type];

  function covers(type, key, n) {
    switch (type) {
      case 'straight': return parseNums(key)[0] === n;
      case 'split':
      case 'trio':
      case 'corner': return parseNums(key).includes(n);
      case 'street': {
        const nums = parseNums(key);
        const f = nums[0];
        return nums.length > 1 ? nums.includes(n) : n >= f && n <= f + 2;
      }
      case 'line': {
        const f = parseNums(key)[0];
        return n >= f && n <= f + 5;
      }
      case 'column': return n !== 0 && ((n - 1) % 3) === Number(key) - 1;
      case 'dozen': return n !== 0 && Math.ceil(n / 12) === Number(key);
      case 'firstFour':
      case 'topLine': return n <= 3;
      case 'low': return n >= 1 && n <= 18;
      case 'high': return n >= 19;
      case 'even': return n !== 0 && n % 2 === 0;
      case 'odd': return n % 2 === 1;
      case 'red': return RED.has(n);
      case 'black': return n !== 0 && !RED.has(n);
      default: return false;
    }
  }

  const NESTED = ['straight', 'split', 'trio', 'corner', 'street', 'line', 'column', 'dozen'];
  const SCALAR = ['firstFour', 'topLine', 'low', 'even', 'red', 'black', 'odd', 'high'];

  function splitByOutcome(bets, result) {
    const winning = {}, losing = {}, wins = [];
    const put = (bucket, type, key, amount) => {
      if (key === null) bucket[type] = amount;
      else (bucket[type] ??= {})[key] = amount;
    };
    for (const type of NESTED) {
      for (const [key, amount] of Object.entries(bets?.[type] || {})) {
        if (!(amount > 0)) continue;
        if (covers(type, key, result)) {
          put(winning, type, key, amount);
          wins.push({ type, key, amount, factor: FACTORS[type] });
        } else put(losing, type, key, amount);
      }
    }
    for (const type of SCALAR) {
      const amount = bets?.[type];
      if (!(amount > 0)) continue;
      if (covers(type, null, result)) {
        put(winning, type, null, amount);
        wins.push({ type, key: null, amount, factor: FACTORS[type] });
      } else put(losing, type, null, amount);
    }
    return { winning, losing, wins };
  }

  C.rouletteCover = { covers, factorOf, splitByOutcome };
})();
