// src/components/mailbox/sendCardModal.jsx
//
// Shared between WorkspaceDashboard's SendCardButton (recipient already
// known — someone in the "Writing today" list) and MailboxPage (sending
// one back to a card's sender). Picking a type re-colors the whole modal
// to that card's theme before the writer even starts typing, so the
// placeholder and color make it obvious what tone to write in.
import { useState } from "react";
import { X, Flower2, PartyPopper, Star, Heart, Rocket, Cake, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CARD_THEME, CARD_TYPES } from "./mailboxCardTheme";
import { sendMailboxCard } from "./mailboxApi";

const ICONS = { Flower2, PartyPopper, Star, Heart, Rocket, Cake };

export default function SendCardModal({ recipientId, recipientName, onClose, onSent }) {
  const [type, setType] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    if (!type || !note.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendMailboxCard(recipientId, type, note.trim());
      setSent(true);
      onSent?.(type);
      setTimeout(onClose, 1100);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const theme = type ? CARD_THEME[type] : null;
  const inkTitle = theme ? `color-mix(in srgb, ${theme.solid} 75%, black)` : "rgba(30,24,20,0.9)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="paper-card w-full max-w-md rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center"
              style={{ background: theme.bg, color: theme.text }}
            >
              <Check className="h-6 w-6" />
            </div>
            <p className="font-semibold" style={{ fontFamily: "var(--font-card-display)", color: inkTitle }}>
              Card sent{recipientName ? ` to ${recipientName}` : ""}.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold" style={{ fontFamily: "var(--font-card-display)", color: inkTitle }}>
                {recipientName ? `Send a card to ${recipientName}` : "Send a card"}
              </p>
              <button onClick={onClose} className="transition-opacity hover:opacity-60" style={{ color: "rgba(30,24,20,0.45)" }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {CARD_TYPES.map((t) => {
                const tTheme = CARD_THEME[t];
                const Icon = ICONS[tTheme.icon];
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className="rounded-xl p-3 flex flex-col items-center gap-1.5 transition-transform"
                    style={{
                      background: tTheme.bg,
                      border: `1.5px solid ${active ? tTheme.solid : tTheme.border}`,
                      transform: active ? "scale(1.04)" : "scale(1)",
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: tTheme.text }} />
                    <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: tTheme.text }}>
                      {tTheme.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={theme ? theme.placeholder : "Pick a card above to start writing…"}
              rows={4}
              disabled={!type}
              className="mb-2 bg-white/60 border-black/10 placeholder:italic"
              style={{ color: "rgba(30,24,20,0.9)" }}
            />
            {error && <p className="text-xs mb-2" style={{ color: "hsl(var(--red-500))" }}>{error}</p>}

            <Button
              className="w-full"
              onClick={send}
              disabled={!type || !note.trim() || sending}
              style={theme ? { background: theme.solid, color: "white" } : undefined}
            >
              <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send card"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}