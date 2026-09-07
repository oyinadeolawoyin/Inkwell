// src/components/draftPlan/dictionaryApi.js
//
// Thin client for /api/dictionary — added so LogProgressModal can
// auto-save "discovery words" to the writer's own dictionary as soon as
// they're revealed. Mirrors the request() pattern in draftPlanApi.js
// rather than importing it, so this stays a self-contained client for
// dictionaryroutes.js/dictionarycontroller.js. If you already have (or
// add) a shared fetch helper elsewhere, feel free to point this at that
// instead and delete the local copy below.

import API_URL from "../../config/api";

const BASE = `${API_URL}/dictionary`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

export const getDictionary   = (search) => request(`/${search ? `?search=${encodeURIComponent(search)}` : ""}`, { method: "GET" });
export const addEntry        = (payload) => request("/", { method: "POST", body: JSON.stringify(payload) });
export const deleteEntry     = (entryId) => request(`/${entryId}`, { method: "DELETE" });