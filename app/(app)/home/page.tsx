"use client";
import * as React from "react";
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
import type { Standup } from "@/lib/types";
import { MetricTrendCard } from "@/components/metric-trend-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TIME_RANGE_OPTIONS,
  BREAKDOWN_OPTIONS,
  getAllowedBreakdowns,
  formatDateDdMmYyyy,
  type TimeRange,
  type Breakdown,
  type CustomRange,
} from "@/lib/metric-trend";

function useISTClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getGreeting(now: Date) {
  const hour = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 16) return "Good afternoon";
  if (hour >= 16 && hour < 22) return "Good evening";
  return "Good night";
}

function ISTClock({ now }: { now: Date }) {
  const full = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  const [time, ampm] = full.split(" ");
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <div className="flex flex-col items-center justify-center gap-1 tabular-nums select-none bg-primary/[0.07] border border-primary/20 rounded-xl px-4 h-16">
      <div className="flex items-baseline gap-1">
        <span className="text-[15px] font-bold tracking-tight text-primary">{time}</span>
        <span className="text-[11px] font-semibold text-primary/50">{ampm}</span>
      </div>
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
  );
}

const STATUS_ORDER: Record<"live" | "upcoming" | "over", number> = { live: 0, upcoming: 1, over: 2 };

function StandupCarousel({ standups }: { standups: Standup[] }) {
  const sorted = React.useMemo(
    () => [...standups].sort((a, b) => STATUS_ORDER[getStandupStatus(a).kind] - STATUS_ORDER[getStandupStatus(b).kind]),
    [standups]
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const titleRefs = React.useRef<Array<HTMLParagraphElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [needsScroll, setNeedsScroll] = React.useState(false);
  const [cardWidth, setCardWidth] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    let max = 0;
    titleRefs.current.forEach((r) => {
      if (!r) return;
      const w = r.scrollWidth;
      if (w > max) max = w;
    });
    if (max > 0) {
      // 32px = p-4 left + right padding; 4px buffer for sub-pixel rounding
      setCardWidth(Math.ceil(max) + 32 + 4);
    }
  }, [sorted]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      setNeedsScroll(el.scrollWidth - el.clientWidth > 4);
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const step = first.offsetWidth + 12;
      const idx = Math.round(el.scrollLeft / step);
      setActiveIndex(Math.max(0, Math.min(idx, sorted.length - 1)));
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [sorted.length, cardWidth]);

  function scrollToIndex(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.offsetWidth + 12;
    el.scrollTo({ left: step * i, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex flex-row gap-3 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sorted.map((s, i) => {
          const status = getStandupStatus(s);
          const disabled = status.kind === "over" || !s.meetLink;
          return (
            <Card
              key={s.id}
              style={cardWidth ? { width: cardWidth } : undefined}
              className="shrink-0 snap-start p-4 flex flex-col"
            >
              <div className="min-w-0 mb-3">
                <p ref={(el) => { titleRefs.current[i] = el; }} className="font-semibold text-sm whitespace-nowrap w-fit max-w-full">{s.name}</p>
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium mt-1.5",
                  status.kind === "upcoming" && "bg-accent text-accent-foreground",
                  status.kind === "live" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                  status.kind === "over" && "bg-muted text-muted-foreground"
                )}>{status.label}</span>
              </div>
              {s.meetLink ? (
                <Button
                  asChild={!disabled}
                  size="sm"
                  disabled={disabled}
                  className={cn("w-full mt-auto", disabled && "cursor-not-allowed")}
                >
                  {disabled ? (
                    <><Video className="h-3.5 w-3.5" /> Join standup</>
                  ) : (
                    <a href={s.meetLink} target="_blank" rel="noreferrer"><Video className="h-3.5 w-3.5" /> Join standup</a>
                  )}
                </Button>
              ) : (
                <Badge variant="muted" className="self-start mt-auto">No meet link yet</Badge>
              )}
            </Card>
          );
        })}
      </div>
      {needsScroll && (
        <div className="flex justify-center gap-1.5 mt-3">
          {sorted.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to standup ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === activeIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const now = useISTClock();
  const user = useCurrentUser();
  const issues = useAppStore((s) => s.issues);
  const standups = useAppStore((s) => s.standups);
  const locations = useAppStore((s) => s.locations);
  const data = useAppStore((s) => s.data);
  const metrics = useAppStore((s) => s.metrics);
  const roles = useAppStore((s) => s.roles);
  const [timeRange, setTimeRange] = React.useState<TimeRange>("last7");
  const [breakdown, setBreakdown] = React.useState<Breakdown>("daily");
  const [customRange, setCustomRange] = React.useState<CustomRange | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = React.useState(false);
  const [draftStart, setDraftStart] = React.useState("");
  const [draftEnd, setDraftEnd] = React.useState("");
  const [draftError, setDraftError] = React.useState("");
  if (!user) return null;

  const allowedBreakdowns = getAllowedBreakdowns(timeRange, customRange);

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
    setTimeRange(r);
    const allowed = getAllowedBreakdowns(r);
    if (!allowed.includes(breakdown)) setBreakdown(allowed[0]);
  }

  function applyCustomRange() {
    if (!draftStart || !draftEnd) {
      setDraftError("Both start and end dates are required.");
      return;
    }
    const start = new Date(draftStart);
    const end = new Date(draftEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setDraftError("Invalid date.");
      return;
    }
    if (end < start) {
      setDraftError("End date must be on or after start date.");
      return;
    }
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    if (days > 365) {
      setDraftError("Custom range can be at most 365 days.");
      return;
    }
    const next: CustomRange = { start, end };
    setCustomRange(next);
    setTimeRange("custom");
    const allowed = getAllowedBreakdowns("custom", next);
    if (!allowed.includes(breakdown)) setBreakdown(allowed[0]);
    setCustomDialogOpen(false);
  }

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
  const pendingStandups = todaysStandups.filter((s) => getStandupStatus(s).kind !== "over").length;
  const completedStandups = todaysStandups.length - pendingStandups;

  const userRole = roles.find((r) => r.name === user.role);
  const ownedMetricNames = new Set(userRole?.metrics || []);
  const myMappedMetrics = metrics
    .filter((m) => m.active && ownedMetricNames.has(m.name))
    .map((m) => {
      const def: MetricDef | undefined =
        METRIC_KEYS.find((k) => k.ownerName === m.name) ||
        METRIC_KEYS.find((k) => m.name.toLowerCase().startsWith(k.ownerName.toLowerCase().split(" ")[0]));
      return def ? { id: m.id, name: m.name, def } : null;
    })
    .filter((x): x is { id: string; name: string; def: MetricDef } => x !== null);
  const userLocData = data[user.geoType === "City" ? "JH_ranchi" : "global"] || data.global || {};

  const stores = Object.keys(locations).filter((id) => locations[id].type === "Store").length;
  const subtitle = `${user.role || user.accessLevel} · ${user.geoType || "Global"} · ${stores} stores`;

  return (
    <>
      <PageHeader
        title={`${getGreeting(now)}, ${user.name.split(" ")[0]}`}
        subtitle={subtitle}
        rightBlock={<ISTClock now={now} />}
      />

      {todaysStandups.length > 0 && (
        <section className="mb-7">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Today&apos;s standups · {pendingStandups} pending / {completedStandups} completed
          </h2>
          <StandupCarousel standups={todaysStandups} />
        </section>
      )}

      <section className="mb-7">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Metrics</h2>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => changeRange(v as TimeRange)}>
              <SelectTrigger className="h-8 text-xs w-auto gap-1.5 px-2.5">
                {timeRange === "custom" && customRange ? (
                  <span className="tabular-nums">
                    {formatDateDdMmYyyy(customRange.start)} – {formatDateDdMmYyyy(customRange.end)}
                  </span>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent align="end">
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={breakdown} onValueChange={(v) => setBreakdown(v as Breakdown)}>
              <SelectTrigger className="h-8 text-xs w-auto gap-1.5 px-2.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
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
        </div>
        {myMappedMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No metrics mapped to your role yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {myMappedMetrics.map((m) => {
              const cell = userLocData[m.def.key];
              const baseline = cell ? cell[0] : m.def.key === "surge" || m.def.key === "pickerDrop" ? 10 : 95;
              const amp = Math.max(0.5, Math.abs(baseline) * 0.04);
              return (
                <MetricTrendCard
                  key={m.id}
                  name={m.name}
                  def={m.def}
                  baseline={baseline}
                  amp={amp}
                  range={timeRange}
                  breakdown={breakdown}
                  custom={timeRange === "custom" ? customRange : null}
                />
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
            <DialogDescription>Pick a start and end date for the metrics view. Max 365 days.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-start" className="text-xs">Start date</Label>
              <Input id="custom-start" type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-end" className="text-xs">End date</Label>
              <Input id="custom-end" type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
            </div>
          </div>
          {draftError && <p className="text-xs text-destructive">{draftError}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyCustomRange}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {myIssues.length} issues flagged for you
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
