import { createContext, useContext, useState, useCallback } from 'react';

const PREMIUM_KEY = 'sd_premium';

const PremiumContext = createContext(null);

function loadPremium() {
  try {
    const stored = localStorage.getItem(PREMIUM_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    return data.active === true;
  } catch {
    return false;
  }
}

export function PremiumProvider({ children }) {
  const [isPremium, setIsPremium] = useState(() => import.meta.env.DEV || loadPremium());

  const activatePremium = useCallback((sessionId) => {
    const data = {
      active: true,
      activatedAt: new Date().toISOString(),
      sessionId,
    };
    localStorage.setItem(PREMIUM_KEY, JSON.stringify(data));
    setIsPremium(true);
    window.dispatchEvent(new CustomEvent('sd:premium-activated'));
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, activatePremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
