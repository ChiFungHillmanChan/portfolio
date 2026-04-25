export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function easeInOutCubic(t) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
