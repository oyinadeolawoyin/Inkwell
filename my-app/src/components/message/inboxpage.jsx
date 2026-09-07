// src/components/directMessages/inboxPage.jsx
// Lists all conversations the logged-in user has, sorted by latest message.
// Clicking a row navigates to /messages/:conversationId.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/authContext";
import { fetchConversations } from "./directmessageapi";
import { AppMetaTags } from "../utilis/metatags";

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ username, avatar, size = 40 }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-display font-semibold"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        backgroundColor: "hsl(var(--social-500))", color: "white",
      }}
    >
      {username?.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyInbox() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "hsl(var(--social-100))" }}
      >
        <Mail className="h-6 w-6" style={{ color: "hsl(var(--social-500))" }} />
      </div>
      <h2 className="font-display text-ink-900 text-lg font-semibold mb-1">No messages yet</h2>
      <p className="text-sm text-ink-500 mb-5 max-w-[280px]">
        Get back to your workspace — messages will show up here as they come in.
      </p>
      <button
        onClick={() => navigate("/workspace")}
        className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "hsl(var(--social-500))" }}
      >
        Go to workspace
      </button>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchConversations()
      .then(setConversations)
      .catch((err) => setError(err.message ?? "Couldn't load messages."))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="min-h-full bg-background max-w-[680px] mx-auto px-4 sm:px-6 pt-7 pb-16">
      <AppMetaTags title="Inbox" description="Your private messages on Quillweave." />
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: "hsl(var(--social-500))" }}>
          Private messages
        </p>
        <h1 className="font-display text-ink-900 text-2xl sm:text-[28px] font-semibold leading-tight">
          Inbox
        </h1>
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 bg-secondary rounded" />
                <div className="h-3 w-48 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "hsl(var(--highlight-100))", color: "hsl(var(--highlight-700))" }}>
          {error}
        </div>
      )}

      {!loading && !error && conversations.length === 0 && <EmptyInbox />}

      {!loading && !error && conversations.length > 0 && (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              to={`/messages/${c.id}`}
              className="flex items-center gap-3 bg-card rounded-2xl border border-border px-4 py-3.5 hover:border-social-500 hover:shadow-sm transition-all group"
            >
              <div className="relative flex-shrink-0">
                <Avatar username={c.otherUser?.username} avatar={c.otherUser?.avatar} size={42} />
                {c.unread && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
                    style={{ backgroundColor: "hsl(var(--social-500))" }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900 truncate group-hover:text-social-500 transition-colors">
                    {c.otherUser?.username ?? "Deleted user"}
                  </p>
                  <span className="text-[11px] text-ink-500 flex-shrink-0 flex items-center gap-1.5">
                    {c.unread && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "hsl(var(--social-500))" }}
                      />
                    )}
                    {timeAgo(c.lastMessage?.createdAt ?? c.updatedAt)}
                  </span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${c.unread ? "text-ink-900 font-medium" : "text-ink-500"}`}>
                  {c.lastMessage
                    ? c.lastMessage.content === null
                      ? "Message deleted"
                      : (c.lastMessage.senderId === user?.id ? "You: " : "") + c.lastMessage.content
                    : "No messages yet"}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}