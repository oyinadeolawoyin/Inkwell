import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";
import MissionCard, {
  PendingRankBanner,
  DifficultyBadge,
  RankBadge,
  DIFFICULTY,
} from "./MissionCard";

// ── Loading skeleton ──────────────────────────────────────────────────────────
function MissionSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-6 animate-pulse min-h-[180px]">
      <div className="h-6 w-20 bg-gray-200 rounded-full mb-4" />
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-full bg-gray-100 rounded mb-1" />
      <div className="h-4 w-5/6 bg-gray-100 rounded" />
    </div>
  );
}

// ── All Missions Row (one difficulty tab) ─────────────────────────────────────
function AllMissionItem({ mission }) {
  const cfg = DIFFICULTY[mission.difficulty] || DIFFICULTY.EASY;
  return (
    <div
      className={`rounded-xl border-2 p-4 flex items-start gap-4 transition-all duration-200 ${
        mission.completed
          ? `${cfg.completedBg} ${cfg.border}`
          : "bg-white border-gray-100 opacity-70 hover:opacity-100"
      }`}
    >
      {/* Status icon */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg mt-0.5 ${
          mission.completed ? "bg-white shadow-sm" : "bg-gray-100"
        }`}
      >
        {mission.completed ? "✅" : "🔒"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`font-serif text-base ${
              mission.completed ? "text-ink-primary" : "text-gray-400"
            }`}
          >
            {mission.title}
          </span>
          <DifficultyBadge difficulty={mission.difficulty} />
          {mission.xp > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              mission.completed
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-400"
            }`}>
              +{mission.xp} XP
            </span>
          )}
        </div>
        <p
          className={`text-sm leading-relaxed ${
            mission.completed ? "text-gray-600" : "text-gray-400"
          }`}
        >
          {mission.description}
        </p>
        {mission.completed && mission.completedAt && (
          <p className="text-xs text-gray-400 mt-1.5">
            Completed{" "}
            {new Date(mission.completedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
        {!mission.completed && (
          <p className="text-xs text-gray-400 mt-1.5 italic">
            {formatRequirement(mission)}
          </p>
        )}
      </div>
    </div>
  );
}

function formatRequirement({ type, requirement }) {
  switch (type) {
    case "SPRINT_WORDS":    return `Write ${requirement.toLocaleString()} words in one sprint`;
    case "TOTAL_WORDS":     return `Accumulate ${requirement.toLocaleString()} total words`;
    case "SPRINT_COUNT":    return `Complete ${requirement} sprint${requirement !== 1 ? "s" : ""}`;
    case "SPRINT_DURATION": return `Sprint for ${requirement} minutes`;
    default:                return `Requirement: ${requirement}`;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Missions() {
  const { user } = useAuth();
  const userId   = user?.id;

  const [activeMissions,  setActiveMissions]  = useState([]);
  const [allMissions,     setAllMissions]     = useState({ easy: [], medium: [], hard: [] });
  const [progress,        setProgress]        = useState(null);
  const [activeTab,       setActiveTab]       = useState("EASY");
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingAll,    setIsLoadingAll]    = useState(true);
  const [pendingRank,     setPendingRank]     = useState(null);

  useEffect(() => {
    if (!userId) return;
    fetchActiveMissions();
    fetchAllMissions();
    fetchProgress();
  }, [userId]);

  async function fetchActiveMissions() {
    setIsLoadingActive(true);
    try {
      const res = await fetch(`${API_URL}/missions/active/${userId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setActiveMissions(data.missions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingActive(false);
    }
  }

  async function fetchAllMissions() {
    setIsLoadingAll(true);
    try {
      const res = await fetch(`${API_URL}/missions/all/${userId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAllMissions(data.missions || { easy: [], medium: [], hard: [] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAll(false);
    }
  }

  async function fetchProgress() {
    try {
      const res = await fetch(`${API_URL}/missions/progress/${userId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
        setPendingRank(data.progress?.pendingRank || null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleRankClaimed(rank) {
    setPendingRank(null);
    setProgress((prev) => prev ? { ...prev, rank, pendingRank: null } : prev);
  }

  // Tab data
  const tabMap = {
    EASY:   allMissions.easy   || [],
    MEDIUM: allMissions.medium || [],
    HARD:   allMissions.hard   || [],
  };
  const tabs = [
    { key: "EASY",   label: "Easy",   icon: "🌱", count: tabMap.EASY.length },
    { key: "MEDIUM", label: "Medium", icon: "⚡", count: tabMap.MEDIUM.length },
    { key: "HARD",   label: "Hard",   icon: "🔥", count: tabMap.HARD.length },
  ];

  const completedCount = (tabMap.EASY.filter(m => m.completed).length
    + tabMap.MEDIUM.filter(m => m.completed).length
    + tabMap.HARD.filter(m => m.completed).length);
  const totalCount = tabMap.EASY.length + tabMap.MEDIUM.length + tabMap.HARD.length;

  if (!user) {
    return (
      <div className="min-h-screen bg-ink-cream">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-serif text-ink-primary mb-3">Sign in to view missions</h1>
          <p className="text-gray-500 mb-8">Complete missions, earn ranks, and level up your writing.</p>
          <Link
            to="/login"
            className="px-8 py-3 bg-ink-primary text-white rounded-xl font-medium hover:opacity-90 transition-all"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      <AppMetaTags
        title="Missions – Inkwell"
        description="Complete writing missions to earn ranks and level up."
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-ink-primary">Missions</h1>
            <p className="text-gray-500 mt-1">
              Complete missions to earn ranks and move your story forward.
            </p>
          </div>
          {progress && (
            <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 shadow-soft self-start sm:self-auto">
              <RankBadge rank={progress.rank} size="sm" />
              {!isLoadingAll && totalCount > 0 && (
                <span className="text-xs text-gray-500">
                  {completedCount}/{totalCount} complete
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Pending rank banner ─────────────────────────────────────────── */}
        {pendingRank && (
          <PendingRankBanner pendingRank={pendingRank} onClaimed={handleRankClaimed} />
        )}

        {/* ── Active missions ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-serif text-ink-primary">Active Missions</h2>
              <p className="text-sm text-gray-500 mt-0.5">Your current missions</p>
            </div>
            <Link
              to="/start-sprint"
              className="px-4 py-2 bg-ink-primary text-white text-sm font-medium rounded-xl
                         hover:opacity-90 transition-all shadow-soft"
            >
              Start Sprint
            </Link>
          </div>

          {isLoadingActive ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MissionSkeleton />
              <MissionSkeleton />
              <MissionSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {activeMissions.map((slot) => (
                <MissionCard key={slot.difficulty} missionSlot={slot} />
              ))}
            </div>
          )}
        </section>

        {/* ── All missions board ──────────────────────────────────────────── */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-serif text-ink-primary">All Missions</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Every mission available — locked until you're ready
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-soft mb-6 w-full sm:w-auto self-start">
            {tabs.map(({ key, label, icon, count }) => {
              const completed = tabMap[key].filter((m) => m.completed).length;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                              transition-all duration-200 ${
                    activeTab === key
                      ? "bg-ink-primary text-white shadow-sm"
                      : "text-gray-500 hover:text-ink-primary hover:bg-gray-50"
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === key
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {completed}/{count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mission list */}
          {isLoadingAll ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tabMap[activeTab].length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl">
              <div className="text-4xl mb-3">🚀</div>
              <p className="text-gray-500">No {activeTab.toLowerCase()} missions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tabMap[activeTab].map((mission) => (
                <AllMissionItem key={mission.id} mission={mission} />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
