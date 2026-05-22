// auth-ui.js — renders the sign-in button / user pill in the auth slot,
// wires sign-in/out actions, and reveals the My Sessions tab on sign-in.

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth, googleProvider } from "./firebase-init.js";

const SLOT_ID = "authSlot";
const SESSIONS_TAB_SELECTOR = '[data-tab="sessions"]';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "onclick") node.addEventListener("click", v);
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function renderSignedOut(slot) {
  slot.replaceChildren(
    el("button", {
      class: "auth-signin-btn",
      type: "button",
      onclick: async (e) => {
        e.currentTarget.disabled = true;
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (err) {
          console.error("[poker auth] sign-in failed:", err);
          alert("Sign-in failed: " + (err.code || err.message));
        } finally {
          e.currentTarget.disabled = false;
        }
      },
    }, ["Sign in with Google"])
  );
}

function renderSignedIn(slot, user) {
  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();
  const avatar = user.photoURL
    ? el("img", { src: user.photoURL, alt: "", referrerpolicy: "no-referrer" })
    : el("span", { class: "auth-avatar-fallback" }, [initial]);
  slot.replaceChildren(
    el("div", { class: "auth-user-pill" }, [
      avatar,
      el("span", {}, [user.displayName || user.email || "Signed in"]),
    ]),
    el("button", {
      class: "auth-signout-btn",
      type: "button",
      onclick: () => signOut(auth),
    }, ["Sign out"])
  );
}

function setSessionsTabVisible(visible) {
  const tabBtn = document.querySelector(SESSIONS_TAB_SELECTOR);
  if (tabBtn) {
    if (visible) tabBtn.removeAttribute("hidden");
    else tabBtn.setAttribute("hidden", "");
  }
}

function init() {
  const slot = document.getElementById(SLOT_ID);
  if (!slot) {
    console.warn("[poker auth] auth slot #" + SLOT_ID + " not found in DOM");
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      renderSignedIn(slot, user);
      setSessionsTabVisible(true);
    } else {
      renderSignedOut(slot);
      setSessionsTabVisible(false);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
