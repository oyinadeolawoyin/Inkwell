import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import DailyQuote from "../quote/dailyQuote";
import WritingSchedule from "../writingPlan/writingSchedule";
import ProgressStats from "../writingPlan/progressStats";
import { AppMetaTags } from "../utilis/metatags";
import { StartGroupSprintModal } from "../sprint/groupSprintModal";
import WritingHeatmap from "../missions/WritingHeatmap";
import { PendingRankBanner, RANK_CONFIG } from "../missions/MissionCard";
import API_URL from "@/config/api";

// ── Recent sprints list ───────────────────────────────────────────────────────
function RecentSprints({ userId }) {
  const [sprints,   setSprints]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    fetch(`${API_URL}/sprint/${userId}/recent`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setSprints(d.sprints || []); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-6 space-y-3">
        <div className="h-5 w-36 bg-gray-100 rounded-lg animate-pulse mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (sprints.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-6">
      <h3 className="text-xl font-serif text-ink-primary mb-4">Recent Sprints</h3>
      <div className="space-y-3">
        {sprints.map((sprint) => (
          <div
            key={sprint.id}
            className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {/* Stats */}
            <div className="flex gap-4 flex-shrink-0">
              <div className="text-center">
                <div className="text-xl font-bold text-ink-primary">
                  {(sprint.wordsWritten || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">words</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-ink-primary">{sprint.duration}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">min</div>
              </div>
            </div>

            {/* Quote + date */}
            <div className="flex-1 min-w-0">
              {sprint.checkin && (
                <p className="text-sm text-gray-600 italic truncate">"{sprint.checkin}"</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {sprint.completedAt
                  ? new Date(sprint.completedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rank milestones (must match backend RANK_XP_MILESTONES) ─────────────────
const RANK_MILESTONES = [
  { rank: "Inklings",       xp: 0,    icon: "📝" },
  { rank: "Scribe",         xp: 150,  icon: "✒️" },
  { rank: "Quill Bearer",   xp: 600,  icon: "🪶" },
  { rank: "Scholar",        xp: 1500, icon: "📚" },
  { rank: "Architect",      xp: 3500, icon: "🏛️" },
  { rank: "Inkwell Legend", xp: 7000, icon: "👑" },
];

// ── XP / Rank progress card ───────────────────────────────────────────────────
function WriterXPCard({ userId }) {
  const [progress,    setProgress]    = useState(null);
  const [pendingRank, setPendingRank] = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    fetch(`${API_URL}/missions/progress/${userId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.progress) {
          setProgress(d.progress);
          setPendingRank(d.progress.pendingRank || null);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden animate-pulse">
        <div className="h-44 bg-gray-200" />
        <div className="bg-white p-6 space-y-3">
          <div className="h-4 w-2/3 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded-full" />
          <div className="h-3 w-4/5 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const cfg = RANK_CONFIG[progress.rank] || RANK_CONFIG["Inklings"];
  const rankIdx = RANK_MILESTONES.findIndex((m) => m.rank === progress.rank);

  return (
    <div className="rounded-2xl overflow-hidden shadow-soft-lg">

      {/* ── Pending rank banner ── */}
      {pendingRank && (
        <div className="px-6 pt-5">
          <PendingRankBanner
            pendingRank={pendingRank}
            onClaimed={(r) => {
              setPendingRank(null);
              setProgress((prev) => prev ? { ...prev, rank: r, pendingRank: null } : prev);
            }}
          />
        </div>
      )}

      {/* ── Hero: dark gradient, XP number + current rank ── */}
      <div className="bg-gradient-to-br from-[#1a2233] via-[#2d3748] to-[#1a2233] px-6 pt-6 pb-8 relative overflow-hidden">
        {/* Decorative shimmer strip */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* XP block */}
          <div>
            <p className="text-xs font-semibold text-amber-300/70 uppercase tracking-widest mb-1">Total XP Earned</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl sm:text-6xl font-bold text-amber-300 font-mono tabular-nums leading-none animate-glow-pulse">
                {(progress.totalXp || 0).toLocaleString()}
              </span>
              <span className="text-amber-300/60 text-lg font-semibold mb-1">XP</span>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              {(progress.totalWordsWritten || 0).toLocaleString()} words written · {progress.totalMissionsCompleted || 0} missions done
            </p>
          </div>

          {/* Current rank badge */}
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Current Rank</p>
            <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${cfg.badgeBorder} ${cfg.badgeBg}`}>
              <span className="text-2xl">{cfg.icon}</span>
              <span className={`font-bold text-base ${cfg.badgeText}`}>{progress.rank}</span>
            </div>
          </div>
        </div>

        {/* ── Progress bar to next rank ── */}
        {progress.nextRank ? (
          <div className="relative z-10 mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">Progress to <span className="text-amber-300 font-semibold">{progress.nextRank}</span></span>
              <span className="text-xs text-amber-300 font-bold tabular-nums">
                {(progress.xpToNextRank || 0).toLocaleString()} XP to go
              </span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(212,175,55,0.6)]"
                style={{ width: `${Math.max(2, progress.rankPercentage || 0)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-500">{progress.rank}</span>
              <span className="text-[10px] text-gray-500">{progress.nextRank} · {(progress.xpForNextRank || 0).toLocaleString()} XP</span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 mt-6 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/20 border border-amber-400/40 rounded-xl text-amber-300 text-sm font-semibold">
              👑 Max rank achieved — Inkwell Legend!
            </span>
          </div>
        )}
      </div>

      {/* ── Rank ladder ── */}
      <div className="bg-white px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wide">Rank Ladder</h3>
          <Link
            to="/missions"
            className="text-xs font-semibold text-ink-primary hover:text-ink-gold transition-colors"
          >
            View missions →
          </Link>
        </div>

        <div className="space-y-2">
          {RANK_MILESTONES.map((milestone, i) => {
            const mileCfg  = RANK_CONFIG[milestone.rank] || RANK_CONFIG["Inklings"];
            const isCurrent = milestone.rank === progress.rank;
            const isPast    = i < rankIdx;
            const isLocked  = i > rankIdx;

            return (
              <div
                key={milestone.rank}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isCurrent
                    ? `${mileCfg.badgeBg} border-2 ${mileCfg.badgeBorder} shadow-sm`
                    : isPast
                    ? "bg-gray-50 border border-gray-100"
                    : "bg-gray-50/50 border border-dashed border-gray-200 opacity-60"
                }`}
              >
                {/* Status icon */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm">
                  {isPast  ? "✅" : isCurrent ? milestone.icon : "🔒"}
                </div>

                {/* Rank name + XP */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isCurrent ? mileCfg.badgeText : isPast ? "text-gray-600" : "text-gray-400"}`}>
                      {milestone.rank}
                    </span>
                    {isCurrent && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${mileCfg.badgeBg} ${mileCfg.badgeText} border ${mileCfg.badgeBorder}`}>
                        YOU ARE HERE
                      </span>
                    )}
                  </div>
                </div>

                {/* XP milestone */}
                <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${
                  isCurrent ? mileCfg.badgeText : isPast ? "text-gray-400" : "text-gray-300"
                }`}>
                  {milestone.xp === 0 ? "Starter" : `${milestone.xp.toLocaleString()} XP`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showGroupModal, setShowGroupModal] = useState(false);

  function handleGroupSprintCreated(groupSprint) {
    navigate(`/group-sprint/${groupSprint.id}`);
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      <AppMetaTags
        title="My Writing Space"
        description="Showing up, one sprint at a time."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            <DailyQuote />

            {/* Sprint CTA */}
            <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl font-serif text-ink-primary mb-2">
                    Ready to write?
                  </h2>
                  <p className="text-sm sm:text-base text-ink-gray">
                    Even 10 minutes counts. Let's get started.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => navigate("/start-sprint")}
                    className="w-full sm:w-auto px-6 py-3 bg-ink-primary text-white text-base font-medium rounded-xl
                             hover:bg-opacity-90 transition-all shadow-soft
                             focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
                  >
                    Solo Sprint
                  </button>
                  <button
                    onClick={() => setShowGroupModal(true)}
                    className="w-full sm:w-auto px-6 py-3 border-2 border-ink-primary text-ink-primary text-base font-medium rounded-xl
                             hover:bg-ink-primary hover:text-white transition-all
                             focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
                  >
                    Group Sprint
                  </button>
                </div>
              </div>
            </div>

            {/* Existing progress stats (kept exactly as-is) */}
            <ProgressStats />

            {/* XP, rank & rank ladder */}
            {user && <WriterXPCard userId={user.id} />}

            {/* Writing Heatmap */}
            {user && <WritingHeatmap userId={user.id} />}

            {/* Recent Sprints */}
            {user && <RecentSprints userId={user.id} />}
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:space-y-8">
            <WritingSchedule />
          </div>
        </div>
      </main>

      <StartGroupSprintModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreated={handleGroupSprintCreated}
      />
    </div>
  );
}
