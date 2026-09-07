// src/components/foundingWriters/foundingWritersApi.js
import API_URL from "@/config/api";

// Follow/unfollow reuse the existing profile API wrappers — see
// ../profile/profileapi.js — rather than duplicating that fetch logic here.
export { followUser as followWriter, unfollowUser as unfollowWriter } from "../profile/profileapi";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Something went wrong.");
  }
  return res.json();
}

// Public — works signed out too. isFollowing/isCurrentUser only populate
// when a valid session cookie is present (optionalJWT on the backend);
// otherwise every writer just comes back with isFollowing: false.
export function getFoundingWriters() {
  return fetch(`${API_URL}/users/founding-writers`, { credentials: "include" })
    .then(handle)
    .then((d) => d.users || []);
}