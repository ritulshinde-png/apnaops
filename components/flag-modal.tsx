"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const locations = useAppStore((s) => s.locations);
  const loc = locations[locId];
  if (!loc) return null;
  const descendants = new Set(getDescendants(locId, locations));
  const matchedIssues = issues.filter((i) => descendants.has(i.locId));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>{loc.name} · flagged details</DialogTitle>
          <DialogDescription>{loc.type} · {matchedIssues.length} issue{matchedIssues.length === 1 ? "" : "s"}</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 max-h-[65vh] overflow-y-auto space-y-4">
          {matchedIssues.length === 0 ? (
            <EmptyState icon={Flag} title="No open issues here" subtitle="This location and its descendants have nothing flagged." />
          ) : matchedIssues.map((i) => <IssueCard key={i.id} issue={i} />)}
        </div>
        <DialogFooter className="px-6 py-3 border-t bg-muted/40">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
