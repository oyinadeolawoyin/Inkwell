import { useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleGetStarted() {
    navigate("/setup-plan");
  }

  return (
    <div className="min-h-screen bg-ink-cream flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-soft-lg p-6 sm:p-8 lg:p-12">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="mb-4">
              <span className="text-5xl sm:text-6xl">🖋️</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-ink-primary mb-4">
              Welcome, {user?.username}!
            </h1>
          </div>

          {/* Secret Message */}
          <div className="space-y-6 sm:space-y-8 mb-8 sm:mb-10">
            <div className="text-center">
              <p className="text-lg sm:text-xl text-ink-gray font-medium mb-6">
                Let me tell you a secret...
              </p>
            </div>

            {/* Permission Statements */}
            <div className="space-y-4 sm:space-y-5 max-w-xl mx-auto">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="text-ink-gold text-xl sm:text-2xl flex-shrink-0 mt-1">✓</span>
                <p className="text-base sm:text-lg text-ink-gray leading-relaxed">
                  You don't need to write every day
                </p>
              </div>
              
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="text-ink-gold text-xl sm:text-2xl flex-shrink-0 mt-1">✓</span>
                <p className="text-base sm:text-lg text-ink-gray leading-relaxed">
                  You don't need to hit word count goals
                </p>
              </div>
              
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="text-ink-gold text-xl sm:text-2xl flex-shrink-0 mt-1">✓</span>
                <p className="text-base sm:text-lg text-ink-gray leading-relaxed">
                  You don't need to be "ready"
                </p>
              </div>
            </div>

            {/* Core Message */}
            <div className="text-center pt-6 sm:pt-8">
              <p className="text-xl sm:text-2xl lg:text-3xl font-serif text-ink-primary leading-relaxed">
                You just need to show up sometimes.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-ink-cream rounded-xl p-6 sm:p-8 mb-6 sm:mb-8 border-l-4 border-ink-gold">
            <p className="text-base sm:text-lg text-ink-gray mb-2">
              Let's pick a few days that feel doable.
            </p>
            <p className="text-base sm:text-lg text-ink-gray mb-2">
              I'll gently remind you. No pressure.
            </p>
            <p className="text-sm sm:text-base text-gray-600 italic mt-4">
              Even 10 minutes counts.
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto px-8 sm:px-12 py-4 bg-ink-primary text-white text-base sm:text-lg font-medium rounded-xl
                       hover:bg-opacity-90 transition-all duration-200 shadow-soft
                       focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
            >
              Let's Get Started
            </button>
          </div>

          {/* Subtle Quote */}
          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-ink-lightgray">
            <p className="text-xs sm:text-sm text-center text-gray-500 italic leading-relaxed">
              "Most stories aren't written in bursts of genius,<br className="hidden sm:inline" />
              but in small, stubborn minutes."
            </p>
          </div>
        </div>

        {/* Bottom Note (Outside Card) */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This will take less than 2 minutes
          </p>
        </div>
      </div>
    </div>
  );
}