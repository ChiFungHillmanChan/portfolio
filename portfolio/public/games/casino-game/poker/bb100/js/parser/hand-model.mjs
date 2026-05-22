// js/parser/hand-model.mjs
/**
 * @typedef {Object} Hand
 * @property {string} id
 * @property {{sbUC:bigint, bbUC:bigint}} stake
 * @property {string} date
 * @property {{seat:number, position:string, cards:string[]|null}} hero
 * @property {bigint} contributedUC
 * @property {bigint} collectedUC
 * @property {bigint} uncalledUC  amount of "Uncalled bet returned to Hero" (subset of collectedUC)
 * @property {bigint} rakeUC
 * @property {bigint} jackpotUC   GGPoker jackpot fee (from SUMMARY line "Jackpot $X") — fee
 * @property {bigint} taxUC       Regional regulatory tax — fee (FR/IT/ES GG variants)
 * @property {bigint} cashDropUC  GGPoker Rush&Cash "Cash Drop to Pot" — bonus money added IN
 * @property {bigint} bingoUC     GGPoker "Bingo on the Flop" promo — bonus money added IN
 * @property {bigint} fortuneUC   GGPoker "Fortune Spin" promo — bonus money added IN
 * @property {bigint} totalPotUC
 * @property {boolean} reachedShowdown
 * @property {boolean} heroAllIn
 * @property {string|null} allInStreet  "preflop"|"flop"|"turn"|"river"|null
 * @property {boolean} anyAllIn         true if ANY player (Hero or villain) went all-in
 * @property {string|null} anyAllInStreet  street of the first all-in event in this hand
 * @property {Object<string,bigint>} contributions  per-player total contribution (for multi-way side-pot)
 * @property {Array<{seat:number,name:string,stackUC:bigint}>} seats  starting stacks
 * @property {Object|null} showdown  {hero:string[], villains:Object<string,string[]>, board:string[]}
 */

export function newHand(overrides = {}) {
  return {
    id: '',
    stake: { sbUC: 0n, bbUC: 0n },
    date: '',
    hero: { seat: 0, position: 'BTN', cards: null },
    contributedUC: 0n,
    collectedUC: 0n,
    uncalledUC: 0n,           // amount of "Uncalled bet returned to Hero"
    rakeUC: 0n,
    jackpotUC: 0n,            // GG "Big Hand Jackpot" fee (1 BB once pot ≥ 30 BB; redistributed long-run)
    taxUC: 0n,                // GG regional tax (FR/IT/ES) — never refunded
    cashDropUC: 0n,           // GG "Cash Drop to Pot" — bonus money GG injects into specific pots
    bingoUC: 0n,              // GG "Bingo on the Flop" promo — bonus money for specific flop patterns
    fortuneUC: 0n,            // GG "Fortune Spin" promo — bad-beat-style bonus money
    totalPotUC: 0n,
    reachedShowdown: false,
    heroAllIn: false,
    allInStreet: null,
    anyAllIn: false,          // true if ANY player went all-in
    anyAllInStreet: null,     // street of the first all-in event
    contributions: {},        // { playerName: bigint } — per-player total contribution
    seats: [],                // [{ seat, name, stackUC }] — starting stacks
    showdown: null,
    ...overrides,
  };
}
