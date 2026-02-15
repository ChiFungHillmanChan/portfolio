import { createContext, useContext, useState, useCallback } from 'react';

const PROGRESS_KEY = 'sd_progress';

const ProgressContext = createContext(null);

function loadProgress() {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function ProgressProvider({ children }) {
  const [viewed, setViewed] = useState(loadProgress);

  const markViewed = useCallback((slug) => {
    setViewed((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isViewed = useCallback((slug) => viewed.includes(slug), [viewed]);

  return (
    <ProgressContext.Provider value={{ viewed, markViewed, isViewed, total: viewed.length }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
