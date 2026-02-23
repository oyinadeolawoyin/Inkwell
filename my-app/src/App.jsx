import { useState, useEffect } from "react";
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [weeklyProgress, setWeeklyProgress] = useState(null);
  const [todaySprints, setTodaySprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [progressRes, sprintsRes] = await Promise.all([
        fetch(`${API_URL}/progress/week`, { credentials: "include" }),
        fetch(`${API_URL}/sprint/sprintsOfTheDay?limit=20`, { credentials: "include" }),
      ]);
      if (progressRes.ok) setWeeklyProgress(await progressRes.json());
      if (sprintsRes.ok) { const d = await sprintsRes.json(); setTodaySprints(d.sprints || []); }
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

  const weeklyPercentage = weeklyProgress?.plannedDays
    ? Math.round((weeklyProgress.completedPlannedDays / weeklyProgress.plannedDays) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <AppMetaTags title="Inkwell - Just Write" description="The easiest way to show up and write. No judgment, just progress." />
      <Header />
      <NotificationsSetup user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">

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

        {/* Weekly Progress */}
        {user && (
          <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 lg:p-10">
            <h2 className="text-2xl sm:text-3xl font-serif text-[#2d3748] mb-6">This Week's Progress</h2>

            {weeklyProgress && weeklyProgress.plannedDays > 0 ? (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base sm:text-lg text-[#4a4a4a]">
                      <strong className="text-[#2d3748]">{weeklyProgress.completedPlannedDays}</strong> of{" "}
                      <strong className="text-[#2d3748]">{weeklyProgress.plannedDays}</strong> days completed
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#2d3748]">{weeklyPercentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${weeklyPercentage}%`, background: "#d4af37" }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6">
                  {[
                    { value: weeklyProgress.totalSprints, label: weeklyProgress.totalSprints === 1 ? "sprint" : "sprints" },
                    { value: weeklyProgress.totalWords?.toLocaleString() || 0, label: "words" },
                    { value: `${Math.floor((weeklyProgress.totalMinutes || 0) / 60)}h ${(weeklyProgress.totalMinutes || 0) % 60}m`, label: "time" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                      <div className="text-3xl sm:text-4xl font-bold text-[#2d3748] mb-1">{stat.value}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                  {weeklyProgress.bonusDays > 0 && (
                    <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-1">+{weeklyProgress.bonusDays}</div>
                      <div className="text-xs sm:text-sm text-purple-600 font-medium">bonus days</div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-gray-50">
                  <p className="text-base sm:text-lg text-center text-[#4a4a4a] italic">
                    {weeklyPercentage === 100 ? "🎉 Amazing! You hit all your writing days this week!"
                      : weeklyPercentage >= 75 ? "💪 You're crushing it! Keep this momentum going."
                      : weeklyPercentage >= 50 ? "🌱 You're showing up. That's what matters most."
                      : weeklyPercentage > 0 ? "✨ Every word counts. You're making progress."
                      : "📝 Ready to start? Your first sprint is waiting."}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <div className="text-5xl mb-5">✨</div>
                <h3 className="text-2xl font-serif font-bold text-[#2d3748] mb-3">Your writing journey starts here</h3>
                <p className="text-base text-gray-600 mb-2">Every writer you admire started exactly where you are now.</p>
                <p className="text-base text-gray-500 mb-7">Just 10 minutes. Just <em className="text-[#2d3748]">something</em>.</p>
                <Link to="/start-sprint" className="inline-block px-10 py-3 bg-[#2d3748] text-white text-base font-semibold rounded-xl hover:opacity-90 transition-all">
                  Start Your First Sprint
                </Link>
                <p className="text-sm text-gray-400 italic mt-3">Even 10 minutes counts. We promise.</p>
              </div>
            )}
          </div>
        )}

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