import { useState, useEffect } from "react";
import { CheckCircle2, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API_URL from "../../config/api";

const DAYS = [
  { key: "monday", label: "Mon", full: "Monday" },
  { key: "tuesday", label: "Tue", full: "Tuesday" },
  { key: "wednesday", label: "Wed", full: "Wednesday" },
  { key: "thursday", label: "Thu", full: "Thursday" },
  { key: "friday", label: "Fri", full: "Friday" },
  { key: "saturday", label: "Sat", full: "Saturday" },
  { key: "sunday", label: "Sun", full: "Sunday" },
];

export default function WritingSchedule() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlan();
  }, []);

  async function fetchPlan() {
    try {
      const res = await fetch(`${API_URL}/writingPlan`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Writing plan data:", data);
        
        // Handle nested writingPlan object
        const planData = data.writingPlan || data;

        // Treat the plan as "not set" if no day has a real time value.
        // Backend may return a plan row with all times as null/""/00:00.
        const hasAnyDaySet = DAYS.some(day => {
          const time = planData[`${day.key}Time`];
          return time !== null && time !== undefined && time !== "" && time !== "00:00";
        });

        setPlan(hasAnyDaySet ? planData : null);
      }
      // Non-ok response (404, etc.) → plan stays null → show CTA
    } catch (error) {
      console.error("Failed to fetch plan:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-[#fafaf9] rounded-2xl shadow-sm border border-[#e5e5e4] p-6 sm:p-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // No plan set yet
  if (!plan) {
    return (
      <div className="bg-gradient-to-br from-[#fafaf9] to-white rounded-2xl shadow-sm border border-[#e5e5e4] p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2d3748] mb-1">
              Your Writing Days
            </h2>
            <p className="text-sm sm:text-base text-[#6b6b6b]">No schedule set yet</p>
          </div>
        </div>
        <div className="flex flex-col items-center text-center py-6 px-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="text-4xl sm:text-5xl mb-4">📅</div>
          <h3 className="text-base sm:text-lg font-semibold text-[#2d3748] mb-2">
            Schedule your writing plan
          </h3>
          <p className="text-sm text-[#6b6b6b] mb-5 max-w-xs">
            Pick your writing days and times to get weekly progress reminders and stay on track.
          </p>
          <button
            onClick={() => navigate("/setup-plan")}
            className="btn-primary text-sm sm:text-base px-6 py-2.5 sm:px-8 sm:py-3"
          >
            Set Up Schedule
          </button>
        </div>
      </div>
    );
  }

  // Get only the days that are genuinely selected (non-null, non-empty time)
  const selectedDays = DAYS.filter(day => {
    const time = plan[`${day.key}Time`];
    return time !== null && time !== undefined && time !== "" && time !== "00:00";
  }).map(day => ({
    ...day,
    goal: plan[`${day.key}Goal`], // may be 0, and that’s fine
    time: plan[`${day.key}Time`],
  }));
  
  console.log("seldays", selectedDays);

  const selectedCount = selectedDays.length;

  return (
    <div className="bg-[#fafaf9] rounded-2xl shadow-sm border border-[#e5e5e4] p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2d3748] mb-1">
            Your Writing Days
          </h2>
          <p className="text-sm sm:text-base text-[#6b6b6b]">
            {selectedCount > 0 ? (
              <>
                Writing <span className="font-semibold text-[#d4af37]">{selectedCount}</span> {selectedCount === 1 ? 'day' : 'days'} per week
              </>
            ) : (
              "No days scheduled yet"
            )}
          </p>
        </div>
        <button
          onClick={() => navigate("/setup-plan")}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm text-[#6b6b6b] hover:text-[#2d3748] hover:bg-white rounded-lg transition-all"
        >
          <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Edit</span>
        </button>
      </div>

      {/* Days Grid - Only Selected Days */}
      {selectedCount > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
          {selectedDays.map((day) => (
            <div
              key={day.key}
              className="bg-gradient-to-br from-[#d4af37] to-[#c49f2f] rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 w-full max-w-[160px] mx-auto"
            >
              {/* Header with checkmark */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                  {day.label}
                </span>
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md" />
              </div>

              {/* Goals Display */}
              <div className="space-y-2">
                {day.goal !== null && day.goal > 0 && (
                  <div className="flex items-center gap-2 text-white/90">
                    <span className="text-lg sm:text-xl">📝</span>
                    <span className="text-sm sm:text-base font-medium">
                      {day.goal}w
                    </span>
                  </div>
                )}
                {day.time !== null && day.time !== "00:00" && day.time !== "" && (
                  <div className="flex items-center gap-2 text-white/90">
                    <span className="text-lg sm:text-xl">⏰</span>
                    <span className="text-sm sm:text-base font-medium">
                      {day.time}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-[#8a8a8a] italic">No writing days selected yet</p>
        </div>
      )}

      {/* Encouragement Messages */}
      {selectedCount > 0 && (
        <div className="mt-6">
          {selectedCount <= 3 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm sm:text-base text-green-800">
                🌱 Perfect! {selectedCount} {selectedCount === 1 ? 'day' : 'days'} per week is sustainable and manageable.
              </p>
            </div>
          )}

          {selectedCount > 3 && selectedCount < 7 && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm sm:text-base text-amber-800">
                ⚡ {selectedCount} days is ambitious! You're dedicated. Remember to be kind to yourself.
              </p>
            </div>
          )}

          {selectedCount === 7 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm sm:text-base text-purple-800">
                💪 Every single day! That's incredible dedication. Don't forget to rest when you need it.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}