"use client";
import * as React from "react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { METRIC_KEYS, cellClass, type MetricDef } from "@/lib/metric-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TrendModal } from "@/components/trend-modal";
import { FlagModal } from "@/components/flag-modal";
import { ChevronRight, BarChart3, ArrowUp, ArrowDown, Download, RotateCcw, ChevronDown, Search, Flag, Check } from "lucide-react";
import {
  TIME_RANGE_OPTIONS,
  BREAKDOWN_OPTIONS,
  getAllowedBreakdowns,
  formatDateDdMmYyyy,
  type TimeRange,
  type Breakdown,
  type CustomRange,
} from "@/lib/metric-trend";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const user = useCurrentUser();
  const metrics = useAppStore((s) => s.metrics);
  const data = useAppStore((s) => s.data);
  const locations = useAppStore((s) => s.locations);
  const expanded = useAppStore((s) => s.expanded);
  const toggleLocation = useAppStore((s) => s.toggleLocation);
  const setExpanded = useAppStore((s) => s.setExpanded);
  const filters = useAppStore((s) => s.dashFilters);
  const setDashFilter = useAppStore((s) => s.setDashFilter);
  const dashboard = useAppStore((s) => s.dashboard);
  const reloadData = useAppStore((s) => s.reloadData);
  const issues = useAppStore((s) => s.issues);
  const roles = useAppStore((s) => s.roles);
  const [trendCell, setTrendCell] = React.useState<{ key: string; locId: string } | null>(null);
  const [flagLocId, setFlagLocId] = React.useState<string | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = React.useState(false);
  const [draftStart, setDraftStart] = React.useState("");
  const [draftEnd, setDraftEnd] = React.useState("");
  const [draftError, setDraftError] = React.useState("");

  // Auto-expand the user's geo subtree when My Metrics turns on
  React.useEffect(() => {
    if (!user || !filters.myMetrics) return;
    const ulid = userLocIdFor(user, locations);
    getAllDescendants(ulid, locations).forEach((id) => setExpanded(id, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.myMetrics, user?.id]);

  if (!user) return null;
  const isAdmin = user.accessLevel === "owner" || user.accessLevel === "admin";

  // Active metrics from catalog
  const catalogNames = new Set(metrics.filter((m) => m.active).map((m) => m.name.toLowerCase()));
  const activeMetricDefs: MetricDef[] = METRIC_KEYS.filter(
    (m) =>
      catalogNames.has(m.ownerName.toLowerCase()) ||
      catalogNames.has(m.label.toLowerCase()) ||
      [...catalogNames].some((n) => n && n.startsWith(m.ownerName.split(" ")[0].toLowerCase()))
  );

  // User-owned metrics (for "My Metrics" toggle)
  const role = roles.find((r) => r.name === user.role);
  const userMetricKeys = role ? new Set(activeMetricDefs.filter((m) => role.metrics.includes(m.ownerName)).map((m) => m.key)) : new Set(activeMetricDefs.map((m) => m.key));

  const compareLabel =
    ({ today: "yest", yesterday: "2 days ago", last7: "prev 7d", last30: "prev 30d", last90: "prev 90d", custom: "prev period" } as Record<string, string>)[filters.dateRange] || "prev period";

  // Custom range — store persists ISO strings, the rest of the code wants Date objects.
  const customRange: CustomRange | null = filters.customRange
    ? { start: new Date(filters.customRange.startIso), end: new Date(filters.customRange.endIso) }
    : null;
  const allowedBreakdowns = getAllowedBreakdowns(filters.dateRange as TimeRange, customRange);
  // Drive each Select's trigger width off the longest option label so it never
  // truncates and never carries dead space. `ch` units track the actual font.
  // Breakdown trigger still sizes off its longest option; the date-range trigger
  // uses a fixed width per design.
  const maxBreakdownChars = BREAKDOWN_OPTIONS.reduce((m, o) => Math.max(m, o.label.length), 0);

  function changeRange(r: TimeRange) {
    if (r === "custom") {
      const today = new Date();
      const aWeekAgo = new Date(today);
      aWeekAgo.setDate(aWeekAgo.getDate() - 6);
      const toIso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setDraftStart(customRange ? toIso(customRange.start) : toIso(aWeekAgo));
      setDraftEnd(customRange ? toIso(customRange.end) : toIso(today));
      setDraftError("");
      setCustomDialogOpen(true);
      return;
    }
    setDashFilter("dateRange", r);
    const allowed = getAllowedBreakdowns(r);
    if (!allowed.includes(filters.breakdown as Breakdown)) setDashFilter("breakdown", allowed[0]);
  }

  function applyCustomRange() {
    if (!draftStart || !draftEnd) { setDraftError("Both start and end dates are required."); return; }
    const start = new Date(draftStart);
    const end = new Date(draftEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) { setDraftError("Invalid date."); return; }
    if (end < start) { setDraftError("End date must be on or after start date."); return; }
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    if (days > 365) { setDraftError("Custom range can be at most 365 days."); return; }
    setDashFilter("customRange", { startIso: start.toISOString(), endIso: end.toISOString() });
    setDashFilter("dateRange", "custom");
    const allowed = getAllowedBreakdowns("custom", { start, end });
    if (!allowed.includes(filters.breakdown as Breakdown)) setDashFilter("breakdown", allowed[0]);
    setCustomDialogOpen(false);
  }

  // Decide which metric columns are visible
  let visibleMetrics = activeMetricDefs;
  let rootLocId = "global";
  if (filters.myMetrics) {
    visibleMetrics = activeMetricDefs.filter((m) => userMetricKeys.has(m.key));
    rootLocId = userLocIdFor(user, locations);
  } else if (filters.metricsSet && filters.metricsSet.length > 0 && filters.metricsSet.length < activeMetricDefs.length) {
    const sel = new Set(filters.metricsSet);
    visibleMetrics = activeMetricDefs.filter((m) => sel.has(m.key));
  }

  // Auto-fallback if previously selected metric was deactivated — done lazily on the next interaction
  if (filters.metric !== "all" && !activeMetricDefs.some((m) => m.key === filters.metric)) {
    // Defer to avoid setState-in-render; this is a recoverable inconsistency, not a hot path.
    queueMicrotask(() => setDashFilter("metric", "all"));
  }

  // Whether the current filter set yields any visible rows. If not, the
  // table shows a single "No results found" row instead of being empty.
  const q = filters.search.trim().toLowerCase();
  const hasResults =
    (!q || locMatches(rootLocId, q)) &&
    (filters.statusFilter === "all" || locHasStatusMatch(rootLocId, filters.statusFilter));

  function tryReload() {
    if (!isAdmin) {
      alert("You are not allowed to perform this action.\n\nDashboard reload is reserved for admins and owners. The dashboard auto-reloads on schedule (default 07:00 IST before standup).");
      return;
    }
    if (dashboard.reloadLockUntil && Date.now() < dashboard.reloadLockUntil) {
      const mins = Math.ceil((dashboard.reloadLockUntil - Date.now()) / 60000);
      alert(`Rate-limited. Try again in ${mins} min${mins === 1 ? "" : "s"}.`);
      return;
    }
    reloadData();
  }

  function cycleSort(key: string) {
    if (!filters.sortBy || filters.sortBy.key !== key) {
      setDashFilter("sortBy", { key, dir: "desc" });
    } else if (filters.sortBy.dir === "desc") {
      setDashFilter("sortBy", { key, dir: "asc" });
    } else {
      setDashFilter("sortBy", null);
    }
  }

  function exportCsv() {
    if (!visibleMetrics.length) { alert("Nothing to export."); return; }
    const header: string[] = ["Location"];
    visibleMetrics.forEach((m) => { header.push(`${m.label} (${m.unit.trim()})`); header.push(`${m.label} Δ (pp vs ${compareLabel})`); });
    header.push("Flag", "Issues");
    const rows: (string | number)[][] = [header];
    walk(rootLocId, 0, false);
    function walk(locId: string, depth: number, ancestorMatched: boolean) {
      const loc = locations[locId];
      if (!loc) return;
      const q = (filters.search || "").trim().toLowerCase();
      if (q && !ancestorMatched && !locMatches(locId, q)) return;
      if (filters.statusFilter !== "all" && !locHasStatusMatch(locId, filters.statusFilter)) return;
      const directMatch = !!q && loc.name.toLowerCase().includes(q);
      const passDown = ancestorMatched || directMatch;
      const d = data[locId] || {};
      const locIssues = issuesForLocation(locId);
      const hasP0 = locIssues.some((i) => i.severity === "p0");
      const hasP1 = locIssues.some((i) => i.severity === "p1");
      const hasOk = locIssues.some((i) => i.severity === "ok");
      const flag = hasP0 ? `P0 (${locIssues.length})` : hasP1 ? `P1 (${locIssues.length})` : hasOk ? `recovering (${locIssues.length})` : "— clear";
      const row: (string | number)[] = ["  ".repeat(depth) + loc.name];
      visibleMetrics.forEach((m) => {
        const cell = d[m.key];
        row.push(cell ? `${cell[0]}${m.unit}` : "");
        row.push(cell && cell[2] !== null && cell[2] !== undefined ? cell[2] : "");
      });
      row.push(flag, locIssues.length);
      rows.push(row);
      // CSV exports the entire visible-tree per the active filters — every
      // descendant the user *could* drill into, not just what's currently
      // expanded on screen. The visited node already passed the filter
      // checks at the top of walk(), so its children get the same checks
      // applied as they recurse.
      loc.children.forEach((c) => walk(c, depth + 1, passDown));
    }
    const csv = rows.map((r) => r.map((c) => { const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `apnaops-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function issuesForLocation(locId: string) {
    const loc = locations[locId]; if (!loc) return [];
    const set = new Set(getAllDescendants(locId, locations));
    return issues.filter((i) => set.has(i.locId));
  }
  function locMatches(locId: string, q: string): boolean {
    const loc = locations[locId]; if (!loc) return false;
    if (loc.name.toLowerCase().includes(q)) return true;
    return loc.children.some((c) => locMatches(c, q));
  }
  function locHasStatusMatch(locId: string, sf: "issues" | "good"): boolean {
    const loc = locations[locId]; if (!loc) return false;
    const own = issues.filter((i) => i.locId === locId);
    if (sf === "issues" && own.some((i) => i.severity === "p0" || i.severity === "p1")) return true;
    if (sf === "good" && own.some((i) => i.severity === "ok")) return true;
    return loc.children.some((c) => locHasStatusMatch(c, sf));
  }

  function highlight(text: string, q: string) {
    if (!q) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return <>
      {text.slice(0, idx)}
      <mark className="bg-primary/25 text-foreground px-0.5 rounded-sm">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>;
  }

  function renderRow(locId: string, depth: number, ancestorMatched: boolean): React.ReactNode {
    const loc = locations[locId]; if (!loc) return null;
    const q = filters.search.trim().toLowerCase();
    if (q && !ancestorMatched && !locMatches(locId, q)) return null;
    if (filters.statusFilter !== "all" && !locHasStatusMatch(locId, filters.statusFilter as "issues" | "good")) return null;
    const directMatch = !!q && loc.name.toLowerCase().includes(q);
    const passDown = ancestorMatched || directMatch;
    // While searching, every visible row is auto-expanded so the matching descendant chain is fully
    // revealed — search "Jharkhand" → state + all cities + all stores beneath it; search "Ranchi"
    // → Ranchi + all its stores; etc.
    const isExpanded = !!expanded[locId] || !!q || filters.statusFilter !== "all";
    const d = data[locId] || {};
    const hasChildren = loc.children.length > 0;
    const locIssues = issuesForLocation(locId);
    // Only count issues whose metric is currently visible in the grid.
    // Example: if Fill Rate has a P0 issue and Serv % is clean, then the row's
    // Flag shows "1" when both columns are shown, "1" when only Fill Rate is shown,
    // and "0 → dash" when only Serv % is shown.
    const visibleMetricOwners = new Set<string>(visibleMetrics.map((m) => m.ownerName));
    const scopedIssues = locIssues.filter((i) => visibleMetricOwners.has(i.metric));
    const hasP0 = scopedIssues.some((i) => i.severity === "p0");
    const hasP1 = scopedIssues.some((i) => i.severity === "p1");
    const hasOk = scopedIssues.some((i) => i.severity === "ok");
    const ic = scopedIssues.length;
    // Severity drives BOTH the flag chip color and the row's tint.
    const severityTier: "p0" | "p1" | "ok" | null = hasP0 ? "p0" : hasP1 ? "p1" : hasOk ? "ok" : null;
    const rowTint =
      severityTier === "p0" ? "bg-destructive/[0.04]"
      : severityTier === "p1" ? "bg-amber-500/[0.06]"
      : severityTier === "ok" ? "bg-emerald-500/[0.04]"
      : "hover:bg-muted/40"; // no severity → keep card white, use hover treatment
    // Colored vertical stripe down the left edge of the row, keyed to severity.
    // Inline color overrides the `border-border/40` set by the column-divider class,
    // which would otherwise win the cascade against any `border-l-*` utility.
    const leftEdgeColor =
      severityTier === "p0" ? "var(--destructive)"
      : severityTier === "p1" ? "#f59e0b" // amber-500
      : severityTier === "ok" ? "#10b981" // emerald-500
      : "transparent";
    // Single chip styled by the highest-severity tier in scope. Total count is
    // the sum of all scoped issues for this row; em-dash when there's nothing.
    const flagPillClass =
      severityTier === "p0" ? "bg-destructive/15 text-destructive border-destructive/30"
      : severityTier === "p1" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40"
      : severityTier === "ok" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : "";
    const flagIconFill =
      severityTier === "p0" ? "fill-destructive/30"
      : severityTier === "p1" ? "fill-amber-500/40"
      : severityTier === "ok" ? "fill-emerald-500/30"
      : "";
    const flagBadge: React.ReactNode = severityTier === null
      ? <span className="text-muted-foreground">—</span>
      : (
        <span className={cn("inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11px] font-semibold [&_svg]:size-3", flagPillClass)}>
          <Flag className={flagIconFill} />
          {ic}
        </span>
      );

    // sort children if needed
    let children = [...loc.children];
    if (filters.sortBy) {
      const k = filters.sortBy.key;
      const dir = filters.sortBy.dir === "asc" ? 1 : -1;
      children.sort((a, b) => {
        const va = data[a]?.[k]?.[0] ?? -Infinity;
        const vb = data[b]?.[k]?.[0] ?? -Infinity;
        return (va - vb) * dir;
      });
    }

    return (
      <React.Fragment key={locId}>
        <tr
          style={{ height: 52 }}
          className={cn(
            "border-b transition-colors [&>td]:border-r [&>td]:border-border/40 [&>td:last-child]:border-r-0",
            rowTint
          )}
        >
          <td
            className="px-3 py-2 border-l-4 text-left"
            style={{ paddingLeft: 10 + depth * 12, borderLeftColor: leftEdgeColor }}
          >
            <button
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                hasChildren && "cursor-pointer"
              )}
              onClick={() => hasChildren && toggleLocation(locId)}
            >
              {hasChildren ? (
                <ChevronRight
                  className={cn(
                    // Slightly darker than `text-muted-foreground` so the tree
                    // affordance reads more clearly without dominating the row.
                    "h-3 w-3 text-foreground/60 transition-transform shrink-0",
                    isExpanded && "rotate-90"
                  )}
                />
              ) : (
                // Leaf rows get a bullet dot in the same tone as the chevron so the
                // whole hierarchy reads as a single dotted-list family.
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center h-3 w-3 shrink-0 text-foreground/60 leading-none"
                >
                  •
                </span>
              )}
              <span>{highlight(loc.name, q)}</span>
            </button>
          </td>
          {visibleMetrics.map((m) => {
            const cell = d[m.key];
            if (!cell) return <td key={m.key} className="px-3 py-2 text-center text-muted-foreground">—</td>;
            const [val, , delta] = cell;
            const positive = m.isHigherBetter ? delta > 0 : delta < 0;
            const cls = cellClass(m, val);
            const tone =
              cls === "cell-p0" ? "text-destructive font-semibold"
              : cls === "cell-p1" ? "text-amber-700 dark:text-amber-400 font-medium"
              : cls === "cell-watch" ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-700 dark:text-emerald-400";
            return (
              <td key={m.key} className="px-3 py-2 text-center">
                <button
                  className={cn(
                    // Stacked layout: value on top (center), delta on the row below (center).
                    "inline-flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded tabular-nums hover:bg-muted transition-colors",
                    tone
                  )}
                  onClick={() => setTrendCell({ key: m.key, locId })}
                  title="Click for trend"
                >
                  {/* Value is always foreground/black; only the delta carries the
                      severity color so the eye lands on direction first. */}
                  <span className="text-[12.5px] font-medium leading-tight whitespace-nowrap text-foreground">{val}{m.unit}</span>
                  {delta !== 0 && (
                    <span className={cn("text-[10.5px] leading-tight whitespace-nowrap", positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                      {delta > 0 ? "↑ +" : "↓ "}{delta}pp
                    </span>
                  )}
                </button>
              </td>
            );
          })}
          <td className="px-3 py-2 text-center">
            {ic > 0 ? (
              <button onClick={() => setFlagLocId(locId)} className="appearance-none border-0 bg-transparent p-0 cursor-pointer">{flagBadge}</button>
            ) : flagBadge}
          </td>
        </tr>
        {isExpanded && hasChildren && children.map((c) => renderRow(c, depth + 1, passDown))}
      </React.Fragment>
    );
  }

  return (
    <>
      <PageHeader
        title="My Dashboard"
        chip={
          <Badge variant="outline" className="border-border bg-card text-muted-foreground font-medium rounded-full h-6 px-3 py-0">
            Last reloaded {dashboard.lastReloaded || "just now"}
          </Badge>
        }
        rightBlock={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={exportCsv} title="Export CSV"><Download /></Button>
            <Button size="icon" className="h-8 w-8" onClick={tryReload} title="Reload"><RotateCcw /></Button>
          </div>
        }
      />
      {/* Filter bar layout adapts to orientation:
          - Landscape: all 4 groups on one line (order: Search · Metrics · Flag · Chart Filters)
          - Portrait : two stacked rows (row 1: Metrics · Flag ; row 2: Search · Chart Filters)
          Implementation trick: the outer container is `flex-col` in portrait (so the two
          inner rows stack), and `flex-row` in landscape. The inner row wrappers use
          `landscape:contents` so they flatten in landscape — all four FilterGroups become
          direct flex children of the outer row, and `landscape:order-*` lays them out left-to-right. */}
      <div className="flex flex-col landscape:flex-row landscape:flex-wrap landscape:items-end gap-3 mb-3">
        {/* Portrait row 1 — flattened in landscape */}
        <div className="flex flex-row items-end gap-3 flex-wrap landscape:contents">
          <FilterGroup label="Metrics" className="landscape:order-2">
          <MetricScopeToggle
            myMetrics={filters.myMetrics}
            metricsSet={filters.metricsSet}
            activeMetricDefs={activeMetricDefs}
            onAllMetrics={() => {
              setDashFilter("myMetrics", false);
              // Leave metricsSet alone — preserves any prior subset selection
            }}
            onMyMetrics={() => {
              setDashFilter("myMetrics", true);
              setDashFilter("metricsSet", null);
            }}
            onSetMetrics={(next) => setDashFilter("metricsSet", next)}
          />
          </FilterGroup>
          <FilterGroup label="Flag" className="landscape:order-3">
          <div className="inline-flex items-stretch h-8 rounded-md border border-border bg-card overflow-hidden">
            {(["all", "issues", "good"] as const).map((opt, i) => {
              const active = filters.statusFilter === opt;
              const title = opt === "all" ? "All flags" : opt === "issues" ? "Issues (P0/P1)" : "Good (recovering)";
              return (
                <button
                  key={opt}
                  onClick={() => setDashFilter("statusFilter", opt)}
                  title={title}
                  aria-label={title}
                  className={cn(
                    "inline-flex items-center justify-center px-3 text-xs font-medium transition-colors [&_svg]:size-3.5",
                    active
                      ? opt === "issues" ? "bg-destructive/15 font-semibold"
                      : opt === "good" ? "bg-emerald-500/15 font-semibold"
                      : "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-secondary",
                    opt === "all" && !active && "text-foreground",
                    i > 0 && "border-l border-border"
                  )}
                >
                  {opt === "all"
                    ? "All"
                    : opt === "issues"
                      ? <Flag className="text-destructive fill-destructive/20" />
                      : <Check className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          </FilterGroup>
        </div>
        {/* Portrait row 2 — flattened in landscape */}
        <div className="flex flex-row items-end gap-3 flex-wrap landscape:contents">
          <FilterGroup
            label="Search"
            className="landscape:order-1 flex-1 min-w-[112px] max-w-[320px]"
          >
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
              <Input
                placeholder="Location..."
                value={filters.search}
                onChange={(e) => setDashFilter("search", e.target.value)}
                className="h-8 text-xs pl-7 w-full"
              />
            </div>
          </FilterGroup>
          <FilterGroup label="Chart Filters" className="landscape:order-4">
          {/* Date range + breakdown share a single pill, divided by a hairline,
              so they read as one "chart filter" control. */}
          <div className="inline-flex items-stretch h-8 rounded-md border border-border bg-card overflow-hidden">
            <Select value={filters.dateRange} onValueChange={(v) => changeRange(v as TimeRange)}>
              <SelectTrigger
                className="h-8 text-xs gap-1 px-2.5 border-0 shadow-none focus:ring-0 focus:ring-offset-0 rounded-none"
                style={{ width: 116 }}
              >
                {filters.dateRange === "custom" && customRange ? (
                  <span className="tabular-nums">
                    {formatDateDdMmYyyy(customRange.start)} – {formatDateDdMmYyyy(customRange.end)}
                  </span>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent align="start">
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.breakdown} onValueChange={(v) => setDashFilter("breakdown", v as Breakdown)}>
              <SelectTrigger
                className="h-8 text-xs w-auto gap-1 px-2.5 border-0 border-l border-border shadow-none focus:ring-0 focus:ring-offset-0 rounded-none"
                style={{ minWidth: `calc(${maxBreakdownChars}ch + 28px)` }}
              ><SelectValue /></SelectTrigger>
              <SelectContent align="start">
                {BREAKDOWN_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    disabled={!allowedBreakdowns.includes(opt.value)}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </FilterGroup>
        </div>
        {activeMetricDefs.length === 0 && <span className="text-xs text-muted-foreground px-2 landscape:order-5">No metrics defined yet — add one in Setup → Metrics Catalog.</span>}
      </div>
      {visibleMetrics.length === 0 ? (
        <EmptyState icon={BarChart3} title="No metrics to show" subtitle="Try clearing My Metrics filter or add a metric in Setup → Metrics Catalog." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40 border-b">
                {/* Subtle vertical dividers: a thin border on every th/td except
                    the trailing one. Lower opacity keeps them quiet enough not
                    to compete with the row/cell color washes. */}
                <tr className="[&>th]:border-r [&>th]:border-border/40 [&>th:last-child]:border-r-0">
                  {/* Every column header uses the same typography: 10px, semibold,
                      uppercase, wider tracking, muted-foreground. The metric columns
                      add a hover-able sort button but keep the exact same text style. */}
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[160px]">Location</th>
                  {visibleMetrics.map((m) => (
                    <th
                      key={m.key}
                      className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                      style={{ minWidth: 80, maxWidth: 120 }}
                    >
                      <button
                        onClick={() => cycleSort(m.key)}
                        className="inline-flex items-center justify-center gap-1 w-full text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {/* Text box wraps when it exceeds the column's max width; the
                            sort arrow sits outside the text box but inside the same
                            (flex) button so it stays aligned with the label. The
                            arrow slot is always 12px wide so column width stays
                            stable whether or not a sort is active — sorting never
                            forces a label re-wrap. */}
                        <span className="inline-block max-w-full break-words text-center">{m.label}</span>
                        <span className="inline-flex items-center justify-center w-3 shrink-0">
                          {filters.sortBy?.key === m.key && (
                            filters.sortBy.dir === "asc"
                              ? <ArrowUp className="h-3 w-3" />
                              : <ArrowDown className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ minWidth: 80, maxWidth: 120 }}>Flag</th>
                </tr>
              </thead>
              <tbody>
                {hasResults ? renderRow(rootLocId, 0, false) : (
                  <tr>
                    <td colSpan={visibleMetrics.length + 2} className="px-3 py-12 text-center">
                      <div className="inline-flex flex-col items-center gap-1 text-muted-foreground">
                        <Search className="h-5 w-5 opacity-60" aria-hidden />
                        <p className="text-sm font-medium">No results found</p>
                        <p className="text-xs">Try a different location, flag, or clear the search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {trendCell && <TrendModal metricKey={trendCell.key} locId={trendCell.locId} open={!!trendCell} onClose={() => setTrendCell(null)} />}
      {flagLocId && <FlagModal locId={flagLocId} open={!!flagLocId} onClose={() => setFlagLocId(null)} />}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-start" className="text-xs">Start date</Label>
              <Input id="custom-start" type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-end" className="text-xs">End date</Label>
              <Input id="custom-end" type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
            </div>
            {draftError && <p className="text-xs text-destructive">{draftError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyCustomRange}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Small wrapper that puts a tiny uppercase label above a filter control.
// Used for "Metrics" above the My/All toggle and "Flag" above All/Issues/Good.
function FilterGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function MetricScopeToggle({
  myMetrics,
  metricsSet,
  activeMetricDefs,
  onAllMetrics,
  onMyMetrics,
  onSetMetrics,
}: {
  myMetrics: boolean;
  metricsSet: string[] | null;
  activeMetricDefs: MetricDef[];
  onAllMetrics: () => void;
  onMyMetrics: () => void;
  onSetMetrics: (next: string[] | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const allSelected = !myMetrics && metricsSet === null;
  // When My Metrics is on, treat all checkboxes as visually unchecked.
  // When it's off and metricsSet is null, every metric is implicitly checked.
  const selectedKeys = React.useMemo(() => {
    if (myMetrics) return new Set<string>();
    if (metricsSet === null) return new Set(activeMetricDefs.map((m) => m.key));
    return new Set(metricsSet);
  }, [myMetrics, metricsSet, activeMetricDefs]);

  function toggleKey(key: string) {
    // Clicking any checkbox unsets My Metrics (the radio).
    if (myMetrics) {
      onAllMetrics();     // myMetrics → false
      onSetMetrics([key]); // start the subset with just the clicked metric
      return;
    }
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (next.size === activeMetricDefs.length) onSetMetrics(null); // all == "All Metrics"
    else onSetMetrics(Array.from(next));
  }

  // Label shown on the single dropdown trigger.
  const label = myMetrics
    ? "My Metrics"
    : allSelected
      ? "All Metrics"
      : `${selectedKeys.size}/${activeMetricDefs.length} metrics`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          style={{ width: 124 }}
          className={cn(
            "inline-flex items-center justify-between gap-1 h-8 px-3 rounded-md border text-xs font-semibold transition-colors",
            "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          )}
        >
          {label}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">Filter metrics</p>
        {/* Radio row — My Metrics */}
        <label className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer">
          <RadioDot selected={myMetrics} onSelect={onMyMetrics} />
          <span className="text-xs font-medium text-foreground">My Metrics</span>
        </label>
        <div className="my-1 h-px bg-border" />
        {/* Checkbox list — individual metrics */}
        <ul className="space-y-0.5">
          {activeMetricDefs.map((m) => {
            const checked = selectedKeys.has(m.key);
            return (
              <li key={m.key}>
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer">
                  <Checkbox checked={checked} onCheckedChange={() => toggleKey(m.key)} />
                  <span className="text-xs font-medium text-foreground">{m.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// A small radio indicator. Single button, used standalone (not in a RadioGroup)
// because the only "off" state is "any checkbox checked" — handled elsewhere.
function RadioDot({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={(e) => { e.preventDefault(); onSelect(); }}
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border-2 inline-flex items-center justify-center transition-colors",
        selected ? "border-primary" : "border-muted-foreground/40 hover:border-primary/60"
      )}
    >
      {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
    </button>
  );
}

function getAllDescendants(locId: string, locations: ReturnType<typeof useAppStore.getState>["locations"]): string[] {
  const loc = locations[locId]; if (!loc) return [locId];
  return [locId, ...loc.children.flatMap((c) => getAllDescendants(c, locations))];
}

function userLocIdFor(user: { geoType?: string; geoName?: string }, locations: ReturnType<typeof useAppStore.getState>["locations"]) {
  if (!user.geoType || user.geoType === "Global") return "global";
  const name = (user.geoName || "").split(",")[0].trim().toLowerCase();
  if (user.geoType === "Store") {
    const id = name.replace(/[^0-9]/g, "");
    return "st_" + id;
  }
  const match = Object.keys(locations).find(
    (k) => locations[k].type === user.geoType && locations[k].name.toLowerCase() === name
  );
  return match || "global";
}
