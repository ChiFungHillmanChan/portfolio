import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const PREMIUM_KEY = 'sd_premium';
const SUPERADMIN_EMAILS = (import.meta.env.VITE_SUPERADMIN_EMAILS || '').split(',').filter(Boolean);

const PremiumContext = createContext(null);

function loadPremiumCache() {
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
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(() => import.meta.env.DEV || loadPremiumCache());
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Sync premium status from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      if (!import.meta.env.DEV) {
        setIsPremium(loadPremiumCache());
      }
      setIsSuperAdmin(false);
      return;
    }

    // Check superadmin
    if (SUPERADMIN_EMAILS.includes(user.email)) {
      setIsSuperAdmin(true);
      setIsPremium(true);
      localStorage.setItem(PREMIUM_KEY, JSON.stringify({ active: true }));
      return;
    }
    setIsSuperAdmin(false);

    async function fetchPremiumStatus() {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().premium === true) {
          setIsPremium(true);
          localStorage.setItem(PREMIUM_KEY, JSON.stringify({ active: true }));
        } else if (!import.meta.env.DEV) {
          setIsPremium(loadPremiumCache());
        }
      } catch (err) {
        console.error('Failed to fetch premium status:', err);
        if (!import.meta.env.DEV) {
          setIsPremium(loadPremiumCache());
        }
      }
    }

    fetchPremiumStatus();
  }, [user]);

  // Only caches locally — the backend (Admin SDK) writes premium to Firestore.
  const activatePremium = useCallback(async () => {
    localStorage.setItem(PREMIUM_KEY, JSON.stringify({ active: true }));
    setIsPremium(true);
    window.dispatchEvent(new CustomEvent('sd:premium-activated'));
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, isSuperAdmin, activatePremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
