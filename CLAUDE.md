# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install        # also works: npm / yarn / bun
pnpm dev            # Next.js dev server on http://localhost:3000
pnpm build          # production build
pnpm start          # serve the production build
pnpm lint           # next lint (eslint-config-next, ESLint 9)
```

There is no test runner configured. The TypeScript config is strict; `pnpm build` is the de-facto type check.

Path alias: `@/*` resolves to the repo root (see [tsconfig.json](tsconfig.json)).

## Architecture

This is a **client-only prototype** of the Apnaops product. There is no backend — all data is seeded in code, mutated in memory, and partially persisted to `localStorage`. Treat the Zustand store as the single source of truth for everything: auth, entities, derived data, and UI state.

### State (the central thing)

[lib/store.ts](lib/store.ts) — one Zustand store owns all app state and mutations. Notable:

- The `persist` middleware **only persists `session`, `currentUserId`, and `users`** to `localStorage` under `apnaops-state`. Everything else (issues, metrics, agents, comments, etc.) is reseeded on reload from [lib/seed-data.ts](lib/seed-data.ts). If you add a mutation whose result should survive reload, you must also extend the persist `partialize`.
- Metric data is **derived**, not seeded directly: [lib/metric-data.ts](lib/metric-data.ts) deterministically generates the location × metric grid from seed locations/metrics/thresholds. `reloadData()` re-runs this generator; the dashboard "reload" button has a role-gated lock window stored in `dashboard.reloadLockUntil`.
- Entity shapes live in [lib/types.ts](lib/types.ts). When changing an entity, update types, seed data, and the corresponding `upsert*`/`delete*` mutation in the store together.

### Routing & auth

App Router with a route group:

- [app/login/page.tsx](app/login/page.tsx) — sign in + first-time set-password flow. Reads/writes via the store.
- [app/(app)/layout.tsx](app/(app)/layout.tsx) — auth gate. Redirects to `/login` when `session.authenticated` is false. **Renders nothing until mounted** to avoid SSR/persist hydration mismatch — preserve this pattern in any new top-level layout that reads from the persisted store.
- Pages under `app/(app)/{home,dashboard,actions,metrics,users,roles,dimensions,connectors,agents}/page.tsx` mirror the original HTML prototype.

Access levels are `owner | admin | operator` (see [lib/types.ts](lib/types.ts:1)). Several UI affordances (password reveal, dashboard reload, Setup sidebar section) are role-gated — check the existing pages for the gating pattern before adding new privileged actions.

### UI

- Tailwind v4 with `@theme inline` tokens (OKLCH) in [app/globals.css](app/globals.css) — the TweakCN purple palette. Light + dark variants live in `:root` and `.dark`; replacing the theme means pasting new token blocks here, not touching tailwind config.
- shadcn/ui primitives under `components/ui/*`. App-level composites (sidebar, issue card, comments thread, action/flag/trend dialogs) live directly in `components/`. The sidebar is hover-to-expand / click-to-lock — see [components/app-sidebar.tsx](components/app-sidebar.tsx).
- Theming via `next-themes` (`ThemeProvider` in [app/layout.tsx](app/layout.tsx)); toggle is inside the Settings UI, not a standalone button.

### Conventions

- Any file that touches the store needs `"use client"`. The store itself is `"use client"`.
- Mutations go through store methods, not local component state, so persistence and cross-page sync stay coherent.
- Resetting local state during development: `localStorage.removeItem("apnaops-state")` and reload.
