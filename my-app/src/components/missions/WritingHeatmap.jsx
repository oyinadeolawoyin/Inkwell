import { useState, useEffect } from "react";
import API_URL from "@/config/api";

const CELL  = 11; // cell size px
const GAP   = 2;  // gap px
const TOTAL = CELL + GAP; // 13px per column
const DAY_LABEL_W = 30; // px for Mon/Wed/Fri labels

export default function WritingHeatmap({ userId }) {
  const [sprintDays, setSprintDays] = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(false);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    fetchSprintDays();
  }, [userId]);

  async function fetchSprintDays() {
    try {
      const res = await fetch(`${API_URL}/sprint/${userId}/sprintDays`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSprintDays(data.sprintDays || []);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // Build a Set of "Y-M-D" keys from sprint days for O(1) lookup
  function buildSprintSet() {
    return new Set(
      sprintDays.map((s) => {
        const d = new Date(s.startedAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );
  }

  // Build 52-week grid starting from the Sunday 52 weeks ago
  function buildGrid(sprintSet) {
    const todayRaw = new Date();
    const today = new Date(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate());

    // 52 weeks ago
    const rangeStart = new Date(today);
    rangeStart.setDate(today.getDate() - 52 * 7);

    // Snap back to the Sunday of that week
    const startSunday = new Date(rangeStart);
    startSunday.setDate(rangeStart.getDate() - rangeStart.getDay());

    const weeks       = [];
    const monthLabels = []; // { weekIndex, label }
    const cur         = new Date(startSunday);
    let lastMonth     = -1;

    while (cur <= today) {
      const wi   = weeks.length;
      const week = [];

      for (let dow = 0; dow < 7; dow++) {
        // New-month label on Sunday
        if (dow === 0 && cur.getMonth() !== lastMonth) {
          monthLabels.push({
            weekIndex: wi,
            label: cur.toLocaleString("default", { month: "short" }),
          });
          lastMonth = cur.getMonth();
        }

        const key       = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
        const isFuture  = cur > today;
        const inRange   = cur >= rangeStart;

        week.push({
          key,
          hasSprint : inRange && !isFuture && sprintSet.has(key),
          isFuture,
          inRange,
          title     : new Date(cur).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", year: "numeric",
          }),
        });

        cur.setDate(cur.getDate() + 1);
      }

      weeks.push(week);
    }

    return { weeks, monthLabels };
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-6">
        <div className="h-5 w-44 bg-gray-100 rounded-lg animate-pulse mb-1" />
        <div className="h-4 w-32 bg-gray-50 rounded-lg animate-pulse mb-5" />
        <div className="h-[100px] bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-6 text-center text-sm text-gray-400">
        Could not load writing activity.
      </div>
    );
  }

  const sprintSet = buildSprintSet();
  const { weeks, monthLabels } = buildGrid(sprintSet);

  // Count unique days with sprints in the past year
  const todayRaw = new Date();
  const yearAgo  = new Date(todayRaw);
  yearAgo.setFullYear(todayRaw.getFullYear() - 1);
  const uniqueDays = sprintDays.filter((s) => new Date(s.startedAt) >= yearAgo).length;

  const gridWidth = DAY_LABEL_W + weeks.length * TOTAL;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-xl font-serif text-ink-primary">Writing Activity</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {uniqueDays} sprint day{uniqueDays !== 1 ? "s" : ""} in the past year
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
          <span>Less</span>
          <div className="flex gap-1 items-center">
            <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div style={{ minWidth: `${gridWidth}px` }}>

          {/* Month labels */}
          <div
            className="relative mb-1"
            style={{ height: "16px", paddingLeft: `${DAY_LABEL_W}px` }}
          >
            {monthLabels.map((ml) => (
              <span
                key={`${ml.weekIndex}-${ml.label}`}
                className="absolute text-[10px] text-gray-400 font-medium"
                style={{ left: `${DAY_LABEL_W + ml.weekIndex * TOTAL}px`, top: 0 }}
              >
                {ml.label}
              </span>
            ))}
          </div>

          {/* Grid row */}
          <div className="flex" style={{ gap: `${GAP}px` }}>

            {/* Day-of-week labels */}
            <div
              className="flex flex-col flex-shrink-0"
              style={{ width: `${DAY_LABEL_W}px`, gap: `${GAP}px` }}
            >
              {["", "Mon", "", "Wed", "", "Fri", ""].map((lbl, i) => (
                <div
                  key={i}
                  className="text-[10px] text-gray-400 flex items-center justify-end pr-1.5"
                  style={{ height: `${CELL}px` }}
                >
                  {lbl}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: `${GAP}px` }}>
                {week.map((day) => (
                  <div
                    key={day.key}
                    title={
                      day.inRange && !day.isFuture
                        ? `${day.hasSprint ? "✅" : "📝"} ${day.title}`
                        : undefined
                    }
                    className={`rounded-sm cursor-default transition-all duration-100 ${
                      !day.inRange || day.isFuture
                        ? "bg-gray-50"
                        : day.hasSprint
                        ? "bg-emerald-500 hover:bg-emerald-400 hover:scale-125"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    style={{ width: `${CELL}px`, height: `${CELL}px` }}
                  />
                ))}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
