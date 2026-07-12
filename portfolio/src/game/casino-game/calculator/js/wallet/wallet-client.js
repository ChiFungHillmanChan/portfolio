// wallet-client.js — client-side wallet state machine. PURE + dependency-
// injected: `post`, `storage`, `now`, `randomId` are all passed in so this
// runs under node --test with fakes. wallet-bootstrap.js wires the real ones.
//
// Open-round lifecycle: bet() opens a round and persists {roundId, bets} to
// storage so a crash mid-hand can still collect via payout() after reload.
// One open round per game is enforced locally (the server forfeits a second),
// so the UI blocks a new bet until the current round settles.

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
  let balance = null;
  let canReset = false;
  let resetAvailableAt = null;
  const subs = new Set();

  const notify = () => { for (const cb of subs) cb(balance); };

  const readRound = (gameId) => {
    const raw = storage.getItem(ROUND_KEY(gameId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.roundId === "string" && parsed.bets) {
        return { roundId: parsed.roundId, bets: parsed.bets };
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
    if (typeof body.balance === "number") { balance = body.balance; notify(); }
  };

  return {
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    getBalance() { return balance; },
    getResetInfo() { return { canReset, resetAvailableAt }; },
    openRound(gameId) { return readRound(gameId); },

    // Wipes in-memory state on sign-out so a second user on the same
    // un-reloaded page never sees the previous user's balance. Does NOT
    // touch stored rounds — the caller clears those separately.
    clear() {
      balance = null;
      canReset = false;
      resetAvailableAt = null;
      notify();
    },

    async load() {
      const body = settleResponse(await post("wallet-get", {}));
      balance = body.balance;
      canReset = !!body.canReset;
      resetAvailableAt = body.resetAvailableAt || null;
      notify();
      return { balance, canReset, resetAvailableAt };
    },

    async bet(gameId, bets) {
      if (readRound(gameId)) throw new WalletError("round-in-progress");
      const roundId = randomId();
      const body = settleResponse(await post("wallet-bet", { gameId, roundId, bets }));
      writeRound(gameId, { roundId, bets: { ...bets } });
      applyBalance(body);
      return { balance, roundId, forfeited: body.forfeited };
    },

    async topUp(gameId, bets) {
      const round = readRound(gameId);
      if (!round) throw new WalletError("no-open-round");
      const body = settleResponse(await post("wallet-bet", { gameId, roundId: round.roundId, bets }));
      const merged = { ...round.bets };
      for (const [k, v] of Object.entries(bets)) merged[k] = (merged[k] || 0) + v;
      writeRound(gameId, { roundId: round.roundId, bets: merged });
      applyBalance(body);
      return { balance, roundId: round.roundId };
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
