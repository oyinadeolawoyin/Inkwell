// src/components/sprintroom/sprintRoomApi.js
//
// Thin wrapper over sprintroomroutes.js — same request() pattern as
// draftsApi.js. No sockets here: the room is REST + a client-side heartbeat/
// poll cadence, matching how sprintroomservice.js already models presence
// (PRESENCE_STALE_MS + lastSeenAt), not a live socket channel.
import API_URL from "../../config/api";

async function request(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: options.body instanceof FormData
      ? undefined
      : { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

const SPRINT_ROOM = `${API_URL}/sprint-room`;
const SPRINT = `${API_URL}/sprint`;

// ── Room + presence ──────────────────────────────────────────────────────
export const fetchRoom = () => request(SPRINT_ROOM, "/", { method: "GET" });
export const joinRoom = (sprintRoomId) =>
  request(SPRINT_ROOM, `/${sprintRoomId}/join`, { method: "POST" });
export const heartbeatRoom = (sprintRoomId) =>
  request(SPRINT_ROOM, `/${sprintRoomId}/heartbeat`, { method: "POST" });
export const leaveRoom = (sprintRoomId) =>
  request(SPRINT_ROOM, `/${sprintRoomId}/leave`, { method: "POST" });
export const fetchRoomMembers = (sprintRoomId) =>
  request(SPRINT_ROOM, `/${sprintRoomId}/members`, { method: "GET" });

// ── Messages ──────────────────────────────────────────────────────────────
export const fetchRoomMessages = (sprintRoomId, { limit, before } = {}) => {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  if (before) params.set("before", before);
  const qs = params.toString();
  return request(SPRINT_ROOM, `/${sprintRoomId}/messages${qs ? `?${qs}` : ""}`, { method: "GET" });
};
export const postRoomMessage = (sprintRoomId, { content, quotedMessageId } = {}) =>
  request(SPRINT_ROOM, `/${sprintRoomId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, quotedMessageId }),
  });
export const deleteRoomMessage = (messageId) =>
  request(SPRINT_ROOM, `/messages/${messageId}`, { method: "DELETE" });

// ── Chat notifications (badge only — mentions/replies) ───────────────────
export const fetchUnreadChatCount = () =>
  request(SPRINT_ROOM, "/notifications/unread-count", { method: "GET" });
export const markChatNotificationsRead = () =>
  request(SPRINT_ROOM, "/notifications/read", { method: "POST" });

// ── Solo sprint (the writer's own timer/word-count run) ──────────────────
// Every writer runs their own Sprint independently (see sprintservice.js) —
// this is what the countdown timer + word count in the sprint room drive.
export const startSprint = ({ duration, startWords, draftId } = {}) =>
  request(SPRINT, "/start", {
    method: "POST",
    body: JSON.stringify({ duration, startWords, draftId }),
  });
export const checkinSprint = (sprintId, currentWordCount) =>
  request(SPRINT, `/${sprintId}/checkin`, {
    method: "POST",
    body: JSON.stringify({ currentWordCount }),
  });
export const fetchActiveSprint = () => request(SPRINT, "/active", { method: "GET" });