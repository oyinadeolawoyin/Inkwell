// src/pages/sprintroompage.jsx
//
// The Sprint Room: a countdown-timer writing session with a live-ish
// writers panel and chat, both living in the same 300px right column —
// clicking Chat REPLACES the writers panel rather than showing below it
// (and vice versa via the Writers toggle). On mobile that column collapses
// to a full-screen overlay opened from a header button.
//
// ── Opening a draft here ──────────────────────────────────────────────
// /sprint-room?draftId=123 loads that draft's content into the editor on
// mount (see the draft-load effect below) and links the Sprint row to it
// (draftId passed to startSprint). Content autosaves ~1.5s after the
// writer stops typing (see persistContent/handleEditorChange) — not just
// at sprint completion, which still fires an immediate flush + checkin.
// Opened with no draftId, the room starts blank; the first autosave then
// creates a draft via sprint-save and every save after that is a plain
// PATCH to it — draftIdRef makes that handoff invisible to the writer.
//
// ── Known backend gap (flagging directly, not papering over it) ─────────
// sprintroomservice.fetchSprintingMembers only returns each sprinting
// writer's startWords/startedAt/duration — there's no live "current word
// count" field anywhere on Sprint, since nothing pings the server as a
// writer types. So the writers panel can show an honest time-elapsed
// progress bar for everyone (derived from startedAt + duration), and a
// real live word count for "You" (read straight from this page's own
// editor), but NOT a live word count for other writers — that's not
// fake-able without either (a) a lightweight periodic
// PATCH /sprint/:sprintId/progress endpoint bumping a currentWords field,
// or (b) a socket. Say the word if you want that endpoint added; this
// component is written so wiring it in later is a one-line swap (see
// CURRENT WORDS comment on WriterRow below).
//
// Star/cheer ratings were removed (they were local-only UI, disconnected
// from any real metric, and never reached the person being rated — see
// git history if you want to revive them with a real SprintCheer table).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Play, Pause, RotateCcw, Users, MessageCircle, X, Send, Quote, Trash2, Menu,
  Eye, StickyNote, Plus, Lock, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareRoomButton from "../utilis/shareroombutton";
import WriteEditorShared, { StickyNoteCard, NoteComposer, STICKY_COLORS } from "../drafts/writeeditorshared";
import { getDraft, updateDraft, sprintAutoSaveDraft } from "../drafts/draftsapi";
import { connectSocket, disconnectSocket, socket } from "../../config/socket";
import { useAuth } from "../auth/authContext";
import ClickableUsername from "../profile/clickableusername";
import {
  fetchRoom, joinRoom, heartbeatRoom, leaveRoom, fetchRoomMembers,
  fetchRoomMessages, postRoomMessage, deleteRoomMessage,
  fetchUnreadChatCount, markChatNotificationsRead,
  startSprint, checkinSprint, fetchActiveSprint,
} from "./sprintroomapi";

const AUTOSAVE_DEBOUNCE_MS = 1500; // how long to wait after the writer stops typing before saving
const PROGRESS_EMIT_DEBOUNCE_MS = 1000; // how often this writer's own live word count goes out over the socket
const HEARTBEAT_MS = 25_000;      // pair with server's 60s PRESENCE_STALE_MS
const MEMBERS_POLL_MS = 8_000;    // room + sprinting members refresh
const CHAT_POLL_MS = 4_000;       // only runs while the chat panel is open
const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];
const LOG_PROGRESS_HIDE_KEY = "sprintRoom:hideLogProgressPrompt";

function initials(username = "") {
  return username.trim().slice(0, 2).toUpperCase() || "??";
}

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SprintRoomPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // ── Post-sprint "log your progress" nudge ─────────────────────────────
  // A one-time-per-sprint prompt, not another persistent setting — opting
  // out writes a flag to localStorage (LOG_PROGRESS_HIDE_KEY) that's
  // checked before ever showing it again, same "don't ask again" pattern
  // as a native browser dialog. Nothing server-side backs this; it's
  // purely a per-browser preference.
  const [showLogProgressModal, setShowLogProgressModal] = useState(false);
  const [hideLogProgressPrompt, setHideLogProgressPrompt] = useState(false);

  // ── Room + presence ─────────────────────────────────────────────────
  const [room, setRoom] = useState(null);
  const [sprintingMembers, setSprintingMembers] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);

  // ── Live word counts, pushed over the socket (sprint:progress) ──────
  // { [userId]: wordsWritten } — keyed by userId so a lookup during render
  // doesn't care which Sprint row is currently theirs. Seeded from each
  // member's initial currentWords (see sprintingMembers below) so there's
  // an honest number on first paint instead of 0 until the first socket
  // push arrives; live pushes overwrite it from there.
  const [liveWordCounts, setLiveWordCounts] = useState({});

  // Fills in an honest starting number for anyone we don't already have a
  // live (socket-pushed) count for — never overwrites one we do, since a
  // periodic poll's currentWords can lag behind what the socket has
  // already delivered. Used both on first load and on every members poll,
  // since either can introduce a writer we haven't seen a push from yet.
  const seedLiveWordCounts = useCallback((members) => {
    setLiveWordCounts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const m of members) {
        if (next[m.userId] != null) continue;
        next[m.userId] = Math.max(0, (m.currentWords ?? m.startWords) - m.startWords);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  // ── Right column: 'writers' | 'chat' — these REPLACE each other ─────
  const [rightView, setRightView] = useState("writers");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // ── Chat ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [quoted, setQuoted] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatScrollRef = useRef(null);

  // ── Timer / sprint ───────────────────────────────────────────────────
  const [duration, setDuration] = useState(25); // minutes
  const [sprint, setSprint] = useState(null);    // active Sprint row, once started
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const tickRef = useRef(null);

  // ── Sprint mode: 'normal' | 'focus' | 'notes' ─────────────────────────
  // 'normal' is just the idle/no-sprint-running state — the start modal
  // below only offers a choice between 'focus' and 'notes', since every
  // sprint runs in one of those two. Locked in for the life of the sprint
  // and auto-reset back to 'normal' the moment it completes or is reset —
  // that's the "until the sprint ends" part.
  const [sprintMode, setSprintMode] = useState("normal");
  // Cancelling out of Focus/Note Mode mid-sprint doesn't clear sprintMode —
  // it just pauses the timer and flips this flag so the normal header
  // shows instead. sprintMode stays "focus"/"notes" the whole time, so
  // clicking Resume (which un-sets this flag, see handleStart) drops the
  // writer right back into whichever mode they left.
  const [modeSuspended, setModeSuspended] = useState(false);
  const isFocusActive = sprintMode === "focus" && !!sprint && !isComplete && !modeSuspended;
  const isNotesActive = sprintMode === "notes" && !!sprint && !isComplete && !modeSuspended;

  // ── Start-sprint modal — opened either from the header's Start button
  //    or automatically the first time the writer types into the editor
  //    with no sprint set yet (see the keystroke-intercept effect below).
  const [showStartModal, setShowStartModal] = useState(false);
  const [pendingDuration, setPendingDuration] = useState(25);
  const [pendingMode, setPendingMode] = useState("focus");

  // ── Ctrl+K quick note — a tiny floating box that drops a note on
  //    whatever paragraph the caret is in and vanishes on Enter, without
  //    the writer ever having to open Note Mode or leave the keyboard.
  //    quickNoteParagraphIndex is captured the instant Ctrl+K fires (see
  //    the keydown effect below) — by the time the writer finishes typing
  //    and hits Enter, focus has moved into this floating input, so the
  //    editor's own DOM selection is long gone. Reading the caret only
  //    once, up front, is also what makes it possible to highlight that
  //    exact paragraph while the box is open (see highlightParagraphIndex
  //    passed to WriteEditorShared below).
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteParagraphIndex, setQuickNoteParagraphIndex] = useState(null);
  const quickNoteInputRef = useRef(null);

  // ── Note Mode sidebar scope ──────────────────────────────────────────
  // null | "overall" | paragraphIndex — which note the sidebar's detail
  // view is showing. Lifted up here (rather than kept local to NotesPanel)
  // so a click on one of WriteEditorShared's gutter badges can drive it
  // too, via onSelectParagraphNote passed to the editor below.
  const [noteScope, setNoteScope] = useState(null);
  useEffect(() => {
    if (!isNotesActive) setNoteScope(null);
  }, [isNotesActive]);

  // Mirrors WriteEditorShared's notes list (fires from its onNotesChange
  // regardless of draftId) so the Note Mode sidebar has something to
  // render without instantiating its own copy of useDraftStickyNotes.
  const [sprintNotes, setSprintNotes] = useState([]);
  const editorRef = useRef(null);

  // ── Writing surface — the real WriteEditorShared, same paper/pen/font
  //    controls as the drafts editor. showNotes stays false here — Note
  //    Mode manages sticky notes through the sidebar (NotesPanel) and the
  //    editor's imperative ref instead of the inline gutter, so there's
  //    only ever one place notes live at a time.
  //
  // Draft linking: ?draftId= in the URL means "open this draft in the
  // room." draftIdRef is the source of truth for autosave/startSprint
  // (a ref, not just state, so the debounced save always writes to
  // whichever draft is actually current — including one that didn't
  // exist yet when the sprint started, see persistContent below).
  // editorReady gates rendering WriteEditorShared until either there's no
  // draft to load, or the existing one has finished loading — its
  // initialContent prop is only read once on mount, so mounting it before
  // the fetch resolves would silently drop the draft's saved content.
  const [searchParams] = useSearchParams();
  const draftIdRef = useRef(null);
  const [linkedDraftId, setLinkedDraftId] = useState(null);
  const [draftTitle, setDraftTitle] = useState(null);
  const [initialContent, setInitialContent] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const contentRef = useRef("");       // latest html, for autosave + flush-on-complete
  const saveTimeoutRef = useRef(null);
  const progressTimeoutRef = useRef(null); // debounce for the sprint:progress socket emit — separate from autosave's timer

  // ── Load the linked draft, if the room was opened with ?draftId= ────
  useEffect(() => {
    const paramDraftId = searchParams.get("draftId");
    if (!paramDraftId) {
      setEditorReady(true); // fresh sprint, no draft yet — starts empty
      return;
    }
    let cancelled = false;
    getDraft(paramDraftId)
      .then(({ draft }) => {
        if (cancelled) return;
        draftIdRef.current = draft.id;
        setLinkedDraftId(draft.id);
        setDraftTitle(draft.title);
        setInitialContent(draft.content || "");
        contentRef.current = draft.content || "";
        // WriteEditorShared only fires onChange on user edits, not on
        // initial mount — so wordCount would otherwise sit at 0 until the
        // writer types something. If they hit "Start Sprint" before typing
        // (the normal case: open a draft, then start), startWords = wordCount
        // would capture that stale 0 instead of the draft's real length.
        // Seed it directly from the draft record's own wordCount instead.
        setWordCount(draft.wordCount || 0);
      })
      .catch((err) => console.error("Load draft error:", err))
      .finally(() => !cancelled && setEditorReady(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosaves to whichever draft is current. If the sprint didn't start
  // from an existing draft, the FIRST save creates one via sprint-save
  // (draftservice.sprintAutoSave) and every save after that is a plain
  // PATCH — draftIdRef makes that handoff transparent to the caller.
  const persistContent = useCallback(async (content) => {
    try {
      if (draftIdRef.current) {
        await updateDraft(draftIdRef.current, { content });
      } else {
        const { draft } = await sprintAutoSaveDraft({ content });
        draftIdRef.current = draft.id;
        setLinkedDraftId(draft.id);
      }
    } catch (err) {
      console.error("Sprint room autosave error:", err);
    }
  }, []);

  // Flush any pending save if the writer navigates away mid-debounce.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        persistContent(contentRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEditorChange(html, text, count) {
    setWordCount(count);
    contentRef.current = html;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => persistContent(html), AUTOSAVE_DEBOUNCE_MS);

    // Live progress push — separate debounce from the autosave above so
    // it stays snappy even though autosave waits longer. Only meaningful
    // once there's an active sprint (a sprint id to attach it to) and a
    // known room (a channel to broadcast it into).
    if (sprint?.id && room?.id) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = setTimeout(() => {
        socket.emit("sprint:progress", { sprintId: sprint.id, sprintRoomId: room.id, currentWordCount: count });
      }, PROGRESS_EMIT_DEBOUNCE_MS);
    }
  }

  // ── Initial load: room + join + members + active sprint ─────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { room, sprintingMembers } = await fetchRoom();
        if (cancelled) return;
        setRoom(room);
        setSprintingMembers(sprintingMembers);
        seedLiveWordCounts(sprintingMembers);
        await joinRoom(room.id);
        const { members } = await fetchRoomMembers(room.id);
        if (!cancelled) setRoomMembers(members);
      } catch (err) {
        console.error("Sprint room load error:", err);
      }
    })();

    fetchActiveSprint()
      .then(({ sprint }) => {
        if (cancelled || !sprint) return;
        setSprint(sprint);
        setDuration(sprint.duration || 25);
        const elapsed = Math.floor((Date.now() - new Date(sprint.startedAt).getTime()) / 1000);
        const total = (sprint.duration || 25) * 60;
        setRemainingSeconds(Math.max(0, total - elapsed));
        setIsRunning(elapsed < total);
      })
      .catch((err) => console.error("Fetch active sprint error:", err));

    fetchUnreadChatCount()
      .then(({ count }) => !cancelled && setUnreadCount(count))
      .catch(() => {});

    return () => {
      cancelled = true;
      if (room?.id) leaveRoom(room.id).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Heartbeat while the tab is open ───────────────────────────────────
  useEffect(() => {
    if (!room?.id) return;
    const id = setInterval(() => heartbeatRoom(room.id).catch(() => {}), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [room?.id]);

  // ── Socket: connect once we know which room we're in, listen for
  //    everyone else's live word-count pushes (sprint:progress). Own
  //    progress is emitted from handleEditorChange below, debounced.
  useEffect(() => {
    if (!room?.id) return;
    connectSocket();
    socket.emit("room:join", room.id);

    function handleProgress({ userId, wordsWritten }) {
      setLiveWordCounts((prev) => ({ ...prev, [userId]: wordsWritten }));
    }
    socket.on("sprint:progress", handleProgress);

    return () => {
      socket.off("sprint:progress", handleProgress);
      socket.emit("room:leave", room.id);
    };
  }, [room?.id]);

  // Disconnects the underlying connection entirely once the writer leaves
  // the Sprint Room page — separate from the room:join/leave above, which
  // just tracks channel membership on a connection that (once other parts
  // of the app start using the same shared socket) might otherwise stay
  // open for reasons unrelated to this page.
  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  // ── Poll room + sprinting members ─────────────────────────────────────
  useEffect(() => {
    if (!room?.id) return;
    const id = setInterval(async () => {
      try {
        const [{ room: r, sprintingMembers: sm }, { members }] = await Promise.all([
          fetchRoom(),
          fetchRoomMembers(room.id),
        ]);
        setRoom(r);
        setSprintingMembers(sm);
        seedLiveWordCounts(sm);
        setRoomMembers(members);
      } catch (err) {
        console.error("Sprint room poll error:", err);
      }
    }, MEMBERS_POLL_MS);
    return () => clearInterval(id);
  }, [room?.id]);

  // ── Chat: load + poll only while the panel is actually open ──────────
  const loadMessages = useCallback(async () => {
    if (!room?.id) return;
    try {
      const { messages } = await fetchRoomMessages(room.id, { limit: 50 });
      setMessages([...messages].reverse()); // server returns newest-first
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }, [room?.id]);

  useEffect(() => {
    if (rightView !== "chat" || !room?.id) return;
    loadMessages();
    markChatNotificationsRead().then(() => setUnreadCount(0)).catch(() => {});
    const id = setInterval(loadMessages, CHAT_POLL_MS);
    return () => clearInterval(id);
  }, [rightView, room?.id, loadMessages]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [messages, rightView]);

  // ── Countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    tickRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(tickRef.current);
          setIsRunning(false);
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [isRunning]);

  // Auto check-in the moment the timer hits zero, using whatever word
  // count the editor has right now — and flush the save immediately
  // rather than waiting out the debounce window.
  useEffect(() => {
    if (isComplete && sprint?.id) {
      clearTimeout(saveTimeoutRef.current);
      persistContent(contentRef.current);
      checkinSprint(sprint.id, wordCount).catch((err) => console.error("Checkin error:", err));

      const alreadyOptedOut = localStorage.getItem(LOG_PROGRESS_HIDE_KEY) === "true";
      if (!alreadyOptedOut) setShowLogProgressModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  useEffect(() => {
    if (showLogProgressModal) setHideLogProgressPrompt(false);
  }, [showLogProgressModal]);

  function closeLogProgressModal() {
    if (hideLogProgressPrompt) localStorage.setItem(LOG_PROGRESS_HIDE_KEY, "true");
    setShowLogProgressModal(false);
  }

  function handleLogProgressNow() {
    if (hideLogProgressPrompt) localStorage.setItem(LOG_PROGRESS_HIDE_KEY, "true");
    setShowLogProgressModal(false);
    // TODO(Bisola): this page has no planId in scope (only an optional
    // linkedDraftId from ?draftId=), so there's no single plan to deep-link
    // into — routing to the plan switcher is the safe default. If most
    // sprints are started from inside a specific plan, worth threading a
    // planId through the same way draftId already comes in via the URL.
    navigate("/draftplan");
  }

  // ── Timer controls ─────────────────────────────────────────────────────
  // opts.duration/opts.mode let the start modal hand in the picks it just
  // made without waiting on a state update to land first.
  async function handleStart(opts = {}) {
    if (sprint) {
      // resuming after Pause (or after cancelling out of Focus/Note Mode)
      // — no new Sprint row, just restart the interval and, if the writer
      // had exited a mode mid-sprint, drop them back into it.
      setIsRunning(true);
      setModeSuspended(false);
      return;
    }
    const d = opts.duration ?? duration;
    const m = opts.mode ?? sprintMode;
    try {
      const startWords = wordCount;
      const { sprint: newSprint } = await startSprint({
        duration: d,
        startWords,
        draftId: draftIdRef.current || undefined,
      });
      setSprint(newSprint);
      setDuration(d);
      setSprintMode(m);
      setRemainingSeconds(d * 60);
      setIsComplete(false);
      setIsRunning(true);
    } catch (err) {
      console.error("Start sprint error:", err);
    }
  }
  function handlePause() {
    setIsRunning(false);
  }
  function handleReset() {
    setIsRunning(false);
    setIsComplete(false);
    setSprint(null);
    setSprintMode("normal");
    setModeSuspended(false);
    setRemainingSeconds(duration * 60);
  }

  // Opens the start modal instead of starting immediately, so duration +
  // mode are always picked together. Resuming an already-started (paused)
  // sprint skips the modal — there's nothing left to pick.
  function handleStartClick() {
    if (sprint) {
      handleStart();
      return;
    }
    setPendingDuration(duration);
    setPendingMode("focus");
    setShowStartModal(true);
  }

  function confirmStartModal() {
    setShowStartModal(false);
    handleStart({ duration: pendingDuration, mode: pendingMode });
    // Give focus back to the editor so the writer can just keep typing.
    setTimeout(() => editorRef.current?.focusEditor?.(), 0);
  }

  // Sprint modes are locked in only while a sprint is actually running —
  // the instant it completes (or gets reset), snap back to the normal
  // Writers/Chat layout.
  useEffect(() => {
    if (isComplete) {
      setSprintMode("normal");
      setModeSuspended(false);
    }
  }, [isComplete]);

  // ── First-keystroke intercept: typing into the editor with no sprint
  //    set yet opens the start modal instead of just writing untracked.
  //    Scoped to the editor's own contentEditable (via closest(".editor-
  //    surface")) so it never swallows keystrokes meant for chat, the
  //    duration <select>, or a notes textarea.
  useEffect(() => {
    function handleKeyDown(e) {
      if (sprint || showStartModal) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1) return; // printable characters only
      if (!e.target.closest?.(".editor-surface")) return;
      e.preventDefault();
      setPendingDuration(duration);
      setPendingMode("focus");
      setShowStartModal(true);
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [sprint, showStartModal, duration]);

  // ── Ctrl/Cmd+K quick note ──────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        if (!sprint || isComplete) return; // only meaningful mid-sprint
        e.preventDefault();
        // Read the caret's paragraph NOW, before focus moves to the quick-
        // note input below — once that input is focused, the editor loses
        // its DOM selection and there's nothing left to read. If the caret
        // isn't in the editor at all (e.g. focus was already somewhere
        // else), there's no paragraph to pin a note to, so don't open the
        // box — it would otherwise open with nothing to save to.
        const idx = editorRef.current?.getCaretParagraphIndex?.();
        if (idx == null) return;
        setQuickNoteParagraphIndex(idx);
        setQuickNoteOpen(true);
        return;
      }
      if (e.key === "Escape" && quickNoteOpen) {
        setQuickNoteOpen(false);
        setQuickNoteText("");
        setQuickNoteParagraphIndex(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [sprint, isComplete, quickNoteOpen]);

  useEffect(() => {
    if (quickNoteOpen) quickNoteInputRef.current?.focus();
  }, [quickNoteOpen]);

  function submitQuickNote() {
    const text = quickNoteText.trim();
    // Pass the paragraph index captured back on keydown — quickNoteAtCaret
    // uses it instead of re-reading the (by now gone) editor selection.
    if (text) editorRef.current?.quickNoteAtCaret?.(text, quickNoteParagraphIndex);
    setQuickNoteText("");
    setQuickNoteOpen(false);
    setQuickNoteParagraphIndex(null);
    editorRef.current?.focusEditor?.();
  }

  const totalSeconds = duration * 60;
  const progressPct = sprint ? Math.min(100, Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100)) : 0;
  // Sprint-only delta — starts at 0 the moment a sprint begins and counts
  // up from there, same shape as everyone else's liveWordCount (both are
  // currentWords - startWords, just computed locally here since it's our
  // own live editor state rather than a socket push). wordCount itself
  // stays the draft's real total throughout — autosave/persistContent
  // still use that untouched; this is only for anything labeled "this
  // sprint."
  const sprintWordsWritten = sprint ? Math.max(0, wordCount - sprint.startWords) : 0;

  function togglePanel(view) {
    setRightView((prev) => (prev === view ? prev : view));
    setMobilePanelOpen(true);
  }

  async function handleSendMessage() {
    const content = chatInput.trim();
    if (!content || !room?.id) return;
    setChatInput("");
    const quotedMessageId = quoted?.id ?? null;
    setQuoted(null);
    try {
      const { message } = await postRoomMessage(room.id, { content, quotedMessageId });
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      console.error("Send message error:", err);
    }
  }

  async function handleDeleteMessage(messageId) {
    try {
      await deleteRoomMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("Delete message error:", err);
    }
  }

  const writerCount = sprintingMembers.length;

  return (
    <div className="h-full min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      {/* Focus Mode AND Note Mode both hide the whole header — timer,
          panel toggles, everything — for the length of the sprint. A tiny
          floating pill (clock + word count + exit) stands in for it
          instead; see MinimalSprintBar below. Exiting pauses rather than
          resets, so the normal header's Resume button below returns the
          writer to this same mode. Note Mode's sidebar
          stays visible (it's gated on isFocusActive only, further down) —
          it's just the black header bar on top of it that goes away. */}
      {isFocusActive || isNotesActive ? (
        <MinimalSprintBar
          remainingSeconds={remainingSeconds}
          wordCount={wordCount}
          onExit={() => {
            // Cancelling out pauses the sprint rather than resetting it —
            // sprintMode is left alone, so the normal header's Resume
            // button (sprint is still truthy) brings the writer straight
            // back into this same mode.
            setIsRunning(false);
            setModeSuspended(true);
          }}
          onOpenPanel={isNotesActive ? () => setMobilePanelOpen(true) : undefined}
        />
      ) : (
      <header className="border-b border-border px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobilePanelOpen(true)}
            aria-label="Open room panel"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-lg truncate">
              {room?.name || "Sprint Room"}
              {draftTitle ? <span className="text-muted-foreground font-normal"> · {draftTitle}</span> : null}
            </h1>
            <p className="text-sm text-muted-foreground">
              {writerCount === 0 ? "No one sprinting yet" : `${writerCount} writer${writerCount === 1 ? "" : "s"} sprinting`}
              {" · "}
              {isComplete
                ? `+${sprintWordsWritten} words this sprint · ${wordCount.toLocaleString()} total`
                : `${sprintWordsWritten} words this sprint`}
            </p>
          </div>
        </div>

        {/* Centered timer */}
        <div className="flex flex-col items-center gap-2 mx-auto">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl md:text-4xl tabular-nums tracking-wide text-social">
              {formatClock(remainingSeconds)}
            </span>
            {!sprint && (
              <select
                value={duration}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setDuration(d);
                  setRemainingSeconds(d * 60);
                }}
                className="bg-secondary text-foreground text-sm rounded-lg border border-border px-2 py-1 outline-none focus:ring-1 focus:ring-social"
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {!isRunning ? (
              <button
                onClick={handleStartClick}
                className="flex items-center gap-1.5 rounded-full pl-4 pr-5 py-2 font-display font-semibold text-sm
                           bg-social text-social-foreground
                           shadow-[0_0_0_1px_hsl(var(--sky-500)/0.4),0_0_22px_hsl(var(--sky-500)/0.5)]
                           hover:shadow-[0_0_0_1px_hsl(var(--sky-500)/0.55),0_0_30px_hsl(var(--sky-500)/0.7)]
                           hover:-translate-y-px active:translate-y-0 transition-all duration-150"
              >
                <Play size={15} className="fill-current" /> {sprint ? "Resume" : "Start"}
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 rounded-full pl-4 pr-5 py-2 font-display font-semibold text-sm
                           bg-secondary text-foreground border border-border
                           hover:bg-secondary/70 transition-colors"
              >
                <Pause size={15} className="fill-current" /> Pause
              </button>
            )}
            <button
              onClick={handleReset}
              aria-label="Reset timer"
              className="flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground
                         border border-border hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Panel toggles — only reachable here in normal mode; Note Mode
            now hides this whole header (see MinimalSprintBar above). */}
        <div className="hidden lg:flex items-center gap-2">
          <ShareRoomButton room={room} writerCount={writerCount} />
          <Button
            size="sm"
            variant={rightView === "writers" ? "secondary" : "ghost"}
            onClick={() => togglePanel("writers")}
          >
            <Users size={16} className="mr-1" /> Writers
          </Button>
          <Button
            size="sm"
            variant={rightView === "chat" ? "secondary" : "ghost"}
            className="relative"
            onClick={() => togglePanel("chat")}
          >
            <MessageCircle size={16} className="mr-1" /> Chat
            {unreadCount > 0 && rightView !== "chat" && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-highlight" />
            )}
          </Button>
        </div>
      </header>
      )}

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Writing area — the real editor: paper style, paper theme, pen
            colors, font family, all included. Widened via maxWidthPx.
            No padding/gap here and no background of our own — WriteEditor
            Shared now paints its own full-bleed page background (matching
            whatever paperTheme is picked) and fills this entire pane edge
            to edge, so it reads as one normal, continuous editor surface
            instead of a card floating on a separate desk color. main and
            the wrapper below deliberately DON'T scroll themselves —
            WriteEditorShared's own paper (h-full + its internal
            scrollbar-hide flex-1) is the sole scroll owner for this area.
            Without min-h-0 here, flex items default to min-height:auto and
            refuse to shrink below their content size, which is what was
            causing two independent scrollbars to stack (this wrapper's
            and the paper's) instead of one. */}
        <main className="flex-1 flex min-h-0">
          <div className="w-full relative flex flex-col min-h-0">
            {editorReady ? (
              <WriteEditorShared
                ref={editorRef}
                draftId={linkedDraftId}
                initialContent={initialContent}
                onChange={handleEditorChange}
                onNotesChange={setSprintNotes}
                showNotes={false}
                onSelectParagraphNote={isNotesActive ? setNoteScope : undefined}
                hideToolbar={isFocusActive || isNotesActive}
                highlightParagraphIndex={quickNoteOpen ? quickNoteParagraphIndex : null}
                maxWidthPx={1040}
                className="flex-1 min-h-0"
              />
            ) : (
              <div className="min-h-[70vh] flex items-center justify-center text-muted-foreground text-sm">
                Opening your draft…
              </div>
            )}
            {isComplete && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-success text-success-foreground text-sm font-medium shadow-lg">
                Sprint complete! +{sprintWordsWritten} words · {wordCount.toLocaleString()} total
              </div>
            )}
          </div>
        </main>

        {/* Right column — desktop: writers/chat replace each other in
            place, or both get replaced by the sticky-notes sidebar for
            the length of a Note Mode sprint. Hidden entirely in Focus
            Mode, along with everything else. */}
        {!isFocusActive && (
          <aside className="hidden lg:flex w-[300px] border-l border-border flex-col">
            {isNotesActive ? (
              <NotesPanel notes={sprintNotes} editorRef={editorRef} openId={noteScope} setOpenId={setNoteScope} />
            ) : rightView === "writers" ? (
              <WritersPanel
                sprintingMembers={sprintingMembers}
                mySprintId={sprint?.id}
                liveWordCounts={liveWordCounts}
                myWordCount={sprintWordsWritten}
                myStartWords={sprint?.startWords}
                myProgressPct={progressPct}
                duration={duration}
              />
            ) : (
              <ChatPanel
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                quoted={quoted}
                setQuoted={setQuoted}
                onSend={handleSendMessage}
                onDelete={handleDeleteMessage}
                currentUser={currentUser}
                roomMembers={roomMembers}
                scrollRef={chatScrollRef}
              />
            )}
          </aside>
        )}
      </div>

      {/* Mobile overlay — same swap behavior, full-screen. Not reachable in
          Focus Mode (nothing opens it there, by design). Reachable in Note
          Mode via the sticky-note icon in the MinimalSprintBar, since the
          full header (and its old Menu button) is hidden for both modes
          now. */}
      {mobilePanelOpen && !isFocusActive && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            {isNotesActive ? (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Lock size={13} /> Note Mode
              </span>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" variant={rightView === "writers" ? "secondary" : "ghost"} onClick={() => setRightView("writers")}>
                  <Users size={16} className="mr-1" /> Writers
                </Button>
                <Button size="sm" variant={rightView === "chat" ? "secondary" : "ghost"} onClick={() => setRightView("chat")}>
                  <MessageCircle size={16} className="mr-1" /> Chat
                </Button>
              </div>
            )}
            <button onClick={() => setMobilePanelOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            {isNotesActive ? (
              <NotesPanel notes={sprintNotes} editorRef={editorRef} openId={noteScope} setOpenId={setNoteScope} />
            ) : rightView === "writers" ? (
              <WritersPanel
                sprintingMembers={sprintingMembers}
                mySprintId={sprint?.id}
                liveWordCounts={liveWordCounts}
                myWordCount={sprintWordsWritten}
                myStartWords={sprint?.startWords}
                myProgressPct={progressPct}
                duration={duration}
              />
            ) : (
              <ChatPanel
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                quoted={quoted}
                setQuoted={setQuoted}
                onSend={handleSendMessage}
                onDelete={handleDeleteMessage}
                currentUser={currentUser}
                roomMembers={roomMembers}
                scrollRef={chatScrollRef}
              />
            )}
          </div>
        </div>
      )}

      {/* Start-sprint modal — duration + mode picked together, whether
          opened from the header or from the first-keystroke intercept. */}
      <StartSprintModal
        open={showStartModal}
        duration={pendingDuration}
        onDurationChange={setPendingDuration}
        mode={pendingMode}
        onModeChange={setPendingMode}
        onStart={confirmStartModal}
        onClose={() => setShowStartModal(false)}
      />

      {/* Post-sprint "log your progress" nudge — see the state comment up
          top for how the opt-out persists. */}
      <LogProgressModal
        open={showLogProgressModal}
        wordsWritten={sprintWordsWritten}
        hideNextTime={hideLogProgressPrompt}
        onHideNextTimeChange={setHideLogProgressPrompt}
        onLogNow={handleLogProgressNow}
        onClose={closeLogProgressModal}
      />

      {/* Ctrl/Cmd+K quick note — floats above everything, including Focus
          Mode's stripped-down chrome. */}
      {quickNoteOpen && (
        <div className="fixed inset-x-0 top-24 z-[110] flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto w-full max-w-sm bg-card border border-social shadow-2xl rounded-xl px-3 py-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <StickyNote size={14} className="text-social shrink-0" />
              <input
                ref={quickNoteInputRef}
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitQuickNote();
                  }
                }}
                placeholder="Quick note… (Enter to save)"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {/* Same paragraph the highlight overlay is tinting behind the
                text, spelled out — the highlight alone might be off-screen
                (long drafts scroll) so this is the one place it's always
                visible while the box is open. */}
            {quickNoteParagraphIndex != null && (
              <p className="text-[11px] text-muted-foreground pl-6">
                Adding to paragraph {quickNoteParagraphIndex + 1}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Writers panel ────────────────────────────────────────────────────────
// Excludes "you" from the sprintingMembers list by comparing Sprint row id
// (mySprintId, from this page's own `sprint` state) rather than by user id
// against a `currentUser` prop — currentUser is supplied by whatever
// mounts this page and isn't guaranteed to be populated or shaped the same
// way sprintingMembers' userId is, so matching on userId was unreliable.
// sprint.id and each sprintingMembers entry's id both come from the same
// Sprint rows on the same backend, so comparing those two is unambiguous.
function WritersPanel({ sprintingMembers, mySprintId, myWordCount, myStartWords, myProgressPct, liveWordCounts, duration }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-display font-semibold text-sm">Writers</h2>
      </div>
      <div className="flex-1 overflow-auto scrollbar-hide px-3 py-3 space-y-2">
        {/* "You" — always first, live word count from this page's own editor */}
        <WriterRow
          username="You"
          isYou
          wordCount={myWordCount}
          startWords={myStartWords}
          progressPct={myProgressPct}
        />
        {sprintingMembers
          .filter((m) => m.id !== mySprintId)
          .map((m) => {
            const elapsed = (Date.now() - new Date(m.startedAt).getTime()) / 1000;
            const total = (m.duration || duration) * 60;
            const progressPct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
            return (
              <WriterRow
                key={m.id}
                userId={m.user?.id ?? m.userId}
                username={m.user?.username || "Writer"}
                avatar={m.user?.avatar}
                progressPct={progressPct}
                startWords={m.startWords}
                liveWordCount={liveWordCounts[m.userId]}
              />
            );
          })}
        {sprintingMembers.length === 0 && (
          <p className="text-sm text-muted-foreground px-1 py-4">No one else is sprinting right now.</p>
        )}
      </div>
    </div>
  );
}

function WriterRow({ userId, username, isYou, avatar, wordCount, startWords, progressPct, liveWordCount }) {
  return (
    <div className={`rounded-xl p-3 border ${isYou ? "border-social bg-social/10" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2.5">
        <ClickableUsername userId={userId} disabled={isYou} className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
            {avatar ? (
              <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              initials(username)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isYou ? "text-social" : ""}`}>{username}</p>
            {/* CURRENT WORDS: sprint-only delta for everyone now, "You"
                included — starts at 0 the moment a sprint begins and counts
                up from there, same shape for both rows (own is derived
                locally in the parent; others come from the live
                sprint:progress socket push, "writing…" until the first one
                arrives). The draft's real total lives one line down instead
                — "Started at N" — so it's still visible without conflating
                "how much you've written total" with "how much you've
                written this sprint." Progress BAR stays elapsed-time-based
                for everyone — there's no per-writer word-count goal to
                measure a percentage against. */}
            {isYou ? (
              <p className="text-xs text-muted-foreground">{wordCount} words</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {liveWordCount != null ? `${liveWordCount} words` : "writing…"}
              </p>
            )}
            {startWords != null && (
              <p className="text-[11px] text-muted-foreground/70">Started at {startWords}</p>
            )}
          </div>
        </ClickableUsername>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-social transition-all duration-500"
          style={{
            width: `${progressPct}%`,
            boxShadow: "0 0 8px hsl(var(--sky-500) / 0.7)",
          }}
        />
      </div>
    </div>
  );
}

// ── @mention parsing ─────────────────────────────────────────────────────
// Matches the same "@word" shape the backend's resolveMentions() pulls out
// of message content, so what gets highlighted here always lines up with
// what actually became a notification server-side.
const MENTION_TOKEN_RE = /@(\w+)/g;

// Looks at the text up to the caret and tells the input whether it's
// mid-mention right now — "@" either at the very start or preceded by
// whitespace, with no space typed since. Returns null the rest of the time
// (caret not in a mention), so the dropdown only ever shows while actively
// typing a handle.
function getMentionQuery(text, caret) {
  const upToCaret = text.slice(0, caret);
  const match = upToCaret.match(/(?:^|\s)@(\w{0,24})$/);
  if (!match) return null;
  const query = match[1];
  return { query, start: caret - query.length - 1 }; // index of the "@"
}

// Renders message content with @mentions bolded — and, when the token
// matches the reader's own username, visually called out (not just bold)
// so a mention actually stands out in a scrolling chat instead of blending
// into the rest of the sentence.
function renderMessageContent(content, myUsername) {
  const parts = [];
  let lastIndex = 0;
  let match;
  MENTION_TOKEN_RE.lastIndex = 0;
  while ((match = MENTION_TOKEN_RE.exec(content))) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    const handle = match[1];
    const isMe = myUsername && handle.toLowerCase() === myUsername.toLowerCase();
    parts.push(
      <span
        key={match.index}
        className={
          isMe
            ? "font-semibold rounded px-1 py-0.5 bg-highlight/20 text-highlight"
            : "font-semibold text-social"
        }
      >
        @{handle}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts;
}

// ── Chat panel ────────────────────────────────────────────────────────────
function ChatPanel({ messages, chatInput, setChatInput, quoted, setQuoted, onSend, onDelete, currentUser, roomMembers, scrollRef }) {
  const inputRef = useRef(null);
  // null when not mid-mention; otherwise { query, start } — start is the
  // index of the "@" in chatInput, so a selected suggestion knows exactly
  // what span to replace.
  const [mention, setMention] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const mentionMatches = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return (roomMembers || [])
      .filter((m) => m.user?.username?.toLowerCase().startsWith(q))
      .slice(0, 6);
  }, [mention, roomMembers]);

  useEffect(() => setActiveIndex(0), [mention?.query]);

  function handleInputChange(e) {
    const value = e.target.value;
    setChatInput(value);
    const caret = e.target.selectionStart ?? value.length;
    setMention(getMentionQuery(value, caret));
  }

  function selectMention(username) {
    if (!mention) return;
    const before = chatInput.slice(0, mention.start);
    const after = chatInput.slice(mention.start + 1 + mention.query.length);
    const next = `${before}@${username} ${after}`;
    setChatInput(next);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = before.length + username.length + 2; // "@" + name + " "
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e) {
    if (mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(mentionMatches[activeIndex].user.username);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-display font-semibold text-sm">Chat</h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto scrollbar-hide px-3 py-3 space-y-3">
        {messages.map((m) => {
          const mentionsMe = m.mentionedUserIds?.some((id) => Number(id) === Number(currentUser?.id));
          return (
            <div
              key={m.id}
              className={`group rounded-lg -mx-1.5 px-1.5 py-0.5 ${mentionsMe ? "bg-highlight/10 border-l-2 border-highlight" : ""}`}
            >
              {m.quotedContent && (
                <div className="text-xs text-muted-foreground border-l-2 border-border pl-2 mb-1 truncate">
                  {m.quotedSenderName ? `${m.quotedSenderName}: ` : ""}{m.quotedContent}
                </div>
              )}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5">
                  {initials(m.sender?.username)}
                </div>
                <div className="min-w-0 flex-1">
                  <ClickableUsername userId={m.sender?.id} disabled={Number(m.sender?.id) === Number(currentUser?.id)}>
                    <p className="text-xs text-muted-foreground">{m.sender?.username || "Someone"}</p>
                  </ClickableUsername>
                  <p className="text-sm break-words">{renderMessageContent(m.content, currentUser?.username)}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button onClick={() => setQuoted(m)} className="text-muted-foreground hover:text-foreground" aria-label="Quote">
                    <Quote size={13} />
                  </button>
                  {currentUser?.id != null && Number(m.sender?.id) === Number(currentUser.id) && (
                    <button onClick={() => onDelete(m.id)} className="text-muted-foreground hover:text-highlight" aria-label="Delete">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground px-1 py-4">No messages yet — say hi!</p>
        )}
      </div>

      {quoted && (
        <div className="mx-3 mb-1 flex items-center justify-between text-xs bg-secondary rounded-lg px-2.5 py-1.5">
          <span className="truncate text-muted-foreground">
            Replying to {quoted.sender?.username || "message"}: {quoted.content}
          </span>
          <button onClick={() => setQuoted(null)} className="text-muted-foreground hover:text-foreground shrink-0 ml-2">
            <X size={12} />
          </button>
        </div>
      )}

      <div className="relative p-3 border-t border-border flex items-center gap-2">
        {mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1.5 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {mentionMatches.map((m, i) => (
              <button
                key={m.userId}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep input focus so caret math stays valid
                onClick={() => selectMention(m.user.username)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-left ${i === activeIndex ? "bg-secondary" : "hover:bg-secondary/60"}`}
              >
                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[9px] font-semibold shrink-0">
                  {initials(m.user.username)}
                </div>
                <span className="truncate">{m.user.username}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={chatInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => setMention(getMentionQuery(chatInput, e.target.selectionStart ?? chatInput.length))}
            placeholder="Message the room… (@ to mention someone)"
            className="w-full bg-secondary text-sm rounded-lg border border-border px-3 py-2 outline-none focus:ring-1 focus:ring-social"
          />
        </div>
        <Button size="icon" className="bg-social hover:bg-social/90 text-social-foreground shrink-0" onClick={onSend}>
          <Send size={15} />
        </Button>
      </div>
    </div>
  );
}
// ── Minimal floating sprint bar ───────────────────────────────────────────
// Stands in for the entire header in Focus Mode AND Note Mode: just the
// countdown, the live word count, and an escape hatch (Exit) — no room
// name, no panel toggles, no black top bar. This is what
// makes "only the timer (and, for Note Mode, the sidebar)" possible: pause
// No pause/resume or reset live here on purpose — Focus and Note Mode are
// meant to be distraction-free. The only control is Exit, which pauses the
// sprint and drops back to the normal header; sprintMode is left untouched
// so the normal header's Resume button (see the header render below) picks
// the sprint back up in this same mode. A full Reset is only reachable
// from that normal header too. onOpenPanel is only passed for Note Mode,
// on mobile, where the sidebar isn't on-screen by default — Focus Mode has
// no panel to open.
function MinimalSprintBar({ remainingSeconds, wordCount, onExit, onOpenPanel }) {
  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-1 bg-card/90 backdrop-blur border border-border rounded-full pl-4 pr-2 py-1.5 shadow-lg">
      <span className="font-display text-sm tabular-nums text-social">{formatClock(remainingSeconds)}</span>
      <span className="text-xs text-muted-foreground mr-1">{wordCount} words</span>
      <span className="w-px h-4 bg-border mx-0.5" />
      {onOpenPanel && (
        <button
          onClick={onOpenPanel}
          title="Open sticky notes"
          aria-label="Open sticky notes"
          className="lg:hidden h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <StickyNote size={12} />
        </button>
      )}
      <button
        onClick={onExit}
        title="Exit to normal mode"
        aria-label="Exit to normal mode"
        className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── Start-sprint modal ────────────────────────────────────────────────────
function StartSprintModal({ open, duration, onDurationChange, mode, onModeChange, onStart, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-semibold text-lg mb-1">Set your sprint</h2>
        <p className="text-sm text-muted-foreground mb-5">Pick how long you're writing and what the room should look like.</p>

        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Duration</label>
        <select
          value={duration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="w-full mt-1.5 mb-4 bg-secondary text-foreground text-sm rounded-lg border border-border px-3 py-2 outline-none focus:ring-1 focus:ring-social"
        >
          {DURATION_OPTIONS.map((m) => (
            <option key={m} value={m}>{m} min</option>
          ))}
        </select>

        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mode</label>
        <div className="grid grid-cols-1 gap-2 mt-1.5 mb-5">
          <ModeOption
            icon={Eye}
            label="Focus mode"
            description="Everything disappears — just the page — until the timer ends."
            active={mode === "focus"}
            onClick={() => onModeChange("focus")}
          />
          <ModeOption
            icon={StickyNote}
            label="Note mode"
            description="Sticky notes replace Writers/Chat for the whole sprint."
            active={mode === "notes"}
            onClick={() => onModeChange("notes")}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-social hover:bg-social/90 text-social-foreground" onClick={onStart}>
            Start sprint
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Log-progress nudge ────────────────────────────────────────────────────
// A single-purpose confirm dialog, not a full form — logging progress
// itself happens on the draft plan page, this just closes the loop right
// after a sprint ends so the habit doesn't get lost in "I'll do it later."
function LogProgressModal({ open, wordsWritten, hideNextTime, onHideNextTimeChange, onLogNow, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-9 w-9 rounded-full bg-social/15 flex items-center justify-center shrink-0">
            <ClipboardCheck size={17} className="text-social" />
          </div>
          <h2 className="font-display font-semibold text-lg">Sprint complete!</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          You wrote {wordsWritten} word{wordsWritten === 1 ? "" : "s"} this sprint. Want to log it on your draft plan now?
        </p>

        <div className="flex items-center gap-2 mb-5">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Not now</Button>
          <Button className="flex-1 bg-social hover:bg-social/90 text-social-foreground" onClick={onLogNow}>
            Log progress
          </Button>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideNextTime}
            onChange={(e) => onHideNextTimeChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-social"
          />
          Don't show this again
        </label>
      </div>
    </div>
  );
}

function ModeOption({ icon: Icon, label, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border px-3 py-2.5 transition-colors flex items-start gap-2.5 ${
        active ? "border-social bg-social/10" : "border-border hover:border-foreground/30"
      }`}
    >
      {Icon && <Icon size={16} className={`mt-0.5 shrink-0 ${active ? "text-social" : "text-muted-foreground"}`} />}
      <span>
        <p className={`text-sm font-medium ${active ? "text-social" : ""}`}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </span>
    </button>
  );
}

// ── Note Mode sidebar ─────────────────────────────────────────────────────
// Fully replaces the Writers/Chat panel for a Note Mode sprint. Reads
// `notes` straight from WriteEditorShared's onNotesChange mirror and acts
// on them entirely through the editor's imperative ref — no separate API
// wiring needed here. `openId`/`setOpenId` are lifted up to the page so a
// click on one of the editor's gutter badges (see onSelectParagraphNote)
// can drive this panel too, not just clicks inside the panel itself.
//
// A paragraph — or the whole draft — can hold more than one note now:
// clicking a badge (or a row here) opens ALL of that scope's notes
// together, stacked as real StickyNoteCards, with an "add another"
// composer underneath. The list view uses the exact same StickyNoteCard
// look (small yellow paper, tape, folded corner) as the detail view — no
// separate plain-card style for "browsing" vs "reading" a note.
function NotesPanel({ notes, editorRef, openId, setOpenId }) {
  const overallNotes = notes.filter((n) => n.paragraphIndex == null);
  const paragraphNotes = notes.filter((n) => n.paragraphIndex != null);
  const byParagraph = new Map();
  for (const n of paragraphNotes) {
    const arr = byParagraph.get(n.paragraphIndex) || [];
    arr.push(n);
    byParagraph.set(n.paragraphIndex, arr);
  }
  const paragraphIndexes = [...byParagraph.keys()].sort((a, b) => a - b);

  const isOverallOpen = openId === "overall";
  const isParagraphOpen = typeof openId === "number";
  const openNotesList = isOverallOpen ? overallNotes : isParagraphOpen ? byParagraph.get(openId) || [] : [];
  const scopeLabel = isOverallOpen ? "Whole draft" : isParagraphOpen ? `Paragraph ${openId + 1}` : null;

  function saveScoped(patch) {
    if (isOverallOpen) return editorRef.current?.addOverallNote?.(patch);
    return editorRef.current?.addParagraphNote?.(openId, patch);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Sticky notes</p>
        <p className="text-sm font-display text-foreground mt-0.5">Locked in for this sprint</p>
      </div>

      {scopeLabel ? (
        // ── Detail view — every note in this scope, stacked ────────────
        <NotesScopeDetail
          scopeLabel={scopeLabel}
          isOverall={isOverallOpen}
          notesList={openNotesList}
          onBack={() => setOpenId(null)}
          onAdd={saveScoped}
          onSave={(note, patch) => editorRef.current?.updateNote?.(note.id, patch)}
          onDelete={(note) => editorRef.current?.removeNote?.(note.id)}
        />
      ) : (
        // ── List view — whole-draft notes + every paragraph's notes ────
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-0.5">Overall</span>
            <button onClick={() => setOpenId("overall")} className="block w-full mt-1.5 relative">
              {overallNotes.length > 0 ? (
                <>
                  <MiniStickyNote note={overallNotes[0]} />
                  {overallNotes.length > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow bg-foreground text-background">
                      {overallNotes.length}
                    </span>
                  )}
                </>
              ) : (
                <span className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-muted-foreground text-sm py-3 hover:border-foreground/40 hover:text-foreground transition-colors">
                  <Plus size={13} /> Add overall note
                </span>
              )}
            </button>
          </div>

          <div className="pt-1 px-0.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Paragraph notes</span>
          </div>

          {paragraphIndexes.length === 0 && (
            <p className="text-sm text-muted-foreground px-1 py-2">
              Click a paragraph's number in the margin to add a sticky note there, or press Ctrl+K anywhere in the draft.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {paragraphIndexes.map((idx) => {
              const notesHere = byParagraph.get(idx);
              return (
                <button key={idx} onClick={() => setOpenId(idx)} className="text-left relative">
                  <MiniStickyNote note={notesHere[0]} label={`Paragraph ${idx + 1}`} />
                  {notesHere.length > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow bg-foreground text-background">
                      {notesHere.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Small sticky-note tile for the list/grid view — same paper look as the
// full-size StickyNoteCard (tape, folded corner, hand-placed tilt), just
// compact, so "browsing" notes looks identical to "reading" one instead of
// switching to a plain white/bordered box.
function MiniStickyNote({ note, label }) {
  const palette = STICKY_COLORS[note.color] || STICKY_COLORS.YELLOW;
  return (
    <div
      className="relative rounded-sm px-3 pt-4 pb-3 transition-transform duration-150 hover:scale-[1.03]"
      style={{
        background: `linear-gradient(160deg, ${palette.bg} 0%, ${palette.bg} 80%, ${palette.edge} 100%)`,
        boxShadow: "1px 4px 10px rgba(35,22,8,0.22), 0 1px 0 rgba(255,255,255,0.4) inset",
        fontFamily: "var(--font-handwritten)",
        minHeight: "88px",
      }}
    >
      <div
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-3.5 rounded-[2px]"
        style={{ background: palette.tape, boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
      />
      {label && <p className="text-[11px] font-sans font-semibold text-[#3a2f14]/60 mb-0.5">{label}</p>}
      <p className="text-[14px] leading-snug text-[#3a2f14] line-clamp-3 break-words">
        {note.text || (note.items?.length ? note.items[0] : "Empty note")}
      </p>
    </div>
  );
}

// Detail pane: every note in the open scope, each as a real StickyNoteCard
// (edit/delete on hover, same as the Drafts page's slide-in panel), plus a
// composer to add another beneath them. Both scopes (overall and
// paragraph) can hold more than one note now, so "add another" always
// shows once at least one note already exists.
function NotesScopeDetail({ scopeLabel, isOverall, notesList, onBack, onAdd, onSave, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  useEffect(() => {
    setEditingId(null);
    setComposerOpen(false);
  }, [scopeLabel]);

  const showComposer = composerOpen || notesList.length === 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <button onClick={onBack} className="mx-4 mt-3 text-xs text-muted-foreground hover:text-foreground self-start">
        ← All notes
      </button>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{scopeLabel}</p>

        {notesList.map((n) =>
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
            onCancel={notesList.length > 0 ? () => setComposerOpen(false) : onBack}
          />
        ) : (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="w-full text-sm text-foreground hover:underline flex items-center justify-center gap-1.5 py-2 font-medium"
          >
            <Plus size={13} /> {isOverall ? "Add another whole-draft note" : "Add another note here"}
          </button>
        )}
      </div>
    </div>
  );
}