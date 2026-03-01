import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";
import { EndGroupSprintModal, MemberCheckoutModal } from "./groupSprintModal";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(username = "") {
  return username.slice(0, 2).toUpperCase();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function playNotificationSound() {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // fallback: try again with a fresh instance
      try {
        new Audio('/notification.mp3').play().catch(() => {});
      } catch { /* silently fail */ }
    });
  } catch {
    // silently fail
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ username, avatar, isHost, size = "md" }) {
  const dim = size === "lg" ? "w-11 h-11" : size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs";
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className={`${dim} rounded-full object-cover flex-shrink-0 ${isHost ? "ring-2 ring-[#d4af37]" : ""}`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-semibold flex-shrink-0
      ${isHost ? "bg-[#d4af37] text-[#2d3748]" : "bg-[#2d3748] text-white"}`}>
      {getInitials(username)}
    </div>
  );
}

// ── Like button ───────────────────────────────────────────────────────────────
function LikeButton({ sprintId, initialCount = 0, initialLiked = false }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => nextLiked ? c + 1 : c - 1);
    try {
      const res = await fetch(`${API_URL}/sprint/${sprintId}/like`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setCount(data.likesCount);
      } else {
        setLiked(!nextLiked);
        setCount((c) => nextLiked ? c - 1 : c + 1);
      }
    } catch {
      setLiked(!nextLiked);
      setCount((c) => nextLiked ? c - 1 : c + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-all
        ${liked ? "border-red-200 bg-red-50 text-red-400" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
    >
      <span>{liked ? "♥" : "♡"}</span>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

// ── Check-in bubble ───────────────────────────────────────────────────────────
function CheckinBubble({ sprint, isHost }) {
  const user = sprint.user;
  return (
    <div className="flex items-start gap-4">
      <Link to={`/profile/${user?.username}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
        <Avatar username={user?.username} avatar={user?.avatar} isHost={isHost} size="lg" />
      </Link>
      <div className="max-w-[85%]">
        <p className="text-xs text-gray-400 mb-1.5">
          <Link to={`/profile/${user?.username}`} className="hover:text-[#2d3748] transition-colors font-medium">
            @{user?.username}
          </Link>
          {isHost && <span className="ml-1.5 text-[#d4af37]">· host</span>}
        </p>
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
          {sprint.checkin ? (
            <>
              <p className="text-xs font-semibold text-[#d4af37] uppercase tracking-wide mb-1.5">writing on</p>
              <p className="text-base text-[#2d3748] leading-relaxed">{sprint.checkin}</p>
            </>
          ) : (
            <p className="text-base text-gray-400 italic">Joined quietly</p>
          )}
          {sprint.startWordCount > 0 && (
            <p className="text-xs text-gray-400 mt-3 pt-2.5 border-t border-gray-100">
              Starting at <span className="font-medium text-[#2d3748]">{sprint.startWordCount.toLocaleString()}</span> words
            </p>
          )}
        </div>
        <div className="mt-2 ml-1">
          <LikeButton sprintId={sprint.id} initialCount={sprint._count?.likes || 0} initialLiked={sprint.userLiked || false} />
        </div>
      </div>
    </div>
  );
}

// ── Check-out bubble ──────────────────────────────────────────────────────────
function CheckoutBubble({ sprint, isHost }) {
  const user = sprint.user;
  return (
    <div className="flex items-start gap-4 flex-row-reverse">
      <Link to={`/profile/${user?.username}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
        <Avatar username={user?.username} avatar={user?.avatar} isHost={isHost} size="lg" />
      </Link>
      <div className="max-w-[85%] flex flex-col items-end">
        <p className="text-xs text-gray-400 mb-1.5">
          <Link to={`/profile/${user?.username}`} className="hover:text-[#2d3748] transition-colors font-medium">
            @{user?.username}
          </Link>
          {isHost && <span className="ml-1.5 text-[#d4af37]">· host</span>}
        </p>
        <div className="bg-[#2d3748] rounded-2xl rounded-tr-sm px-5 py-4">
          <p className="text-xs font-semibold text-[#d4af37] uppercase tracking-wide mb-1.5">how it went</p>
          {sprint.checkout ? (
            <p className="text-base text-white leading-relaxed">{sprint.checkout}</p>
          ) : (
            <p className="text-base text-white/50 italic">Finished quietly</p>
          )}
          {sprint.wordsWritten > 0 && (
            <p className="text-xs text-[#d4af37] mt-2.5">{sprint.wordsWritten.toLocaleString()} words written</p>
          )}
        </div>
        <div className="mt-2 mr-1">
          <LikeButton sprintId={sprint.id} initialCount={sprint._count?.likes || 0} initialLiked={sprint.userLiked || false} />
        </div>
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-7">
      <div className="flex-1 h-px bg-gray-100" />
      <p className="text-xs text-gray-400 uppercase tracking-widest">{label}</p>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ── Writers Sidebar ───────────────────────────────────────────────────────────
function WritersSidebar({ sprints, hostUserId, isCollapsed, onToggle, mySprint, hasCheckedOut, onEarlyCheckout, isActive }) {
  const writerCount = sprints.length;

  return (
    <div className={`
      flex flex-col bg-white border-l border-gray-100 transition-all duration-300 flex-shrink-0 h-full
      ${isCollapsed ? "w-14" : "w-72"}
    `}>
      {/* Sidebar header */}
      <div className={`flex items-center border-b border-gray-100 px-3 py-4 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <div>
            <p className="text-xs font-semibold text-[#2d3748]">Writers in room</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {writerCount} {writerCount === 1 ? "writer" : "writers"}
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-400 hover:text-[#2d3748] transition-all flex-shrink-0"
          title={isCollapsed ? "Show writers" : "Collapse sidebar"}
        >
          {/* chevron icon flips direction */}
          <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Writer count bubble when collapsed */}
      {isCollapsed && writerCount > 0 && (
        <div className="flex justify-center pt-3">
          <span className="text-[10px] font-bold bg-[#2d3748] text-white rounded-full w-5 h-5 flex items-center justify-center">
            {writerCount}
          </span>
        </div>
      )}

      {/* Writers list */}
      <div className="flex-1 overflow-y-auto">
        {sprints.length === 0 ? (
          !isCollapsed && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-gray-400">No writers yet</p>
            </div>
          )
        ) : (
          <div className={`py-3 ${isCollapsed ? "px-2 space-y-3" : "px-4 space-y-4"}`}>
            {sprints.map((sprint) => {
              const isHost = sprint.userId === hostUserId;
              const isMe = sprint.id === mySprint?.id;
              return isCollapsed ? (
                // Collapsed: just avatar stacked
                <div key={sprint.id} className="flex justify-center" title={`@${sprint.user?.username}${isHost ? " (host)" : ""}`}>
                  <Avatar username={sprint.user?.username} avatar={sprint.user?.avatar} isHost={isHost} size="sm" />
                </div>
              ) : (
                // Expanded: full writer card
                <div key={sprint.id} className={`rounded-xl p-3 ${isMe ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <Link to={`/profile/${sprint.user?.username}`} className="hover:opacity-80 transition-opacity flex-shrink-0">
                      <Avatar username={sprint.user?.username} avatar={sprint.user?.avatar} isHost={isHost} size="sm" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/profile/${sprint.user?.username}`}
                        className="text-xs font-semibold text-[#2d3748] hover:underline truncate block"
                      >
                        @{sprint.user?.username}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isHost && (
                          <span className="text-[10px] font-medium text-[#d4af37]">host</span>
                        )}
                        {isMe && (
                          <span className="text-[10px] font-medium text-blue-500">you</span>
                        )}
                        {!sprint.isActive && (
                          <span className="text-[10px] text-emerald-600 font-medium">✓ checked out</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Intro only — no check-in */}
                  {sprint.intro && (
                    <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 italic pl-0.5">
                      "{sprint.intro}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Early checkout button — for members who haven't checked out yet */}
      {!isCollapsed && mySprint && !hasCheckedOut && (
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={onEarlyCheckout}
            className="w-full py-2.5 text-xs font-semibold text-[#2d3748] border border-[#2d3748] rounded-xl hover:bg-[#2d3748] hover:text-white transition-all"
          >
            {isActive ? "Submit Check-out early" : "Submit Check-out"}
          </button>
          {isActive && <p className="text-[10px] text-gray-400 text-center mt-1.5">Can't wait for the sprint to end?</p>}
        </div>
      )}
    </div>
  );
}

// ── Mobile Writers Drawer ─────────────────────────────────────────────────────
function MobileWritersDrawer({ sprints, hostUserId, isOpen, onClose, mySprint, hasCheckedOut, onEarlyCheckout, isActive }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Drawer */}
      <div className="w-72 bg-white flex flex-col shadow-2xl animate-slide-in-right">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-[#2d3748]">Writers in room</p>
            <p className="text-xs text-gray-400">{sprints.length} {sprints.length === 1 ? "writer" : "writers"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {sprints.map((sprint) => {
            const isHost = sprint.userId === hostUserId;
            const isMe = sprint.id === mySprint?.id;
            return (
              <div key={sprint.id} className={`rounded-xl p-3 ${isMe ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <Link to={`/profile/${sprint.user?.username}`} onClick={onClose} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                    <Avatar username={sprint.user?.username} avatar={sprint.user?.avatar} isHost={isHost} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/profile/${sprint.user?.username}`}
                      onClick={onClose}
                      className="text-xs font-semibold text-[#2d3748] hover:underline truncate block"
                    >
                      @{sprint.user?.username}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isHost && <span className="text-[10px] font-medium text-[#d4af37]">host</span>}
                      {isMe && <span className="text-[10px] font-medium text-blue-500">you</span>}
                      {!sprint.isActive && <span className="text-[10px] text-emerald-600 font-medium">✓ checked out</span>}
                    </div>
                  </div>
                </div>
                {sprint.intro && (
                  <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 italic">"{sprint.intro}"</p>
                )}
              </div>
            );
          })}
        </div>
        {isActive && mySprint && !hasCheckedOut && (
          <div className="border-t border-gray-100 p-4">
            <button
              onClick={() => { onEarlyCheckout(); onClose(); }}
              className="w-full py-2.5 text-sm font-semibold text-[#2d3748] border border-[#2d3748] rounded-xl hover:bg-[#2d3748] hover:text-white transition-all"
            >
              Submit Check-out early
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GroupSprintWorkspace() {
  const { groupSprintId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groupSprint, setGroupSprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sprintEnded, setSprintEnded] = useState(false);
  const timerRef = useRef(null);
  const beepedRef = useRef(false);

  const [showEndModal, setShowEndModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [mySprint, setMySprint] = useState(null);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isHost = groupSprint?.userId === user?.id;

  // ── Preload & unlock audio (mirrors solo sprint) ───────────────────────────
  useEffect(() => {
    const audio = new Audio('/notification.mp3');
    audio.preload = 'auto';
    audio.volume = 0.5;
    const unlock = () => {
      audio.play().then(() => audio.pause()).catch(() => {});
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchGroupSprint() {
    try {
      const res = await fetch(`${API_URL}/sprint/${groupSprintId}`, { credentials: "include" });
      if (res.ok) {
        
        const data = await res.json();
        console.log("sprints", data);
        const gs = data.groupSprint;
        setGroupSprint(gs);

        const mine = gs.sprints?.find((s) => s.userId === user?.id);
        if (mine) {
          setMySprint(mine);
          if (!mine.isActive) setHasCheckedOut(true);
        }

        if (gs.isActive) {
          const elapsed = Math.floor((Date.now() - new Date(gs.startedAt).getTime()) / 1000);
          const remaining = Math.max(0, gs.duration * 60 - elapsed);
          setSecondsLeft(remaining);
          if (remaining === 0) setSprintEnded(true);
        } else {
          setSprintEnded(true);
          setSecondsLeft(0);
        }
      } else if (res.status === 404) {
        setError("This group sprint doesn't exist or may have been removed.");
      } else {
        setError("We couldn't load this sprint. Please refresh and try again.");
      }
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchGroupSprint(); }, [groupSprintId]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (sprintEnded || !groupSprint?.isActive) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setSprintEnded(true);
          if (!beepedRef.current) { beepedRef.current = true; playNotificationSound(); }
          if (mySprint && !hasCheckedOut) {
            if (isHost) setShowEndModal(true);
            else setShowCheckoutModal(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [sprintEnded, groupSprint?.isActive, mySprint, hasCheckedOut, isHost]);

  // Poll every 15s while active
  useEffect(() => {
    if (!groupSprint?.isActive) return;
    const poll = setInterval(fetchGroupSprint, 15000);
    return () => clearInterval(poll);
  }, [groupSprint?.isActive]);

  // ── Event handlers ─────────────────────────────────────────────────────────
  function handleCheckedOut(sprint) {
    setHasCheckedOut(true);
    setMySprint(sprint);
    setGroupSprint((prev) => ({
      ...prev,
      sprints: prev.sprints.map((s) => s.id === sprint.id ? { ...s, ...sprint } : s),
    }));
  }

  function handleGroupEnded() {
    setSprintEnded(true);
    setGroupSprint((prev) => ({ ...prev, isActive: false }));
    fetchGroupSprint();
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#2d3748] border-t-transparent mb-4" />
          <p className="text-gray-500 text-sm">Loading sprint room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-[#2d3748] text-xl mb-2">Oops</p>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button onClick={() => navigate("/dashboard")} className="text-sm text-[#2d3748] underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const sprints = groupSprint.sprints || [];
  const checkedOutSprints = sprints.filter((s) => !s.isActive);
  const totalSeconds = groupSprint.duration * 60;
  const circumference = 2 * Math.PI * 45;
  const strokeOffset = circumference * (1 - Math.max(0, secondsLeft / totalSeconds));

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      <Header />

      {/* ── Main layout: content + sidebar ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Main content area ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">

            {/* Mobile: writers button */}
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-sm text-gray-400 hover:text-[#2d3748] transition-colors"
              >
                ← Dashboard
              </button>
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2d3748] hover:border-[#2d3748] transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {sprints.length} writers
              </button>
            </div>

            {/* Purpose + meta */}
            <div className="text-center mb-8">
              {groupSprint.groupPurpose && (
                <h1 className="text-xl sm:text-2xl font-serif text-[#2d3748] italic mb-3 leading-snug">
                  "{groupSprint.groupPurpose}"
                </h1>
              )}
              <div className="flex items-center justify-center gap-3 flex-wrap text-xs text-gray-400">
                {groupSprint.isActive ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Live
                  </span>
                ) : (
                  <span className="text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
                    Ended
                  </span>
                )}
                <span>
                  by{" "}
                  <Link to={`/profile/${groupSprint.user?.username}`} className="hover:text-[#2d3748] font-medium transition-colors">
                    @{groupSprint.user?.username}
                  </Link>
                </span>
                <span>·</span>
                <span>{groupSprint.duration} min</span>
                <span>·</span>
                <span>{groupSprint._count?.sprints || 0} writer{(groupSprint._count?.sprints || 0) !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Timer */}
            {groupSprint.isActive && (
              <div className="flex flex-col items-center mb-8 gap-2">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="45" fill="none" stroke="#e5e5e5" strokeWidth="4" />
                    <circle
                      cx="56" cy="56" r="45" fill="none"
                      stroke={sprintEnded ? "#10b981" : "#d4af37"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <div className="z-10 text-center">
                    <p className="text-2xl font-serif font-semibold text-[#2d3748] leading-none">
                      {sprintEnded ? "Done!" : formatTime(secondsLeft)}
                    </p>
                    {!sprintEnded && <p className="text-xs text-gray-400 mt-0.5">left</p>}
                  </div>
                </div>
                {sprintEnded && (
                  <p className="text-sm text-emerald-600 font-medium">⏰ Time's up — great sprint!</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {(isHost || mySprint) && (
              <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
                {isHost && groupSprint.isActive && sprintEnded && (
                  <button
                    onClick={() => setShowEndModal(true)}
                    className="px-6 py-2.5 bg-[#d4af37] text-[#2d3748] text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
                  >
                    End Sprint for Everyone 🏁
                  </button>
                )}
                {!isHost && mySprint && sprintEnded && !hasCheckedOut && (
                  <button
                    onClick={() => setShowCheckoutModal(true)}
                    className="px-6 py-2.5 bg-[#2d3748] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all"
                  >
                    Submit Check-out
                  </button>
                )}
                {groupSprint.isActive && (
                  <button
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    className="px-5 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-xl hover:border-[#2d3748] hover:text-[#2d3748] transition-all"
                  >
                    Copy Invite Link
                  </button>
                )}
              </div>
            )}

            {/* Feed */}
            {sprints.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">✍️</p>
                <p className="font-serif text-[#2d3748] text-lg mb-1">Waiting for writers...</p>
                <p className="text-sm text-gray-400">Share the link so others can join</p>
              </div>
            ) : (
              <>
                <Divider label="check-ins" />
                <div className="space-y-5">
                  {sprints.map((sprint) => (
                    <CheckinBubble
                      key={`in-${sprint.id}`}
                      sprint={sprint}
                      isHost={sprint.userId === groupSprint.userId}
                    />
                  ))}
                </div>

                {(sprintEnded || !groupSprint.isActive) && checkedOutSprints.length > 0 && (
                  <>
                    <Divider label="check-outs" />
                    <div className="space-y-5">
                      {checkedOutSprints.map((sprint) => (
                        <CheckoutBubble
                          key={`out-${sprint.id}`}
                          sprint={sprint}
                          isHost={sprint.userId === groupSprint.userId}
                        />
                      ))}
                    </div>
                  </>
                )}

                {!groupSprint.isActive && groupSprint.groupThankNote && (
                  <>
                    <Divider label="from the host" />
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4">
                      <Link to={`/profile/${groupSprint.user?.username}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                        <Avatar username={groupSprint.user?.username} avatar={groupSprint.user?.avatar} isHost />
                      </Link>
                      <div>
                        <p className="text-sm font-serif text-[#2d3748] italic leading-relaxed mb-1.5">
                          "{groupSprint.groupThankNote}"
                        </p>
                        <Link to={`/profile/${groupSprint.user?.username}`} className="text-xs text-gray-400 hover:text-[#2d3748] transition-colors">
                          — @{groupSprint.user?.username}
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="text-center mt-10 hidden lg:block">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-sm text-gray-400 hover:text-[#2d3748] transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
            <div className="pb-10" />
          </div>
        </main>

        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:flex h-screen sticky top-0">
          <WritersSidebar
            sprints={sprints}
            hostUserId={groupSprint.userId}
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            mySprint={mySprint}
            hasCheckedOut={hasCheckedOut}
            onEarlyCheckout={() => setShowCheckoutModal(true)}
            isActive={groupSprint.isActive}
          />
        </aside>
      </div>

      {/* ── Mobile drawer ── */}
      <MobileWritersDrawer
        sprints={sprints}
        hostUserId={groupSprint.userId}
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        mySprint={mySprint}
        hasCheckedOut={hasCheckedOut}
        onEarlyCheckout={() => setShowCheckoutModal(true)}
        isActive={groupSprint.isActive}
      />

      {/* ── Modals ── */}
      <EndGroupSprintModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onEnded={handleGroupEnded}
        groupSprintId={groupSprint?.id}
        sprintId={mySprint?.id}
      />
      <MemberCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onCheckedOut={handleCheckedOut}
        sprintId={mySprint?.id}
      />
    </div>
  );
}