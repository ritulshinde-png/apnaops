"use client";
import * as React from "react";
import { useAppStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IssueCard } from "@/components/issue-card";
import { EmptyState } from "@/components/empty-state";
import { ListChecks, Check, Clock, X, Pencil, MessageCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const KINDS = [
  { k: "all", label: "All" },
  { k: "resolved", label: "Resolved" },
  { k: "issue", label: "Working" },
  { k: "rejected", label: "Not an Issue" },
  { k: "editrca", label: "Edit RCA" },
  { k: "editfix", label: "Fix RCA" },
  { k: "comment", label: "Comments" },
  { k: "reassigned", label: "Reassigned" },
];

function IconForKind({ kind }: { kind: string }) {
  if (kind === "resolved") return <Check className="h-4 w-4" />;
  if (kind === "issue") return <Clock className="h-4 w-4" />;
  if (kind === "rejected") return <X className="h-4 w-4" />;
  if (kind === "editrca" || kind === "editfix" || kind === "rca") return <Pencil className="h-4 w-4" />;
  if (kind === "comment") return <MessageCircle className="h-4 w-4" />;
  if (kind === "reassigned") return <ArrowRight className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}
function iconBg(kind: string) {
  if (kind === "resolved") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (kind === "issue") return "bg-destructive/15 text-destructive";
  if (kind === "rejected") return "bg-muted text-muted-foreground";
  if (kind === "editrca" || kind === "editfix" || kind === "rca") return "bg-primary/15 text-primary";
  if (kind === "comment") return "bg-accent text-accent-foreground";
  if (kind === "reassigned") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

export default function ActionsPage() {
  const actions = useAppStore((s) => s.actions);
  const issues = useAppStore((s) => s.issues);
  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState("all");
  const [openIssueId, setOpenIssueId] = React.useState<string | null>(null);

  const ql = q.trim().toLowerCase();
  const filtered = actions.filter((a) => {
    if (kind !== "all" && a.kind !== kind) return false;
    if (ql && !(a.text || "").toLowerCase().includes(ql) && !(a.meta || "").toLowerCase().includes(ql)) return false;
    return true;
  });
  const groups: Record<string, typeof filtered> = {};
  filtered.forEach((a) => { const d = a.ts.split(" ")[0]; (groups[d] = groups[d] || []).push(a); });

  function exportCsv() {
    const rows = [["Timestamp", "Kind", "Text", "Meta"], ...filtered.map((a) => [a.ts, a.kind, a.text, a.meta || ""])];
    const csv = rows.map((r) => r.map((c) => { const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `apnaops-my-actions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const openIssue = openIssueId ? issues.find((i) => i.id === openIssueId) : null;

  return (
    <>
      <PageHeader
        title="My Actions"
        subtitle={`${filtered.length} of ${actions.length} actions${q ? ` matching "${q}"` : ""}${kind !== "all" ? ` · filtered to ${KINDS.find((x) => x.k === kind)?.label || kind}` : ""}`}
        actions={<Button variant="outline" onClick={exportCsv}>Export CSV</Button>}
      />
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Input placeholder="Search actions…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {KINDS.map((k) => (
            <button key={k.k} onClick={() => setKind(k.k)} className={cn("px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors", kind === k.k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary text-foreground")}>{k.label}</button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title="No actions match" subtitle={q || kind !== "all" ? "Try clearing the search or switching to All." : "Take an action on an issue and it will appear here."} />
      ) : (
        Object.entries(groups).map(([date, items]) => {
          const today = new Date().toISOString().split("T")[0];
          const label = date === today ? "Today" : date;
          return (
            <section key={date} className="mb-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}{label !== date && ` · ${date}`}</h2>
              <Card className="p-0 overflow-hidden">
                {items.map((a, idx) => (
                  <div key={idx} className={cn("flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 transition-colors", a.issueId && "cursor-pointer hover:bg-muted/40")} onClick={() => a.issueId && setOpenIssueId(a.issueId)}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", iconBg(a.kind))}><IconForKind kind={a.kind} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium leading-tight">{a.text}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5"><span>{a.ts.split(" ")[1]}</span> · {a.meta || "—"}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          );
        })
      )}
      <Dialog open={!!openIssue} onOpenChange={(o) => !o && setOpenIssueId(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {openIssue && (
            <>
              <DialogHeader className="px-5 pt-5 pb-3 border-b">
                <DialogTitle>{openIssue.metric}</DialogTitle>
                <DialogDescription>Issue detail</DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto">
                <IssueCard issue={openIssue} readonly />
              </div>
              <DialogFooter className="px-5 py-3 border-t bg-muted/40"><Button onClick={() => setOpenIssueId(null)}>Close</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
