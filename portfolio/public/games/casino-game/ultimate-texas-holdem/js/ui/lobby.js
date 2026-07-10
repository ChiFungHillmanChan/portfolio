// lobby.js — Ultimate Texas Hold'em landing page.
//
// Play Solo is a plain <a href="table.html?code=SOLO"> — fully local, no
// sign-in, works before this module even loads. Only Create/Join talk to
// Firebase + the Lambda, and they prompt for Google sign-in on demand.

import { auth, googleProvider } from "../../../js/auth/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { uthCall } from "../net/uth-api.js";
import { strategyPanelHtml, isCoachOn, setCoachOn } from "./strategy-panel.js";

// ── UTH section inside the global casino Settings modal ─────────────────────
// (hamburger → Settings). settings-modal.js injects the modal before this
// module evaluates; the DOMContentLoaded fallback covers a slow path.

function injectSettingsSection() {
  const body = document.querySelector("#globalSettingsModal .global-settings-body");
  if (!body || body.querySelector(".uth-settings")) return;
  const section = document.createElement("section");
  section.className = "global-settings-section";
  section.innerHTML = `
    <h3 class="global-settings-section-title">Ultimate Texas Hold'em</h3>
    ${strategyPanelHtml(isCoachOn())}
  `;
  body.appendChild(section);
  section.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="coach-toggle"]');
    if (!btn) return;
    const on = !isCoachOn();
    setCoachOn(on);
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-checked", String(on));
  });
}

injectSettingsSection();
document.addEventListener("DOMContentLoaded", injectSettingsSection);

const createBtn = document.getElementById("createBtn");
const joinForm = document.getElementById("joinForm");
const joinCode = document.getElementById("joinCode");
const errorEl = document.getElementById("lobbyError");

const ERROR_COPY = {
  "no-table": "Table not found — check the code with your friend.",
  "table-full": "That table is full (6 seats max).",
  "bad-code": "Room codes are 4 letters/numbers, e.g. 8K3F.",
  "table-closed": "That table is closed.",
  "not-signed-in": "Please sign in first.",
};

function showError(codeOrMsg) {
  errorEl.textContent = ERROR_COPY[codeOrMsg] || `Something went wrong (${codeOrMsg}). Please try again.`;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
}

// Resolves once Firebase has restored (or ruled out) a persisted session, so
// we never flash a sign-in popup at someone who's already signed in.
const authReady = new Promise((resolve) => {
  const un = onAuthStateChanged(auth, () => {
    un();
    resolve();
  });
});

async function ensureSignedIn() {
  await authReady;
  if (auth.currentUser) return true;
  try {
    await signInWithPopup(auth, googleProvider);
    return true;
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") showError(err.code || "sign-in-failed");
    return false;
  }
}

createBtn.addEventListener("click", async () => {
  clearError();
  createBtn.disabled = true;
  createBtn.textContent = "Signing in…";
  try {
    if (!(await ensureSignedIn())) return;
    createBtn.textContent = "Creating…";
    const { code } = await uthCall("create-table");
    location.href = `table.html?code=${encodeURIComponent(code)}&invite=1`;
  } catch (err) {
    showError(err.code || err.message);
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Create & Invite";
  }
});

joinCode.addEventListener("input", () => {
  joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
});

joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const code = joinCode.value.trim().toUpperCase().replace(/^UTH-/, "");
  if (!code) return;
  const btn = joinForm.querySelector("button");
  btn.disabled = true;
  try {
    if (!(await ensureSignedIn())) return;
    await uthCall("join-table", { code });
    location.href = `table.html?code=${encodeURIComponent(code)}`;
  } catch (err) {
    if (err.code === "already-seated") {
      // rejoining your own table is fine — just open it
      location.href = `table.html?code=${encodeURIComponent(code)}`;
      return;
    }
    showError(err.code || err.message);
  } finally {
    btn.disabled = false;
  }
});
