"use client";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueCard } from "@/components/issue-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Sparkles, Video } from "lucide-react";
import { METRIC_KEYS, type MetricDef } from "@/lib/metric-data";
import { getStandupStatus, isStandupToday } from "@/lib/standup";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const user = useCurrentUser();
  const issues = useAppStore((s) => s.issues);
  const standups = useAppStore((s) => s.standups);
  const locations = useAppStore((s) => s.locations);
  const data = useAppStore((s) => s.data);
  const actionables = useAppStore((s) => s.actionables);
  const metrics = useAppStore((s) => s.metrics);
  const roles = useAppStore((s) => s.roles);
  if (!user) return null;

  const myIssues = (() => {
    if (user.accessLevel === "owner" || user.accessLevel === "admin") return issues;
    const role = roles.find((r) => r.name === user.role);
    const owned = new Set(role?.metrics || []);
    return issues.filter((i) => {
      const inMetrics = owned.has(i.metric) || METRIC_KEYS.some((k) => k.ownerName === i.metric && owned.has(k.ownerName));
      if (!inMetrics) return false;
      if (user.geoType === "Global" || !user.geoType) return true;
      const names = user.geoName.split(",").map((s) => s.trim().toLowerCase());
      const matches = (lid: string): boolean => {
        const l = locations[lid]; if (!l) return false;
        if (l.type === user.geoType && names.includes(l.name.toLowerCase())) return true;
        return Object.entries(locations).some(([pid, p]) => p.children.includes(lid) && matches(pid));
      };
      return matches(i.locId);
    });
  })();

  const todaysStandups = standups.filter((s) => s.attendees.includes(user.id) && isStandupToday(s));

  const activeMetrics = metrics.filter((m) => m.active).slice(0, 3);
  const userLocData = data[user.geoType === "City" ? "JH_ranchi" : "global"] || data.global || {};

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });

  const stores = Object.keys(locations).filter((id) => locations[id].type === "Store").length;
  const subtitle = `${user.role || user.accessLevel} · ${user.geoName} · ${stores} stores · ${dateLabel}`;

  return (
    <>
      <PageHeader title={`Good morning, ${user.name.split(" ")[0]}`} subtitle={subtitle} />

      {todaysStandups.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Today&apos;s standups · {todaysStandups.length}</h2>
          <div className="flex flex-col gap-2.5">
            {todaysStandups.map((s) => {
              const status = getStandupStatus(s);
              const disabled = status.kind === "over" || !s.meetLink;
              return (
                <Card key={s.id} className="px-4 py-3.5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{s.name}</p>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium mt-1.5",
                      status.kind === "upcoming" && "bg-accent text-accent-foreground",
                      status.kind === "live" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                      status.kind === "over" && "bg-muted text-muted-foreground"
                    )}>{status.label}</span>
                  </div>
                  {s.meetLink ? (
                    <Button asChild={!disabled} size="sm" disabled={disabled} className={disabled ? "opacity-50 cursor-not-allowed" : ""}>
                      {disabled ? <span><Video className="h-3.5 w-3.5" /> Join standup</span> : <a href={s.meetLink} target="_blank" rel="noreferrer"><Video className="h-3.5 w-3.5" /> Join standup</a>}
                    </Button>
                  ) : <Badge variant="muted">No meet link yet</Badge>}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        {activeMetrics.map((m: { name: string; id: string }) => {
          const def: MetricDef | undefined = METRIC_KEYS.find((k) => k.ownerName === m.name) || METRIC_KEYS.find((k) => m.name.toLowerCase().startsWith(k.ownerName.toLowerCase().split(" ")[0]));
          const cell = def ? userLocData[def.key] : null;
          const val = cell ? cell[0] : "—";
          const delta = cell ? cell[2] : 0;
          const positive = def && cell ? (def.isHigherBetter ? delta > 0 : delta < 0) : false;
          return (
            <Card key={m.id} className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1.5">{m.name}</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{val}{val === "—" ? "" : def?.unit || ""}</p>
              {cell && delta !== 0 ? (
                <p className={`text-[11px] mt-1 font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{delta > 0 ? "+" : ""}{delta}pp vs yest</p>
              ) : <p className="text-[11px] mt-1 text-muted-foreground">—</p>}
            </Card>
          );
        })}
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1.5">Open actionables</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{actionables.length}</p>
          <p className="text-[11px] mt-1 text-muted-foreground">2 due today</p>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          {myIssues.length} issues flagged for you
          <span className="text-muted-foreground text-[11px] font-normal normal-case tracking-normal">· agent has done first-pass RCA</span>
        </h2>
        {myIssues.length === 0 ? (
          <EmptyState icon={Sparkles} title="You're all caught up" subtitle="No issues flagged for you right now. New flags will appear here as the agent finds them." />
        ) : (
          myIssues.map((i) => <IssueCard key={i.id} issue={i} />)
        )}
      </section>
    </>
  );
}
