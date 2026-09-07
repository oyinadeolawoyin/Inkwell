// src/components/workspace/workspaceApi.js
import API_URL from "../../config/api";

const BASE = `${API_URL}/workspace`;

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

// ── Community feeds (public — flags the caller's own row if authenticated) ─
export const getWeeklyTargetFeed = () => request("/weekly-target", { method: "GET" });
export const getWeeklyWinners    = () => request("/weekly-winners", { method: "GET" }); // writers who've hit their weekly target this week — shown Sundays only
export const getDraftPlanFeed    = () => request("/draftplan-feed", { method: "GET" });
export const getWorkspaceFeed    = () => request("/",               { method: "GET" }); // "writing today" — writers who've already logged/sprinted today
export const getFinishedDrafts   = () => request("/finished-drafts", { method: "GET" }); // writers who've completed a draft plan recently
export const getTopStreaks       = () => request("/top-streaks",    { method: "GET" }); // top 6 current streaks, 6-day minimum

// ── Own stats / profile (authenticated) ─────────────────────────────────
export const getMyStats          = () => request("/me/stats", { method: "GET" });
// Lightweight — just the single plan the dashboard's weekly-target ring
// spotlights. getMyStats() already includes this under `weeklyGoalPlan`;
// this is here for callers that only need the ring, not streaks/history too.
export const getMyWeeklyGoalPlan = () => request("/me/weekly-goal-plan", { method: "GET" });
export const getMyProfile        = () => request("/me/profile", { method: "GET" });
export const updateMyProfile     = (payload) => request("/me/profile", { method: "PATCH", body: JSON.stringify(payload) });

// Day-by-day words/chapters/scenes for the workspace activity graph.
export const getMyActivitySeries = (days = 30) => request(`/me/activity-series?days=${days}`, { method: "GET" });

// "Send card" on a workspace member who's already written today.
// cardType: "WELL_DONE" | "CONGRATS"
export const sendCard = (toUserId, cardType) => request("/send-card", { method: "POST", body: JSON.stringify({ toUserId, cardType }) });