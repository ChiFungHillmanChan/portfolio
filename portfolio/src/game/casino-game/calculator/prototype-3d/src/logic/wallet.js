(() => {
  const C = (globalThis.CASINO ??= {});
  const listeners = new Set();
  let balance = 100000;
  const emit = (delta) => listeners.forEach((fn) => fn(balance, delta));
  C.wallet = {
    get balance() { return balance; },
    canAfford: (n) => Number.isInteger(n) && n > 0 && n <= balance,
    debit(n) {
      if (!C.wallet.canAfford(n)) return false;
      balance -= n; emit(-n); return true;
    },
    credit(n) {
      if (!Number.isInteger(n) || n < 0) return false;
      balance += n; emit(n); return true;
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    _reset(v = 100000) { balance = v; listeners.clear(); },
  };
})();
