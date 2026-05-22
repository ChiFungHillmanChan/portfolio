// firebase-init.js — Firebase init for casino-game poker bb100
// Uses the same project as system-design-c84d3. Web config is public-key
// material by design; security is enforced by Firebase Auth ID-token
// verification + Firestore security rules + Lambda token verification.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2wBCjM1c8bX8VQP4vQbE_q-KoBrRY_vc",
  authDomain: "system-design-c84d3.firebaseapp.com",
  projectId: "system-design-c84d3",
  storageBucket: "system-design-c84d3.firebasestorage.app",
  messagingSenderId: "547168317115",
  appId: "1:547168317115:web:f5130cde873096b7f3839e",
};

export const POKER_API_BASE = "https://api.system-design.hillmanchan.com";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
