// src/components/draftPlan/draftPlanTimeline.jsx
//
// Calendar view of GET /draftplan/timeline (getPlanTimeline) — one card per
// month already computed server-side (status: DONE/BONUS/MISSED/PLANNED per
// day). Clicking a day opens a Sheet to set the chapter/note/picked-day
// toggle (PATCH /day-plan) and optionally log words for that date
// (POST /progress).
//
// Status → color mapping (STATUS_CONFIG below) is the single source of
// truth for the calendar cards, the legend, and the day-editor badge, so
// they never drift apart:
//   DONE    (picked day, wrote)       → full green card + check circle
//   BONUS   (wrote on an off day)     → full purple card + purple dot
//   PLANNED (picked day, still ahead) → plain card + orange dot/label
//   MISSED  (picked day, no entry)    → plain card + gray dot/label
// Only DONE/BONUS get a fully-tinted card (fullCard: true) — a day you
// merely *planned* stays a plain card with just a colored dot + label,
// same as the reference design.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeft, Check, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getTimeline, getMyPlan, planDay, logProgress } from "./draftPlanApi";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const UNIT_LABEL = { WORDS: "Words", CHAPTERS: "Chapters", SCENES: "Scenes" };
const UNIT_SHORT = { WORDS: "wds", CHAPTERS: "ch", SCENES: "sc" };

// Every color read off the semantic ramps in index.css (--success-*,
// --bonus-*, --achievement-*, --ink-*) — never a raw palette value — so a
// new color theme is still a one-file change. Backgrounds/borders use the
// vivid 500 step at a moderate alpha (not the dim 100 step) so the cards
// read as genuinely colored against the near-black page, not just tinted.
const NOTE_COLOR = "hsl(var(--bonus-500))";

const STATUS_CONFIG = {
  DONE: {
    fullCard: true,
    bg:      "hsl(var(--success-500) / 0.22)",
    border:  "hsl(var(--success-500) / 0.55)",
    text:    "hsl(var(--success-700))",
    badgeBg: "hsl(var(--success-500) / 0.22)",
    badge:   "Wrote — picked day",
  },
  BONUS: {
    fullCard: true,
    bg:      "hsl(var(--bonus-500) / 0.24)",
    border:  "hsl(var(--bonus-500) / 0.55)",
    text:    "hsl(var(--bonus-700))",
    badgeBg: "hsl(var(--bonus-500) / 0.24)",
    badge:   "Wrote — bonus day",
  },
  PLANNED: {
    fullCard: true,
    bg:      "hsl(var(--highlight-500) / 0.22)",
    border:  "hsl(var(--highlight-500) / 0.55)",
    text:    "hsl(var(--highlight-700))",
    label:   "planned",
    badgeBg: "hsl(var(--highlight-500) / 0.22)",
    badge:   "Planned",
  },
  MISSED: {
    fullCard: false,
    text:    "hsl(var(--ink-500))",
    label:   "missed",
    badgeBg: "hsl(var(--ink-200) / 0.5)",
    badge:   "Missed",
  },
};

export default function DraftPlanTimeline() {
  const navigate = useNavigate();
  // Multi-plan: mounted at /draftplan/:planId/timeline — which plan's
  // timeline we're showing always comes from the route.
  const { planId } = useParams();
  const [data, setData] = useState(null);
  const [goalType, setGoalType] = useState("WORDS");
  const [error, setError] = useState("");
  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (!planId) { setError("Draft plan not found"); return; }
    // getTimeline() doesn't include goalType — pull it from getMyPlan so
    // the day editor can label the count field correctly (Words/Chapters/Scenes).
    Promise.all([getTimeline(planId), getMyPlan(planId)])
      .then(([res, mine]) => {
        setData(res);
        setGoalType(mine.plan.goalType);
        const todayKey = new Date();
        const idx = res.months.findIndex(
          (m) => m.year === todayKey.getFullYear() && m.month === todayKey.getMonth() + 1
        );
        setMonthIndex(idx >= 0 ? idx : 0);
      })
      .catch((err) => setError(err.message));
  }, [planId]);

  const month = data?.months?.[monthIndex];
  const unitShort = UNIT_SHORT[goalType] || "wds";

  const stats = useMemo(() => {
    if (!month) return null;
    const flat = month.weeks.flat().filter(Boolean);
    return {
      countLogged: flat.reduce((a, d) => a + (d.countLogged || 0), 0),
      done: flat.filter((d) => d.status === "DONE").length,
      bonus: flat.filter((d) => d.status === "BONUS").length,
      missed: flat.filter((d) => d.status === "MISSED").length,
    };
  }, [month]);

  if (error) {
    return (
      <PageShell>
        <p className="text-ink-500">{error}</p>
      </PageShell>
    );
  }
  if (!data || !month) {
    return <PageShell><p className="text-ink-500">Loading your timeline…</p></PageShell>;
  }

  return (
    <PageShell>
      <button
        type="button"
        onClick={() => navigate(`/draftplan/${planId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Draft Plan
      </button>

      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl md:text-3xl text-ink-900">{data.storyTitle}'s journey</h1>
      </div>
      <p className="text-sm text-ink-500 mb-6">
        Started {formatDate(data.planStart)} · estimated finish {formatDate(data.estimatedFinishDate)}
      </p>

      {/* month stats — sits above the calendar, generously spaced */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatChip label={`${UNIT_LABEL[goalType] || "Words"} this month`} value={stats.countLogged.toLocaleString()} tone="hsl(var(--social-500))" />
          <StatChip label="Sessions completed" value={stats.done} tone="hsl(var(--success-500))" />
          <StatChip label="Bonus days" value={stats.bonus} tone="hsl(var(--bonus-500))" />
          <StatChip label="Missed sessions" value={stats.missed} tone="hsl(var(--ink-500))" />
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-xs text-ink-500">
        <LegendItem check color={STATUS_CONFIG.DONE.text} label="Wrote — picked day" />
        <LegendItem color={STATUS_CONFIG.BONUS.text} label="Wrote — bonus day" />
        <LegendItem uncheck color={STATUS_CONFIG.PLANNED.text} label="Upcoming planned" />
        <LegendItem color={STATUS_CONFIG.MISSED.text} label="Missed" />
        <LegendItem color={NOTE_COLOR} label="Has journal entry" small />
      </div>

      {/* month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setMonthIndex((i) => Math.max(i - 1, 0))}
          disabled={monthIndex === 0}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-lg md:text-xl text-ink-900">{MONTH_NAMES[month.month - 1]} {month.year}</p>
        <button
          type="button"
          onClick={() => setMonthIndex((i) => Math.min(i + 1, data.months.length - 1))}
          disabled={monthIndex === data.months.length - 1}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* calendar */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-2">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-ink-500 py-1">{d}</div>
            ))}
          </div>
          <div
            key={monthIndex}
            className="grid grid-cols-7 gap-1.5 md:gap-2 animate-in fade-in duration-300"
          >
            {month.weeks.flat().map((day, i) => (
              <DayCell key={i} day={day} unitShort={unitShort} onSelect={() => day && setSelectedDay(day)} />
            ))}
          </div>
        </CardContent>
      </Card>

      <DayEditor
        day={selectedDay}
        goalType={goalType}
        planId={planId}
        onClose={() => setSelectedDay(null)}
        onSaved={(updated) => {
          setData((prev) => {
            const months = prev.months.map((m) => ({
              ...m,
              weeks: m.weeks.map((w) => w.map((d) => (d && d.date === updated.date ? { ...d, ...updated } : d))),
            }));
            return { ...prev, months };
          });
          setSelectedDay(null);
        }}
      />
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <div className="max-w-4xl mx-auto">{children}</div>
    </div>
  );
}

function Dot({ color, small }) {
  return (
    <span
      className={cn(
        "rounded-full shrink-0",
        small ? "h-1 w-1 md:h-1.5 md:w-1.5" : "h-1.5 w-1.5 md:h-2 md:w-2"
      )}
      style={{ backgroundColor: color }}
    />
  );
}

function CheckCircle({ color, size = "sm" }) {
  return (
    <span
      className={cn(
        "rounded-full flex items-center justify-center shrink-0",
        size === "sm" ? "h-2.5 w-2.5 md:h-3.5 md:w-3.5" : "h-5 w-5"
      )}
      style={{ backgroundColor: color }}
    >
      <Check
        className={size === "sm" ? "h-2 w-2 md:h-2.5 md:w-2.5" : "h-3.5 w-3.5"}
        style={{ color: "hsl(var(--paper))" }}
        strokeWidth={3}
      />
    </span>
  );
}

// Hollow ring — the "not checked off yet" counterpart to CheckCircle, used
// on PLANNED days (a picked day still ahead of you, nothing written yet).
function UncheckedCircle({ color, size = "sm" }) {
  return (
    <span
      className={cn(
        "rounded-full shrink-0 border-2",
        size === "sm" ? "h-2.5 w-2.5 md:h-3.5 md:w-3.5" : "h-5 w-5"
      )}
      style={{ borderColor: color }}
    />
  );
}

function LegendItem({ color, label, dot = true, check, uncheck, small }) {
  return (
    <div className="flex items-center gap-1.5">
      {check ? (
        <CheckCircle color={color} />
      ) : uncheck ? (
        <UncheckedCircle color={color} />
      ) : (
        dot && <Dot color={color} small={small} />
      )}
      {label}
    </div>
  );
}

function StatChip({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 relative overflow-hidden">
      <span className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: tone }} />
      <p className="font-display text-2xl text-ink-900">{value}</p>
      <p className="text-xs text-ink-500 mt-1">{label}</p>
    </div>
  );
}

function DayCell({ day, unitShort, onSelect }) {
  if (!day) return <div className="aspect-square" />;

  const dateNum = new Date(day.date).getUTCDate();
  const status = day.status;
  const cfg = status ? STATUS_CONFIG[status] : null;
  const fullCard = Boolean(cfg?.fullCard);

  const style = {
    backgroundColor: fullCard ? cfg.bg : undefined,
    borderColor: fullCard ? cfg.border : undefined,
    boxShadow: day.isToday ? "0 0 0 2px hsl(var(--social-500))" : undefined,
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      style={style}
      className={cn(
        "aspect-square rounded-xl border flex flex-col p-1 md:p-2 text-left relative overflow-hidden transition-all hover:brightness-125",
        !fullCard && "border-border hover:bg-secondary"
      )}
    >
      <div className="flex items-center justify-between gap-0.5">
        <span
          className="text-[10px] md:text-xs font-semibold"
          style={{ color: fullCard ? cfg.text : "hsl(var(--ink-700))" }}
        >
          {dateNum}
        </span>
        <div className="flex items-center gap-0.5 md:gap-1">
          {day.hasNote && <Dot color={NOTE_COLOR} small />}
          {status === "DONE" && <CheckCircle color={cfg.text} />}
          {status === "BONUS" && <Dot color={cfg.text} />}
          {status === "PLANNED" && <UncheckedCircle color={cfg.text} />}
          {status === "MISSED" && <Dot color={cfg.text} />}
        </div>
      </div>

      {fullCard && day.chapterLabel && (
        <p className="hidden md:block text-[10px] leading-snug mt-1 line-clamp-2 font-medium" style={{ color: cfg.text }}>
          {day.chapterLabel}
        </p>
      )}

      <div className="mt-auto">
        {fullCard && day.countLogged > 0 ? (
          <p className="text-[9px] md:text-[10px] font-semibold truncate" style={{ color: cfg.text }}>
            {day.countLogged.toLocaleString()}
            <span className="hidden md:inline"> {unitShort}</span>
          </p>
        ) : cfg?.label ? (
          <p className="hidden md:block text-[10px] font-medium truncate" style={{ color: cfg.text }}>{cfg.label}</p>
        ) : null}
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mt-3"
      style={{ backgroundColor: cfg.badgeBg, color: cfg.text }}
    >
      {status === "DONE" && <Check className="h-3 w-3" strokeWidth={3} />}
      {cfg.badge}
    </span>
  );
}

function DayEditor({ day, goalType, planId, onClose, onSaved }) {
  const [chapterLabel, setChapterLabel] = useState("");
  const [note, setNote] = useState("");
  const [isPickedDay, setIsPickedDay] = useState(false);
  const [countLogged, setCountLogged] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (day) {
      setChapterLabel(day.chapterLabel || "");
      setNote(day.note || "");
      setIsPickedDay(Boolean(day.isPickedDay));
      setCountLogged("");
      setTimeSpent("");
    }
  }, [day]);

  if (!day) return null;

  // "Committed" = this day already has real words logged (DONE/BONUS),
  // decided from the day as it was when the sheet opened — not the live
  // toggle state — so the toggle box adopts that status color (green for a
  // picked day you actually wrote, purple for a bonus day) the same way
  // screenshot 3's design does, instead of always defaulting to blue.
  const settledTone = day.status === "DONE" ? "success" : day.status === "BONUS" ? "bonus" : null;
  const committed = day.countLogged > 0 && settledTone;

  const toggleTrackColor = committed
    ? `hsl(var(--${settledTone}-500))`
    : isPickedDay
      ? "hsl(var(--social-500))"
      : "hsl(var(--paper-border))";

  async function save() {
    setSaving(true);
    try {
      await planDay(planId, {
        logDate: day.date,
        chapterLabel: chapterLabel.trim() || undefined,
        note: note.trim() || undefined,
        isPickedDay,
      });
      let updated = { ...day, chapterLabel: chapterLabel.trim() || null, note: note.trim() || null, isPickedDay, hasNote: Boolean(note.trim()) };

      if (countLogged && Number(countLogged) > 0) {
        await logProgress(planId, {
          countLogged: Number(countLogged),
          logDate: day.date,
          note: note.trim() || undefined,
          timeSpent: timeSpent ? Number(timeSpent) : undefined,
        });
        updated = { ...updated, countLogged: Number(countLogged), status: isPickedDay ? "DONE" : "BONUS" };
      }
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={Boolean(day)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 w-full sm:max-w-lg p-6 md:p-8">
        <SheetHeader className="text-left space-y-0">
          <p className="text-xs text-ink-500">{isoDate(day.date)}</p>
          <SheetTitle className="font-display text-2xl md:text-3xl mt-1">{formatDateLong(day.date)}</SheetTitle>
          <StatusBadge status={day.status} />
          <SheetDescription className="mt-3">Set what you're working on and leave a note for future you.</SheetDescription>
        </SheetHeader>

        <div className="space-y-7 mt-8 overflow-y-auto flex-1 pr-1">
          <div
            className="flex items-center justify-between rounded-xl border p-5"
            style={{
              backgroundColor: committed ? `hsl(var(--${settledTone}-500) / 0.14)` : undefined,
              borderColor: committed ? `hsl(var(--${settledTone}-500) / 0.5)` : "hsl(var(--border))",
            }}
          >
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: committed ? `hsl(var(--${settledTone}-700))` : "hsl(var(--ink-900))" }}
              >
                {isPickedDay ? "Planned writing day" : "Not a planned day"}
              </p>
              <p className="text-xs text-ink-500 mt-1">
                {committed ? "Committed session" : isPickedDay ? "Counts toward your weekly target" : "Toggle to mark as planned"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPickedDay((v) => !v)}
              style={{ backgroundColor: toggleTrackColor }}
              className="h-7 w-14 rounded-full transition-colors relative shrink-0 border border-white/10 shadow-inner cursor-pointer"
              aria-pressed={isPickedDay}
              aria-label="Toggle planned writing day"
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform",
                isPickedDay ? "translate-x-7" : "translate-x-0"
              )} />
            </button>
          </div>

          <div>
            <Label htmlFor="chapterLabel" className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Writing session
            </Label>
            <Input
              id="chapterLabel"
              className="mt-2.5 h-11"
              value={chapterLabel}
              onChange={(e) => setChapterLabel(e.target.value)}
              placeholder="Chapter 9 — the confrontation"
            />
          </div>

          <div>
            <Label htmlFor="countLogged" className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              {UNIT_LABEL[goalType] || "Words"} written {day.countLogged ? `(currently ${day.countLogged})` : ""}
            </Label>
            <Input
              id="countLogged"
              type="number"
              min={0}
              className="mt-2.5 h-14 text-2xl font-display font-semibold"
              style={{ color: "hsl(var(--social-500))" }}
              value={countLogged}
              onChange={(e) => setCountLogged(e.target.value)}
              placeholder="Leave blank to skip"
            />
          </div>

          <div>
            <Label htmlFor="timeSpent" className="text-xs font-semibold uppercase tracking-wide text-ink-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Time spent (optional) {day.timeSpent ? `(currently ${day.timeSpent} min)` : ""}
            </Label>
            <Input
              id="timeSpent"
              type="number"
              min={0}
              className="mt-2.5 h-11"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="Minutes"
            />
          </div>

          {day.bonusQuest && (
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: "hsl(var(--bonus-500)/0.14)", borderColor: "hsl(var(--bonus-500)/0.4)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "hsl(var(--bonus-700))" }}>
                Bonus Quest
              </p>
              <p className="text-sm text-ink-900">
                {day.bonusQuest.countLogged.toLocaleString()} / {day.bonusQuest.targetCount?.toLocaleString() ?? "—"} words
                {day.bonusQuest.isCompleted ? " · complete" : ""}
              </p>
              {day.bonusQuest.timeSpent != null && (
                <p className="text-xs text-ink-500 mt-1.5">{day.bonusQuest.timeSpent} min spent</p>
              )}
              {day.bonusQuest.note && (
                <p className="font-display italic text-sm text-ink-700 mt-2">"{day.bonusQuest.note}"</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="note" className="text-xs font-semibold uppercase tracking-wide text-ink-500 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Journal entry
            </Label>
            <Textarea
              id="note"
              className="mt-2.5 font-display italic min-h-[130px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did today's writing go? What did you discover?"
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-3 mt-8">
          <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" size="lg" className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save day"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatDateLong(d) {
  return new Date(d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}