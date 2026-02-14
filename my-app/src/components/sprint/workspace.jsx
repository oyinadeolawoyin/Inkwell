import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

export default function ActiveSprint() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mySprint, setMySprint] = useState(null);
  const [otherSprints, setOtherSprints] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch my sprint on load
  useEffect(() => {
    fetchMySprint();
  }, []);

  // Fetch other sprints every 5 seconds
  useEffect(() => {
    fetchOtherSprints();
    const interval = setInterval(fetchOtherSprints, 5000);
    return () => clearInterval(interval);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!mySprint || isPaused) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(mySprint.startedAt).getTime()) / 1000);
      const remaining = (mySprint.duration * 60) - elapsed;

      if (remaining <= 0) {
        setTimeLeft(0);
        playNotificationSound();
        setShowCompleteModal(true);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mySprint, isPaused]);

  async function fetchMySprint() {
    try {
      const res = await fetch(`${API_URL}/sprint/loginUserSession`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sprint && data.sprint.isActive) {
          setMySprint(data.sprint);
          setIsPaused(data.sprint.isPause || false);
        } else {
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch my sprint:", error);
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchOtherSprints() {
    try {
      const res = await fetch(`${API_URL}/sprint?limit=20`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const others = data.sprints.filter(s => s.userId !== user?.id && s.isActive);
        setOtherSprints(others);
      }
    } catch (error) {
      console.error("Failed to fetch other sprints:", error);
    }
  }

  async function handlePause() {
    try {
      const res = await fetch(`${API_URL}/sprint/${mySprint.id}/pause/${!isPaused}`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        setIsPaused(!isPaused);
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  }

  async function handleEndEarly() {
    if (confirm("End your sprint early? Your progress will still count.")) {
      setShowCompleteModal(true);
    }
  }

  function playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getTimeRemaining(sprint) {
    const elapsed = Math.floor((Date.now() - new Date(sprint.startedAt).getTime()) / 1000);
    const remaining = (sprint.duration * 60) - elapsed;
    return Math.max(0, remaining);
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

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* My Sprint - Large Card */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-soft-lg p-8 sm:p-10 lg:p-12 border-l-4 border-ink-gold">
              {/* Timer */}
              <div className="text-center mb-8">
                <div className="text-6xl sm:text-7xl lg:text-8xl font-bold text-ink-primary font-mono mb-4 tracking-tight">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-lg sm:text-xl text-ink-gray font-medium">
                  {isPaused ? "⏸️ Paused" : "✍️ Keep writing..."}
                </div>
              </div>

              {/* Check-in */}
              {mySprint?.checkin && (
                <div className="bg-white rounded-xl p-5 sm:p-6 mb-6 shadow-soft">
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">You're working on:</p>
                  <p className="text-base sm:text-lg text-ink-primary italic leading-relaxed">
                    "{mySprint.checkin}"
                  </p>
                </div>
              )}

              {/* Sprint Info */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 text-sm sm:text-base text-ink-gray">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{mySprint?.duration} minute sprint</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Writing with {otherSprints.length} {otherSprints.length === 1 ? 'other' : 'others'}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                  onClick={handlePause}
                  className="flex-1 py-3 px-6 bg-white border-2 border-ink-lightgray text-ink-primary rounded-xl
                           hover:border-ink-primary transition-all font-medium"
                >
                  {isPaused ? "▶️ Resume" : "⏸️ Pause"}
                </button>
                <button
                  onClick={handleEndEarly}
                  className="flex-1 py-3 px-6 bg-white border-2 border-ink-lightgray text-red-600 rounded-xl
                           hover:border-red-600 transition-all font-medium"
                >
                  ⏹️ End Early
                </button>
              </div>

              {/* Encouragement */}
              <div className="pt-6 border-t border-ink-gold border-opacity-20">
                <p className="text-sm sm:text-base text-center text-ink-gray italic">
                  {timeLeft > mySprint?.duration * 60 / 2 
                    ? "You've got this. Keep your pen moving. ✨"
                    : "Great progress! You're in the home stretch. 💪"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Other Writers - Sidebar */}
          <div>
            <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 sticky top-24">
              <h2 className="text-lg sm:text-xl font-serif text-ink-primary mb-6">
                Currently Writing ({otherSprints.length})
              </h2>

              {otherSprints.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🖋️</div>
                  <p className="text-sm text-gray-500">
                    You're the only one writing right now.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    That's okay. You're showing up! 🌱
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {otherSprints.map((sprint) => {
                    const remaining = getTimeRemaining(sprint);
                    const isPaused = sprint.isPause || false;
                    const username = sprint.user?.username || 'Writer';
                    
                    return (
                      <div 
                        key={sprint.id} 
                        className={`p-4 rounded-xl transition-all ${
                          isPaused 
                            ? 'bg-gray-50 border-2 border-dashed border-gray-300' 
                            : 'bg-ink-cream hover:bg-opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              isPaused ? 'bg-gray-400' : 'bg-ink-primary'
                            }`}>
                              {username.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Username */}
                            <span className={`font-medium text-sm ${
                              isPaused ? 'text-gray-500' : 'text-ink-primary'
                            }`}>
                              {username}
                            </span>
                          </div>
                          
                          {/* Timer or Pause Indicator */}
                          <div className="flex items-center gap-2">
                            {isPaused ? (
                              <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-full font-medium">
                                ⏸️ Paused
                              </span>
                            ) : (
                              <div className="text-sm font-mono text-ink-gray font-medium">
                                {formatTime(remaining)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Status Message */}
                        <div className="ml-10">
                          {isPaused ? (
                            <p className="text-xs text-gray-500 italic">
                              Taking a break
                            </p>
                          ) : (
                            sprint.checkin && (
                              <p className="text-xs text-gray-600 italic line-clamp-2 mb-1">
                                Working on: "{sprint.checkin}"
                              </p>
                            )
                          )}
                          
                          {/* Sprint Duration */}
                          <div className="mt-2 text-xs text-gray-500">
                            {sprint.duration} min sprint
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sprint Complete Modal */}
      {showCompleteModal && (
        <SprintCompleteModal
          sprintId={mySprint?.id}
          onClose={() => navigate("/dashboard")}
        />
      )}
    </div>
  );
}

// Sprint Complete Modal
function SprintCompleteModal({ sprintId, onClose }) {
  const [wordsWritten, setWordsWritten] = useState("");
  const [checkout, setCheckout] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleComplete() {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/sprint/${sprintId}/endSprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          wordsWritten: wordsWritten ? Number(wordsWritten) : 0,
          checkout: checkout.trim() || null,
        }),
      });

      if (res.ok) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to complete sprint:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-soft-lg max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-300">
        {/* Celebration */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-2">
            Sprint Complete!
          </h2>
          <p className="text-ink-gray">
            You showed up. That's what matters most.
          </p>
        </div>

        {/* Word Count */}
        <div className="mb-5">
          <label htmlFor="words" className="block text-sm font-medium text-ink-primary mb-2">
            How many words did you write? <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="number"
            id="words"
            value={wordsWritten}
            onChange={(e) => setWordsWritten(e.target.value)}
            placeholder="342"
            min="0"
            className="w-full px-4 py-3 rounded-lg border border-ink-lightgray
                     focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all"
          />
        </div>

        {/* Checkout */}
        <div className="mb-6">
          <label htmlFor="checkout" className="block text-sm font-medium text-ink-primary mb-2">
            How did it go? <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            id="checkout"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            placeholder="Finished the dragon scene. The dialogue needs work but I got the words down."
            className="w-full px-4 py-3 rounded-lg border border-ink-lightgray
                     focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all
                     resize-none"
            rows="3"
            maxLength="200"
          />
          <p className="mt-1 text-xs text-gray-500">{checkout.length}/200 characters</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={() => handleComplete()}
            className="flex-1 py-3 px-6 bg-white border-2 border-ink-lightgray text-ink-gray rounded-lg
                     hover:border-ink-primary hover:text-ink-primary transition-all"
          >
            Skip
          </button>
          <button
            onClick={handleComplete}
            disabled={isLoading}
            className="flex-1 py-3 px-6 bg-ink-primary text-white rounded-lg
                     hover:bg-opacity-90 transition-all font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}