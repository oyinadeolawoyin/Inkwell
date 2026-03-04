import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API_URL from "@/config/api";

// ── Confetti ──────────────────────────────────────────────────────────────────
export function Confetti({ active, onDone }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!active) return;
    const colors = ["#d4af37", "#2d3748", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];
    const p = Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[i % colors.length],
      width: `${Math.random() * 8 + 5}px`,
      height: `${Math.random() * 12 + 6}px`,
      delay: `${Math.random() * 0.9}s`,
      duration: `${Math.random() * 1.5 + 1.5}s`,
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
    }));
    setPieces(p);
    const timer = setTimeout(() => {
      setPieces([]);
      onDone?.();
    }, 3800);
    return () => clearTimeout(timer);
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius: p.borderRadius,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

// ── Difficulty config ─────────────────────────────────────────────────────────
export const DIFFICULTY = {
  EASY: {
    label: "Easy",
    icon: "🌱",
    gradient: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    hoverBorder: "hover:border-emerald-400",
    hoverShadow: "hover:shadow-emerald-100",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    completedBg: "bg-emerald-50 border-emerald-200",
    lockedBg: "bg-gray-50 border-gray-200",
    progressBar: "bg-emerald-500",
    progressTrack: "bg-emerald-100",
    progressText: "text-emerald-700",
    glowClass: "animate-glow-emerald",
    claimBtn: "from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
  },
  MEDIUM: {
    label: "Medium",
    icon: "⚡",
    gradient: "from-amber-50 to-yellow-50",
    border: "border-amber-200",
    hoverBorder: "hover:border-amber-400",
    hoverShadow: "hover:shadow-amber-100",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    completedBg: "bg-amber-50 border-amber-200",
    lockedBg: "bg-gray-50 border-gray-200",
    progressBar: "bg-amber-500",
    progressTrack: "bg-amber-100",
    progressText: "text-amber-700",
    glowClass: "animate-glow-amber",
    claimBtn: "from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600",
  },
  HARD: {
    label: "Hard",
    icon: "🔥",
    gradient: "from-rose-50 to-red-50",
    border: "border-rose-200",
    hoverBorder: "hover:border-rose-400",
    hoverShadow: "hover:shadow-rose-100",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    completedBg: "bg-rose-50 border-rose-200",
    lockedBg: "bg-gray-50 border-gray-200",
    progressBar: "bg-rose-500",
    progressTrack: "bg-rose-100",
    progressText: "text-rose-700",
    glowClass: "animate-glow-rose",
    claimBtn: "from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600",
  },
};

// ── DifficultyBadge ───────────────────────────────────────────────────────────
export function DifficultyBadge({ difficulty, size = "sm" }) {
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.EASY;
  const sz =
    size === "lg" ? "text-sm px-3 py-1 gap-1.5" : "text-xs px-2 py-0.5 gap-1";
  return (
    <span
      className={`${cfg.badge} ${sz} rounded-full font-semibold inline-flex items-center`}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ── Rank config ───────────────────────────────────────────────────────────────
export const RANK_CONFIG = {
  Inklings:         { gradient: "from-slate-400 to-gray-500",    icon: "📝", textColor: "text-gray-600",    badgeBg: "bg-slate-100",  badgeText: "text-slate-700",  badgeBorder: "border-slate-300" },
  Scribe:           { gradient: "from-sky-400 to-blue-500",      icon: "✒️", textColor: "text-blue-700",    badgeBg: "bg-blue-50",    badgeText: "text-blue-700",   badgeBorder: "border-blue-300" },
  "Quill Bearer":   { gradient: "from-emerald-400 to-teal-500",  icon: "🪶", textColor: "text-emerald-700", badgeBg: "bg-emerald-50", badgeText: "text-emerald-700",badgeBorder: "border-emerald-300" },
  Scholar:          { gradient: "from-violet-400 to-purple-500", icon: "📚", textColor: "text-purple-700",  badgeBg: "bg-violet-50",  badgeText: "text-violet-700", badgeBorder: "border-violet-300" },
  Architect:        { gradient: "from-orange-400 to-amber-500",  icon: "🏛️", textColor: "text-amber-700",   badgeBg: "bg-amber-50",   badgeText: "text-amber-700",  badgeBorder: "border-amber-300" },
  "Inkwell Legend": { gradient: "from-yellow-300 to-amber-400",  icon: "👑", textColor: "text-amber-600",   badgeBg: "bg-yellow-50",  badgeText: "text-yellow-700", badgeBorder: "border-yellow-400" },
};

// ── RankBadge ─────────────────────────────────────────────────────────────────
export function RankBadge({ rank, size = "md" }) {
  const cfg = RANK_CONFIG[rank] || RANK_CONFIG["Inklings"];
  const textCls =
    size === "xl" ? "text-sm" :
    size === "lg" ? "text-xs" :
    size === "sm" ? "text-[10px]" :
                    "text-xs";

  return (
    <span
      className={`inline-flex items-stretch rounded font-semibold overflow-hidden border ${cfg.badgeBorder} ${textCls}`}
    >
      <span className="bg-[#2d3748] text-[#fafaf9] flex items-center px-2 py-0.5 whitespace-nowrap">
        RANK
      </span>
      <span className={`${cfg.badgeBg} ${cfg.badgeText} flex items-center px-2.5 py-0.5 whitespace-nowrap`}>
        {rank}
      </span>
    </span>
  );
}

// ── MissionCard ───────────────────────────────────────────────────────────────
// missionSlot = { difficulty, mission: obj|null, message?: string, progress?: { current, required, percentage } }
export default function MissionCard({ missionSlot }) {
  const { difficulty, mission, progress } = missionSlot;
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.EASY;
  const isComplete = progress?.percentage >= 100;

  // Empty slot (all missions in this tier done)
  if (!mission) {
    return (
      <div
        className={`relative rounded-2xl border-2 border-dashed ${cfg.border} bg-gradient-to-br ${cfg.gradient}
                    p-6 flex flex-col items-center justify-center text-center min-h-[180px]
                    transition-all duration-300`}
      >
        <div className="text-4xl mb-3 animate-bounce">🎉</div>
        <DifficultyBadge difficulty={difficulty} />
        <p className="text-sm text-gray-500 mt-3 leading-relaxed font-medium">
          All {cfg.label} missions complete!
        </p>
        <p className="text-xs text-gray-400 mt-1">Keep writing for more challenges</p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl border-2 ${cfg.border} bg-gradient-to-br ${cfg.gradient}
                   p-6 group cursor-default transition-all duration-300
                   ${cfg.hoverBorder} hover:shadow-lg ${cfg.hoverShadow} hover:-translate-y-0.5
                   flex flex-col gap-3 ${isComplete ? cfg.glowClass : ""}`}
    >
      {/* Completion checkmark badge */}
      {isComplete && (
        <div className="absolute -top-2.5 -right-2.5 bg-white rounded-full shadow-md border border-gray-100 w-8 h-8 flex items-center justify-center text-base z-10">
          ✅
        </div>
      )}

      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <DifficultyBadge difficulty={difficulty} />
        <span className="text-2xl group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
          {cfg.icon}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-serif text-lg text-ink-primary leading-tight">{mission.title}</h3>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed flex-1">{mission.description}</p>

      {/* Progress section */}
      {progress ? (
        <div className="mt-auto pt-3 border-t border-white/70 space-y-2">
          {/* Label + numbers */}
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-gray-500 font-medium truncate">
              {formatType(mission.type)}
            </span>
            <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${isComplete ? cfg.progressText : "text-gray-600"}`}>
              {progress.current.toLocaleString()} / {progress.required.toLocaleString()}
            </span>
          </div>

          {/* Progress bar */}
          <div className={`h-2.5 rounded-full ${cfg.progressTrack} overflow-hidden`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.progressBar}`}
              style={{ width: `${Math.min(100, progress.percentage)}%` }}
            />
          </div>

          {/* Percentage label */}
          <p className={`text-xs ${isComplete ? `font-semibold ${cfg.progressText}` : "text-gray-400"}`}>
            {isComplete ? "Complete! 🎉" : `${progress.percentage}% done`}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-white/70">
          <div className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
          <span className="text-xs text-gray-500 font-medium">{formatRequirement(mission)}</span>
        </div>
      )}

      {/* Claim Reward — shown only when 100% complete */}
      {isComplete && (
        <Link
          to="/missions"
          className={`w-full py-2.5 bg-gradient-to-r ${cfg.claimBtn} text-white font-semibold rounded-xl
                      text-sm text-center transition-all duration-200
                      hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                      flex items-center justify-center gap-1.5`}
        >
          <span>🎁</span>
          <span>Claim Reward</span>
          <span>→</span>
        </Link>
      )}
    </div>
  );
}

function formatRequirement({ type, requirement }) {
  switch (type) {
    case "SPRINT_WORDS":   return `Write ${requirement.toLocaleString()} words in one sprint`;
    case "TOTAL_WORDS":    return `Accumulate ${requirement.toLocaleString()} total words`;
    case "SPRINT_COUNT":   return `Complete ${requirement} sprint${requirement !== 1 ? "s" : ""}`;
    case "SPRINT_DURATION":return `Sprint for ${requirement} minutes`;
    default:               return `Requirement: ${requirement}`;
  }
}

function formatType(type) {
  switch (type) {
    case "SPRINT_WORDS":    return "Best sprint words";
    case "TOTAL_WORDS":     return "Total words written";
    case "SPRINT_COUNT":    return "Sprints completed";
    case "SPRINT_DURATION": return "Longest sprint (min)";
    default:                return "Progress";
  }
}

// ── PendingRankBanner ─────────────────────────────────────────────────────────
export function PendingRankBanner({ pendingRank, onClaimed }) {
  const [claiming, setClaiming] = useState(false);
  const [claimed,  setClaimed]  = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState(null);

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/missions/claim-rank`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setClaimed(true);
        setShowConfetti(true);
        onClaimed?.(data.rank);
      } else {
        const err = await res.json();
        setError(err.message || "Failed to claim rank");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  if (claimed) {
    return (
      <>
        <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 p-5
                        flex items-center gap-4 shadow-lg">
          <div className="text-3xl animate-bounce">🎉</div>
          <div>
            <p className="font-bold text-white text-lg">Rank claimed!</p>
            <p className="text-amber-900/80 text-sm">
              You are now a <strong>{pendingRank}</strong>. Keep writing!
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      <div
        className="animate-glow-pulse rounded-2xl
                   bg-gradient-to-r from-[#d4af37] via-amber-400 to-[#d4af37]
                   p-5 flex flex-col sm:flex-row items-start sm:items-center
                   justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="text-3xl animate-float">🏆</div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">New rank unlocked!</p>
            <p className="text-amber-900/80 text-sm">
              You've earned the rank of{" "}
              <strong className="text-white">{pendingRank}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="px-5 py-2.5 bg-white text-amber-700 font-bold rounded-xl text-sm
                     hover:bg-amber-50 transition-all shadow-sm
                     disabled:opacity-70 hover:scale-105 active:scale-95
                     whitespace-nowrap flex-shrink-0"
        >
          {claiming ? "Claiming…" : "Claim your rank →"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
      )}
    </>
  );
}
