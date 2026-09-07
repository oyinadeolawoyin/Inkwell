// src/components/draftPlan/draftPlanApi.js
//
// Multi-plan note: a writer can hold several draft plans at once now, so
// every plan-scoped endpoint below is nested under /:planId on the backend
// (see draftplanroutes.js). Every function that touches a specific plan
// takes `planId` as its first argument — callers get it from the route
// (e.g. `/draftplan/:planId`) or from getMyPlans()/the workspace's
// weekly-goal-plan spotlight.

import API_URL from "../../config/api";

const BASE = `${API_URL}/draftplan`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: options.body instanceof FormData
      ? undefined
      : { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// ── Plan list ────────────────────────────────────────────────────────────
// Every plan this writer owns — lightweight (no logs/timeline), used by the
// plan switcher and the workspace's "Draft Plans" button.
export const getMyPlans = () => request("/mine", { method: "GET" });

// ── Plan ─────────────────────────────────────────────────────────────────
export const createPlan  = (payload)          => request("/",             { method: "POST",  body: JSON.stringify(payload) });
export const getMyPlan   = (planId)           => request(`/${planId}`,    { method: "GET" });
export const updatePlan  = (planId, payload)  => request(`/${planId}`,    { method: "PATCH", body: JSON.stringify(payload) });
export const deletePlan  = (planId)           => request(`/${planId}`,    { method: "DELETE" });

// ── Timeline & history ──────────────────────────────────────────────────
export const getTimeline    = (planId)          => request(`/${planId}/timeline`, { method: "GET" });
export const getPlanHistory = (planId)          => request(`/${planId}/history`,  { method: "GET" });
export const planDay        = (planId, payload) => request(`/${planId}/day-plan`, { method: "PATCH", body: JSON.stringify(payload) });

// ── Moodboard ────────────────────────────────────────────────────────────
export function uploadMoodboardImage(planId, file) {
  const form = new FormData();
  form.append("image", file);
  return request(`/${planId}/upload-image`, { method: "POST", body: form });
}

// ── Progress ─────────────────────────────────────────────────────────────
export const logProgress = (planId, payload) => request(`/${planId}/progress`, { method: "POST", body: JSON.stringify(payload) });

// ── Bonus Quest ──────────────────────────────────────────────────────────
export const openBonusQuest        = (planId, payload = {}) => request(`/${planId}/bonus-quest`,          { method: "POST", body: JSON.stringify(payload) });
export const pickBonusQuestPrompt  = (planId, payload)       => request(`/${planId}/bonus-quest/pick`,     { method: "POST", body: JSON.stringify(payload) });
export const declineBonusQuest     = (planId, payload = {}) => request(`/${planId}/bonus-quest/decline`,  { method: "POST", body: JSON.stringify(payload) });
export const getTodaysBonusQuest   = (planId)                => request(`/${planId}/bonus-quest/today`,   { method: "GET" });
export const logBonusQuestProgress = (planId, payload)       => request(`/${planId}/bonus-quest/progress`, { method: "POST", body: JSON.stringify(payload) });