// floor-model.js — pure registry: GAME_STAKES → the 3D floor's sections and
// physical stake tables (one table per tier). Imported at runtime by
// platform.js and by node tests. Parity with the 2D stake pickers is by
// construction — both read the same table-config, so adding a tier there adds
// a table on the floor.
import { gameStakes, getTable } from '../js/wallet/table-config.js';

export const SECTION_ORDER = ['roulette', 'blackjack', 'baccarat', 'uth'];

const GAME_META = {
  roulette:  { label: 'ROULETTE',         gameName: 'Roulette',               base: '../roulette/index.html' },
  blackjack: { label: 'BLACKJACK',        gameName: 'Blackjack',              base: '../blackjack/game-mode/index.html' },
  baccarat:  { label: 'BACCARAT',         gameName: 'Baccarat',               base: '../baccarat/game-mode/index.html' },
  uth:       { label: "ULTIMATE HOLD'EM", gameName: "Ultimate Texas Hold'em", base: '../ultimate-texas-holdem/index.html' },
};

// Smallest stake the table accepts — drives the sit-down card's
// insufficient-balance hint (mirrors computeGateState's minBet semantics).
export function tableMinBet(table) {
  return Math.min(...Object.values(table.betTypes).map((b) => b.min));
}

export function buildFloorModel() {
  const sections = SECTION_ORDER.map((game) => {
    const meta = GAME_META[game];
    if (game === 'uth') {
      // One physical table until Plan 5 ships the ante tiers; the section
      // reserves the floor space. Buy-in (not ante) is the seat requirement.
      return {
        id: game, label: meta.label, gameName: meta.gameName, reservedSpots: 4,
        tables: [{
          id: 'uth:main', key: null, gameId: 'uth', tierName: 'Table 1',
          limitsText: 'Ante 100 – 1,000 · Buy-in 10,000',
          blurb: 'Online multiplayer vs the dealer.',
          href: meta.base, minBet: 10000,
        }],
      };
    }
    return {
      id: game, label: meta.label, gameName: meta.gameName, reservedSpots: 0,
      tables: (gameStakes(game) || []).map((s) => ({
        id: `${game}:${s.key}`, key: s.key, gameId: s.gameId, tierName: s.name,
        limitsText: s.limitsText, blurb: s.blurb,
        href: `${meta.base}?stake=${s.key}`,
        minBet: tableMinBet(getTable(s.gameId)),
      })),
    };
  });
  return { sections };
}
