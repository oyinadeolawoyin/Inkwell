// src/components/drafts/DraftsPage.jsx
//
// Folder-of-files view for a writer's drafts — redesigned to match the
// DraftPlan Figma reference: near-black page background, individual dark
// row-cards (not one big wrapping panel), sky-blue accents on icons/rings/
// primary actions, uppercase eyebrow labels, and a right sidebar with a
// percent-drafted ring for the selected folder.
//
// Sidebar structure (per the reference + the "don't lump General in with
// draft plans" note):
//   1. Spotlight — the selected folder's name, plus a ring+% if it's a
//      plan folder (the General folder has no target, so no ring).
//   2. "Other draft plans" — every OTHER plan folder, each with a %.
//      The General folder never appears in this list.
//   3. A standalone General-folder row underneath, on its own — folder
//      icon, no percentage, click it to browse everything filed under
//      General in the main column. Hidden only when General is already
//      the thing being spotlighted.
//
// Each draft file row shows: star toggle, word count, last sprint length,
// last-worked date, and a Sprint button. No progress bars on files — that
// belongs to plans, not individual drafts, which have no per-file target.
//
// Colors are all semantic --{tone}-* tokens from index.css. No raw hex.

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, PenLine, Star, FolderOpen, FileText,
  Plus, Info, ChevronRight, ChevronDown, Clock, Type, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMyFolders, getFolderWithDrafts, createDraft, updateDraft, toggleDraftStar } from "./draftsapi";

export default function DraftsPage() {
  const navigate = useNavigate();

  const [folders, setFolders] = useState(null);   // full folder list (sidebar)
  const [selectedId, setSelectedId] = useState(null);
  const [folder, setFolder] = useState(null);      // selected folder + its drafts (main column)
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewDraftModal, setShowNewDraftModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile-only collapse state — always visible on lg+

  useEffect(() => {
    getMyFolders()
      .then(({ folders }) => {
        setFolders(folders);
        if (folders.length > 0) setSelectedId(folders[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setFolder(null);
    getFolderWithDrafts(selectedId)
      .then(({ folder }) => setFolder(folder))
      .catch((err) => setError(err.message));
  }, [selectedId]);

  // Opens the "name your draft" modal — creation itself happens in
  // handleCreateDraft below, once the writer submits a title. Nothing
  // navigates away from this page either way; the new file just shows up
  // in the list.
  function handleNewDraft() {
    if (!selectedId || creating) return;
    setShowNewDraftModal(true);
  }

  async function handleCreateDraft(title) {
    if (!selectedId || creating) return;
    setCreating(true);
    try {
      await createDraft({ folderId: selectedId, title: title || undefined });
      const { folder: refreshed } = await getFolderWithDrafts(selectedId);
      setFolder(refreshed);
      setShowNewDraftModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // Shared by the desktop sidebar and the mobile collapsible — picking a
  // folder on mobile also closes the collapsible so the file list is what's
  // visible afterward, instead of leaving the picker open over it.
  function handleSelectFolder(id) {
    setSelectedId(id);
    setSidebarOpen(false);
  }

  function handleStar(draftId) {
    const flip = (f) => ({
      ...f,
      drafts: f.drafts.map((d) => (d.id === draftId ? { ...d, isStarred: !d.isStarred } : d)),
    });
    setFolder(flip);
    toggleDraftStar(draftId).catch(() => setFolder(flip));
  }

  // Optimistic rename — updates the row immediately, then persists. On
  // failure, reverts the folder state AND rethrows so DraftFileRow's own
  // input reverts to the last-known title too.
  async function handleRename(draftId, title) {
    const prevFolder = folder;
    setFolder((f) => ({
      ...f,
      drafts: f.drafts.map((d) => (d.id === draftId ? { ...d, title } : d)),
    }));
    try {
      await updateDraft(draftId, { title });
    } catch (err) {
      setFolder(prevFolder);
      throw err;
    }
  }

  if (error) {
    return (
      <PageShell>
        <p className="text-ink-500">{error}</p>
      </PageShell>
    );
  }

  if (!folders) {
    return (
      <PageShell>
        <p className="text-ink-500">Opening your drafts…</p>
      </PageShell>
    );
  }

  if (folders.length === 0) {
    return (
      <PageShell>
        <EmptyFoldersState />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ── Main column ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div className="flex items-start gap-3 min-w-0">
              <button
                onClick={() => navigate("/workspace")}
                className="mt-1.5 text-ink-500 hover:text-ink-900 transition-colors shrink-0"
                aria-label="Back to workspace"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-social mb-1">
                  {folder?.isPlanFolder ? "Draft plan" : "Folder"}
                </p>
                <h1 className="font-display text-3xl text-ink-900 truncate">{folder?.name ?? "…"}</h1>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap shrink-0">
              {folder?.isPlanFolder && (
                <Button
                  onClick={() => navigate(`/draftplan/${folder.draftPlanId}`)}
                  className="rounded-lg px-5"
                  style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
                >
                  <Info className="h-4 w-4" /> Project overview
                </Button>
              )}
              <Button
                onClick={handleNewDraft}
                disabled={!folder || creating}
                className="rounded-lg px-5"
                style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
              >
                <Plus className="h-4 w-4" /> New draft
              </Button>
            </div>
          </div>

          {/* Mobile-only folder switcher — the sidebar itself is hidden
              below lg and lives in this collapsible instead of stacking
              underneath the file list. */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden w-full flex items-center justify-between gap-3 px-4 py-3 mb-5 rounded-xl border border-border hover:bg-secondary transition-colors"
          >
            <span className="inline-flex items-center gap-2 min-w-0 text-sm font-medium text-ink-900">
              <FolderOpen className="h-4 w-4 text-social shrink-0" />
              <span className="truncate">{folder?.name ?? "Folders"}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 text-ink-500 shrink-0 transition-transform", sidebarOpen && "rotate-180")} />
          </button>

          {sidebarOpen && (
            <div className="lg:hidden mb-6">
              <FolderSidebar
                folders={folders}
                selectedId={selectedId}
                selectedFolder={folder}
                onSelect={handleSelectFolder}
              />
            </div>
          )}

          {!folder ? (
            <p className="text-ink-500">Loading files…</p>
          ) : folder.drafts.length === 0 ? (
            <EmptyDraftsState onNewDraft={handleNewDraft} creating={creating} />
          ) : (
            <div className="space-y-3">
              {folder.drafts.map((draft) => (
                <DraftFileRow
                  key={draft.id}
                  draft={draft}
                  onSprint={() => navigate(`/sprint-room?draftId=${draft.id}`)}
                  onOpen={() => navigate(`/sprint-room?draftId=${draft.id}`)}
                  onStar={() => handleStar(draft.id)}
                  onRename={(title) => handleRename(draft.id, title)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        {/* Hidden below lg — the mobile collapsible above the file list
            covers that case instead. Sticky on lg+ so it stays pinned to
            the right edge as the file list scrolls. */}
        <div className="hidden lg:block lg:sticky lg:top-8">
          <FolderSidebar
            folders={folders}
            selectedId={selectedId}
            selectedFolder={folder}
            onSelect={handleSelectFolder}
          />
        </div>
      </div>

      <NewDraftModal
        open={showNewDraftModal}
        creating={creating}
        onClose={() => !creating && setShowNewDraftModal(false)}
        onCreate={handleCreateDraft}
      />
    </PageShell>
  );
}

// ── Main column rows ─────────────────────────────────────────────────────

function DraftFileRow({ draft, onSprint, onOpen, onStar, onRename }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(draft.title || "");
  const inputRef = useRef(null);

  // Keep the local input in sync if the draft's title changes from outside
  // (e.g. another tab, or a revert after a failed save below).
  useEffect(() => {
    if (!editing) setTitle(draft.title || "");
  }, [draft.title, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing(e) {
    e.stopPropagation();
    setEditing(true);
  }

  function cancelEditing() {
    setTitle(draft.title || "");
    setEditing(false);
  }

  async function commit() {
    const trimmed = title.trim();
    setEditing(false);

    // No real change — nothing to save.
    if (trimmed === (draft.title || "").trim()) {
      setTitle(draft.title || "");
      return;
    }
    // Empty title isn't allowed — fall back to "Untitled draft" rather
    // than silently reverting, since the writer did mean to clear it.
    const next = trimmed || "Untitled draft";

    try {
      await onRename(next);
    } catch {
      setTitle(draft.title || ""); // revert on save failure
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur(); // triggers commit via onBlur
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  }

  return (
    <Card className="transition-colors hover:border-social/40">
      <CardContent className="p-4 flex items-center gap-4">
        <FileText className="h-5 w-5 text-social shrink-0" />

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Untitled draft"
              className="w-full bg-transparent border-b border-social font-display text-lg text-ink-900 focus:outline-none pb-0.5"
            />
          ) : (
            <button
              onClick={startEditing}
              className="font-display text-lg text-ink-900 truncate hover:text-social transition-colors text-left"
              aria-label="Rename draft"
              title="Click to rename"
            >
              {draft.title || "Untitled draft"}
            </button>
          )}

          <button onClick={onOpen} className="block w-full text-left group">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500 mt-1 group-hover:text-social/80 transition-colors">
              <span className="inline-flex items-center gap-1">
                <Type className="h-3 w-3" /> {draft.wordCount.toLocaleString()} words
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatLastSprint(draft.lastSprintMinutes)}
              </span>
              <span>{formatLastWorked(draft.updatedAt)}</span>
            </div>
          </button>
        </div>

        <button
          onClick={onStar}
          className="shrink-0 p-1.5 rounded-full hover:bg-secondary transition-colors"
          aria-label={draft.isStarred ? "Unstar draft" : "Star draft"}
        >
          <Star
            className="h-4 w-4"
            style={
              draft.isStarred
                ? { fill: "hsl(var(--achievement-500))", color: "hsl(var(--achievement-500))" }
                : { color: "hsl(var(--ink-500))" }
            }
          />
        </button>

        <Button
          size="sm"
          onClick={onSprint}
          className="rounded-lg shrink-0"
          style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
        >
          <PenLine className="h-3.5 w-3.5" /> Sprint
        </Button>
      </CardContent>
    </Card>
  );
}

// ── New draft modal ──────────────────────────────────────────────────────
// Replaces the old create-then-navigate flow: creating a draft now just
// asks for a title and drops the new file into the current folder's list.
// Nothing navigates away from the drafts page either way.

function NewDraftModal({ open, creating, onClose, onCreate }) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) setTitle("");
  }, [open]);

  if (!open) return null;

  function submit(e) {
    e.preventDefault();
    if (creating) return;
    onCreate(title.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="font-display text-lg text-ink-900">Name your draft</p>
            <button
              onClick={onClose}
              className="text-ink-500 hover:text-ink-900 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={submit}>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled draft"
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-500 mb-5 focus:outline-none"
              style={{ boxShadow: "none" }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px hsl(var(--social-500))")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-lg px-5"
                style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
              >
                {creating ? "Creating…" : "Create draft"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyDraftsState({ onNewDraft, creating }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="font-display text-xl text-ink-900 mb-2">Nothing drafted here yet</p>
      <p className="text-sm text-ink-500 mb-5">Start a file and it'll show up in this folder.</p>
      <Button
        onClick={onNewDraft}
        disabled={creating}
        className="rounded-lg px-5"
        style={{ backgroundColor: "hsl(var(--social-500))", color: "white" }}
      >
        <Plus className="h-4 w-4" /> {creating ? "Creating…" : "New draft"}
      </Button>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────

function FolderSidebar({ folders, selectedId, selectedFolder, onSelect }) {
  // Plan folders other than the one currently selected — General never
  // belongs in this list.
  const otherPlans = folders.filter((f) => f.id !== selectedId && f.isPlanFolder);
  // The one General folder, shown on its own below — but only when it
  // isn't already the thing being spotlighted above.
  const general = folders.find((f) => !f.isPlanFolder);
  const showGeneralRow = general && general.id !== selectedId;

  return (
    <Card>
      <CardContent className="p-6">
        <FolderSpotlight folder={selectedFolder} />

        <div className="border-t border-border mt-6 pt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">Other draft plans</p>

          {otherPlans.length === 0 ? (
            <p className="text-sm text-ink-500">No related draft plans yet.</p>
          ) : (
            <ul className="space-y-1">
              {otherPlans.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => onSelect(f.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-secondary transition-colors"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: "hsl(var(--social-500))" }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-900 truncate">{f.name}</span>
                      <span className="block text-xs text-ink-500">({f.percentDrafted}% Drafted)</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-500 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* General folder — deliberately kept out of "Other draft plans";
            it's not a plan and has no % to show, just a place to browse. */}
        {showGeneralRow && (
          <div className="border-t border-border mt-5 pt-5">
            <button
              onClick={() => onSelect(general.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-secondary transition-colors"
            >
              <FolderOpen className="h-4 w-4 text-ink-500 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink-900 truncate">{general.name}</span>
                <span className="block text-xs text-ink-500">folder</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-500 shrink-0" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FolderSpotlight({ folder }) {
  if (!folder) return <p className="text-sm text-ink-500">Loading…</p>;

  // General folder: name only — there's no target to ring toward.
  if (!folder.isPlanFolder) {
    return (
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-social mb-2 truncate">{folder.name}</p>
        <div className="flex items-center justify-center gap-2 text-sm text-ink-500 mt-4">
          <FolderOpen className="h-4 w-4 text-social shrink-0" />
          {folder.draftCount} {folder.draftCount === 1 ? "file" : "files"} — no target, just a place to write
        </div>
      </div>
    );
  }

  const pct = folder.percentDrafted ?? 0;
  const tone = folder.planCompleted ? "success" : "social";
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;

  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-social mb-4 truncate">{folder.name}</p>
      <div className="relative h-32 w-32 mx-auto">
        <span
          className="absolute left-1/2 -translate-x-1/2 -top-0.5 h-2 w-2 rounded-full z-10"
          style={{ backgroundColor: `hsl(var(--${tone}-500))` }}
        />
        <svg viewBox="0 0 104 104" className="h-32 w-32 -rotate-90">
          <circle cx="52" cy="52" r={r} fill="none" strokeWidth="8" style={{ stroke: "hsl(var(--paper-border))" }} />
          <circle
            cx="52" cy="52" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ stroke: `hsl(var(--${tone}-500))`, transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl text-ink-900">{pct}%</span>
          <span className="text-[11px] uppercase tracking-wide text-ink-500">Drafted</span>
        </div>
      </div>
      {folder.planCompleted && (
        <span
          className="mt-4 inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "hsl(var(--success-100))", color: "hsl(var(--success-700))" }}
        >
          Draft complete
        </span>
      )}
    </div>
  );
}

// ── Empty states ─────────────────────────────────────────────────────────

function EmptyFoldersState() {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <p className="font-display text-xl text-ink-900 mb-2">No folders yet</p>
        <p className="text-sm text-ink-500">
          Your General folder should have been created at signup — try refreshing, or reach out if this keeps happening.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Formatting helpers ───────────────────────────────────────────────────

function formatLastWorked(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return "Worked on today";
  if (diffDays === 1) return "Worked on yesterday";
  if (diffDays > 1 && diffDays < 7) return `Worked on ${diffDays} days ago`;
  return `Worked on ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function formatLastSprint(minutes) {
  if (!minutes) return "No sprints yet";
  return `${minutes} min sprint`;
}

// ── layout shell ─────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 md:px-12 md:py-12">
      <div className="max-w-6xl mx-auto">{children}</div>
    </div>
  );
}