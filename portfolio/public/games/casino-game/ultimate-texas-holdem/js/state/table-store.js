// table-store.js — live Firestore subscriptions for one UTH table.
//
// Security rules only allow reading uthTables/{code} while your uid is in
// seatUids, so callers must have JOINED (via the Lambda) before watching.

import { db } from "../net/firestore-init.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// watchTable(code, uid, {onTable, onMyCards, onError}) → unsubscribe()
export function watchTable(code, uid, { onTable, onMyCards, onError }) {
  const stopTable = onSnapshot(
    doc(db, "uthTables", code),
    (snap) => {
      if (!snap.exists()) {
        onError?.({ code: "no-table" });
        return;
      }
      onTable(snap.data());
    },
    (err) => onError?.(err)
  );
  const stopCards = onSnapshot(
    doc(db, "uthTables", code, "private", uid),
    (snap) => onMyCards(snap.exists() ? snap.data() : null),
    (err) => onError?.(err)
  );
  return () => {
    stopTable();
    stopCards();
  };
}
