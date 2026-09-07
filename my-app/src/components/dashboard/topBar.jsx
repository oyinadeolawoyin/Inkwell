// src/components/dashboard/topBar.jsx

import { Link } from "react-router-dom";
import { Menu, X, Feather } from "lucide-react";

// Plain horizontal strip — logo only, no nav/search, same idea as Scribophile's
// top bar. The sidebar handles all navigation; this is brand chrome plus the
// mobile sidebar toggle.
export function TopBar({ mobileNavOpen, onToggleMobileNav, showHamburger }) {
  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(90deg, hsl(var(--social-500)) 0%, hsl(var(--social-700)) 50%, hsl(var(--social-500)) 100%)" }}
      />
      <div className="flex items-center h-16 px-4 sm:px-6">
        {/* Hamburger — mobile only, toggles the sidebar */}
        {showHamburger && (
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="sm:hidden p-2 -ml-2 mr-1 rounded-lg text-ink-700 hover:bg-secondary hover:text-ink-900 transition-colors"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-[22px] w-[22px]" strokeWidth={2.5} /> : <Menu className="h-[22px] w-[22px]" strokeWidth={2.5} />}
          </button>
        )}

        <Link to="/" className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "hsl(var(--social-500))" }}
          >
            <Feather className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-display font-semibold tracking-wide text-ink-900">
            Quill<span style={{ color: "hsl(var(--social-500))" }}>weave</span>
          </span>
        </Link>
      </div>
    </header>
  );
}