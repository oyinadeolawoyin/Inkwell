// src/components/draftPlan/draftplannewpage.jsx
//
// The Draft Plan creation wizard — one gentle question per slide, in the
// exact order draftPlanService.createPlan() needs them:
//   title → written-so-far (+unit) → target length → writing days
//   → daily goal → reminder time
// Premise ("what's your story about?") and whyFinish ("why are you writing
// this?") are deliberately NOT asked here anymore — writers tend to rush or
// skip them at this stage. They're asked for instead, after the plan
// exists, via the profile-completion checklist on draftPlanPage.jsx
// (PremiseSection / WhyFinish cards). draftPlanService.createPlan() no
// longer requires either field, so this wizard can omit them entirely.
// Moodboard stays optional and lives on the plan page after creation too.

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, ArrowRight, Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { createPlan } from "./draftPlanApi";

const DAYS = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

const UNITS = [
  { value: "WORDS", label: "Words" },
  { value: "CHAPTERS", label: "Chapters" },
  { value: "SCENES", label: "Scenes" },
];

const DAILY_PRESETS = {
  WORDS: [250, 500, 750, 1000],
  CHAPTERS: [1, 2],
  SCENES: [1, 2, 3],
};

function unitWord(goalType, plural = true) {
  const map = { WORDS: "word", CHAPTERS: "chapter", SCENES: "scene" };
  const w = map[goalType] || "word";
  return plural ? `${w}s` : w;
}

const STEPS = ["title", "written", "target", "days", "goal", "reminder"];

// Shared classes for the big, friendly text/number inputs — sized up and
// tuned so long titles or numbers never clip or force a horizontal scroll.
const BIG_INPUT = cn(
  "w-full min-w-0 h-16 rounded-2xl border-2 border-border bg-card px-5",
  "text-xl md:text-2xl font-display text-ink-900 placeholder:text-ink-500/60",
  "shadow-sm transition-all duration-200",
  "focus-visible:border-[hsl(var(--social-500))] focus-visible:ring-4 focus-visible:ring-[hsl(var(--social-500)/0.15)] focus-visible:outline-none"
);

export default function DraftPlanNewPage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    storyTitle: "",
    goalType: "WORDS",
    wordsWrittenSoFar: "",
    targetLength: "",
    writingDays: [],          // ["MON", "WED", ...] max 4
    dailyGoal: "",
    reminderTime: "09:00",
    perDayReminderTimes: {},  // { MON: "20:00" } — optional per-day override
  });

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const canContinue = (() => {
    switch (step) {
      case "title": return form.storyTitle.trim().length > 0;
      case "written": return form.wordsWrittenSoFar !== "" && Number(form.wordsWrittenSoFar) >= 0;
      case "target": return Number(form.targetLength) > 0;
      case "days": return form.writingDays.length >= 4;
      case "goal": return Number(form.dailyGoal) > 0;
      case "reminder": return /^\d{2}:\d{2}$/.test(form.reminderTime);
      default: return true;
    }
  })();

  const goNext = useCallback(() => {
    if (!canContinue) return;
    if (isLast) return handleSubmit();
    setDirection(1);
    setStepIndex((i) => i + 1);
  }, [canContinue, isLast, form]);

  const goBack = () => {
    if (isFirst) return;
    setDirection(-1);
    setStepIndex((i) => i - 1);
  };

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const writingDays = form.writingDays.map((day) => ({
        day,
        reminderTime: form.perDayReminderTimes[day] || form.reminderTime,
      }));
      const plan = await createPlan({
        storyTitle: form.storyTitle.trim(),
        goalType: form.goalType,
        wordsWrittenSoFar: Number(form.wordsWrittenSoFar),
        targetLength: Number(form.targetLength),
        dailyGoal: Number(form.dailyGoal),
        writingDays,
      });
      // Multi-plan: the plan page is mounted at /draftplan/:planId now — a
      // writer can hold several plans, so land on the one we just made.
      navigate(`/draftplan/${plan.id}`, { state: { justCreated: true, plan } });
    } catch (err) {
      // The old "you already have a draft plan" redirect is gone — writers
      // can hold multiple plans now (see draftplanservice.js
      // MAX_ACTIVE_PLANS). The only error createPlan still throws here is
      // the active-plan cap message, which just needs to surface normally.
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDownAdvance(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goNext();
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* soft ambient glow behind the card — purely decorative, keeps the
         pure-black background from feeling flat without touching the
         palette tokens */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 50% 0%, hsl(var(--social-500) / 0.12), transparent 60%)",
        }}
      />

      {/* progress dots */}
      <div className="flex items-center gap-2 mb-10 relative">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === stepIndex ? "w-8 bg-primary" : i < stepIndex ? "w-1.5 bg-sky-300" : "w-1.5 bg-paper-border"
            )}
          />
        ))}
      </div>

      <div className="w-full max-w-xl relative">
        <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-sm shadow-xl p-8 md:p-10">
          <div
            key={step}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {step === "title" && (
              <Slide
                eyebrow="Let's give it a name"
                question="What are you calling your story?"
                helper="A working title is more than enough — you can always change it."
              >
                <Input
                  autoFocus
                  value={form.storyTitle}
                  onChange={(e) => set("storyTitle")(e.target.value)}
                  onKeyDown={onKeyDownAdvance}
                  placeholder="The Ferryman's Daughter"
                  className={BIG_INPUT}
                />
              </Slide>
            )}

            {step === "written" && (
              <Slide
                eyebrow="Where you're starting"
                question="How much have you already written?"
                helper="Enter what you've got so far — zero is a perfectly good answer."
              >
                <div className="space-y-5">
                  <ToggleGroup
                    type="single"
                    value={form.goalType}
                    onValueChange={(v) => v && set("goalType")(v)}
                    className="flex-wrap"
                  >
                    {UNITS.map((u) => (
                      <ToggleGroupItem key={u.value} value={u.value} className="h-11 px-5 text-sm font-semibold rounded-full">
                        {u.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <Input
                    type="number"
                    min={0}
                    autoFocus
                    value={form.wordsWrittenSoFar}
                    onChange={(e) => set("wordsWrittenSoFar")(e.target.value)}
                    onKeyDown={onKeyDownAdvance}
                    placeholder={`0 ${unitWord(form.goalType)}`}
                    className={BIG_INPUT}
                  />
                </div>
              </Slide>
            )}

            {step === "target" && (
              <Slide
                eyebrow="The finish line"
                question={`Roughly how many ${unitWord(form.goalType)} will this story take?`}
                helper="A rough estimate is fine — this just gives your plan something to work toward. You can adjust it any time."
              >
                <Input
                  type="number"
                  min={1}
                  autoFocus
                  value={form.targetLength}
                  onChange={(e) => set("targetLength")(e.target.value)}
                  onKeyDown={onKeyDownAdvance}
                  placeholder={`e.g. ${form.goalType === "WORDS" ? "80,000" : form.goalType === "CHAPTERS" ? "24" : "40"}`}
                  className={BIG_INPUT}
                />
              </Slide>
            )}

            {step === "days" && (
              <Slide
                eyebrow="Your rhythm"
                question="When do you want to write?"
                helper="Pick at least four days you're likely to actually show up for your story — more is welcome too."
              >
                <div className="flex flex-wrap gap-3">
                  {DAYS.map((d) => {
                    const selected = form.writingDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          set("writingDays")(
                            selected
                              ? form.writingDays.filter((x) => x !== d.value)
                              : [...form.writingDays, d.value]
                          )
                        }
                        className={cn(
                          "h-16 w-16 rounded-full border-2 font-body font-semibold text-base transition-all duration-150",
                          selected
                            ? "bg-primary text-primary-foreground border-transparent shadow-md scale-105"
                            : "bg-card text-ink-700 border-border hover:border-[hsl(var(--social-500))] hover:bg-secondary"
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <p className={cn("text-sm mt-4", form.writingDays.length < 4 ? "text-destructive" : "text-ink-500")}>
                  {form.writingDays.length} selected — minimum 4
                </p>
              </Slide>
            )}

            {step === "goal" && (
              <Slide
                eyebrow="Keep it kind"
                question="What can you realistically write in a day?"
                helper="Pick a goal you can meet consistently, not one that impresses on a good day and buries you on a bad one."
              >
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2.5">
                    {(DAILY_PRESETS[form.goalType] || []).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set("dailyGoal")(String(n))}
                        className={cn(
                          "h-12 px-5 rounded-full border-2 font-body font-semibold text-sm transition-all duration-150",
                          String(n) === String(form.dailyGoal)
                            ? "bg-achievement text-achievement-foreground border-transparent shadow-md"
                            : "bg-card text-ink-700 border-border hover:border-[hsl(var(--achievement-500))] hover:bg-[hsl(var(--achievement-100)/0.5)]"
                        )}
                      >
                        {n} {unitWord(form.goalType)}
                      </button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={form.dailyGoal}
                    onChange={(e) => set("dailyGoal")(e.target.value)}
                    onKeyDown={onKeyDownAdvance}
                    placeholder={`Custom goal, in ${unitWord(form.goalType)}`}
                    className={BIG_INPUT}
                  />
                </div>
              </Slide>
            )}

            {step === "reminder" && (
              <Slide
                eyebrow="A gentle nudge"
                question="When should we remind you to write?"
                helper={`We'll nudge you on the ${form.writingDays.length} day${form.writingDays.length === 1 ? "" : "s"} you picked. You can fine-tune each day individually once your plan is live.`}
              >
                <Input
                  type="time"
                  autoFocus
                  value={form.reminderTime}
                  onChange={(e) => set("reminderTime")(e.target.value)}
                  className={cn(BIG_INPUT, "w-full sm:w-56")}
                />
                <div className="flex flex-wrap gap-2 mt-5">
                  {form.writingDays.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1.5">
                      {DAYS.find((x) => x.value === d)?.label} · {form.reminderTime}
                    </span>
                  ))}
                </div>
              </Slide>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive font-medium">{error}</p>
          )}

          <div className="flex items-center justify-between mt-10">
            <Button variant="ghost" onClick={goBack} disabled={isFirst} className={isFirst ? "invisible" : ""}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={goNext} disabled={!canContinue || submitting} size="lg">
              {isLast ? (submitting ? "Building your plan…" : "Create my Draft Plan") : "Continue"}
              {!isLast && <ArrowRight className="h-4 w-4" />}
              {isLast && <Sparkles className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slide({ eyebrow, question, helper, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-social mb-3">
        <Feather className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{eyebrow}</span>
      </div>
      <h1 className="font-display text-3xl md:text-4xl text-ink-900 mb-3 leading-snug break-words">
        {question}
      </h1>
      {helper && <p className="text-ink-500 mb-6">{helper}</p>}
      {children}
    </div>
  );
}