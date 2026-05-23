// games-registry.js — Single source of truth for which games have plans and
// what tiers each one supports. Adding a new paid game = one entry here +
// matching server-side mapping in cg-poker writePlanForGame(). The admin
// dashboard renders one panel per entry automatically.

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
  {
    id: "systemDesign",
    label: "System Design 教室",
    blurb: "AI chat + premium topic access. Tier sets daily AI call budget.",
    tiers: [
      { id: "free",     label: "Free",     limit: "5 AI calls/day" },
      { id: "standard", label: "Standard", limit: "20 AI calls/day" },
      { id: "pro",      label: "Pro",      limit: "80 AI calls/day" },
    ],
  },
  // Future games: drop a new entry here AND extend writePlanForGame() in
  // lambda/poker/index.mjs to know how to persist the new game's tier.
];

export function getGame(id) {
  return GAME_PLANS.find((g) => g.id === id) || null;
}
