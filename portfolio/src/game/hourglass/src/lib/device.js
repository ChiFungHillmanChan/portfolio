export function isLowPower() {
  if (typeof window === 'undefined') return false;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const fewCores = (navigator.hardwareConcurrency || 8) < 8;
  return smallScreen || fewCores;
}

export function isCoarsePointer() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}
