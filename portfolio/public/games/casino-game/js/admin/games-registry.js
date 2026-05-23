// games-registry.js — Single source of truth for which games have plans and
// what tiers each one supports. Adding a new paid game = one entry here +
// matching server-side mapping in cg-poker writePlanForGame(). The admin
// dashboard renders one panel per entry automatically.

// Casino-game scope only. System Design 教室 lives in its own admin panel —
// listing it here would imply this dashboard manages it, which it doesn't.
// Future casino games (blackjack/roulette/baccarat plans, etc.) drop in here
// AND need a matching writePlanForGame() branch in lambda/poker/index.mjs.
export const GAME_PLANS = [
  {
    id: "poker",
    label: "Poker — Hand Recorder",
    blurb: "Cloud storage for parsed GG hand histories. Tier sets max hands stored.",
    tiers: [
      { id: "free",     label: "Free",     limit: "10,000 hands" },
      { id: "standard", label: "Standard", limit: "100,000 hands" },
      { id: "pro",      label: "Pro",      limit: "500,000 hands" },
      { id: "ultra",    label: "Ultra",    limit: "5,000,000 hands" },
    ],
  },
];

export function getGame(id) {
  return GAME_PLANS.find((g) => g.id === id) || null;
}
