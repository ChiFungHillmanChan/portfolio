// Shared Firebase project (system-design-c84d3) — same public config casino-game uses.
let cached = null;

export async function getFirebase() {
  if (cached) return cached;
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = await import('firebase/auth');
  const app = getApps().length ? getApp() : initializeApp({
    apiKey: 'AIzaSyC2wBCjM1c8bX8VQP4vQbE_q-KoBrRY_vc',
    authDomain: 'system-design-c84d3.firebaseapp.com',
    projectId: 'system-design-c84d3',
    storageBucket: 'system-design-c84d3.firebasestorage.app',
    messagingSenderId: '547168317115',
    appId: '1:547168317115:web:f5130cde873096b7f3839e',
  });
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  cached = { auth, provider, signInWithPopup, onAuthStateChanged, signOut };
  return cached;
}
