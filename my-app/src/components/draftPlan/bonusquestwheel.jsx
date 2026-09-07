// src/components/draftPlan/bonusQuestWheel.jsx
//
// The Bonus Day card that replaces the "today's goal" ring on any day that
// ISN'T one of the writer's picked writing days. Compact by default — the
// full spin experience lives in a modal (QuestModal) so it can take up the
// room it deserves without stretching the dashboard grid.
//
// This card is ONLY about the Bonus Quest now (spin the wheel / pick a
// prompt / log quest words) — it no longer duplicates regular session
// logging. Logging today's actual words/chapters/scenes always happens
// through the normal "Log today's session" control on the dashboard
// (LogSession in draftPlanPage.jsx), bonus day or not, and it now always
// counts toward sessionsDone / weekTotal / avgPace regardless of whether
// today is a picked writing day (see countsAsSession and weekLogs in
// getPlanProgress, draftplanservice.js) — there's no opt-in step to gate
// that anymore.
//
// State here is driven entirely by today's DraftBonusQuest row:
//      quest === undefined  → loading
//      quest === null       → not opened yet
//      status "CHOOSING"    → wheel landed on a type, prompt not picked yet
//      status "ACTIVE"      → prompt locked in, logging words toward it
//      status "DECLINED"    → passed on both candidates — done for today
//
// Once either today's regular goal is met (todayPct >= 100, logged via the
// normal session control) or the Quest is completed, `tone` flips from
// "bonus" (purple) to "success" (green) and every purple element on the
// card — badge, ring, borders — switches with it, per the "turn purple to
// green on completion" rule.

import { useState, useEffect } from "react";
import { Sparkles, Feather, Box, Gift, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  openBonusQuest,
  pickBonusQuestPrompt,
  declineBonusQuest,
  getTodaysBonusQuest,
  logBonusQuestProgress,
} from "./draftPlanApi";
import { todayPercent } from "./draftPlanHelpers";
import LogProgressModal from "./logProgressModal";

// ── quest type styling ──────────────────────────────────────────────────
const QUEST_META = {
  PROMPT_WRITE: {
    label: "Prompt Write",
    icon: Feather,
    tone: "bonus", // purple
  },
  SANDBOX_SCENE: {
    label: "Sandbox Scene",
    icon: Box,
    tone: "social", // sky
  },
  FUN_FACT: {
    label: "Fun Fact",
    icon: Sparkles,
    tone: "highlight", // red
  },
};

const WHEEL_ORDER = ["PROMPT_WRITE", "SANDBOX_SCENE", "FUN_FACT", "PROMPT_WRITE", "SANDBOX_SCENE", "FUN_FACT"];
const SEGMENT_ANGLE = 360 / WHEEL_ORDER.length;
const SPIN_TURNS = 6;
const SPIN_MS = 4200;

// Renders a minute count as "45 min" or "1h 20min" — only ever called when
// timeSpent is non-null, so there's never a "0 min" placeholder shown for a
// session that just didn't record time.
function formatMinutes(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function wedgePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// ── top-level card ───────────────────────────────────────────────────────

export default function BonusDayCard({ plan, unit, onRefresh }) {
  const [quest, setQuest] = useState(undefined); // undefined = loading, null = not opened yet
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState("spin"); // "spin" | "choosing"

  useEffect(() => {
    getTodaysBonusQuest(plan.id)
      .then((q) => setQuest(q ?? null))
      .catch(() => setQuest(null));
  }, [plan.id]);

  const todayPct  = todayPercent(plan);
  const questDone = quest?.status === "ACTIVE" && quest.isCompleted;
  // goalDone no longer needs an opt-in check — logging today's regular
  // session always counts now, so hitting 100% here is enough on its own.
  const goalDone  = todayPct >= 100;
  const complete  = questDone || goalDone;
  const tone      = complete ? "success" : "bonus";

  function handleOpenWheel() {
    setModalPhase("spin");
    setModalOpen(true);
  }
  function handleResumeChoosing() {
    setModalPhase("choosing");
    setModalOpen(true);
  }
  function handleSettled(updated) {
    setQuest(updated);
    setModalOpen(false);
  }

  return (
    <>
      <Card className="h-full" style={{ borderColor: `hsl(var(--${tone}-500) / 0.35)` }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-1">
            <BonusBadge tone={tone} />
          </div>

          {quest === undefined && <LoadingState />}
          {quest === null && <LandingState onOpenWheel={handleOpenWheel} />}
          {quest?.status === "CHOOSING" && (
            <WaitingState questType={quest.questType} onResume={handleResumeChoosing} hideBadge />
          )}
          {quest?.status === "ACTIVE" && <ActiveState quest={quest} onQuestUpdated={setQuest} planId={plan.id} hideBadge />}
          {quest?.status === "DECLINED" && <DeclinedState hideBadge />}

          {/* Today's regular goal is logged through the normal "Log
             today's session" control below the dashboard cards, not here —
             this just surfaces that it's already been hit today, since the
             quest states above don't otherwise mention it. */}
          {goalDone && !questDone && (
            <p className="text-xs font-semibold mt-3" style={{ color: "hsl(var(--success-700))" }}>
              ✓ Today's regular goal is done too — logged from your session button below.
            </p>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <QuestModal
          phase={modalPhase}
          setPhase={setModalPhase}
          existingQuest={quest?.status === "CHOOSING" ? quest : null}
          planId={plan.id}
          onClose={() => setModalOpen(false)}
          onSettled={handleSettled}
        />
      )}
    </>
  );
}

// tone defaults to "bonus" (purple); pass "success" once the writer has
// completed either their Daily Goal or their Quest for the day, and every
// purple element on the card — this badge included — turns green.
function BonusBadge({ tone = "bonus" }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-0.5 tracking-wide"
      style={{ backgroundColor: `hsl(var(--${tone}-100))`, color: `hsl(var(--${tone}-700))` }}
    >
      <Sparkles className="h-3 w-3" /> {tone === "success" ? "BONUS DAY · DONE" : "BONUS DAY"}
    </span>
  );
}

function LoadingState() {
  return <p className="text-sm text-ink-500 py-8 text-center">Checking today's chest…</p>;
}

// ── landing: "choose your path" ──────────────────────────────────────────

function LandingState({ onOpenWheel }) {
  return (
    <div>
      <p className="font-display text-xl text-ink-900 mt-2 mb-1">Today's a free day</p>
      <p className="text-sm text-ink-500 mb-4">
        Write on your own terms with your regular session button below — or spin for a Bonus Quest, a
        just-for-fun challenge separate from your story total.
      </p>

      <Button
        onClick={onOpenWheel}
        className="w-full rounded-full font-semibold border-0"
        style={{
          background: "linear-gradient(90deg, hsl(var(--highlight-500)), hsl(var(--bonus-500)))",
          color: "white",
        }}
      >
        <Sparkles className="h-4 w-4" /> Open the Quest Wheel
      </Button>
    </div>
  );
}

function QuestCTA({ onOpenWheel }) {
  return (
    <div className="text-center py-6">
      <p className="font-display text-lg text-ink-900 mb-1">Up for a surprise?</p>
      <p className="text-sm text-ink-500 mb-4 max-w-[240px] mx-auto">
        Spin the wheel for a quick prompt — separate from your daily goal, just for fun.
      </p>
      <Button
        onClick={onOpenWheel}
        className="rounded-full font-semibold border-0"
        style={{
          background: "linear-gradient(90deg, hsl(var(--highlight-500)), hsl(var(--bonus-500)))",
          color: "white",
        }}
      >
        <Sparkles className="h-4 w-4" /> Open the Quest Wheel
      </Button>
    </div>
  );
}

// ── quest already landed, prompt not picked yet ──────────────────────────

function WaitingState({ questType, onResume, hideBadge = false }) {
  const meta = QUEST_META[questType];
  const Icon = meta.icon;
  return (
    <div className="text-center py-2">
      {!hideBadge && <BonusBadge />}
      <p className="font-display text-xl text-ink-900 mt-3 mb-1">Your quest is waiting</p>
      <p className="text-sm text-ink-500 mb-4">
        The wheel landed on <span className="font-semibold text-ink-900">{meta.label}</span> — pick one of your
        two prompts to lock it in.
      </p>
      <Button
        onClick={onResume}
        className="w-full rounded-full font-semibold border-0"
        style={{ backgroundColor: `hsl(var(--${meta.tone}-500))`, color: "white" }}
      >
        <Icon className="h-4 w-4" /> Choose your prompt
      </Button>
    </div>
  );
}

// ── declined ──────────────────────────────────────────────────────────────

function DeclinedState({ hideBadge = false }) {
  return (
    <div className="text-center py-6">
      {!hideBadge && <BonusBadge />}
      <p className="font-display text-xl text-ink-900 mt-3 mb-1">No quest today</p>
      <p className="text-sm text-ink-500 max-w-[220px] mx-auto">
        You passed on both prompts — a new quest will be waiting on your next bonus day.
      </p>
    </div>
  );
}

// ── active / completed quest ─────────────────────────────────────────────

function ActiveState({ quest, onQuestUpdated, planId, hideBadge = false }) {
  const meta = QUEST_META[quest.questType];
  const Icon = meta.icon;
  const pct = quest.targetCount > 0 ? Math.min(Math.round((quest.countLogged / quest.targetCount) * 100), 100) : 0;
  const [count, setCount] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [saving, setSaving] = useState(false);
  const [progressModal, setProgressModal] = useState(null); // { before, after } | null — set right after a successful log, so the celebration only fires once per submit, not on every render of an already-active/completed quest

  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  async function submit() {
    if (!count || Number(count) < 1) return;
    setSaving(true);
    const before = quest.countLogged;
    try {
      const res = await logBonusQuestProgress(planId, {
        countLogged: Number(count),
        direction: "add",
        timeSpent: timeSpent ? Number(timeSpent) : undefined,
      });
      onQuestUpdated(res.quest);
      setCount(""); setTimeSpent("");
      setProgressModal({ before, after: res.quest.countLogged });
    } finally {
      setSaving(false);
    }
  }

  // Same "resend the current count, just to attach a note" trick the daily
  // note capture uses — direction defaults to "replace" so resending
  // quest.countLogged is a no-op on the number itself.
  async function handleSaveNote(text) {
    const res = await logBonusQuestProgress(planId, { countLogged: quest.countLogged, direction: "replace", note: text });
    onQuestUpdated(res.quest);
  }

  const modal = progressModal && (
    <LogProgressModal
      open
      variant="bonus"
      onClose={() => setProgressModal(null)}
      unit="words"
      questPrompt={quest.prompt}
      questTarget={quest.targetCount}
      questBefore={progressModal.before}
      questAfter={progressModal.after}
      questCompleted={progressModal.after >= quest.targetCount}
      onSaveNote={handleSaveNote}
    />
  );

  if (quest.isCompleted) {
    return (
      <>
      <div className="flex flex-col items-center text-center py-3">
        {!hideBadge && <BonusBadge tone="success" />}
        <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0 my-3">
          <g transform="rotate(-90 44 44)">
            <circle cx="44" cy="44" r={r} fill="none" stroke="hsl(var(--success-100))" strokeWidth="8" />
            <circle
              cx="44" cy="44" r={r} fill="none"
              stroke="hsl(var(--success-500))" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={0}
            />
          </g>
          <text
            x="44" y="44" textAnchor="middle" dominantBaseline="central"
            className="font-display font-semibold"
            style={{ fill: "hsl(var(--success-700))", fontSize: "17px" }}
          >
            100%
          </text>
        </svg>
        <p className="font-display text-xl text-ink-900">Quest complete!</p>
        <p className="text-sm text-ink-500 mt-1 max-w-[220px]">
          {meta.label} — {quest.countLogged.toLocaleString()} words logged. Counts toward your streak, not your
          story total.
        </p>
        {/* Time spent only renders when it's actually been recorded — no
           "0 min" placeholder for quests logged without it. */}
        {quest.timeSpent != null && (
          <p className="text-xs text-ink-500 mt-1">{formatMinutes(quest.timeSpent)} spent</p>
        )}
        {quest.note && (
          <div
            className="rounded-lg border px-3 py-2 mt-3 text-left w-full"
            style={{ backgroundColor: "hsl(var(--success-100)/0.5)", borderColor: "hsl(var(--success-500)/0.3)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "hsl(var(--success-700))" }}>
              Your note
            </p>
            <p className="font-display italic text-sm text-ink-900 leading-snug">{quest.note}</p>
          </div>
        )}
      </div>
      {modal}
      </>
    );
  }

  return (
    <>
    <div>
      <div className="flex items-center justify-between mb-3">
        {!hideBadge && <BonusBadge />}
        <span
          className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1"
          style={{ backgroundColor: `hsl(var(--${meta.tone}-100))`, color: `hsl(var(--${meta.tone}-700))` }}
        >
          <Icon className="h-3.5 w-3.5" /> {meta.label}
        </span>
      </div>

      <div
        className="rounded-lg border px-4 py-3 mb-4"
        style={{ backgroundColor: "hsl(var(--bonus-100))", borderColor: "hsl(var(--bonus-500)/0.4)" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "hsl(var(--bonus-700))" }}>
          Your prompt
        </p>
        <p className="font-display italic text-ink-900 leading-snug">"{quest.prompt}"</p>
      </div>

      <div className="flex items-center gap-4">
        <svg width="72" height="72" viewBox="0 0 88 88" className="shrink-0">
          <g transform="rotate(-90 44 44)">
            <circle cx="44" cy="44" r={r} fill="none" stroke="hsl(var(--bonus-100))" strokeWidth="8" />
            <circle
              cx="44" cy="44" r={r} fill="none"
              stroke="hsl(var(--bonus-500))" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 500ms ease-out" }}
            />
          </g>
          <text x="44" y="44" textAnchor="middle" dominantBaseline="central" className="font-display font-semibold" style={{ fill: "hsl(var(--bonus-700))", fontSize: "15px" }}>
            {pct}%
          </text>
        </svg>
        <div className="text-sm">
          <p className="text-ink-900 font-semibold">
            {quest.countLogged.toLocaleString()} / {quest.targetCount.toLocaleString()} words
          </p>
          <p className="text-ink-500">{Math.max(quest.targetCount - quest.countLogged, 0).toLocaleString()} to go</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Input type="number" min={1} placeholder="Words written" value={count} onChange={(e) => setCount(e.target.value)} />
        <Button
          onClick={submit}
          disabled={saving || !count}
          className="shrink-0 border-0 font-semibold"
          style={{ backgroundColor: "hsl(var(--bonus-500))", color: "white" }}
        >
          <PenLine className="h-4 w-4" /> {saving ? "Saving…" : "Log"}
        </Button>
      </div>
      <div className="flex gap-2 mt-2">
        <Input
          type="number" min={0} placeholder="Minutes spent (optional)" className="max-w-[170px]"
          value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)}
        />
      </div>
    </div>
    {modal}
    </>
  );
}

// ── the modal: wheel spin → candidate pick ────────────────────────────────

function QuestModal({ phase, setPhase, existingQuest, planId, onClose, onSettled }) {
  const [wonQuest, setWonQuest] = useState(existingQuest);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function spin() {
    if (spinning) return;
    setError("");
    setSpinning(true);
    try {
      const won = await openBonusQuest(planId);
      const candidates = WHEEL_ORDER.map((t, i) => i).filter((i) => WHEEL_ORDER[i] === won.questType);
      const targetIndex = candidates[Math.floor(Math.random() * candidates.length)];
      const segmentCenter = targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const landingOffset = (360 - segmentCenter) % 360;
      setRotation(SPIN_TURNS * 360 + landingOffset);

      setTimeout(() => {
        setWonQuest(won);
        setPhase("choosing");
        setSpinning(false);
      }, SPIN_MS);
    } catch (err) {
      setError(err.message || "Couldn't open the chest — try again.");
      setSpinning(false);
    }
  }

  async function choose(choice) {
    setBusy(true);
    setError("");
    try {
      const updated = await pickBonusQuestPrompt(planId, { choice });
      onSettled(updated);
    } catch (err) {
      setError(err.message || "Couldn't lock that in — try again.");
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    setError("");
    try {
      const updated = await declineBonusQuest(planId);
      onSettled(updated);
    } catch (err) {
      setError(err.message || "Couldn't skip today's quest — try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "hsl(0 0% 0% / 0.7)" }}
      onClick={spinning || busy ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border p-6"
        style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--bonus-500)/0.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {!spinning && !busy && (
          <button onClick={onClose} className="absolute top-4 right-4 text-ink-500 hover:text-ink-900">
            <X className="h-5 w-5" />
          </button>
        )}

        {phase === "spin" ? (
          <SpinPhase rotation={rotation} spinning={spinning} error={error} onSpin={spin} />
        ) : (
          <ChoosingPhase quest={wonQuest} busy={busy} error={error} onChoose={choose} onDecline={decline} />
        )}
      </div>
    </div>
  );
}

function SpinPhase({ rotation, spinning, error, onSpin }) {
  const cx = 150, cy = 150, r = 138;

  return (
    <div className="flex flex-col items-center">
      <BonusBadge />
      <p className="font-display text-xl text-ink-900 mt-3 mb-1 text-center">Spin for a surprise quest</p>
      <p className="text-sm text-ink-500 text-center mb-4 max-w-[280px]">
        Lands on a quest type, then you'll pick between two prompts — separate from your story word count.
      </p>

      <div className="relative" style={{ width: 260, height: 260 }}>
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10" style={{ filter: "drop-shadow(0 2px 3px rgb(0 0 0 / 0.4))" }}>
          <svg width="28" height="24" viewBox="0 0 28 24">
            <polygon points="14,24 0,0 28,0" fill="hsl(var(--bonus-500))" stroke="hsl(var(--paper))" strokeWidth="1.5" />
          </svg>
        </div>

        <svg
          width="260" height="260" viewBox="0 0 300 300"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.65, 0.15, 1)` : "none",
          }}
        >
          <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke="hsl(var(--bonus-500))" strokeWidth="10" />
          {Array.from({ length: 24 }).map((_, i) => {
            const p = polarToCartesian(cx, cy, r + 10, i * 15);
            return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="hsl(var(--highlight-500))" />;
          })}

          {WHEEL_ORDER.map((type, i) => {
            const meta = QUEST_META[type];
            const start = i * SEGMENT_ANGLE;
            const end = start + SEGMENT_ANGLE;
            const mid = start + SEGMENT_ANGLE / 2;
            const labelPos = polarToCartesian(cx, cy, r * 0.62, mid);
            const iconPos = polarToCartesian(cx, cy, r * 0.86, mid);
            return (
              <g key={i}>
                <path
                  d={wedgePath(cx, cy, r, start, end)}
                  fill={`hsl(var(--${meta.tone}-${i % 2 === 0 ? "500" : "300"}))`}
                  stroke="hsl(var(--paper))"
                  strokeWidth="2"
                />
                {(() => {
                  const readableAngle = mid > 90 && mid < 270 ? mid + 180 : mid;
                  return (
                    <>
                      <g transform={`rotate(${readableAngle} ${iconPos.x} ${iconPos.y})`}>
                        <IconGlyph icon={meta.icon} x={iconPos.x} y={iconPos.y} />
                      </g>
                      <text
                        x={labelPos.x} y={labelPos.y}
                        textAnchor="middle" dominantBaseline="middle"
                        transform={`rotate(${readableAngle} ${labelPos.x} ${labelPos.y})`}
                        style={{ fontSize: "13px", fontWeight: 700, fill: "hsl(0 0% 100%)" }}
                      >
                        {meta.label.split(" ")[0]}
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}

          <circle cx={cx} cy={cy} r="34" fill="hsl(var(--bonus-500))" stroke="hsl(var(--highlight-500))" strokeWidth="4" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Gift className="h-7 w-7" style={{ color: "white" }} />
        </div>
      </div>

      <Button
        onClick={onSpin}
        disabled={spinning}
        className="mt-5 rounded-full px-6 font-semibold border-0"
        style={{
          background: spinning
            ? "hsl(var(--paper-muted))"
            : "linear-gradient(90deg, hsl(var(--highlight-500)), hsl(var(--bonus-500)))",
          color: spinning ? "hsl(var(--ink-500))" : "white",
        }}
      >
        <Sparkles className="h-4 w-4" /> {spinning ? "Spinning…" : "Spin the Quest Wheel"}
      </Button>
      {error && <p className="text-xs mt-2" style={{ color: "hsl(var(--destructive))" }}>{error}</p>}
      <p className="text-xs text-ink-500 mt-2">One spin per day — it locks in the type, not the prompt.</p>
    </div>
  );
}

function IconGlyph({ icon: Icon, x, y }) {
  return (
    <foreignObject x={x - 11} y={y - 11} width="22" height="22">
      <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color="white" strokeWidth={2.25} />
      </div>
    </foreignObject>
  );
}

function ChoosingPhase({ quest, busy, error, onChoose, onDecline }) {
  if (!quest) return null;
  const meta = QUEST_META[quest.questType];
  const Icon = meta.icon;

  return (
    <div>
      <div className="flex flex-col items-center text-center mb-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1 mb-2"
          style={{ backgroundColor: `hsl(var(--${meta.tone}-100))`, color: `hsl(var(--${meta.tone}-700))` }}
        >
          <Icon className="h-3.5 w-3.5" /> {meta.label}
        </span>
        <p className="font-display text-xl text-ink-900">Pick your prompt</p>
        <p className="text-sm text-ink-500 mt-1">Two options — take whichever pulls at you.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CandidateCard
          tone={meta.tone}
          prompt={quest.candidateAPrompt}
          target={quest.candidateATargetCount}
          disabled={busy}
          onPick={() => onChoose("A")}
        />
        <CandidateCard
          tone={meta.tone}
          prompt={quest.candidateBPrompt}
          target={quest.candidateBTargetCount}
          disabled={busy}
          onPick={() => onChoose("B")}
        />
      </div>

      {error && <p className="text-xs mt-3 text-center" style={{ color: "hsl(var(--destructive))" }}>{error}</p>}

      <button
        onClick={onDecline}
        disabled={busy}
        className="w-full text-center text-sm font-semibold text-ink-700 underline mt-4 disabled:opacity-50"
      >
        Not feeling either? Skip today — a new quest waits on your next bonus day.
      </button>
    </div>
  );
}

function CandidateCard({ tone, prompt, target, disabled, onPick }) {
  return (
    <div
      className="rounded-lg border p-3.5 flex flex-col"
      style={{ backgroundColor: `hsl(var(--${tone}-100)/0.5)`, borderColor: `hsl(var(--${tone}-500)/0.4)` }}
    >
      <p className="font-display italic text-sm text-ink-900 leading-snug flex-1">"{prompt}"</p>
      <p className="text-xs text-ink-500 mt-2 mb-3">{target.toLocaleString()} words</p>
      <Button
        onClick={onPick}
        disabled={disabled}
        className="w-full border-0 font-semibold"
        style={{ backgroundColor: `hsl(var(--${tone}-500))`, color: "white" }}
      >
        Choose this
      </Button>
    </div>
  );
}