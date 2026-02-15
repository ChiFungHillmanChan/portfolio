import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const PREMIUM_KEY = 'sd_premium';
const SUPERADMIN_EMAILS = (import.meta.env.VITE_SUPERADMIN_EMAILS || '').split(',').filter(Boolean);

const PremiumContext = createContext(null);

export function PremiumProvider({ children }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Sync premium status from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setIsSuperAdmin(false);
      localStorage.removeItem(PREMIUM_KEY);
      return;
    }

    // Check superadmin
    if (SUPERADMIN_EMAILS.includes(user.email)) {
      setIsSuperAdmin(true);
      setIsPremium(true);
      return;
    }
    setIsSuperAdmin(false);

    async function fetchPremiumStatus() {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().premium === true) {
          setIsPremium(true);
        } else {
          setIsPremium(false);
          localStorage.removeItem(PREMIUM_KEY);
        }
      } catch (err) {
        console.error('Failed to fetch premium status:', err);
        // On error, don't grant premium — fail closed
        setIsPremium(false);
      }
    }

    fetchPremiumStatus();
  }, [user]);

  // Only caches locally — the backend (Admin SDK) writes premium to Firestore.
  const activatePremium = useCallback(async () => {
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
