import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../profile/header";
import DailyQuote from "../quote/dailyQuote";
import WritingSchedule from "../writingPlan/writingSchedule";
import ProgressStats from "../writingPlan/progressStats";
import { AppMetaTags } from "../utilis/metatags";
import { StartGroupSprintModal } from "../sprint/groupSprintModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const [showGroupModal, setShowGroupModal] = useState(false);

  function handleGroupSprintCreated(groupSprint, sprint) {
    // Navigate to the group sprint workspace after creating
    navigate(`/group-sprint/${groupSprint.id}`);
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      <AppMetaTags
        title="My Writing Space"
        description="Showing up, one sprint at a time."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            <DailyQuote />

            {/* Sprint CTA */}
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

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => navigate("/start-sprint")}
                    className="w-full sm:w-auto px-6 py-3 bg-ink-primary text-white text-base font-medium rounded-xl
                             hover:bg-opacity-90 transition-all shadow-soft
                             focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
                  >
                    Solo Sprint
                  </button>
                  <button
                    onClick={() => setShowGroupModal(true)}
                    className="w-full sm:w-auto px-6 py-3 border-2 border-ink-primary text-ink-primary text-base font-medium rounded-xl
                             hover:bg-ink-primary hover:text-white transition-all
                             focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
                  >
                    Group Sprint
                  </button>
                </div>
              </div>
            </div>

            <ProgressStats />
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:space-y-8">
            <WritingSchedule />
          </div>
        </div>
      </main>

      <StartGroupSprintModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreated={handleGroupSprintCreated}
      />
    </div>
  );
}