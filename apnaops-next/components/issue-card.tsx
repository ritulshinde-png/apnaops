"use client";
import * as React from "react";
import { useAppStore } from "@/lib/store";
import type { Issue } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommentsThread } from "@/components/comments-thread";
import { daysBetween } from "@/lib/utils";
import { IssueActionDialog, type ActionKind } from "@/components/issue-action-dialog";

interface Props { issue: Issue; readonly?: boolean }

export function IssueCard({ issue, readonly = false }: Props) {
  const locations = useAppStore((s) => s.locations);
  const [actionOpen, setActionOpen] = React.useState<ActionKind | null>(null);
  const loc = locations[issue.locId];
  const locName = loc?.name || issue.locId;
  const geoParts = [locName];
  if (loc?.type === "Store") { if (issue.city) geoParts.push(issue.city); if (issue.state) geoParts.push(issue.state); }

  const sevVariant = issue.severity === "ok" ? "success" : issue.severity === "p0" ? "p0" : "p1";
  const sevText = issue.severity === "ok" ? "Recovered" : issue.severity.toUpperCase();
  const daysOpen = issue.openedAt ? daysBetween(issue.openedAt) : 0;
  const isStale = daysOpen >= 3 && issue.severity !== "ok" && issue.status !== "resolved" && issue.status !== "rejected";
  const openLabel = daysOpen === 0 ? "opened today" : `open ${daysOpen}d`;
  const deltaTone = issue.delta?.startsWith("-") ? "text-destructive" : issue.delta?.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "";

  return (
    <Card className="overflow-hidden p-0 mb-3.5">
      <header className="px-5 pt-4 pb-3.5 border-b">
        <div className="flex items-start gap-3 flex-wrap">
          <h3 className="text-[15px] font-semibold leading-snug flex-1 min-w-0">{issue.metric}</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={sevVariant as "p0" | "p1" | "success"}>{sevText}</Badge>
            {issue.status && <Badge variant={issue.status === "resolved" ? "success" : issue.status === "working" ? "info" : "muted"}>{issue.status}</Badge>}
            {isStale && <Badge variant="p0" className="uppercase text-[9px] tracking-wider">Stale · {daysOpen}d</Badge>}
          </div>
        </div>
        <p className="text-[12.5px] text-muted-foreground mt-1.5">{geoParts.join(" › ")} · threshold {issue.threshold}</p>
        <div className="flex items-center gap-2 flex-wrap mt-2 text-[11.5px] text-muted-foreground">
          <span><b className="text-foreground font-semibold">{issue.value}</b> <span className={deltaTone}>{issue.delta}</span></span>
          <span className="text-border">·</span>
          <span>{openLabel}{issue.openedAt ? ` · since ${issue.openedAt.slice(0, 10)}` : ""}</span>
          {issue.updatedAt && (<><span className="text-border">·</span><span>updated {issue.updatedAt.slice(11)}</span></>)}
        </div>
      </header>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
        <ColBlock label="What happened" text={issue.what} />
        <ColBlock label="Suggested fix" text={issue.fix} />
        <ColBlock label="Owner" text={issue.owner} />
      </div>
      {!readonly && (
        <div className="px-5 py-3 bg-muted/50 border-t flex items-center gap-1.5 flex-wrap">
          <Button size="sm" onClick={() => setActionOpen("working")}>Working on it</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActionOpen("resolved")}>Resolved</Button>
          <Button size="sm" variant="ghost" className="hover:text-destructive" onClick={() => setActionOpen("rejected")}>Not an Issue</Button>
          <Button size="sm" variant="ghost" onClick={() => setActionOpen("editRca")}>Edit RCA</Button>
          <Button size="sm" variant="ghost" onClick={() => setActionOpen("editFix")}>Edit Fix</Button>
          <Button size="sm" variant="ghost" onClick={() => setActionOpen("reassign")}>Reassign</Button>
        </div>
      )}
      <CommentsThread issue={issue} />
      {actionOpen && <IssueActionDialog open={!!actionOpen} onClose={() => setActionOpen(null)} action={actionOpen} issue={issue} />}
    </Card>
  );
}

function ColBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</h5>
      <p className="text-[13px] leading-relaxed text-foreground">{text}</p>
    </div>
  );
}
