/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      colors: {
        // Raw palette — for when you need a specific step (bg-sky-100 for a
        // subtle badge fill, text-amber-700 for text-on-light, etc.)
        paper: {
          DEFAULT: "hsl(var(--paper))",
          muted: "hsl(var(--paper-muted))",
          border: "hsl(var(--paper-border))",
        },
        ink: {
          900: "hsl(var(--ink-900))",
          700: "hsl(var(--ink-700))",
          500: "hsl(var(--ink-500))",
          200: "hsl(var(--ink-200))",
        },
        sky: {
          100: "hsl(var(--sky-100))",
          300: "hsl(var(--sky-300))",
          500: "hsl(var(--sky-500))",
          700: "hsl(var(--sky-700))",
        },
        amber: {
          100: "hsl(var(--amber-100))",
          300: "hsl(var(--amber-300))",
          500: "hsl(var(--amber-500))",
          700: "hsl(var(--amber-700))",
        },
        green: {
          100: "hsl(var(--green-100))",
          300: "hsl(var(--green-300))",
          500: "hsl(var(--green-500))",
          700: "hsl(var(--green-700))",
        },
        pink: {
          100: "hsl(var(--pink-100))",
          300: "hsl(var(--pink-300))",
          500: "hsl(var(--pink-500))",
          700: "hsl(var(--pink-700))",
        },

        // Semantic shadcn slots — drive every shadcn/ui component
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Semantic Quillweave meanings — use these in components so the
        // *meaning* is what's in the markup (bg-achievement, not bg-amber-500)
        social: {
          DEFAULT: "hsl(var(--social))",
          foreground: "hsl(var(--social-foreground))",
        },
        achievement: {
          DEFAULT: "hsl(var(--achievement))",
          foreground: "hsl(var(--achievement-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  // shadcn's animated components (accordion, dialog, etc.) need this.
  // `npm i -D tailwindcss-animate` if it isn't already in your project.
  plugins: [require("tailwindcss-animate")],
};