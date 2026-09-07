// src/components/editor/WriteEditorShared.jsx
//
// The one editor component every writing surface reuses: the write page,
// the sprint room, and the feedback submission form. It owns:
//
//   1. Formatting — Bold / Italic / Underline / Undo / Redo, and three
//      font colors (red, blue, black), all applied via the browser's
//      native contentEditable + execCommand undo stack, so Ctrl/Cmd+Z
//      keeps working the way a writer expects.
//   2. Paper appearance — two independent toggles:
//        paperStyle: "blank"  | "notebook"   (ruled lines or not)
//        paperTheme: "dark"   | "light"      (black page or white page)
//      Both are just the SHEET's look — the app shell around it stays the
//      site's black background either way (see PageShell usage below).
//   3. Font family — "default" (site body font) vs "handwritten"
//      (--font-handwritten). Both are CSS variables from index.css, so
//      swapping either typeface later is a one-line change there, not
//      here.
//   4. Sticky notes — mirrors the StickyNote model 1:1: a note with
//      paragraphIndex = null is the draft's one "overall" note (opened
//      from the toolbar); a note with a paragraphIndex is pinned to that
//      paragraph via a gutter marker that tracks the paragraph's position
//      as the writer types, and shows that paragraph's number (1-based
//      for display; the DB's paragraphIndex is 0-based). A paragraph can
//      hold MORE THAN ONE note — the gutter badge shows a count once it
//      does, and clicking it opens all of that paragraph's notes together,
//      with an "add another" composer underneath.
//
// Content is stored as a single HTML string (WritingDraft.content), same
// as before — paragraphs are just the contentEditable's top-level
// children, walked on every input to keep the gutter markers aligned.
//
// Sticky notes go through useDraftStickyNotes(draftId) — the REAL
// /drafts/:draftId/sticky-notes API from draftservice.js — whenever a
// draftId prop is passed. Without a draftId (e.g. a sprint that hasn't
// been saved as a draft file yet), notes fall back to local-only state via
// the notes/onNotesChange props, so the component still works standalone.
//
// Paragraph-pin drift: a note's paragraphIndex used to be fixed forever at
// creation, so inserting a paragraph above a noted one would silently
// attach the note to the wrong paragraph after a refresh. Fixed now — this
// file tags every paragraph with a stable `data-spid` the first time it's
// seen (independent of its index), links each paragraph note to the pid of
// the paragraph it's on, and on every edit checks whether that pid's live
// index still matches note.paragraphIndex. When it doesn't, it re-pins the
// note (via useDraftStickyNotes.js's resyncParagraphIndex, which PATCHes
// the new paragraphIndex to the server). See reconcileNoteParagraphPositions
// below.
//
// Wiring note: onChange still fires on every edit so the parent can save
// draft.content/title on whatever cadence it wants — this component never
// calls updateDraft itself. The sprint room's "notes panel replaces the
// writers panel" behavior lives in the sprint room shell, not here — pass
// onOverallNoteToggle / onNoteFocusToggle if that parent needs to know
// when a notes surface opens.

import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  Bold, Italic, Underline, Undo2, Redo2, StickyNote, X, Plus, Trash2,
  FileText, BookOpen, Sun, Moon, Type, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDraftStickyNotes } from "./usedraftstickynotes";

// Keep these six keys in sync with the Prisma StickyNoteColor enum's order
// (YELLOW/PINK/BLUE/GREEN/PURPLE/ORANGE) — only the hex values are free to
// change. Real-paper pastel tones with a matching shadow/tape tint, tuned
// so a note reads as an actual physical sticky rather than a flat color
// chip (see StickyNoteCard below). Exported so any other surface that
// wants the exact same sticky look — e.g. the Sprint Room's Note Mode
// sidebar — can import it instead of redefining its own palette.
export const STICKY_COLORS = {
  YELLOW: { bg: "#fff59d", edge: "#e8dd6a", tape: "rgba(255,255,255,0.55)", label: "Yellow" },
  PINK:   { bg: "#ffb3d1", edge: "#f28fb8", tape: "rgba(255,255,255,0.55)", label: "Pink"   },
  BLUE:   { bg: "#90caf9", edge: "#64b0ea", tape: "rgba(255,255,255,0.55)", label: "Blue"   },
  GREEN:  { bg: "#b9f6ca", edge: "#8fe8a8", tape: "rgba(255,255,255,0.55)", label: "Green"  },
  PURPLE: { bg: "#d7bbf5", edge: "#c096ea", tape: "rgba(255,255,255,0.55)", label: "Purple" },
  ORANGE: { bg: "#ffcc80", edge: "#f5ae4d", tape: "rgba(255,255,255,0.55)", label: "Orange" },
};

// Stable little "randomness" so a note doesn't jitter its rotation on
// every re-render, but different notes still look hand-placed rather than
// gridded. Hashes the id (a cuid string, not a number) into -4°..4°.
function stableAngle(seed) {
  const s = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return (hash % 9) - 4;
}

const FONT_COLORS = [
  { label: "Black", value: "#111111" },
  { label: "White", value: "#ffffff" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Red", value: "#ef4444" },
];

let uid = 0;
const nextLocalId = () => `local-${Date.now()}-${uid++}`;

const WriteEditorShared = forwardRef(function WriteEditorShared({
  draftId,                  // when present, sticky notes hit the real API (see useDraftStickyNotes)
  initialContent = "",
  onChange,                 // (html, plainText, wordCount) => void
  notes: notesProp,         // controlled notes array, optional — ignored when draftId is set
  onNotesChange,            // (notes) => void — fires on every notes change regardless of draftId,
                             // so a parent (e.g. the Sprint Room's Note Mode sidebar) can mirror the
                             // list without instantiating its own useDraftStickyNotes.
  placeholder = "First, make that first draft exist.",
  className = "",
  maxWidthPx = 720,         // paper + gutter width — widen for contexts that want a bigger page
  showNotes = true,         // false hides the notes button, badges, and the built-in slide-in
                             // panel entirely — pass onSelectParagraphNote instead if a parent
                             // wants its own note surface (see below).
  onSelectParagraphNote,    // (paragraphIndex) => void — when provided, paragraph badges always
                             // render (regardless of showNotes) and clicking one calls this
                             // instead of opening the built-in slide-in panel. Lets a parent with
                             // its own notes UI (the Sprint Room's Note Mode sidebar) still get
                             // numbered, click-to-open badges in the gutter.
  hideToolbar = false,      // true hides the whole formatting/appearance toolbar — Sprint Room's
                             // Focus Mode AND Note Mode both pass this, since neither wants
                             // paper/pen/font controls competing for attention mid-sprint. The
                             // gutter (paragraph badges) stays independent of this, so Note
                             // Mode keeps its click-to-add-note affordance either way.
  highlightParagraphIndex = null, // paragraphIndex (or null) to visually highlight behind the
                             // text — lets a parent make it obvious which paragraph an
                             // in-progress action (e.g. the Sprint Room's Ctrl+K quick note)
                             // will land on, especially useful in Focus Mode where the gutter
                             // badges are the only other paragraph affordance on screen.
}, ref) {
  const editorRef = useRef(null);
  const paperRef = useRef(null);
  const gutterRef = useRef(null);
  const didInit = useRef(false);

  // ── Stable paragraph identity (for note drift detection) ─────────────
  // A DOM paragraph <p> keeps its element instance as you type — it's only
  // swapped out when a paragraph is inserted/deleted. So each block gets a
  // one-time `data-spid` the first time we see it; that id, not its index,
  // is what a note is really "pinned to." pidToIndexRef is rebuilt on every
  // syncGutter to answer "what index is this pid at right now," and
  // noteIdToPidRef remembers which pid each persisted note is linked to so
  // we can notice when that pid's live index has drifted from
  // note.paragraphIndex.
  const pidCounterRef = useRef(0);
  const pidToIndexRef = useRef(new Map());
  const noteIdToPidRef = useRef(new Map());

  // ── Appearance state ────────────────────────────────────────────────
  const [paperStyle, setPaperStyle] = useState("blank");   // "blank" | "notebook"
  const [paperTheme, setPaperTheme] = useState("light");   // "dark" | "light"
  const [fontFamily, setFontFamily] = useState("default"); // "default" | "handwritten"

  // ── Content state ───────────────────────────────────────────────────
  const [wordCount, setWordCount] = useState(0);
  const [paragraphRects, setParagraphRects] = useState([]); // [{index, top, height}]

  // ── Notes state ──────────────────────────────────────────────────────
  // With a draftId: real API calls via useDraftStickyNotes. Without one:
  // local-only state (or the notes/onNotesChange props, if the parent
  // wants to control it) — same fallback as before, for contexts with no
  // draft to attach notes to yet.
  //
  // Both the overall (whole-draft) note and paragraph notes are MULTI: a
  // scope can carry more than one sticky, so "add" always creates a new
  // note rather than finding-or-updating one by scope — true for both the
  // local (no draftId) path and the draftId-backed API path
  // (useDraftStickyNotes' createOverallNote/createParagraphNote/updateNote/
  // removeNote address notes by id, never by paragraphIndex).
  const api = useDraftStickyNotes(draftId);
  const [localNotes, setLocalNotes] = useState([]);
  const notes = draftId ? api.notes : (notesProp ?? localNotes);

  // Always creates a brand-new whole-draft note — never merges into an
  // existing one — so the overall scope can accumulate several stickies,
  // same as a paragraph can.
  const addOverallNote = useCallback(
    (patch = {}) => {
      if (draftId) return api.createOverallNote(patch);
      setLocalNotes((prev) => {
        const next = [...prev, { id: nextLocalId(), paragraphIndex: null, color: "YELLOW", text: "", items: [], ...patch }];
        onNotesChange?.(next);
        return next;
      });
    },
    [draftId, api, onNotesChange]
  );

  // Always creates a brand-new note on this paragraph — never merges into
  // an existing one — so a paragraph can accumulate several stickies.
  const addParagraphNote = useCallback(
    (paragraphIndex, patch = {}) => {
      if (draftId) return api.createParagraphNote(paragraphIndex, patch);
      setLocalNotes((prev) => {
        const next = [...prev, { id: nextLocalId(), paragraphIndex, color: "YELLOW", text: "", items: [], ...patch }];
        onNotesChange?.(next);
        return next;
      });
    },
    [draftId, api, onNotesChange]
  );

  // Edits/removes a specific note by identity (not by paragraph — a
  // paragraph can have several, so paragraphIndex alone can't say which).
  const updateNoteRecord = useCallback(
    (note, patch) => {
      if (draftId) return api.updateNote(note.id, patch);
      setLocalNotes((prev) => {
        const next = prev.map((n) => (n.id === note.id ? { ...n, ...patch } : n));
        onNotesChange?.(next);
        return next;
      });
    },
    [draftId, api, onNotesChange]
  );

  const deleteNoteRecord = useCallback(
    (note) => {
      if (draftId) return api.removeNote(note.id);
      setLocalNotes((prev) => {
        const next = prev.filter((n) => n.id !== note.id);
        onNotesChange?.(next);
        return next;
      });
    },
    [draftId, api, onNotesChange]
  );

  // Mirrors the resolved `notes` array out to the parent on every change,
  // regardless of draftId — the local-only branches above already call
  // onNotesChange themselves, but api-backed notes (draftId set) never did,
  // which left a caller like the Sprint Room's Note Mode sidebar with no
  // way to read the list without its own hook instance.
  useEffect(() => {
    onNotesChange?.(notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  // ALL whole-draft notes, in creation order (overall is no longer a
  // single slot — a draft can carry several, same as a paragraph can).
  const overallNotes = useMemo(() => notes.filter((n) => n.paragraphIndex == null), [notes]);
  // paragraphIndex -> ALL notes pinned there (not just one), in creation order.
  const notesByParagraph = useMemo(() => {
    const map = new Map();
    for (const n of notes) {
      if (n.paragraphIndex == null) continue;
      const arr = map.get(n.paragraphIndex) || [];
      arr.push(n);
      map.set(n.paragraphIndex, arr);
    }
    return map;
  }, [notes]);

  // Which note popover is open — { kind: "overall" } | { kind: "paragraph", index } | null
  const [openNote, setOpenNote] = useState(null);

  // ── Init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const el = editorRef.current;
    if (!el) return;
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      /* not all browsers support this — falls back to native Enter behavior */
    }
    el.innerHTML = initialContent && initialContent.trim() ? initialContent : "<p><br></p>";
    syncGutter();
    updateWordCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gutter sync — keeps sticky-note markers aligned to their paragraph ──
  const syncGutter = useCallback(() => {
    const container = editorRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    const blocks = Array.from(container.children);
    const pidToIndex = new Map();
    const rects = blocks.map((el, index) => {
      // First time we see this element, tag it with a stable id — it keeps
      // this id for as long as the element instance itself survives (i.e.
      // until the paragraph is deleted), independent of what index it's at.
      if (!el.dataset.spid) el.dataset.spid = `p${pidCounterRef.current++}`;
      pidToIndex.set(el.dataset.spid, index);
      const r = el.getBoundingClientRect();
      return { index, top: r.top - containerTop, height: r.height };
    });
    pidToIndexRef.current = pidToIndex;
    setParagraphRects(rects);
    return blocks;
  }, []);

  // Links any not-yet-linked paragraph note to the pid of the paragraph it
  // currently sits on, then checks every linked note's pid against its live
  // index — resyncing (server PATCH, or local state for unsaved drafts)
  // whenever they've drifted apart. Safe to call often; everything here is
  // a no-op once a note is already linked and in sync.
  const reconcileNoteParagraphPositions = useCallback(() => {
    const container = editorRef.current;
    if (!container) return;
    const blocks = container.children;

    for (const note of notes) {
      if (note.paragraphIndex == null) continue; // whole-draft note, not paragraph-pinned

      if (!noteIdToPidRef.current.has(note.id)) {
        const block = blocks[note.paragraphIndex];
        if (block) {
          if (!block.dataset.spid) block.dataset.spid = `p${pidCounterRef.current++}`;
          noteIdToPidRef.current.set(note.id, block.dataset.spid);
        }
        continue; // just linked — nothing to reconcile yet this pass
      }

      const pid = noteIdToPidRef.current.get(note.id);
      const liveIndex = pidToIndexRef.current.get(pid);
      // liveIndex undefined means the paragraph was deleted — leave the
      // note where it is rather than guessing (see hook header comment).
      if (liveIndex != null && liveIndex !== note.paragraphIndex) {
        if (draftId) {
          api.resyncParagraphIndex(note.id, liveIndex);
        } else {
          setLocalNotes((prev) => {
            const next = prev.map((n) => (n.id === note.id ? { ...n, paragraphIndex: liveIndex } : n));
            onNotesChange?.(next);
            return next;
          });
        }
      }
    }
  }, [notes, draftId, api, onNotesChange]);

  // Re-link/reconcile whenever the notes list changes — covers notes that
  // just finished loading from the API, a note just created on this
  // paragraph, and a resync that already landed.
  useEffect(() => {
    reconcileNoteParagraphPositions();
  }, [notes, reconcileNoteParagraphPositions]);

  useEffect(() => {
    const container = editorRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncGutter());
    ro.observe(container);
    window.addEventListener("resize", syncGutter);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncGutter);
    };
  }, [syncGutter]);

  function updateWordCount() {
    const text = editorRef.current?.innerText || "";
    const count = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(count);
    return { text, count };
  }

  function handleInput() {
    const { text, count } = updateWordCount();
    syncGutter();
    reconcileNoteParagraphPositions();
    // A paragraph the writer deleted entirely should take its note with it —
    // otherwise a gutter marker would point at whatever paragraph slid into
    // that index next.
    const currentParagraphCount = editorRef.current.children.length;
    if (!draftId) {
      // Local-only mode: drop notes whose paragraph got deleted from the
      // end. (In API mode we deliberately don't auto-delete — see
      // useDraftStickyNotes.js's header comment on paragraphIndex drift;
      // silently deleting a persisted note here would be surprising.)
      setLocalNotes((prev) => {
        const next = prev.filter((n) => n.paragraphIndex == null || n.paragraphIndex < currentParagraphCount);
        onNotesChange?.(next);
        return next;
      });
    }
    if (openNote?.kind === "paragraph" && openNote.index >= currentParagraphCount) setOpenNote(null);
    onChange?.(editorRef.current.innerHTML, text, count);
  }

  // ── Toolbar commands ────────────────────────────────────────────────
  function exec(command, value = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  }

  // Which top-level paragraph the caret currently sits in (0-based), or
  // null if there's no selection inside the editor. Walks the selection's
  // anchor up to whichever direct child of the editor it lives under.
  const getCaretParagraphIndex = useCallback(() => {
    const container = editorRef.current;
    if (!container) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node = sel.getRangeAt(0).startContainer;
    if (!container.contains(node)) return null;
    while (node && node.parentNode !== container) node = node.parentNode;
    if (!node) return null;
    const idx = Array.from(container.children).indexOf(node);
    return idx === -1 ? null : idx;
  }, []);

  // ── Imperative API for parents that need to act on notes/caret from
  //    outside the toolbar — e.g. the Sprint Room's Note Mode sidebar (add
  //    a note "here," open/close a note by paragraph) and its Ctrl+K quick
  //    marker (drops a note on whatever paragraph the caret is in without
  //    the writer ever leaving the keyboard).
  useImperativeHandle(
    ref,
    () => ({
      focusEditor: () => editorRef.current?.focus(),
      getCaretParagraphIndex,
      getParagraphCount: () => editorRef.current?.children.length || 0,
      // Always adds a NEW whole-draft note — the overall scope can carry
      // more than one sticky now, same as a paragraph can.
      addOverallNote: (patch) => addOverallNote(patch),
      // Always adds a NEW note on that paragraph — a paragraph can carry
      // more than one sticky now.
      addParagraphNote: (index, patch) => addParagraphNote(index, patch),
      // Edits/removes one specific note by id — needed since a scope may
      // have several notes, so paragraphIndex alone can't identify one.
      updateNote: (id, patch) => {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        return updateNoteRecord(note, patch);
      },
      removeNote: (id) => {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        return deleteNoteRecord(note);
      },
      // Quick marker: drops a brand-new note on whatever paragraph the
      // caret is in. Accepts an optional pre-captured paragraphIndex —
      // callers that pop open their own UI to compose the note text (e.g.
      // the Sprint Room's Ctrl+K box) steal focus away from the editor in
      // the process, which loses the DOM selection this would otherwise
      // read at call time. Capture getCaretParagraphIndex() the moment the
      // shortcut fires, before that focus shift happens, and pass it in
      // here instead of relying on this method to still find it later.
      quickNoteAtCaret: (text, paragraphIndex) => {
        const idx = paragraphIndex ?? getCaretParagraphIndex();
        if (idx == null) return false;
        addParagraphNote(idx, { text });
        return true;
      },
    }),
    [getCaretParagraphIndex, addOverallNote, addParagraphNote, updateNoteRecord, deleteNoteRecord, notes]
  );

  const isDark = paperTheme === "dark";
  const bgVar = isDark ? "--editor-paper-dark-bg" : "--editor-paper-light-bg";
  const inkVar = isDark ? "--editor-paper-dark-ink" : "--editor-paper-light-ink";
  const ruleVar = isDark ? "--editor-paper-dark-rule" : "--editor-paper-light-rule";
  const marginVar = isDark ? "--editor-paper-dark-margin" : "--editor-paper-light-margin";

  const paperBackground =
    paperStyle === "notebook"
      ? `repeating-linear-gradient(
           to bottom,
           transparent 0px,
           transparent 34px,
           hsl(var(${ruleVar}) / 0.14) 34px,
           hsl(var(${ruleVar}) / 0.14) 35px
         ),
         linear-gradient(
           to right,
           transparent 55px,
           hsl(var(${marginVar}) / 0.55) 55px,
           hsl(var(${marginVar}) / 0.55) 56px,
           transparent 56px
         )`
      : "none";

  return (
    <div
      className={`flex flex-col transition-colors duration-200 ${className}`}
      style={{ backgroundColor: `hsl(var(${bgVar}))` }}
    >
      {/* One continuous flat surface, top to bottom — no floating "sheet on
          a desk" card, no shadow, no gap around it showing a different
          background through. This wrapper IS the page: same color behind
          the toolbar as behind the paper, just like a normal editor
          (Google Docs, Substack, etc). Whatever mounts this component no
          longer needs to supply its own background for it to sit on. */}
      {!hideToolbar && (
        <Toolbar
          exec={exec}
          paperStyle={paperStyle}
          setPaperStyle={setPaperStyle}
          paperTheme={paperTheme}
          setPaperTheme={setPaperTheme}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          overallNotes={overallNotes}
          onToggleOverallNote={() => setOpenNote((o) => (o?.kind === "overall" ? null : { kind: "overall" }))}
          wordCount={wordCount}
          showNotes={showNotes}
        />
      )}

      {/* The only scrollable element in here — the toolbar above stays put;
          only the page's own text moves. No separate "sheet" div wrapping
          this: the paper's background IS the whole component's background
          (set above), so there's nothing visually distinguishing a "card"
          from the space around it — it just reads as one page. */}
      <div ref={paperRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide" onScroll={syncGutter}>
        <div
          className="relative mx-auto py-10 px-6 md:px-10"
          style={{ maxWidth: `${maxWidthPx}px`, backgroundImage: paperBackground }}
        >
          {/* Paragraph highlight — a soft tint behind whichever paragraph
              highlightParagraphIndex points at, so it's unambiguous which
              paragraph an in-progress action will apply to. Sits before
              the editor/gutter in the DOM (and has no z-index of its own)
              so it paints behind the text rather than over it. */}
          {highlightParagraphIndex != null &&
            (() => {
              const rect = paragraphRects.find((r) => r.index === highlightParagraphIndex);
              if (!rect) return null;
              return (
                <div
                  className="absolute left-0 right-0 rounded-md pointer-events-none transition-opacity duration-150"
                  style={{
                    top: `calc(2.5rem + ${rect.top}px)`,
                    height: rect.height,
                    backgroundColor: "hsl(var(--social-500) / 0.1)",
                    outline: "1px solid hsl(var(--social-500) / 0.35)",
                  }}
                />
              );
            })()}

          {/* Gutter — one numbered badge per paragraph, always visible
              (not hover-gated) so a writer can see at a glance which
              paragraphs already have a note pinned to them. */}
          {(showNotes || onSelectParagraphNote) && (
            <div ref={gutterRef} className="absolute -left-1 top-10 bottom-10 w-8">
              {paragraphRects.map((rect) => (
                <ParagraphBadge
                  key={rect.index}
                  top={rect.top}
                  height={rect.height}
                  paragraphNumber={rect.index + 1}
                  notes={notesByParagraph.get(rect.index) || []}
                  onClick={() => {
                    if (onSelectParagraphNote) {
                      onSelectParagraphNote(rect.index);
                    } else {
                      setOpenNote((o) =>
                        o?.kind === "paragraph" && o.index === rect.index ? null : { kind: "paragraph", index: rect.index }
                      );
                    }
                  }}
                />
              ))}
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            data-placeholder={placeholder}
            className="editor-surface outline-none leading-relaxed min-h-[70vh]"
            style={{
              color: `hsl(var(${inkVar}))`,
              fontFamily: fontFamily === "handwritten" ? "var(--font-handwritten)" : "var(--font-paper-serif)",
              fontSize: fontFamily === "handwritten" ? "1.35rem" : "1.0625rem",
              caretColor: "hsl(var(--social-500))",
              paddingLeft: paperStyle === "notebook" ? "1.75rem" : "0",
              "--editor-placeholder": JSON.stringify(placeholder),
            }}
          />
        </div>
      </div>

      {/* Sticky notes — a single slide-in panel from the right, shared by
          both the overall (draft-level) notes and every paragraph's notes;
          the scope just changes what it's showing. Only rendered when this
          component owns its own notes UI (showNotes) — a parent with its
          own sidebar (Sprint Room's Note Mode) uses onSelectParagraphNote
          + the ref API instead and never sees this. */}
      {showNotes && (
        <NotesSlidePanel
          isOpen={!!openNote}
          scopeLabel={openNote?.kind === "overall" ? "Whole draft" : openNote ? `Paragraph ${openNote.index + 1}` : ""}
          isOverall={openNote?.kind === "overall"}
          notes={openNote?.kind === "overall" ? overallNotes : openNote ? notesByParagraph.get(openNote.index) || [] : []}
          onAdd={(patch) => (openNote?.kind === "overall" ? addOverallNote(patch) : addParagraphNote(openNote.index, patch))}
          onSave={(note, patch) => updateNoteRecord(note, patch)}
          onDelete={(note) => deleteNoteRecord(note)}
          onClose={() => setOpenNote(null)}
        />
      )}

      <style>{`
        .editor-surface:empty::before,
        .editor-surface p:only-child:empty::before,
        .editor-surface p:only-child:has(> br:only-child)::before {
          content: var(--editor-placeholder);
          color: hsl(var(${inkVar}) / 0.4);
          pointer-events: none;
        }
        .editor-surface p { margin: 0 0 1.1em 0; }
        .editor-surface p:last-child { margin-bottom: 0; }

        /* Toolbar chrome — tied to the SAME ink variable as the page text,
           so the toolbar's icons/dividers/border stay legible whichever
           paper theme (black page vs white page) is active, without a
           separate dark card behind them. */
        .toolbar-border { border-color: hsl(var(${inkVar}) / 0.12); }
        .toolbar-btn { color: hsl(var(${inkVar}) / 0.55); }
        .toolbar-btn:hover { color: hsl(var(${inkVar})); background-color: hsl(var(${inkVar}) / 0.08); }
        .toolbar-divider { background-color: hsl(var(${inkVar}) / 0.15); }
        .toolbar-label { color: hsl(var(${inkVar}) / 0.85); }
        .toolbar-segment { border-color: hsl(var(${inkVar}) / 0.15); }
        .toolbar-segment-inactive { color: hsl(var(${inkVar}) / 0.65); }
        .toolbar-segment-inactive:hover { background-color: hsl(var(${inkVar}) / 0.08); }
        .toolbar-count { color: hsl(var(${inkVar}) / 0.55); }
      `}</style>
    </div>
  );
});

export default WriteEditorShared;

// ── Toolbar ────────────────────────────────────────────────────────────

function Toolbar({
  exec, paperStyle, setPaperStyle, paperTheme, setPaperTheme,
  fontFamily, setFontFamily, overallNotes, onToggleOverallNote, wordCount,
  showNotes = true,
}) {
  // Flush top bar — same background as the page below it (inherited from
  // the parent), just a thin bottom border to separate it, the way a
  // normal editor's toolbar sits (no floating rounded pill, no shadow).
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-4 md:px-6 py-3 border-b toolbar-border">
      <div className="flex items-center gap-1.5 flex-wrap">
        <ToolbarIconButton icon={Bold} label="Bold" onClick={() => exec("bold")} />
        <ToolbarIconButton icon={Italic} label="Italic" onClick={() => exec("italic")} />
        <ToolbarIconButton icon={Underline} label="Underline" onClick={() => exec("underline")} />
        <Divider />
        <ToolbarIconButton icon={Undo2} label="Undo" onClick={() => exec("undo")} />
        <ToolbarIconButton icon={Redo2} label="Redo" onClick={() => exec("redo")} />
        <Divider />
        {FONT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            aria-label={`Text color: ${c.label}`}
            onClick={() => exec("foreColor", c.value)}
            className={`h-6 w-6 rounded-full hover:scale-110 transition-transform ${
              c.value === "#ffffff"
                ? "border border-black/20 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
                : "border border-black/10"
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <SegmentedToggle
          value={paperStyle}
          onChange={setPaperStyle}
          options={[
            { value: "blank", label: "Blank", icon: FileText },
            { value: "notebook", label: "Ruled", icon: BookOpen },
          ]}
        />
        <SegmentedToggle
          value={paperTheme}
          onChange={setPaperTheme}
          options={[
            { value: "dark", label: "Black page", icon: Moon },
            { value: "light", label: "White page", icon: Sun },
          ]}
        />
        <SegmentedToggle
          value={fontFamily}
          onChange={setFontFamily}
          options={[
            { value: "default", label: "Default", icon: Type },
            { value: "handwritten", label: "Handwritten", icon: null, sample: "Aa" },
          ]}
        />
        <Divider />
        <span className="text-xs toolbar-count tabular-nums px-1">{wordCount} words</span>
        {showNotes && (
          <Button
            size="sm"
            variant={overallNotes.length > 0 ? "default" : "outline"}
            onClick={onToggleOverallNote}
            className="rounded-lg gap-1.5"
            style={
              overallNotes.length > 0
                ? { backgroundColor: STICKY_COLORS.YELLOW.bg, color: "#3a2f14" }
                : { borderColor: "hsl(var(--social-500))", color: "hsl(var(--social-500))" }
            }
          >
            <StickyNote className="h-3.5 w-3.5" />
            {overallNotes.length > 0
              ? `Overall note${overallNotes.length > 1 ? `s (${overallNotes.length})` : ""}`
              : "Add overall note"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ToolbarIconButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()} // preserve text selection when clicking
      onClick={onClick}
      className="toolbar-btn h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SegmentedToggle({ value, onChange, options }) {
  return (
    <div className="toolbar-segment flex items-center rounded-lg border p-0.5 gap-0.5">
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={`h-7 px-2.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
              active ? "" : "toolbar-segment-inactive"
            }`}
            style={active ? { backgroundColor: "hsl(var(--social-500))", color: "white" } : undefined}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {opt.sample && <span style={{ fontFamily: "var(--font-handwritten)" }}>{opt.sample}</span>}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Divider() {
  return <span className="toolbar-divider w-px h-5 mx-1" />;
}

// ── Gutter badge ─────────────────────────────────────────────────────────
// Always visible (not hover-gated) — a plain numbered circle for an empty
// paragraph, filled pale-yellow once that paragraph has at least one note
// pinned to it, so a writer can see at a glance which paragraphs already
// have notes without opening anything. A small count chip appears once a
// paragraph has more than one note. Clicking always opens that paragraph's
// notes (creating the first is just saving into an empty composer).
function ParagraphBadge({ top, height, notes, paragraphNumber, onClick }) {
  const count = notes?.length || 0;
  const hasNotes = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        hasNotes
          ? `${count} note${count > 1 ? "s" : ""} on paragraph ${paragraphNumber}`
          : `Add a note on paragraph ${paragraphNumber}`
      }
      className="absolute left-0 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold border shadow-sm transition-transform hover:scale-110"
      style={{
        top: top + Math.min(height, 28) / 2 - 12,
        backgroundColor: hasNotes ? "#fff59d" : "#faf7f2",
        borderColor: hasNotes ? "#e8dd6a" : "#c9b494",
        color: hasNotes ? "#7a6a20" : "#9a8c7a",
      }}
    >
      {paragraphNumber}
      {count > 1 && (
        <span
          className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none"
          style={{ backgroundColor: "#2d3748", color: "#fff" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Sticky note card — the actual "paper" ───────────────────────────────
// A real-looking sticky: pastel gradient, a taped-down top edge, a folded
// bottom corner, and a slight hand-placed rotation (stable per note, so it
// doesn't jitter on re-render). Exported so any parent building its own
// notes surface — e.g. the Sprint Room's Note Mode sidebar — renders the
// exact same note look instead of a plainer inline card.
export function StickyNoteCard({ note, onEdit, onDelete }) {
  const palette = STICKY_COLORS[note.color] || STICKY_COLORS.YELLOW;
  const angle = stableAngle(note.id);

  return (
    <div
      className="relative rounded-sm p-4 pt-6 group transition-transform duration-150 hover:z-10 hover:scale-[1.03] hover:rotate-0"
      style={{
        background: `linear-gradient(160deg, ${palette.bg} 0%, ${palette.bg} 80%, ${palette.edge} 100%)`,
        boxShadow: "2px 6px 14px rgba(35,22,8,0.28), 0 1px 0 rgba(255,255,255,0.4) inset",
        transform: `rotate(${angle}deg)`,
        fontFamily: "var(--font-handwritten)",
        minHeight: "110px",
      }}
    >
      {/* "Tape" strip across the top */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-5 rounded-[2px]"
        style={{ background: palette.tape, boxShadow: "0 1px 2px rgba(0,0,0,0.15)", transform: `rotate(${-angle * 0.6}deg)` }}
      />
      {/* Folded corner */}
      <div
        className="absolute bottom-0 right-0 w-0 h-0"
        style={{ borderStyle: "solid", borderWidth: "0 0 16px 16px", borderColor: "transparent transparent transparent rgba(0,0,0,0.12)" }}
      />

      {(onEdit || onDelete) && (
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button onClick={onEdit} title="Edit note" className="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[#3a2f14]">
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} title="Delete note" className="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[#3a2f14]">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {note.text && (
        <p className="text-[16px] leading-snug text-[#3a2f14] whitespace-pre-wrap break-words">{note.text}</p>
      )}
      {note.items?.length > 0 && (
        <ul className={`space-y-1 ${note.text ? "mt-2" : ""}`}>
          {note.items.map((item, i) => (
            <li key={i} className="text-[15px] leading-snug text-[#3a2f14] flex gap-1.5">
              <span>–</span>
              <span className="break-words">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Composer (add / edit) ────────────────────────────────────────────────
// Exported alongside StickyNoteCard for the same reason — a parent with
// its own notes surface should be able to reuse the exact same "add a
// note" experience, colour swatches and all.
export function NoteComposer({ note, onSave, onCancel, onDelete }) {
  const [color, setColor] = useState(note?.color || "YELLOW");
  const [text, setText] = useState(note?.text || "");
  const [items, setItems] = useState(note?.items || []);
  const [itemDraft, setItemDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const palette = STICKY_COLORS[color];

  function addItem() {
    const v = itemDraft.trim();
    if (!v) return;
    setItems((prev) => [...prev, v]);
    setItemDraft("");
  }
  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!text.trim() && items.length === 0) {
      setError("Add some text or at least one list item.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ color, text, items });
    } catch (e) {
      setError(e?.message || "Couldn't save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-sm p-4"
      style={{ background: palette.bg, fontFamily: "var(--font-handwritten)", boxShadow: "2px 6px 14px rgba(35,22,8,0.28)" }}
    >
      <div className="flex gap-1.5 mb-3">
        {Object.keys(STICKY_COLORS).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setColor(key)}
            title={STICKY_COLORS[key].label}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${color === key ? "scale-110 border-[#3a2f14]" : "border-white/70"}`}
            style={{ background: STICKY_COLORS[key].bg }}
          />
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you want to fix or add here?"
        rows={3}
        className="w-full bg-transparent border-none outline-none resize-none text-[16px] text-[#3a2f14] placeholder-[#3a2f14]/50"
      />

      {items.length > 0 && (
        <ul className="space-y-1 mb-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[14px] text-[#3a2f14]">
              <span>–</span>
              <span className="flex-1 break-words">{item}</span>
              <button type="button" onClick={() => removeItem(i)} className="opacity-50 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <input
          value={itemDraft}
          onChange={(e) => setItemDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          placeholder="Add a checklist item…"
          className="flex-1 px-2 py-1 text-[13px] rounded bg-white/40 outline-none placeholder-[#3a2f14]/40 text-[#3a2f14]"
        />
        <button type="button" onClick={addItem} className="text-[13px] px-2 py-1 rounded bg-white/50 hover:bg-white/70 text-[#3a2f14] font-semibold">
          +
        </button>
      </div>

      {error && <p className="text-xs text-red-800 mt-2">{error}</p>}

      <div className="flex items-center justify-between gap-2 mt-3">
        {note && onDelete ? (
          <button type="button" onClick={onDelete} className="text-xs px-1 py-1.5 text-[#3a2f14]/70 hover:text-red-800">
            Delete note
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="text-xs px-3 py-1.5 rounded text-[#3a2f14]/70 hover:text-[#3a2f14]">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded bg-[#2d3748] text-white font-semibold hover:bg-[#3d4f64] disabled:opacity-50"
          >
            {saving ? "Saving…" : note ? "Save changes" : "Add note"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Right-side slide-in panel ────────────────────────────────────────────
// One panel, shared by both the overall note and every paragraph's notes —
// `scopeLabel`/`notes` just change what it's showing. The overall note
// stays a single slot (find-it-or-compose-it); a paragraph can hold several
// notes now, so this renders all of them as real StickyNoteCards stacked
// in order, with an "add another" composer underneath.
function NotesSlidePanel({ isOpen, scopeLabel, isOverall, notes, onAdd, onSave, onDelete, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  useEffect(() => {
    setEditingId(null);
    setComposerOpen(false);
  }, [scopeLabel]);

  const showComposer = composerOpen || notes.length === 0;

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <div
        className={`fixed right-0 top-0 h-full z-40 w-96 max-w-[90vw] bg-[#faf7f2] border-l border-[#e8dcc8] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8dcc8] flex-shrink-0">
          <div>
            <p className="text-xs text-[#9a8c7a] font-semibold uppercase tracking-wider">Sticky notes</p>
            <p className="text-sm font-display text-[#2d3748]">{scopeLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f0ebe3] flex items-center justify-center text-[#9a8c7a] hover:bg-[#e8e0d0] hover:text-[#2d3748] transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {notes.map((n) =>
            editingId === n.id ? (
              <NoteComposer
                key={n.id}
                note={n}
                onSave={async (patch) => { await onSave(n, patch); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
                onDelete={() => { onDelete(n); setEditingId(null); }}
              />
            ) : (
              <StickyNoteCard key={n.id} note={n} onEdit={() => setEditingId(n.id)} onDelete={() => onDelete(n)} />
            )
          )}

          {showComposer ? (
            <NoteComposer
              onSave={async (patch) => { await onAdd(patch); setComposerOpen(false); }}
              onCancel={notes.length > 0 ? () => setComposerOpen(false) : onClose}
            />
          ) : (
            // Both scopes can hold more than one note now, so "add another"
            // always shows once at least one note already exists.
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="w-full text-sm text-[#2d3748] hover:underline flex items-center justify-center gap-1.5 py-2 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> {isOverall ? "Add another whole-draft note" : "Add another note here"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}