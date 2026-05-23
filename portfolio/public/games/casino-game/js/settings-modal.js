// settings-modal.js — Global Settings entry for every casino-game page.
//
// At load time:
//   1. Injects a "Settings" item into the hamburger dropdown (under "Support Me").
//   2. Injects a modal with an empty `.auth-slot` into <body>.
//   3. auth-ui.js (imported below) discovers the slot via `.auth-slot` and
//      renders the sign-in / signed-in pill there.
//
// Firebase Auth state is persisted in IndexedDB, so signing in here (or in
// the bb100 settings drawer) signs you in across every page on this origin.

import "./auth/auth-ui.js";
import { refreshAuthSlots } from "./auth/auth-ui.js";

const MODAL_ID = "globalSettingsModal";
const ITEM_CLASS = "settings-item";
const OPEN_CLASS = "is-open";

const SETTINGS_ICON_SVG = `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

const CLOSE_ICON_SVG = `<svg class="ui-svg-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;

function injectDropdownItem() {
  const dropdown = document.getElementById("dropdownMenu");
  if (!dropdown) return false;
  // Don't inject twice if this script accidentally loads twice.
  if (dropdown.querySelector("." + ITEM_CLASS)) return true;

  // Find the section that contains "Support Me" (the support-item). We add
  // the new Settings entry as the LAST child of that same section.
  const supportItem = dropdown.querySelector(".support-item");
  const section = supportItem ? supportItem.closest(".dropdown-section") : null;
  const targetSection = section || dropdown.querySelector(".dropdown-section:last-child") || dropdown;

  const item = document.createElement("button");
  item.type = "button";
  item.className = "dropdown-item " + ITEM_CLASS;
  item.setAttribute("aria-haspopup", "dialog");
  item.innerHTML = `
    <span class="dropdown-icon">${SETTINGS_ICON_SVG}</span>
    <span>Settings</span>
  `;
  item.addEventListener("click", (e) => {
    e.preventDefault();
    openModal();
    // Close the dropdown if the page's hamburger script exposes its toggle.
    const hb = document.getElementById("hamburgerBtn");
    const dd = document.getElementById("dropdownMenu");
    if (hb && dd && dd.classList.contains("open")) {
      hb.setAttribute("aria-expanded", "false");
      dd.classList.remove("open");
      dd.setAttribute("aria-hidden", "true");
    }
  });
  targetSection.appendChild(item);
  return true;
}

function injectModal() {
  if (document.getElementById(MODAL_ID)) return;
  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "global-settings-modal";
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="global-settings-backdrop" data-global-settings-close></div>
    <div class="global-settings-panel" role="dialog" aria-modal="true" aria-labelledby="globalSettingsTitle">
      <div class="global-settings-header">
        <h2 id="globalSettingsTitle">Settings</h2>
        <button type="button" class="global-settings-close" data-global-settings-close aria-label="Close settings">${CLOSE_ICON_SVG}</button>
      </div>
      <div class="global-settings-body">
        <section class="global-settings-section">
          <h3 class="global-settings-section-title">Account</h3>
          <div class="auth-slot" id="globalAuthSlot"></div>
          <p class="global-settings-hint">Signs in across every casino-game tool. The Hand Recorder uses this to sync your saved sessions.</p>
        </section>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (target.closest && target.closest("[data-global-settings-close]")) {
      closeModal();
    }
  });
}

function openModal() {
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => modal.classList.add(OPEN_CLASS));
  document.body.classList.add("global-settings-open");
  // Slot is freshly in the DOM (or unchanged) — re-render auth UI into it.
  refreshAuthSlots();
}

function closeModal() {
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;
  modal.classList.remove(OPEN_CLASS);
  document.body.classList.remove("global-settings-open");
  setTimeout(() => {
    if (!modal.classList.contains(OPEN_CLASS)) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }
  }, 220);
}

function init() {
  injectModal();
  injectDropdownItem();
  // Auth UI may have already registered its onAuthStateChanged listener;
  // ensure the slot we just added gets its current state.
  refreshAuthSlots();
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const m = document.getElementById(MODAL_ID);
      if (m && m.classList.contains(OPEN_CLASS)) closeModal();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
