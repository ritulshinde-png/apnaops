"use client";
import * as React from "react";
import { UserCog, Pencil, MapPin } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Issue, IssueSeverity } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommentsThread } from "@/components/comments-thread";
import { daysBetween } from "@/lib/utils";
import { IssueActionDialog, type ActionKind } from "@/components/issue-action-dialog";
import { cn } from "@/lib/utils";

interface Props { issue: Issue; readonly?: boolean; variant?: "issue" | "improvement" }

const SEVERITY_BANNER: Record<IssueSeverity, string> = {
  p0: "border-destructive/40 text-destructive",
  p1: "border-amber-500/50 text-amber-700 dark:text-amber-400",
  ok: "border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
};

const SEVERITY_PILL: Record<IssueSeverity, string> = {
  p0: "bg-destructive/10 text-destructive",
  p1: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

// Chip background + border in the priority color — used for the layered "behind-the-card" tag.
const SEVERITY_CHIP: Record<IssueSeverity, string> = {
  p0: "bg-destructive/10 border-destructive/50 text-destructive",
  p1: "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-400",
  ok: "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
};

function sevLabel(s: IssueSeverity) {
  return s === "ok" ? "OK" : s.toUpperCase();
}

function expandDelta(s: string) {
  return s ? s.replace(/\bvs yest\b/g, "vs yesterday") : s;
}

function splitOwners(owner: string): string[] {
  return (owner || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Lower number = shown first. Store is most specific, Global is least.
const GEO_PRIORITY: Record<string, number> = { Store: 0, City: 1, State: 2, Global: 3 };
function geoRank(g: string | undefined | null): number {
  return g && g in GEO_PRIORITY ? GEO_PRIORITY[g] : 4;
}

export function IssueCard({ issue, readonly = false, variant = "issue" }: Props) {
  const isImprovement = variant === "improvement";
  const locations = useAppStore((s) => s.locations);
  const allUsers = useAppStore((s) => s.users);
  const [actionOpen, setActionOpen] = React.useState<ActionKind | null>(null);
  const loc = locations[issue.locId];
  const locName = loc?.name || issue.locId;
  const geoParts = [locName];
  if (loc?.type === "Store") { if (issue.city) geoParts.push(issue.city); if (issue.state) geoParts.push(issue.state); }

  const daysOpen = issue.openedAt ? daysBetween(issue.openedAt) : 0;
  // In the issues feed every delta represents a regression (the agent only flags
  // problems), so the change is always shown in destructive red. In the improvements
  // section the same field represents a recovery, so it's emerald instead.
  const deltaTone = isImprovement ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";

  const owners = React.useMemo(() => {
    const names = splitOwners(issue.owner);
    return [...names].sort((a, b) => {
      const ua = allUsers.find((u) => u.name === a);
      const ub = allUsers.find((u) => u.name === b);
      return geoRank(ua?.geoType) - geoRank(ub?.geoType);
    });
  }, [issue.owner, allUsers]);
  const visibleOwners = owners.slice(0, 2);
  const extraOwners = owners.slice(2);

  return (
    <div className="mb-3.5 relative" style={{ paddingTop: isImprovement ? 0 : 24 }}>
      {/* Priority chip — only on the issues variant. A rounded rect placed BEHIND the
          card; its top portion sticks above the card to show the label. */}
      {!isImprovement && (
        <div
          aria-hidden={false}
          className={cn(
            "absolute z-0 rounded-md border inline-flex",
            SEVERITY_CHIP[issue.severity]
          )}
          style={{ left: 0, top: 0, height: 40, paddingTop: 6, paddingLeft: 10, paddingRight: 10 }}
        >
          <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap leading-none">
            {sevLabel(issue.severity)}
            {daysOpen > 1 && (
              <>
                <span className="mx-1 opacity-70">—</span>
                Open {daysOpen} Days
              </>
            )}
          </span>
        </div>
      )}
      <Card className="overflow-hidden p-0 relative z-10">
        <header className="px-5 pt-4 pb-3.5 border-b space-y-1">
          {/* Line 1: metric name · value | right: 📍 location.
              gap-x-3 keeps a clear horizontal gutter when both fit on one line;
              gap-y-0.5 keeps the wrap-to-next-line distance tight, so the location
              chip doesn't drop too far below the metric value. */}
          <div className="flex items-center justify-between gap-x-3 gap-y-0.5 flex-wrap">
            <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
              <h3 className="text-[15px] font-semibold leading-snug">{issue.metric}</h3>
              <Dot />
              <span className={cn("text-[15px] font-semibold tabular-nums leading-snug", deltaTone)}>
                {issue.value}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground text-[13px] whitespace-nowrap">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {geoParts.join(" › ")}
            </span>
          </div>

          {/* Line 2: Owner row, left-aligned */}
          <div className="flex items-center gap-1.5 flex-wrap text-[13px]">
            <span className="text-muted-foreground">Owner:</span>
            <span className="font-semibold text-foreground">
              {visibleOwners.join(", ")}
            </span>
            {extraOwners.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-foreground underline font-medium text-[12.5px] hover:text-primary">
                    +{extraOwners.length} more
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2 text-[12.5px]">
                  <ul className="space-y-1">
                    {extraOwners.map((name, i) => (
                      <li key={i} className="text-foreground">{name}</li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            )}
            {!readonly && (
              <Button
                size="icon"
                variant="outline"
                className="h-6 w-6 [&_svg]:size-3 text-muted-foreground hover:text-foreground ml-0.5"
                title="Reassign"
                onClick={() => setActionOpen("reassign")}
              >
                <UserCog />
              </Button>
            )}
          </div>
        </header>

        {/* Body: What happened (hypotheses only) | Suggested fix */}
        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-0 md:divide-x md:divide-border">
          <div className="md:pr-6">
            <div className="flex items-center gap-1.5 mb-2.5">
              <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">What happened</h5>
              {!readonly && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 [&_svg]:size-3 text-muted-foreground hover:text-foreground"
                  title="Edit RCA"
                  onClick={() => setActionOpen("editRca")}
                >
                  <Pencil />
                </Button>
              )}
            </div>
            {(issue.delta || issue.threshold) && (
              <p className="text-[13px] leading-relaxed mb-2">
                {issue.delta ? <span className={deltaTone}>{expandDelta(issue.delta)}</span> : null}
                {issue.delta && issue.threshold ? " " : ""}
                {issue.threshold ? (
                  <span className="text-muted-foreground">(threshold {issue.threshold})</span>
                ) : null}
              </p>
            )}
            {issue.hypotheses.length === 0 ? (
              <p className="text-[13px] text-muted-foreground leading-relaxed">No hypotheses yet.</p>
            ) : (
              <ul className="space-y-2">
                {issue.hypotheses.map((h, i) => (
                  <li key={i} className="flex items-baseline gap-2.5">
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[30px] px-1 h-[18px] rounded-full bg-primary/10 text-primary text-[9px] font-semibold tabular-nums">
                      {Math.round(h.c * 100)}%
                    </span>
                    <span className="text-[13px] leading-relaxed text-foreground">{h.h}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="md:pl-6">
            <div className="flex items-center gap-1.5 mb-2.5">
              <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested fix</h5>
              {!readonly && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 [&_svg]:size-3 text-muted-foreground hover:text-foreground"
                  title="Edit Fix"
                  onClick={() => setActionOpen("editFix")}
                >
                  <Pencil />
                </Button>
              )}
            </div>
            <p className="text-[13px] leading-relaxed text-foreground">{issue.fix}</p>
          </div>
        </div>

        {/* Action row — only on the issues variant */}
        {!readonly && !isImprovement && (
          <div className="px-5 py-3 bg-muted/40 border-t flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-card border-primary text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => setActionOpen("working")}
            >
              Working on it
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-card border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700"
              onClick={() => setActionOpen("resolved")}
            >
              Resolved
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
              onClick={() => setActionOpen("rejected")}
            >
              Not an Issue
            </Button>
          </div>
        )}

        <CommentsThread issue={issue} />
        {actionOpen && <IssueActionDialog open={!!actionOpen} onClose={() => setActionOpen(null)} action={actionOpen} issue={issue} />}
      </Card>
    </div>
  );
}

function Dot() {
  return <span className="text-muted-foreground/50 select-none">·</span>;
}
