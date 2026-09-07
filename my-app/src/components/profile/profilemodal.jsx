// src/components/profile/profileModal.jsx
//
// Discord-style "click a username → popup card" profile. Rendered globally
// by ProfileModalProvider (see profileModalContext.jsx) — nothing needs to
// mount this directly; call useProfileModal().openProfile(userId) from
// anywhere a username is shown.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Flame, Heart, UserPlus, UserCheck, MessageCircle,
  Mail, Pencil, Globe2, Feather, Sparkles, Loader2, ChevronRight, Link2, Send,
} from "lucide-react";
import { useAuth } from "../auth/authContext";
import { getProfile, followUser, unfollowUser, likeProfile, unlikeProfile } from "./profileapi";
import { openConversation } from "../message/directmessageapi";
import SendCardModal from "../mailbox/sendCardModal";

const DAY_LABEL = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };

// socialLinks comes back from Prisma's Json column already parsed, but this
// stays defensive in case it's ever a raw string — same shape settings.jsx
// saves: [{ platform, url }, ...].
function parseSocialLinks(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.filter((l) => l?.platform && l?.url) : [];
  } catch {
    return [];
  }
}

function Avatar({ name, src, size = 88 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover shrink-0 border-4 border-card"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = (name || "?").slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold shrink-0 border-4 border-card"
      style={{ width: size, height: size, fontSize: size * 0.32, backgroundColor: "hsl(var(--social-500))", color: "white" }}
    >
      {initials}
    </div>
  );
}

export default function ProfileModal({ userId, onClose }) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [followBusy, setFollowBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [showSendCard, setShowSendCard] = useState(false);
  const [cardSentMessage, setCardSentMessage] = useState("");

  const isOwner = Number(currentUser?.id) === Number(userId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getProfile(userId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!cardSentMessage) return;
    const timer = setTimeout(() => setCardSentMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [cardSentMessage]);

  function handleCardSent() {
    setShowSendCard(false);
    setCardSentMessage(`Card sent to ${data?.user?.username || "them"}! 🎉`);
  }

  async function handleFollowToggle() {
    if (!data || followBusy) return;
    setFollowBusy(true);
    try {
      if (data.isFollowing) {
        await unfollowUser(userId);
        setData((d) => ({ ...d, isFollowing: false, followerCount: Math.max(0, d.followerCount - 1) }));
      } else {
        await followUser(userId);
        setData((d) => ({ ...d, isFollowing: true, followerCount: d.followerCount + 1 }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFollowBusy(false);
    }
  }

  async function handleLikeToggle() {
    if (!data || likeBusy) return;
    setLikeBusy(true);
    try {
      if (data.isLiked) {
        await unlikeProfile(userId);
        setData((d) => ({ ...d, isLiked: false, likeCount: Math.max(0, d.likeCount - 1) }));
      } else {
        await likeProfile(userId);
        setData((d) => ({ ...d, isLiked: true, likeCount: d.likeCount + 1 }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleAskAnything() {
    if (messageBusy) return;
    setMessageBusy(true);
    try {
      const conversation = await openConversation(Number(userId));
      onClose();
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      setError(err.message || "Couldn't open conversation.");
    } finally {
      setMessageBusy(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-2xl bg-card border border-border overflow-hidden shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-16" style={{ backgroundColor: "hsl(var(--social-500))" }} />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-5 -mt-11">
          {cardSentMessage && (
            <div
              className="mb-3 mt-11 -mx-1 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
              style={{ backgroundColor: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}
            >
              <Send className="h-3.5 w-3.5" /> {cardSentMessage}
            </div>
          )}
          {loading ? (
            <div className="py-14 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-ink-500" />
            </div>
          ) : error && !data ? (
            <div className="py-10 text-center">
              <p className="text-sm text-ink-500">{error}</p>
            </div>
          ) : data ? (
            <>
              <Avatar name={data.user.username} src={data.user.avatar} />

              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-display font-semibold text-ink-900 truncate">{data.user.username}</h2>
                  {data.user.role && data.user.role !== "USER" && (
                    <span
                      className="inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "hsl(var(--achievement-100))", color: "hsl(var(--achievement-700))" }}
                    >
                      {data.user.role.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {isOwner ? (
                  <button
                    onClick={() => { onClose(); navigate("/settings"); }}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border text-ink-700 hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> Edit profile
                  </button>
                ) : (
                  <button
                    onClick={handleFollowToggle}
                    disabled={followBusy}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-60"
                    style={
                      data.isFollowing
                        ? { border: "1px solid hsl(var(--border))", color: "hsl(var(--ink-700))" }
                        : { backgroundColor: "hsl(var(--social-500))", color: "white" }
                    }
                  >
                    {data.isFollowing ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                    {data.isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>

              {/* Streak + follower/following counts */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                <span className="inline-flex items-center gap-1" style={{ color: "hsl(var(--achievement-700))" }}>
                  <Flame className="h-3.5 w-3.5" /> {data.currentStreak}d streak
                </span>
                <span>{data.followerCount} follower{data.followerCount !== 1 ? "s" : ""}</span>
                <span>{data.followingCount} following</span>
              </div>

              {!isOwner && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleLikeToggle}
                    disabled={likeBusy}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60"
                    style={
                      data.isLiked
                        ? { color: "hsl(var(--highlight-700))", borderColor: "hsl(var(--highlight-500))" }
                        : { color: "hsl(var(--ink-700))", borderColor: "hsl(var(--border))" }
                    }
                  >
                    <Heart className="h-3.5 w-3.5" fill={data.isLiked ? "currentColor" : "none"} /> {data.likeCount}
                  </button>

                  <button
                    onClick={() => setShowSendCard(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border text-ink-700 hover:border-social-500 hover:text-social-500 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> Send a card
                  </button>
                </div>
              )}

              {data.user.bio && (
                <p className="mt-3 text-sm text-ink-700 leading-relaxed">{data.user.bio}</p>
              )}

              {/* Social links */}
              {parseSocialLinks(data.user.socialLinks).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {parseSocialLinks(data.user.socialLinks).map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border text-ink-700 hover:border-social-500 hover:text-social-500 transition-colors"
                    >
                      <Link2 className="h-3 w-3" /> {link.platform}
                    </a>
                  ))}
                </div>
              )}

              {/* Country / genre / fun fact */}
              {(data.user.country || data.user.genre || data.user.funFact) && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {data.user.country && (
                    <div className="flex items-center gap-2 text-xs">
                      <Globe2 className="h-3.5 w-3.5 text-ink-500 shrink-0" />
                      <span className="text-ink-700">{data.user.country}</span>
                    </div>
                  )}
                  {data.user.genre && (
                    <div className="flex items-center gap-2 text-xs">
                      <Feather className="h-3.5 w-3.5 text-ink-500 shrink-0" />
                      <span className="text-ink-700">Writes {data.user.genre}</span>
                    </div>
                  )}
                  {data.user.funFact && (
                    <div className="flex items-start gap-2 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-ink-500 shrink-0 mt-0.5" />
                      <span className="text-ink-700 italic">{data.user.funFact}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Favorite sprint time/days */}
              {(data.user.favoriteSprintTime || data.user.favoriteSprintDays?.length > 0) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-1.5">
                    Favorite sprint time
                  </p>
                  {data.user.favoriteSprintTime && (
                    <p className="text-sm text-ink-900">{data.user.favoriteSprintTime}</p>
                  )}
                  {data.user.favoriteSprintDays?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {data.user.favoriteSprintDays.map((d) => (
                        <span key={d} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-ink-700">
                          {DAY_LABEL[d] || d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mailbox cards sent — clickable for the profile owner, since
                  /api/mailbox/sent only ever returns the logged-in user's
                  own sent cards; for anyone else it's just a stat. */}
              {isOwner ? (
                <button
                  onClick={() => { onClose(); navigate("/mailbox?view=sent"); }}
                  className="mt-4 pt-4 border-t border-border w-full flex items-center gap-2 text-xs text-ink-500 hover:text-ink-900 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{data.cardsSentCount} mailbox card{data.cardsSentCount !== 1 ? "s" : ""} sent</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-ink-500">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{data.cardsSentCount} mailbox card{data.cardsSentCount !== 1 ? "s" : ""} sent</span>
                </div>
              )}

              {/* Active draft plans */}
              {data.draftPlans?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Active draft plans</p>
                  {data.draftPlans.slice(0, 3).map((p) => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-ink-900 truncate pr-2">{p.storyTitle}</p>
                        <span className="text-xs text-ink-500 shrink-0">{p.percentage}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.percentage}%`,
                            backgroundColor: p.isCompleted ? "hsl(var(--success-500))" : "hsl(var(--social-500))",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ask me anything — actionable for other writers; for the
                  owner it's just a confirmation the toggle is actually live
                  (there's no other way to check it from your own profile). */}
              {data.user.allowAskMeAnything && (
                isOwner ? (
                  <div
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-xl"
                    style={{ backgroundColor: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Ask me anything is on
                  </div>
                ) : (
                  <button
                    onClick={handleAskAnything}
                    disabled={messageBusy}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
                    style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {messageBusy ? "Opening…" : "Ask me anything"}
                  </button>
                )
              )}

              {error && (
                <p className="mt-3 text-xs" style={{ color: "hsl(var(--highlight-500))" }}>{error}</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>

    {showSendCard && data && (
      <SendCardModal
        recipientId={userId}
        recipientName={data.user.username}
        onClose={() => setShowSendCard(false)}
        onSent={handleCardSent}
      />
    )}
    </>
  );
}