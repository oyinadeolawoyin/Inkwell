import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { JoinGroupSprintModal } from "./groupSprintModal";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(username = "") {
  return username.slice(0, 2).toUpperCase();
}

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Avatar — gold ring accent ─────────────────────────────────────────────────
export function Avatar({ username, avatar, size = "md" }) {
  const dim = size === "lg" ? 48 : size === "sm" ? 32 : 40;
  const fontSize = size === "lg" ? 15 : size === "sm" ? 11 : 13;
  const ring = size === "lg"
    ? "0 0 0 2.5px #d4af37, 0 0 0 4.5px #ffffff"
    : "0 0 0 2px #d4af37, 0 0 0 3.5px #ffffff";

  if (avatar)
    return (
      <img
        src={avatar}
        alt={username}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: dim, height: dim, boxShadow: ring }}
      />
    );
  return (
    <div
      className="rounded-full bg-[#2d3748] text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: dim, height: dim, fontSize, boxShadow: ring }}
    >
      {getInitials(username)}
    </div>
  );
}

// ── Stacked participant avatars ────────────────────────────────────────────────
function StackedAvatars({ sprints = [], total = 0 }) {
  const visible = sprints.slice(0, 4);
  const overflow = total - visible.length;
  if (visible.length === 0) return null;
  return (
    <div className="flex -space-x-2 items-center">
      {visible.map((s, i) =>
        s.user?.avatar ? (
          <img
            key={i}
            src={s.user.avatar}
            alt={s.user?.username}
            className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <div
            key={i}
            className="w-7 h-7 rounded-full bg-[#2d3748] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
          >
            {getInitials(s.user?.username || "?")}
          </div>
        )
      )}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white bg-gray-100 text-gray-500">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ── Guest Prompt ──────────────────────────────────────────────────────────────
function GuestPrompt({ message, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-[#2d3748] flex items-center justify-center mx-auto mb-5" style={{ boxShadow: "0 0 0 2.5px #d4af37, 0 0 0 4.5px #ffffff" }}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414a2 2 0 01.586-1.414z" />
          </svg>
        </div>
        <h3 className="font-serif text-[#2d3748] text-xl mb-2">Join Inkwell first</h3>
        <p className="text-sm text-[#4a4a4a] mb-6 leading-relaxed">{message}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate("/signup")} className="w-full py-3 bg-[#2d3748] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all">
            Create a free account
          </button>
          <button onClick={() => navigate("/login")} className="w-full py-3 border border-gray-200 text-[#4a4a4a] text-sm font-medium rounded-xl hover:border-[#2d3748] transition-all">
            Sign in
          </button>
        </div>
        <button onClick={onClose} className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors">Maybe later</button>
      </div>
    </div>
  );
}

// ── Active Sprint Card ─────────────────────────────────────────────────────────
export function ActiveSprintCard({ groupSprint, onJoin, currentUserId }) {
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSeconds = groupSprint.duration * 60;
  const elapsed = Math.floor((Date.now() - new Date(groupSprint.startedAt).getTime()) / 1000);
  const remaining = Math.max(0, totalSeconds - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = remaining / totalSeconds;
  const isUrgent = remaining > 0 && remaining <= 120;
  const isExpired = remaining === 0;
  const writerCount = groupSprint._count?.sprints || 0;

  const hasJoined = Boolean(
    currentUserId &&
    Array.isArray(groupSprint.sprints) &&
    groupSprint.sprints.some((s) => Number(s.userId) === Number(currentUserId))
  );

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Top accent line */}
      <div className="h-[3px]" style={{ background: isUrgent ? "#f87171" : "#2d3748" }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar username={groupSprint.user?.username} avatar={groupSprint.user?.avatar} size="md" />
            <div className="min-w-0">
              <p className="font-semibold text-[#2d3748] text-sm truncate">
                {groupSprint.user?.username || "Writer"}
              </p>
              <p className="text-xs text-gray-400">hosted · {getTimeAgo(groupSprint.startedAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {hasJoined && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-[#2d3748] text-[#2d3748]">
                ✓ Joined
              </span>
            )}
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isUrgent ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
              {isUrgent ? "Ending soon" : "Live"}
            </span>
          </div>
        </div>

        {/* Purpose */}
        {groupSprint.groupPurpose && (
          <p className="text-sm text-gray-500 italic mb-4 leading-relaxed border-l-2 border-gray-100 pl-3">
            "{groupSprint.groupPurpose}"
          </p>
        )}

        {/* Writers + Timer */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "#d4af3722" }}>
            <StackedAvatars sprints={groupSprint.sprints} total={writerCount} />
            <span className="text-xs text-gray-500 font-medium">
              {writerCount} {writerCount === 1 ? "writer" : "writers"}
            </span>
          </div>

          {/* Countdown */}
          <div className="text-right">
            <span className={`text-2xl font-bold tabular-nums leading-none ${
              isUrgent ? "text-red-500" : isExpired ? "text-gray-300" : "text-[#2d3748]"
            }`}>
              {isExpired ? "--:--" : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5">remaining</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress * 100}%`, background: isUrgent ? "#f87171" : "#d4af37" }}
          />
        </div>

        {/* CTA */}
        {hasJoined ? (
          <button
            onClick={() => navigate(`/group-sprint/${groupSprint.id}`)}
            className="w-full py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-90 text-white bg-[#2d3748]"
          >
            Continue Writing
          </button>
        ) : isExpired ? (
          <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 text-sm rounded-xl cursor-not-allowed">
            Sprint ended
          </button>
        ) : (
          <button
            onClick={() => onJoin(groupSprint)}
            className="w-full py-2.5 bg-[#2d3748] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            Join Sprint
          </button>
        )}
      </div>
    </div>
  );
}

// ── Ended Sprint Card ──────────────────────────────────────────────────────────
export function EndedSprintCard({ groupSprint, onView, currentUserId }) {
  const memberCount = groupSprint._count?.sprints || 0;
  const totalWords = (groupSprint.sprints || []).reduce((s, sp) => s + (sp.wordsWritten || 0), 0);

  const hadJoined = Boolean(
    currentUserId &&
    Array.isArray(groupSprint.sprints) &&
    groupSprint.sprints.some((s) => Number(s.userId) === Number(currentUserId))
  );

  return (
    <div className={`bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 ${
      hadJoined ? "border-2 border-[#d4af37]" : "border border-gray-100"
    }`}>
      {/* Accent bar */}
      <div className="h-[3px]" style={{ background: hadJoined ? "#d4af37" : "#e5e5e5" }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar username={groupSprint.user?.username} avatar={groupSprint.user?.avatar} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[#2d3748] text-sm truncate">
                  {groupSprint.user?.username || "Writer"}
                </p>
                {hadJoined && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-[#d4af37] text-[#2d3748]">
                    ✓ You wrote here
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">ended · {getTimeAgo(groupSprint.completedAt || groupSprint.startedAt)}</p>
            </div>
          </div>

          <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
            {groupSprint.duration} min
          </span>
        </div>

        {/* Purpose */}
        {groupSprint.groupPurpose && (
          <p className="text-sm text-gray-500 italic mb-4 leading-relaxed border-l-2 border-gray-100 pl-3">
            "{groupSprint.groupPurpose}"
          </p>
        )}

        {/* Stats + avatars */}
        <div className="flex items-center justify-between py-3 border-t border-b border-gray-50 mb-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-bold text-[#2d3748] text-lg leading-none">{memberCount}</p>
              <p className="text-[11px] text-gray-400 mt-1">{memberCount === 1 ? "writer" : "writers"}</p>
            </div>
            {totalWords > 0 && (
              <>
                <div className="w-px h-8 bg-gray-100" />
                <div>
                  <p className="font-bold text-[#2d3748] text-lg leading-none">{totalWords.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-400 mt-1">words</p>
                </div>
              </>
            )}
          </div>
          <StackedAvatars sprints={groupSprint.sprints} total={memberCount} />
        </div>

        {/* Host thank note */}
        {groupSprint.groupThankNote && (
          <p className="text-sm text-gray-500 italic mb-4 leading-relaxed border-l-2 border-gray-100 pl-3 line-clamp-2">
            💛 "{groupSprint.groupThankNote}"
          </p>
        )}

        {/* CTA */}
        <button
          onClick={() => onView(groupSprint)}
          className="w-full py-2.5 border border-[#2d3748] text-[#2d3748] text-sm font-semibold rounded-xl hover:bg-[#2d3748] hover:text-white transition-all"
        >
          Read Check-ins & Check-outs
        </button>
      </div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
export function GroupSprintSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-[3px] bg-gray-100" />
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="w-32 h-3 bg-gray-100 rounded-full" />
            <div className="w-20 h-2.5 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="w-full h-12 bg-gray-50 rounded-xl mb-4" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex -space-x-2">
            {[0,1,2].map(i => <div key={i} className="w-7 h-7 rounded-full bg-gray-100 ring-2 ring-white" />)}
          </div>
          <div className="w-16 h-8 bg-gray-100 rounded" />
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4" />
        <div className="w-full h-10 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

// ── Main GroupSprintFeed component ────────────────────────────────────────────
export default function GroupSprintFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("active");
  const [activeSprints, setActiveSprints] = useState([]);
  const [endedSprints, setEndedSprints] = useState([]);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingEnded, setIsLoadingEnded] = useState(false);
  const [endedFetched, setEndedFetched] = useState(false);

  const [joinTarget, setJoinTarget] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [guestMessage, setGuestMessage] = useState(null);

  useEffect(() => { fetchActive(); }, []);
  useEffect(() => { if (tab === "ended" && !endedFetched) fetchEnded(); }, [tab]);

  async function fetchActive() {
    setIsLoadingActive(true);
    try {
      const res = await fetch(`${API_URL}/sprint/activeGroupSprints?limit=20`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setActiveSprints(d.groupSprints || []); }
    } catch {}
    finally { setIsLoadingActive(false); }
  }

  async function fetchEnded() {
    setIsLoadingEnded(true);
    try {
      const res = await fetch(`${API_URL}/sprint/GroupSprintsOfTheDay?limit=20`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setEndedSprints(d.groupSprints || []); setEndedFetched(true); }
    } catch {}
    finally { setIsLoadingEnded(false); }
  }

  function handleJoinClick(gs) {
    if (!user) { setGuestMessage("Sign up to join this group sprint and write alongside other writers."); return; }
    setJoinTarget(gs);
    setShowJoinModal(true);
  }

  function handleViewClick(gs) {
    if (!user) { setGuestMessage("Sign up to read the check-ins and check-outs from this sprint."); return; }
    navigate(`/group-sprint/${gs.id}`);
  }

  const isLoading = tab === "active" ? isLoadingActive : isLoadingEnded;
  const list = tab === "active" ? activeSprints : endedSprints;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
      {/* Header + tabs */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif text-[#2d3748]">Group Sprints</h2>
          <p className="text-xs text-gray-400 mt-0.5">Write together, grow together</p>
        </div>

        <div className="flex items-center bg-gray-50 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setTab("active")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === "active" ? "bg-white text-[#2d3748] shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Active
            {activeSprints.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-400"
              }`}>
                {activeSprints.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("ended")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === "ended" ? "bg-white text-[#2d3748] shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Ended
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <GroupSprintSkeleton />
          <GroupSprintSkeleton />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">{tab === "active" ? "🕰️" : "📖"}</p>
          <p className="text-sm text-gray-500">
            {tab === "active" ? "No active group sprints right now." : "No group sprints ended today yet."}
          </p>
          {tab === "active" && user && (
            <p className="text-xs text-gray-400 mt-1">Be the first — start one above!</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tab === "active"
            ? list.map((gs) => (
                <ActiveSprintCard key={gs.id} groupSprint={gs} onJoin={handleJoinClick} currentUserId={user?.id} />
              ))
            : list.map((gs) => (
                <EndedSprintCard key={gs.id} groupSprint={gs} onView={handleViewClick} currentUserId={user?.id} />
              ))}
        </div>
      )}

      {guestMessage && <GuestPrompt message={guestMessage} onClose={() => setGuestMessage(null)} />}

      <JoinGroupSprintModal
        isOpen={showJoinModal}
        onClose={() => { setShowJoinModal(false); setJoinTarget(null); }}
        onJoined={() => navigate(`/group-sprint/${joinTarget?.id}`)}
        groupSprint={joinTarget}
      />
    </div>
  );
}