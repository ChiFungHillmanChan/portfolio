// admin-panel.js — Renders the admin dashboard inside the global Settings
// modal. Mounted on demand only when the signed-in user's Firestore doc
// has superadmin === true; the server re-checks superadmin on every API
// call, so this UI-side gate is just to hide the controls from non-admins.

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { auth, db } from "../auth/firebase-init.js";
import { fetchAdminStats, fetchAdminUsers, setUserPlan } from "./admin-api.js";
import { GAME_PLANS } from "./games-registry.js";

const SECTION_ID = "globalAdminSection";

let currentUser = null;
let isSuperadmin = false;
let statsCache = null;
let userListState = {
  loading: false,
  users: [],
  nextPageToken: null,
  emailQuery: "",
  hasMore: true,
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function fmtNumber(n) {
  return Number(n || 0).toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return iso;
  }
}

// ── Stats card ──────────────────────────────────────────────────────────────
function renderStatsCard(container) {
  const card = el("div", { class: "admin-stats-card" });
  if (!statsCache) {
    card.appendChild(el("div", { class: "admin-stats-loading" }, ["Loading stats…"]));
    container.replaceChildren(card);
    return;
  }
  if (statsCache.error) {
    card.appendChild(
      el("div", { class: "admin-stats-error" }, [
        `Stats failed: ${statsCache.error}`,
      ])
    );
    container.replaceChildren(card);
    return;
  }

  const total = statsCache.total;
  const byPlan = statsCache.byPlan || {};

  card.appendChild(
    el("div", { class: "admin-stat-row admin-stat-total" }, [
      el("div", { class: "admin-stat-label" }, ["Total users signed in"]),
      el("div", { class: "admin-stat-value" }, [fmtNumber(total)]),
    ])
  );

  for (const game of GAME_PLANS) {
    const counts = byPlan[game.id] || {};
    const row = el("div", { class: "admin-stat-row" }, [
      el("div", { class: "admin-stat-game-name" }, [game.label]),
    ]);
    const tierBadges = el("div", { class: "admin-stat-tiers" });
    for (const t of game.tiers) {
      const c = counts[t.id];
      tierBadges.appendChild(
        el("span", { class: `admin-tier-pill tier-${t.id}` }, [
          el("span", { class: "admin-tier-pill-label" }, [t.label]),
          el("span", { class: "admin-tier-pill-count" }, [
            c == null ? "—" : fmtNumber(c),
          ]),
        ])
      );
    }
    row.appendChild(tierBadges);
    card.appendChild(row);
  }

  container.replaceChildren(card);
}

// ── User list ───────────────────────────────────────────────────────────────
function renderUserList(container) {
  container.replaceChildren();

  const searchBar = el("div", { class: "admin-search-bar" }, [
    el("input", {
      type: "search",
      class: "admin-search-input",
      placeholder: "Filter by email substring…",
      value: userListState.emailQuery,
      onInput: (e) => {
        userListState.emailQuery = e.target.value.trim();
      },
      onKeydown: (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          reloadUsers();
        }
      },
    }),
    el(
      "button",
      {
        type: "button",
        class: "admin-search-btn",
        onClick: () => reloadUsers(),
      },
      ["Search"]
    ),
    el(
      "button",
      {
        type: "button",
        class: "admin-search-clear",
        onClick: () => {
          userListState.emailQuery = "";
          reloadUsers();
        },
      },
      ["Clear"]
    ),
  ]);
  container.appendChild(searchBar);

  const list = el("div", { class: "admin-user-list" });

  if (userListState.loading && userListState.users.length === 0) {
    list.appendChild(el("div", { class: "admin-user-loading" }, ["Loading users…"]));
  } else if (userListState.users.length === 0) {
    list.appendChild(
      el("div", { class: "admin-user-empty" }, [
        userListState.emailQuery
          ? `No users matching "${userListState.emailQuery}".`
          : "No users found.",
      ])
    );
  } else {
    for (const u of userListState.users) {
      list.appendChild(renderUserRow(u));
    }
  }
  container.appendChild(list);

  const morePending = userListState.hasMore && userListState.users.length > 0;
  if (morePending) {
    container.appendChild(
      el(
        "button",
        {
          type: "button",
          class: "admin-load-more-btn",
          disabled: userListState.loading,
          onClick: () => loadMoreUsers(),
        },
        [userListState.loading ? "Loading…" : "Load more"]
      )
    );
  }
}

function renderUserRow(user) {
  const row = el("div", { class: "admin-user-row" });

  // ── identity ──
  const idCell = el("div", { class: "admin-user-id" });
  if (user.photoURL) {
    idCell.appendChild(
      el("img", { src: user.photoURL, alt: "", referrerpolicy: "no-referrer" })
    );
  } else {
    const letter = ((user.displayName || user.email || "?") + "").charAt(0).toUpperCase();
    idCell.appendChild(el("div", { class: "admin-user-avatar-fallback" }, [letter]));
  }
  idCell.appendChild(
    el("div", { class: "admin-user-name-block" }, [
      el("div", { class: "admin-user-name" }, [
        user.displayName || "—",
        user.superadmin
          ? el("span", { class: "admin-superadmin-badge", title: "Superadmin" }, ["SUPERADMIN"])
          : null,
      ]),
      el("div", { class: "admin-user-email" }, [user.email || "—"]),
      el("div", { class: "admin-user-meta" }, [
        `last seen ${fmtDate(user.lastSeen)} · ${fmtNumber(user.signInCount || 0)} sign-ins`,
      ]),
    ])
  );
  row.appendChild(idCell);

  // ── per-game plan controls ──
  const plansCell = el("div", { class: "admin-user-plans" });
  for (const game of GAME_PLANS) {
    plansCell.appendChild(renderPlanControl(user, game));
  }
  row.appendChild(plansCell);

  return row;
}

function renderPlanControl(user, game) {
  const currentTier = (user.plans && user.plans[game.id] && user.plans[game.id].tier) || "free";
  const block = el("div", { class: "admin-plan-block" });
  block.appendChild(el("div", { class: "admin-plan-game" }, [game.label]));
  const buttons = el("div", { class: "admin-plan-buttons" });
  for (const t of game.tiers) {
    const isCurrent = t.id === currentTier;
    const btn = el(
      "button",
      {
        type: "button",
        class: `admin-plan-btn tier-${t.id}` + (isCurrent ? " is-current" : ""),
        title: t.limit,
        disabled: isCurrent,
        onClick: async () => {
          if (isCurrent) return;
          if (
            !confirm(
              `Set ${user.email}'s ${game.label} plan to "${t.label}"?\n\nLimit: ${t.limit}`
            )
          ) return;
          btn.disabled = true;
          btn.textContent = "…";
          try {
            await setUserPlan({ targetUid: user.uid, gameId: game.id, tier: t.id });
            // Local update so the UI reflects immediately without a full reload.
            if (!user.plans) user.plans = {};
            if (!user.plans[game.id]) user.plans[game.id] = {};
            user.plans[game.id].tier = t.id;
            user.plans[game.id].tierSource = "admin";
            const card = block.parentNode;
            if (card && card.parentNode) {
              card.parentNode.replaceChild(renderPlanControl(user, game), block);
            }
            // Stats may have shifted — invalidate cache so next open refetches.
            statsCache = null;
          } catch (err) {
            console.error("[admin] setUserPlan failed:", err);
            alert("Failed: " + err.message);
            btn.disabled = false;
            btn.textContent = t.label;
          }
        },
      },
      [t.label]
    );
    buttons.appendChild(btn);
  }
  block.appendChild(buttons);
  block.appendChild(el("div", { class: "admin-plan-current-hint" }, [`Currently: ${currentTier}`]));
  return block;
}

// ── Data loading ─────────────────────────────────────────────────────────────
async function loadStats(forceRefresh = false) {
  const section = document.getElementById(SECTION_ID);
  if (!section) return;
  const target = section.querySelector("[data-admin-stats]");
  if (!target) return;
  if (statsCache && !forceRefresh) {
    renderStatsCard(target);
    return;
  }
  statsCache = null;
  renderStatsCard(target);
  try {
    const data = await fetchAdminStats();
    statsCache = data;
  } catch (err) {
    statsCache = { error: err.message };
  }
  renderStatsCard(target);
}

async function reloadUsers() {
  userListState.loading = true;
  userListState.users = [];
  userListState.nextPageToken = null;
  userListState.hasMore = true;
  const section = document.getElementById(SECTION_ID);
  if (!section) return;
  const target = section.querySelector("[data-admin-users]");
  renderUserList(target);
  try {
    const r = await fetchAdminUsers({
      pageSize: 50,
      pageToken: null,
      emailQuery: userListState.emailQuery,
    });
    userListState.users = r.users || [];
    userListState.nextPageToken = r.nextPageToken;
    userListState.hasMore = !!r.nextPageToken;
  } catch (err) {
    console.error("[admin] list-users failed:", err);
    alert("List users failed: " + err.message);
    userListState.hasMore = false;
  } finally {
    userListState.loading = false;
    renderUserList(target);
  }
}

async function loadMoreUsers() {
  if (!userListState.hasMore || userListState.loading) return;
  userListState.loading = true;
  const section = document.getElementById(SECTION_ID);
  if (!section) return;
  const target = section.querySelector("[data-admin-users]");
  renderUserList(target);
  try {
    const r = await fetchAdminUsers({
      pageSize: 50,
      pageToken: userListState.nextPageToken,
      emailQuery: userListState.emailQuery,
    });
    userListState.users = userListState.users.concat(r.users || []);
    userListState.nextPageToken = r.nextPageToken;
    userListState.hasMore = !!r.nextPageToken;
  } catch (err) {
    console.error("[admin] list-users (more) failed:", err);
    alert("Load more failed: " + err.message);
    userListState.hasMore = false;
  } finally {
    userListState.loading = false;
    renderUserList(target);
  }
}

// ── Mounting ────────────────────────────────────────────────────────────────
function mountSection(modalBody) {
  if (document.getElementById(SECTION_ID)) return;
  const section = el("section", {
    id: SECTION_ID,
    class: "global-settings-section admin-section",
  }, [
    el("h3", { class: "global-settings-section-title" }, ["Admin"]),
    el("div", { class: "admin-section-blurb" }, [
      "Superadmin dashboard. Plans here are server-enforced — clients cannot self-upgrade.",
    ]),
    el("div", { class: "admin-subsection" }, [
      el("h4", { class: "admin-subsection-title" }, ["Stats"]),
      el("div", { "data-admin-stats": "" }),
    ]),
    el("div", { class: "admin-subsection" }, [
      el("h4", { class: "admin-subsection-title" }, ["Users & plans"]),
      el("div", { "data-admin-users": "" }),
    ]),
  ]);
  modalBody.appendChild(section);
}

function unmountSection() {
  const node = document.getElementById(SECTION_ID);
  if (node) node.remove();
}

async function recheckSuperadminThenMount() {
  if (!currentUser) {
    unmountSection();
    isSuperadmin = false;
    return;
  }
  // Authoritative check: read users/{uid}.superadmin from Firestore.
  // The server ALSO re-verifies on every admin-* API call, so this is the
  // belt; that is the braces.
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    isSuperadmin = snap.exists() && snap.data().superadmin === true;
  } catch (err) {
    console.warn("[admin] superadmin lookup failed:", err.message);
    isSuperadmin = false;
  }

  const modalBody = document.querySelector("#globalSettingsModal .global-settings-body");
  if (!modalBody) return;

  if (isSuperadmin) {
    mountSection(modalBody);
  } else {
    unmountSection();
  }
}

// Whenever the Settings modal opens, refresh stats + users IF superadmin.
function onSettingsOpen() {
  if (!isSuperadmin) return;
  loadStats();
  if (userListState.users.length === 0 && !userListState.loading) {
    reloadUsers();
  }
}

function init() {
  // Re-check on auth changes (sign-in / sign-out)
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    statsCache = null;
    userListState = {
      loading: false,
      users: [],
      nextPageToken: null,
      emailQuery: "",
      hasMore: true,
    };
    await recheckSuperadminThenMount();
  });

  // The settings-modal.js dispatches no custom event today, but it does
  // toggle a body class. We listen with a MutationObserver so we don't have
  // to modify the modal code.
  const observer = new MutationObserver(() => {
    if (document.body.classList.contains("global-settings-open")) {
      onSettingsOpen();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
