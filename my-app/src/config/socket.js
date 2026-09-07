// src/config/socket.js
//
// Single shared socket.io connection for the whole app — same idea as
// api.js's API_URL: one source of truth, everything else imports from
// here instead of each feature standing up its own connection.
//
// Auth: the backend (see server's socket index.js) reads the JWT straight
// off the request cookie during the handshake, same as authenticateJWT
// does for REST — so this just needs withCredentials so that cookie
// actually gets sent, no token wiring on this side at all.
//
// autoConnect is off on purpose: most pages never touch a socket, so
// there's no reason to open a connection app-wide on load. Whichever
// feature needs it (e.g. the Sprint Room) calls connectSocket() when it
// mounts and disconnectSocket() when it unmounts.
import { io } from "socket.io-client";
import API_URL from "./api";

// API_URL points at the API path (e.g. "https://api.example.com/api") —
// socket.io connects to the server's origin, not a REST path, so strip
// down to just protocol+host+port.
const SOCKET_URL = new URL(API_URL).origin;

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
});

export function connectSocket() {
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket.disconnect();
}

export default socket;