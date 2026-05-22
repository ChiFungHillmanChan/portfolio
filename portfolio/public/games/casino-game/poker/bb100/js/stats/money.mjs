// js/stats/money.mjs
// All amounts internally are BigInt micro-cents (1 UC = $1e-6).

export function dollarsToUC(s) {
  // Accept string like "0.02", "-0.05", "1.50", "0"
  const str = String(s).trim();
  const neg = str.startsWith('-');
  const body = neg ? str.slice(1) : str;
  const [int = '0', frac = ''] = body.split('.');
  const fracPadded = (frac + '000000').slice(0, 6); // pad/truncate to 6 decimals
  const uc = BigInt(int) * 1000000n + BigInt(fracPadded);
  return neg ? -uc : uc;
}

export function ucToDollars(uc) {
  // Lossy: returns Number for chart use; full precision via BigInt path
  return Number(uc) / 1e6;
}

export function sumUC(items) {
  let s = 0n;
  for (const v of items) s += v;
  return s;
}

export function formatUSD(uc) {
  // Round to nearest cent (10000 UC), then format
  const sign = uc < 0n ? '-' : '';
  const abs = uc < 0n ? -uc : uc;
  const cents = (abs + 5000n) / 10000n; // round half up
  const dollars = cents / 100n;
  const remCents = cents % 100n;
  return `${sign}$${dollars}.${remCents.toString().padStart(2, '0')}`;
}

export function formatUSD6(uc) {
  // 6-decimal display for verify script
  const sign = uc < 0n ? '-' : '';
  const abs = uc < 0n ? -uc : uc;
  const dollars = abs / 1000000n;
  const micro = abs % 1000000n;
  return `${sign}$${dollars}.${micro.toString().padStart(6, '0')}`;
}
