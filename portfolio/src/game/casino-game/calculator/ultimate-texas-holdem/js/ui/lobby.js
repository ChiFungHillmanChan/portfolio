// lobby.js — Ultimate Texas Hold'em landing page: sign-in gate + create/join.

import { auth, googleProvider } from "../../../js/auth/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { uthCall } from "../net/uth-api.js";

const authGate = document.getElementById("authGate");
const playPanel = document.getElementById("playPanel");
const signInBtn = document.getElementById("signInBtn");
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

onAuthStateChanged(auth, (user) => {
  authGate.hidden = !!user;
  playPanel.hidden = !user;
});

signInBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") showError(err.code || "sign-in-failed");
  }
});

createBtn.addEventListener("click", async () => {
  clearError();
  createBtn.disabled = true;
  createBtn.textContent = "Creating…";
  try {
    const { code } = await uthCall("create-table");
    location.href = `table.html?code=${encodeURIComponent(code)}`;
  } catch (err) {
    showError(err.code || err.message);
    createBtn.disabled = false;
    createBtn.textContent = "Create Table";
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
    await uthCall("join-table", { code });
    location.href = `table.html?code=${encodeURIComponent(code)}`;
  } catch (err) {
    if (err.code === "already-seated") {
      // rejoining your own table is fine — just open it
      location.href = `table.html?code=${encodeURIComponent(code)}`;
      return;
    }
    showError(err.code || err.message);
    btn.disabled = false;
  }
});
