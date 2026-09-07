// src/components/workspace/workspaceDashboard.jsx
//
// The workspace landing page. Pulls together:
//   - a big local-time greeting (the headline) + a smaller encouragement
//     line underneath it, then the "Start writing" pill button
//   - stats row: total words across drafts, chapters/scenes logged (last
//     30 days — only shown if the writer's actually logged that type),
//     current streak with a "Best: N days" subtitle
//   - a writing-activity bar graph (Words/Chapters/Scenes tabs, 7/15/30d
//     range) — real per-day data from workspaceService.getMyActivitySeries,
//     which reads DailyWritingActivity rows. A day counts here the same way
//     it counts toward a streak: logging progress OR sprinting, either one
//     lights the bar up.
//   - the weekly-goal ring for whichever plan the writer most recently
//     logged progress on (writers can hold several plans; the dashboard
//     only spotlights one — see workspaceService.getMyWeeklyGoalPlan)
//   - a compact "Top streaks" card (top 6, 6-day minimum to qualify)
//   - the writer's own note on what KIND OF WRITER they want to become —
//     not story-specific, a standing private reminder (WorkspaceProfile.aspiration)
//   - a tabbed "Community" card: "Writing today" (writers who've ALREADY
//     logged or sprinted today, each with a "Send card" CTA that fires a
//     real notification via workspaceService.sendEncouragementCard),
//     "This week's winners" (Sundays only — writers who hit their weekly
//     target; the tab itself doesn't exist Mon–Sat, not just empty), and
//     "Finished drafts" (writers who completed a full draft plan recently)
//
// Explicitly NOT in this pass (by request): the weekly-target progress bar.
//
// Colors are all semantic --{tone}-* tokens from index.css — social (sky,
// identity/primary actions), achievement (amber, streak/goal-in-progress),
// success (green, goal met/finished). No raw hex, no gold, no emoji.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, BookOpen, PenLine, ArrowRight, Sparkles, FileText, Send, Check, Trophy, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth/authContext";
import {
  getMyStats,
  getWorkspaceFeed,
  getWeeklyWinners,
  getFinishedDrafts,
  getTopStreaks,
  getMyProfile,
  updateMyProfile,
  getMyActivitySeries,
} from "./workspaceApi";
import SendCardModal from "../mailbox/sendCardModal";
import { getSentCards } from "../mailbox/mailboxApi";
import ClickableUsername from "../profile/clickableusername";
import FoundingWritersCarousel from "../foundingWriters/foundingWritersCarousel";

const UNIT_LABEL = { WORDS: "words", CHAPTERS: "chapters", SCENES: "scenes" };

// Rotates on each visit so the CTA doesn't go stale — picked once per
// mount, not re-rolled on every render.
const ENCOURAGEMENT = [
  "Even a hundred words today keeps the story moving.",
  "You don't have to feel ready. You just have to start typing.",
  "Every page you've written is proof you can write one more.",
  "The blank page only wins if you stop showing up.",
  "Your story is worth the ten minutes it'll take to open it.",
  "Small, unglamorous progress is still progress.",
  "Future you will be glad you wrote today, even a little.",
];

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5)  return "Still up, still writing";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Working late";
  }, []);
}

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const greeting = useGreeting();
  const encouragement = useMemo(
    () => ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)],
    []
  );

  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  // Recipient IDs already sent a card *today* — sourced from the real
  // sent-cards list, not local component state, so "Card sent" survives a
  // reload instead of resetting to "Send card" every time.
  const [sentToday, setSentToday] = useState(new Set());

  useEffect(() => {
    getMyStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    getSentCards()
      .then((res) => {
        const todayKey = new Date().toDateString();
        const ids = new Set(
          (res.cards || [])
            .filter((c) => new Date(c.createdAt).toDateString() === todayKey)
            .map((c) => c.recipient?.id)
            .filter(Boolean)
        );
        setSentToday(ids);
      })
      .catch(() => { /* the send buttons just fall back to session-only state */ });
  }, []);

  if (error) {
    return (
      <PageShell>
        <p className="text-ink-500">{error}</p>
      </PageShell>
    );
  }

  if (!stats) {
    return (
      <PageShell>
        <p className="text-ink-500">Settling into your workspace…</p>
      </PageShell>
    );
  }

  const plan = stats.weeklyGoalPlan;
  const last30 = stats.history?.last30;

  return (
    <PageShell>
      {/* ── Greeting + CTA ─────────────────────────────────────────────── */}
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl text-ink-900 mb-2 leading-tight">
          {greeting}{user?.username ? `, ${user.username}.` : "."}
        </h1>
        <p className="text-ink-500 mb-5">{encouragement}</p>
        <Button size="lg" onClick={() => navigate("/drafts")} className="rounded-full px-6">
          <PenLine className="h-4 w-4" /> Start writing
        </Button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          tone="social"
          label="Total words written"
          sublabel="across all drafts"
          value={stats.totalWordsAcrossDrafts.toLocaleString()}
        />
        {last30 && last30.chapters > 0 && (
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            tone="success"
            label="Chapters logged"
            value={last30.chapters.toLocaleString()}
          />
        )}
        {last30 && last30.scenes > 0 && (
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            tone="social"
            label="Scenes logged"
            value={last30.scenes.toLocaleString()}
          />
        )}
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          tone="achievement"
          label="Current streak"
          value={`${stats.streaks.currentStreak}d`}
          subtitle={`Best: ${stats.streaks.longestStreak} days`}
        />
      </div>

      {/* ── Activity graph + weekly ring ─────────────────────────────── */}
      <div className="grid md:grid-cols-[1fr_320px] gap-6 mb-8">
        <ActivityGraph />

        <Card>
          <CardContent className="p-6 h-full flex flex-col">
            {plan ? (
              <WeeklyGoalRing plan={plan} onOpen={() => navigate(`/draftplan/${plan.planId}`)} />
            ) : (
              <NoPlanYet onCreate={() => navigate("/draftplan/new")} />
            )}

            <div className="border-t border-border mt-5 pt-5 grid grid-cols-2 gap-3">
              <MiniStreakTile tone="achievement" label="Current streak" value={stats.streaks.currentStreak} />
              <MiniStreakTile tone="social" label="Longest streak" value={stats.streaks.longestStreak} />
            </div>
            <p className="text-xs text-ink-500/70 mt-3">
              A streak day counts when you sprint or log progress — either one keeps it alive.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* ── Draft Plans entry point ─────────────────────────────────── */}
        <Card
          onClick={() => navigate("/draftplan")}
          className="cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
        >
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: "hsl(var(--social-100))" }}>
                <BookOpen className="h-5 w-5 text-social" />
              </div>
              <p className="font-display text-xl text-ink-900 mb-1">Draft Plans</p>
              <p className="text-sm text-ink-500">
                {plan ? "See every story you're working on, or start a new one." : "Set up your first draft plan and turn writing into a schedule."}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-social mt-4">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </CardContent>
        </Card>

        {/* ── Top streaks ────────────────────────────────────────────── */}
        <TopStreaksCard currentUserId={user?.id} />

        {/* ── Writer identity note ─────────────────────────────────────── */}
        <IdentityNote />
      </div>

      {/* ── Founding Writers ──────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <FoundingWritersCarousel variant="workspace" />
        </CardContent>
      </Card>

      {/* ── Community — writing today / weekly winners / finished drafts ── */}
      <CommunitySection currentUserId={user?.id} sentToday={sentToday} />
    </PageShell>
  );
}

// ── Activity graph ───────────────────────────────────────────────────────

const RANGES = [
  { value: 7, label: "7d" },
  { value: 15, label: "15d" },
  { value: 30, label: "30d" },
];
const METRICS = [
  { value: "words", label: "Words", tone: "social" },
  { value: "chapters", label: "Chapters", tone: "success" },
  { value: "scenes", label: "Scenes", tone: "achievement" },
];

function ActivityGraph() {
  const [range, setRange] = useState(30);
  const [metric, setMetric] = useState("words");
  const [series, setSeries] = useState(null);
  const [available, setAvailable] = useState(new Set(["words"]));

  useEffect(() => {
    getMyActivitySeries(30).then((full) => {
      const has = new Set(["words"]);
      if (full.some((d) => d.chapters > 0)) has.add("chapters");
      if (full.some((d) => d.scenes > 0)) has.add("scenes");
      setAvailable(has);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setSeries(null);
    getMyActivitySeries(range).then(setSeries).catch(() => setSeries([]));
  }, [range]);

  const activeMetrics = METRICS.filter((m) => available.has(m.value));
  const maxVal = useMemo(() => {
    if (!series || series.length === 0) return 1;
    const max = Math.max(...series.map((d) => d[metric] || 0), 1);
    // round up to a friendly step so the axis doesn't look arbitrary
    const step = max <= 10 ? 1 : max <= 50 ? 10 : max <= 200 ? 25 : max <= 1000 ? 100 : 500;
    return Math.ceil(max / step) * step;
  }, [series, metric]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="font-display text-lg text-ink-900">Writing activity</p>
            <p className="text-xs text-ink-500">Days you showed up</p>
          </div>

          <div className="flex items-center gap-3">
            {activeMetrics.length > 1 && (
              <div className="flex rounded-full border border-border p-0.5">
                {activeMetrics.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMetric(m.value)}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-colors"
                    style={
                      metric === m.value
                        ? { backgroundColor: `hsl(var(--${m.tone}-100))`, color: `hsl(var(--${m.tone}-700))` }
                        : { color: "hsl(var(--ink-500))" }
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex rounded-full border border-border p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className="text-xs font-semibold px-3 py-1 rounded-full transition-colors"
                  style={
                    range === r.value
                      ? { backgroundColor: "hsl(var(--social-100))", color: "hsl(var(--social-700))" }
                      : { color: "hsl(var(--ink-500))" }
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!series ? (
          <div className="h-48 flex items-center justify-center text-sm text-ink-500">Loading…</div>
        ) : series.every((d) => d[metric] === 0) ? (
          <div className="h-48 flex items-center justify-center text-sm text-ink-500">
            No {metric} logged in this window yet.
          </div>
        ) : (
          <Bars series={series} metric={metric} maxVal={maxVal} tone={METRICS.find((m) => m.value === metric)?.tone || "social"} />
        )}
      </CardContent>
    </Card>
  );
}

function Bars({ series, metric, maxVal, tone }) {
  const [hover, setHover] = useState(null);
  const steps = 4;
  const gridVals = Array.from({ length: steps + 1 }, (_, i) => Math.round((maxVal / steps) * (steps - i)));

  return (
    <div className="relative">
      <div className="flex">
        <div className="flex flex-col justify-between h-48 pr-3 text-xs text-ink-500/70 text-right shrink-0">
          {gridVals.map((v, i) => <span key={i}>{v}</span>)}
        </div>
        <div className="relative flex-1 h-48 border-l border-b border-paper-border">
          {gridVals.slice(0, -1).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-dashed border-paper-border"
              style={{ top: `${(i / steps) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[3px] px-1">
            {series.map((d, i) => {
              const val = d[metric] || 0;
              const h = Math.max((val / maxVal) * 100, val > 0 ? 3 : 1.5);
              return (
                <div
                  key={d.date}
                  className="flex-1 h-full flex items-end relative"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                >
                  <div
                    className="w-full rounded-t-sm transition-all duration-150"
                    style={{
                      height: `${h}%`,
                      backgroundColor: val > 0 ? `hsl(var(--${tone}-500))` : "hsl(var(--paper-border))",
                      opacity: hover === null || hover === i ? 1 : 0.4,
                    }}
                  />
                  {hover === i && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-popover text-popover-foreground border border-border shadow-md text-[11px] rounded-md px-2 py-1 z-10">
                      {val.toLocaleString()} {metric} · {formatShortDate(d.date)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex justify-between text-xs text-ink-500/70 mt-2 pl-10">
        <span>{formatShortDate(series[0]?.date)}</span>
        <span>{formatShortDate(series[series.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function formatShortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Weekly goal ring ─────────────────────────────────────────────────────

function WeeklyGoalRing({ plan, onOpen }) {
  const pct = plan.percentOfWeeklyGoal;
  const met = plan.metWeeklyGoal;
  const tone = met ? "success" : "achievement";
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  const unit = UNIT_LABEL[plan.goalType] || "words";
  const remaining = Math.max(plan.weeklyGoal - plan.weekTotal, 0);

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 104 104" className="h-28 w-28 -rotate-90">
          <circle cx="52" cy="52" r={r} fill="none" strokeWidth="9" style={{ stroke: "hsl(var(--paper-border))" }} />
          <circle
            cx="52" cy="52" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ stroke: `hsl(var(--${tone}-500))`, transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl text-ink-900">{pct}%</span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-1">This week's goal</p>
        <p className="font-display text-lg text-ink-900 truncate mb-1">{plan.storyTitle}</p>
        <p className="text-sm text-ink-500 mb-3">
          {met ? `Goal met — ${plan.weekTotal.toLocaleString()} ${unit}` : `${remaining.toLocaleString()} ${unit} to go`}
        </p>
        <button
          onClick={onOpen}
          className="text-sm font-semibold text-social inline-flex items-center gap-1 hover:underline"
        >
          Open story <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function NoPlanYet({ onCreate }) {
  return (
    <div className="text-center py-4">
      <p className="font-display text-lg text-ink-900 mb-1">No weekly goal yet</p>
      <p className="text-sm text-ink-500 mb-4">Create a draft plan to see your weekly progress here.</p>
      <Button size="sm" onClick={onCreate}>Create a draft plan</Button>
    </div>
  );
}

function MiniStreakTile({ tone, label, value }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: `hsl(var(--${tone}-100))` }}>
      <p className="font-display text-xl" style={{ color: `hsl(var(--${tone}-700))` }}>{value}</p>
      <p className="text-xs" style={{ color: `hsl(var(--${tone}-700))` }}>{label}</p>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────

function StatCard({ icon, tone, label, sublabel, value, subtitle }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
          style={{ backgroundColor: `hsl(var(--${tone}-100))`, color: `hsl(var(--${tone}-600))` }}
        >
          {icon}
        </div>
        <p className="font-display text-2xl text-ink-900 leading-tight">{value}</p>
        <p className="text-xs text-ink-500 mt-0.5">{label}</p>
        {sublabel && <p className="text-xs text-ink-500/70">{sublabel}</p>}
        {subtitle && <p className="text-xs text-ink-500/70 mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ── Writing today ────────────────────────────────────────────────────────
// "Writing today" here means writers who've ALREADY logged or sprinted
// today — see hasSprintOrLogActivityToday in writingactivityservice.js.
// Not the same as "currently writing" (that's live Sprint Room presence).

// ── Community — tabbed card ─────────────────────────────────────────────
// Three feeds share one card instead of stacking three full-width cards:
// "Writing today" (default), "This week's winners" (Sunday-only — hidden
// as a tab entirely Mon–Sat, not just empty), and "Finished drafts". Each
// tab body fetches its own data lazily on first switch to it.

function CommunitySection({ currentUserId, sentToday }) {
  const isSunday = useMemo(() => new Date().getDay() === 0, []);
  const tabs = useMemo(() => [
    { key: "today", label: "Writing today" },
    ...(isSunday ? [{ key: "winners", label: "This week's winners" }] : []),
    { key: "finished", label: "Finished drafts" },
  ], [isSunday]);

  const [tab, setTab] = useState(isSunday ? "winners" : "today");

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="font-display text-lg text-ink-900">Community</p>
          <div className="flex rounded-full border border-border p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                style={
                  tab === t.key
                    ? { backgroundColor: "hsl(var(--social-100))", color: "hsl(var(--social-700))" }
                    : { color: "hsl(var(--ink-500))" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "today" && <WritingTodayList currentUserId={currentUserId} sentToday={sentToday} />}
        {tab === "winners" && isSunday && <WeeklyWinnersList currentUserId={currentUserId} />}
        {tab === "finished" && <FinishedDraftsList currentUserId={currentUserId} />}
      </CardContent>
    </Card>
  );
}

function WritingTodayList({ currentUserId, sentToday }) {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getWorkspaceFeed().then(setMembers).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-ink-500">{error}</p>;
  if (!members) return <p className="text-sm text-ink-500">Loading…</p>;
  if (members.length === 0) {
    return <p className="text-sm text-ink-500">No one's logged progress or sprinted yet today — be the first.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {members.map((w) => (
        <li key={w.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <ClickableUsername userId={w.userId} disabled={w.isCurrentUser} className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar name={w.username} src={w.avatar} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900 truncate">
                {w.username}{w.isCurrentUser && <span className="text-ink-500 font-normal"> (you)</span>}
              </p>
              <p className="text-xs text-ink-500 truncate">{w.storyTitle}</p>
              <TodayActivityLine activity={w.todayActivity} />
            </div>
          </ClickableUsername>
          {!w.isCurrentUser && (
            <SendCardButton toUserId={w.userId} toUsername={w.username} alreadySent={sentToday.has(w.userId)} />
          )}
        </li>
      ))}
    </ul>
  );
}

// What a writer actually did today — logged progress and/or sprinted.
// Both can show at once if they did both; either line is skipped if that
// half of todayActivity wasn't present.
function TodayActivityLine({ activity }) {
  if (!activity) return null;

  const logParts = [];
  if (activity.log?.words > 0) logParts.push(`${activity.log.words.toLocaleString()} words`);
  if (activity.log?.chapters > 0) logParts.push(`${activity.log.chapters.toLocaleString()} chapters`);
  if (activity.log?.scenes > 0) logParts.push(`${activity.log.scenes.toLocaleString()} scenes`);

  return (
    <>
      {logParts.length > 0 && (
        <p className="text-xs text-ink-500/80 truncate">Logged {logParts.join(" · ")}</p>
      )}
      {activity.sprint && activity.sprint.words > 0 && (
        <p className="text-xs text-ink-500/80 truncate">
          {activity.sprint.count > 1 ? (
            <>
              Sprinted {activity.sprint.count}x · {activity.sprint.words.toLocaleString()} words total in {activity.sprint.minutes}m
              {activity.sprint.wpm > 0 && <> · {activity.sprint.wpm} wpm avg</>}
            </>
          ) : (
            <>
              Sprinted {activity.sprint.words.toLocaleString()} words in {activity.sprint.minutes}m
              {activity.sprint.wpm > 0 && <> · {activity.sprint.wpm} wpm</>}
            </>
          )}
        </p>
      )}
    </>
  );
}

// Sundays only — the week's writers who hit their weekly target, ranked by
// how much they logged this week.
function WeeklyWinnersList({ currentUserId }) {
  const [winners, setWinners] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getWeeklyWinners().then(setWinners).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-ink-500">{error}</p>;
  if (!winners) return <p className="text-sm text-ink-500">Loading…</p>;
  if (winners.length === 0) {
    return <p className="text-sm text-ink-500">No one's hit their weekly target yet this week.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {winners.map((w) => (
        <li key={w.planId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <ClickableUsername userId={w.userId} disabled={w.isCurrentUser} className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar name={w.username} src={w.avatar} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900 truncate">
                {w.username}{w.isCurrentUser && <span className="text-ink-500 font-normal"> (you)</span>}
              </p>
              <p className="text-xs text-ink-500 truncate">{w.storyTitle}</p>
            </div>
          </ClickableUsername>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
            style={{ backgroundColor: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}
          >
            <Trophy className="h-3 w-3" /> {w.weekTotal.toLocaleString()} {UNIT_LABEL[w.goalType] || "words"}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Writers who've completed a full draft plan in the last couple weeks.
function FinishedDraftsList({ currentUserId }) {
  const [finished, setFinished] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getFinishedDrafts().then(setFinished).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-ink-500">{error}</p>;
  if (!finished) return <p className="text-sm text-ink-500">Loading…</p>;
  if (finished.length === 0) {
    return <p className="text-sm text-ink-500">No finished drafts in the last couple weeks yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {finished.map((f) => (
        <li key={f.planId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <ClickableUsername userId={f.userId} disabled={f.isCurrentUser} className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar name={f.username} src={f.avatar} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-900">
                <span className="font-medium">
                  {f.username}{f.isCurrentUser && <span className="text-ink-500 font-normal"> (you)</span>}
                </span>{" "}
                finished <span className="italic">"{f.storyTitle}"</span>
              </p>
              <p className="text-xs text-ink-500">
                {formatShortDate(f.completedAt)} · {f.targetLength.toLocaleString()} {UNIT_LABEL[f.goalType] || "words"}
              </p>
            </div>
          </ClickableUsername>
          <PartyPopper className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--achievement-500))" }} />
        </li>
      ))}
    </ul>
  );
}

// ── Top streaks ──────────────────────────────────────────────────────────
// Compact leaderboard, top 6, 6-day minimum streak to qualify. Lives beside
// Draft Plans / Identity Note rather than as its own full-width section.

function TopStreaksCard({ currentUserId }) {
  const [leaders, setLeaders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getTopStreaks().then(setLeaders).catch((err) => setError(err.message));
  }, []);

  return (
    <Card>
      <CardContent className="p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-4 w-4 text-achievement" />
          <p className="font-display text-lg text-ink-900">Top streaks</p>
        </div>

        {error ? (
          <p className="text-sm text-ink-500">{error}</p>
        ) : !leaders ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : leaders.length === 0 ? (
          <p className="text-sm text-ink-500">No one's hit a 6-day streak yet — be the first.</p>
        ) : (
          <ul className="space-y-3">
            {leaders.map((w, i) => (
              <li key={w.userId} className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-ink-500 w-3.5 shrink-0">{i + 1}</span>
                <ClickableUsername userId={w.userId} disabled={w.isCurrentUser} className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar name={w.username} src={w.avatar} />
                  <span className="text-sm font-medium text-ink-900 truncate flex-1">
                    {w.username}{w.isCurrentUser && <span className="text-ink-500 font-normal"> (you)</span>}
                  </span>
                </ClickableUsername>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold shrink-0"
                  style={{ color: "hsl(var(--achievement-700))" }}
                >
                  <Flame className="h-3 w-3" /> {w.currentStreak}d
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SendCardButton({ toUserId, toUsername, alreadySent }) {
  const [open, setOpen] = useState(false);
  const [sentThisSession, setSentThisSession] = useState(false);
  const sent = alreadySent || sentThisSession;

  if (sent) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
        style={{ backgroundColor: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}
      >
        <Check className="h-3 w-3" /> Card sent
      </span>
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" className="rounded-full shrink-0" onClick={() => setOpen(true)}>
        <Send className="h-3.5 w-3.5" /> Send card
      </Button>
      {open && (
        <SendCardModal
          recipientId={toUserId}
          recipientName={toUsername}
          onClose={() => setOpen(false)}
          onSent={() => setSentThisSession(true)}
        />
      )}
    </>
  );
}

function Avatar({ name, src }) {
  if (src) {
    return <img src={src} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />;
  }
  const initials = (name || "?").slice(0, 2).toUpperCase();
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
      style={{ backgroundColor: "hsl(var(--social-500))", color: "hsl(var(--social-foreground, 0 0% 100%))" }}
    >
      {initials}
    </div>
  );
}

// ── Writer identity note ─────────────────────────────────────────────────
// NOT about any one story — a standing private note on the kind of writer
// the person wants to become. Lives on WorkspaceProfile.aspiration, same
// field as before; only the framing/copy changed.

function IdentityNote() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((p) => { setSaved(p.aspiration || null); setValue(p.aspiration || ""); })
      .catch(() => {});
  }, []);

  async function save() {
    const trimmed = value.trim();
    setSaving(true);
    try {
      await updateMyProfile({ aspiration: trimmed || null });
      setSaved(trimmed || null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <p className="font-display text-lg text-ink-900">What kind of writer do you want to be?</p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: "hsl(var(--social-100))", color: "hsl(var(--social-700))" }}
          >
            Only visible to you
          </span>
        </div>

        {editing ? (
          <div className="space-y-3">
            <Textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Add a note about the kind of writer you want to be. It'll be here, just for you."
              className="min-h-24"
              style={{ caretColor: "hsl(var(--social-500))" }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setValue(saved || ""); }}>Cancel</Button>
            </div>
          </div>
        ) : saved ? (
          <button onClick={() => setEditing(true)} className="text-left w-full group">
            <blockquote
              className="italic font-display text-ink-700 pl-4 border-l-2"
              style={{ borderColor: "hsl(var(--social-500))" }}
            >
              "{saved}"
            </blockquote>
            <span className="text-xs text-ink-500 mt-2 inline-block group-hover:text-social">Edit note</span>
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="text-sm text-ink-500 hover:text-social text-left">
            Add a note about the kind of writer you want to be. It'll be here, just for you.
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ── layout shell ─────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <div className="max-w-6xl mx-auto">{children}</div>
    </div>
  );
}