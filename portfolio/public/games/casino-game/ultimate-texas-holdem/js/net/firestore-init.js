// firestore-init.js — Firestore client init for Ultimate Texas Hold'em ONLY.
//
// The shared auth/firebase-init.js deliberately does NOT initialise Firestore
// (the poker pages talk to Firestore exclusively through the Lambda). UTH is
// the one place clients hold live listeners, so the SDK is loaded here and
// only pages under /ultimate-texas-holdem/ import it.

import { app } from "../../../js/auth/firebase-init.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export const db = getFirestore(app);
