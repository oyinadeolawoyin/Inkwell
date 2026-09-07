// src/components/editor/useDraftStickyNotes.js
//
// Backs WriteEditorShared's sticky notes with the real API from
// draftservice.js / draftcontroller.js / draftroutes.js. Only active when
// a draftId is passed in — WriteEditorShared falls back to plain local
// state when there's no draft to attach notes to yet (e.g. a brand-new
// sprint that hasn't been saved as a draft file).
//
// ── Paragraph drift fix ──────────────────────────────────────────────────
// A note's paragraphIndex is fixed at creation. If the writer later inserts
// a paragraph above a noted one, everything below shifts down by one, but
// the note doesn't — it silently ends up pointing at the wrong paragraph.
// updateStickyNote now accepts paragraphIndex in its PATCH body (see
// draftservice.js), so resyncParagraphIndex below lets the caller re-pin a
// note once it detects that drift. WriteEditorShared is the one that
// detects it — it tracks each noted paragraph's DOM identity independently
// of index, notices when that identity's live index no longer matches
// note.paragraphIndex, and calls this. This hook doesn't try to detect
// drift itself, since it has no view into the DOM.
//
// ── Multi-note-per-scope ───────────────────────────────────────────────
// A paragraph can carry more than one note, AND the whole-draft ("overall")
// note is no longer capped at one either — both scopes work the same way
// now. createNote always POSTs a new row (paragraphIndex === null for the
// overall scope, an int for a paragraph); updateNote/removeNote always act
// on one specific note by id. Looking a note up "by paragraphIndex" the way
// an old single save()/remove() pair once did would silently collide two
// notes in the same scope into one — so nothing here does that anymore.
import { useCallback, useEffect, useState } from "react";
import {
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
} from "../drafts/draftsapi";

export function useDraftStickyNotes(draftId) {
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(!draftId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draftId) {
      setNotes([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    getStickyNotes(draftId)
      .then(({ notes }) => setNotes(notes))
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [draftId]);

  // Always POSTs a brand-new note — paragraphIndex === null is the
  // whole-draft ("overall") note, any int pins it to that paragraph. Both
  // scopes can hold several notes now, so "add" never finds-and-updates an
  // existing one the way the old single-slot overall note used to.
  const createNote = useCallback(
    async (paragraphIndex, patch) => {
      if (!draftId) return;
      const hasContent = (patch.text && patch.text.trim()) || (patch.items && patch.items.length > 0);
      if (!hasContent) return;
      try {
        const { note } = await createStickyNote(draftId, { paragraphIndex, ...patch });
        setNotes((prev) => [...prev, note]);
        return note;
      } catch (err) {
        setError(err.message);
      }
    },
    [draftId]
  );

  // Thin, named wrappers around createNote — same call, just pinned to a
  // scope so callers don't have to remember "null means overall."
  const createOverallNote = useCallback((patch) => createNote(null, patch), [createNote]);
  const createParagraphNote = useCallback(
    (paragraphIndex, patch) => createNote(paragraphIndex, patch),
    [createNote]
  );

  // Edits/removes one specific note by id — the only safe way to address a
  // note now that neither scope caps out at one.
  const updateNote = useCallback(
    async (noteId, patch) => {
      if (!draftId) return;
      try {
        const { note } = await updateStickyNote(draftId, noteId, patch);
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      } catch (err) {
        setError(err.message);
      }
    },
    [draftId]
  );

  const removeNote = useCallback(
    async (noteId) => {
      if (!draftId) return;
      const prevNotes = notes;
      setNotes((prev) => prev.filter((n) => n.id !== noteId)); // optimistic
      try {
        await deleteStickyNote(draftId, noteId);
      } catch (err) {
        setError(err.message);
        setNotes(prevNotes); // roll back on failure
      }
    },
    [draftId, notes]
  );

  // Re-pins a note to a new paragraphIndex without touching its text/color/
  // items — called by WriteEditorShared when it notices a noted paragraph's
  // live position no longer matches note.paragraphIndex. Optimistic with
  // rollback, same pattern as removeNote(), since this fires silently in
  // the background while the writer keeps typing.
  const resyncParagraphIndex = useCallback(
    async (noteId, newParagraphIndex) => {
      if (!draftId) return;
      const prevNotes = notes;
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, paragraphIndex: newParagraphIndex } : n))
      );
      try {
        const { note } = await updateStickyNote(draftId, noteId, { paragraphIndex: newParagraphIndex });
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      } catch (err) {
        setError(err.message);
        setNotes(prevNotes); // roll back on failure
      }
    },
    [draftId, notes]
  );

  return {
    notes,
    loaded,
    error,
    createOverallNote,
    createParagraphNote,
    updateNote,
    removeNote,
    resyncParagraphIndex,
  };
}