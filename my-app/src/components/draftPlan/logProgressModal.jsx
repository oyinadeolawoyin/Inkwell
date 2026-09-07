// src/components/draftPlan/logProgressModal.jsx
//
// Celebration modal shown right after a session is logged. Two variants:
//
//   variant="daily" — after a normal logProgress() call. Ring = TODAY'S
//   goal (before → after), bar = WEEKLY TARGET (before → after). Uses the
//   same "highlight" (today) / "achievement" (weekly) tones as the
//   dashboard rings in draftPlanPage.jsx, flipping to "success" once each
//   one is met — no new palette, everything reads off index.css.
//
//   variant="bonus" — after a logBonusQuestProgress() call. Ring = QUEST
//   progress (before → after) in the "bonus" (purple) tone. No weekly
//   bar — instead a prompt callout + word-count tiles, written to feel
//   like a win regardless of the story's own targets.
//
// Both variants share: header stat tiles, a "discovery" strip pulled from
// a free dictionary API (falling back to a built-in meaning if that lookup
// fails) and auto-saved to the writer's own dictionary the moment it's
// revealed, an in-modal note capture (moved here from the quick-log form
// on the page itself), and a "brag" share card.
//
// Discovery words are tiered, not fixed at 5: 2 words for simply logging
// a session, 5 if that session met the day's goal (or completed the
// quest, for bonus) — a small extra nudge for finishing strong without
// leaving partial-session days empty-handed. They're also capped to the
// day's FIRST logged session (before === 0) so splitting one session into
// several small logs can't be used to farm extra words out of the
// (finite, curated) word bank — see isFirstLogToday below.
//
// The note itself isn't saved by this component directly — pass
// onSaveNote(text) and do the actual logProgress/logBonusQuestProgress
// call from the page, since only the page knows which one applies.

import { useEffect, useRef, useState } from "react";
import { X, CheckCircle2, Share2, Copy, Sparkles, PenLine, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── DISCOVERY WORD BANK ───────────────────────────────────────────────────
// Curated for "delightful to stumble on while writing" rather than
// obscure-for-its-own-sake. `fallback` is used if the live dictionary
// lookup fails (offline, rate-limited, word not found) so the feature
// never comes up empty. `pos` (part of speech) drives the mix in
// POS_MIX below — verbs read as more "actionable" mid-tile, so most
// counts lean on them, filled out with a noun and/or adjective.
const WORD_BANK = [
  // nouns
  { word: "petrichor",     pos: "noun",      fallback: "The smell of earth after rain." },
  { word: "apricity",      pos: "noun",      fallback: "The warmth of sun on a cold day." },
  { word: "sonder",        pos: "noun",      fallback: "The realization that every stranger has a life as vivid as your own." },
  { word: "wanderlust",    pos: "noun",      fallback: "A strong desire to travel and explore." },
  { word: "serendipity",   pos: "noun",      fallback: "A pleasant surprise found by accident." },
  { word: "solitude",      pos: "noun",      fallback: "The state of being alone, often by choice, and often restful." },
  { word: "resilience",    pos: "noun",      fallback: "The ability to recover quickly from difficulty." },
  { word: "susurrus",      pos: "noun",      fallback: "A soft whispering or rustling sound." },
  { word: "eloquence",     pos: "noun",      fallback: "Fluent, persuasive, and graceful speech or writing." },
  { word: "gossamer",      pos: "noun",      fallback: "Something delicate, light, and thin, like a spider's silk." },
  { word: "tenacity",      pos: "noun",      fallback: "Firm persistence in holding to something." },
  { word: "reverie",       pos: "noun",      fallback: "A pleasant state of daydreaming." },

  // adjectives
  { word: "ephemeral",     pos: "adjective", fallback: "Lasting for a very short time." },
  { word: "luminous",      pos: "adjective", fallback: "Full of or emitting light; glowing." },
  { word: "mellifluous",   pos: "adjective", fallback: "Sweet and smooth to hear, like a voice or sound." },
  { word: "effervescent",  pos: "adjective", fallback: "Bubbling with energy, enthusiasm, or fizz." },
  { word: "halcyon",       pos: "adjective", fallback: "Calm, peaceful, and happy — often looking back on a golden time." },
  { word: "ineffable",     pos: "adjective", fallback: "Too great or intense to be described in words." },
  { word: "liminal",       pos: "adjective", fallback: "Occupying a threshold between one state and another." },
  { word: "iridescent",    pos: "adjective", fallback: "Showing shifting rainbow colors depending on the angle of light." },
  { word: "verdant",       pos: "adjective", fallback: "Green with lush vegetation." },
  { word: "wistful",       pos: "adjective", fallback: "Full of a vague, gentle longing." },
  { word: "labyrinthine",  pos: "adjective", fallback: "Intricate and confusing, like a maze." },
  { word: "incandescent",  pos: "adjective", fallback: "Glowing with heat, or brilliantly intense." },
  { word: "elysian",       pos: "adjective", fallback: "Blissful, like paradise itself." },

  // verbs
  { word: "meander",       pos: "verb",      fallback: "To wander aimlessly, or follow a winding course." },
  { word: "linger",        pos: "verb",      fallback: "To stay somewhere longer than necessary, reluctant to leave." },
  { word: "unfurl",        pos: "verb",      fallback: "To open out from a rolled or folded state." },
  { word: "kindle",        pos: "verb",      fallback: "To light a fire, or to arouse a feeling." },
  { word: "wander",        pos: "verb",      fallback: "To walk or move in a leisurely, aimless way." },
  { word: "shimmer",       pos: "verb",      fallback: "To shine with a soft, wavering light." },
  { word: "drift",         pos: "verb",      fallback: "To be carried along slowly, without a fixed course." },
  { word: "hush",          pos: "verb",      fallback: "To make or become quiet and still." },
  { word: "bloom",         pos: "verb",      fallback: "To open into flower, or come into full, healthy development." },
  { word: "murmur",        pos: "verb",      fallback: "To say something in a low, soft, continuous voice." },
];

// How many of each part of speech to pull for a given tile count — mixing
// them (rather than five random nouns, say) makes the strip feel more like
// a little vocabulary lesson than a word-of-the-day dump. Configured for
// the two counts the modal actually uses (3 for a plain logged session, 5
// for hitting the goal); defaultMixForCount below covers anything else.
const POS_MIX = {
  3: { verb: 2, noun: 1 },
  5: { verb: 3, noun: 1, adjective: 1 },
};

function defaultMixForCount(count) {
  const order = ["verb", "noun", "adjective"];
  const base = Math.floor(count / order.length);
  let remainder = count - base * order.length;
  const mix = {};
  for (const pos of order) {
    mix[pos] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return mix;
}

// Draws `count` words according to POS_MIX, preferring words NOT already
// in `excludeWords` (the writer's existing dictionary) so a session's
// picks feel fresh instead of re-surfacing something discovered last
// week. If exclusions (or a thin part-of-speech bucket) would leave too
// few candidates to fill the mix, this tops up from whatever's left in
// the full bank rather than shorting the tile count — a repeat word is a
// better outcome than an empty tile.
function sampleWords(count, excludeWords = []) {
  const excludeSet = new Set(excludeWords.map((w) => w.toLowerCase()));
  const fresh = WORD_BANK.filter((w) => !excludeSet.has(w.word.toLowerCase()));
  const pool = fresh.length >= count ? fresh : WORD_BANK;

  const mix = POS_MIX[count] || defaultMixForCount(count);
  const picked = [];
  const usedWords = new Set();

  function pickFrom(list, n) {
    const candidates = list.filter((w) => !usedWords.has(w.word));
    let taken = 0;
    while (taken < n && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      const word = candidates.splice(i, 1)[0];
      picked.push(word);
      usedWords.add(word.word);
      taken++;
    }
    return taken;
  }

  for (const pos of Object.keys(mix)) {
    const gotten = pickFrom(pool.filter((w) => w.pos === pos), mix[pos]);
    if (gotten < mix[pos]) {
      // This part-of-speech bucket ran dry (heavy exclusion, small bank)
      // — top up from anything else left in the pool so the total still
      // adds up to `count`, just without a perfect mix this one time.
      pickFrom(pool, mix[pos] - gotten);
    }
  }
  if (picked.length < count) pickFrom(pool, count - picked.length);

  return picked;
}

// ─── BRAG CARD QUOTES ───────────────────────────────────────────────────────
// House lines, not attributed to any real author — this is QuillWeave's own
// voice signing the card, the way a photographer's watermark sits under a
// photo rather than a caption trying to sell the camera. One picked per
// card open (see pickQuote below), not per render, so it doesn't shuffle
// mid-share.
const QUOTE_BANK = [
  "A draft doesn't have to be good. It has to exist.",
  "Somewhere in this mess is the story you meant to tell.",
  "Every page you finish is a page you don't have to write again.",
  "The blank page loses the moment you put anything on it.",
  "First drafts are just you arguing with the idea until it holds still.",
  "You don't find the story by thinking about it. You find it by writing it.",
  "Progress, not prose — the sentences get fixed later.",
  "Showing up is the whole job on the hard days.",
];

function pickQuote() {
  return QUOTE_BANK[Math.floor(Math.random() * QUOTE_BANK.length)];
}

async function fetchDefinition(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition || null;
  } catch {
    return null;
  }
}

// Picks `count` words (mixed by part of speech, see POS_MIX above) and
// looks up a live definition for each (falling back to the bank's own
// meaning). Purely a "here's something nice for showing up today" moment —
// nothing here gets persisted, so a repeated word across sessions is
// expected and fine, not a bug to guard against.
function useDiscoveryWords(active, count = 5) {
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      const picks = sampleWords(count);
      setTiles(picks.map((p) => ({ word: p.word, meaning: p.fallback })));

      picks.forEach(async (p, idx) => {
        const live = await fetchDefinition(p.word);
        if (cancelled || !live) return;
        setTiles((prev) => prev.map((t, i) => (i === idx ? { ...t, meaning: live } : t)));
      });
    })();

    return () => { cancelled = true; };
  }, [active, count]);

  return tiles;
}

// ─── SMALL PIECES ───────────────────────────────────────────────────────────

function StatTile({ tone, label, value }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: `hsl(var(--${tone}-100))` }}>
      <p className="text-lg font-display font-semibold leading-tight" style={{ color: `hsl(var(--${tone}-700))` }}>{value}</p>
      <p className="text-[10px] text-ink-500 mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

// Two small rings, side by side — "before" is a dim neutral ring, "after"
// animates in on mount using the given tone (flips to success at 100%).
function BeforeAfterRing({ tone, before, after, goal }) {
  const r = 30, c = 2 * Math.PI * r;
  const pctBefore = goal > 0 ? Math.min(Math.round((before / goal) * 100), 100) : 0;
  const pctAfter  = goal > 0 ? Math.min(Math.round((after  / goal) * 100), 100) : 0;
  const v = after >= goal && goal > 0 ? "success" : tone;

  const [animPct, setAnimPct] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimPct(pctAfter), 80); return () => clearTimeout(t); }, [pctAfter]);

  const mini = (pct, dim) => {
    const offset = c - (pct / 100) * c;
    return (
      <svg width="72" height="72" viewBox="0 0 72 72">
        <g transform="rotate(-90 36 36)">
          <circle cx="36" cy="36" r={r} fill="none" stroke={dim ? "hsl(var(--paper-muted))" : `hsl(var(--${v}-100))`} strokeWidth="7" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={dim ? "hsl(var(--ink-500))" : `hsl(var(--${v}-500))`}
            strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms ease-out" }}
          />
        </g>
        <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
          className="font-display font-semibold"
          style={{ fill: dim ? "hsl(var(--ink-500))" : `hsl(var(--${v}-700))`, fontSize: "14px" }}>
          {pct}%
        </text>
      </svg>
    );
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-center">
        {mini(pctBefore, true)}
        <p className="text-[10px] text-ink-500 mt-1 uppercase tracking-wide">Before</p>
      </div>
      <span className="text-ink-500 text-lg">→</span>
      <div className="text-center">
        {mini(animPct, false)}
        <p className="text-[10px] mt-1 uppercase tracking-wide font-semibold" style={{ color: `hsl(var(--${v}-700))` }}>After</p>
      </div>
    </div>
  );
}

function BeforeAfterBar({ tone, label, before, after, goal, unit }) {
  const pctBefore = goal > 0 ? Math.min((before / goal) * 100, 100) : 0;
  const pctAfter  = goal > 0 ? Math.min((after  / goal) * 100, 100) : 0;
  const v = after >= goal && goal > 0 ? "success" : tone;
  const [animPct, setAnimPct] = useState(pctBefore);
  useEffect(() => { const t = setTimeout(() => setAnimPct(pctAfter), 80); return () => clearTimeout(t); }, [pctAfter]);
  const delta = Math.max(Math.round(pctAfter - pctBefore), 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: `hsl(var(--${v}-700))` }}>{label}</span>
        <span className="text-xs text-ink-500">{after.toLocaleString()} / {goal.toLocaleString()} {unit}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--paper-muted))" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${animPct}%`,
            background: `linear-gradient(90deg, hsl(var(--${v}-300)), hsl(var(--${v}-500)))`,
            transition: "width 900ms ease-out",
          }}
        />
      </div>
      {delta > 0 && <p className="text-[11px] mt-1" style={{ color: `hsl(var(--${v}-700))` }}>+{delta}% this session</p>}
    </div>
  );
}

function WordTile({ tile, tone, index, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tile)}
      className="relative min-h-[5.5rem] rounded-xl flex flex-col items-center justify-center gap-1 px-2 py-3 text-center transition-transform hover:scale-[1.03]"
      style={{
        background: `hsl(var(--${tone}-100))`,
        border: `1px solid hsl(var(--${tone}-300))`,
        animation: "logmodal-word-in 420ms ease-out both",
        animationDelay: `${index * 90}ms`,
      }}
    >
      <span className="font-display font-semibold text-xs sm:text-sm leading-tight break-words hyphens-auto" style={{ color: `hsl(var(--${tone}-700))` }}>{tile.word}</span>
      <span className="text-[10px] text-ink-500">tap to reveal</span>
    </button>
  );
}

function DiscoverySection({ tiles, count, tone, heading, subheading, onSelect, locked }) {
  if (locked) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `hsl(var(--${tone}-700))` }}>{heading}</p>
        <div className="rounded-xl px-4 py-3 text-sm text-ink-500" style={{ background: "hsl(var(--paper-muted))" }}>
          {subheading}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `hsl(var(--${tone}-700))` }}>{heading}</p>
        <span className="text-[10px] text-ink-500">{subheading}</span>
      </div>
      <div className={cn("grid gap-2", count <= 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5")}>
        {tiles.length === 0
          ? Array.from({ length: count }).map((_, i) => (
              <div key={i} className="min-h-[5.5rem] rounded-xl animate-pulse" style={{ background: "hsl(var(--paper-muted))" }} />
            ))
          : tiles.map((t, i) => <WordTile key={t.word} tile={t} tone={tone} index={i} onSelect={onSelect} />)}
      </div>
    </div>
  );
}

// Reveal overlay for a single word — sits above the note/rings body, same
// pattern as BragOverlay (absolute inset-0 over the modal card).
function WordMeaningModal({ tile, tone, onClose }) {
  if (!tile) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 rounded-[inherit] p-6">
      <div className="w-full max-w-xs rounded-2xl p-5 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--paper-border))" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wide text-ink-500">Discovered today</span>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
        </div>
        <p className="font-display text-2xl mb-3" style={{ color: `hsl(var(--${tone}-700))` }}>{tile.word}</p>
        <p className="text-sm text-ink-700 leading-relaxed">{tile.meaning}</p>
      </div>
    </div>
  );
}

function NoteCapture({ tone, onSave }) {
  const [value, setValue] = useState("");
  const [savedText, setSavedText] = useState(null);
  const [saving, setSaving] = useState(false);

  if (savedText) {
    return (
      <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}>
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{savedText}</span>
      </div>
    );
  }

  async function save() {
    if (!value.trim() || !onSave) return;
    setSaving(true);
    try {
      await onSave(value.trim());
      setSavedText(value.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: `hsl(var(--${tone}-700))` }}>
        <PenLine className="h-3 w-3" /> Capture this moment
      </p>
      <p className="text-xs text-ink-500 mb-2">
        How did today's writing feel? A single line is enough — you'll thank yourself later.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What happened in this session?"
        rows={3}
        className="resize-none"
      />
      <div className="flex justify-end mt-2">
        <Button size="sm" variant="ghost" onClick={save} disabled={saving || !value.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── COLOR RESOLUTION FOR CAPTURE ──────────────────────────────────────────
//
// html-to-image rasterizes by serializing the node into a standalone SVG
// document, which has no access to the page's :root CSS variables — so
// any hsl(var(--x)) used as a raw stroke/fill/background attribute (as
// opposed to a Tailwind class, which computed-style inlining handles
// fine) silently fails to resolve there, even though it renders correctly
// live. Fix: walk the subtree right before capture, read each element's
// already-resolved getComputedStyle() value for the color-ish properties,
// and set that literal value as an inline style override (which wins
// over the raw attribute). Revert afterwards so the live DOM/React tree
// is untouched.
//
// The override is set with `important` priority: several elements here
// (the card body, the header banners) set their color via the `background`
// SHORTHAND — e.g. background: hsl(var(--paper-muted)) — and a same-
// priority `background-color` added afterwards doesn't reliably out-rank
// that shorthand in every browser's inline-style cascade. Without
// `important`, the unresolved var() shorthand can win, which is exactly
// what produced a transparent card with washed-out text on capture.
const CAPTURE_COLOR_PROPS = ["color", "background-color", "background-image", "border-color", "stroke", "fill"];

function patchResolvedColorsForCapture(root) {
  const restores = [];
  const walk = (el) => {
    if (!el || el.nodeType !== 1) return;
    const computed = getComputedStyle(el);
    CAPTURE_COLOR_PROPS.forEach((prop) => {
      const resolved = computed.getPropertyValue(prop);
      if (!resolved || resolved === "none") return;
      const original = el.style.getPropertyValue(prop);
      const originalPriority = el.style.getPropertyPriority(prop);
      el.style.setProperty(prop, resolved, "important");
      restores.push(() => {
        if (original) el.style.setProperty(prop, original, originalPriority);
        else el.style.removeProperty(prop);
      });
    });
    Array.from(el.children).forEach(walk);
  };
  walk(root);
  return () => restores.forEach((fn) => fn());
}

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}>
      <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.9l-5-6.6L6.1 22H3l8.1-9.3L2.7 2h6.6l4.5 6.1L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
    </svg>
  );
}

function TumblrIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}>
      <path d="M14.5 21.5c-3.9 0-5.6-2.5-5.6-5.6V10H6.7V7.3c2.6-.9 3.7-3.2 3.9-5.3h2.9v4.8h3.9V10h-3.9v5.4c0 1.6.8 2.2 2.1 2.2.7 0 1.4-.2 1.8-.4l.9 3.4c-.6.4-2 .9-3.8.9Z" />
    </svg>
  );
}

// The API's own public URL — needs to be reachable by X/Tumblr's servers,
// not just the browser. Already includes /api, matching every other api
// file in this codebase.
const SHARE_BASE = import.meta.env.VITE_API_URL;

// ─── BRAG OVERLAY ───────────────────────────────────────────────────────────
//
// cardRef wraps exactly the visual card the writer expects to share — not
// the "Brag card" chrome or the buttons around it. Share/Grab both
// rasterize that node with html-to-image and act on the resulting PNG,
// falling back to plain shareText if image capture or the relevant
// clipboard/share API isn't available (older browsers, non-HTTPS, etc).
function BragOverlay({ onClose, shareText, todayBefore, todayAfter, dailyGoal, weekBefore, weekAfter, weeklyGoal, unit, storyTitle, questPrompt, isBonus, tiles, tone, wordTone }) {
  const [copied, setCopied] = useState(false);
  const [shareToast, setShareToast] = useState(null); // "x" | "tumblr" | "link" | null
  const [busy, setBusy] = useState(false);
  const uploadedRef = useRef(null); // { imageUrl, shareUrl } — cached so re-sharing doesn't re-upload
  const [quote] = useState(pickQuote); // fixed for the life of this card — no reshuffling mid-share
  const cardRef = useRef(null);

  async function captureImage() {
    if (!cardRef.current) return null;
    const restore = patchResolvedColorsForCapture(cardRef.current);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: getComputedStyle(cardRef.current).backgroundColor,
      });
      const blob = await (await fetch(dataUrl)).blob();
      return { dataUrl, blob };
    } catch {
      return null; // falls back to text-only share/copy below
    } finally {
      restore();
    }
  }

  async function share() {
    setBusy(true);
    try {
      const captured = await captureImage();
      if (captured) {
        const file = new File([captured.blob], "quillweave-brag.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], text: shareText }); return; } catch { /* user cancelled — fall through */ }
        }
        // No file-sharing support — download the image so it's still usable.
        const link = document.createElement("a");
        link.href = captured.dataUrl;
        link.download = "quillweave-brag.png";
        link.click();
        return;
      }
      if (navigator.share) {
        try { await navigator.share({ text: shareText }); return; } catch { /* user cancelled */ }
      }
      await copyTextOnly();
    } finally {
      setBusy(false);
    }
  }

  async function copyTextOnly() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — nothing more we can do here */ }
  }

  // Uploads the captured card once and caches the result — X, Tumblr, and
  // Copy Link all reuse the same hosted image/share-page pair instead of
  // each re-uploading. Returns null (and lets callers fall back to
  // text-only) if capture or the upload itself fails for any reason.
  async function uploadCard() {
    if (uploadedRef.current) return uploadedRef.current;
    if (!SHARE_BASE) return null;

    const captured = await captureImage();
    if (!captured) return null;

    try {
      const res = await fetch(`${SHARE_BASE}/brag/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: captured.dataUrl }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      uploadedRef.current = { imageUrl: data.imageUrl, shareUrl: data.shareUrl };
      return uploadedRef.current;
    } catch {
      return null; // network error — callers fall back to text-only share
    }
  }

  async function shareToX() {
    setBusy(true);
    setShareToast(null);
    try {
      const uploaded = await uploadCard();
      const text = `${shareText} #MakeItExist`;
      const params = uploaded
        ? new URLSearchParams({ text, url: uploaded.shareUrl })
        : new URLSearchParams({ text });
      window.open(`https://twitter.com/intent/tweet?${params.toString()}`, "_blank", "width=600,height=520");
      setShareToast(uploaded ? "x" : null);
    } finally {
      setBusy(false);
    }
  }

  async function shareToTumblr() {
    setBusy(true);
    setShareToast(null);
    try {
      const uploaded = await uploadCard();
      const caption = `<p>${shareText} #MakeItExist</p>`;
      const url = uploaded
        ? `https://www.tumblr.com/widgets/share/tool?${new URLSearchParams({
            posttype: "photo",
            canonicalUrl: uploaded.shareUrl,
            content: uploaded.imageUrl,
            caption,
            tags: "writing,quillweave,MakeItExist",
          }).toString()}`
        // No hosted image to attach — Tumblr's photo type needs one, so
        // fall back to its quote type, the only legacy posttype that
        // reliably prefills plain text with no source URL.
        : `https://www.tumblr.com/widgets/share/tool?${new URLSearchParams({
            posttype: "quote",
            content: shareText,
            caption: "#MakeItExist · via QuillWeave",
          }).toString()}`;
      window.open(url, "_blank", "width=600,height=520");
      setShareToast(null); // image is already attached server-side here — no paste step needed
    } finally {
      setBusy(false);
    }
  }

  // Copies the actual rasterized card to the clipboard as an image — for
  // pasting straight into Messages, Slack, Discord, etc. Falls back to the
  // share-page link (still shows the image via its og:image tag once
  // pasted somewhere that unfurls links) if the browser can't write image
  // data to the clipboard, and to plain text as a last resort.
  async function copyImage() {
    setBusy(true);
    setShareToast(null);
    try {
      const captured = await captureImage();
      if (captured && navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": captured.blob })]);
          setShareToast("image");
          setTimeout(() => setShareToast(null), 2500);
          return;
        } catch { /* clipboard image write unsupported/blocked — fall back below */ }
      }
      const uploaded = await uploadCard();
      if (uploaded) {
        await navigator.clipboard.writeText(uploaded.shareUrl);
        setShareToast("link");
        setTimeout(() => setShareToast(null), 2500);
        return;
      }
      await copyTextOnly();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 rounded-[inherit] p-4">
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--paper-border))" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-semibold text-ink-900 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" style={{ color: `hsl(var(--${tone}-500))` }} /> Brag card
          </p>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
        </div>

        <p className="text-[11px] text-ink-500 italic mb-3">
          One-time reveal — this card won't show again once you close it, so share it with friends or download it now.
        </p>

        <div ref={cardRef} className="rounded-xl p-4 mb-3" style={{ background: "hsl(var(--paper-muted))" }}>
          {isBonus ? (
            <div className="rounded-xl p-3 mb-3" style={{ background: "hsl(var(--bonus-100))", border: "1px solid hsl(var(--bonus-300))" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 flex items-center gap-1" style={{ color: "hsl(var(--bonus-700))" }}>
                <Sparkles className="h-3 w-3" /> Bonus quest prompt
              </p>
              <p className="text-sm text-ink-900 italic leading-snug">"{questPrompt}"</p>
            </div>
          ) : (
            <p className="text-sm text-ink-700 mb-3">{storyTitle}</p>
          )}

          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: `hsl(var(--${tone}-700))` }}>
            {isBonus ? "Today's quest" : "Today's goal"}
          </p>
          <BeforeAfterRing tone={tone} before={todayBefore} after={todayAfter} goal={dailyGoal} />

          {!isBonus && (
            <div className="mt-4">
              <BeforeAfterBar tone="achievement" label="Weekly target" before={weekBefore} after={weekAfter} goal={weeklyGoal} unit={unit} />
            </div>
          )}

          {tiles.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `hsl(var(--${wordTone}-700))` }}>
                Words discovered today
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {tiles.map((t) => (
                  <span key={t.word} className="font-display font-semibold text-sm rounded-lg px-3 py-1.5"
                    style={{
                      background: `hsl(var(--${wordTone}-100))`,
                      color: `hsl(var(--${wordTone}-700))`,
                      border: `1px solid hsl(var(--${wordTone}-300))`,
                    }}>
                    {t.word}
                  </span>
                ))}
              </div>
              {/* <p className="text-xs text-ink-500 italic">
                I found {tiles.length} new word{tiles.length === 1 ? "" : "s"} today, just for showing up.
              </p> */}
            </div>
          )}

          {/* Signature line — a house quote + small watermark, styled like
              a photographer's credit rather than a pitch to the viewer.
              The quote is the shareable part; QuillWeave is just the
              attribution under it. */}
          <div className="mt-4 pt-3 text-center" style={{ borderTop: "1px solid hsl(var(--paper-border))" }}>
            <p className="text-xs text-ink-700 italic leading-snug">"{quote}"</p>
            <div className="flex items-center justify-center gap-1 mt-2" style={{ opacity: 0.6 }}>
              <PenLine className="h-3 w-3" />
              <span className="text-[10px] font-display font-semibold tracking-wide">QuillWeave — Make it exist.</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" variant="success" onClick={share} disabled={busy}>
            <Share2 className="h-4 w-4" /> {copied ? "Captured!" : busy ? "Preparing…" : "Capture this moment"}
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={shareToX} disabled={busy}>
            <XIcon /> X
          </Button>
          <Button variant="ghost" className="flex-1" onClick={shareToTumblr} disabled={busy}>
            <TumblrIcon /> Tumblr
          </Button>
          <Button variant="ghost" onClick={copyImage} disabled={busy}>
            {shareToast === "image" || shareToast === "link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <p className="text-[11px] text-ink-500 text-center mt-2">
          Post it on X, reblog it on Tumblr, or copy the image — however you share, it tells other writers they're not the only one showing up today.
        </p>

        {shareToast === "x" && (
          <p className="text-[11px] text-ink-500 text-center mt-2">
            Posting window opened — the image link is attached automatically.
          </p>
        )}
        {shareToast === "image" && (
          <p className="text-[11px] text-ink-500 text-center mt-2">
            Image copied — paste it anywhere images go (Messages, Slack, Discord…).
          </p>
        )}
        {shareToast === "link" && (
          <p className="text-[11px] text-ink-500 text-center mt-2">
            Couldn't copy the image directly, so the link's copied instead — paste it anywhere and the image still shows up.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── MAIN MODAL ─────────────────────────────────────────────────────────────

export default function LogProgressModal({
  open,
  onClose,
  variant = "daily", // "daily" | "bonus"
  storyTitle,
  unit = "words",

  // daily variant
  dailyGoal = 0,
  todayBefore = 0,
  todayAfter = 0,
  weeklyGoal = 0,
  weekBefore = 0,
  weekAfter = 0,
  isDraftDone = false,

  // bonus variant
  questPrompt = "",
  questTarget = 0,
  questBefore = 0,
  questAfter = 0,
  questCompleted = false,

  // shared
  onSaveNote, // async (text) => void — daily saves to DraftProgressLog.note, bonus to DraftBonusQuest.note
}) {
  const [bragOpen, setBragOpen] = useState(false);
  const [bragUsed, setBragUsed] = useState(false); // brag card is a one-time reveal — once opened, the trigger is gone for good
  const [revealedTile, setRevealedTile] = useState(null);

  const isBonus = variant === "bonus";
  const goalMet = isBonus ? questCompleted : todayAfter >= dailyGoal;

  // Only the day's FIRST logged session earns a discovery draw — otherwise
  // splitting one session into several small logs would let a writer farm
  // unlimited words out of the (finite, curated) word bank in a single
  // day. questBefore/todayBefore already tell us whether anything was
  // logged before this session, so this needs no extra backend state.
  const isFirstLogToday = isBonus ? questBefore === 0 : todayBefore === 0;
  const discoveryCount = goalMet ? 5 : 3;
  const tiles = useDiscoveryWords(open && isFirstLogToday, discoveryCount);

  if (!open) return null;

  const tone = isBonus ? "bonus" : "highlight"; // purple for bonus, red-flips-green ring tone for daily — matches dashboard
  const wordTileTone = isBonus ? "bonus" : "social";

  const discoveryHeading = isFirstLogToday && goalMet
    ? (isBonus ? "Quest bonus — words discovered today" : "Goal bonus — words discovered today")
    : "Words you discovered today";
  const discoverySubheading = !isFirstLogToday
    ? "You've already found today's words — more tomorrow."
    : "";

  // First-person, tied to showing up rather than to hitting the goal —
  // discovery words land on every logged session, bonus or not, so the
  // brag text should credit that regardless of whether the goal/quest
  // was actually met.
  const discoveredLine = tiles.length > 0
    ? ` I also found ${tiles.length} new word${tiles.length === 1 ? "" : "s"} today, just for showing up: ${tiles.map((t) => t.word).join(", ")}.`
    : "";

  const shareText = isBonus
    ? `Bonus day, still showed up: ${questAfter.toLocaleString()} ${unit} on today's quest — "${questPrompt}."${discoveredLine} ✨ Make it exist.`
    : `Wrote ${todayAfter.toLocaleString()} ${unit} today on "${storyTitle}" — ${weekAfter.toLocaleString()}/${weeklyGoal.toLocaleString()} toward this week's goal.${discoveredLine} 🖋️ Make it exist.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <style>{`
        @keyframes logmodal-word-in {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="relative w-full max-w-lg max-h-[92vh] rounded-2xl overflow-hidden flex flex-col" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--paper-border))" }}>
        <WordMeaningModal tile={revealedTile} tone={wordTileTone} onClose={() => setRevealedTile(null)} />

        {bragOpen && (
          <BragOverlay
            onClose={() => setBragOpen(false)}
            shareText={shareText}
            todayBefore={isBonus ? questBefore : todayBefore}
            todayAfter={isBonus ? questAfter : todayAfter}
            dailyGoal={isBonus ? questTarget : dailyGoal}
            weekBefore={weekBefore}
            weekAfter={weekAfter}
            weeklyGoal={weeklyGoal}
            unit={unit}
            storyTitle={storyTitle}
            questPrompt={questPrompt}
            isBonus={isBonus}
            tiles={tiles}
            tone={tone}
            wordTone={wordTileTone}
          />
        )}

        {/* ── header ── */}
        <div className="p-4 sm:p-5 pb-4 shrink-0" style={{ background: `hsl(var(--${tone}-100))` }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span
                className="inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-2.5 py-1 uppercase tracking-wide"
                style={{ background: `hsl(var(--${goalMet ? "success" : tone}-500))`, color: "white" }}
              >
                {isBonus ? "Bonus quest" : goalMet ? "Goal hit" : "Session logged"}
              </span>
              <h2 className="font-display text-xl sm:text-2xl text-ink-900 mt-2 break-words">
                {isBonus ? "Nice detour." : "Well done, you."}
              </h2>
              <p className="text-xs text-ink-500 mt-0.5 break-words">{isBonus ? questPrompt : storyTitle}</p>
            </div>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900 shrink-0"><X className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4">
            {isBonus ? (
              <>
                <StatTile tone="bonus" label={`${unit} written`} value={questAfter.toLocaleString()} />
                <StatTile tone="quest" label="Quest target" value={questTarget.toLocaleString()} />
                <StatTile tone={questCompleted ? "success" : "bonus"} label="Status" value={questCompleted ? "Done ✓" : "In progress"} />
              </>
            ) : (
              <>
                <StatTile tone="social" label={`${unit} today`} value={todayAfter.toLocaleString()} />
                <StatTile tone={goalMet ? "success" : "highlight"} label="Daily goal" value={goalMet ? "Reached ✓" : `${Math.max(dailyGoal - todayAfter, 0)} to go`} />
                <StatTile tone="achievement" label="Weekly, so far" value={`${weekAfter.toLocaleString()}/${weeklyGoal.toLocaleString()}`} />
              </>
            )}
          </div>
        </div>

        {/* ── body ── */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          {isDraftDone && !isBonus && (
            <div className="rounded-xl px-4 py-3 text-sm font-display font-semibold text-center"
              style={{ background: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}>
              🎉 That's your whole draft — you finished it.
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: `hsl(var(--${tone}-700))` }}>
                {isBonus ? "Today's quest" : "Today's goal"}
              </p>
              <BeforeAfterRing
                tone={tone}
                before={isBonus ? questBefore : todayBefore}
                after={isBonus ? questAfter : todayAfter}
                goal={isBonus ? questTarget : dailyGoal}
              />
            </div>

            {!isBonus ? (
              <div className="flex-1 min-w-[180px]">
                <BeforeAfterBar tone="achievement" label="Weekly target" before={weekBefore} after={weekAfter} goal={weeklyGoal} unit={unit} />
              </div>
            ) : (
              <div className="flex-1 min-w-[180px] rounded-xl p-3" style={{ background: "hsl(var(--bonus-100))" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "hsl(var(--bonus-700))" }}>Today's prompt</p>
                <p className="text-sm text-ink-900 italic leading-snug break-words">{questPrompt}</p>
                <p className="text-xs text-ink-500 mt-2">
                  Off-schedule days still count — you showed up when nothing made you.
                </p>
              </div>
            )}
          </div>

          <DiscoverySection
            tiles={tiles}
            count={discoveryCount}
            tone={wordTileTone}
            heading={discoveryHeading}
            subheading={discoverySubheading}
            onSelect={setRevealedTile}
            locked={!isFirstLogToday}
          />

          <NoteCapture tone={tone} onSave={onSaveNote} />
        </div>

        {/* ── footer ── */}
        <div className="p-4 sm:p-5 pt-3 flex flex-col gap-2 border-t shrink-0" style={{ borderColor: "hsl(var(--paper-border))" }}>
          {!bragUsed && (
            <p className="text-[11px] text-ink-500 text-center sm:text-left">
              Your brag card is a one-time reveal — share it or download it, because it won't show again.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            {!bragUsed && (
              <Button variant="ghost" className="flex-1" onClick={() => { setBragOpen(true); setBragUsed(true); }}>
                <Sparkles className="h-4 w-4" /> Brag a little ↗
              </Button>
            )}
            <Button variant="success" className="flex-1" onClick={onClose}>
              Keep writing →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}