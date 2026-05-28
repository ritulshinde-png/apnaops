"use client";
import * as React from "react";
import { UserCog, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Issue, IssueSeverity } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommentsThread } from "@/components/comments-thread";
import { daysBetween } from "@/lib/utils";
import { IssueActionDialog, type ActionKind } from "@/components/issue-action-dialog";
import { cn } from "@/lib/utils";

interface Props { issue: Issue; readonly?: boolean }

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

export function IssueCard({ issue, readonly = false }: Props) {
  const locations = useAppStore((s) => s.locations);
  const [actionOpen, setActionOpen] = React.useState<ActionKind | null>(null);
  const loc = locations[issue.locId];
  const locName = loc?.name || issue.locId;
  const geoParts = [locName];
  if (loc?.type === "Store") { if (issue.city) geoParts.push(issue.city); if (issue.state) geoParts.push(issue.state); }

  const daysOpen = issue.openedAt ? daysBetween(issue.openedAt) : 0;
  const deltaTone = issue.delta?.startsWith("-")
    ? "text-destructive"
    : issue.delta?.startsWith("+")
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-muted-foreground";

  const owners = splitOwners(issue.owner);
  const visibleOwners = owners.slice(0, 2);
  const extraOwners = owners.slice(2);

  return (
    <div className="mb-3.5">
      {/* Folder tab — solid card-colored background with priority-tinted border + text, overlaps card top by 1px */}
      <span
        className={cn(
          "relative z-10 ml-4 inline-flex items-center h-[20px] px-2.5 -mb-px bg-card border border-b-0 rounded-t-md text-[10px] font-bold uppercase tracking-wider",
          SEVERITY_BANNER[issue.severity]
        )}
      >
        {sevLabel(issue.severity)}
      </span>
      <Card className="overflow-hidden p-0">
        <header className="px-5 pt-4 pb-3.5 border-b space-y-1">
          {/* Line 1: metric name · value · delta(small) | right: Open since X days */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
              <h3 className="text-[15px] font-semibold leading-snug">{issue.metric}</h3>
              <Dot />
              <span className="text-[15px] font-semibold tabular-nums leading-snug">{issue.value}</span>
              {issue.delta && (
                <span className={cn("text-[11.5px]", deltaTone)}>({expandDelta(issue.delta)})</span>
              )}
            </div>
            {daysOpen > 1 && (
              <span className={cn(
                "tabular-nums px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap",
                SEVERITY_PILL[issue.severity]
              )}>
                Open since {daysOpen} days
              </span>
            )}
          </div>

          {/* Line 2: location (left) | Owner row (right edge if fits; left-aligned own line otherwise) */}
          <div className="flex items-center justify-between gap-x-3 gap-y-1 flex-wrap text-[13px]">
            <span className="font-semibold text-foreground">{geoParts.join(" › ")}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
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
                  <PopoverContent align="end" className="w-auto p-2 text-[12.5px]">
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
            {issue.hypotheses.length === 0 ? (
              <p className="text-[13px] text-muted-foreground leading-relaxed">No hypotheses yet.</p>
            ) : (
              <ul className="space-y-2">
                {issue.hypotheses.map((h, i) => (
                  <li key={i} className="flex items-baseline gap-2.5">
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[46px] px-2 h-[24px] rounded-full bg-primary/10 text-primary text-[13px] font-semibold tabular-nums">
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

        {/* Action row + timestamps on the right */}
        {!readonly && (
          <div className="px-5 py-3 bg-muted/40 border-t flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" className="h-8 text-xs" onClick={() => setActionOpen("working")}>
                Working on it
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-700"
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
            <div className="flex flex-col items-end gap-0.5 text-[11.5px] text-muted-foreground tabular-nums whitespace-nowrap leading-tight">
              <span><span className="font-medium">Open:</span> {issue.openedAt || "—"}</span>
              {issue.updatedAt && (
                <span><span className="font-medium">Updated:</span> {issue.updatedAt}</span>
              )}
            </div>
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
