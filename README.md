# Apnaops · Next.js

The Apnaops prototype rebuilt as a Next.js 15 + shadcn/ui app, themed with the TweakCN purple palette.

## Stack
- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 + shadcn/ui (Modern Minimal · purple primary)
- Inter + JetBrains Mono via `next/font/google`
- Zustand store with `localStorage` persistence
- Lucide icons

## Quick start

```bash
pnpm install      # or npm install / yarn / bun install
pnpm dev          # localhost:3000
```

Open <http://localhost:3000>, sign in with:

| Role  | Email                       | Password    |
|-------|-----------------------------|-------------|
| Owner | ritul.shinde@apnamart.in    | apnaops123  |
| Admin | rohit@apnamart.in           | demo123     |
| Operator | vikram@apnamart.in       | (set on first login) |

## What's inside

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root with fonts + ThemeProvider |
| `app/globals.css` | TweakCN purple tokens (light + dark) + tailwind v4 |
| `app/login/page.tsx` | Sign in + first-time set password |
| `app/(app)/layout.tsx` | Sidebar + auth gate |
| `app/(app)/{home,dashboard,actions,...}/page.tsx` | 9 routes mirroring the HTML prototype |
| `components/ui/*.tsx` | shadcn primitives (button, card, badge, dialog, table, …) |
| `components/app-sidebar.tsx` | Hover-expand sidebar with animated nav badge |
| `components/issue-card.tsx` | Full + read-only issue card |
| `components/comments-thread.tsx` | Comments w/ edit + delete + (edited) marker |
| `components/issue-action-dialog.tsx` | Working / Resolved / Reject / Reassign / Edit RCA / Edit Fix flows |
| `lib/store.ts` | Zustand store (single source of truth) |
| `lib/seed-data.ts` | All mock data (users, roles, metrics, issues, agents, …) |
| `lib/metric-data.ts` | Deterministic store metric generator + threshold helpers |
| `lib/types.ts` | TypeScript types for every entity |

## Implemented features

- **Auth** — login, first-time set password, sign-out confirmation (in Settings)
- **My Home** — personalized issues (role × geo), today's standups, KPI cards
- **My Dashboard** — location × metric grid, filter chips, search, export CSV, role-gated reload
- **My Actions** — searchable + filterable activity log, click row to open issue detail, export CSV
- **Setup** (admin-only sidebar section)
  - **Users** — CRUD, soft-delete (active flag), password reveal in edit modal (owner only)
  - **Roles & Permissions** — indented tree, click-to-select, no default selection, Standup Meetings + Sync agent
  - **Metrics Catalog** — CRUD, soft-delete, embedded Thresholds table
  - **Dimensions** — global, admin-defined hierarchies with View values modal
  - **Connectors** — typed data sources (postgres/bigquery/snowflake/mysql/mongo/rest/sheets/csv/mcp), secret reference (no plaintext storage)
  - **Agents & Schedules** — 15 system agents + custom agent builder, merged Run/Pause toggle, History modal with synthetic JobRun data
- **Theme** — light/dark via `next-themes` (toggle inside Settings)
- **Sidebar** — hover-to-expand, click-to-lock, animated nav badge (dot in collapsed → full pill in expanded)
- **Issue card** — single hierarchy: header (metric + severity + status), description (location + threshold), meta line, 3-column body, action footer, collapsible comments
- **Comments** — author can edit + delete own; admin/owner can delete others; (edited) marker; @-mention highlighting

## State persistence

The Zustand store persists `session`, `currentUserId`, and `users` to `localStorage` under key `apnaops-state`. To reset:

```js
localStorage.removeItem("apnaops-state");
```

then reload.

## Production build

```bash
pnpm build
pnpm start
```

Or deploy to Vercel: `vercel deploy`.

## Theme

The TweakCN theme is in `app/globals.css` as OKLCH tokens (Tailwind v4 `@theme inline` block). To replace, paste a new `index.css` over the existing `:root` and `.dark` blocks.

## License

Internal Apnamart prototype. Do not redistribute outside the org.
