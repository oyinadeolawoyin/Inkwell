// src/components/mailbox/mailboxApi.js
import API_URL from "../../config/api";

const BASE = `${API_URL}/mailbox`;

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

export const getReceivedCards = (before) =>
  request(`/received${before ? `?before=${encodeURIComponent(before)}` : ""}`, { method: "GET" });

export const getSentCards = (before) =>
  request(`/sent${before ? `?before=${encodeURIComponent(before)}` : ""}`, { method: "GET" });

export const getMailboxUnreadCount = () => request("/unread-count", { method: "GET" });

// type: "THANK_YOU" | "WELL_DONE" | "CONGRATS" | "WELCOME" — note is required.
export const sendMailboxCard = (recipientId, type, note) =>
  request("/cards", { method: "POST", body: JSON.stringify({ recipientId, type, note }) });

export const markCardRead = (cardId) =>
  request(`/cards/${cardId}/read`, { method: "POST" });