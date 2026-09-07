// src/App.jsx
//
// The root "/" route. Logged-in users skip straight to their Workspace —
// the profile page is no longer a primary destination now that profiles
// open as a popup (see profileModal.jsx) from the sidebar's avatar,
// Workspace, Sprint Room, and Mailbox. A visitor with no account lands on
// About instead — that page has its own "Log in" / "Create your account"
// CTAs throughout, so there's no separate redirect-to-login step here;
// About *is* the invitation.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";
import About from "./components/about/about";

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? user?._id;

  useEffect(() => {
    if (userId) {
      navigate(`/workspace`, { replace: true });
    }
  }, [userId, navigate]);

  // Signed-in: render nothing while the redirect above fires, so there's
  // no About-page flash before landing on the workspace.
  if (userId) return null;

  // Signed-out: this *is* the page — no navigate() call, just the
  // landing page itself.
  return <About />;
}