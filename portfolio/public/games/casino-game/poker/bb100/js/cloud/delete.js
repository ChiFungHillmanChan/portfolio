// delete.js — deletes a saved session.

import { apiCall } from "../auth/api-client.js";
import { invalidateQuotaCache } from "./quota.js";

export async function deleteSession(sessionId) {
  const r = await apiCall("delete-session", { sessionId });
  if (!r.ok) throw new Error(r.error || "delete failed");
  invalidateQuotaCache();
  return r;
}
