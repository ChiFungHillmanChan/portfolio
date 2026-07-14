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
  // Roulette stake tiers — same aggregate-cap rule as the house table (per-
  // class max = the tier total; per-SPOT limits are client UX), maxReturn
  // unchanged. Micro's min (10) sits below the server resetThreshold (100) →
  // no bust dead-zone. `roulette` above stays the Standard tier.
  "roulette-micro": {
    maxTotalBet: 2000,
    betTypes: {
      straight:  { min: 10, max: 2000, maxReturn: 36, mergeFactor: 1 },
      split:     { min: 10, max: 2000, maxReturn: 18, mergeFactor: 1 },
      street:    { min: 10, max: 2000, maxReturn: 12, mergeFactor: 1 },
      corner:    { min: 10, max: 2000, maxReturn: 9,  mergeFactor: 1 },
      sixline:   { min: 10, max: 2000, maxReturn: 6,  mergeFactor: 1 },
      column:    { min: 10, max: 2000, maxReturn: 3,  mergeFactor: 1 },
      dozen:     { min: 10, max: 2000, maxReturn: 3,  mergeFactor: 1 },
      evenMoney: { min: 10, max: 2000, maxReturn: 2,  mergeFactor: 1 },
    },
  },
  "roulette-mini": {
    maxTotalBet: 5000,
    betTypes: {
      straight:  { min: 50, max: 5000, maxReturn: 36, mergeFactor: 1 },
      split:     { min: 50, max: 5000, maxReturn: 18, mergeFactor: 1 },
      street:    { min: 50, max: 5000, maxReturn: 12, mergeFactor: 1 },
      corner:    { min: 50, max: 5000, maxReturn: 9,  mergeFactor: 1 },
      sixline:   { min: 50, max: 5000, maxReturn: 6,  mergeFactor: 1 },
      column:    { min: 50, max: 5000, maxReturn: 3,  mergeFactor: 1 },
      dozen:     { min: 50, max: 5000, maxReturn: 3,  mergeFactor: 1 },
      evenMoney: { min: 50, max: 5000, maxReturn: 2,  mergeFactor: 1 },
    },
  },
  "roulette-high": {
    maxTotalBet: 100000,
    betTypes: {
      straight:  { min: 500, max: 100000, maxReturn: 36, mergeFactor: 1 },
      split:     { min: 500, max: 100000, maxReturn: 18, mergeFactor: 1 },
      street:    { min: 500, max: 100000, maxReturn: 12, mergeFactor: 1 },
      corner:    { min: 500, max: 100000, maxReturn: 9,  mergeFactor: 1 },
      sixline:   { min: 500, max: 100000, maxReturn: 6,  mergeFactor: 1 },
      column:    { min: 500, max: 100000, maxReturn: 3,  mergeFactor: 1 },
      dozen:     { min: 500, max: 100000, maxReturn: 3,  mergeFactor: 1 },
      evenMoney: { min: 500, max: 100000, maxReturn: 2,  mergeFactor: 1 },
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
  // Blackjack stake tiers — each is its own gameId (mirrors blackjack-shoe).
  // Same rules + pay table as `blackjack` (Standard); only limits scale. Micro's
  // main min (50) sits under the server resetThreshold (100) → no bust dead-zone.
  // maxTotalBet = main.max + 3 × sideMax. Keep in lockstep with wallet-logic.mjs.
  "blackjack-micro": {
    maxTotalBet: 1750,
    betTypes: {
      main:           { min: 50, max: 1000, maxReturn: 2.5, mergeFactor: 8 },
      perfectPair:    { min: 50, max: 250,  maxReturn: 26,  mergeFactor: 1 },
      twentyOnePlus3: { min: 50, max: 250,  maxReturn: 101, mergeFactor: 1 },
      top3:           { min: 50, max: 250,  maxReturn: 271, mergeFactor: 1 },
    },
  },
  "blackjack-mini": {
    maxTotalBet: 4000,
    betTypes: {
      main:           { min: 100, max: 2500, maxReturn: 2.5, mergeFactor: 8 },
      perfectPair:    { min: 100, max: 500,  maxReturn: 26,  mergeFactor: 1 },
      twentyOnePlus3: { min: 100, max: 500,  maxReturn: 101, mergeFactor: 1 },
      top3:           { min: 100, max: 500,  maxReturn: 271, mergeFactor: 1 },
    },
  },
  "blackjack-high": {
    maxTotalBet: 35000,
    betTypes: {
      main:           { min: 1000, max: 20000, maxReturn: 2.5, mergeFactor: 8 },
      perfectPair:    { min: 200,  max: 5000,  maxReturn: 26,  mergeFactor: 1 },
      twentyOnePlus3: { min: 200,  max: 5000,  maxReturn: 101, mergeFactor: 1 },
      top3:           { min: 200,  max: 5000,  maxReturn: 271, mergeFactor: 1 },
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
  // Baccarat stake tiers — Micro = Standard÷10, Mini = ÷4 (total rounded to
  // 6,000), High = ×2; maxReturn unchanged. Micro's player/banker min (50)
  // sits below the server resetThreshold (100) → no bust dead-zone.
  // `baccarat` above stays the Standard tier.
  "baccarat-micro": {
    maxTotalBet: 2500,
    betTypes: {
      player:      { min: 50, max: 1000, maxReturn: 2,    mergeFactor: 1 },
      banker:      { min: 50, max: 1000, maxReturn: 1.95, mergeFactor: 1 },
      tie:         { min: 10, max: 100,  maxReturn: 9,    mergeFactor: 1 },
      playerPair:  { min: 10, max: 100,  maxReturn: 12,   mergeFactor: 1 },
      bankerPair:  { min: 10, max: 100,  maxReturn: 12,   mergeFactor: 1 },
      dragonBonus: { min: 10, max: 200,  maxReturn: 31,   mergeFactor: 1 },
      egalite:     { min: 10, max: 1000, maxReturn: 226,  mergeFactor: 1 },
    },
  },
  "baccarat-mini": {
    maxTotalBet: 6000,
    betTypes: {
      player:      { min: 100, max: 2500, maxReturn: 2,    mergeFactor: 1 },
      banker:      { min: 100, max: 2500, maxReturn: 1.95, mergeFactor: 1 },
      tie:         { min: 25,  max: 250,  maxReturn: 9,    mergeFactor: 1 },
      playerPair:  { min: 25,  max: 250,  maxReturn: 12,   mergeFactor: 1 },
      bankerPair:  { min: 25,  max: 250,  maxReturn: 12,   mergeFactor: 1 },
      dragonBonus: { min: 25,  max: 500,  maxReturn: 31,   mergeFactor: 1 },
      egalite:     { min: 25,  max: 2500, maxReturn: 226,  mergeFactor: 1 },
    },
  },
  "baccarat-high": {
    maxTotalBet: 50000,
    betTypes: {
      player:      { min: 1000, max: 20000, maxReturn: 2,    mergeFactor: 1 },
      banker:      { min: 1000, max: 20000, maxReturn: 1.95, mergeFactor: 1 },
      tie:         { min: 200,  max: 2000,  maxReturn: 9,    mergeFactor: 1 },
      playerPair:  { min: 200,  max: 2000,  maxReturn: 12,   mergeFactor: 1 },
      bankerPair:  { min: 200,  max: 2000,  maxReturn: 12,   mergeFactor: 1 },
      dragonBonus: { min: 200,  max: 4000,  maxReturn: 31,   mergeFactor: 1 },
      egalite:     { min: 200,  max: 20000, maxReturn: 226,  mergeFactor: 1 },
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

// Blackjack stake tiers — the game page (?stake=<key>) picks the wallet table.
// Ordered low → high for the picker. `key` is the URL param; `gameId` is the
// wallet table in GAME_TABLES above. Micro's 50 min removes the bust dead-zone.
export const BLACKJACK_STAKES = [
  { key: "micro", gameId: "blackjack-micro", name: "Micro", limitsText: "50 – 1,000",     blurb: "Lowest stakes — warm up or grind a short stack." },
  { key: "mini",  gameId: "blackjack-mini",  name: "Mini",  limitsText: "100 – 2,500",    blurb: "Small bets, full side-bet action." },
  { key: "std",   gameId: "blackjack",       name: "Standard", limitsText: "500 – 10,000", blurb: "The house table." },
  { key: "high",  gameId: "blackjack-high",  name: "High",  limitsText: "1,000 – 20,000", blurb: "High-roller limits." },
];

// Roulette stake tiers. limitsText shows min / table total. perSpotMax is the
// client-only per-SPOT UX cap (the server only caps aggregates — see the
// GAME_TABLES roulette comment); roulette-wallet.js feeds it to the game.
export const ROULETTE_STAKES = [
  { key: "micro", gameId: "roulette-micro", name: "Micro", limitsText: "10 – 2,000",      perSpotMax: 500,   blurb: "Lowest stakes — every spot from 10 chips." },
  { key: "mini",  gameId: "roulette-mini",  name: "Mini",  limitsText: "50 – 5,000",      perSpotMax: 1000,  blurb: "Small bets across the whole layout." },
  { key: "std",   gameId: "roulette",       name: "Standard", limitsText: "100 – 20,000", perSpotMax: 5000,  blurb: "The house table." },
  { key: "high",  gameId: "roulette-high",  name: "High",  limitsText: "500 – 100,000",   perSpotMax: 25000, blurb: "High-roller limits." },
];

// Baccarat stake tiers. limitsText shows the player/banker range.
export const BACCARAT_STAKES = [
  { key: "micro", gameId: "baccarat-micro", name: "Micro", limitsText: "50 – 1,000",      blurb: "Lowest stakes — side bets from 10 chips." },
  { key: "mini",  gameId: "baccarat-mini",  name: "Mini",  limitsText: "100 – 2,500",     blurb: "Small bets, full side-bet action." },
  { key: "std",   gameId: "baccarat",       name: "Standard", limitsText: "500 – 10,000", blurb: "The house table." },
  { key: "high",  gameId: "baccarat-high",  name: "High",  limitsText: "1,000 – 20,000",  blurb: "High-roller limits." },
];

// Generic stake registry — one entry per game that offers stake tiers. The
// shared stake picker (stake-picker.js) and each game's ?stake= resolve read
// from here, so adding tiers to a game is one entry + its GAME_TABLES rows.
export const GAME_STAKES = {
  roulette: ROULETTE_STAKES,
  blackjack: BLACKJACK_STAKES,
  baccarat: BACCARAT_STAKES,
};

// All stake tiers for a game, ordered low → high (null if the game has none).
export function gameStakes(game) {
  return Object.prototype.hasOwnProperty.call(GAME_STAKES, game) ? GAME_STAKES[game] : null;
}

// Maps a game + ?stake= key to its stake entry (null if missing/unknown → show picker).
export function resolveStake(game, key) {
  const stakes = gameStakes(game);
  if (!stakes) return null;
  return stakes.find((s) => s.key === key) || null;
}

// Back-compat alias for the blackjack-specific resolve.
export function blackjackStake(key) {
  return resolveStake("blackjack", key);
}

// Lobby cards — playable games (credits). UTH links to its own online lobby (buy-in escrow is
// Plan 4); it carries no fixed-bet table here.
export const LOBBY_GAMES = [
  { id: "roulette", name: "Roulette", href: "roulette/index.html",
    blurb: "European & American wheel with live stats and racetrack bets.",
    limitsText: "10 – 100,000 · 4 stakes", tags: ["Wheel", "Live Stats", "Micro → High"] },
  { id: "blackjack", name: "Blackjack", href: "blackjack/game-mode/index.html",
    blurb: "Dealt hands with Perfect Pair, 21+3 and Top-3 side bets.",
    limitsText: "50 – 20,000 · 4 stakes", tags: ["Side Bets", "Double / Split", "Micro → High"] },
  { id: "baccarat", name: "Baccarat", href: "baccarat/game-mode/index.html",
    blurb: "Player / Banker / Tie with pairs, Dragon Bonus and Egalité.",
    limitsText: "50 – 20,000 · 4 stakes", tags: ["Side Bets", "Egalité", "Micro → High"] },
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
