// src/components/dashboard/footer.jsx
//
// Slim brand strip at the very bottom of the app shell, mirroring TopBar's
// role at the top — just the tagline, no links or nav (that's what the
// sidebar and top bar are for). Hidden automatically by Layout whenever a
// page's focus mode is on, same as the sidebar.

export function Footer() {
    return (
      <footer className="flex-shrink-0 bg-card border-t border-border">
        <div className="flex items-center justify-center h-8 px-4">
          <p
            className="text-[11px] font-display font-medium tracking-wide"
            style={{ color: "hsl(var(--social-500))" }}
          >
            First, Make It Exist
          </p>
        </div>
      </footer>
    );
  }