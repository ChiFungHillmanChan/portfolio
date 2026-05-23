// firebase-init.js — Thin re-export of the shared casino-game Firebase init.
// The canonical module lives at /calculator/js/auth/firebase-init.js so the
// whole casino-game suite shares one Firebase app + auth instance. Existing
// bb100 imports keep working unchanged.
export * from "../../../../js/auth/firebase-init.js";
