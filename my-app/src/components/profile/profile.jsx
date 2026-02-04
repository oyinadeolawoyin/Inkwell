import { useAuth } from "../auth/authContext";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ink-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-ink-primary mb-4">
            Profile
          </h1>
          <div className="w-20 h-1 bg-ink-gold mx-auto rounded-full"></div>
        </div>

        {/* Under Construction Card */}
        <div className="bg-white rounded-2xl shadow-soft-lg p-8 sm:p-12 text-center">
          {/* Icon */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-ink-cream rounded-full flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-ink-gold" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-4">
            Profile Page Under Development
          </h2>

          {/* Description */}
          <p className="text-ink-gray text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            We're crafting a beautiful profile experience for you. This page is currently under construction as our team works to bring you personalized settings, preferences, and account management features.
          </p>

          {/* User Info Preview */}
          {user && (
            <div className="bg-ink-cream rounded-xl p-6 mb-8 max-w-md mx-auto">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-ink-primary flex items-center justify-center text-white font-medium text-xl flex-shrink-0">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-left">
                  <p className="text-lg font-medium text-ink-primary">
                    {user?.username}
                  </p>
                  <p className="text-sm text-ink-lightgray">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Coming Soon Features */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
            <div className="bg-ink-cream rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-ink-gold bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-ink-gold text-lg">✓</span>
                </div>
                <div>
                  <h3 className="font-medium text-ink-primary mb-1">Profile Settings</h3>
                  <p className="text-sm text-ink-lightgray">Customize your account details and preferences</p>
                </div>
              </div>
            </div>

            <div className="bg-ink-cream rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-ink-gold bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-ink-gold text-lg">✓</span>
                </div>
                <div>
                  <h3 className="font-medium text-ink-primary mb-1">Avatar Upload</h3>
                  <p className="text-sm text-ink-lightgray">Add a personal touch with your photo</p>
                </div>
              </div>
            </div>

            <div className="bg-ink-cream rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-ink-gold bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-ink-gold text-lg">✓</span>
                </div>
                <div>
                  <h3 className="font-medium text-ink-primary mb-1">Writing Stats</h3>
                  <p className="text-sm text-ink-lightgray">Track your progress and achievements</p>
                </div>
              </div>
            </div>

            <div className="bg-ink-cream rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-ink-gold bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-ink-gold text-lg">✓</span>
                </div>
                <div>
                  <h3 className="font-medium text-ink-primary mb-1">Privacy Controls</h3>
                  <p className="text-sm text-ink-lightgray">Manage your privacy and security settings</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ink-primary text-white rounded-lg font-medium
                     hover:bg-opacity-90 transition-all duration-200 shadow-soft"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Timeline Indicator */}
        <div className="mt-8 text-center">
          <p className="text-sm text-ink-lightgray">
            Expected completion: <span className="font-medium text-ink-gold">Coming Soon</span>
          </p>
        </div>
      </div>
    </div>
  );
}