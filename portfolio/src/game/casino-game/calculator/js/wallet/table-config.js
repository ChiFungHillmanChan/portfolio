// table-config.js — client mirror of the server (cg-poker wallet-logic.mjs)
// GAME_TABLES, plus the lobby/practice card metadata and display helpers.
// PURE: no imports, no browser globals. The SERVER is authoritative — these
// numbers exist only for optimistic UI and must be kept in lockstep with
// lambda/poker/wallet-logic.mjs (a drift here is caught by the matching test).

export const GAME_TABLES = {
  roulette: {
    maxTotalBet: 20000,
    betTypes: {
      straight:  { min: 100, max: 20000, maxReturn: 36, mergeFactor: 1 },
      split:     { min: 100, max: 20000, maxReturn: 18, mergeFactor: 1 },
      street:    { min: 100, max: 20000, maxReturn: 12, mergeFactor: 1 },
      corner:    { min: 100, max: 20000, maxReturn: 9,  mergeFactor: 1 },
      sixline:   { min: 100, max: 20000, maxReturn: 6,  mergeFactor: 1 },
      column:    { min: 100, max: 20000, maxReturn: 3,  mergeFactor: 1 },
      dozen:     { min: 100, max: 20000, maxReturn: 3,  mergeFactor: 1 },
      evenMoney: { min: 100, max: 20000, maxReturn: 2,  mergeFactor: 1 },
    },
  },
  blackjack: {
    maxTotalBet: 17500,
    betTypes: {
      main:           { min: 500, max: 10000, maxReturn: 2.5, mergeFactor: 8 },
      perfectPair:    { min: 100, max: 2500,  maxReturn: 26,  mergeFactor: 1 },
      twentyOnePlus3: { min: 100, max: 2500,  maxReturn: 101, mergeFactor: 1 },
      top3:           { min: 100, max: 2500,  maxReturn: 271, mergeFactor: 1 },
    },
  },
  "blackjack-shoe": {
    maxTotalBet: 2000,
    betTypes: {
      main: { min: 100, max: 2000, maxReturn: 2.5, mergeFactor: 8 },
    },
  },
  baccarat: {
    maxTotalBet: 25000,
    betTypes: {
      player:      { min: 500, max: 10000, maxReturn: 2,    mergeFactor: 1 },
      banker:      { min: 500, max: 10000, maxReturn: 1.95, mergeFactor: 1 },
      tie:         { min: 100, max: 1000,  maxReturn: 9,    mergeFactor: 1 },
      playerPair:  { min: 100, max: 1000,  maxReturn: 12,   mergeFactor: 1 },
      bankerPair:  { min: 100, max: 1000,  maxReturn: 12,   mergeFactor: 1 },
      dragonBonus: { min: 100, max: 2000,  maxReturn: 31,   mergeFactor: 1 },
      egalite:     { min: 100, max: 10000, maxReturn: 226,  mergeFactor: 1 },
    },
  },
};

export function getTable(gameId) {
  return Object.prototype.hasOwnProperty.call(GAME_TABLES, gameId) ? GAME_TABLES[gameId] : null;
}

export function betTypeSpec(gameId, betType) {
  const table = getTable(gameId);
  if (!table) return null;
  return Object.prototype.hasOwnProperty.call(table.betTypes, betType) ? table.betTypes[betType] : null;
}

export function formatChips(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString("en-US");
}

// Lobby cards — playable games (credits). UTH links to its own online lobby (buy-in escrow is
// Plan 4); it carries no fixed-bet table here.
export const LOBBY_GAMES = [
  { id: "roulette", name: "Roulette", href: "roulette/index.html",
    blurb: "European & American wheel. One house table, live stats.",
    limitsText: "100 – 5,000 / spot", tags: ["Wheel", "Live Stats"] },
  { id: "blackjack", name: "Blackjack", href: "blackjack/game-mode/index.html",
    blurb: "Dealt hands with Perfect Pair, 21+3 and Top-3 side bets.",
    limitsText: "500 – 10,000", tags: ["Side Bets", "Double / Split"] },
  { id: "baccarat", name: "Baccarat", href: "baccarat/game-mode/index.html",
    blurb: "Player / Banker / Tie with pairs, Dragon Bonus and Egalité.",
    limitsText: "500 – 10,000", tags: ["Side Bets", "Egalité"] },
  { id: "uth", name: "Ultimate Texas Hold'em", href: "ultimate-texas-holdem/index.html",
    blurb: "Online multiplayer vs the dealer. 10,000 buy-in from your chips.",
    limitsText: "Ante 100 – 1,000", tags: ["Multiplayer", "Room Codes"] },
];

// Practice cards — non-game tools (no login, no credits).
export const PRACTICE_GAMES = [
  { name: "Roulette Dealer Trainer", href: "roulette/trainer/index.html",
    blurb: "Practice calculating dealer payouts, four difficulties." },
  { name: "Blackjack Card Counting", href: "blackjack/index.html",
    blurb: "Hi-Lo counting trainers, easy → hard, with progress tracking." },
  { name: "Blackjack Normal Shoe", href: "blackjack/normal-shoe/index.html",
    blurb: "Full-shoe card-counting trainer — Hi-Lo count, true count, optimal play." },
  { name: "Baccarat Card Counting", href: "baccarat/card-counting/index.html",
    blurb: "Road maps and an EV calculator for baccarat counting." },
  { name: "Poker Hand Recorder", href: "poker/bb100/index.html",
    blurb: "Drop GG hand histories → bb/100, EV curves, cloud save." },
  { name: "Ultimate Hold'em Odds", href: "ultimate-texas-holdem/odds.html",
    blurb: "Full payout table and house-edge reference." },
];
