import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext(null);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-refresh token every 50 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const idToken = await currentUser.getIdToken(true);
          setToken(idToken);
        }
      } catch (err) {
        console.error('Token refresh failed:', err);
      }
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign-in error:', err);
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
