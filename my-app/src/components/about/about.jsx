// src/components/about/about.jsx
//
// Landing/about page. One tagline, one job: get a writer into their
// workspace — and for a visitor who isn't signed in yet, show them
// enough of the real product to want to. Every demo here reuses the
// actual tokens/shapes/copy the live features use (CARD_THEME +
// CARD_COPY for Mailbox, the same ring/pace-chart math as
// draftPlanPage.jsx, the same brag-card layout as logProgressModal.jsx)
// so nothing shown here can drift out of sync with what's real.
//
// Auth-aware: useAuth() decides every CTA on the page. Signed in →
// straight to the workspace/mailbox/draft plan. Signed out → every one
// of those same buttons routes to /login instead, so a visitor never
// hits a dead end, they hit an invitation.
//
// Layout: each feature section is a two-column row (copy one side, the
// live demo the other, alternating sides) that stacks to a single
// column on mobile. Sections fade/slide in the first time they enter
// the viewport (see <Reveal> below) instead of firing once on mount —
// that also drives each demo's own reveal animation (rings, progress
// bars), so nothing animates while it's still off-screen.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine, Mail, LogIn, Sparkles, Flower2, Rocket, PartyPopper, Star, Heart, Cake, Check } from "lucide-react";
import { AppMetaTags } from "../utilis/metatags";
import { useAuth } from "../auth/authContext";
import { CARD_THEME, CARD_TYPES } from "../mailbox/mailboxCardTheme";
import FoundingWritersCarousel from "../foundingWriters/foundingWritersCarousel";

const CARD_ICONS = { Flower2, Rocket, PartyPopper, Star, Heart, Cake };

// Same title/tagline pairs as mailboxpage.jsx's CARD_COPY (kept as its
// own local copy there too, deliberately — see that file's comment).
const CARD_COPY = {
  WELCOME: { title: "Welcome!", tagline: "We're so glad you're here." },
  CONGRATS: { title: "Congratulations!", tagline: "You've done something worth celebrating." },
  WELL_DONE: { title: "Well Done!", tagline: "Every effort you make matters." },
  THANK_YOU: { title: "Thank You!", tagline: "Your kindness means more than words." },
  BOOSTER: { title: "You've Got This!", tagline: "A little energy for the story ahead." },
  BIRTHDAY: { title: "Happy Birthday!", tagline: "Hope your day is as good as your next chapter." },
};

// Same three rings/tones as RingCard in draftPlanPage.jsx.
const RING_DEMO = [
  { tone: "social", label: "Story progress", value: 62 },
  { tone: "achievement", label: "Weekly target", value: 85 },
  { tone: "highlight", label: "Today's goal", value: 58 },
];

const TILT = [-3, 2, -2, 3, -2.5, 2.5];
const TILE_WORDS = ["ember", "hollow", "reckon"];

// ── demo pace data ──────────────────────────────────────────────────────
//
// A visitor has no real progressLogs, so this is a deterministic (not
// random — identical on every render/reload) stand-in with a gentle
// upward trend, shaped the same way buildDailySeries returns:
// { key, label, count }.
function generateDemoSeries(days) {
  const today = new Date();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const idx = days - 1 - i;
    const wave = Math.sin(idx / 2.1) * 140;
    const trend = (idx / days) * 420;
    const count = Math.max(180, Math.round(320 + trend + wave));
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count,
    });
  }
  return out;
}

const PACE_DEMO = { "7": generateDemoSeries(7), "15": generateDemoSeries(15), "30": generateDemoSeries(30) };

function niceCeiling(value) {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  let niceResidual;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 5) niceResidual = 5;
  else niceResidual = 10;
  return niceResidual * magnitude;
}

// Monotone cubic Hermite tangents — same technique draftPlanPage.jsx's
// pace chart uses so a peak's visual tip always sits exactly at a real
// data point, never overshooting between two days.
function monotoneTangents(xs, ys) {
  const n = xs.length;
  const m = new Array(n).fill(0);
  if (n < 2) return m;
  const d = [];
  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1] - xs[i];
    d.push(h !== 0 ? (ys[i + 1] - ys[i]) / h : 0);
  }
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = (d[i - 1] === 0 || d[i] === 0 || (d[i - 1] > 0) !== (d[i] > 0)) ? 0 : (d[i - 1] + d[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const alpha = m[i] / d[i];
    const beta = m[i + 1] / d[i];
    const s = alpha * alpha + beta * beta;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * alpha * d[i];
      m[i + 1] = tau * beta * d[i];
    }
  }
  return m;
}

function smoothPath(points) {
  if (points.length < 2) return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : "";
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const m = monotoneTangents(xs, ys);
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    const cp1x = xs[i] + dx / 3;
    const cp1y = ys[i] + (m[i] * dx) / 3;
    const cp2x = xs[i + 1] - dx / 3;
    const cp2y = ys[i + 1] - (m[i + 1] * dx) / 3;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  return d;
}

export default function About() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const signedIn = Boolean(user);

  const [period, setPeriod] = useState("7");
  const [hoverIdx, setHoverIdx] = useState(null);
  const [activeType, setActiveType] = useState("WELCOME");

  const goWorkspace = () => navigate(signedIn ? "/workspace" : "/login");
  const goMailbox = () => navigate(signedIn ? "/mailbox" : "/login");
  const goLogSession = () => navigate(signedIn ? "/draftplan" : "/login");
  const goSignup = () => navigate("/signup");

  // ── pace chart geometry (same layout constants as WritingPace) ──────
  const width = 640, height = 200;
  const padding = { top: 16, right: 12, bottom: 26, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const series = PACE_DEMO[period];
  const rawMax = Math.max(...series.map((d) => d.count), 1);
  const axisMax = niceCeiling(rawMax);
  const yTicks = [0, 0.5, 1].map((f) => Math.round(axisMax * f));
  const points = useMemo(
    () => series.map((d, i) => ({
      ...d,
      x: padding.left + (i / (series.length - 1)) * innerW,
      y: padding.top + innerH - (d.count / axisMax) * innerH,
    })),
    [series, axisMax, innerW, innerH]
  );
  const linePath = smoothPath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`
    : "";
  const labelEvery = points.length <= 8 ? 1 : Math.ceil(points.length / 6);
  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  function handlePaceMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0, closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setHoverIdx(closest);
  }

  const activeTheme = CARD_THEME[activeType];
  const activeCopy = CARD_COPY[activeType];
  const ActiveIcon = CARD_ICONS[activeTheme.icon];

  return (
    <div className="bg-background overflow-x-hidden">
      <AppMetaTags
        title="QuillWeave"
        description="First, make it exist. A home for writers with more ideas than finished drafts."
      />

      <style>{`
        @keyframes qw-rise {
          from { opacity: 0; transform: translateY(16px) rotate(var(--tilt, 0deg)); }
          to   { opacity: 1; transform: translateY(0) rotate(var(--tilt, 0deg)); }
        }
        .qw-card {
          transform: rotate(var(--tilt, 0deg));
          transition: transform 200ms ease-out, box-shadow 200ms ease-out;
          cursor: pointer;
        }
        .qw-card.qw-in {
          animation: qw-rise 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: var(--delay, 0ms);
        }
        .qw-card:hover, .qw-card.qw-active {
          transform: translateY(-5px) rotate(0deg);
          box-shadow: 0 14px 28px -12px rgba(0,0,0,0.55);
        }
        @keyframes qw-pop {
          0% { opacity: 0; transform: scale(0.94) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .qw-pop { animation: qw-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }

        .qw-section {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 650ms cubic-bezier(0.22, 1, 0.36, 1), transform 650ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .qw-section.qw-section-in { opacity: 1; transform: translateY(0); }

        @keyframes qw-shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .qw-headline {
          background: linear-gradient(
            90deg,
            hsl(var(--ink-900)) 0%,
            hsl(var(--ink-900)) 35%,
            hsl(var(--social-500)) 50%,
            hsl(var(--ink-900)) 65%,
            hsl(var(--ink-900)) 100%
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: qw-shimmer 5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .qw-card.qw-in, .qw-pop { animation: none; }
          .qw-card { transition: none; }
          .qw-section { opacity: 1; transform: none; transition: none; }
          .qw-headline { animation: none; background-position: 50% 50%; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 pb-20">

        {/* ── hero ─────────────────────────────────────────────────────── */}
        <Reveal className="max-w-2xl mx-auto text-center mb-24 md:mb-32">
          <h1 className="qw-headline font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight mb-4">
            First, Make It Exist.
          </h1>

          <p className="text-ink-500 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
            Log the words as they come and let other writers cheer you on. Nothing here waits for perfect.
          </p>

          {signedIn ? (
            <button
              onClick={goWorkspace}
              className="px-8 py-3 rounded-xl font-semibold text-white text-[15px] hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "hsl(var(--social-500))" }}
            >
              Go to your workspace →
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3 rounded-xl font-semibold text-white text-[15px] hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ backgroundColor: "hsl(var(--social-500))" }}
              >
                <LogIn className="h-4 w-4" /> Log in to get started
              </button>
              <button onClick={goSignup} className="text-xs text-ink-500 hover:text-ink-700 underline underline-offset-4">
                New here? Create your account
              </button>
            </div>
          )}
        </Reveal>

        {/* ── draft plan: pace graph + rings ──────────────────────────── */}
        <Reveal className="mb-24 md:mb-32">
          {(inView) => (
            <div className="grid md:grid-cols-[minmax(0,300px)_1fr] gap-8 md:gap-16 items-center">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <PenLine className="h-4 w-4" style={{ color: "hsl(var(--social-500))" }} />
                  <p className="text-ink-700 font-medium">Draft Plan</p>
                </div>
                <p className="font-display text-2xl text-ink-900 mb-3">
                  Watch the line move instead of wondering where you stand.
                </p>
                <p className="text-ink-500 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                  Every session you log fills these in — story progress, this week's
                  target, today's goal.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Writing activity</p>
                    <p className="font-display text-lg text-ink-900">A writer's pace</p>
                  </div>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {["7", "15", "30"].map((p) => (
                      <button
                        key={p}
                        onClick={() => { setPeriod(p); setHoverIdx(null); }}
                        className="px-3 py-1.5 text-xs font-semibold transition-colors"
                        style={
                          period === p
                            ? { background: "hsl(var(--social-100))", color: "hsl(var(--social-700))" }
                            : { color: "hsl(var(--ink-500))" }
                        }
                      >
                        {p}d
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    className="w-full h-44"
                    onMouseMove={handlePaceMove}
                    onMouseLeave={() => setHoverIdx(null)}
                  >
                    <defs>
                      <linearGradient id="about-pace-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--social-500))" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="hsl(var(--social-500))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {yTicks.map((t) => {
                      const y = padding.top + innerH - (t / axisMax) * innerH;
                      return (
                        <g key={t}>
                          <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="hsl(var(--paper-border))" strokeDasharray="3 4" />
                          <text x={padding.left - 10} y={y} textAnchor="end" dominantBaseline="middle" style={{ fontSize: "10px", fill: "hsl(var(--ink-500))" }}>{t}</text>
                        </g>
                      );
                    })}
                    <path d={areaPath} fill="url(#about-pace-fill)" stroke="none" />
                    <path d={linePath} fill="none" stroke="hsl(var(--social-500))" strokeWidth="2.5" />
                    {hovered && (
                      <>
                        <line x1={hovered.x} x2={hovered.x} y1={padding.top} y2={padding.top + innerH} stroke="hsl(var(--ink-200))" />
                        <circle cx={hovered.x} cy={hovered.y} r="4.5" fill="hsl(var(--social-500))" stroke="white" strokeWidth="2" />
                      </>
                    )}
                    {points.map((p, i) => (
                      (i % labelEvery === 0 || i === points.length - 1) && (
                        <text key={p.key} x={p.x} y={height - 6} textAnchor="middle" style={{ fontSize: "10px", fill: "hsl(var(--ink-500))" }}>{p.label}</text>
                      )
                    ))}
                  </svg>

                  {hovered && (
                    <div
                      className="absolute pointer-events-none bg-card border border-paper-border rounded-lg shadow-md px-3 py-2 whitespace-nowrap"
                      style={{
                        left: `${(hovered.x / width) * 100}%`,
                        top: `${(hovered.y / height) * 100}%`,
                        transform: `translate(${hovered.x / width > 0.85 ? "-100%" : hovered.x / width < 0.15 ? "0%" : "-50%"}, ${hovered.y / height < 0.3 ? "16px" : "-125%"})`,
                      }}
                    >
                      <p className="text-xs text-ink-500">{hovered.label}</p>
                      <p className="text-sm font-semibold text-ink-900">{hovered.count.toLocaleString()} words</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-6 pt-6 border-t border-border">
                  {RING_DEMO.map((ring, i) => (
                    <DemoRing key={ring.label} {...ring} active={inView} delay={350 + i * 180} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </Reveal>

        {/* ── mailbox: real greeting-card preview ─────────────────────── */}
        <Reveal className="mb-24 md:mb-32">
          {(inView) => (
            <div className="grid md:grid-cols-[1fr_minmax(0,300px)] gap-8 md:gap-16 items-center">
              <div className="order-2 md:order-1">
                <div className="flex flex-wrap justify-center gap-2.5 mb-8">
                  {CARD_TYPES.map((type, i) => {
                    const theme = CARD_THEME[type];
                    const Icon = CARD_ICONS[theme.icon];
                    const active = type === activeType;
                    return (
                      <button
                        key={type}
                        onClick={() => setActiveType(type)}
                        className={`qw-card rounded-xl border p-3.5 flex flex-col items-center gap-1.5 min-w-[84px] ${inView ? "qw-in" : "opacity-0"} ${active ? "qw-active" : ""}`}
                        style={{
                          "--tilt": `${TILT[i % TILT.length]}deg`,
                          "--delay": `${i * 90}ms`,
                          backgroundColor: theme.bg,
                          borderColor: active ? theme.solid : theme.border,
                          borderWidth: active ? "2px" : "1px",
                        }}
                      >
                        <Icon className="h-4 w-4" style={{ color: theme.text }} />
                        <span className="text-xs font-semibold" style={{ color: theme.text }}>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <div key={activeType} className="qw-pop paper-card paper-card-fold w-full max-w-sm rounded-2xl overflow-hidden">
                    <div className="relative h-24 overflow-hidden" style={{ background: activeTheme.bg }}>
                      <CardDecoration type={activeType} color={activeTheme.solid} />
                      <div className="relative h-full flex items-center justify-center">
                        <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: activeTheme.solid }}>
                          <ActiveIcon className="h-7 w-7 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="p-6 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: `color-mix(in srgb, ${activeTheme.solid} 75%, black)` }}>
                        {activeTheme.label}
                      </p>
                      <p className="text-2xl font-semibold mb-1" style={{ fontFamily: "var(--font-card-display)", color: `color-mix(in srgb, ${activeTheme.solid} 75%, black)` }}>
                        {activeCopy.title}
                      </p>
                      <p className="text-sm italic mb-5" style={{ fontFamily: "var(--font-paper-serif)", color: "rgba(35,28,22,0.55)" }}>
                        {activeCopy.tagline}
                      </p>
                      <p className="text-sm italic leading-relaxed" style={{ fontFamily: "var(--font-paper-serif)", color: `color-mix(in srgb, ${activeTheme.solid} 55%, black)` }}>
                        {activeTheme.placeholder}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 md:order-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Mail className="h-4 w-4" style={{ color: "hsl(var(--social-500))" }} />
                  <p className="text-ink-700 font-medium">Mailbox</p>
                </div>
                <p className="font-display text-2xl text-ink-900 mb-3">
                  Send a card when someone needs one.
                </p>
                <p className="text-ink-500 text-sm leading-relaxed max-w-sm mx-auto md:mx-0 mb-6">
                  A boost before they start, a well done after a hard session, a thank
                  you for showing up. Tap a card to open it.
                </p>
                <button
                  onClick={goMailbox}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
                >
                  {signedIn ? "Open your mailbox" : "Log in to send one"}
                </button>
              </div>
            </div>
          )}
        </Reveal>

        {/* ── founding writers ─────────────────────────────────────────── */}
        <Reveal className="mb-24 md:mb-32">
          <div className="text-center max-w-lg mx-auto mb-8">
            <p className="font-display text-2xl text-ink-900 mb-2">Meet the Founding Writers</p>
            <p className="text-ink-500 text-sm leading-relaxed">
              The first writers who showed up before there was any proof this
              would work. Follow one to see their story unfold.
            </p>
          </div>
          <FoundingWritersCarousel variant="about" />
        </Reveal>

        {/* ── brag card ────────────────────────────────────────────────── */}
        <Reveal className="mb-20">
          {(inView) => (
            <div className="grid md:grid-cols-[minmax(0,280px)_1fr] gap-8 md:gap-16 items-center">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--highlight-500))" }} />
                  <p className="text-ink-700 font-medium">Brag a little</p>
                </div>
                <p className="font-display text-2xl text-ink-900 mb-3">Proof, not just a vibe.</p>
                <p className="text-ink-500 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                  Hit today's goal and QuillWeave hands you a card for it — you're
                  one of the writers actually showing up.
                </p>
              </div>

              <div className="max-w-md w-full mx-auto md:mx-0">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="rounded-xl p-4" style={{ background: "hsl(var(--paper-muted))" }}>
                    <p className="text-sm text-ink-700 mb-3">The Last Ember — Chapter Seven</p>

                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--highlight-700))" }}>
                      Today's goal
                    </p>
                    <div className="flex items-center gap-4">
                      <DemoRing tone="highlight" label="" value={100} active={inView} delay={300} size={64} />
                      <div>
                        <p className="text-lg font-display font-semibold text-ink-900">920 / 800 words</p>
                        <p className="text-xs flex items-center gap-1" style={{ color: "hsl(var(--success-700))" }}>
                          <Check className="h-3 w-3" /> Goal hit, with 120 to spare
                        </p>
                      </div>
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-1.5" style={{ color: "hsl(var(--achievement-700))" }}>
                      Weekly target
                    </p>
                    <div className="h-2 rounded-full bg-paper-border overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: inView ? "78%" : "0%", backgroundColor: "hsl(var(--achievement-500))", transition: "width 900ms cubic-bezier(0.22, 1, 0.36, 1) 500ms" }} />
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: "hsl(var(--quest-700))" }}>
                      Words discovered today
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TILE_WORDS.map((w) => (
                        <span key={w} className="font-display font-semibold text-sm rounded-lg px-3 py-1.5" style={{ background: "hsl(var(--quest-100))", color: "hsl(var(--quest-700))" }}>
                          {w}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-ink-500 text-center mt-4">#MakeItExist · via QuillWeave</p>
                  </div>

                  <button
                    onClick={goLogSession}
                    className="w-full mt-4 px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: "hsl(var(--highlight-500))", color: "white" }}
                  >
                    <Sparkles className="h-4 w-4" /> {signedIn ? "Log today's session" : "Log in to start your own"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Reveal>

        {/* ── final CTA ────────────────────────────────────────────────── */}
        <Reveal className="text-center">
          {signedIn ? (
            <button
              onClick={goWorkspace}
              className="px-8 py-3 rounded-xl font-semibold text-white text-[15px] hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "hsl(var(--social-500))" }}
            >
              Go to your workspace →
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-3 rounded-xl font-semibold text-white text-[15px] hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
              style={{ backgroundColor: "hsl(var(--social-500))" }}
            >
              <LogIn className="h-4 w-4" /> Log in to get started
            </button>
          )}
        </Reveal>
      </div>
    </div>
  );
}

// ── scroll reveal wrapper ────────────────────────────────────────────────
// Fades/slides each section in the first time it enters the viewport, then
// disconnects (no re-triggering on scroll back up/down). Accepts either
// plain children or a render-prop function that receives `inView`, so a
// section can drive its own demo animation (rings, progress bars) off the
// same trigger instead of a single global mount-timer.
function Reveal({ children, className = "" }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`qw-section ${inView ? "qw-section-in" : ""} ${className}`}>
      {typeof children === "function" ? children(inView) : children}
    </div>
  );
}

// ── demo ring ────────────────────────────────────────────────────────────
//
// Same geometry/transition as RingCard in draftPlanPage.jsx — held at
// zero until `active` flips true, so the fill-in reads as part of the
// page's one entrance beat rather than firing off-screen.
function DemoRing({ tone, label, value, active, delay, size = 68 }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setFilled(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);

  const r = size * 0.44;
  const c = 2 * Math.PI * r;
  const shown = filled ? value : 0;
  const offset = c - (shown / 100) * c;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle cx={center} cy={center} r={r} fill="none" stroke={`hsl(var(--${tone}-100))`} strokeWidth="6" />
          <circle
            cx={center} cy={center} r={r} fill="none"
            stroke={`hsl(var(--${tone}-500))`} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </g>
        <text x={center} y={center} textAnchor="middle" dominantBaseline="central" className="font-display font-semibold" style={{ fill: `hsl(var(--${tone}-700))`, fontSize: "13px" }}>
          {shown}%
        </text>
      </svg>
      {label && <span className="text-[11px] text-ink-500 text-center leading-tight">{label}</span>}
    </div>
  );
}

// ── card decoration ──────────────────────────────────────────────────────
//
// Verbatim from mailboxpage.jsx's CardDecoration — one motif per card
// type, drawn with the card's own theme color, pure vector. Kept in sync
// with that file by hand; if CARD_THEME ever grows a new type, add its
// case in both places.
function CardDecoration({ type, color }) {
  switch (type) {
    case "WELCOME":
      return (
        <svg viewBox="0 0 400 96" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M0,74 Q50,60 100,74 T200,74 T300,74 T400,74" fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="1.5" />
          {[36, 108, 180, 252, 320, 372].map((x, i) => (
            <g key={i} transform={`translate(${x},${26 + (i % 2) * 10})`}>
              <g fill={color} fillOpacity="0.85">
                <circle cx="0" cy="-7" r="6" />
                <circle cx="7" cy="0" r="6" />
                <circle cx="0" cy="7" r="6" />
                <circle cx="-7" cy="0" r="6" />
              </g>
              <circle cx="0" cy="0" r="3.5" fill="white" fillOpacity="0.9" />
            </g>
          ))}
        </svg>
      );
    case "CONGRATS":
      return (
        <svg viewBox="0 0 400 96" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M0,22 Q100,6 200,22 T400,22" fill="none" stroke={color} strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="2 6" />
          {[[30, 30, 10], [92, 55, 7], [152, 24, 13], [222, 50, 8], [284, 22, 11], [344, 48, 9]].map(([x, y, s], i) => (
            <path key={i} transform={`translate(${x},${y})`} fill={color} fillOpacity={i % 2 ? 0.55 : 0.9} d={starPath(s)} />
          ))}
          {[[60, 66], [190, 60], [258, 34], [366, 60]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill={color} fillOpacity="0.5" />
          ))}
        </svg>
      );
    case "WELL_DONE":
      return (
        <svg viewBox="0 0 400 96" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M10,22 L390,22" stroke={color} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="1 8" strokeLinecap="round" />
          {[50, 130, 210, 290, 360].map((x, i) => (
            <g key={i} transform={`translate(${x},22)`}>
              <line x1="0" y1="0" x2="0" y2={14 + (i % 2) * 8} stroke={color} strokeOpacity="0.35" strokeWidth="1" />
              <path transform={`translate(0,${20 + (i % 2) * 8})`} fill={color} fillOpacity="0.9" d={starPath(9)} />
            </g>
          ))}
        </svg>
      );
    case "THANK_YOU":
      return (
        <svg viewBox="0 0 400 96" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M10,20 L390,20" stroke={color} strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
          {[45, 122, 200, 280, 355].map((x, i) => (
            <g key={i} transform={`translate(${x},20)`}>
              <line x1="0" y1="0" x2="0" y2={10 + (i % 2) * 6} stroke={color} strokeOpacity="0.35" strokeWidth="1" />
              <path
                transform={`translate(-7,${14 + (i % 2) * 6}) scale(0.9)`}
                fill={color}
                fillOpacity="0.9"
                d="M7,13 C2,9 0,6 0,3.5 C0,1.5 1.5,0 3.5,0 C5,0 6.2,0.8 7,2 C7.8,0.8 9,0 10.5,0 C12.5,0 14,1.5 14,3.5 C14,6 12,9 7,13 Z"
              />
            </g>
          ))}
        </svg>
      );
    case "BOOSTER":
      return (
        <svg viewBox="0 0 400 96" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {[[0, 70, 90, 40], [40, 90, 150, 55], [90, 30, 170, 5], [220, 85, 320, 45], [270, 20, 380, -10]].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeOpacity={0.2 + (i % 2) * 0.15} strokeWidth="3" strokeLinecap="round" />
          ))}
          {[[130, 62, 7], [230, 22, 9], [330, 60, 6]].map(([x, y, s], i) => (
            <path
              key={i}
              transform={`translate(${x},${y})`}
              fill={color}
              fillOpacity="0.85"
              d={`M0,-${s} Q${s * 0.3},-${s * 0.3} ${s},0 Q${s * 0.3},${s * 0.3} 0,${s} Q-${s * 0.3},${s * 0.3} -${s},0 Q-${s * 0.3},-${s * 0.3} 0,-${s} Z`}
            />
          ))}
        </svg>
      );
    case "BIRTHDAY":
      return (
        <svg viewBox="0 0 400 96" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {[[24, 20], [70, 55], [118, 15], [168, 60], [216, 24], [262, 58], [310, 18], [360, 52], [46, 40], [285, 38]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4 : 2.5} fill={color} fillOpacity={i % 2 ? 0.5 : 0.85} />
          ))}
          {[150, 250].map((x, i) => (
            <g key={i} transform={`translate(${x},34)`}>
              <rect x="-3" y="0" width="6" height="20" rx="1.5" fill={color} fillOpacity="0.85" />
              <path d="M0,-10 C4,-6 4,-1 0,2 C-4,-1 -4,-6 0,-10 Z" fill={color} fillOpacity="0.6" />
            </g>
          ))}
        </svg>
      );
    default:
      return null;
  }
}

// Ten-point star path centered on (0,0), outer radius r — same as
// mailboxpage.jsx's starPath, used by CardDecoration above.
function starPath(r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${pts.join(" L")}Z`;
}