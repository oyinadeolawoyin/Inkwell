// src/components/profile/profileApi.js
//
// Thin fetch wrappers around /api/profile/* — mirrors the fetch style used
// elsewhere in the app (API_URL + credentials: "include", throw Error(message)
// on a non-ok response).

import API_URL from "@/config/api";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Something went wrong.");
  }
  return res.json();
}

export function getProfile(userId) {
  return fetch(`${API_URL}/profile/${userId}`, { credentials: "include" }).then(handle);
}

export function followUser(userId) {
  return fetch(`${API_URL}/profile/${userId}/follow`, {
    method: "POST",
    credentials: "include",
  }).then(handle);
}

export function unfollowUser(userId) {
  return fetch(`${API_URL}/profile/${userId}/follow`, {
    method: "DELETE",
    credentials: "include",
  }).then(handle);
}

export function likeProfile(userId) {
  return fetch(`${API_URL}/profile/${userId}/like`, {
    method: "POST",
    credentials: "include",
  }).then(handle);
}

export function unlikeProfile(userId) {
  return fetch(`${API_URL}/profile/${userId}/like`, {
    method: "DELETE",
    credentials: "include",
  }).then(handle);
}

export function getFollowers(userId, { limit, cursor } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return fetch(`${API_URL}/profile/${userId}/followers${qs}`, { credentials: "include" }).then(handle);
}

export function getFollowing(userId, { limit, cursor } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return fetch(`${API_URL}/profile/${userId}/following${qs}`, { credentials: "include" }).then(handle);
}

// country / genre / funFact / favoriteSprintTime / favoriteSprintDays /
// allowAskMeAnything — only send the keys you're actually changing.
export function updateProfileExtras(updates) {
  return fetch(`${API_URL}/profile/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }).then(handle);
}