import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../profile/header";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

// ── Scroll-triggered fade-in ──────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function FadeIn({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Gold divider ──────────────────────────────────────────────────────────────
function GoldLine({ className = "" }) {
  return <div className={`w-10 h-px bg-[#d4af37] ${className}`} />;
}

// ── Writer avatar ─────────────────────────────────────────────────────────────
function WriterAvatar({ writer, delay }) {
  const [ref, inView] = useInView(0.1);
  const initials = (writer.username || "").slice(0, 2).toUpperCase();
  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-2"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) scale(1)" : "translateY(16px) scale(0.9)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {writer.avatar ? (
        <img
          src={writer.avatar}
          alt={writer.username}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-soft"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[#2d3748] text-white flex items-center justify-center text-sm font-semibold ring-2 ring-white shadow-soft">
          {initials}
        </div>
      )}
      <span className="text-[11px] text-[#737373]">@{writer.username}</span>
    </div>
  );
}

// ── Who it's for list ─────────────────────────────────────────────────────────
const WHO_ITS_FOR = [
  "struggle to stay consistent",
  "feel lonely in their writing journey",
  "want quiet accountability",
  "want progress without pressure",
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function About() {
  const [writers, setWriters] = useState([]);

  useEffect(() => {
    async function loadWriters() {
      try {
        const res = await fetch(`${API_URL}/users/founding-writers`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.users)) setWriters(data.users);
      } catch (err) {
        console.error("Failed to load writers:", err);
      }
    }
    loadWriters();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <AppMetaTags
        title="About Inkwell — A Place to Write"
        description="Inkwell exists to give writers a place to find their rhythm and feel less alone in their creative journey."
      />
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#fafaf9]">
        {/* Decorative background ink-blot */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center">
          <p
            className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-6"
            style={{ animation: "inkFadeUp 0.8s ease 0.1s both" }}
          >
            About Inkwell
          </p>

          <h1
            className="text-4xl sm:text-5xl md:text-[3.5rem] font-serif text-[#2d3748] leading-[1.2] mb-8"
            style={{ animation: "inkFadeUp 0.9s ease 0.25s both" }}
          >
            Writing is often
            <br />
            <em className="not-italic text-[#4a4a4a]">portrayed as solitary.</em>
          </h1>

          <GoldLine
            className="mx-auto mb-8"
            style={{ animation: "inkFadeUp 0.7s ease 0.4s both" }}
          />

          <div style={{ animation: "inkFadeUp 0.9s ease 0.5s both" }}>
            <p className="text-lg sm:text-xl text-[#4a4a4a] leading-[1.8] max-w-lg mx-auto">
              But many writers don't need pressure.
              <br />
              They need a space where imperfect words
              <br />
              are allowed to exist.
            </p>
            <p className="mt-8 text-2xl sm:text-3xl font-serif text-[#2d3748]">
              Inkwell was created for that space.
            </p>
          </div>
        </div>
      </section>

      {/* ── What Inkwell is ──────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              What it is
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2d3748] leading-snug mb-6">
              A quiet writing environment.
            </h2>
            <p className="text-lg text-[#4a4a4a] leading-[1.8] mb-10">
              Inkwell is where writers show up together, write at their own pace,
              and build consistency without pressure.
            </p>
          </FadeIn>

          <FadeIn delay={150}>
            <blockquote className="border-l-[3px] border-[#d4af37] pl-7 py-2 my-2">
              <p className="text-2xl sm:text-3xl font-serif text-[#2d3748] italic leading-relaxed">
                "No noise. No performance.
                <br />
                Just presence."
              </p>
            </blockquote>
          </FadeIn>

          <FadeIn delay={250}>
            <p className="text-lg text-[#4a4a4a] leading-[1.8] mt-10">
              It's not about writing more.
              <br />
              It's about returning to the page.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Why it exists ────────────────────────────────────────────────── */}
      <section className="bg-[#fafaf9]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              Why it exists
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2d3748] leading-snug mb-8">
              Consistency doesn't come from force.
            </h2>
            <p className="text-lg text-[#4a4a4a] leading-[1.8] mb-6">
              It comes from feeling safe enough to begin again.
            </p>
            <p className="text-lg text-[#4a4a4a] leading-[1.8]">
              So we built a place where writers can write quietly together, track
              progress gently, and rediscover the joy of showing up.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Mission banner ───────────────────────────────────────────────── */}
      <section className="bg-[#2d3748]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24 text-center">
          <FadeIn>
            <GoldLine className="mx-auto mb-10" />
            <p className="text-2xl sm:text-3xl md:text-4xl font-serif text-white leading-[1.6] mb-4">
              To make writing more human
              <br />
              and more joyful
            </p>
            <p className="text-lg text-gray-300 leading-relaxed">
              by bringing writers together in quiet, supportive presence.
            </p>
            <GoldLine className="mx-auto mt-10" />
          </FadeIn>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              Who it's for
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2d3748] leading-snug mb-12">
              Inkwell is for writers who —
            </h2>
          </FadeIn>

          <div className="space-y-6">
            {WHO_ITS_FOR.map((item, i) => (
              <FadeIn key={item} delay={i * 100}>
                <div className="flex items-center gap-5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "#d4af37" }}
                  />
                  <p className="text-lg text-[#4a4a4a]">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Writers already here ─────────────────────────────────────────── */}
      {writers.length > 0 && (
        <section className="bg-[#fafaf9]">
          <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24 text-center">
            <FadeIn>
              <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
                The community
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif text-[#2d3748] mb-3">
                Writers are already here.
              </h2>
              <p className="text-[#737373] mb-12 max-w-sm mx-auto">
                Writing together in quiet sessions,
                building their rhythm.
              </p>
            </FadeIn>

            <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8">
              {writers.map((w, i) => (
                <WriterAvatar key={w.id} writer={w} delay={i * 80} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Write with us (Discord) ───────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24 text-center">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              Write with us
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#2d3748] mb-4">
              You don't have to write alone.
            </h2>
            <p className="text-[#737373] mb-10 max-w-md mx-auto leading-relaxed">
              If you'd like to join occasional group sessions,
              you can find the community here.
            </p>

            <a
              href="https://discord.gg/DYHJK6EP"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-8 py-4 border border-[#2d3748] text-[#2d3748] text-sm font-medium rounded-xl hover:bg-[#2d3748] hover:text-white transition-all duration-300"
            >
              {/* Discord icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Join the community
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <section className="bg-[#2d3748]">
        <div className="max-w-3xl mx-auto px-6 py-28 sm:py-36 text-center">
          <FadeIn>
            <GoldLine className="mx-auto mb-12" />
            <p className="text-4xl sm:text-5xl md:text-[3.25rem] font-serif text-white leading-[1.5]">
              A place to write.
              <br />
              A place to return.
              <br />
              A place to belong.
            </p>
            <GoldLine className="mx-auto mt-12 mb-14" />
            <Link
              to="/signup"
              className="inline-block px-10 py-4 bg-[#d4af37] text-[#2d3748] text-sm font-semibold rounded-xl hover:opacity-90 transition-all duration-200 shadow-soft"
            >
              Start Writing Today
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#2d3748] border-t border-white/10 py-6 text-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Inkwell. Made with care for writers.
        </p>
      </footer>

      <style>{`
        @keyframes inkFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
