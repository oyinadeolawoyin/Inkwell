// src/components/draftPlan/draftPlanHelpers.js
//
// Small date/goal helpers shared between draftPlanPage.jsx and
// bonusquestwheel.jsx. Pulled out into their own file so neither component
// has to import from the other (draftPlanPage renders BonusDayCard, so a
// BonusDayCard -> draftPlanPage import would be circular).

export function todayKey() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

export function todayCount(plan) {
  const log = plan.progressLogs?.find((l) => new Date(l.logDate).toISOString() === todayKey());
  return log?.countLogged ?? 0;
}

export function todayPercent(plan) {
  if (!plan.dailyGoal) return 0;
  return Math.min(Math.round((todayCount(plan) / plan.dailyGoal) * 100), 100);
}

// Mirrors isRecurringPickedDay in draftplanservice.js: honor a per-date
// override on today's log if one exists, otherwise fall back to the
// writer's recurring weekly pattern. A "bonus day" is any day this
// resolves to false — see BonusDayCard.
const WEEKDAY_JS = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
export function isTodayBonusDay(plan) {
  const log = plan.progressLogs?.find((l) => new Date(l.logDate).toISOString() === todayKey());
  if (log) return !log.isPickedDay;
  const jsDay = new Date().getUTCDay();
  const pickedSet = new Set((plan.writingDays || []).map((d) => WEEKDAY_JS[d.day]));
  return !pickedSet.has(jsDay);
}

// Legacy flag — set via planDay({ isBonusDayGoalOptIn: true }) back when
// a bonus day's regular-goal log only counted toward sessionsDone /
// weekTotal / avgPace if the writer explicitly opted in first. That gate
// is gone: any real session logged through the normal "today's session"
// flow counts now, bonus day or not, opted in or not (see countsAsSession
// and weekLogs in getPlanProgress). Kept around in case anything still
// reads the flag off a log row, but nothing in the UI needs it to decide
// whether to show the logging form anymore.
export function isTodayBonusGoalOptIn(plan) {
  const log = plan.progressLogs?.find((l) => new Date(l.logDate).toISOString() === todayKey());
  return !!log?.isBonusDayGoalOptIn;
}