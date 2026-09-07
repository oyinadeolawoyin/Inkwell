// src/components/drafts/draftsApi.js
import API_URL from "../../config/api";

async function request(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: options.body instanceof FormData
      ? undefined
      : { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

const FOLDERS = `${API_URL}/draftfolders`;
const DRAFTS  = `${API_URL}/drafts`;

// ── Folders ──────────────────────────────────────────────────────────────
// getMyFolders() comes back sorted server-side — plan folders first, then
// most-recently-touched within each group — so folders[0] is always "the
// folder the writer last worked on."
export const getMyFolders        = () => request(FOLDERS, "/", { method: "GET" });
export const getFolderOptions    = () => request(FOLDERS, "/options", { method: "GET" });
export const getFolderWithDrafts = (folderId) => request(FOLDERS, `/${folderId}`, { method: "GET" });
export const renameFolder        = (folderId, name) =>
  request(FOLDERS, `/${folderId}`, { method: "PATCH", body: JSON.stringify({ name }) });

// ── Drafts ───────────────────────────────────────────────────────────────
export const createDraft     = ({ folderId, title, content } = {}) =>
  request(DRAFTS, "/", { method: "POST", body: JSON.stringify({ folderId, title, content }) });
export const getDraft        = (draftId) => request(DRAFTS, `/${draftId}`, { method: "GET" });
export const updateDraft     = (draftId, { title, content } = {}) =>
  request(DRAFTS, `/${draftId}`, { method: "PATCH", body: JSON.stringify({ title, content }) });
export const toggleDraftStar = (draftId) => request(DRAFTS, `/${draftId}/star`, { method: "PATCH" });
export const deleteDraft     = (draftId) => request(DRAFTS, `/${draftId}`, { method: "DELETE" });

// Called from the Sprint Room's autosave: creates a draft on the first
// save of a sprint that didn't start from an existing draft file, updates
// one that did. Prefer plain updateDraft() once you already have a
// draftId — this one only exists for the "no draft yet" → "now there's a
// draft" handoff.
export const sprintAutoSaveDraft = ({ draftId, folderId, title, content } = {}) =>
  request(DRAFTS, "/sprint-save", {
    method: "POST",
    body: JSON.stringify({ draftId, folderId, title, content }),
  });

// ── Sticky notes (writer-private, per WritingDraft) ─────────────────────
// paragraphIndex omitted/null = whole-draft note; 0-based int = paragraph
// note. updateStickyNote can also re-pin a note to a new paragraphIndex —
// pass it only when re-pinning (e.g. from resyncParagraphIndex in
// useDraftStickyNotes.js); omit it on ordinary text/color/items edits so
// the pin is left untouched.
export const getStickyNotes    = (draftId) => request(DRAFTS, `/${draftId}/sticky-notes`, { method: "GET" });
export const createStickyNote  = (draftId, { paragraphIndex = null, color, text, items } = {}) =>
  request(DRAFTS, `/${draftId}/sticky-notes`, {
    method: "POST",
    body: JSON.stringify({ paragraphIndex, color, text, items }),
  });
export const updateStickyNote  = (draftId, noteId, { color, text, items, paragraphIndex } = {}) =>
  request(DRAFTS, `/${draftId}/sticky-notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(
      paragraphIndex !== undefined ? { color, text, items, paragraphIndex } : { color, text, items }
    ),
  });
export const deleteStickyNote  = (draftId, noteId) =>
  request(DRAFTS, `/${draftId}/sticky-notes/${noteId}`, { method: "DELETE" });