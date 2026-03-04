import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";
import Header from "./components/profile/header";
import API_URL from "@/config/api";
import DailyQuote from "./components/quote/dailyQuote";
import NotificationsSetup from "./components/notification/notificationSetup";
import { AppMetaTags } from "./components/utilis/metatags";
import { StartGroupSprintModal, JoinGroupSprintModal } from "./components/sprint/groupSprintModal";
import {
  Avatar as GroupAvatar,
  ActiveSprintCard,
  EndedSprintCard,
  GroupSprintSkeleton,
} from "./components/sprint/groupSprintFeed";
import MissionCard, { PendingRankBanner, DifficultyBadge } from "./components/missions/MissionCard";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTimeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getInitials(username = "") {
  return username.slice(0, 2).toUpperCase();
}

function Avatar({ username, avatar, size = "md" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  if (avatar)
    return <img src={avatar} alt={username} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-[#2d3748] text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {getInitials(username)}
    </div>
  );
}

// ── Guest Prompt ──────────────────────────────────────────────────────────────
function GuestPrompt({ message, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <p className="text-3xl mb-4">✍️</p>
        <h3 className="font-serif text-[#2d3748] text-xl mb-2">Join Inkwell first</h3>
        <p className="text-sm text-[#4a4a4a] mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate("/signup")} className="w-full py-3 bg-[#2d3748] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all">
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

// ── Solo Sprint Card ──────────────────────────────────────────────────────────
function SoloSprintCard({ sprint }) {
  return (
    <div className="group border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar username={sprint.user?.username} avatar={sprint.user?.avatar} />
          <div>
            <p className="font-medium text-[#2d3748] text-sm">{sprint.user?.username || "Anonymous Writer"}</p>
            <p className="text-xs text-gray-400">{getTimeAgo(sprint.completedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="font-bold text-[#2d3748]">{sprint.wordsWritten?.toLocaleString() || 0}</div>
            <div className="text-xs text-gray-400">words</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-[#2d3748]">{sprint.duration}</div>
            <div className="text-xs text-gray-400">min</div>
          </div>
        </div>
      </div>

      {sprint.checkin && (
        <div className="bg-gray-50 rounded-xl p-4 mb-3">
          <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Check-in</p>
          <p className="text-sm text-[#4a4a4a] italic">"{sprint.checkin}"</p>
        </div>
      )}
      {sprint.checkout && (
        <div className="bg-gray-50 rounded-xl p-4 border-l-2 border-[#d4af37]">
          <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Check-out</p>
          <p className="text-sm text-[#4a4a4a] italic">"{sprint.checkout}"</p>
        </div>
      )}
    </div>
  );
}

// ── Unified Sprint Feed — 3 tabs ──────────────────────────────────────────────
function SprintFeed({ todaySprints, user }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("solo");
  const [activeSprints, setActiveSprints] = useState([]);
  const [endedSprints, setEndedSprints] = useState([]);
  const [isLoadingActive, setIsLoadingActive] = useState(false);
  const [isLoadingEnded, setIsLoadingEnded] = useState(false);
  const [activeFetched, setActiveFetched] = useState(false);
  const [endedFetched, setEndedFetched] = useState(false);
  const [joinTarget, setJoinTarget] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [guestMessage, setGuestMessage] = useState(null);

  useEffect(() => {
    if (tab === "active" && !activeFetched) fetchActive();
    if (tab === "ended" && !endedFetched) fetchEnded();
  }, [tab]);

  async function fetchActive() {
    setIsLoadingActive(true);
    try {
      const res = await fetch(`${API_URL}/sprint/activeGroupSprints?limit=20`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setActiveSprints(d.groupSprints || []); setActiveFetched(true); }
    } catch {} finally { setIsLoadingActive(false); }
  }

  async function fetchEnded() {
    setIsLoadingEnded(true);
    try {
      const res = await fetch(`${API_URL}/sprint/GroupSprintsOfTheDay?limit=20`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setEndedSprints(d.groupSprints || []); setEndedFetched(true); }
    } catch {} finally { setIsLoadingEnded(false); }
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

  const tabs = [
    { key: "solo", label: "Solo", count: todaySprints.length, dot: false },
    { key: "active", label: "Active", count: activeSprints.length, dot: true },
    { key: "ended", label: "Ended", count: null, dot: false },
  ];

  const isLoading = tab === "active" ? isLoadingActive : tab === "ended" ? isLoadingEnded : false;
  const list = tab === "solo" ? todaySprints : tab === "active" ? activeSprints : endedSprints;

  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      {/* Header + Tabs */}
      <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-serif text-[#2d3748]">Today's Sprints</h2>

          <div className="flex items-center bg-gray-50 rounded-xl p-1 gap-0.5 self-start sm:self-auto">
            {tabs.map(({ key, label, count, dot }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  tab === key
                    ? "bg-white text-[#2d3748] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {dot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    activeSprints.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                  }`} />
                )}
                {label}
                {count !== null && count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab === key
                      ? key === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-[#2d3748]"
                      : "bg-gray-200 text-gray-400"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-gray-50 -mx-6 sm:-mx-8" />
      </div>

      {/* List area */}
      <div className="p-6 sm:p-8">
        {isLoading ? (
          <div className="space-y-4">
            <GroupSprintSkeleton />
            <GroupSprintSkeleton />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">
              {tab === "solo" ? "🖋️" : tab === "active" ? "🕰️" : "📖"}
            </div>
            <p className="text-gray-500 text-sm">
              {tab === "solo"
                ? "No solo sprints completed today yet."
                : tab === "active"
                ? "No active group sprints right now."
                : "No group sprints ended today yet."}
            </p>
            {tab === "solo" && user && (
              <Link to="/start-sprint" className="inline-block mt-4 px-6 py-2.5 bg-[#2d3748] text-white text-sm rounded-xl font-medium hover:opacity-90 transition-all">
                Start Your First Sprint
              </Link>
            )}
            {tab === "active" && user && (
              <p className="text-xs text-gray-400 mt-1">Be the first — start one from above!</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {tab === "solo" && list.map((s) => <SoloSprintCard key={s.id} sprint={s} />)}
            {tab === "active" && list.map((gs) => (
              <ActiveSprintCard key={gs.id} groupSprint={gs} onJoin={handleJoinClick} currentUserId={user?.id} />
            ))}
            {tab === "ended" && list.map((gs) => (
              <EndedSprintCard key={gs.id} groupSprint={gs} onView={handleViewClick} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </div>

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

// ── Active Missions Section (homepage) ───────────────────────────────────────
function HomepageMissions({ userId }) {
  const [missions,    setMissions]    = useState([]);
  const [pendingRank, setPendingRank] = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    fetchData();
  }, [userId]);

  async function fetchData() {
    try {
      const [missionsRes, progressRes] = await Promise.all([
        fetch(`${API_URL}/missions/active/${userId}`, { credentials: "include" }),
        fetch(`${API_URL}/missions/progress/${userId}`, { credentials: "include" }),
      ]);
      if (missionsRes.ok) {
        const d = await missionsRes.json();
        setMissions(d.missions || []);
      }
      if (progressRes.ok) {
        const d = await progressRes.json();
        setPendingRank(d.progress?.pendingRank || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Pending rank banner */}
      {pendingRank && (
        <PendingRankBanner
          pendingRank={pendingRank}
          onClaimed={() => setPendingRank(null)}
        />
      )}

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#2d3748]">Active Missions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete missions to earn ranks and move your story forward
          </p>
        </div>
        <Link
          to="/missions"
          className="text-sm font-medium text-[#2d3748] hover:text-[#d4af37] transition-colors flex items-center gap-1"
        >
          View all →
        </Link>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-6 animate-pulse min-h-[180px]">
              <div className="h-6 w-20 bg-gray-200 rounded-full mb-4" />
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-full bg-gray-100 rounded mb-1" />
              <div className="h-4 w-5/6 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {missions.map((slot) => (
            <MissionCard key={slot.difficulty} missionSlot={slot} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Feature screenshots ───────────────────────────────────────────────────────
const FEATURES = [
  {
    img: "/solo-sprint.png",
    tag: "Focus",
    title: "Timed Writing Sprints",
    desc: "Set a timer and just write. No editing, no second-guessing — only forward momentum. Every sprint is tracked and counted toward your journey.",
  },
  {
    img: "/groupsprintroom.png",
    tag: "Community",
    title: "Write With Others Live",
    desc: "Join live group sprints and write alongside fellow writers in real time. Seeing others show up makes it easier to show up yourself.",
  },
  {
    img: "/active-mission.png",
    tag: "Gamification",
    title: "Writing Quest Missions",
    desc: "Take on Easy, Medium, and Hard writing quests. Complete them to earn XP and watch your rank climb with every challenge you conquer.",
  },
  {
    img: "/rank-ladder.png",
    tag: "Progression",
    title: "Climb the Rank Ladder",
    desc: "Rise from Inklings all the way to Inkwell Legend. Each rank is a milestone that proves just how far your writing has come.",
  },
  {
    img: "/writing-activity.png",
    tag: "Habit",
    title: "Writing Activity Heatmap",
    desc: "Watch your writing habit take shape visually — like GitHub but for writers. Build your streak and never miss a day.",
  },
  {
    img: "/writing-schdule.png",
    tag: "Planning",
    title: "Personal Writing Schedule",
    desc: "Set daily word goals and preferred writing times for each day of the week. Inkwell reminds you when it's your writing hour.",
  },
  {
    img: "/word-tracker.png",
    tag: "Tracking",
    title: "Automatic Word Counting",
    desc: "Enter your word count before and after a sprint. We calculate exactly how many words you wrote — no guesswork, no spreadsheets.",
  },
  {
    img: "/mission-board.png",
    tag: "Missions",
    title: "Full Mission Board",
    desc: "Browse every mission organised by difficulty. See which ones you've conquered and plan your next challenge at a glance.",
  },
];

// ── Guest hero ─────────────────────────────────────────────────────────────────
function GuestHero() {
  const navigate = useNavigate();
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2233] via-[#2d3748] to-[#1e293b] px-8 sm:px-16 py-14 sm:py-20 text-center">
      {/* Radial gold glow at top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(212,175,55,0.18),transparent)]" />
      {/* Shimmer strip */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400/20 border border-amber-400/30 rounded-full text-amber-300 text-xs font-semibold mb-6 animate-float">
          ✍️ Built for writers who want to show up consistently
        </div>

        <h1 className="text-4xl sm:text-6xl font-serif text-white mb-5 leading-tight">
          Show up. Write.
          <br />
          <span className="text-[#d4af37]">Level up.</span>
        </h1>

        <p className="text-gray-300 text-base sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
          Inkwell turns your writing sessions into a game. Timed sprints, gamified missions,
          XP and ranks — everything you need to make writing a habit that sticks.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate("/signup")}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#d4af37] text-[#1a2233] font-bold text-sm rounded-xl
                       hover:bg-amber-400 transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            Start writing free →
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto px-8 py-3.5 bg-white/10 border border-white/20 text-white font-medium text-sm rounded-xl
                       hover:bg-white/20 transition-all"
          >
            Sign in
          </button>
        </div>

        {/* Social proof hint */}
        <p className="mt-6 text-gray-500 text-xs">Free to join · No credit card required</p>
      </div>
    </div>
  );
}

// ── Guest feature showcase ────────────────────────────────────────────────────
function GuestFeatures() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  function goTo(idx) {
    setFading(true);
    setTimeout(() => {
      setActive(idx);
      setFading(false);
    }, 280);
  }

  // Auto-play — resets whenever active changes (including manual navigation)
  useEffect(() => {
    const id = setInterval(() => goTo((active + 1) % FEATURES.length), 4500);
    return () => clearInterval(id);
  }, [active]);

  const feature = FEATURES[active];
  const vis = !fading;

  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      {/* Section header */}
      <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-gray-50">
        <h2 className="text-2xl sm:text-3xl font-serif text-[#2d3748] mb-1">
          Everything you need to write more
        </h2>
        <p className="text-sm text-gray-400">
          Built with the features writers actually use, every single day.
        </p>
      </div>

      {/* Carousel */}
      <div className="p-6 sm:p-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start lg:items-center">

          {/* ── Text side ── */}
          <div
            className={`lg:w-2/5 flex-shrink-0 transition-all duration-280 ease-out ${
              vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            <span className="inline-block mb-3 px-3 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full uppercase tracking-widest">
              {feature.tag}
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif text-[#2d3748] mb-3 leading-snug">
              {feature.title}
            </h3>
            <p className="text-gray-500 text-base leading-relaxed mb-7">{feature.desc}</p>

            {/* Dot navigation */}
            <div className="flex items-center gap-2 mb-4">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to feature ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === active
                      ? "w-6 h-2 bg-[#2d3748]"
                      : "w-2 h-2 bg-gray-200 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-28 bg-gray-100 rounded-full overflow-hidden">
              <div key={active} className="h-full bg-[#d4af37] rounded-full animate-feature-progress" />
            </div>

            {/* Prev / Next arrows */}
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => goTo((active - 1 + FEATURES.length) % FEATURES.length)}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-xl text-gray-400
                           hover:border-[#2d3748] hover:text-[#2d3748] transition-all leading-none"
              >
                ‹
              </button>
              <button
                onClick={() => goTo((active + 1) % FEATURES.length)}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-xl text-gray-400
                           hover:border-[#2d3748] hover:text-[#2d3748] transition-all leading-none"
              >
                ›
              </button>
              <span className="text-xs text-gray-300 ml-1 tabular-nums">
                {active + 1} / {FEATURES.length}
              </span>
            </div>
          </div>

          {/* ── Screenshot side ── */}
          <div
            className={`w-full lg:flex-1 transition-all duration-280 ease-out ${
              vis ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
            }`}
          >
            {/* Browser chrome wrapper */}
            <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200/80 ring-1 ring-black/5">
              {/* Chrome bar */}
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-3 border-b border-gray-200/70">
                <div className="flex gap-1.5 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-[11px] text-gray-400 truncate border border-gray-200/80">
                  inkwellinky.vercel.app
                </div>
              </div>
              {/* Screenshot */}
              <img
                key={active}
                src={feature.img}
                alt={feature.title}
                className="w-full h-auto block animate-fade-up"
                loading="lazy"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Sign-up nudge at bottom */}
      <div className="px-6 sm:px-10 py-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500 text-center sm:text-left">
          Ready to build a writing habit that actually sticks?
        </p>
        <Link
          to="/signup"
          className="flex-shrink-0 px-6 py-2.5 bg-[#2d3748] text-white text-sm font-medium rounded-xl
                     hover:opacity-90 transition-all shadow-soft hover:scale-105 active:scale-95"
        >
          Get started free →
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [todaySprints, setTodaySprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await fetch(`${API_URL}/sprint/sprintsOfTheDay?limit=20`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setTodaySprints(d.sprints || []); }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }

  function handleGroupSprintCreated(groupSprint) {
    navigate(`/group-sprint/${groupSprint.id}`);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#2d3748] border-t-transparent" />
          <p className="mt-4 text-[#4a4a4a]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <AppMetaTags title="Inkwell - Just Write" description="The easiest way to show up and write. No judgment, just progress." />
      <Header />
      <NotificationsSetup user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">

        {/* Guest: hero + feature showcase (hidden once signed in) */}
        {!user && <GuestHero />}

        <DailyQuote />

        {/* Sprint CTAs */}
        {user && (
          <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-serif text-[#2d3748] mb-1">Ready to write?</h2>
                <p className="text-sm text-[#4a4a4a]">Sprint solo or invite others to write with you.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => navigate("/start-sprint")}
                  className="flex-1 sm:flex-none px-6 py-3 bg-[#2d3748] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-soft"
                >
                  Solo Sprint
                </button>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="flex-1 sm:flex-none px-6 py-3 border border-[#2d3748] text-[#2d3748] text-sm font-medium rounded-xl hover:bg-[#2d3748] hover:text-white transition-all"
                >
                  Group Sprint
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Missions (replaces Weekly Progress) */}
        {user && (
          <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 lg:p-10">
            <HomepageMissions userId={user.id} />
          </div>
        )}

        {/* Guest: feature screenshots */}
        {!user && <GuestFeatures />}

        {/* Sprint Feed */}
        <SprintFeed todaySprints={todaySprints} user={user} />

      </main>

      <StartGroupSprintModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreated={handleGroupSprintCreated}
      />
    </div>
  );
}