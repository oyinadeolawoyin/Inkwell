import { useNavigate } from "react-router-dom";
import Header from "../profile/header";
import DailyQuote from "../quote/dailyQuote";
import WritingSchedule from "../writingPlan/writingSchedule";
import ProgressStats from "../writingPlan/progressStats";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-cream">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Desktop: 2 Column Layout, Mobile: Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* Daily Quote */}
            <DailyQuote />

            {/* Start Sprint CTA */}
            <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl font-serif text-ink-primary mb-2">
                    Ready to write?
                  </h2>
                  <p className="text-sm sm:text-base text-ink-gray">
                    Even 10 minutes counts. Let's get started.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/start-sprint")}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-ink-primary text-white 
                           text-base sm:text-lg font-medium rounded-xl
                           hover:bg-opacity-90 transition-all shadow-soft
                           focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
                >
                  Start a Sprint
                </button>
              </div>
            </div>

            {/* Progress Stats */}
            <ProgressStats />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6 lg:space-y-8">
            {/* Writing Schedule */}
            <WritingSchedule />

            {/* Group Sprints */}
            <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-serif text-ink-primary">
                  Group Sprints
                </h2>
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  Coming Soon
                </span>
              </div>
              
              <div className="space-y-3">
                {/* Example sessions - for v2 */}
                <div className="p-3 bg-ink-cream rounded-lg opacity-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-purple-600 font-medium text-sm">📝 Editing</span>
                    <span className="text-xs text-gray-500">• 3 writers</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Join others polishing their drafts
                  </p>
                </div>

                <div className="p-3 bg-ink-cream rounded-lg opacity-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-600 font-medium text-sm">✍️ Drafting</span>
                    <span className="text-xs text-gray-500">• 5 writers</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Sprint with others working on first drafts
                  </p>
                </div>

                <div className="p-3 bg-ink-cream rounded-lg opacity-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-600 font-medium text-sm">💡 Brainstorming</span>
                    <span className="text-xs text-gray-500">• 2 writers</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Ideas flowing, plots forming
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-ink-cream">
                <p className="text-xs text-center text-gray-500">
                  Sprint together based on what you're working on
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}