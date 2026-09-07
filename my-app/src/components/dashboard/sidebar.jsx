// src/components/dashboard/sidebar.jsx

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { LayoutDashboard, Mail, Inbox, Bell, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/authContext";
import { useProfileModal } from "../profile/profilemodalcontext";
import { getMailboxUnreadCount } from "../mailbox/mailboxApi";
import { getMessagesUnreadCount } from "../message/directmessageapi";
import API_URL from "@/config/api";

// ── Nav structure — just the four requested destinations ─────────────────────

const NAV_ITEMS = [
  { to: "/workspace",     label: "Workspace",    Icon: LayoutDashboard },
  { to: "/mailbox",       label: "Mailbox",      Icon: Mail,  badgeKey: "mailbox" },
  { to: "/messages",      label: "Inbox",        Icon: Inbox, badgeKey: "messages" },
  { to: "/notifications", label: "Notification", Icon: Bell,  badgeKey: "notifications" },
];

// ── Unread badge pill ─────────────────────────────────────────────────────────

function Badge({ count, collapsed }) {
  if (!count || count < 1) return null;
  if (collapsed) {
    return (
      <span
        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card"
        style={{ backgroundColor: "hsl(var(--highlight-500))" }}
        aria-label={`${count} unread`}
      />
    );
  }
  return (
    <span
      className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold leading-5 text-center text-white"
      style={{ backgroundColor: "hsl(var(--highlight-500))" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Nav row — bold icon in a tinted badge, active state gets a filled badge ──

function NavRow({ to, label, Icon, active, badge, collapsed }) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className="relative flex items-center gap-3 rounded-xl transition-colors group"
      style={{
        padding: collapsed ? "0.625rem" : "0.625rem 0.75rem",
        justifyContent: collapsed ? "center" : undefined,
        backgroundColor: active ? "hsl(var(--social-100))" : "transparent",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "hsl(var(--secondary))"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      {/* Icon — bold, in its own tinted badge so it reads clearly at a glance */}
      <span
        className="relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={{
          backgroundColor: active ? "hsl(var(--social-500))" : "hsl(var(--secondary))",
          color: active ? "white" : "hsl(var(--ink-500))",
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
        {collapsed && <Badge count={badge} collapsed />}
      </span>

      {!collapsed && (
        <span
          className="truncate flex-1 text-sm font-semibold"
          style={{ color: active ? "hsl(var(--ink-900))" : "hsl(var(--ink-700))" }}
        >
          {label}
        </span>
      )}
      {!collapsed && badge > 0 && <Badge count={badge} />}
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ mobileNavOpen = false, onCloseMobileNav = () => {} }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { openProfile } = useProfileModal();

  // Collapse state — persisted in localStorage so it survives refreshes
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar_collapsed") === "true"; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  // ── Unread counts ───────────────────────────────────────────────────────
  const [counts, setCounts] = useState({ messages: 0, notifications: 0, mailbox: 0 });
  const suppressUntil = useRef(0);

  const fetchCounts = useCallback(async () => {
    if (Date.now() < suppressUntil.current) return;
    try {
      // "notifications" still comes from the shared endpoint (it's the only
      // consumer of that count) — "messages" and "mailbox" each have their
      // own dedicated endpoint now, so neither depends on the shared one or
      // breaks if it ever does.
      const [notifRes, mailboxCount, messagesCount] = await Promise.all([
        fetch(`${API_URL}/notifications/unread-counts`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        getMailboxUnreadCount().catch(() => null),
        getMessagesUnreadCount().catch(() => null),
      ]);
      setCounts((prev) => ({
        messages:      messagesCount?.count    ?? prev.messages,
        notifications: notifRes?.notifications ?? prev.notifications,
        mailbox:       mailboxCount?.count      ?? prev.mailbox,
      }));
    } catch {
      // silently ignore — counts aren't critical
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    window.addEventListener("focus", fetchCounts);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchCounts);
    };
  }, [fetchCounts]);

  useEffect(() => {
    if (pathname === "/messages" || pathname.startsWith("/messages/")) {
      setCounts((prev) => ({ ...prev, messages: 0 }));
      suppressUntil.current = Date.now() + 5_000;
    }
    if (pathname === "/notifications") {
      setCounts((prev) => ({ ...prev, notifications: 0 }));
      suppressUntil.current = Date.now() + 5_000;
    }
    if (pathname === "/mailbox") {
      setCounts((prev) => ({ ...prev, mailbox: 0 }));
      suppressUntil.current = Date.now() + 5_000;
    }
  }, [pathname]);

  function isActive(to) {
    return pathname === to || pathname.startsWith(to + "/");
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
    onCloseMobileNav();
  }

  const navContent = (collapsed) => (
    <>
      <nav className="flex-1 overflow-y-auto pt-4 pb-4" style={{ padding: collapsed ? "1rem 0.5rem" : "1rem 0.75rem" }} onClick={onCloseMobileNav}>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavRow
              key={item.to}
              {...item}
              active={isActive(item.to)}
              badge={item.badgeKey ? (counts[item.badgeKey] ?? 0) : 0}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* ── Profile footer — click the avatar to open the profile popup ───── */}
      <div
        className="flex-shrink-0 pb-8"
        style={{ padding: collapsed ? "0.75rem 0.5rem 2rem" : "0.75rem 0.75rem 2rem", boxShadow: "0 -4px 10px -6px rgba(0,0,0,0.5)" }}
      >
        <button
          type="button"
          onClick={() => { openProfile(user?.id); onCloseMobileNav(); }}
          title={collapsed ? user?.username : undefined}
          className="w-full flex items-center gap-3 rounded-xl transition-colors hover:bg-secondary"
          style={{
            padding: collapsed ? "0.5rem" : "0.5rem 0.625rem",
            justifyContent: collapsed ? "center" : undefined,
          }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display font-semibold text-xs"
              style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
            >
              {(user?.username || "?").charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <span className="text-sm font-semibold text-ink-900 truncate flex-1 text-left">
              {user?.username ?? "Profile"}
            </span>
          )}
        </button>

        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className="w-full flex items-center rounded-xl text-sm font-medium transition-colors mt-1"
          style={{
            gap: collapsed ? 0 : "0.75rem",
            padding: collapsed ? "0.625rem" : "0.625rem 0.625rem",
            justifyContent: collapsed ? "center" : undefined,
            color: "hsl(var(--highlight-500))",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--highlight-100))")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <LogOut className="h-4 w-4" strokeWidth={2.5} />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop / tablet — collapsible */}
      <aside
        className="hidden sm:flex flex-col h-[calc(100vh-3.6875rem)] sticky top-[3.6875rem] bg-card border-r border-border flex-shrink-0"
        style={{ width: collapsed ? "4.5rem" : "16rem", transition: "width 0.2s ease" }}
      >
        {/* Collapse toggle button */}
        <div
          className="flex flex-shrink-0 border-b border-border"
          style={{ justifyContent: collapsed ? "center" : "flex-end", padding: "0.5rem" }}
        >
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-ink-500 hover:bg-secondary hover:text-ink-900 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" strokeWidth={2.5} /> : <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        </div>

        {navContent(collapsed)}
      </aside>

      {/* Mobile — off-canvas drawer (always expanded) */}
      {mobileNavOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onCloseMobileNav}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[80vw] h-full bg-card border-r border-border flex flex-col shadow-2xl">
            {navContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}