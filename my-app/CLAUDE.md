# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server with HMR
npm run build     # Production build (outputs to /dist)
npm run lint      # Run ESLint
npm run preview   # Preview the production build locally
```

There is no test suite configured.

## Architecture

**Inkwell** is a React 19 SPA (Vite) for writing sprints and productivity. The backend is a separate Express API at `https://inkwellbackend.onrender.com/api` (deployed on Render.com — may need a wake-up ping on cold starts). The frontend is deployed on Vercel.

### Routing

All routes are defined in `src/main.jsx` using React Router v7 (`createBrowserRouter`). The `AuthProvider` from `src/components/auth/authContext.jsx` wraps the entire app, providing global auth state via the `useAuth()` hook.

Key routes:
- `/` — Homepage (`App.jsx`): sprint feed, weekly progress, daily quotes
- `/dashboard` — Writing schedule, stats, sprint CTAs
- `/start-sprint` → `/sprint/:sprintId` — Solo sprint flow
- `/group-sprint/:groupSprintId` — Group sprint workspace
- `/profile/:userId` — User profiles
- `/setup-plan` — Writing plan configuration
- `/notifications` — Notification center

### API Calls

All API requests go through `src/config/api.js`. Use `apiCall(endpoint, options)` for authenticated requests — it automatically attaches `credentials: 'include'` (session cookies) and the correct base URL for the environment.

- Development: `http://localhost:5000/api` (`.env.development`)
- Production: `https://inkwellbackend.onrender.com/api` (`.env.production`)

Some components implement retry logic or a server health-check ping to handle Render.com cold starts.

### Auth

`AuthContext` checks `/auth/me` on mount, stores the user in both context and `localStorage`, and exposes `{ user, setUser, isLoading, logout }`. Protected pages should call `useAuth()` and redirect if `!user`.

### Component Organization

Components are organized by feature under `src/components/`:

| Folder | Contents |
|---|---|
| `auth/` | Login, signup, welcome, `authContext.jsx` |
| `dashboard/` | Main dashboard page |
| `sprint/` | Solo workspace, group workspace, start sprint, group modals/feed |
| `writingPlan/` | Setup plan, progress stats, writing schedule |
| `profile/` | Profile page, header with nav/notifications, edit profile |
| `notification/` | Notifications page and setup |
| `quote/` | Daily quote component |
| `utilis/` | `metatags.jsx` for dynamic `<head>` tags |

### Sprint Word Count Model

The backend Sprint model tracks word counts as:
- `startWordCount` — collected when starting a sprint
- `endWordCount` — collected when ending a sprint
- `wordsWritten` — calculated by backend as `endWordCount - startWordCount`

Daily/weekly totals are SUM of `wordsWritten` across sprints for the period.

### Styling

Tailwind CSS with a custom Inkwell design system defined in `tailwind.config.js`:
- **Colors:** `ink-primary` (#2d3748), `ink-gold` (#d4af37), `ink-cream` (#fafaf9)
- **Fonts:** Serif (Georgia/Merriweather) for headings, Sans (Inter) for body
- **Shadows:** `shadow-soft`, `shadow-soft-lg`
- CSS custom properties (HSL) are also defined in `index.css` for `--primary`, `--accent`, `--background`, etc.

### Path Aliases

`@/` maps to `src/` (configured in both `vite.config.js` and `jsconfig.json`).
