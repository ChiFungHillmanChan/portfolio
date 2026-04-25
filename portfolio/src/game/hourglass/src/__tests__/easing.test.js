import { describe, it, expect } from 'vitest';
import { easeInOutCubic, clamp01 } from '../lib/easing.js';

describe('easeInOutCubic', () => {
  it('boundaries map to 0 and 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
  it('midpoint maps to 0.5', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
  });
  it('clamps inputs outside [0,1]', () => {
    expect(easeInOutCubic(-0.5)).toBe(0);
    expect(easeInOutCubic(1.5)).toBe(1);
  });
});

describe('clamp01', () => {
  it('passes values through inside [0,1]', () => {
    expect(clamp01(0.3)).toBe(0.3);
  });
  it('clamps below 0 and above 1', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});
