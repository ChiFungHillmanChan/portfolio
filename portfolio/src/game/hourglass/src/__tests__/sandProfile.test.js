import { describe, it, expect } from 'vitest';
import { topProfile, bottomProfile, volumeOfRevolution, BULB_RADIUS, BULB_HEIGHT, NECK_RADIUS } from '../lib/sandProfile.js';

const totalSand = volumeOfRevolution(topProfile(0));

describe('sandProfile', () => {
  it('topProfile at progress=0 contains a non-trivial volume', () => {
    expect(volumeOfRevolution(topProfile(0))).toBeGreaterThan(0.01);
  });

  it('topProfile at progress=1 collapses to ~zero volume', () => {
    expect(volumeOfRevolution(topProfile(1))).toBeLessThan(0.001);
  });

  it('bottomProfile at progress=0 is ~zero', () => {
    expect(volumeOfRevolution(bottomProfile(0))).toBeLessThan(0.001);
  });

  it('bottomProfile at progress=1 holds the same total as top at progress=0 (mass conserved)', () => {
    const v = volumeOfRevolution(bottomProfile(1));
    expect(v).toBeGreaterThan(totalSand * 0.95);
    expect(v).toBeLessThan(totalSand * 1.05);
  });

  it('mass is conserved across the sweep', () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const v = volumeOfRevolution(topProfile(p)) + volumeOfRevolution(bottomProfile(p));
      expect(v).toBeGreaterThan(totalSand * 0.85);
      expect(v).toBeLessThan(totalSand * 1.15);
    }
  });

  it('all profile points fit inside the bulb radius', () => {
    for (const p of [0, 0.5, 1]) {
      for (const pt of topProfile(p)) expect(pt[0]).toBeLessThanOrEqual(BULB_RADIUS + 1e-6);
      for (const pt of bottomProfile(p)) expect(pt[0]).toBeLessThanOrEqual(BULB_RADIUS + 1e-6);
    }
  });

  it('exposes constants', () => {
    expect(BULB_RADIUS).toBeGreaterThan(0);
    expect(BULB_HEIGHT).toBeGreaterThan(0);
    expect(NECK_RADIUS).toBeGreaterThan(0);
    expect(NECK_RADIUS).toBeLessThan(BULB_RADIUS);
  });
});
