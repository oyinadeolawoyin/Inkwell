// src/components/mailbox/mailboxCardTheme.js
//
// Maps each MailboxCardType to a color, icon, and writing placeholder.
// Colors are pulled from index.css's existing tokens, not new hex values.
//
//   WELCOME   → --note-blue  (single-shade sticky-note token — same
//               alpha-modifier trick previously used for WELCOME's old
//               pink, just swapped to blue; still built as light/border/
//               text variants via opacity since it's one shade, not a
//               100/300/500/700 ramp)
//   BOOSTER   → --red-*      (the raw ramp — hype/energy for a writer
//               about to start a new draft plan. Freed up by moving
//               THANK_YOU to purple below, so no collision)
//   CONGRATS  → --success    (unchanged — already means "completion /
//               reward", a perfect semantic fit)
//   WELL_DONE → --quest      (unchanged — warm gold, treasure/reward feel)
//   THANK_YOU → --purple-*   (the raw ramp, deliberately NOT --bonus —
//               that name carries "Bonus Day Quest" meaning elsewhere in
//               the app; reaching for the raw --purple-* variables gets
//               the same color without that association)
//   BIRTHDAY  → --note-pink  (the one true pink in the file, freed up by
//               moving WELCOME to blue — same single-shade + opacity
//               construction as WELCOME above)
export const CARD_THEME = {
  WELCOME: {
    label: "Welcome",
    icon: "Flower2",
    placeholder: "What made you glad they showed up? A story starts with one person deciding to write it — tell them theirs just began.",
    bg: "hsl(var(--note-blue) / 0.14)",
    border: "hsl(var(--note-blue) / 0.4)",
    text: "hsl(var(--note-blue))",
    solid: "hsl(var(--note-blue))",
  },
  BOOSTER: {
    label: "Booster",
    icon: "Rocket",
    placeholder: "They just started a new story. What would help them push through the blank-page nerves of day one? Send some energy and belief.",
    bg: "hsl(var(--red-100))",
    border: "hsl(var(--red-300))",
    text: "hsl(var(--red-700))",
    solid: "hsl(var(--red-500))",
  },
  CONGRATS: {
    label: "Congratulations",
    icon: "PartyPopper",
    placeholder: "What did they just pull off? Name the specific thing — finishing a draft, hitting a goal, showing up for weeks straight.",
    bg: "hsl(var(--success-100))",
    border: "hsl(var(--success-300))",
    text: "hsl(var(--success-700))",
    solid: "hsl(var(--success-500))",
  },
  WELL_DONE: {
    label: "Well Done",
    icon: "Star",
    placeholder: "What did you notice about how they showed up today? Effort counts even on the days the words didn't come easy.",
    bg: "hsl(var(--quest-100))",
    border: "hsl(var(--quest-300))",
    text: "hsl(var(--quest-700))",
    solid: "hsl(var(--quest-500))",
  },
  THANK_YOU: {
    label: "Thank You",
    icon: "Heart",
    placeholder: "What did they do that actually helped? A comment, a check-in, just being there — say what it meant.",
    bg: "hsl(var(--purple-100))",
    border: "hsl(var(--purple-300))",
    text: "hsl(var(--purple-700))",
    solid: "hsl(var(--purple-500))",
  },
  BIRTHDAY: {
    label: "Birthday",
    icon: "Cake",
    placeholder: "What do you want them to know on their birthday? A little celebration goes a long way — make it personal.",
    bg: "hsl(var(--note-pink) / 0.14)",
    border: "hsl(var(--note-pink) / 0.4)",
    text: "hsl(var(--note-pink))",
    solid: "hsl(var(--note-pink))",
  },
};

export const CARD_TYPES = ["WELCOME", "BOOSTER", "CONGRATS", "WELL_DONE", "THANK_YOU", "BIRTHDAY"];