// src/components/directMessages/conversationPage.jsx
// The two-person chat view. Messages are displayed oldest→newest (we fetch
// newest-first from the API and reverse for display). The compose area sits
// at the bottom. Clicking "Reply" on any message pre-fills a quote bubble
// above the compose box.

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Reply, Trash2, Send, X } from "lucide-react";
import { useAuth } from "../auth/authContext";
import {
  fetchMessages,
  sendMessage as apiSendMessage,
  deleteMessage as apiDeleteMessage,
  markConversationRead,
} from "./directmessageapi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function Avatar({ username, avatar, size = 32 }) {
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

// ── Quote bubble — shown inside the compose box when replying ─────────────────

function QuoteBubble({ quote, onClear }) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-lg mb-2 border"
      style={{ backgroundColor: "hsl(var(--secondary))", borderColor: "hsl(var(--border))" }}
    >
      <div className="w-[3px] self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--social-500))" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "hsl(var(--social-500))" }}>
          Replying to {quote.senderName}
        </p>
        <p className="text-xs text-ink-500 truncate">
          {quote.content ?? "Deleted message"}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-ink-500 hover:text-ink-900 transition-colors flex-shrink-0 mt-0.5"
        aria-label="Cancel reply"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────

function MessageBubble({ msg, isMine, onReply, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`flex items-end gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar — only shown for other person's messages */}
      {!isMine && (
        <Avatar username={msg.senderUsername} avatar={msg.senderAvatar} size={30} />
      )}

      <div className={`max-w-[72%] sm:max-w-[60%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>

        {/* Quoted message — shown above the bubble if this is a reply */}
        {msg.quotedMessage && (
          <div
            className="flex items-start gap-1.5 mb-1 px-3 py-1.5 rounded-lg max-w-full border"
            style={{ backgroundColor: "hsl(var(--secondary))", borderColor: "hsl(var(--border))" }}
          >
            <div className="w-[2px] self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--social-500))" }} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold mb-0.5" style={{ color: "hsl(var(--social-500))" }}>
                {msg.quotedMessage.senderName}
              </p>
              <p className="text-[11px] text-ink-500 truncate">
                {msg.quotedMessage.content ?? "Deleted message"}
              </p>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div
          className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words"
          style={
            isMine
              ? { backgroundColor: "hsl(var(--social-500))", color: "white", borderBottomRightRadius: 4 }
              : { backgroundColor: "hsl(var(--card))", color: "hsl(var(--ink-900))", border: "1px solid hsl(var(--border))", borderBottomLeftRadius: 4 }
          }
        >
          {msg.isDeleted
            ? <span className="italic" style={{ opacity: 0.6 }}>Message deleted</span>
            : msg.content}
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-ink-500 mt-1 px-1">{formatTime(msg.createdAt)}</p>
      </div>

      {/* Action buttons — appear on hover */}
      {!msg.isDeleted && (
        <div
          className={`flex items-center gap-1 transition-opacity ${hovered ? "opacity-100" : "opacity-0"} ${isMine ? "flex-row-reverse" : ""}`}
        >
          <button
            type="button"
            onClick={() => onReply(msg)}
            className="p-1.5 rounded-lg text-ink-500 hover:text-social-500 hover:bg-secondary transition-colors"
            title="Reply"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          {isMine && (
            <button
              type="button"
              onClick={() => onDelete(msg.id)}
              className="p-1.5 rounded-lg text-ink-500 transition-colors"
              style={{ }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--highlight-500))"; e.currentTarget.style.backgroundColor = "hsl(var(--highlight-100))"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = ""; e.currentTarget.style.backgroundColor = ""; }}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Date divider between messages on different days ───────────────────────────

function DateDivider({ date }) {
  const label = (() => {
    const d = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  })();

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500 flex-shrink-0">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const { conversationId } = useParams();
  const convId = parseInt(conversationId, 10);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState("");

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // The message the user clicked "Reply" on — null means composing fresh
  const [replyTo, setReplyTo] = useState(null);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Load initial messages ─────────────────────────────────────────────────

  useEffect(() => {
    if (!user || isNaN(convId)) return;
    setLoading(true);
    fetchMessages(convId)
      .then((data) => {
        // API returns newest-first; we reverse to show oldest at top
        setMessages([...(data.messages ?? [])].reverse());
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      })
      .catch((err) => setError(err.message ?? "Couldn't load conversation."))
      .finally(() => setLoading(false));

    // Mark this conversation as read so the sidebar badge clears immediately.
    // Fire-and-forget — a failure here is not worth surfacing to the user.
    markConversationRead(convId).catch(() => {});
  }, [user, convId]);

  // Scroll to bottom after first load
  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loading]);

  // ── Load older messages ───────────────────────────────────────────────────

  async function loadMore() {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await fetchMessages(convId, { beforeId: nextCursor });
      const older = [...(data.messages ?? [])].reverse();
      setMessages((prev) => [...older, ...prev]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // silently ignore — user can try again
    } finally {
      setLoadingMore(false);
    }
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setSendError("");
    try {
      const newMsg = await apiSendMessage(convId, {
        content,
        quotedMessageId: replyTo?.id,
      });
      setMessages((prev) => [...prev, newMsg]);
      setDraft("");
      setReplyTo(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      // Scroll to bottom after sending
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setSendError(err.message ?? "Couldn't send message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    // Send on Enter (not Shift+Enter)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(messageId) {
    try {
      await apiDeleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: null } : m
        )
      );
    } catch {
      // silently ignore — edge case
    }
  }

  // ── Reply ─────────────────────────────────────────────────────────────────

  function handleReply(msg) {
    setReplyTo({
      id:         msg.id,
      senderName: msg.senderUsername,
      content:    msg.content,
    });
    textareaRef.current?.focus();
  }

  // ── Group messages by date for dividers ───────────────────────────────────

  function groupedMessages() {
    const groups = [];
    let lastDate = null;
    for (const msg of messages) {
      const dateStr = new Date(msg.createdAt).toDateString();
      if (dateStr !== lastDate) {
        groups.push({ type: "date", date: msg.createdAt, key: `d-${msg.id}` });
        lastDate = dateStr;
      }
      groups.push({ type: "message", msg, key: msg.id });
    }
    return groups;
  }

  // Try to derive the other user's name from messages
  const otherUserFromMessages = messages.find((m) => m.senderId !== user?.id);
  const otherName = otherUserFromMessages?.senderUsername ?? "Conversation";
  const otherAvatar = otherUserFromMessages?.senderAvatar ?? null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-3.6875rem)] bg-background">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 bg-card border-b border-border flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate("/messages")}
          className="p-1.5 -ml-1 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-secondary transition-colors"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>

        <Avatar username={otherName} avatar={otherAvatar} size={36} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900 leading-tight truncate">{otherName}</p>
          <p className="text-[11px] text-ink-500">Private message</p>
        </div>
      </div>

      {/* ── Message list ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs font-semibold hover:underline disabled:opacity-50"
              style={{ color: "hsl(var(--social-500))" }}
            >
              {loadingMore ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 animate-pulse" />
                <div className="h-10 rounded-2xl bg-secondary animate-pulse" style={{ width: `${100 + i * 40}px` }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "hsl(var(--highlight-500))" }}>{error}</p>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <p className="text-sm text-ink-500">No messages yet. Say hello!</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {groupedMessages().map((item) =>
              item.type === "date" ? (
                <DateDivider key={item.key} date={item.date} />
              ) : (
                <MessageBubble
                  key={item.key}
                  msg={item.msg}
                  isMine={item.msg.senderId === user?.id}
                  onReply={handleReply}
                  onDelete={handleDelete}
                />
              )
            )}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Compose area ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-card border-t border-border px-4 sm:px-6 py-4">

        {/* Quote bubble when replying */}
        {replyTo && (
          <QuoteBubble
            quote={replyTo}
            onClear={() => setReplyTo(null)}
          />
        )}

        {sendError && (
          <p className="text-xs mb-2" style={{ color: "hsl(var(--highlight-500))" }}>{sendError}</p>
        )}

        {/* Compact single-line compose box — grows a little as you type,
            same shape as before, just dark-theme colors. */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl border bg-background text-ink-900 placeholder:text-ink-500 px-3.5 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 transition-colors"
            style={{
              minHeight: 42,
              maxHeight: 120,
              borderColor: "hsl(var(--border))",
              "--tw-ring-color": "hsl(var(--social-500))",
            }}
            onFocus={(e) => (e.target.style.borderColor = "hsl(var(--social-500))")}
            onBlur={(e) => (e.target.style.borderColor = "hsl(var(--border))")}
            onInput={(e) => {
              // Auto-grow
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
            style={{
              backgroundColor: draft.trim() ? "hsl(var(--social-500))" : "hsl(var(--secondary))",
              color: draft.trim() ? "white" : "hsl(var(--ink-500))",
            }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[10px] text-ink-500 mt-1.5 px-1">Shift + Enter for a new line</p>
      </div>
    </div>
  );
}