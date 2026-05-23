// admin-api.js — Thin wrappers around the superadmin endpoints on cg-poker.
// Every call goes through apiCall() which attaches the Firebase ID token;
// the Lambda re-verifies superadmin from Firestore on every request, so even
// if the frontend mounts the admin panel mistakenly the API will return 403.

import { apiCall } from "../auth/api-client.js";

export async function fetchAdminStats() {
  return apiCall("admin-stats", {});
}

export async function fetchAdminUsers({ pageSize = 50, pageToken = null, emailQuery = "" } = {}) {
  return apiCall("admin-list-users", { pageSize, pageToken, emailQuery });
}

export async function setUserPlan({ targetUid, gameId, tier }) {
  return apiCall("admin-set-plan", { targetUid, gameId, tier });
}
