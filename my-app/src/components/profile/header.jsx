import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="bg-white border-b border-ink-lightgray sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl sm:text-3xl">🖋️</span>
            <h1 className="text-xl sm:text-2xl font-serif text-ink-primary">
              Inkwell
            </h1>
          </Link>

          {/* Right Side - Desktop */}
          <div className="hidden sm:flex items-center gap-4 lg:gap-6">
            {/* Notification Bell */}
            <button 
              className="relative p-2 text-ink-gray hover:text-ink-primary transition-colors rounded-lg hover:bg-ink-cream"
              aria-label="Notifications"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                />
              </svg>
              {/* Notification badge - hide if no notifications */}
              {/* <span className="absolute top-1 right-1 w-2 h-2 bg-ink-gold rounded-full"></span> */}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-cream transition-colors"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-ink-primary flex items-center justify-center text-white font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                {/* Username */}
                <span className="text-sm font-medium text-ink-primary hidden lg:block">
                  {user?.username}
                </span>
                {/* Dropdown arrow */}
                <svg 
                  className={`w-4 h-4 text-ink-gray transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDropdown(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-soft-lg border border-ink-lightgray z-20 py-2">
                    <div className="px-4 py-3 border-b border-ink-lightgray">
                      <p className="text-sm font-medium text-ink-primary">{user?.username}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      Profile
                    </Link>
                    
                    <Link
                      to="/dashbaord"
                      className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      Dashboard
                    </Link>
                    
                    <div className="border-t border-ink-lightgray mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Side - Mobile */}
          <div className="flex sm:hidden items-center gap-3">
            {/* Notification Bell */}
            <button 
              className="relative p-2 text-ink-gray hover:text-ink-primary transition-colors"
              aria-label="Notifications"
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                />
              </svg>
            </button>

            {/* Profile Avatar - Mobile */}
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-8 h-8 rounded-full bg-ink-primary flex items-center justify-center text-white font-medium text-sm"
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}