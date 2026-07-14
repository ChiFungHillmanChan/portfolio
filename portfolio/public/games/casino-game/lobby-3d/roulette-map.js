// roulette-map.js — pure mapping from the 2D roulette game's bet state
// (getAllBets() shape, see roulette/js/state/bet-state.js) to chip positions
// on the 3D table's printed felt. Geometry comes in as an argument: at
// runtime roulette-live.js passes CASINO.floor.ROULETTE_FELT (the exact
// constants the felt texture was printed with), node tests pass a fixture.
//
// Returned positions are felt-local metres (table-group space): x along the
// table's long axis (wheel at -x), z across it (dealer at -z), matching the
// felt canvas mapping canvas(0,0) → local(-FW/2, -FD/2).

// European wheel order — shared by boardStats cold-number ranking and any
// caller that needs pocket order (matches EU_WHEEL in roulette-table.js).
export const EU_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

// "17-20" → [17, 20]; the US "00" token maps onto the single zero cell
// (the lobby floor prints a European layout).
const parseNums = (key) => String(key).split('-').map((t) => (t === '00' ? 0 : Number(t)));

// Tote-board statistics from a chronological spin list (latest LAST).
// Mirrors the 2D game's stats-state.js semantics exactly:
//   hot  = numbers that have hit, by hit count (getHotNumbers)
//   cold = spins since last hit, never-hit numbers count as the full
//          session length (spinsSinceHit init), empty until the first spin
//   high/low/odd/even = share of ALL spins (zero lands in neither bucket)
export function boardStats(spins, wheel) {
  const total = spins.length;
  const freq = new Map(), lastSeen = new Map();
  spins.forEach((n, i) => { freq.set(n, (freq.get(n) || 0) + 1); lastSeen.set(n, i); });
  const spinsSince = (n) => (lastSeen.has(n) ? total - 1 - lastSeen.get(n) : total);
  const pct = (fn) => (total === 0 ? null : Math.round((spins.filter((n) => n > 0 && fn(n)).length / total) * 100));
  return {
    total,
    last: spins.slice(-13).reverse(),
    hot: [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || spinsSince(a[0]) - spinsSince(b[0]))
      .slice(0, 4).map(([n]) => n),
    cold: total === 0 ? [] : wheel.slice().sort((a, b) => spinsSince(b) - spinsSince(a)).slice(0, 4),
    high: pct((n) => n >= 19),
    low: pct((n) => n <= 18 && n >= 1),
    odd: pct((n) => n % 2 === 1),
    even: pct((n) => n % 2 === 0),
  };
}

export function betSpots(bets, G) {
  if (!bets || !G) return [];
  const gx = G.LX + G.ZERO_W, grx = G.RX - G.COL_W;
  const cellW = (grx - gx) / 12;
  const gridBottom = G.GY + 3 * G.ROW_H;
  const DY = gridBottom + G.ROW_GAP;
  const OY = DY + G.DOZEN_H + G.ROW_GAP;

  const spots = [];
  const push = (cx, cy, amount) => {
    if (!(amount > 0)) return;
    spots.push({ x: (cx / G.W) * G.FW - G.FW / 2, z: (cy / G.H) * G.FD - G.FD / 2, amount });
  };
  const numCenter = (n) => {
    if (n === 0) return [G.LX + G.ZERO_W / 2, G.GY + 1.5 * G.ROW_H];
    const col = Math.floor((n - 1) / 3), row = 2 - ((n - 1) % 3);
    return [gx + (col + 0.5) * cellW, G.GY + (row + 0.5) * G.ROW_H];
  };
  const centroid = (nums) => nums
    .map(numCenter)
    .reduce(([ax, ay], [cx, cy]) => [ax + cx / nums.length, ay + cy / nums.length], [0, 0]);
  const each = (obj, fn) => Object.entries(obj || {}).forEach(([k, amt]) => fn(k, amt));

  // inside bets — chips sit where a dealer would place them
  each(bets.straight, (k, amt) => push(...numCenter(k === '00' ? 0 : Number(k)), amt));
  each(bets.split, (k, amt) => push(...centroid(parseNums(k)), amt));
  each(bets.trio, (k, amt) => push(...centroid(parseNums(k)), amt));
  each(bets.corner, (k, amt) => push(...centroid(parseNums(k)), amt));
  each(bets.street, (k, amt) => {
    const col = Math.floor((parseNums(k)[0] - 1) / 3);
    push(gx + (col + 0.5) * cellW, gridBottom, amt);           // on the dozens-side line
  });
  each(bets.line, (k, amt) => {
    const col = Math.floor((parseNums(k)[0] - 1) / 3);
    push(gx + (col + 1) * cellW, gridBottom, amt);             // column boundary on the line
  });
  if (bets.firstFour > 0) push(gx, gridBottom, bets.firstFour); // 0 corner on the line
  if (bets.topLine > 0) push(gx, gridBottom, bets.topLine);

  // outside bets
  each(bets.column, (k, amt) => {
    const row = 3 - Number(k);                                  // column 1 = bottom canvas row
    push(grx + G.COL_W / 2, G.GY + (row + 0.5) * G.ROW_H, amt);
  });
  each(bets.dozen, (k, amt) => {
    push(gx + (Number(k) - 0.5) * ((grx - gx) / 3), DY + G.DOZEN_H / 2, amt);
  });
  const EVEN_ORDER = ['low', 'even', 'red', 'black', 'odd', 'high'];
  EVEN_ORDER.forEach((key, i) => {
    push(gx + (i + 0.5) * ((grx - gx) / 6), OY + G.EVEN_H / 2, bets[key]);
  });

  return spots;
}
