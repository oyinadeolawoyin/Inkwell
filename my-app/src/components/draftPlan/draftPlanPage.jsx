// src/components/draftPlan/draftPlanPage.jsx
//
// The live Draft Plan dashboard: pulled from GET /draftplan/mine
// (getPlanProgress — returns { plan, stats }). Three rings map onto the
// semantic tokens defined in index.css: story progress → social (sky
// blue), weekly target → achievement (orange, flips to success/green at
// 100%), today → highlight (red, flips to success/green at 100%). Ring
// cards always reference the semantic --{tone}-* CSS vars (see TONE
// below) rather than raw palette names, so swapping in a new color theme
// only means editing index.css. The pace chart is built client-side from
// plan.progressLogs — still a single story-words line, unchanged — but
// each day's hover tooltip now also reads plan.bonusQuests (already on
// the plan object from getMyPlan, no extra fetch) and appends the bonus
// quest word count for that day when one exists, e.g. "2 chapters · Bonus
// day: 400 words". /history returns the same per-day breakdown for any
// other consumer that only has window totals to work from. On bonus days
// the third card is BonusDayCard instead of a ring — see
// bonusquestwheel.jsx for that state machine. Logging today's session is
// never gated by bonus-day status — the "Log today's session" control
// below always works and always counts toward sessionsDone/weekTotal,
// picked day or bonus day alike.

import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image as ImageIcon, Plus, X, CalendarDays, PenLine, Check, Sparkles, Pencil, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { getMyPlan, updatePlan, deletePlan, uploadMoodboardImage, logProgress } from "./draftPlanApi";
import { todayKey, todayCount, todayPercent, isTodayBonusDay } from "./draftPlanHelpers";
import BonusDayCard from "./bonusquestwheel";
import LogProgressModal from "./logProgressModal";

const UNIT = { WORDS: "words", CHAPTERS: "chapters", SCENES: "scenes" };

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// todayTimeSpent — minutes logged today, read straight off plan.progressLogs
// (same array todayCount/todayPercent already work from) rather than a new
// endpoint. Matches on the calendar date only, same convention as those
// helpers, so it lines up with whatever "today" they resolve to.
function todayTimeSpent(plan) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const log = (plan.progressLogs || []).find(
    (l) => new Date(l.logDate).toISOString().slice(0, 10) === todayKey
  );
  return log?.timeSpent ?? 0;
}

// stats.bestDay is { date, countLogged, weekday } | null — null means
// nothing's been logged yet this week, shown as a neutral "No data yet"
// instead of a blank row (see RingCard's `neutral` row flag).
const WEEKDAY_SHORT = { SUN: "Sun", MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat" };
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MIN_WRITING_DAYS = 4;
function formatBestDay(bestDay, unit) {
  if (!bestDay) return "No data yet";
  return `${WEEKDAY_SHORT[bestDay.weekday]} · ${bestDay.countLogged.toLocaleString()} ${unit}`;
}

export default function DraftPlanPage() {
  const navigate = useNavigate();
  // Multi-plan: this page is mounted at /draftplan/:planId now — a writer
  // can hold several plans, so which one we're showing always comes from
  // the route, never assumed. See draftplannewpage.jsx (navigates here with
  // the new plan's id) and the workspace's plan switcher / "Draft Plans"
  // list for the other entry points.
  const { planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!planId) { setError("Draft plan not found"); setLoading(false); return; }
    setLoading(true);
    getMyPlan(planId)
      .then((res) => { setPlan(res.plan); setStats(res.stats); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [planId]);

  if (loading) return <PageShell><p className="text-ink-500">Loading your story space…</p></PageShell>;

  if (error) {
    return (
      <PageShell>
        <p className="text-ink-500 mb-4">{error}</p>
        {error.includes("not found") && (
          <Button onClick={() => navigate("/draftplan/new")}>Create your Draft Plan</Button>
        )}
      </PageShell>
    );
  }

  const unit = UNIT[plan.goalType] || "words";
  const weeklyPercent = stats.weeklyGoal > 0 ? Math.min(Math.round((stats.weekTotal / stats.weeklyGoal) * 100), 100) : 0;
  const todayPct = todayPercent(plan);
  const bonusDay = isTodayBonusDay(plan);

  // Shared refetch used after any progress log — including the Bonus Day
  // card's "stick with regular goal" flow — so every ring on the page
  // (story progress, weekly target, today's goal) stays in sync no matter
  // which card the write happened in.
  const refreshPlan = () => getMyPlan(planId).then((r) => { setPlan(r.plan); setStats(r.stats); return r; });

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deletePlan(planId);
      navigate("/draftplan");
    } catch (err) {
      setDeleting(false);
      setShowDeleteModal(false);
      setError(err.message);
    }
  }

  return (
    <PageShell>
      <StoryHeader plan={plan} onEdit={() => setShowEditModal(true)} onDelete={() => setShowDeleteModal(true)} />

      <PremiseSection plan={plan} onSaved={(premise) => setPlan((p) => ({ ...p, premise }))} />

      <WhyFinish plan={plan} onSaved={(whyFinish) => setPlan((p) => ({ ...p, whyFinish }))} />

      <ProfileCompletionCard plan={plan} />

      {/* items-stretch (the grid default) instead of items-start so all
         three cards match the tallest one's height, regardless of how many
         rows each one renders. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        <RingCard
          tone="progress"
          label="Story progress"
          value={stats.percentComplete}
          rows={[
            { label: `${capitalize(unit)} written`, value: `${stats.totalSoFar.toLocaleString()} of ${plan.targetLength.toLocaleString()}` },
            { label: `${capitalize(unit)} remaining`, value: stats.remaining.toLocaleString() },
            { label: "Sessions", value: `${stats.sessionsDone} completed / ${stats.sessionsTotal} total` },
            { label: "Avg. pace", value: `${stats.avgPace.toLocaleString()} ${unit} / session` },
          ]}
        />
        <RingCard
          tone={weeklyPercent >= 100 ? "success" : "weekly"}
          label="Weekly target"
          value={weeklyPercent}
          rows={[
            { label: "Target this week", value: `${stats.weeklyGoal.toLocaleString()} ${unit}` },
            { label: "Written so far", value: `${stats.weekTotal.toLocaleString()} ${unit}` },
            { label: "Days active", value: `${stats.weekDaysActive} of ${plan.writingDays.length}` },
            { label: "Best day", value: formatBestDay(stats.bestDay, unit), neutral: !stats.bestDay },
          ]}
        />
        {bonusDay ? (
          <BonusDayCard plan={plan} unit={unit} onRefresh={refreshPlan} />
        ) : (
          <RingCard
            tone={todayPct >= 100 ? "success" : "today"}
            label="Today's goal"
            value={todayPct}
            rows={[
              { label: "Today's target", value: `${plan.dailyGoal.toLocaleString()} ${unit}` },
              { label: "Written today", value: `${todayCount(plan).toLocaleString()} ${unit}` },
              { label: "Still to write", value: `${Math.max(plan.dailyGoal - todayCount(plan), 0).toLocaleString()} ${unit}` },
              { label: "Time spent", value: `${todayTimeSpent(plan).toLocaleString()} min`, neutral: todayTimeSpent(plan) === 0 },
            ]}
          />
        )}
      </div>

      <LogSession plan={plan} stats={stats} onRefresh={refreshPlan} />

      <WritingPace plan={plan} unit={unit} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 items-start">
        <Moodboard plan={plan} onSaved={(moodboardImages) => setPlan((p) => ({ ...p, moodboardImages }))} />
        <TimelineCard plan={plan} stats={stats} navigate={navigate} />
      </div>

      {showEditModal && (
        <EditPlanModal
          plan={plan}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => { setPlan((p) => ({ ...p, ...updated })); setShowEditModal(false); refreshPlan(); }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          storyTitle={plan.storyTitle}
          deleting={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </PageShell>
  );
}

// ── layout shell ─────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <div className="max-w-5xl mx-auto">{children}</div>
    </div>
  );
}

// ── header ───────────────────────────────────────────────────────────────

const GOAL_TYPE_LABEL = { WORDS: "Novel", CHAPTERS: "By chapter", SCENES: "By scene" };

function StoryHeader({ plan, onEdit, onDelete }) {
  return (
    <div className="mb-2">
      {/* Stacks below sm: badge+title on top, action buttons drop to their
         own row underneath instead of being squeezed into the same line —
         that squeeze is what was forcing "By scene" to wrap mid-phrase on
         narrow screens. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 tracking-wide whitespace-nowrap">
              DRAFT PLAN
            </span>
            {/* GOAL_TYPE_LABEL stands in for the "Literary Fiction · Novel" genre
               tag in the mockup — there's no genre field on DraftPlan yet, so
               this reads off goalType instead. Add a `genre` column if you want
               the real label back. */}
            <span className="text-sm text-ink-500 whitespace-nowrap">{GOAL_TYPE_LABEL[plan.goalType] || "Novel"}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink-900 leading-tight break-words">
            {plan.storyTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:mt-1">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit plan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-[hsl(var(--destructive)/0.1)]"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── edit plan modal ─────────────────────────────────────────────────────
//
// Lets a writer adjust the two "math" fields that tend to drift over
// time — total story length and their writing-day rhythm (including
// per-day reminder times, or bulk-setting every picked day to one time).
// Everything else (title, goal type, starting count) stays fixed after
// creation on purpose; those aren't exposed here.

function EditPlanModal({ plan, onClose, onSaved }) {
  const unit = UNIT[plan.goalType] || "words";
  const [targetLength, setTargetLength] = useState(String(plan.targetLength));
  const [days, setDays] = useState(
    () => new Map(plan.writingDays.map((wd) => [wd.day, wd.reminderTime]))
  );
  const [bulkTime, setBulkTime] = useState(plan.writingDays[0]?.reminderTime || "09:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = days.size;
  const canSave = Number(targetLength) > 0 && selectedCount >= MIN_WRITING_DAYS;

  function toggleDay(day) {
    setDays((prev) => {
      const next = new Map(prev);
      if (next.has(day)) next.delete(day);
      else next.set(day, bulkTime);
      return next;
    });
  }

  function setDayTime(day, time) {
    setDays((prev) => new Map(prev).set(day, time));
  }

  function applyBulkTime() {
    setDays((prev) => {
      const next = new Map(prev);
      for (const day of next.keys()) next.set(day, bulkTime);
      return next;
    });
  }

  async function save() {
    if (!canSave) return;
    setError("");
    setSaving(true);
    try {
      const writingDays = ALL_DAYS.filter((d) => days.has(d)).map((d) => ({
        day: d,
        reminderTime: days.get(d),
      }));
      const updated = await updatePlan(plan.id, {
        targetLength: Number(targetLength),
        writingDays,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-6 md:p-7">
        <p className="font-display text-2xl text-ink-900 mb-1">Edit your plan</p>
        <p className="text-sm text-ink-500 mb-6">Adjust your story length and writing rhythm any time.</p>

        {/* target length */}
        <div className="mb-6">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2 block">
            Total story length ({unit})
          </label>
          <Input
            type="number"
            min={1}
            value={targetLength}
            onChange={(e) => setTargetLength(e.target.value)}
            className="h-12 text-lg"
          />
        </div>

        {/* writing days */}
        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2 block">
            Writing days
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => {
              const selected = days.has(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "h-11 w-11 rounded-full border-2 font-body font-semibold text-sm transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-card text-ink-700 border-border hover:border-[hsl(var(--social-500))]"
                  )}
                >
                  {WEEKDAY_SHORT[day].slice(0, 2)}
                </button>
              );
            })}
          </div>
          <p className={cn("text-xs mt-2", selectedCount < MIN_WRITING_DAYS ? "text-destructive" : "text-ink-500")}>
            {selectedCount} selected — pick at least {MIN_WRITING_DAYS}, as many as you like above that.
          </p>
        </div>

        {/* bulk reminder time */}
        <div className="mb-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2 block">
              Set all picked days to
            </label>
            <Input
              type="time"
              value={bulkTime}
              onChange={(e) => setBulkTime(e.target.value)}
              className="h-11"
            />
          </div>
          <Button variant="secondary" onClick={applyBulkTime} disabled={selectedCount === 0}>
            Apply to all
          </Button>
        </div>

        {/* per-day reminder times */}
        {selectedCount > 0 && (
          <div className="mb-2 rounded-xl border border-border divide-y divide-border overflow-hidden">
            {ALL_DAYS.filter((d) => days.has(d)).map((day) => (
              <div key={day} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-sm font-medium text-ink-700">{WEEKDAY_SHORT[day]}</span>
                <Input
                  type="time"
                  value={days.get(day)}
                  onChange={(e) => setDayTime(day, e.target.value)}
                  className="h-9 w-32"
                />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive font-medium mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!canSave || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── delete confirmation modal ───────────────────────────────────────────

function DeleteConfirmModal({ storyTitle, deleting, onCancel, onConfirm }) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div className="p-6 md:p-7">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center h-10 w-10 rounded-full bg-[hsl(var(--destructive)/0.12)] shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </span>
          <p className="font-display text-2xl text-ink-900">Delete this draft plan?</p>
        </div>
        <p className="text-sm text-ink-500 mb-6">
          This permanently deletes <span className="font-semibold text-ink-700">"{storyTitle}"</span> — your
          progress log, moodboard, timeline, and everything else attached to it. This can't be undone.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, delete it"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── shared modal shell ──────────────────────────────────────────────────

function ModalOverlay({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── premise / what's it about ───────────────────────────────────────────
//
// Left blank at creation on purpose (see draftplannewpage.jsx) — writers
// tend to skip or rush a premise in the wizard, so it's asked for here
// instead, once the plan already feels real. Same click-to-edit pattern as
// WhyFinish below; renders an inviting placeholder instead of a blank
// blockquote when empty.

const MAX_STORY_TEXT_LENGTH = 500;

function PremiseSection({ plan, onSaved }) {
  const isEmpty = !plan.premise?.trim();
  const [editing, setEditing] = useState(isEmpty);
  const [value, setValue] = useState(plan.premise || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updatePlan(plan.id, { premise: value.trim() });
      onSaved(value.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="premise-section" className="mt-4 max-w-2xl scroll-mt-6">
      {editing ? (
        <div className="space-y-2">
          <Textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_STORY_TEXT_LENGTH))}
            maxLength={MAX_STORY_TEXT_LENGTH}
            placeholder="This is a story about…"
            className="font-display italic text-lg min-h-[110px] bg-card"
          />
          <p className={cn("text-xs text-right", value.length >= MAX_STORY_TEXT_LENGTH ? "text-destructive" : "text-ink-500")}>
            {value.length}/{MAX_STORY_TEXT_LENGTH}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving || !value.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {!isEmpty && (
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setValue(plan.premise); }}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : isEmpty ? (
        <button
          onClick={() => setEditing(true)}
          className="border-l-2 border-dashed border-ink-200 pl-4 text-left group"
        >
          <p className="font-display italic text-lg text-ink-500 group-hover:text-ink-700 transition-colors leading-relaxed">
            What's your story about? Add a premise to bring this plan to life.
          </p>
        </button>
      ) : (
        <button onClick={() => setEditing(true)} className="border-l-2 border-ink-200 pl-4 text-left block w-full">
          <p className="font-display italic text-lg text-ink-900 leading-relaxed hover:text-ink-700 transition-colors">
            {plan.premise}
          </p>
        </button>
      )}
    </div>
  );
}

// ── why finish ───────────────────────────────────────────────────────────

function WhyFinish({ plan, onSaved }) {
  const isEmpty = !plan.whyFinish?.trim();
  const [editing, setEditing] = useState(isEmpty);
  const [value, setValue] = useState(plan.whyFinish || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updatePlan(plan.id, { whyFinish: value.trim() });
      onSaved(value.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="why-section" className="mt-6 border-l-4 border-l-[hsl(var(--sky-500))] border-t-0 border-r-0 border-b-0 rounded-l-none bg-card scroll-mt-6">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--sky-700))" }}>
          Why I'm writing this
        </p>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, MAX_STORY_TEXT_LENGTH))}
              maxLength={MAX_STORY_TEXT_LENGTH}
              placeholder="I'm writing this because…"
              className="font-display italic bg-card"
            />
            <p className={cn("text-xs text-right", value.length >= MAX_STORY_TEXT_LENGTH ? "text-destructive" : "text-ink-500")}>
              {value.length}/{MAX_STORY_TEXT_LENGTH}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving || !value.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              {!isEmpty && (
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setValue(plan.whyFinish); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-display italic text-ink-700 text-left hover:text-ink-900 transition-colors"
          >
            {plan.whyFinish}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ── profile completion checklist ────────────────────────────────────────
//
// Nudges writers to finish the "story feel" fields the wizard no longer
// asks for up front: premise, why-finish, and at least one moodboard
// image. A small ring (same visual language as RingCard below) plus a
// checklist people can click straight through to the relevant section.
// Renders nothing once everything's filled in — no reason to keep a
// congratulatory card taking up space forever.

function ProfileCompletionCard({ plan }) {
  const images = Array.isArray(plan.moodboardImages) ? plan.moodboardImages : [];
  const tasks = [
    { id: "premise-section", label: "Add your story's premise", done: Boolean(plan.premise?.trim()) },
    { id: "why-section", label: "Write down why you're writing this", done: Boolean(plan.whyFinish?.trim()) },
    { id: "moodboard-section", label: "Upload at least one moodboard image", done: images.length > 0 },
  ];
  const doneCount = tasks.filter((t) => t.done).length;
  const percent = Math.round((doneCount / tasks.length) * 100);

  if (doneCount === tasks.length) return null;

  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  function goTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <Card className="mt-6 border-l-4 border-l-[hsl(var(--quest-500))] border-t-0 border-r-0 border-b-0 rounded-l-none bg-card">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
            <g transform="rotate(-90 32 32)">
              <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--quest-100))" strokeWidth="6" />
              <circle
                cx="32" cy="32" r={r} fill="none"
                stroke="hsl(var(--quest-500))" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 700ms ease-out" }}
              />
            </g>
            <text
              x="32" y="32" textAnchor="middle" dominantBaseline="central"
              className="font-display font-semibold"
              style={{ fill: "hsl(var(--quest-700))", fontSize: "13px" }}
            >
              {percent}%
            </text>
          </svg>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "hsl(var(--quest-700))" }}>
              <Sparkles className="h-3.5 w-3.5" /> Finish setting up your story
            </p>
            <p className="text-sm text-ink-500 mt-1 mb-3">
              A few small touches make this plan feel like yours — {tasks.length - doneCount} left.
            </p>
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => goTo(t.id)}
                    disabled={t.done}
                    className={cn(
                      "flex items-center gap-2.5 text-sm text-left w-full group",
                      t.done ? "cursor-default" : "cursor-pointer"
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center h-5 w-5 rounded-full border-2 shrink-0 transition-colors",
                        t.done
                          ? "bg-[hsl(var(--success-500))] border-transparent"
                          : "border-ink-200 group-hover:border-[hsl(var(--quest-500))]"
                      )}
                    >
                      {t.done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className={t.done ? "text-ink-500 line-through" : "text-ink-700 group-hover:text-ink-900 transition-colors"}>
                      {t.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── progress rings ───────────────────────────────────────────────────────
//
// tone maps to the semantic ramps defined in index.css — --social-*
// (story progress, sky blue), --achievement-* (weekly target, orange),
// --highlight-* (today's goal, red), --success-* (green — either ring
// switches to this once its own goal hits 100%, see weeklyPercent/
// todayPct above). Nothing here names a raw palette color, so a new
// color theme is a one-file change in index.css.
const TONE = {
  progress: "social",
  weekly: "achievement",
  today: "highlight",
  success: "success",
};

function RingCard({ tone, label, value, rows }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, 100) / 100) * c;
  const v = TONE[tone];

  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
            {/* circles are rotated -90° so the ring starts at 12 o'clock;
               the percentage text sits in its own sibling so it stays
               upright */}
            <g transform="rotate(-90 44 44)">
              <circle cx="44" cy="44" r={r} fill="none" stroke={`hsl(var(--${v}-100))`} strokeWidth="8" />
              <circle
                cx="44" cy="44" r={r} fill="none"
                stroke={`hsl(var(--${v}-500))`} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 700ms ease-out" }}
              />
            </g>
            <text
              x="44" y="44" textAnchor="middle" dominantBaseline="central"
              className="font-display font-semibold"
              style={{ fill: `hsl(var(--${v}-700))`, fontSize: "17px" }}
            >
              {value}%
            </text>
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `hsl(var(--${v}-700))` }}>
              {label}
            </p>
            <p className="text-2xl font-display text-ink-900 mt-0.5">{value}% done</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-paper-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between py-2 text-sm">
              <span className="text-ink-500">{row.label}</span>
              <span className={row.neutral ? "text-ink-500" : "font-semibold text-ink-900"}>{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── quick log ────────────────────────────────────────────────────────────

function LogSession({ plan, stats, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [saving, setSaving] = useState(false);
  const [progressModal, setProgressModal] = useState(null);

  const unit = UNIT[plan.goalType] || "words";

  async function submit() {
    if (!count || Number(count) < 1) return;
    setSaving(true);
    const todayBefore = todayCount(plan);
    const weekBefore = stats.weekTotal;
    try {
      await logProgress(plan.id, {
        countLogged: Number(count),
        timeSpent: timeSpent ? Number(timeSpent) : undefined,
      });
      setOpen(false);
      setCount(""); setTimeSpent("");
      const refreshed = await onRefresh?.();
      setProgressModal({
        todayBefore,
        todayAfter: refreshed ? todayCount(refreshed.plan) : todayBefore,
        weekBefore,
        weekAfter: refreshed ? refreshed.stats.weekTotal : weekBefore,
        isDraftDone: refreshed ? refreshed.stats.percentComplete >= 100 : false,
      });
    } finally {
      setSaving(false);
    }
  }

  // Note capture now lives in the modal, not the quick-log form. Same
  // "resend today's own count, just to attach a note" trick GoalPane uses
  // for the bonus-day version — /progress upserts by logDate, so sending
  // today's existing count back with a note attaches it without
  // double-counting words.
  async function handleSaveNote(text) {
    await logProgress(plan.id, { logDate: todayKey(), countLogged: todayCount(plan), note: text });
    await onRefresh?.();
  }

  return (
    <div className="mt-5" id="log-session">
      {!open ? (
        <Button variant="achievement" onClick={() => setOpen(true)}>
          <PenLine className="h-4 w-4" /> Log today's session
        </Button>
      ) : (
        <Card>
          <CardContent className="p-5 flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-semibold text-ink-500 mb-1 block">
                {UNIT[plan.goalType]} written today
              </label>
              <Input type="number" min={1} autoFocus value={count} onChange={(e) => setCount(e.target.value)} className="w-full" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-semibold text-ink-500 mb-1 block">Time spent (optional)</label>
              <Input type="number" min={0} placeholder="Minutes" value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} className="w-full" />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="success" onClick={submit} disabled={saving || !count} className="flex-1 md:flex-none">
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 md:flex-none">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {progressModal && (
        <LogProgressModal
          open
          variant="daily"
          onClose={() => setProgressModal(null)}
          storyTitle={plan.storyTitle}
          unit={unit}
          dailyGoal={plan.dailyGoal}
          todayBefore={progressModal.todayBefore}
          todayAfter={progressModal.todayAfter}
          weeklyGoal={stats.weeklyGoal}
          weekBefore={progressModal.weekBefore}
          weekAfter={progressModal.weekAfter}
          isDraftDone={progressModal.isDraftDone}
          onSaveNote={handleSaveNote}
        />
      )}
    </div>
  );
}

// ── writing pace ─────────────────────────────────────────────────────────

// Rounds a max value up to a "nice" round number for the y-axis (1/2/5/10 ×
// a power of ten) so gridline labels read like 550/1100/1650 instead of
// some arbitrary data-driven max.
function niceCeiling(value) {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  let niceResidual;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 5) niceResidual = 5;
  else niceResidual = 10;
  return niceResidual * magnitude;
}

// Smooth curve through the data points using a monotone cubic Hermite
// spline (the same technique d3's curveMonotoneX uses) instead of a plain
// Catmull-Rom spline. A plain Catmull-Rom curve can overshoot past its
// neighboring points between two days, so the visual "tip" of a peak can
// sit at an x-position that doesn't correspond to any real data point —
// hovering there would show the wrong day. Monotone interpolation clamps
// the tangents so each segment never rises or falls past its own two
// endpoints, which guarantees the highest/lowest point of the curve is
// always exactly at a real data point.
function monotoneTangents(xs, ys) {
  const n = xs.length;
  const m = new Array(n).fill(0);
  if (n < 2) return m;

  const d = [];
  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1] - xs[i];
    d.push(h !== 0 ? (ys[i + 1] - ys[i]) / h : 0);
  }

  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = (d[i - 1] === 0 || d[i] === 0 || (d[i - 1] > 0) !== (d[i] > 0)) ? 0 : (d[i - 1] + d[i]) / 2;
  }

  // Fritsch–Carlson: rescale each pair of tangents so the segment can't
  // overshoot the two endpoints it connects.
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const alpha = m[i] / d[i];
    const beta = m[i + 1] / d[i];
    const s = alpha * alpha + beta * beta;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * alpha * d[i];
      m[i + 1] = tau * beta * d[i];
    }
  }
  return m;
}

function smoothPath(points) {
  if (points.length < 2) return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : "";
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const m = monotoneTangents(xs, ys);

  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    const cp1x = xs[i] + dx / 3;
    const cp1y = ys[i] + (m[i] * dx) / 3;
    const cp2x = xs[i + 1] - dx / 3;
    const cp2y = ys[i + 1] - (m[i + 1] * dx) / 3;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  return d;
}

function WritingPace({ plan, unit }) {
  const [period, setPeriod] = useState("7");
  const [hoverIdx, setHoverIdx] = useState(null);
  const days = Number(period);

  const series = useMemo(
    () => buildDailySeries(plan.progressLogs || [], plan.bonusQuests || [], days),
    [plan.progressLogs, plan.bonusQuests, days]
  );

  const width = 700;
  const height = 220;
  const padding = { top: 16, right: 12, bottom: 26, left: 50 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const rawMax = Math.max(...series.map((d) => d.count), 1);
  const axisMax = niceCeiling(rawMax);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(axisMax * f));

  const points = series.map((d, i) => ({
    ...d,
    x: padding.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW),
    y: padding.top + innerH - (d.count / axisMax) * innerH,
  }));

  const linePath = smoothPath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`
    : "";

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setHoverIdx(closest);
  }

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  // Thin out x-axis date labels so they don't overlap on the 15d/30d views —
  // show every point when there's room, otherwise just start/end/mid.
  const labelEvery = points.length <= 8 ? 1 : Math.ceil(points.length / 6);

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Writing activity</p>
            <p className="font-display text-xl text-ink-900">Your pace</p>
          </div>
          <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v)}>
            <ToggleGroupItem value="7" className="h-9 px-3 text-sm">7d</ToggleGroupItem>
            <ToggleGroupItem value="15" className="h-9 px-3 text-sm">15d</ToggleGroupItem>
            <ToggleGroupItem value="30" className="h-9 px-3 text-sm">30d</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full h-56"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="pace-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--social-500))" stopOpacity="0.28" />
                <stop offset="100%" stopColor="hsl(var(--social-500))" stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((t) => {
              const y = padding.top + innerH - (t / axisMax) * innerH;
              return (
                <g key={t}>
                  <line
                    x1={padding.left} x2={width - padding.right} y1={y} y2={y}
                    stroke="hsl(var(--paper-border))" strokeDasharray="3 4"
                  />
                  <text x={padding.left - 14} y={y} textAnchor="end" dominantBaseline="middle" style={{ fontSize: "10px", fill: "hsl(var(--ink-500))" }}>
                    {t}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill="url(#pace-fill)" stroke="none" />
            <path d={linePath} fill="none" stroke="hsl(var(--social-500))" strokeWidth="2.5" />

            {hovered && (
              <>
                <line x1={hovered.x} x2={hovered.x} y1={padding.top} y2={padding.top + innerH} stroke="hsl(var(--ink-200))" />
                <circle cx={hovered.x} cy={hovered.y} r="4.5" fill="hsl(var(--social-500))" stroke="white" strokeWidth="2" />
              </>
            )}

            {points.map((p, i) => (
              (i % labelEvery === 0 || i === points.length - 1) && (
                <text key={p.key} x={p.x} y={height - 6} textAnchor="middle" style={{ fontSize: "10px", fill: "hsl(var(--ink-500))" }}>
                  {p.label}
                </text>
              )
            ))}
          </svg>

          {hovered && (() => {
            const xPct = (hovered.x / width) * 100;
            const yPct = (hovered.y / height) * 100;
            // Flip the anchor near each edge instead of always centering
            // up-and-left off the point — a point that's both near the
            // right edge and near the top (e.g. the last, tallest day)
            // used to push the box outside the card and get clipped.
            const nearLeft  = xPct < 15;
            const nearRight = xPct > 85;
            const nearTop   = yPct < 30;
            const xTransform = nearLeft ? "0%" : nearRight ? "-100%" : "-50%";
            const yTransform = nearTop ? "16px" : "-125%";
            return (
              <div
                className="absolute pointer-events-none bg-card border border-paper-border rounded-lg shadow-md px-3 py-2 whitespace-nowrap"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: `translate(${xTransform}, ${yTransform})`,
                }}
              >
                <p className="text-xs text-ink-500">{hovered.label}</p>
                <p className="text-sm font-semibold text-ink-900">
                  {hovered.count.toLocaleString()} {unit}
                  {hovered.bonusCount > 0 && (
                    <span style={{ color: "hsl(var(--bonus-700))" }}>
                      {" "}· Bonus day: {hovered.bonusCount.toLocaleString()} words
                    </span>
                  )}
                </p>
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

// bonusQuests only counts COMPLETED quests toward the second series — same
// rule getPlanHistory's bonusTotal/getPlanTimeline's "BONUS" status use: an
// opened-but-unfinished quest isn't "bonus day word count" yet.
function buildDailySeries(logs, bonusQuests, days) {
  const byDate = new Map(logs.map((l) => [new Date(l.logDate).toISOString().slice(0, 10), l]));
  const bonusByDate = new Map(
    (bonusQuests || [])
      .filter((q) => q.isCompleted)
      .map((q) => [new Date(q.logDate).toISOString().slice(0, 10), q])
  );
  const today = new Date();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const log = byDate.get(key);
    const bonusQuest = bonusByDate.get(key);
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: Math.max(log?.countLogged ?? 0, 0),
      metGoal: log?.metDailyGoal ?? false,
      bonusCount: Math.max(bonusQuest?.countLogged ?? 0, 0),
    });
  }
  return out;
}

// ── moodboard ────────────────────────────────────────────────────────────

function Moodboard({ plan, onSaved }) {
  const images = Array.isArray(plan.moodboardImages) ? plan.moodboardImages : [];
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || images.length >= 5) return;
    setUploading(true);
    try {
      const { url } = await uploadMoodboardImage(plan.id, file);
      const next = [...images, url].slice(0, 5);
      await updatePlan(plan.id, { moodboardImages: next });
      onSaved(next);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeImage(url) {
    const next = images.filter((i) => i !== url);
    await updatePlan(plan.id, { moodboardImages: next });
    onSaved(next);
  }

  return (
    <Card id="moodboard-section" className="scroll-mt-6">
      <CardContent className="p-4 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-1">Bring it to life</p>
        <p className="font-display text-xl text-ink-900 mb-4">Story moodboard</p>
        {/* 3 cols × 2 rows: first tile spans both rows (the "hero" slot),
           the other four fill in as a 2x2 block beside it — matches the
           reference layout instead of five equal squares in a row.
           Height used to be a flat h-72 (288px) regardless of viewport, so
           on narrow phones the 3 columns got squeezed but the row height
           didn't shrink with them — tiles turned into tall skinny
           rectangles instead of squares. Using aspect-[3/2] on mobile lets
           the grid's height scale with its own width, then locking to a
           fixed h-72 from sm up keeps the original desktop proportions. */}
        <div className="grid grid-cols-3 grid-rows-2 gap-2 sm:gap-3 aspect-[3/2] sm:aspect-auto sm:h-72">
          {Array.from({ length: 5 }).map((_, i) => {
            const url = images[i];
            const spanClass = i === 0 ? "row-span-2" : "";
            if (url) {
              return (
                <div key={i} className={cn("relative rounded-lg overflow-hidden group", spanClass)}>
                  <button
                    onClick={() => setLightboxIndex(i)}
                    className="h-full w-full block cursor-zoom-in"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                  <button
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 rounded-full bg-ink-900/60 text-white p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            }
            return (
              <label
                key={i}
                className={cn(
                  "rounded-lg border-2 border-dashed border-paper-border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer hover:border-[hsl(var(--social-500))] hover:bg-[hsl(var(--social-100)/0.4)] transition-colors p-1 text-center",
                  spanClass
                )}
              >
                {i === images.length && !uploading ? (
                  <>
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-ink-500 shrink-0" />
                    <span className="text-[10px] sm:text-xs text-ink-500 leading-tight">Add image</span>
                  </>
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-ink-200" />
                )}
                {i === images.length && (
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
                )}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-ink-500 mt-3">Up to 5 images — characters, settings, mood references</p>
      </CardContent>

      {lightboxIndex !== null && (
        <MoodboardLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </Card>
  );
}

// ── moodboard lightbox ──────────────────────────────────────────────────
//
// Fullscreen viewer for a tapped moodboard image. Arrow buttons + keyboard
// arrows for desktop, left/right swipe for touch — all three just move the
// same `index` state, so there's one source of truth for "which image."

function MoodboardLightbox({ images, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef(null);

  const goPrev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setIndex((i) => (i + 1) % images.length);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length]);

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-3 md:left-6 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg select-none"
      />

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-3 md:right-6 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── timeline cta ─────────────────────────────────────────────────────────

function TimelineCard({ plan, stats, navigate }) {
  const unit = UNIT[plan.goalType] || "words";
  const pickedDays = new Set((plan.writingDays || []).map((wd) => wd.day));

  const created = new Date(plan.createdAt);
  const finish = new Date(created);
  finish.setDate(finish.getDate() + (plan.estimatedDays || 0));

  const daysSinceStart = Math.max((Date.now() - created.getTime()) / 86400000, 0);
  const timeElapsedPercent = plan.estimatedDays > 0
    ? Math.min(Math.round((daysSinceStart / plan.estimatedDays) * 100), 100)
    : 0;
  // On track if actual progress is at or ahead of where the calendar says
  // it should be, with a little slack so a single slow day doesn't flip it.
  const onTrack = stats.percentComplete >= timeElapsedPercent - 5;

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-1">Your journey</p>
        <p className="font-display text-xl text-ink-900 mb-3">Writing timeline</p>
        <p className="text-sm text-ink-500">
          See every planned day, the days you wrote, and the notes you left behind — all in one calendar.
        </p>

        {/* writing-days-at-a-glance — same set edited in EditPlanModal, so
           it always reflects whatever the writer last saved there. */}
        <div className="flex items-center gap-1.5 mt-4">
          {ALL_DAYS.map((day) => {
            const picked = pickedDays.has(day);
            return (
              <span
                key={day}
                title={WEEKDAY_SHORT[day]}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full text-[11px] font-semibold transition-colors",
                  picked
                    ? "bg-[hsl(var(--social-500))] text-white"
                    : "bg-paper-muted text-ink-500"
                )}
              >
                {WEEKDAY_SHORT[day].slice(0, 2)}
              </span>
            );
          })}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
            <span>{stats.totalSoFar.toLocaleString()} of {plan.targetLength.toLocaleString()} {unit}</span>
            <span className="font-semibold text-ink-700">{stats.percentComplete}%</span>
          </div>
          <div className="h-2 rounded-full bg-paper-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.percentComplete}%`, backgroundColor: "hsl(var(--social-500))" }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="font-semibold" style={{ color: onTrack ? "hsl(var(--success-700))" : "hsl(var(--destructive))" }}>
              {onTrack ? "On track" : "Behind schedule"}
            </span>
            <span className="text-ink-500">
              estimated finish{" "}
              <span className="font-semibold text-ink-900">
                {finish.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </span>
          </div>
        </div>

        <Button className="mt-4 self-start" onClick={() => navigate(`/draftplan/${plan.id}/timeline`)}>
          <CalendarDays className="h-4 w-4" /> See your timeline
        </Button>
      </CardContent>
    </Card>
  );
}