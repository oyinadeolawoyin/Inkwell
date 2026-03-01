import { useState } from "react";
import API_URL from "@/config/api";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mt-3">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

const DURATIONS = [
  { value: 1,  label: "1 min", description:  "Micro focus" },
  { value: 10, label: "10 min", description: "Micro focus" },
  { value: 15, label: "15 min", description: "Quick sprint" },
  { value: 25, label: "25 min", description: "Classic pomodoro" },
  { value: 30, label: "30 min", description: "Focused flow" },
  { value: 45, label: "45 min", description: "Deep work" },
  { value: 60, label: "60 min", description: "Marathon session" },
];

// ─────────────────────────────────────────────────────────────────────────────
// START GROUP SPRINT MODAL (host)
// Step 1: purpose + duration → creates GroupSprint
// Step 2: host intro + check-in → creates their Sprint linked to the group
// ─────────────────────────────────────────────────────────────────────────────
export function StartGroupSprintModal({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState("");
  const [duration, setDuration] = useState(25);
  const [intro, setIntro] = useState("");
  const [checkin, setCheckin] = useState("");
  const [startWordCount, setStartWordCount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groupSprint, setGroupSprint] = useState(null);

  function handleClose() {
    setStep(1); setPurpose(""); setDuration(25);
    setIntro(""); setCheckin(""); setStartWordCount(""); setError(null); setGroupSprint(null);
    onClose();
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!purpose.trim()) { setError("Please add a purpose for the sprint."); return; }
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/startGroupSprint`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ sprintPurpose: purpose.trim(), duration }),
      });
      if (res.ok) { const data = await res.json(); setGroupSprint(data.groupSprint); setStep(2); }
      else { const body = await res.json().catch(() => ({})); setError(body.message || "We couldn't create the group sprint. Please try again."); }
    } catch { setError("We couldn't reach the server. Please check your connection and try again."); }
    finally { setIsLoading(false); }
  }

  async function handleHostCheckin(e) {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/startSprint`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          duration: groupSprint.duration,
          intro: intro.trim() || null,
          checkin: checkin.trim() || null,
          groupSprintId: groupSprint.id,
          startWordCount: startWordCount ? Number(startWordCount) : 0,
        }),
      });
      if (res.ok) { const data = await res.json(); onCreated(groupSprint, data.sprint); handleClose(); }
      else { const body = await res.json().catch(() => ({})); setError(body.message || "We couldn't start the sprint. Please try again."); }
    } catch { setError("We couldn't reach the server. Please check your connection and try again."); }
    finally { setIsLoading(false); }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-ink-primary px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-gold uppercase tracking-widest font-medium mb-0.5">
              {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
            <h2 className="text-xl font-serif text-white">
              {step === 1 ? "Start a Group Sprint" : "Your Introduction"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? "bg-ink-gold" : "bg-white/30"}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 2 ? "bg-ink-gold" : "bg-white/30"}`} />
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleCreateGroup} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-2">
                What's the purpose of this sprint?
              </label>
              <textarea
                value={purpose} onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Let's finish our chapters before the week starts 🌙"
                rows={3} maxLength={200}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm resize-none transition-all bg-ink-cream"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{purpose.length}/200</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-3">Sprint duration</label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((dur) => (
                  <button key={dur.value} type="button" onClick={() => setDuration(dur.value)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${duration === dur.value ? "border-ink-gold bg-amber-50 shadow-soft" : "border-gray-200 hover:border-ink-primary"}`}>
                    <div className={`text-lg font-bold ${duration === dur.value ? "text-ink-primary" : "text-ink-gray"}`}>{dur.value}</div>
                    <div className={`text-xs ${duration === dur.value ? "text-ink-primary" : "text-gray-400"}`}>{dur.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <ErrorBanner message={error} />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleClose}
                className="flex-1 py-3 border-2 border-gray-200 text-ink-gray rounded-xl text-sm font-medium hover:border-ink-primary transition-all">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-3 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Creating...</> : "Continue →"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleHostCheckin} className="p-6 space-y-5">
            <div className="bg-ink-cream rounded-xl p-4 border-l-4 border-ink-gold">
              <p className="text-xs text-ink-lightgray uppercase tracking-wide mb-1">Sprint purpose</p>
              <p className="text-sm text-ink-primary font-medium italic">"{groupSprint?.groupPurpose}"</p>
              <p className="text-xs text-gray-400 mt-1">{groupSprint?.duration} min · share the link so others can join</p>
            </div>

            {/* Intro */}
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-2">
                Introduce yourself <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text" value={intro} onChange={(e) => setIntro(e.target.value)}
                placeholder="e.g. Fantasy writer, working on my debut novel 📖"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm transition-all bg-ink-cream"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{intro.length}/100</p>
            </div>

            {/* Check-in */}
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-2">
                What are <span className="italic">you</span> writing on today?{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={checkin} onChange={(e) => setCheckin(e.target.value)}
                placeholder="e.g. Chapter 12 — the confrontation scene..."
                rows={3} maxLength={200}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm resize-none transition-all bg-ink-cream"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{checkin.length}/200</p>
            </div>

            {/* Start word count */}
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-1">
                What's your current word count? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                We'll use this to calculate how many words you add this sprint.
              </p>
              <input
                type="number" value={startWordCount} onChange={(e) => setStartWordCount(e.target.value)}
                placeholder="e.g. 3400" min={0}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm transition-all bg-ink-cream"
              />
            </div>

            <ErrorBanner message={error} />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setStep(1); setError(null); }}
                className="px-5 py-3 border-2 border-gray-200 text-ink-gray rounded-xl text-sm font-medium hover:border-ink-primary transition-all">
                ← Back
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-3 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Starting...</> : "Start Writing ✍️"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// JOIN GROUP SPRINT MODAL (members)
// intro + check-in → joins the sprint
// ─────────────────────────────────────────────────────────────────────────────
export function JoinGroupSprintModal({ isOpen, onClose, onJoined, groupSprint }) {
  const [intro, setIntro] = useState("");
  const [checkin, setCheckin] = useState("");
  const [startWordCount, setStartWordCount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleClose() { setIntro(""); setCheckin(""); setStartWordCount(""); setError(null); onClose(); }

  async function handleJoin(e) {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/startSprint`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          duration: groupSprint.duration,
          intro: intro.trim() || null,
          checkin: checkin.trim() || null,
          groupSprintId: groupSprint.id,
          startWordCount: startWordCount ? Number(startWordCount) : 0,
        }),
      });
      if (res.ok) { const data = await res.json(); onJoined(data.sprint); handleClose(); }
      else if (res.status === 401) { setError("Your session has expired. Please log in or sign up to continue."); }
      else { const body = await res.json().catch(() => ({})); setError(body.message || "We couldn't join the sprint. Please try again."); }
    } catch { setError("We couldn't reach the server. Please check your connection and try again."); }
    finally { setIsLoading(false); }
  }

  if (!isOpen || !groupSprint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-ink-primary px-6 py-5">
          <p className="text-xs text-ink-gold uppercase tracking-widest font-medium mb-0.5">Joining sprint</p>
          <h2 className="text-xl font-serif text-white">Your Introduction</h2>
        </div>

        <form onSubmit={handleJoin} className="p-6 space-y-5">
          <div className="bg-ink-cream rounded-xl p-4 border-l-4 border-ink-gold">
            <p className="text-xs text-ink-lightgray uppercase tracking-wide mb-1">Sprint purpose</p>
            <p className="text-sm text-ink-primary font-medium italic">"{groupSprint.groupPurpose}"</p>
            <p className="text-xs text-gray-400 mt-1">
              Started by <strong>@{groupSprint.user?.username}</strong> · {groupSprint.duration} min
            </p>
          </div>

          {/* Intro */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-2">
              Introduce yourself <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text" value={intro} onChange={(e) => setIntro(e.target.value)}
              placeholder="e.g. Poet, first sprint ever — excited to be here! ✨"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm transition-all bg-ink-cream"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{intro.length}/100</p>
          </div>

          {/* Check-in */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-2">
              What are you writing on today?{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={checkin} onChange={(e) => setCheckin(e.target.value)}
              placeholder="e.g. Blog post about slow living, just vibing 😌"
              rows={3} maxLength={200}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm resize-none transition-all bg-ink-cream"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{checkin.length}/200</p>
          </div>

          {/* Start word count */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              What's your current word count? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              We'll use this to calculate how many words you add this sprint.
            </p>
            <input
              type="number" value={startWordCount} onChange={(e) => setStartWordCount(e.target.value)}
              placeholder="e.g. 3400" min={0}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm transition-all bg-ink-cream"
            />
          </div>

          <ErrorBanner message={error} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose}
              className="flex-1 py-3 border-2 border-gray-200 text-ink-gray rounded-xl text-sm font-medium hover:border-ink-primary transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? <><Spinner /> Joining...</> : "Start Writing ✍️"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// END GROUP SPRINT MODAL (host only)
// Step 1: checkout + words → Step 2: thank note → ends sprint for everyone
// ─────────────────────────────────────────────────────────────────────────────
export function EndGroupSprintModal({ isOpen, onClose, onEnded, groupSprintId, sprintId }) {
  const [step, setStep] = useState(1);
  const [checkout, setCheckout] = useState("");
  const [endWordCount, setEndWordCount] = useState("");
  const [wordsWritten, setWordsWritten] = useState("");
  const [thankNote, setThankNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleClose() {
    setStep(1); setCheckout(""); setEndWordCount(""); setWordsWritten(""); setThankNote(""); setError(null); onClose();
  }

  async function handleCheckout(e) {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/${sprintId}/endSprint`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ checkout: checkout.trim() || null, endWordCount: endWordCount ? Number(endWordCount) : null }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); setError(body.message || "We couldn't submit your check-out. Please try again."); return; }

      if (wordsWritten) {
        await fetch(`${API_URL}/sprint/${sprintId}/words`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ wordsWritten: Number(wordsWritten) }),
        });
      }

      setStep(2);
    } catch { setError("We couldn't reach the server. Please check your connection and try again."); }
    finally { setIsLoading(false); }
  }

  async function handleEndGroup(e) {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/${groupSprintId}/endGroupSprint`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ThankyouNote: thankNote.trim() || null }),
      });
      if (res.ok) { onEnded(); handleClose(); }
      else { const body = await res.json().catch(() => ({})); setError(body.message || "We couldn't end the group sprint. Please try again."); }
    } catch { setError("We couldn't reach the server. Please check your connection and try again."); }
    finally { setIsLoading(false); }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-ink-primary px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-gold uppercase tracking-widest font-medium mb-0.5">
              {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
            <h2 className="text-xl font-serif text-white">
              {step === 1 ? "Your Check-out" : "Thank Your Writers"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? "bg-ink-gold" : "bg-white/30"}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 2 ? "bg-ink-gold" : "bg-white/30"}`} />
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleCheckout} className="p-6 space-y-5">
            <p className="text-sm text-ink-lightgray">
              ⏰ Time's up! Share how <span className="italic">your</span> session went before ending the sprint for everyone.
            </p>
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-2">
                How did the sprint go? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea value={checkout} onChange={(e) => setCheckout(e.target.value)}
                placeholder="Got the scene drafted! It's rough but the bones are there..."
                rows={3} maxLength={300}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm resize-none transition-all bg-ink-cream"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{checkout.length}/300</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-1">
                What's your total word count now? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Your document's current total. We'll subtract your starting count to calculate what you wrote this sprint.
              </p>
              <input type="number" value={endWordCount}
                onChange={(e) => { setEndWordCount(e.target.value); if (e.target.value) setWordsWritten(""); }}
                placeholder="e.g. 3742" min={0}
                disabled={!!wordsWritten}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm transition-all bg-ink-cream disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-primary mb-1">
                How many words did you write this sprint? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Use this if you didn't track your starting word count.
              </p>
              <input type="number" value={wordsWritten}
                onChange={(e) => { setWordsWritten(e.target.value); if (e.target.value) setEndWordCount(""); }}
                placeholder="e.g. 412" min={0}
                disabled={!!endWordCount}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm transition-all bg-ink-cream disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </div>

            <ErrorBanner message={error} />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleClose}
                className="px-5 py-3 border-2 border-gray-200 text-ink-gray rounded-xl text-sm font-medium hover:border-ink-primary transition-all">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-3 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Saving...</> : "Continue →"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleEndGroup} className="p-6 space-y-5">
            <p className="text-sm text-ink-lightgray">
              Leave a thank you note for everyone who joined. It'll appear at the bottom of the sprint feed 💛
            </p>
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-2">
                Thank note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea value={thankNote} onChange={(e) => setThankNote(e.target.value)}
                placeholder="Thank you all so much for joining tonight. I love how this community shows up for each other..."
                rows={4} maxLength={400}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm resize-none transition-all bg-ink-cream"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{thankNote.length}/400</p>
            </div>
            <ErrorBanner message={error} />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setStep(1); setError(null); }}
                className="px-5 py-3 border-2 border-gray-200 text-ink-gray rounded-xl text-sm font-medium hover:border-ink-primary transition-all">
                ← Back
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-3 bg-ink-gold text-ink-primary rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Ending...</> : "End Sprint for Everyone 🏁"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MEMBER CHECKOUT MODAL
// Non-host members when sprint timer ends
// ─────────────────────────────────────────────────────────────────────────────
export function MemberCheckoutModal({ isOpen, onClose, onCheckedOut, sprintId }) {
  const [checkout, setCheckout] = useState("");
  const [endWordCount, setEndWordCount] = useState("");
  const [wordsWritten, setWordsWritten] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleClose() { setCheckout(""); setEndWordCount(""); setWordsWritten(""); setError(null); onClose(); }

  async function handleSubmit(e) {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/${sprintId}/endSprint`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ checkout: checkout.trim() || null, endWordCount: endWordCount ? Number(endWordCount) : null }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); setError(body.message || "We couldn't submit your check-out. Please try again."); return; }

      if (wordsWritten) {
        await fetch(`${API_URL}/sprint/${sprintId}/words`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ wordsWritten: Number(wordsWritten) }),
        });
      }

      const data = await res.json().catch(() => ({}));
      onCheckedOut(data.sprint); handleClose();
    } catch { setError("We couldn't reach the server. Please check your connection and try again."); }
    finally { setIsLoading(false); }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-ink-primary px-6 py-5">
          <p className="text-xs text-ink-gold uppercase tracking-widest font-medium mb-0.5">Time's up ⏰</p>
          <h2 className="text-xl font-serif text-white">Your Check-out</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-ink-lightgray">Great sprint! Share how it went with the group.</p>
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-2">
              How did the sprint feel? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={checkout} onChange={(e) => setCheckout(e.target.value)}
              placeholder="Productive! Finally got unstuck on that scene..."
              rows={3} maxLength={300}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm resize-none transition-all bg-ink-cream"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{checkout.length}/300</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              What's your total word count now? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Your document's current total. We'll subtract your starting count to calculate what you wrote this sprint.
            </p>
            <input type="number" value={endWordCount}
              onChange={(e) => { setEndWordCount(e.target.value); if (e.target.value) setWordsWritten(""); }}
              placeholder="e.g. 3742" min={0}
              disabled={!!wordsWritten}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm transition-all bg-ink-cream disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              How many words did you write this sprint? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Use this if you didn't track your starting word count.
            </p>
            <input type="number" value={wordsWritten}
              onChange={(e) => { setWordsWritten(e.target.value); if (e.target.value) setEndWordCount(""); }}
              placeholder="e.g. 287" min={0}
              disabled={!!endWordCount}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-ink-gold focus:border-ink-gold text-ink-gray placeholder-gray-400 text-sm transition-all bg-ink-cream disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>

          <ErrorBanner message={error} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose}
              className="px-5 py-3 border-2 border-gray-200 text-ink-gray rounded-xl text-sm font-medium hover:border-ink-primary transition-all">
              Skip
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? <><Spinner /> Submitting...</> : "Submit Check-out 🏁"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}