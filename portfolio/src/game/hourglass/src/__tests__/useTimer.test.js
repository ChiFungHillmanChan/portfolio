import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../hooks/useTimer.js';

describe('useTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('initialises with default duration, not running, progress 0', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 300 }));
    expect(result.current.duration).toBe(300);
    expect(result.current.running).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.remainingMs).toBe(300_000);
    expect(result.current.flipState).toBe(1);
    expect(result.current.done).toBe(false);
  });

  it('start() begins counting, advances progress over time', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    act(() => { result.current.start(); });
    expect(result.current.running).toBe(true);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.progress).toBeGreaterThan(0.4);
    expect(result.current.progress).toBeLessThan(0.6);
  });

  it('pause() stops advancing; resume continues from where it left off', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => { result.current.pause(); });
    const pausedProgress = result.current.progress;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.progress).toBe(pausedProgress);
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.progress).toBeGreaterThan(0.55);
    expect(result.current.progress).toBeLessThan(0.65);
  });

  it('reaches done=true when elapsed >= duration; clamps progress to 1', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 2 }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current.progress).toBe(1);
    expect(result.current.done).toBe(true);
    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it('reset() returns elapsed to 0 and stops the timer', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(5000); });
    act(() => { result.current.reset(); });
    expect(result.current.progress).toBe(0);
    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(10_000);
  });

  it('setDuration() updates duration and resets elapsed', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => { result.current.setDuration(60); });
    expect(result.current.duration).toBe(60);
    expect(result.current.progress).toBe(0);
    expect(result.current.running).toBe(false);
  });

  it('flip() toggles flipState (-1 ↔ 1) and resets progress', () => {
    const { result } = renderHook(() => useTimer({ defaultDuration: 10 }));
    expect(result.current.flipState).toBe(1);
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(4000); });
    act(() => { result.current.flip(); });
    expect(result.current.flipState).toBe(-1);
    expect(result.current.progress).toBe(0);
    expect(result.current.running).toBe(false);
    act(() => { result.current.flip(); });
    expect(result.current.flipState).toBe(1);
  });
});
