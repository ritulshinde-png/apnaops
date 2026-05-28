"use client";
import * as React from "react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { METRIC_KEYS, cellClass, type MetricDef } from "@/lib/metric-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TrendModal } from "@/components/trend-modal";
import { FlagModal } from "@/components/flag-modal";
import { ChevronRight, BarChart3, ArrowUp, ArrowDown } from "lucide-react";
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
    ({ today: "yest", yesterday: "2 days ago", "7d": "prev 7d", "30d": "prev 30d" } as Record<string, string>)[filters.dateRange] || "prev period";

  // Decide which metric columns are visible
  let visibleMetrics = activeMetricDefs;
  let rootLocId = "global";
  if (filters.myMetrics) {
    visibleMetrics = activeMetricDefs.filter((m) => userMetricKeys.has(m.key));
    // Auto-expand the user's geo subtree
    const ulid = userLocIdFor(user, locations);
    rootLocId = ulid;
    getAllDescendants(rootLocId, locations).forEach((id) => setExpanded(id, true));
  } else if (filters.metric !== "all") {
    visibleMetrics = activeMetricDefs.filter((m) => m.key === filters.metric);
  }

  // Auto-fallback if previously selected metric was deactivated
  if (filters.metric !== "all" && !activeMetricDefs.some((m) => m.key === filters.metric)) {
    setDashFilter("metric", "all");
  }

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
    const header: string[] = ["Location", "Type"];
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
      const row: (string | number)[] = ["  ".repeat(depth) + loc.name, loc.type];
      visibleMetrics.forEach((m) => {
        const cell = d[m.key];
        row.push(cell ? `${cell[0]}${m.unit}` : "");
        row.push(cell && cell[2] !== null && cell[2] !== undefined ? cell[2] : "");
      });
      row.push(flag, locIssues.length);
      rows.push(row);
      const expandedNow = !!expanded[locId] || passDown || filters.statusFilter !== "all" || directMatch;
      if (expandedNow) loc.children.forEach((c) => walk(c, depth + 1, passDown));
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
    const isExpanded = !!expanded[locId] || (q && !directMatch && !ancestorMatched) || filters.statusFilter !== "all" || directMatch;
    const d = data[locId] || {};
    const hasChildren = loc.children.length > 0;
    const locIssues = issuesForLocation(locId);
    const hasP0 = locIssues.some((i) => i.severity === "p0");
    const hasP1 = locIssues.some((i) => i.severity === "p1");
    const hasOk = locIssues.some((i) => i.severity === "ok");
    const ic = locIssues.length;
    let flagBadge: React.ReactNode = <span className="text-muted-foreground text-[11px]">— clear</span>;
    if (hasP0) flagBadge = <Badge variant="p0" className="cursor-pointer">P0 · {ic}</Badge>;
    else if (hasP1) flagBadge = <Badge variant="p1" className="cursor-pointer">P1 · {ic}</Badge>;
    else if (hasOk) flagBadge = <Badge variant="success" className="cursor-pointer">✓ {ic}</Badge>;

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
        <tr className={cn("border-b transition-colors", hasP0 ? "bg-destructive/[0.04]" : hasOk ? "bg-emerald-500/[0.04]" : "hover:bg-muted/40")}>
          <td className="px-3 py-2" style={{ paddingLeft: `${14 + depth * 18}px` }}>
            <button
              className={cn("inline-flex items-center gap-1.5 text-sm font-medium", hasChildren && "cursor-pointer")}
              onClick={() => hasChildren && toggleLocation(locId)}
            >
              <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform", isExpanded && "rotate-90", !hasChildren && "invisible")} />
              <span>{highlight(loc.name, q)}</span>
            </button>
          </td>
          <td className="px-3 py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">{loc.type}</td>
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
                  className={cn("inline-flex items-baseline gap-1.5 px-2 py-1 rounded text-[12.5px] tabular-nums hover:bg-muted transition-colors", tone)}
                  onClick={() => setTrendCell({ key: m.key, locId })}
                  title="Click for trend"
                >
                  <span className="font-medium">{val}{m.unit}</span>
                  {delta !== 0 && (
                    <span className={cn("text-[10.5px]", positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
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
          <Badge variant="outline" className="border-border bg-card text-muted-foreground font-medium rounded-full px-3 py-1">
            Last reloaded {dashboard.lastReloaded || "just now"}
          </Badge>
        }
        subtitle={`Location × metric grid · Δ vs ${compareLabel} · click any metric value for its trend · click flag for issues`}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" className="h-8 text-xs" onClick={tryReload}>Reload</Button>
          </>
        }
      />
      {/* Metric chip row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Chip active={filters.metric === "all"} onClick={() => setDashFilter("metric", "all")}>All metrics</Chip>
          {activeMetricDefs.map((m) => (
            <Chip key={m.key} active={filters.metric === m.key} onClick={() => setDashFilter("metric", m.key)}>{m.label}</Chip>
          ))}
          {activeMetricDefs.length === 0 && <span className="text-xs text-muted-foreground px-2">No metrics defined yet — add one in Setup → Metrics Catalog.</span>}
        </div>
      </div>
      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Input
          placeholder="Search location…"
          value={filters.search}
          onChange={(e) => setDashFilter("search", e.target.value)}
          className="max-w-xs"
        />
        <Select value={filters.dateRange} onValueChange={(v) => setDashFilter("dateRange", v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.breakdown} onValueChange={(v) => setDashFilter("breakdown", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setDashFilter("myMetrics", !filters.myMetrics)}
          className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
            filters.myMetrics ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary text-foreground"
          )}
        >My Metrics</button>
        <div className="inline-flex border rounded-md overflow-hidden h-8">
          {(["all", "issues", "good"] as const).map((opt, i) => (
            <button
              key={opt}
              onClick={() => setDashFilter("statusFilter", opt)}
              className={cn(
                "px-3 text-xs font-medium transition-colors",
                filters.statusFilter === opt
                  ? opt === "issues" ? "bg-destructive/15 text-destructive font-semibold"
                  : opt === "good" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold"
                  : "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted",
                i > 0 && "border-l"
              )}
            >{opt === "all" ? "All" : opt === "issues" ? "Issues" : "Good"}</button>
          ))}
        </div>
      </div>
      {visibleMetrics.length === 0 ? (
        <EmptyState icon={BarChart3} title="No metrics to show" subtitle="Try clearing My Metrics filter or add a metric in Setup → Metrics Catalog." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[200px]">Location</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[80px]">Type</th>
                  {visibleMetrics.map((m) => (
                    <th key={m.key} className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <button onClick={() => cycleSort(m.key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        {m.label}
                        {filters.sortBy?.key === m.key && (
                          filters.sortBy.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[110px]">Flag</th>
                </tr>
              </thead>
              <tbody>{renderRow(rootLocId, 0, false)}</tbody>
            </table>
          </div>
        </Card>
      )}
      {trendCell && <TrendModal metricKey={trendCell.key} locId={trendCell.locId} open={!!trendCell} onClose={() => setTrendCell(null)} />}
      {flagLocId && <FlagModal locId={flagLocId} open={!!flagLocId} onClose={() => setFlagLocId(null)} />}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("h-8 px-3 rounded-full text-xs font-medium border transition-colors", active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary text-foreground")}>{children}</button>
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
