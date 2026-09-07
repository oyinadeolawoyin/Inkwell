// src/components/draftPlan/draftPlanListPage.jsx
//
// Multi-plan switcher — GET /draftplan/mine. A writer can hold several
// active plans at once now (see draftplanservice.js, MAX_ACTIVE_PLANS = 5),
// so this is the "browse all of them, jump into one" page. Long-list rows
// (not a card grid) — an "Ongoing" section, then a "Finished" section
// beneath it, each row showing the plan's premise as a description, an
// ONGOING/ENDED status pill, and "Started <date> · Reach <target> by <est.
// end date>" underneath. No cover images — this platform doesn't have any
// to show, so the row leans on the title/description/dates instead.
//
// Colors read off the same semantic --{tone}-* CSS vars as
// draftPlanPage.jsx/draftPlanTimeline.jsx (social/achievement/success/ink),
// never a raw palette value.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowRight, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMyPlans } from "./draftPlanApi";

const UNIT_LABEL = { WORDS: "words", CHAPTERS: "chapters", SCENES: "scenes" };
const MAX_ACTIVE_PLANS = 5; // mirrors draftplanservice.js — used only to grey out "New" with a clear reason, the backend still enforces it

export default function DraftPlanListPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getMyPlans()
      .then(setPlans)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!plans) return null;
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) => p.storyTitle.toLowerCase().includes(q) || (p.premise || "").toLowerCase().includes(q)
    );
  }, [plans, query]);

  if (error) {
    return (
      <PageShell>
        <p className="text-ink-500">{error}</p>
      </PageShell>
    );
  }

  if (!plans) {
    return (
      <PageShell>
        <p className="text-ink-500">Loading your draft plans…</p>
      </PageShell>
    );
  }

  const activePlans   = filtered.filter((p) => !p.isCompleted);
  const finishedPlans = filtered.filter((p) => p.isCompleted);
  const activeCount   = plans.filter((p) => !p.isCompleted).length;
  const atCap = activeCount >= MAX_ACTIVE_PLANS;

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <h1 className="font-display text-2xl text-ink-900">Draft Plans</h1>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="pl-9 h-10 w-56"
            />
          </div>
          <Button
            onClick={() => navigate("/draftplan/new")}
            disabled={atCap}
            title={atCap ? `You can have up to ${MAX_ACTIVE_PLANS} active plans at once — finish or archive one to start another.` : undefined}
          >
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <EmptyState onCreate={() => navigate("/draftplan/new")} />
      ) : (
        <>
          <ListSection
            title="Ongoing plans"
            plans={activePlans}
            emptyText={query ? "No ongoing plans match your search." : "Nothing in progress right now."}
            onOpen={(id) => navigate(`/draftplan/${id}`)}
          />
          <ListSection
            title="Finished plans"
            plans={finishedPlans}
            emptyText={query ? "No finished plans match your search." : "Nothing finished yet."}
            onOpen={(id) => navigate(`/draftplan/${id}`)}
            className="mt-10"
          />
        </>
      )}

      {atCap && (
        <p className="text-xs text-ink-500 mt-6">
          You've reached the limit of {MAX_ACTIVE_PLANS} active plans. Finish or delete one to start a new story.
        </p>
      )}
    </PageShell>
  );
}

function ListSection({ title, plans, emptyText, onOpen, className }) {
  return (
    <section className={className}>
      <h2 className="font-display text-lg text-ink-900 mb-3">{title}</h2>
      {plans.length === 0 ? (
        <p className="text-sm text-ink-500 rounded-2xl border border-dashed border-paper-border px-5 py-6">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onOpen={() => onOpen(plan.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function PlanRow({ plan, onOpen }) {
  const unit = UNIT_LABEL[plan.goalType] || "words";
  const estimatedLabel = plan.estimatedEndDate ? formatDate(plan.estimatedEndDate) : null;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left px-5 py-4 rounded-2xl bg-card hover:bg-secondary/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <p className="font-display text-lg text-ink-900 truncate">{plan.storyTitle}</p>
        {plan.isCompleted ? (
          <span
            className="shrink-0 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "hsl(var(--paper-border))", color: "hsl(var(--ink-500))" }}
          >
            Ended
          </span>
        ) : (
          <span
            className="shrink-0 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}
          >
            Ongoing
          </span>
        )}
      </div>

      {plan.premise && (
        <p className="text-sm text-ink-500 italic mb-2 line-clamp-2">{plan.premise}</p>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        {estimatedLabel ? (
          <p className="text-xs text-ink-500/80">
            Reach {plan.targetLength.toLocaleString()} {unit} by {estimatedLabel}
          </p>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-social shrink-0">
          {plan.isCompleted ? "View" : `${plan.percentComplete}% · Open`} <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function EmptyState({ onCreate }) {
  return (
    <div className="rounded-2xl border border-dashed border-paper-border px-10 py-14 text-center">
      <BookOpen className="h-8 w-8 mx-auto mb-3 text-social" />
      <p className="font-display text-xl text-ink-900 mb-1">No draft plans yet</p>
      <p className="text-ink-500 mb-5 max-w-sm mx-auto">
        A draft plan turns "I should write a book" into a schedule you can actually follow.
      </p>
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4" /> Start your first plan
      </Button>
    </div>
  );
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-background px-6 py-12 md:px-12">
      <div className="max-w-3xl mx-auto">{children}</div>
    </div>
  );
}