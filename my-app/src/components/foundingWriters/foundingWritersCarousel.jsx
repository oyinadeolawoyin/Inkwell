// src/components/foundingWriters/foundingWritersCarousel.jsx
//
// Shared between the About page (public — tapping Follow while signed
// out just routes a guest to /login, same as every other CTA on that
// page) and the Workspace dashboard (signed in — Follow actually calls
// the API and flips instantly).
//
// A real sliding carousel (transform: translateX on a measured track),
// not a scroll container — no visible scrollbar, arrow buttons always
// on, and it auto-advances on its own. Basic touch-swipe is wired in too
// since removing the native scroll also removes the free mobile gesture.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, UserPlus, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "../auth/authContext";
import { getFoundingWriters, followWriter, unfollowWriter } from "./foundingWritersApi";

const GAP_PX = 16; // matches the track's gap-4
const AUTOPLAY_MS = 4500;
const SWIPE_THRESHOLD_PX = 40;

export default function FoundingWritersCarousel({ variant = "workspace" }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const viewportRef = useRef(null);
  const firstCardRef = useRef(null);
  const touchStartX = useRef(null);

  const [writers, setWriters] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(() => new Set());

  const [index, setIndex] = useState(0);
  const [cardStep, setCardStep] = useState(0); // card width + gap, in px
  const [visibleCount, setVisibleCount] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    getFoundingWriters().then(setWriters).catch((err) => setError(err.message));
  }, []);

  // Re-measure the card width and how many fit in the viewport whenever
  // either one changes size (a card is a fixed width, but that width
  // itself changes at the sm: breakpoint).
  useLayoutEffect(() => {
    if (!writers || writers.length === 0) return;
    const viewport = viewportRef.current;
    const card = firstCardRef.current;
    if (!viewport || !card) return;

    function measure() {
      const step = card.offsetWidth + GAP_PX;
      setCardStep(step);
      setVisibleCount(Math.max(1, Math.floor((viewport.offsetWidth + GAP_PX) / step)));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(card);
    return () => ro.disconnect();
  }, [writers]);

  const maxIndex = writers ? Math.max(0, writers.length - visibleCount) : 0;
  const canScroll = writers && writers.length > visibleCount;

  // Clamp if a resize shrinks maxIndex below the current index.
  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [maxIndex, index]);

  function next() {
    setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }
  function prev() {
    setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }

  // Auto-advance — pauses on hover/focus and while there's nothing to scroll.
  useEffect(() => {
    if (!canScroll || paused) return;
    const t = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [canScroll, paused, maxIndex]);

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD_PX) prev();
    else if (delta < -SWIPE_THRESHOLD_PX) next();
    touchStartX.current = null;
  }

  function toggleFollow(writer) {
    if (!user) {
      navigate("/login");
      return;
    }
    setPending((p) => new Set(p).add(writer.id));
    const action = writer.isFollowing ? unfollowWriter : followWriter;
    action(writer.id)
      .then(() => {
        setWriters((prev) =>
          prev.map((w) => (w.id === writer.id ? { ...w, isFollowing: !w.isFollowing } : w))
        );
      })
      .catch(() => {})
      .finally(() =>
        setPending((p) => {
          const next = new Set(p);
          next.delete(writer.id);
          return next;
        })
      );
  }

  // This is a supporting section on both pages, never the reason either
  // page should show an error — fail quiet.
  if (error || (writers && writers.length === 0)) return null;

  const isAbout = variant === "about";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <style>{`
        @keyframes fw-rise {
          from { opacity: 0; transform: translateY(14px) rotate(var(--tilt, 0deg)); }
          to   { opacity: 1; transform: translateY(0) rotate(var(--tilt, 0deg)); }
        }
        .fw-card {
          transform: rotate(var(--tilt, 0deg));
          transition: transform 200ms ease-out, box-shadow 200ms ease-out;
          animation: fw-rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: var(--delay, 0ms);
        }
        .fw-card:hover { transform: translateY(-4px) rotate(0deg); box-shadow: 0 12px 24px -10px rgba(0,0,0,0.45); }
        @media (prefers-reduced-motion: reduce) {
          .fw-card { animation: none; transition: none; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--achievement-500))" }} />
          <p className={isAbout ? "font-display text-xl text-ink-900" : "font-display text-lg text-ink-900"}>
            Founding Writers
          </p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: "hsl(var(--achievement-100))", color: "hsl(var(--achievement-700))" }}
          >
            Here from day one
          </span>
        </div>

        {canScroll && (
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={prev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={next}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!writers ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div
          ref={viewportRef}
          className="overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex gap-4"
            style={{
              transform: `translateX(-${index * cardStep}px)`,
              transition: "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {writers.map((w, i) => (
              <Card
                key={w.id}
                ref={i === 0 ? firstCardRef : undefined}
                className="fw-card shrink-0 w-[200px] sm:w-[225px]"
                style={{ "--delay": `${i * 70}ms`, "--tilt": `${(i % 2 === 0 ? -1 : 1) * 1.25}deg` }}
              >
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <FounderAvatar name={w.username} src={w.avatar} />
                  <div className="min-w-0 w-full">
                    <p className="font-display text-base text-ink-900 truncate">
                      {w.username}
                      {w.isCurrentUser && <span className="text-ink-500 font-normal"> (you)</span>}
                    </p>
                    {w.bio && <p className="text-xs text-ink-500 line-clamp-2 mt-1">{w.bio}</p>}
                  </div>
                  {!w.isCurrentUser && (
                    <Button
                      size="sm"
                      variant={w.isFollowing ? "outline" : "default"}
                      className="rounded-full w-full mt-1"
                      disabled={pending.has(w.id)}
                      onClick={() => toggleFollow(w)}
                    >
                      {w.isFollowing ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" /> Follow
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FounderAvatar({ name, src }) {
  if (src) return <img src={src} alt={name} className="h-14 w-14 rounded-full object-cover" />;
  const initials = (name || "?").slice(0, 2).toUpperCase();
  return (
    <div
      className="h-14 w-14 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
      style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
    >
      {initials}
    </div>
  );
}