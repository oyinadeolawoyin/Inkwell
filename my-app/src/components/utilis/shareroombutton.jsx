// src/pages/shareRoomButton.jsx
//
// "Share Room" — opens a share dialog for X or Tumblr, both pointing at a
// public (unauthenticated) share page on the API for this room, not the
// app's own room URL. That page is server-rendered with og:image/
// twitter:image meta tags pointing at a live-generated PNG (room name +
// current writer count, QuillWeave branding, "Make it exist." tagline) —
// see server/controllers/sharecontroller.js. Tumblr additionally gets that
// same image passed directly via posttype=photo&content=, since Tumblr's
// share tool doesn't scrape OG tags the way X does.
import { useState, useRef, useEffect } from "react";
import { Share2, Link2, Check } from "lucide-react";

// The API's own public URL — needs to be reachable by X/Tumblr's servers,
// not just your browser, so this can't be window.location.origin (that's
// the frontend). Same VITE_API_URL every other api file already uses —
// it already includes /api, so routes below do NOT re-add it.
const SHARE_BASE = import.meta.env.VITE_API_URL;
const HASHTAG = "#MakeItExist";

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
      <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.9l-5-6.6L6.1 22H3l8.1-9.3L2.7 2h6.6l4.5 6.1L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
    </svg>
  );
}

function TumblrIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
      <path d="M14.5 21.5c-3.9 0-5.6-2.5-5.6-5.6V10H6.7V7.3c2.6-.9 3.7-3.2 3.9-5.3h2.9v4.8h3.9V10h-3.9v5.4c0 1.6.8 2.2 2.1 2.2.7 0 1.4-.2 1.8-.4l.9 3.4c-.6.4-2 .9-3.8.9Z" />
    </svg>
  );
}

function popup(url) {
  const w = 600, h = 500;
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  window.open(url, "_blank", `width=${w},height=${h},left=${left},top=${top}`);
}

export default function ShareRoomButton({ room, writerCount }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!room?.id || !SHARE_BASE) return null;

  const shareUrl = `${SHARE_BASE}/share/sprint/${room.id}`;
  const ogImageUrl = `${SHARE_BASE}/og/sprint-room/${room.id}.png`;
  const roomName = room.name || "a sprint room";
  const blurb = `${writerCount} writer${writerCount === 1 ? "" : "s"} sprinting in "${roomName}" on QuillWeave. Make it exist. ${HASHTAG}`;

  function shareOnX() {
    const params = new URLSearchParams({ text: blurb, url: shareUrl });
    popup(`https://twitter.com/intent/tweet?${params.toString()}`);
    setOpen(false);
  }

  function shareOnTumblr() {
    const caption = `<p>${blurb}</p><p><a href="${shareUrl}">Join the sprint →</a></p>`;
    const params = new URLSearchParams({
      posttype: "photo",
      canonicalUrl: shareUrl,
      content: ogImageUrl,
      caption,
      tags: "writing,quillweave,sprintroom,MakeItExist",
    });
    popup(`https://www.tumblr.com/widgets/share/tool?${params.toString()}`);
    setOpen(false);
  }

  // Copies the share page link (not the raw image) — pasted anywhere that
  // unfurls links (iMessage, Slack, Discord, WhatsApp...) this still shows
  // the live preview card, since it's the same og:image-carrying URL X uses.
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-display font-medium
                   border border-border text-foreground hover:border-foreground/30 transition-colors"
      >
        <Share2 size={15} /> Share room
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover
                         shadow-lg overflow-hidden z-50">
          <button
            onClick={shareOnX}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-popover-foreground
                       hover:bg-secondary transition-colors"
          >
            <XIcon /> Share on X
          </button>
          <button
            onClick={shareOnTumblr}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-popover-foreground
                       hover:bg-secondary transition-colors"
          >
            <TumblrIcon /> Share on Tumblr
          </button>
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-popover-foreground
                       hover:bg-secondary transition-colors border-t border-border"
          >
            {copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}