// firebase-init.js — Shared Firebase init for the whole casino-game suite.
//
// Same project as system-design-c84d3. Firebase Auth state persists in
// IndexedDB, so signing in here (or in any sub-game) signs you in everywhere
// inside the casino-game origin. The hand recorder (bb100) re-exports from
// this file so it keeps working unchanged.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
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

// Guard against double-init when bb100 (which re-exports this) and the global
// settings modal both load it on the same page.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
