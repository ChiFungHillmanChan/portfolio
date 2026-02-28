import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// All values injected at build time via VITE_ env vars.
// Build will succeed but Firebase will fail at runtime if any are missing —
// this is intentional so misconfigured deploys surface immediately.
//
// authDomain uses the custom domain instead of the default
// *.firebaseapp.com domain to avoid API_KEY_HTTP_REFERRER_BLOCKED errors
// during Google sign-in. The auth popup/redirect iframe inherits the
// authDomain as its referrer, which must be whitelisted in the API key's
// HTTP referrer restrictions.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'system-design.hillmanchan.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error('Missing VITE_FIREBASE_API_KEY — check your .env file');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
