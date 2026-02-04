import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

const DURATIONS = [
  { value: 1, label: "1 min", description: "Warm up" },
  { value: 5, label: "5 min", description: "Momentum starter" },
  { value: 10, label: "10 min", description: "Micro focus" },
  { value: 15, label: "15 min", description: "Quick sprint" },
  { value: 25, label: "25 min", description: "Classic pomodoro" },
  { value: 30, label: "30 min", description: "Focused flow" },
  { value: 45, label: "45 min", description: "Deep work" },
  { value: 60, label: "60 min", description: "Marathon session" },
];

export default function StartSprint() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkin, setCheckin] = useState("");
  const [duration, setDuration] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [todayStats, setTodayStats] = useState(null);

  useEffect(() => {
    fetchTodayStats();
  }, []);

  async function fetchTodayStats() {
    try {
      const res = await fetch(`${API_URL}/progress/today`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTodayStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch today's stats:", error);
    }
  }

  async function handleStartSprint(e) {
    e.preventDefault();

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/sprint/startSprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          duration,
          checkin: checkin.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/sprint/${data.sprint.id}`);
      } else {
        alert("Failed to start sprint. Please try again.");
      }
    } catch (error) {
      console.error("Start sprint error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-ink-primary mb-3">
            Start Your Sprint
          </h1>
          <p className="text-base sm:text-lg text-ink-gray">
            What are you working on today?
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft-lg p-6 sm:p-8 lg:p-10 mb-6">
          <form onSubmit={handleStartSprint} className="space-y-8">
            <div>
              <label 
                htmlFor="checkin" 
                className="block text-lg font-serif text-ink-primary mb-3"
              >
                What are you working on? <span className="text-sm text-gray-500 font-sans">(optional)</span>
              </label>
              <textarea
                id="checkin"
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
                placeholder="Chapter 3 - Dragon battle scene..."
                rows="3"
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray
                         focus:ring-2 focus:ring-ink-gold focus:border-ink-gold
                         bg-white text-ink-gray placeholder-gray-400 transition-all
                         resize-none"
                maxLength="200"
              />
              <p className="mt-2 text-xs text-gray-500">
                {checkin.length}/200 characters
              </p>
            </div>

            <div>
              <label className="block text-lg font-serif text-ink-primary mb-4">
                How long do you want to write?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {DURATIONS.map((dur) => (
                  <button
                    key={dur.value}
                    type="button"
                    onClick={() => setDuration(dur.value)}
                    className={`
                      p-4 sm:p-5 rounded-xl border-2 transition-all text-center
                      ${duration === dur.value
                        ? 'border-ink-gold bg-ink-gold bg-opacity-10 shadow-soft'
                        : 'border-ink-lightgray hover:border-ink-primary'
                      }
                    `}
                  >
                    <div className={`text-2xl sm:text-3xl font-bold mb-1 ${
                      duration === dur.value ? 'text-ink-primary' : 'text-ink-gray'
                    }`}>
                      {dur.value}
                    </div>
                    <div className={`text-xs sm:text-sm ${
                      duration === dur.value ? 'text-ink-primary' : 'text-gray-500'
                    }`}>
                      {dur.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-ink-cream rounded-xl p-4 sm:p-5 border-l-4 border-ink-gold">
              <p className="text-sm sm:text-base text-ink-gray">
                💡 <strong>Remember:</strong> Even 10 minutes counts. Your first draft doesn't have to be perfect.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-ink-primary text-white text-lg font-medium rounded-xl
                       hover:bg-opacity-90 transition-all shadow-soft
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </span>
              ) : (
                "Start Writing"
              )}
            </button>
          </form>
        </div>

        {todayStats && todayStats.sprintsCompleted > 0 && (
          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
            <h3 className="text-sm font-medium text-ink-gray mb-3">
              Today's Progress
            </h3>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="text-2xl font-bold text-ink-primary">
                  {todayStats.sprintsCompleted}
                </div>
                <div className="text-xs text-gray-500">
                  {todayStats.sprintsCompleted === 1 ? 'sprint' : 'sprints'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ink-primary">
                  {todayStats.wordsWritten.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ink-primary">
                  {todayStats.minutesWritten}
                </div>
                <div className="text-xs text-gray-500">minutes</div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-ink-gray hover:text-ink-primary transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}