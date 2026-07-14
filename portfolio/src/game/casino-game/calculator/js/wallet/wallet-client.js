// wallet-client.js — client-side wallet state machine. PURE + dependency-
// injected: `post`, `storage`, `now`, `randomId` are all passed in so this
// runs under node --test with fakes. wallet-bootstrap.js wires the real ones.
//
// Open-round lifecycle: bet() opens a round and persists {roundId, bets} to
// storage so a crash mid-hand can still collect via payout() after reload.
// One open round per game is enforced locally (the server forfeits a second),
// so the UI blocks a new bet until the current round settles.

import { GAME_TABLES } from "./table-config.js";

export class WalletError extends Error {
  constructor(code, { status = 0, retryAt = null } = {}) {
    super(code);
    this.name = "WalletError";
    this.code = code;
    this.status = status;
    this.retryAt = retryAt;
  }
}

const ROUND_KEY = (gameId) => `casinoWallet:round:${gameId}`;

export function createWalletClient({ post, storage, now, randomId }) {
  let balance = null;          // chips on hand — the only pool games can bet
  let cash = null;             // wallet cash — buy in at a table, cash out at the cashier
  let canReset = false;
  let resetAvailableAt = null;
  let resetChips = null;       // server-configured reset grant (labels only)
  const subs = new Set();

  const notify = () => { for (const cb of subs) cb(balance); };

  const readRound = (gameId) => {
    const raw = storage.getItem(ROUND_KEY(gameId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.roundId === "string" && parsed.bets) {
        const round = { roundId: parsed.roundId, bets: parsed.bets };
        if (parsed.pending) round.pending = true;
        return round;
      }
    } catch { /* corrupt — treat as none */ }
    return null;
  };
  const writeRound = (gameId, round) => storage.setItem(ROUND_KEY(gameId), JSON.stringify(round));
  const clearRound = (gameId) => storage.removeItem(ROUND_KEY(gameId));

  // Resolves a scripted/real response into either an updated state or a throw.
  const settleResponse = ({ status, body }) => {
    if (status >= 200 && status < 300 && body && body.ok) return body;
    const code = (body && body.error) || `http-${status}`;
    throw new WalletError(code, { status, retryAt: body && body.retryAt ? body.retryAt : null });
  };

  const applyBalance = (body) => {
    let changed = false;
    if (typeof body.balance === "number") { balance = body.balance; changed = true; }
    if (typeof body.cash === "number") { cash = body.cash; changed = true; }
    if (changed) notify();
  };

  return {
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    getBalance() { return balance; },
    getCash() { return cash; },
    getResetChips() { return typeof resetChips === "number" ? resetChips : 5000; },
    getResetInfo() { return { canReset, resetAvailableAt }; },
    openRound(gameId) { return readRound(gameId); },

    // Wipes in-memory state on sign-out so a second user on the same
    // un-reloaded page never sees the previous user's balance. Does NOT
    // touch stored rounds — the caller clears those separately.
    clear() {
      balance = null;
      cash = null;
      canReset = false;
      resetAvailableAt = null;
      notify();
    },

    async load() {
      const body = settleResponse(await post("wallet-get", {}));
      balance = body.balance;
      if (typeof body.cash === "number") cash = body.cash;
      if (typeof body.resetChips === "number") resetChips = body.resetChips;
      canReset = !!body.canReset;
      resetAvailableAt = body.resetAvailableAt || null;
      // Reconcile local open rounds with the server (authoritative): adopt any
      // round the server has open (e.g. a bet whose response we lost), and drop
      // any local round the server no longer has (settled/forfeited elsewhere).
      // Only when the server actually sends openRounds (back-compat guard).
      if (body.openRounds && typeof body.openRounds === "object") {
        const serverGames = new Set(Object.keys(body.openRounds));
        for (const [gameId, round] of Object.entries(body.openRounds)) {
          if (round && typeof round.roundId === "string" && round.bets) {
            writeRound(gameId, { roundId: round.roundId, bets: round.bets });
          }
        }
        // Drop stale local rounds for known wallet games not in the server set.
        // Game set derived from GAME_TABLES to prevent drift when new games are added.
        for (const gameId of Object.keys(GAME_TABLES)) {
          if (!serverGames.has(gameId) && readRound(gameId)) clearRound(gameId);
        }
      }
      notify();
      return { balance, canReset, resetAvailableAt };
    },

    // The round is persisted (pending) BEFORE the request: if the response is
    // lost, the retry re-sends the SAME roundId and the SAME bets, and the
    // server replays it idempotently — a lost response can never double-debit
    // or forfeit the first stake. Server errors (it responded) clear the
    // pending round; only a network failure (status 0) keeps it.
    async bet(gameId, bets) {
      const existing = readRound(gameId);
      if (existing && !existing.pending) throw new WalletError("round-in-progress");
      const roundId = existing ? existing.roundId : randomId();
      const sendBets = existing ? existing.bets : { ...bets };
      writeRound(gameId, { roundId, bets: sendBets, pending: true });
      let body;
      try {
        body = settleResponse(await post("wallet-bet", { gameId, roundId, bets: sendBets }));
      } catch (err) {
        if (!(err instanceof WalletError && err.status === 0)) clearRound(gameId);
        throw err;
      }
      writeRound(gameId, { roundId, bets: sendBets });
      applyBalance(body);
      // bets echoes what the round actually holds — after a replayed retry it
      // may differ from the caller's argument; the game must play THIS stake.
      return { balance, roundId, bets: sendBets, forfeited: body.forfeited };
    },

    async topUp(gameId, bets) {
      const round = readRound(gameId);
      if (!round) throw new WalletError("no-open-round");
      const body = settleResponse(await post("wallet-bet", { gameId, roundId: round.roundId, bets, topUp: true }));
      const merged = { ...round.bets };
      for (const [k, v] of Object.entries(bets)) merged[k] = (merged[k] || 0) + v;
      writeRound(gameId, { roundId: round.roundId, bets: merged });
      applyBalance(body);
      return { balance, roundId: round.roundId };
    },

    async buyIn(amount) {
      const body = settleResponse(await post("wallet-buy-in", { amount }));
      applyBalance(body);
      return { balance, cash };
    },

    async cashOut(amount) {
      const payload = amount === "all" ? { all: true } : { amount };
      const body = settleResponse(await post("wallet-cash-out", payload));
      applyBalance(body);
      return { balance, cash };
    },

    async payout(gameId, payoutChips) {
      const round = readRound(gameId);
      if (!round) throw new WalletError("no-open-round");
      const body = settleResponse(await post("wallet-payout", { gameId, roundId: round.roundId, payout: payoutChips }));
      clearRound(gameId);
      applyBalance(body);
      return { balance };
    },

    async reset() {
      const res = await post("wallet-reset", {});
      let body;
      try {
        body = settleResponse(res);
      } catch (err) {
        if (err instanceof WalletError && err.code === "cooldown" && err.retryAt) {
          resetAvailableAt = err.retryAt;
          canReset = false;
          notify();
        }
        throw err;
      }
      balance = body.balance;
      canReset = false;
      resetAvailableAt = null;
      notify();
      return { balance };
    },
  };
}
