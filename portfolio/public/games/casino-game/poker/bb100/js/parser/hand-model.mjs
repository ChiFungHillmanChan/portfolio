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
 * @property {bigint} jackpotUC   GGPoker jackpot fee (from SUMMARY line "Jackpot $X")
 * @property {bigint} totalPotUC
 * @property {boolean} reachedShowdown
 * @property {boolean} heroAllIn
 * @property {string|null} allInStreet  "preflop"|"flop"|"turn"|"river"|null
 * @property {Object|null} showdown  {hero:string[], villains:Object<string,string[]>, board:string[]}
 * @property {Array<{seat:number, name:string, stackUC:bigint}>} seats  all seated players at hand start
 * @property {Object<string, bigint>} contributions  effective contribution per player to the contested pot
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
    jackpotUC: 0n,            // GGPoker jackpot fee
    totalPotUC: 0n,
    reachedShowdown: false,
    heroAllIn: false,
    allInStreet: null,
    showdown: null,
    seats: [],                // [{seat, name, stackUC}] — starting stacks
    contributions: {},        // {playerName: bigint} — effective contribution per player
    ...overrides,
  };
}
