import { useEffect, useState } from "react";

// Quotes about starting — a first draft existing at all, before it's good.
// Kept short and separate from the editor's own "first draft" placeholder
// so the two never repeat the same line back to back.
const QUOTES = [
  { line: "The first draft is just you telling yourself the story.", author: "Terry Pratchett" },
  { line: "A writer only begins a book. A reader finishes it.", author: "Samuel Johnson" },
  { line: "Every writer I know has trouble writing.", author: "Joseph Heller" },
  { line: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { line: "You can't edit a blank page.", author: "Jodi Picoult" },
  { line: "The first draft of anything is suspect unless one is a genius.", author: "Bernard Malamud" },
];

const ROTATE_MS = 6500;

function QuoteCarousel({ className = "", quoteClassName = "text-lg", compact = false }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % QUOTES.length);
        setVisible(true);
      }, 400);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  const quote = QUOTES[index];

  return (
    <div
      className={`transition-opacity duration-400 ease-in-out ${visible ? "opacity-100" : "opacity-0"} ${className}`}
      aria-live="polite"
    >
      <p
        className={`font-serif italic text-foreground/90 ${quoteClassName}`}
        style={{ fontFamily: "var(--font-paper-serif)" }}
      >
        "{quote.line}"
      </p>
      <p className={`mt-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
        — {quote.author}
      </p>
    </div>
  );
}

// Wraps every auth screen (signup, login, forgot/reset password) in the
// same split layout: form on the left, brand + rotating quote on the right.
// Only the form card itself is passed in as children — header copy included,
// since that differs per page.
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Wordmark — top-left of the whole page, every screen size */}
      <div className="px-6 pt-6 lg:absolute lg:top-8 lg:left-10 lg:p-0">
        <span
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-card-display)" }}
        >
          Quillweave
        </span>
      </div>

      {/* Left — the form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Right — brand panel, desktop only */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-card border-l border-border">
        {/* Soft ambient glow — sky (writing) and gold (the reward of finishing) */}
        <div
          className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-25"
          style={{ background: "hsl(var(--sky-500))" }}
        />
        <div
          className="absolute bottom-[-140px] left-[-100px] w-[380px] h-[380px] rounded-full blur-3xl opacity-15"
          style={{ background: "hsl(var(--gold-500))" }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full w-full px-14 py-16">
          <div />

          <div className="max-w-md">
            <h1
              className="text-5xl leading-[1.1] text-foreground mb-4"
              style={{ fontFamily: "var(--font-card-display)" }}
            >
              First, Make It Exist.
            </h1>
            <p className="text-muted-foreground text-lg">
              Write it messy. Let the story exist first.
            </p>
          </div>

          <QuoteCarousel />
        </div>
      </div>
    </div>
  );
}