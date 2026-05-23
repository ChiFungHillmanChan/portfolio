// auth-ui.js — Renders the sign-in button / signed-in user pill into any
// element that carries class `.auth-slot` (the bb100 settings drawer uses
// `id="authSlot"` which also has class `auth-slot`; the global Settings
// modal injects an `.auth-slot` div too). Subscribes once to
// `onAuthStateChanged` and updates every slot it can find.

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth, googleProvider } from "./firebase-init.js";

const LEGACY_SLOT_ID = "authSlot";
const SLOT_SELECTOR = ".auth-slot";
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

async function doSignIn(buttonEl) {
  if (buttonEl) buttonEl.disabled = true;
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error("[casino auth] sign-in failed:", err);
    alert("Sign-in failed: " + (err.code || err.message));
  } finally {
    if (buttonEl) buttonEl.disabled = false;
  }
}

function renderSignedOut(slot) {
  slot.replaceChildren(
    el("button", {
      class: "auth-signin-btn",
      type: "button",
      onclick: (e) => doSignIn(e.currentTarget),
    }, ["Sign in with Google"])
  );
}

function renderSignedIn(slot, user) {
  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();
  const avatar = user.photoURL
    ? el("img", { src: user.photoURL, alt: "", referrerpolicy: "no-referrer" })
    : el("span", { class: "auth-avatar-fallback" }, [initial]);

  const detail = el("div", { class: "auth-user-detail" }, [
    el("div", { class: "auth-user-name" }, [user.displayName || "Signed in"]),
    user.email ? el("div", { class: "auth-user-email" }, [user.email]) : document.createTextNode(""),
  ]);

  slot.replaceChildren(
    el("div", { class: "auth-user-pill" }, [avatar, detail]),
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

function getAllSlots() {
  const slots = new Set();
  document.querySelectorAll(SLOT_SELECTOR).forEach((s) => slots.add(s));
  const legacy = document.getElementById(LEGACY_SLOT_ID);
  if (legacy) slots.add(legacy);
  return Array.from(slots);
}

let lastUser = undefined;

function renderAll(user) {
  lastUser = user;
  const slots = getAllSlots();
  if (slots.length === 0) return;
  for (const slot of slots) {
    if (user) renderSignedIn(slot, user);
    else renderSignedOut(slot);
  }
  setSessionsTabVisible(!!user);
}

// Public: re-render into any slots that appeared later (e.g. settings modal
// mounted after auth-ui already ran). Safe to call repeatedly.
export function refreshAuthSlots() {
  if (lastUser !== undefined) renderAll(lastUser);
}

function init() {
  onAuthStateChanged(auth, (user) => renderAll(user));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
