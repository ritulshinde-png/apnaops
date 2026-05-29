"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  User, Role, Metric, Threshold, Dimension, LocationNode, Standup, Issue, AgentDef, Connector, MyActionEntry, Actionable, DashFilters, SessionState,
} from "./types";
import {
  SEED_USERS, SEED_ROLES, SEED_METRICS, SEED_THRESHOLDS, SEED_DIMENSIONS, SEED_LOCATIONS, SEED_STANDUPS, SEED_ISSUES, SEED_AGENTS, SEED_CONNECTORS, SEED_ACTIONS, SEED_ACTIONABLES,
} from "./seed-data";
import { buildMetricData, type MetricRow } from "./metric-data";

interface AppState {
  // Auth
  session: SessionState;
  currentUserId: string | null;
  setSession: (s: Partial<SessionState>) => void;
  loginUser: (u: User) => void;
  logout: () => void;

  // Entities
  users: User[];
  roles: Role[];
  metrics: Metric[];
  thresholds: Threshold[];
  dimensions: Dimension[];
  locations: Record<string, LocationNode>;
  standups: Standup[];
  issues: Issue[];
  agents: AgentDef[];
  connectors: Connector[];
  actions: MyActionEntry[];
  actionables: Actionable[];

  // Data
  data: Record<string, MetricRow>;
  reloadData: () => void;
  dashboard: { lastReloaded: string | null; reloadLockUntil: number };
  dashFilters: DashFilters;
  setDashFilter: <K extends keyof DashFilters>(k: K, v: DashFilters[K]) => void;
  expanded: Record<string, boolean>;
  toggleLocation: (locId: string) => void;
  setExpanded: (locId: string, val: boolean) => void;
  selectedRoleId: string | null;
  selectRole: (id: string | null) => void;

  // Per-issue open-comments state
  openComments: Record<string, boolean>;
  toggleComments: (id: string) => void;

  // Mutations
  addAction: (a: MyActionEntry) => void;
  updateIssue: (id: string, patch: Partial<Issue>) => void;
  addCommentToIssue: (id: string, text: string) => void;
  editComment: (issueId: string, commentId: string, text: string) => void;
  deleteComment: (issueId: string, commentId: string) => void;

  upsertUser: (u: User) => void;
  toggleUserActive: (id: string) => void;
  upsertMetric: (m: Metric) => void;
  toggleMetricActive: (id: string) => void;
  upsertRole: (r: Role) => void;
  deleteRole: (id: string) => void;
  upsertDimension: (d: Dimension) => void;
  deleteDimension: (id: string) => void;
  upsertConnector: (c: Connector) => void;
  toggleConnectorActive: (id: string) => void;
  testConnector: (id: string) => void;
  upsertStandup: (s: Standup) => void;
  deleteStandup: (id: string) => void;
  syncMeetings: () => { created: number; updated: number };
  upsertAgent: (a: AgentDef) => void;
  deleteAgent: (id: string) => void;
  runAgentNow: (id: string) => void;
  pauseAgent: (id: string) => void;
  resumeAgent: (id: string) => void;

  upsertThreshold: (t: Threshold) => void;
  deleteThreshold: (id: string) => void;
  crawlDimension: (id: string) => void;
  crawlAllDimensions: () => void;

}

const nowTs = () => new Date().toISOString().replace("T", " ").slice(0, 16);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      session: { authenticated: false, stage: "email", pendingUserId: null },
      currentUserId: null,
      setSession: (s) => set((st) => ({ session: { ...st.session, ...s } })),
      loginUser: (u) => {
        set({ session: { authenticated: true, stage: null, pendingUserId: null }, currentUserId: u.id });
        get().addAction({ ts: nowTs(), kind: "standup", text: `Signed in as ${u.name}`, meta: `${u.email} · access ${u.accessLevel}` });
      },
      logout: () => set({ session: { authenticated: false, stage: "email", pendingUserId: null }, currentUserId: null }),

      users: SEED_USERS,
      roles: SEED_ROLES,
      metrics: SEED_METRICS,
      thresholds: SEED_THRESHOLDS,
      dimensions: SEED_DIMENSIONS,
      locations: SEED_LOCATIONS,
      standups: SEED_STANDUPS,
      issues: SEED_ISSUES,
      agents: SEED_AGENTS,
      connectors: SEED_CONNECTORS,
      actions: SEED_ACTIONS,
      actionables: SEED_ACTIONABLES,

      data: buildMetricData(),
      reloadData: () => set({ data: buildMetricData(), dashboard: { lastReloaded: nowTs(), reloadLockUntil: Date.now() + 60 * 60 * 1000 } }),
      dashboard: { lastReloaded: null, reloadLockUntil: 0 },
      dashFilters: { metric: "all", metricsSet: null, dateRange: "last7", breakdown: "daily", customRange: null, myMetrics: true, search: "", sortBy: null, statusFilter: "all" },
      setDashFilter: (k, v) => set((st) => ({ dashFilters: { ...st.dashFilters, [k]: v } })),
      expanded: { global: true, JH: true, JH_ranchi: true },
      toggleLocation: (locId) => set((st) => ({ expanded: { ...st.expanded, [locId]: !st.expanded[locId] } })),
      setExpanded: (locId, val) => set((st) => ({ expanded: { ...st.expanded, [locId]: val } })),
      selectedRoleId: null,
      selectRole: (id) => set((st) => ({ selectedRoleId: st.selectedRoleId === id ? null : id })),

      openComments: {},
      toggleComments: (id) => set((st) => ({ openComments: { ...st.openComments, [id]: !st.openComments[id] } })),

      addAction: (a) => set((st) => ({ actions: [a, ...st.actions] })),
      updateIssue: (id, patch) => set((st) => ({ issues: st.issues.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: nowTs() } : i)) })),
      addCommentToIssue: (id, text) => set((st) => {
        const me = st.users.find((u) => u.id === st.currentUserId);
        const c = { id: "c_" + Date.now().toString(36), userId: me?.id || "u0", userName: me?.name || "You", ts: nowTs(), text, edited: false };
        return {
          issues: st.issues.map((i) => (i.id === id ? { ...i, comments: [...i.comments, c], updatedAt: nowTs() } : i)),
          openComments: { ...st.openComments, [id]: true },
          actions: [{ ts: nowTs(), kind: "comment", text: `Commented on issue · ${st.issues.find(x => x.id === id)?.metric}`, meta: text.slice(0, 80), issueId: id }, ...st.actions],
        };
      }),
      editComment: (issueId, commentId, text) => set((st) => ({
        issues: st.issues.map((i) =>
          i.id !== issueId ? i : { ...i, comments: i.comments.map((c) => (c.id === commentId ? { ...c, text, edited: true } : c)), updatedAt: nowTs() }
        ),
      })),
      deleteComment: (issueId, commentId) => set((st) => ({
        issues: st.issues.map((i) =>
          i.id !== issueId ? i : { ...i, comments: i.comments.filter((c) => c.id !== commentId), updatedAt: nowTs() }
        ),
      })),

      upsertUser: (u) => set((st) => {
        const exists = st.users.find((x) => x.id === u.id);
        return { users: exists ? st.users.map((x) => (x.id === u.id ? { ...x, ...u } : x)) : [...st.users, u] };
      }),
      toggleUserActive: (id) => set((st) => ({ users: st.users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)) })),
      upsertMetric: (m) => set((st) => {
        const exists = st.metrics.find((x) => x.id === m.id);
        return { metrics: exists ? st.metrics.map((x) => (x.id === m.id ? { ...x, ...m } : x)) : [...st.metrics, m] };
      }),
      toggleMetricActive: (id) => set((st) => ({ metrics: st.metrics.map((m) => (m.id === id ? { ...m, active: !m.active } : m)) })),
      upsertRole: (r) => set((st) => {
        const exists = st.roles.find((x) => x.id === r.id);
        return { roles: exists ? st.roles.map((x) => (x.id === r.id ? { ...x, ...r } : x)) : [...st.roles, r] };
      }),
      deleteRole: (id) => set((st) => {
        const r = st.roles.find((x) => x.id === id);
        return {
          roles: st.roles.filter((x) => x.id !== id).map((x) => (x.parent === id ? { ...x, parent: null } : x)),
          users: st.users.map((u) => (u.role === r?.name ? { ...u, role: "" } : u)),
          selectedRoleId: null,
        };
      }),
      upsertDimension: (d) => set((st) => {
        const exists = st.dimensions.find((x) => x.id === d.id);
        return { dimensions: exists ? st.dimensions.map((x) => (x.id === d.id ? { ...x, ...d } : x)) : [...st.dimensions, d] };
      }),
      deleteDimension: (id) => set((st) => ({
        dimensions: st.dimensions.filter((x) => x.id !== id),
        metrics: st.metrics.map((m) => ({ ...m, dimensions: m.dimensions.filter((x) => x !== id) })),
      })),
      upsertConnector: (c) => set((st) => {
        const exists = st.connectors.find((x) => x.id === c.id);
        return { connectors: exists ? st.connectors.map((x) => (x.id === c.id ? { ...x, ...c } : x)) : [...st.connectors, c] };
      }),
      toggleConnectorActive: (id) => set((st) => ({ connectors: st.connectors.map((c) => (c.id === id ? { ...c, active: !c.active } : c)) })),
      testConnector: (id) => set((st) => {
        const ok = Math.random() > 0.15;
        return {
          connectors: st.connectors.map((c) => (c.id === id ? { ...c, status: ok ? "connected" : "failed", lastTestedAt: nowTs() } : c)),
          actions: [{ ts: nowTs(), kind: "metric", text: `Tested connector · ${st.connectors.find((c) => c.id === id)?.name}`, meta: ok ? "connection ok" : "connection failed" }, ...st.actions],
        };
      }),
      upsertStandup: (s) => set((st) => {
        const exists = st.standups.find((x) => x.id === s.id);
        if (exists) {
          const changed = exists.name !== s.name || exists.time !== s.time || exists.cadence !== s.cadence || JSON.stringify(exists.attendees) !== JSON.stringify(s.attendees);
          return { standups: st.standups.map((x) => (x.id === s.id ? { ...x, ...s, syncDirty: changed && exists.meetLink ? true : x.syncDirty } : x)) };
        }
        return { standups: [...st.standups, { ...s, meetLink: null, meetingId: null, lastSyncedAt: null, syncDirty: false }] };
      }),
      deleteStandup: (id) => set((st) => ({ standups: st.standups.filter((s) => s.id !== id) })),
      syncMeetings: () => {
        const st = get();
        const toCreate = st.standups.filter((s) => !s.meetLink);
        const toUpdate = st.standups.filter((s) => s.meetLink && s.syncDirty);
        const tag = () => Math.random().toString(36).substring(2, 5);
        const ts = nowTs();
        set({
          standups: st.standups.map((s) => {
            if (!s.meetLink) return { ...s, meetLink: `https://meet.google.com/${tag()}-${tag() + tag().slice(0, 1)}-${tag()}`, meetingId: "gcal_" + Date.now().toString(36) + "_" + tag(), lastSyncedAt: ts, syncDirty: false };
            if (s.syncDirty) return { ...s, lastSyncedAt: ts, syncDirty: false };
            return s;
          }),
        });
        if (toCreate.length) get().addAction({ ts, kind: "standup", text: `Calendar-sync created ${toCreate.length} meeting(s)`, meta: toCreate.map((s) => s.name).join(", ") });
        if (toUpdate.length) get().addAction({ ts, kind: "standup", text: `Calendar-sync updated ${toUpdate.length} meeting(s)`, meta: toUpdate.map((s) => s.name).join(", ") + " · Meet link unchanged" });
        return { created: toCreate.length, updated: toUpdate.length };
      },
      upsertAgent: (a) => set((st) => {
        const exists = st.agents.find((x) => x.id === a.id);
        return { agents: exists ? st.agents.map((x) => (x.id === a.id ? { ...x, ...a } : x)) : [...st.agents, { ...a, id: a.id || "a-custom_" + Date.now().toString(36), isSystem: false, paused: false, status: "success", lastRun: "never" }] };
      }),
      deleteAgent: (id) => set((st) => ({ agents: st.agents.filter((a) => a.id !== id) })),
      runAgentNow: (id) => {
        set((st) => ({ agents: st.agents.map((a) => (a.id === id ? { ...a, running: true, paused: false, status: "running", lastRun: "just now" } : a)) }));
        setTimeout(() => set((st) => ({ agents: st.agents.map((a) => (a.id === id && a.running && !a.paused ? { ...a, running: false, status: "success" } : a)) })), 1500);
      },
      pauseAgent: (id) => set((st) => ({ agents: st.agents.map((a) => (a.id === id ? { ...a, paused: true, running: false, status: "paused" } : a)) })),

      upsertThreshold: (t) => set((st) => {
        const exists = st.thresholds.find((x) => x.id === t.id);
        return { thresholds: exists ? st.thresholds.map((x) => (x.id === t.id ? { ...x, ...t } : x)) : [...st.thresholds, t] };
      }),
      deleteThreshold: (id) => set((st) => ({ thresholds: st.thresholds.filter((x) => x.id !== id) })),
      crawlDimension: (id) => set((st) => {
        const ts = nowTs();
        return {
          dimensions: st.dimensions.map((d) => (d.id === id ? { ...d, lastCrawled: ts } : d)),
          actions: [{ ts, kind: "metric", text: `Crawled dimension · ${st.dimensions.find(d => d.id === id)?.name || id}`, meta: "value lists refreshed" }, ...st.actions],
        };
      }),
      crawlAllDimensions: () => set((st) => {
        const ts = nowTs();
        return {
          dimensions: st.dimensions.map((d) => ({ ...d, lastCrawled: ts })),
          actions: [{ ts, kind: "metric", text: `Crawled all dimensions · refreshed value lists`, meta: `${st.dimensions.length} dimensions updated` }, ...st.actions],
        };
      }),
      resumeAgent: (id) => { set((st) => ({ agents: st.agents.map((a) => (a.id === id ? { ...a, paused: false } : a)) })); get().runAgentNow(id); },
    }),
    {
      name: "apnaops-state",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage))),
      partialize: (st) => ({ session: st.session, currentUserId: st.currentUserId, users: st.users }),
    }
  )
);

// Current user selector (derived)
export function useCurrentUser(): User | null {
  const id = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  return id ? users.find((u) => u.id === id) || null : null;
}
