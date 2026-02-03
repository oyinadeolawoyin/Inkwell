import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

const DAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

export default function SetupPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [existingPlan, setExistingPlan] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDays, setSelectedDays] = useState({});
  const [goals, setGoals] = useState({});
  const [times, setTimes] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");

  // Fetch existing plan on mount
  useEffect(() => {
    fetchExistingPlan();
  }, []);

  async function fetchExistingPlan() {
    try {
      const res = await fetch(`${API_URL}/writingPlan`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const plan = data.writingPlan || data;
        
        if (plan && plan.id) {
          setExistingPlan(plan);
          setIsEditing(true);
          
          // Populate the form with existing data
          const newSelectedDays = {};
          const newGoals = {};
          const newTimes = {};
          
          DAYS.forEach(day => {
            const goalKey = `${day.key}Goal`;
            const timeKey = `${day.key}Time`;
            
            // If time is NOT null, day is selected
            if (plan[timeKey] !== null) {
              newSelectedDays[day.key] = true;
              newGoals[day.key] = plan[goalKey] || 0;
              newTimes[day.key] = plan[timeKey] || "09:00";
            }
          });
          
          setSelectedDays(newSelectedDays);
          setGoals(newGoals);
          setTimes(newTimes);
        }
      }
    } catch (err) {
      console.error("Failed to fetch plan:", err);
    } finally {
      setIsFetching(false);
    }
  }

  function toggleDay(dayKey) {
    setSelectedDays(prev => {
      const newSelected = { ...prev };
      if (newSelected[dayKey]) {
        delete newSelected[dayKey];
        // Also clear goal and time when deselecting
        const newGoals = { ...goals };
        const newTimes = { ...times };
        delete newGoals[dayKey];
        delete newTimes[dayKey];
        setGoals(newGoals);
        setTimes(newTimes);
      } else {
        newSelected[dayKey] = true;
        // Set default time when selecting
        setTimes(prev => ({
          ...prev,
          [dayKey]: prev[dayKey] || "09:00"
        }));
      }
      return newSelected;
    });
  }

  function setGoal(dayKey, value) {
    setGoals(prev => ({
      ...prev,
      [dayKey]: value === "" ? null : parseInt(value) || 0
    }));
  }

  function setTime(dayKey, value) {
    setTimes(prev => ({
      ...prev,
      [dayKey]: value
    }));
  }

  async function handleSubmit() {
    const selectedCount = Object.keys(selectedDays).length;
    
    if (selectedCount === 0) {
      setError("Pick at least one day. You got this! 🌱");
      return;
    }

    if (selectedCount > 5) {
      setError("Maybe start with 2-4 days? You can always add more later.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Build the plan object
      const plan = {};
      DAYS.forEach(day => {
        const goalKey = `${day.key}Goal`;
        const timeKey = `${day.key}Time`;
        
        if (selectedDays[day.key]) {
          plan[goalKey] = goals[day.key] ?? 0; // 0 = write but no specific goal
          plan[timeKey] = times[day.key] || "09:00"; // Default to 9am
        } else {
          plan[goalKey] = null;
          plan[timeKey] = null;
        }
      });

      let res;
      if (isEditing && existingPlan?.id) {
        // UPDATE existing plan
        res = await fetch(`${API_URL}/writingPlan/${existingPlan.id}/updatePlan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(plan),
        });
      } else {
        // CREATE new plan
        res = await fetch(`${API_URL}/writingPlan/createPlan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(plan),
        });
      }

      if (res.ok) {
        navigate("/dashboard");
      } else {
        const data = await res.json();
        setError(data.message || "Something went wrong. Try again?");
      }
    } catch (err) {
      setError("Couldn't save. Check your connection?");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedCount = Object.keys(selectedDays).length;

  // Show loading state while fetching
  if (isFetching) {
    return (
      <div className="min-h-screen bg-ink-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink-primary mx-auto mb-4"></div>
          <p className="text-ink-gray">Loading your plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-cream py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-ink-primary mb-4">
            {isEditing ? "Update Your Writing Days" : "Set Your Writing Days"}
          </h1>
          <p className="text-base sm:text-lg text-ink-gray max-w-2xl mx-auto leading-relaxed">
            {isEditing 
              ? "Adjust your schedule as needed. Life changes, and that's okay." 
              : "Pick 2-4 days that work for you. You can always change this later."}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-soft-lg p-6 sm:p-8 lg:p-10">
          {/* Day Selection */}
          <div className="mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-serif text-ink-primary mb-6">
              Which days do you want to write?
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {DAYS.map(day => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`
                    p-4 sm:p-5 rounded-xl border-2 transition-all duration-200
                    ${selectedDays[day.key]
                      ? 'border-ink-gold bg-ink-gold bg-opacity-10 shadow-soft'
                      : 'border-ink-lightgray hover:border-ink-primary'
                    }
                  `}
                >
                  <div className="text-center">
                    {/* Checkmark */}
                    <div className="mb-2">
                      {selectedDays[day.key] ? (
                        <span className="text-2xl text-ink-gold">✓</span>
                      ) : (
                        <div className="w-6 h-6 mx-auto rounded-full border-2 border-gray-300"></div>
                      )}
                    </div>
                    {/* Day Label */}
                    <span className={`
                      text-sm sm:text-base font-medium
                      ${selectedDays[day.key] ? 'text-ink-primary' : 'text-ink-gray'}
                    `}>
                      {/* Show short on mobile, full on desktop */}
                      <span className="sm:hidden">{day.short}</span>
                      <span className="hidden sm:inline">{day.label}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Count */}
            {selectedCount > 0 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-ink-gray">
                  {selectedCount} {selectedCount === 1 ? 'day' : 'days'} selected
                  {selectedCount > 5 && (
                    <span className="text-amber-600"> (maybe start with fewer?)</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Goals & Times for Selected Days */}
          {selectedCount > 0 && (
            <div className="mb-8 sm:mb-10 pt-8 border-t border-ink-lightgray">
              <h2 className="text-xl sm:text-2xl font-serif text-ink-primary mb-4">
                Optional: Set goals & reminder times
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Leave blank if you just want to show up without a specific word goal.
              </p>

              <div className="space-y-4 sm:space-y-5">
                {DAYS.filter(day => selectedDays[day.key]).map(day => (
                  <div 
                    key={day.key}
                    className="bg-ink-cream rounded-xl p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Day Label */}
                      <div className="sm:w-32 flex-shrink-0">
                        <span className="font-medium text-ink-primary">
                          {day.label}
                        </span>
                      </div>

                      {/* Goal Input */}
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-2">
                          Word goal (optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={goals[day.key] ?? ""}
                          onChange={(e) => setGoal(day.key, e.target.value)}
                          placeholder="500"
                          className="w-full px-4 py-2 sm:py-3 rounded-lg border border-ink-lightgray
                                   focus:ring-2 focus:ring-ink-gold focus:border-ink-gold
                                   transition-all text-sm sm:text-base"
                        />
                      </div>

                      {/* Time Input */}
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-2">
                          Reminder time
                        </label>
                        <input
                          type="time"
                          value={times[day.key] || "09:00"}
                          onChange={(e) => setTime(day.key, e.target.value)}
                          className="w-full px-4 py-2 sm:py-3 rounded-lg border border-ink-lightgray
                                   focus:ring-2 focus:ring-ink-gold focus:border-ink-gold
                                   transition-all text-sm sm:text-base"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
              <p className="text-sm sm:text-base">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="order-2 sm:order-1 w-full sm:w-auto text-ink-gray hover:text-ink-primary 
                       transition-colors text-sm sm:text-base"
            >
              {isEditing ? "Cancel" : "Skip for now"}
            </button>

            <button
              onClick={handleSubmit}
              disabled={isLoading || selectedCount === 0}
              className="order-1 sm:order-2 w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 
                       bg-ink-primary text-white text-base sm:text-lg font-medium rounded-xl
                       hover:bg-opacity-90 transition-all duration-200 shadow-soft
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditing ? "Updating..." : "Saving..."}
                </span>
              ) : (
                isEditing ? "Update My Plan" : "Save My Plan"
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-ink-lightgray">
            <p className="text-xs sm:text-sm text-center text-gray-500 italic">
              {isEditing 
                ? "Your changes will be saved immediately." 
                : "Don't worry, you can change this anytime in settings."}
            </p>
          </div>
        </div>

        {/* Bottom Encouragement */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Most writers find 2-3 days per week sustainable 🌱
          </p>
        </div>
      </div>
    </div>
  );
}