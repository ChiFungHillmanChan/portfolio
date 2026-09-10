// Refreshes the embedded game's existing wallet after a purchase in its
// parent lobby. A read waits for the current round, then briefly blocks a new
// debit so an older wallet-get response cannot overwrite a newer settlement.
export function mountLobbyWalletRefresh({ view, walletClient, isBusy, onStateChange = () => {} }) {
  let pending = false, running = false, closed = false, timer = null;
  const post = data => view.parent.postMessage({ source: 'cg-roulette', ...data }, view.location.origin);
  const setRefreshing = value => {
    view.rouletteWalletRefreshing = value;
    onStateChange();
  };
  const pump = async () => {
    timer = null;
    if (closed || running || !pending) return;
    setRefreshing(true);
    // The bootstrap's initial auth read is already in flight while balance
    // is null. Wait for it too, or its older response could undo this read.
    if (walletClient.getBalance() === null || isBusy()) { timer = view.setTimeout(pump, 120); return; }
    pending = false; running = true;
    try {
      // load() broadcasts to the already-mounted gate and bankroll listeners.
      // It does not reset the game, clear placed bets, or settle an open round.
      await walletClient.load();
      if (!closed) post({ type: 'wallet-refreshed', ok: true });
    } catch (error) {
      if (!closed) {
        view.console?.warn('[roulette] wallet refresh failed:', error);
        post({ type: 'wallet-refreshed', ok: false });
      }
    } finally {
      running = false;
      if (!closed) {
        if (pending) pump();
        else setRefreshing(false);
      }
    }
  };
  const onMessage = event => {
    if (closed || view.parent === view || event.source !== view.parent || event.origin !== view.location.origin) return;
    if (event.data?.source !== 'cg-lobby' || event.data?.type !== 'wallet-refresh') return;
    pending = true;
    if (!timer) pump();
  };
  const dispose = () => {
    if (closed) return;
    closed = true; pending = false;
    if (timer) view.clearTimeout(timer);
    timer = null; view.rouletteWalletRefreshing = false;
    view.removeEventListener('message', onMessage);
    view.removeEventListener('pagehide', dispose);
  };
  view.addEventListener('message', onMessage);
  view.addEventListener('pagehide', dispose);
  post({ type: 'wallet-refresh-ready' });
  return dispose;
}
