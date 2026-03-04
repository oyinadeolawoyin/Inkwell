import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "./header";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";
import WritingHeatmap from "../missions/WritingHeatmap";
import { RankBadge, DifficultyBadge, RANK_CONFIG } from "../missions/MissionCard";

// ── Rank milestones (mirrors backend) ────────────────────────────────────────
const RANK_MILESTONES = [
  { words: 0,     rank: "Inklings" },
  { words: 1000,  rank: "Scribe" },
  { words: 5000,  rank: "Quill Bearer" },
  { words: 15000, rank: "Scholar" },
  { words: 30000, rank: "Architect" },
  { words: 50000, rank: "Inkwell Legend" },
];

// ── User avatar ───────────────────────────────────────────────────────────────
function UserAvatar({ username, avatar }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className="w-24 h-24 rounded-full object-cover flex-shrink-0 ring-4 ring-white shadow-soft-lg"
      />
    );
  }
  return (
    <div className="w-24 h-24 rounded-full bg-ink-primary text-white flex items-center justify-center text-3xl font-bold flex-shrink-0 ring-4 ring-white shadow-soft-lg">
      {username?.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

// ── Rank progress bar ─────────────────────────────────────────────────────────
function RankProgress({ rank, totalWordsWritten, nextRank, wordsToNextRank }) {
  if (!nextRank) {
    return (
      <div className="text-sm text-ink-gold font-semibold">
        👑 You've reached the highest rank!
      </div>
    );
  }

  // Find the milestone for current rank and next rank to compute progress
  const currentMilestone = RANK_MILESTONES.find((m) => m.rank === rank);
  const nextMilestone    = RANK_MILESTONES.find((m) => m.rank === nextRank);
  const rangeStart       = currentMilestone?.words ?? 0;
  const rangeEnd         = nextMilestone?.words ?? rangeStart + wordsToNextRank;
  const progress         = Math.min(100, Math.round(((totalWordsWritten - rangeStart) / (rangeEnd - rangeStart)) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {(wordsToNextRank ?? 0).toLocaleString()} words to{" "}
          <span className="font-semibold text-ink-primary">{nextRank}</span>
        </span>
        <span className="font-bold text-ink-primary">{progress}%</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #d4af37, #f0c040)",
          }}
        />
      </div>
    </div>
  );
}

// ── Recent completed missions ─────────────────────────────────────────────────
function RecentMissions({ userId }) {
  const [missions,  setMissions]  = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    fetch(`${API_URL}/missions/recent/${userId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMissions(d.missions || []); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-6 space-y-3">
        <div className="h-5 w-40 bg-gray-100 rounded-lg animate-pulse mb-4" />
        <div className="h-14 bg-gray-50 rounded-xl animate-pulse" />
        <div className="h-14 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (missions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-6">
      <h3 className="text-xl font-serif text-ink-primary mb-4">Recent Missions</h3>
      <div className="space-y-3">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
          >
            <div className="text-xl flex-shrink-0">✅</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-primary text-sm truncate">{mission.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <DifficultyBadge difficulty={mission.difficulty} />
                {mission.completedAt && (
                  <span className="text-xs text-gray-400">
                    {new Date(mission.completedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user: authUser }    = useAuth();
  const { userId: urlUserId } = useParams();
  const navigate              = useNavigate();

  const targetUserId = urlUserId ? Number(urlUserId) : authUser?.id;

  const [profileUser, setProfileUser] = useState(null);
  const [progress,    setProgress]    = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    if (!targetUserId) { setIsLoading(false); return; }
    fetchData(targetUserId);
  }, [targetUserId]);

  async function fetchData(uid) {
    setIsLoading(true);
    try {
      const [userRes, progressRes] = await Promise.all([
        fetch(`${API_URL}/users/${uid}/user`, { credentials: "include" }),
        fetch(`${API_URL}/missions/progress/${uid}`, { credentials: "include" }),
      ]);
      if (userRes.ok) {
        const d = await userRes.json();
        setProfileUser(d.user || null);
      }
      if (progressRes.ok) {
        const d = await progressRes.json();
        setProgress(d.progress || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-cream">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden animate-pulse">
            <div className="h-1.5 w-full bg-gray-100" />
            <div className="p-8">
              <div className="flex items-start gap-5 mb-7">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 pt-1 space-y-2">
                  <div className="h-7 w-44 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                  <div className="h-4 w-72 bg-gray-50 rounded" />
                </div>
              </div>
              <div className="h-16 bg-gray-50 rounded-xl mb-6" />
              <div className="h-3 w-full bg-gray-100 rounded-full" />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-soft p-6 h-40 animate-pulse" />
        </main>
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────
  if (!targetUserId) {
    return (
      <div className="min-h-screen bg-ink-cream">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-serif text-ink-primary mb-3">Sign in to view your profile</h1>
          <button
            onClick={() => navigate("/login")}
            className="px-8 py-3 bg-ink-primary text-white rounded-xl font-medium hover:opacity-90 transition-all"
          >
            Sign in
          </button>
        </main>
      </div>
    );
  }

  const rankCfg = RANK_CONFIG[progress?.rank] || RANK_CONFIG["Inklings"];

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      <AppMetaTags
        title={profileUser ? `${profileUser.username}'s Profile – Inkwell` : "Profile – Inkwell"}
        description="Writing stats, activity, and missions."
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">

        {/* ── Profile card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">

          {/* Rank-coloured top accent strip */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${rankCfg.gradient}`} />

          <div className="p-6 sm:p-8">

            {/* Avatar + identity */}
            <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 mb-7">
              <UserAvatar
                username={profileUser?.username || authUser?.username}
                avatar={profileUser?.avatar || profileUser?.profileImage}
              />
              <div className="flex-1 min-w-0 sm:pt-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-serif text-ink-primary leading-tight">
                    {profileUser?.username || authUser?.username || "Writer"}
                  </h1>
                  {progress?.rank && <RankBadge rank={progress.rank} size="md" />}
                </div>
                {profileUser?.bio && (
                  <p className="text-sm text-gray-500 leading-relaxed max-w-prose">
                    {profileUser.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Stats row */}
            {progress && (
              <div className="flex items-stretch divide-x divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-6">
                <div className="flex-1 flex flex-col items-center justify-center py-4 px-3 gap-0.5">
                  <span className="text-xl sm:text-2xl font-bold text-ink-primary">
                    {(progress.totalWordsWritten || 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wide">Words written</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-4 px-3 gap-0.5">
                  <span className="text-xl sm:text-2xl font-bold text-ink-primary">
                    {progress.totalMissionsCompleted || 0}
                  </span>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wide">Missions done</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-4 px-3 gap-0.5">
                  <span className={`text-sm sm:text-base font-bold ${rankCfg.textColor}`}>
                    {progress.rank}
                  </span>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wide">Current rank</span>
                </div>
              </div>
            )}

            {/* Rank progress bar */}
            {progress?.nextRank && (
              <RankProgress
                rank={progress.rank}
                totalWordsWritten={progress.totalWordsWritten}
                nextRank={progress.nextRank}
                wordsToNextRank={progress.wordsToNextRank}
              />
            )}

          </div>
        </div>

        {/* ── Writing heatmap ─────────────────────────────────────────────── */}
        <WritingHeatmap userId={targetUserId} />

        {/* ── Recent completed missions ────────────────────────────────────── */}
        <RecentMissions userId={targetUserId} />

      </main>
    </div>
  );
}
