// src/components/mailbox/mailboxpage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, X, ChevronLeft, Flower2, PartyPopper, Star, Heart, Rocket, Cake, Send, Check, Inbox as InboxIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth/authContext";
import { getReceivedCards, getSentCards, markCardRead } from "./mailboxApi";
import { CARD_THEME, CARD_TYPES } from "./mailboxCardTheme";
import SendCardModal from "./sendCardModal";
import ClickableUsername from "../profile/clickableusername";

const ICONS = { Flower2, PartyPopper, Star, Heart, Rocket, Cake };

// Card title + tagline shown inside the greeting card modal. Kept separate
// from CARD_THEME.label/placeholder since those serve the inbox pill and
// the compose textarea — these two are specific to the "opened card" view.
const CARD_COPY = {
  WELCOME: { title: "Welcome!", tagline: "We're so glad you're here." },
  CONGRATS: { title: "Congratulations!", tagline: "You've done something worth celebrating." },
  WELL_DONE: { title: "Well Done!", tagline: "Every effort you make matters." },
  THANK_YOU: { title: "Thank You!", tagline: "Your kindness means more than words." },
  BOOSTER: { title: "You've Got This!", tagline: "A little energy for the story ahead." },
  BIRTHDAY: { title: "Happy Birthday!", tagline: "Hope your day is as good as your next chapter." },
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// The inbox list shows a bold "subject" line above the muted preview line.
// Cards only store one `note` field, so this derives a subject from it
// (first sentence) rather than inventing new copy — falls back to the
// whole note when there's no clean sentence break.
function subjectFor(note) {
  if (!note) return "";
  const match = note.match(/^.{8,90}?[.!?](?:\s|$)/);
  return match ? match[0].trim() : note.length > 70 ? note.slice(0, 70).trim() + "…" : note;
}

// Has the current user already replied to this specific received card? A
// "reply" is any card sent to the same sender at or after this card's
// arrival — sourced from the real Sent list, not local component state,
// so "Send one back" doesn't lie after a reload.
function hasRepliedTo(card, sentCards) {
  if (!card || !sentCards) return false;
  const cardTime = new Date(card.createdAt).getTime();
  return sentCards.some(
    (c) => c.recipient?.id === card.sender?.id && new Date(c.createdAt).getTime() >= cardTime
  );
}

export default function MailboxPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [view, setView] = useState(searchParams.get("view") === "sent" ? "sent" : "received"); // "received" | "sent"
  const [filter, setFilter] = useState(null); // null = all
  const [received, setReceived] = useState(null);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [openCard, setOpenCard] = useState(null);
  const [composeFor, setComposeFor] = useState(null); // { recipientId, recipientName } | null

  useEffect(() => {
    getReceivedCards().then(setReceived).catch((err) => setError(err.message));
    getSentCards().then(setSent).catch(() => {});
  }, []);

  const cards = view === "received" ? received?.cards : sent?.cards;
  const filtered = useMemo(() => {
    if (!cards) return null;
    return filter ? cards.filter((c) => c.type === filter) : cards;
  }, [cards, filter]);

  const unreadByType = useMemo(() => {
    const counts = {};
    (received?.cards || []).forEach((c) => {
      if (!c.readAt) counts[c.type] = (counts[c.type] || 0) + 1;
    });
    return counts;
  }, [received]);
  const totalUnread = Object.values(unreadByType).reduce((a, b) => a + b, 0);

  async function openMail(card) {
    setOpenCard(card);
    if (view === "received" && !card.readAt) {
      try {
        await markCardRead(card.id);
        setReceived((prev) => ({
          ...prev,
          cards: prev.cards.map((c) => (c.id === card.id ? { ...c, readAt: new Date().toISOString() } : c)),
        }));
      } catch { /* read-state is a nicety, not worth surfacing an error over */ }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header — back arrow, envelope badge, title + unread count, and a
          top-right "N new cards" pill when there's unread mail. */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-full flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-secondary/60 transition-colors shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--social-100))" }}
          >
            <Mail className="h-4 w-4" style={{ color: "hsl(var(--social-500))" }} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-ink-900 leading-tight">Mailbox</h1>
            <p className="text-xs leading-tight" style={{ color: "hsl(var(--social-500))" }}>
              {totalUnread} unread
            </p>
          </div>
        </div>

        {totalUnread > 0 ? (
          <span
            className="text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 flex items-center gap-1.5 shrink-0"
            style={{ background: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--success-500))" }} />
            {totalUnread} new card{totalUnread !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-xs text-ink-500 shrink-0">All caught up</span>
        )}
      </div>

      {/* Received / Sent toggle */}
      <div className="flex rounded-full border border-border p-0.5 w-fit mb-4">
        {[{ key: "received", label: "Received" }, { key: "sent", label: "Sent" }].map((t) => (
          <button
            key={t.key}
            onClick={() => { setView(t.key); setFilter(null); }}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors"
            style={
              view === t.key
                ? { backgroundColor: "hsl(var(--social-100))", color: "hsl(var(--social-700))" }
                : { color: "hsl(var(--ink-500))" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter pills — All + one per card type, unread counts on Received */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilter(null)}
          className="text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors"
          style={
            filter === null
              ? { background: "hsl(var(--social-100))", borderColor: "hsl(var(--social-300))", color: "hsl(var(--social-700))" }
              : { borderColor: "hsl(var(--paper-border))", color: "hsl(var(--ink-500))" }
          }
        >
          All
        </button>
        {CARD_TYPES.map((t) => {
          const theme = CARD_THEME[t];
          const active = filter === t;
          const count = unreadByType[t];
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors flex items-center gap-1.5"
              style={{
                background: active ? theme.bg : "transparent",
                borderColor: active ? theme.border : "hsl(var(--paper-border))",
                color: active ? theme.text : "hsl(var(--ink-500))",
              }}
            >
              {theme.label}
              {view === "received" && count > 0 && (
                <span
                  className="rounded-full text-[9px] font-bold px-1.5 leading-4"
                  style={{ background: theme.solid, color: "white" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {error && <p className="text-sm text-ink-500 p-5">{error}</p>}
          {!error && !filtered && <p className="text-sm text-ink-500 p-5">Loading…</p>}
          {!error && filtered && filtered.length === 0 && (
            <div className="p-8 text-center">
              <InboxIcon className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--ink-500))" }} />
              <p className="text-sm text-ink-500">
                {view === "received" ? "Nothing here yet — cards you receive will show up in this list." : "You haven't sent any cards yet."}
              </p>
            </div>
          )}
          {!error && filtered && filtered.length > 0 && (
            <ul className="divide-y divide-border">
              {filtered.map((card) => {
                const theme = CARD_THEME[card.type];
                const person = view === "received" ? card.sender : card.recipient;
                const unread = view === "received" && !card.readAt;
                const subject = subjectFor(card.note);
                return (
                  <li key={card.id}>
                    <button
                      onClick={() => openMail(card)}
                      className="w-full flex items-start justify-between gap-4 py-4 pl-4 pr-4 text-left hover:bg-secondary/40 transition-colors"
                      style={{ borderLeft: `3px solid ${theme.solid}` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {unread && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: theme.solid }} />}
                          <span className={cn("text-sm truncate", unread ? "font-semibold text-ink-900" : "text-ink-700")}>
                            {person?.username || "A writer"}
                          </span>
                          <span
                            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: theme.bg, color: theme.text }}
                          >
                            {theme.label}
                          </span>
                        </div>
                        <p className={cn("text-sm mb-0.5 truncate", unread ? "font-semibold text-ink-900" : "font-medium text-ink-700")}>
                          {subject}
                        </p>
                        <p className="text-xs text-ink-500 truncate">{card.note}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                        <span className="text-[11px] text-ink-500 whitespace-nowrap">{timeAgo(card.createdAt)}</span>
                        <Mail className="h-3.5 w-3.5" style={{ color: "hsl(var(--ink-500))" }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {openCard && (
        <GreetingCardModal
          card={openCard}
          isReceived={view === "received"}
          alreadyReplied={hasRepliedTo(openCard, sent?.cards)}
          onClose={() => setOpenCard(null)}
          onSendBack={() => {
            const sender = openCard.sender;
            setOpenCard(null);
            setComposeFor({ recipientId: sender.id, recipientName: sender.username });
          }}
        />
      )}

      {composeFor && (
        <SendCardModal
          recipientId={composeFor.recipientId}
          recipientName={composeFor.recipientName}
          onClose={() => setComposeFor(null)}
          onSent={() => {
            getSentCards().then(setSent).catch(() => {});
          }}
        />
      )}

      {/* Local keyframes for the greeting-card pop-in — kept scoped here
          rather than added to index.css since nothing else in the app
          uses this exact bounce. */}
      <style>{`
        @keyframes mailbox-card-in {
          0% { opacity: 0; transform: scale(0.9) translateY(8px) rotate(-2.5deg); }
          60% { opacity: 1; transform: scale(1.02) translateY(0) rotate(-0.4deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(-0.6deg); }
        }
      `}</style>
    </div>
    </div>
  );
}

// Ten-point star path centered on (0,0), outer radius r.
function starPath(r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${pts.join(" L")}Z`;
}

// Decorative SVG banner behind each greeting card's header icon — one motif
// per card type, drawn with the card's own theme color so it re-tints for
// free if CARD_THEME ever changes. Pure vector, no image assets.
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
          {/* Diagonal speed streaks, back to front, evoking a launch/boost */}
          {[[0, 70, 90, 40], [40, 90, 150, 55], [90, 30, 170, 5], [220, 85, 320, 45], [270, 20, 380, -10]].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeOpacity={0.2 + (i % 2) * 0.15} strokeWidth="3" strokeLinecap="round" />
          ))}
          {/* A few energy bursts (four-pointed sparkle) trailing behind */}
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
          {/* Confetti dots scattered across the banner */}
          {[[24, 20], [70, 55], [118, 15], [168, 60], [216, 24], [262, 58], [310, 18], [360, 52], [46, 40], [285, 38]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4 : 2.5} fill={color} fillOpacity={i % 2 ? 0.5 : 0.85} />
          ))}
          {/* Two little birthday candles with flames */}
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

function GreetingCardModal({ card, isReceived, alreadyReplied, onClose, onSendBack }) {
  const theme = CARD_THEME[card.type];
  const copy = CARD_COPY[card.type];
  const Icon = ICONS[theme.icon];
  const person = isReceived ? card.sender : card.recipient;
  const paragraphs = card.note.split(/\n+/).filter(Boolean);

  // Paper card wants dark "ink" rather than the light theme.text tuned for
  // the app's black cards — mix each theme's accent color down toward
  // black instead of introducing a whole second palette just for this.
  const inkTitle = `color-mix(in srgb, ${theme.solid} 75%, black)`;
  const inkBody = `color-mix(in srgb, ${theme.solid} 55%, black)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="paper-card paper-card-fold w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ animation: "mailbox-card-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative header banner */}
        <div className="relative h-24 overflow-hidden" style={{ background: theme.bg }}>
          <CardDecoration type={card.type} color={theme.solid} />
          <div className="relative h-full flex items-center justify-center">
            <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: theme.solid }}>
              <Icon className="h-7 w-7 text-white" />
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full flex items-center justify-center hover:bg-black/10"
            style={{ color: theme.text }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: inkTitle }}>
            {theme.label}
          </p>
          <p className="text-2xl font-semibold mb-1" style={{ fontFamily: "var(--font-card-display)", color: inkTitle }}>
            {copy.title}
          </p>
          <p
            className="text-sm italic mb-5"
            style={{ fontFamily: "var(--font-paper-serif)", color: "rgba(35,28,22,0.55)" }}
          >
            {copy.tagline}
          </p>

          <div className="text-left space-y-3 mb-5">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-sm italic leading-relaxed"
                style={{ fontFamily: "var(--font-paper-serif)", color: inkBody }}
              >
                {p}
              </p>
            ))}
          </div>

          <div className="flex items-center gap-2.5 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: theme.bg, color: theme.text }}
            >
              {(person?.username || "?").slice(0, 2).toUpperCase()}
            </div>
            <ClickableUsername userId={person?.id} className="text-left">
              <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-card-display)", color: "rgba(30,24,20,0.9)" }}>
                {person?.username || "A writer"}
              </p>
              <p className="text-[11px]" style={{ color: "rgba(30,24,20,0.45)" }}>{timeAgo(card.createdAt)}</p>
            </ClickableUsername>
          </div>
        </div>

        {isReceived && (
          <div className="px-6 pb-6">
            {alreadyReplied ? (
              <div
                className="w-full flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold"
                style={{ background: "rgba(0,0,0,0.05)", color: "rgba(30,24,20,0.5)" }}
              >
                <Check className="h-3.5 w-3.5" /> You sent one back
              </div>
            ) : (
              <button
                onClick={onSendBack}
                className="w-full flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition-colors"
                style={{ background: theme.bg, color: theme.text }}
              >
                <Send className="h-3.5 w-3.5" /> Send one back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}