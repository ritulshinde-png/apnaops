"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { IssueCard } from "@/components/issue-card";
import { EmptyState } from "@/components/empty-state";
import { Flag } from "lucide-react";

interface Props { locId: string; open: boolean; onClose: () => void; }

function getDescendants(locId: string, locations: ReturnType<typeof useAppStore.getState>["locations"]): string[] {
  const loc = locations[locId];
  if (!loc) return [locId];
  return [locId, ...loc.children.flatMap((c) => getDescendants(c, locations))];
}

export function FlagModal({ locId, open, onClose }: Props) {
  const issues = useAppStore((s) => s.issues);
  const actionables = useAppStore((s) => s.actionables);
  const locations = useAppStore((s) => s.locations);
  const loc = locations[locId];
  if (!loc) return null;
  const descendants = new Set(getDescendants(locId, locations));
  const matchedIssues = issues.filter((i) => descendants.has(i.locId));
  const matchedActionables = actionables.filter((a) => descendants.has(a.locId));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>{loc.name} · flagged details</DialogTitle>
          <DialogDescription>{loc.type} · {matchedIssues.length} issue{matchedIssues.length === 1 ? "" : "s"} · {matchedActionables.length} actionable{matchedActionables.length === 1 ? "" : "s"}</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 max-h-[65vh] overflow-y-auto space-y-4">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Issues</h3>
            {matchedIssues.length === 0 ? (
              <EmptyState icon={Flag} title="No open issues here" subtitle="This location and its descendants have nothing flagged." />
            ) : matchedIssues.map((i) => <IssueCard key={i.id} issue={i} readonly />)}
          </section>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Actionables</h3>
            {matchedActionables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open actionables.</p>
            ) : (
              <div className="space-y-2">
                {matchedActionables.map((a, idx) => (
                  <div key={idx} className="rounded-md border bg-card px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.owner} · due {a.due} · {a.lastUpdate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.sev === "p0" ? "p0" : a.sev === "p1" ? "p1" : "muted"}>{a.ago} since update</Badge>
                      <Button size="sm" variant="outline">Update</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <DialogFooter className="px-6 py-3 border-t bg-muted/40 gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button>+ Add actionable</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
