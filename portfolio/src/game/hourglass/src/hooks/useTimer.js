import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimer({ defaultDuration = 300 } = {}) {
  const [duration, setDurationState] = useState(defaultDuration);
  const [running, setRunning] = useState(false);
  const [flipState, setFlipState] = useState(1);

  // Timer math is reference-based to stay accurate across pauses + tab throttling.
  const startTimestampRef = useRef(null);
  const pausedAccumulatedMsRef = useRef(0);
  const [tick, setTick] = useState(0);
  const rafRef = useRef(null);

  const elapsedMs = (() => {
    if (!running && startTimestampRef.current === null) return pausedAccumulatedMsRef.current;
    if (!running) return pausedAccumulatedMsRef.current;
    const now = performance.now();
    return pausedAccumulatedMsRef.current + (now - startTimestampRef.current);
  })();

  const totalMs = duration * 1000;
  const progress = Math.max(0, Math.min(1, totalMs === 0 ? 1 : elapsedMs / totalMs));
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const done = progress >= 1;

  // RAF loop drives the re-renders while running. We don't use setInterval to avoid jitter.
  useEffect(() => {
    if (!running) return;
    const loop = () => {
      setTick((t) => (t + 1) % 1000000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  // Auto-stop when done.
  useEffect(() => {
    if (done && running) {
      setRunning(false);
      pausedAccumulatedMsRef.current = totalMs;
      startTimestampRef.current = null;
    }
  }, [done, running, totalMs]);

  const start = useCallback(() => {
    if (running) return;
    if (pausedAccumulatedMsRef.current >= totalMs) pausedAccumulatedMsRef.current = 0;
    startTimestampRef.current = performance.now();
    setRunning(true);
  }, [running, totalMs]);

  const pause = useCallback(() => {
    if (!running) return;
    pausedAccumulatedMsRef.current += performance.now() - startTimestampRef.current;
    startTimestampRef.current = null;
    setRunning(false);
  }, [running]);

  const reset = useCallback(() => {
    pausedAccumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    setRunning(false);
    setTick((t) => t + 1);
  }, []);

  const setDuration = useCallback((seconds) => {
    pausedAccumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    setRunning(false);
    setDurationState(seconds);
  }, []);

  const flip = useCallback(() => {
    pausedAccumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    setRunning(false);
    setFlipState((s) => -s);
  }, []);

  return { duration, elapsedMs, progress, remainingMs, running, done, flipState,
           start, pause, reset, setDuration, flip };
}
