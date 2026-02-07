import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";
import Header from "./components/profile/header";
import API_URL from "@/config/api";
import DailyQuote from "./components/quote/dailyQuote";
import NotificationsSetup from "./components/notification/notificationSetup";
import { AppMetaTags } from "./components/utilis/metatags";

export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [quote, setQuote] = useState(null);
  const [weeklyProgress, setWeeklyProgress] = useState(null);
  const [todaySprints, setTodaySprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // if (user) {
      fetchData();
    // } else {
    //   setIsLoading(false);
    // }
  }, []);

  async function fetchData() {
    try {
      const [quoteRes, progressRes, sprintsRes] = await Promise.all([
        fetch(`${API_URL}/quote`, { credentials: "include" }),
        fetch(`${API_URL}/progress/week`, { credentials: "include" }),
        fetch(`${API_URL}/sprint/sprintsOfTheDay?limit=20`, { credentials: "include" }),
      ]);

      if (quoteRes.ok) {
        const quoteData = await quoteRes.json();
        setQuote(quoteData.quote || quoteData);
      }

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setWeeklyProgress(progressData);
      }

      if (sprintsRes.ok) {
        const sprintsData = await sprintsRes.json();
        setTodaySprints(sprintsData.sprints || []);
      }
    } catch (error) {
      console.error("Failed to fetch homepage data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-cream flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-ink-primary border-t-transparent"></div>
          <p className="mt-4 text-ink-gray">Loading...</p>
        </div>
      </div>
    );
  }

  // if (!user) {
  //   navigate("/login");
  //   return null;
  // }

  const weeklyPercentage = weeklyProgress?.plannedDays 
    ? Math.round((weeklyProgress.completedPlannedDays / weeklyProgress.plannedDays) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-ink-cream">

      <AppMetaTags 
       title="Inkwell - Just Write"
       description="The easiest way to show up and write. No judgment, just progress."
    />

      {/* Header */}
      <Header />
      {/* Push notifications setup (runs only if user exists) */}
      <NotificationsSetup user={user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Daily Quote */}
        <section className="mb-8 sm:mb-12">
          <DailyQuote />
        </section>

        {/* Weekly Progress */}
        <section className="mb-8 sm:mb-12">
          <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 lg:p-10">
            <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-6">
              This Week's Progress
            </h2>

            {weeklyProgress && weeklyProgress.plannedDays > 0 ? (
              <>
                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base sm:text-lg text-ink-gray">
                      <strong className="text-ink-primary">{weeklyProgress.completedPlannedDays}</strong> of{' '}
                      <strong className="text-ink-primary">{weeklyProgress.plannedDays}</strong> days completed
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-ink-primary">
                      {weeklyPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-4 bg-ink-cream rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-ink-gold to-amber-500 transition-all duration-500 rounded-full"
                      style={{ width: `${weeklyPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6">
                  <div className="text-center p-4 bg-ink-cream rounded-xl">
                    <div className="text-3xl sm:text-4xl font-bold text-ink-primary mb-1">
                      {weeklyProgress.totalSprints}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      {weeklyProgress.totalSprints === 1 ? 'sprint' : 'sprints'}
                    </div>
                  </div>

                  <div className="text-center p-4 bg-ink-cream rounded-xl">
                    <div className="text-3xl sm:text-4xl font-bold text-ink-primary mb-1">
                      {weeklyProgress.totalWords?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">words</div>
                  </div>

                  <div className="text-center p-4 bg-ink-cream rounded-xl">
                    <div className="text-3xl sm:text-4xl font-bold text-ink-primary mb-1">
                      {Math.floor((weeklyProgress.totalMinutes || 0) / 60)}h {(weeklyProgress.totalMinutes || 0) % 60}m
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">time</div>
                  </div>

                  {weeklyProgress.bonusDays > 0 && (
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
                      <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-1">
                        +{weeklyProgress.bonusDays}
                      </div>
                      <div className="text-xs sm:text-sm text-purple-600 font-medium">bonus days</div>
                    </div>
                  )}
                </div>

                {/* Encouragement */}
                <div className="pt-6 border-t border-ink-cream">
                  <p className="text-base sm:text-lg text-center text-ink-gray italic">
                    {weeklyPercentage === 100
                      ? "🎉 Amazing! You hit all your writing days this week!"
                      : weeklyPercentage >= 75
                      ? "💪 You're crushing it! Keep this momentum going."
                      : weeklyPercentage >= 50
                      ? "🌱 You're showing up. That's what matters most."
                      : weeklyPercentage > 0
                      ? "✨ Every word counts. You're making progress."
                      : "📝 Ready to start? Your first sprint is waiting."}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl p-8 sm:p-10 lg:p-12 text-center relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-10 right-10 w-32 h-32 bg-ink-gold rounded-full blur-3xl"></div>
                  <div className="absolute bottom-10 left-10 w-32 h-32 bg-amber-400 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10">
                  <div className="text-6xl sm:text-7xl mb-6">✨</div>
                  
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-ink-primary mb-4">
                    Your writing journey starts here
                  </h3>
                  
                  <div className="max-w-2xl mx-auto space-y-3 mb-8">
                    <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                      Every writer you admire started exactly where you are now. With a blank page and a story waiting to be told.
                    </p>
                    <p className="text-base sm:text-lg text-gray-600">
                      You don't need to write a novel today. Just 10 minutes. Just one paragraph. Just <em className="text-ink-primary">something</em>.
                    </p>
                    <p className="text-base sm:text-lg text-amber-800 font-medium">
                      That's all it takes to begin.
                    </p>
                  </div>

                  <Link
                    to="/sprint/start"
                    className="inline-block px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-ink-primary to-gray-800 text-white text-base sm:text-lg font-semibold rounded-xl hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 mb-4"
                  >
                    Start Your First Sprint
                  </Link>

                  <p className="text-sm text-gray-500 italic">
                    Even 10 minutes counts. We promise.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Today's Sprint History */}
        <section>
          <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 lg:p-10">
            <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-6">
              Today's Sprints
            </h2>

            {todaySprints.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🖋️</div>
                <p className="text-ink-gray mb-6">No sprints completed today yet</p>
                <Link
                  to="/sprint/start"
                  className="inline-block px-6 py-3 bg-ink-primary text-white rounded-lg font-medium
                           hover:bg-opacity-90 transition-all shadow-soft"
                >
                  Start Your First Sprint
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {todaySprints.map((sprint) => (
                  <div
                    key={sprint.id}
                    className="border border-ink-lightgray rounded-xl p-5 sm:p-6 hover:border-ink-gold hover:shadow-soft transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-ink-primary flex items-center justify-center text-white font-medium">
                          {sprint.user?.username?.charAt(0).toUpperCase() || 'W'}
                        </div>
                        <div>
                          <p className="font-medium text-ink-primary">
                            {sprint.user?.username || 'Anonymous Writer'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getTimeAgo(sprint.completedAt)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 text-sm">
                        <div className="text-right sm:text-center">
                          <div className="font-bold text-ink-primary">
                            {sprint.wordsWritten?.toLocaleString() || 0}
                          </div>
                          <div className="text-xs text-gray-500">words</div>
                        </div>
                        <div className="text-right sm:text-center">
                          <div className="font-bold text-ink-primary">
                            {sprint.duration}
                          </div>
                          <div className="text-xs text-gray-500">min</div>
                        </div>
                      </div>
                    </div>

                    {/* Check-in */}
                    {sprint.checkin && (
                      <div className="bg-ink-cream rounded-lg p-4 mb-3">
                        <p className="text-xs text-gray-500 mb-1">Check-in:</p>
                        <p className="text-sm sm:text-base text-ink-gray italic">
                          "{sprint.checkin}"
                        </p>
                      </div>
                    )}

                    {/* Check-out */}
                    {sprint.checkout && (
                      <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-4 border-l-2 border-ink-gold">
                        <p className="text-xs text-gray-500 mb-1">Check-out:</p>
                        <p className="text-sm sm:text-base text-ink-gray italic">
                          "{sprint.checkout}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}