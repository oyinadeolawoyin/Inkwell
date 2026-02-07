import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../../config/api";
import html2canvas from "html2canvas";

export default function ProgressStats() {
  const navigate = useNavigate();
  const [dailyProgress, setDailyProgress] = useState(null);
  const [weeklyProgress, setWeeklyProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharingDaily, setIsSharingDaily] = useState(false);
  const [isSharingWeekly, setIsSharingWeekly] = useState(false);
  const dailyRef = useRef(null);
  const weeklyRef = useRef(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  async function fetchProgress() {
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        fetch(`${API_URL}/progress/today`, { credentials: "include" }),
        fetch(`${API_URL}/progress/week`, { credentials: "include" }),
      ]);

      if (dailyRes.ok) {
        const dailyData = await dailyRes.json();
        setDailyProgress(dailyData);
      }

      if (weeklyRes.ok) {
        const weeklyData = await weeklyRes.json();
        setWeeklyProgress(weeklyData);
        console.log("ps", weeklyData);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleShare(elementRef, type, setSharing) {
    if (!elementRef.current) return;
    
    setSharing(true);
    
    try {
      const canvas = await html2canvas(elementRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      
      const stats = type === 'daily' ? dailyProgress : weeklyProgress;
      const shareText = type === 'daily' 
        ? `Today's writing: ${stats.sprintsCompleted} sprint${stats.sprintsCompleted !== 1 ? 's' : ''}, ${stats.wordsWritten.toLocaleString()} words!`
        : `This week: ${stats.totalSprints} sprints, ${stats.totalWords?.toLocaleString()} words written!`;

      const shareData = {
        title: type === 'daily' ? 'My Daily Writing Progress' : 'My Weekly Writing Progress',
        text: shareText,
        url: window.location.origin,
      };

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${type}-progress.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            ...shareData,
            files: [file],
          });
        } else {
          await navigator.share(shareData);
        }
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
        
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${type}-progress.png`;
        link.href = url;
        link.click();
        
        alert('Progress copied to clipboard and image downloaded!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('Failed to share. Please try again.');
    } finally {
      setSharing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-ink-cream rounded w-1/3"></div>
          <div className="h-20 bg-ink-cream rounded"></div>
        </div>
      </div>
    );
  }

  const hasNoProgress = 
    weeklyProgress?.completedPlannedDays === 0 && 
    weeklyProgress?.bonusDays === 0;

  if (hasNoProgress) {
    return (
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl shadow-lg border-2 border-amber-200/50 p-6 sm:p-8 lg:p-10">
        <div className="absolute inset-0 opacity-10 pointer-events-none rounded-2xl">
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#d4af37] rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="mb-6">
            <span className="text-6xl sm:text-7xl">🌱</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#2d3748] mb-3">
            Your story is waiting
          </h3>
          <div className="max-w-md mx-auto space-y-2 mb-6">
            <p className="text-sm sm:text-base text-[#4a4a4a] leading-relaxed">
              The hardest part? Showing up. And you're already here.
            </p>
            <p className="text-sm sm:text-base text-[#6b6b6b]">
              Start with just 10 minutes. See where it takes you.
            </p>
          </div>
          <button
            onClick={() => navigate("/sprint/start")}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#2d3748] to-[#1a202c] text-white text-base sm:text-lg font-semibold rounded-xl hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Start Your First Sprint
          </button>
          <p className="mt-4 text-xs sm:text-sm text-[#8a8a8a] italic">
            Your progress will show up here. We'll be cheering you on! ✨
          </p>
        </div>
      </div>
    );
  }

  const weeklyPercentage = weeklyProgress?.plannedDays 
    ? Math.round((weeklyProgress.completedPlannedDays / weeklyProgress.plannedDays) * 100)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Today's Progress */}
      <div className="relative">
        {dailyProgress?.sprintsCompleted > 0 && (
          <button
            onClick={() => handleShare(dailyRef, 'daily', setIsSharingDaily)}
            disabled={isSharingDaily}
            className="absolute -top-3 -right-3 z-20 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 disabled:opacity-50"
            aria-label="Share daily progress"
          >
            {isSharingDaily ? (
              <svg className="w-5 h-5 text-ink-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-ink-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
          </button>
        )}

        <div ref={dailyRef} className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-serif text-ink-primary mb-4">
            Today
          </h2>

          {dailyProgress?.sprintsCompleted > 0 ? (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-ink-primary">
                    {dailyProgress.sprintsCompleted}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {dailyProgress.sprintsCompleted === 1 ? 'sprint' : 'sprints'}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-ink-primary">
                    {dailyProgress.wordsWritten.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">words</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-ink-primary">
                    {dailyProgress.minutesWritten}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">minutes</div>
                </div>
              </div>

              {/* Badge */}
              {dailyProgress.wasPlannedDay && (
                <div className="flex items-center justify-center gap-2 p-3 bg-ink-gold bg-opacity-10 rounded-lg">
                  <span className="text-ink-gold">✓</span>
                  <span className="text-sm font-medium text-ink-primary">
                    Planned day complete!
                  </span>
                </div>
              )}
              {!dailyProgress.wasPlannedDay && (
                <div className="flex items-center justify-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-500">🎁</span>
                  <span className="text-sm font-medium text-purple-700">
                    Bonus writing day!
                  </span>
                </div>
              )}

              {/* Watermark */}
              <div className="text-center pt-2">
                <span className="text-xs text-gray-400">
                  {window.location.hostname}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-ink-gray mb-4">No sprints yet today</p>
              {dailyProgress?.wasPlannedDay && (
                <p className="text-sm text-gray-500">
                  This is one of your writing days 🌱
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* This Week's Progress */}
      <div className="relative">
        <button
          onClick={() => handleShare(weeklyRef, 'weekly', setIsSharingWeekly)}
          disabled={isSharingWeekly}
          className="absolute -top-3 -right-3 z-20 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 disabled:opacity-50"
          aria-label="Share weekly progress"
        >
          {isSharingWeekly ? (
            <svg className="w-5 h-5 text-ink-primary animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-ink-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </button>

        <div ref={weeklyRef} className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-serif text-ink-primary mb-4">
            This Week
          </h2>

          {/* Progress Bar */}
          {weeklyProgress?.plannedDays > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink-gray">
                  {weeklyProgress.completedPlannedDays} of {weeklyProgress.plannedDays} days
                </span>
                <span className="text-sm font-medium text-ink-primary">
                  {weeklyPercentage}%
                </span>
              </div>
              <div className="w-full h-3 bg-ink-cream rounded-full overflow-hidden">
                <div
                  className="h-full bg-ink-gold transition-all duration-500 rounded-full"
                  style={{ width: `${weeklyPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-ink-cream rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-ink-primary">
                {weeklyProgress?.totalSprints || 0}
              </div>
              <div className="text-xs text-gray-500">sprints</div>
            </div>

            <div className="text-center p-3 bg-ink-cream rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-ink-primary">
                {weeklyProgress?.totalWords?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500">words</div>
            </div>

            <div className="text-center p-3 bg-ink-cream rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-ink-primary">
                {Math.floor((weeklyProgress?.totalMinutes || 0) / 60)}h {(weeklyProgress?.totalMinutes || 0) % 60}m
              </div>
              <div className="text-xs text-gray-500">time</div>
            </div>

            {weeklyProgress?.bonusDays > 0 && (
              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">
                  +{weeklyProgress.bonusDays}
                </div>
                <div className="text-xs text-purple-600 font-medium">bonus days</div>
              </div>
            )}
          </div>

          {/* Encouragement */}
          {weeklyProgress?.completedPlannedDays > 0 && (
            <div className="pt-4 border-t border-ink-cream">
              <p className="text-sm text-ink-gray italic text-center">
                {weeklyPercentage === 100
                  ? "🎉 You crushed it this week!"
                  : weeklyPercentage >= 75
                  ? "💪 You're doing great!"
                  : weeklyPercentage >= 50
                  ? "🌱 You're showing up. That's what matters."
                  : "Every word counts. Keep going!"}
              </p>
            </div>
          )}

          {/* Watermark */}
          <div className="text-center pt-2">
            <span className="text-xs text-gray-400">
              {window.location.hostname}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}