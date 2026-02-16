import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { API_BASE } from '../config/constants';

const SUPERADMIN_EMAILS = (import.meta.env.VITE_SUPERADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const PremiumContext = createContext(null);

// tier: 'free' | 'standard' | 'pro'
// Daily AI chat limits per tier
export const TIER_LIMITS = { free: 5, standard: 20, pro: 80 };

export function PremiumProvider({ children }) {
  const { user, token, loading: authLoading } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tier, setTier] = useState('free');
  const [loadingEntitlement, setLoadingEntitlement] = useState(true);

  const refreshPremiumStatus = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setIsSuperAdmin(false);
      setTier('free');
      setLoadingEntitlement(false);
      return;
    }

    const email = String(user.email || '').toLowerCase();
    if (email && SUPERADMIN_EMAILS.includes(email)) {
      setIsSuperAdmin(true);
      setIsPremium(true);
      setTier('pro');
      setLoadingEntitlement(false);
      return;
    }

    setLoadingEntitlement(true);
    setIsSuperAdmin(false);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const active = data.premium === true;
        if (active) {
          setIsPremium(true);
          setTier(data.tier === 'pro' ? 'pro' : 'standard');
        } else {
          setIsPremium(false);
          setTier('free');
        }
      } else {
        setIsPremium(false);
        setTier('free');
      }
    } catch (err) {
      console.error('Failed to fetch premium status:', err);
      setIsPremium(false);
      setTier('free');
    } finally {
      setLoadingEntitlement(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refreshPremiumStatus();
  }, [authLoading, refreshPremiumStatus]);

  const activatePremium = useCallback(async () => {
    await refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const confirmStripeSession = useCallback(async (sessionId) => {
    if (!token) {
      throw new Error('請先登入 Google 帳號再確認付款。');
    }
    const trimmed = String(sessionId || '').trim();
    if (!trimmed) {
      throw new Error('缺少 session_id，無法確認付款。');
    }

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'confirm-session', sessionId: trimmed }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const err = new Error(data.error || '付款確認失敗');
      err.status = res.status;
      err.payload = data;
      throw err;
    }

    await refreshPremiumStatus();
    return data;
  }, [token, refreshPremiumStatus]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isSuperAdmin,
        tier,
        loadingEntitlement,
        activatePremium,
        confirmStripeSession,
        refreshPremiumStatus,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
