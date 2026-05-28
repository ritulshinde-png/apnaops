"use client";
import * as React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { nowTs } from "@/lib/utils";
import type { Issue } from "@/lib/types";

export type ActionKind = "working" | "resolved" | "rejected" | "reassign" | "editRca" | "editFix";

const TITLES: Record<ActionKind, { title: string; description: string; cta: string }> = {
  working: { title: "Working on it", description: "Tell the agent what you're doing and your expected ETA.", cta: "Mark as working" },
  resolved: { title: "Mark as resolved", description: "How did you fix it? This goes to the Rule Book.", cta: "Resolve issue" },
  rejected: { title: "Not an issue", description: "Tell the agent why this should not be flagged.", cta: "Dismiss" },
  reassign: { title: "Reassign", description: "Update assignees for this issue only — does not change role permissions.", cta: "Save assignees" },
  editRca: { title: "Edit RCA", description: "Refine the agent's ranked hypotheses.", cta: "Save RCA" },
  editFix: { title: "Edit fix", description: "Edit the suggested fix text.", cta: "Save fix" },
};

function splitOwners(owner: string): string[] {
  return (owner || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function IssueActionDialog({ open, onClose, action, issue }: { open: boolean; onClose: () => void; action: ActionKind; issue: Issue }) {
  const cfg = TITLES[action];
  const updateIssue = useAppStore((s) => s.updateIssue);
  const users = useAppStore((s) => s.users);
  const addAction = useAppStore((s) => s.addAction);
  const currentUser = useCurrentUser();
  const actor = currentUser?.name || "User";
  const [note, setNote] = React.useState("");
  const [eta, setEta] = React.useState("");
  const [fix, setFix] = React.useState(issue.fix);
  const [why, setWhy] = React.useState("");
  const [stopScope, setStopScope] = React.useState("This metric+store only");
  const [rb, setRb] = React.useState("Yes");
  const [fixRb, setFixRb] = React.useState("Yes");
  const [assignees, setAssignees] = React.useState<string[]>(splitOwners(issue.owner));
  const [reason, setReason] = React.useState("");
  const [rcaText, setRcaText] = React.useState(issue.hypotheses.map((h) => `${h.h} · ${h.c}`).join("\n"));

  function addAssignee(name: string) {
    setAssignees((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }
  function removeAssignee(name: string) {
    setAssignees((prev) => prev.filter((n) => n !== name));
  }

  function submit() {
    const ts = nowTs();
    const locName = issue.locId;
    if (action === "working") {
      if (!eta) { alert("Pick an expected ETA."); return; }
      updateIssue(issue.id, { status: "working", updatedAt: ts });
      addAction({ ts, kind: "working", actor, text: `Working on it · ${issue.metric} at ${locName}`, meta: `ETA: ${eta}${note ? " · " + note.slice(0, 60) : ""}`, issueId: issue.id });
    } else if (action === "resolved") {
      if (!fix.trim()) { alert("Please describe how you fixed it."); return; }
      updateIssue(issue.id, { status: "resolved", updatedAt: ts });
      addAction({ ts, kind: "resolved", actor, text: `Resolved · ${issue.metric} at ${locName}`, meta: `Rule Book: ${rb} · ${fix.slice(0, 80)}`, issueId: issue.id });
    } else if (action === "rejected") {
      if (!why.trim()) { alert("Please tell the agent why this is not an issue."); return; }
      updateIssue(issue.id, { status: "rejected", updatedAt: ts });
      addAction({ ts, kind: "rejected", actor, text: `Marked not-an-issue · ${issue.metric} at ${locName}`, meta: `Scope: ${stopScope} · ${why.slice(0, 80)}`, issueId: issue.id });
    } else if (action === "reassign") {
      if (assignees.length === 0) { alert("Add at least one assignee."); return; }
      const old = issue.owner;
      const next = assignees.join(", ");
      updateIssue(issue.id, { status: "reassigned", owner: next, updatedAt: ts });
      addAction({
        ts,
        kind: "reassigned",
        actor,
        text: `Reassigned ${issue.metric} at ${locName} → ${next}`,
        meta: `was: ${old}${reason ? " · " + reason.slice(0, 60) : ""}`,
        issueId: issue.id,
      });
    } else if (action === "editRca") {
      const lines = rcaText.split("\n").map((l) => l.trim()).filter(Boolean);
      const hypotheses = lines.map((l) => { const parts = l.split("·").map((s) => s.trim()); return { h: parts[0] || l, c: parseFloat(parts[1]) || 0.5 }; });
      updateIssue(issue.id, { hypotheses, updatedAt: ts });
      addAction({ ts, kind: "editrca", actor, text: `Edited RCA · ${issue.metric} at ${locName}`, meta: `${hypotheses.length} hypotheses · sent to Rule Book editor`, issueId: issue.id });
    } else if (action === "editFix") {
      updateIssue(issue.id, { fix, updatedAt: ts });
      addAction({ ts, kind: "editfix", actor, text: `Edited fix · ${issue.metric} at ${locName}`, meta: `Rule Book: ${fixRb}`, issueId: issue.id });
    }
    onClose();
  }

  const addableUsers = users.filter((u) => u.active && !assignees.includes(u.name));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cfg.title}</DialogTitle><DialogDescription>{cfg.description}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {action === "working" && (<>
            <div className="space-y-1.5"><Label>What are you doing?</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></div>
            <div className="space-y-1.5"><Label>Expected ETA</Label>
              <Select value={eta} onValueChange={setEta}>
                <SelectTrigger><SelectValue placeholder="Pick an ETA" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30min">30 mins</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="eod">End of day</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="unknown">Can&apos;t say now</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>)}
          {action === "resolved" && (<>
            <div className="space-y-1.5"><Label>How did you fix it?</Label><Textarea value={fix} onChange={(e) => setFix(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Add to Rule Book?</Label>
              <Select value={rb} onValueChange={setRb}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Yes">Yes, as a draft</SelectItem><SelectItem value="Skip">Skip</SelectItem></SelectContent>
              </Select>
            </div>
          </>)}
          {action === "rejected" && (<>
            <div className="space-y-1.5"><Label>Why is this not an issue?</Label><Textarea value={why} onChange={(e) => setWhy(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Scope to stop flagging</Label>
              <Select value={stopScope} onValueChange={setStopScope}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="This metric+store only">This metric+store only</SelectItem>
                  <SelectItem value="This metric in this city">This metric in this city</SelectItem>
                  <SelectItem value="Just this one occurrence">Just this one occurrence</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>)}
          {action === "reassign" && (<>
            <div className="space-y-1.5">
              <Label>Current assignees</Label>
              {assignees.length === 0 ? (
                <p className="text-xs text-muted-foreground">No assignees — add at least one below.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignees.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-muted pl-2.5 pr-1 py-0.5 text-[12px] font-medium"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeAssignee(name)}
                        className="inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Add user</Label>
              <Select value="" onValueChange={addAssignee}>
                <SelectTrigger><SelectValue placeholder={addableUsers.length === 0 ? "All users already assigned" : "Pick a user to add"} /></SelectTrigger>
                <SelectContent>
                  {addableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.name}>
                      {u.name} · {u.role || "no role"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Only changes assignees on this issue — does not modify the user&apos;s role or metric mapping.</p>
            </div>
            <div className="space-y-1.5"><Label>Reason (optional)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          </>)}
          {action === "editRca" && (
            <div className="space-y-1.5"><Label>Ranked hypotheses (one per line · text · confidence)</Label><Textarea rows={6} value={rcaText} onChange={(e) => setRcaText(e.target.value)} /></div>
          )}
          {action === "editFix" && (<>
            <div className="space-y-1.5"><Label>Suggested fix</Label><Textarea value={fix} onChange={(e) => setFix(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Add to Rule Book?</Label>
              <Select value={fixRb} onValueChange={setFixRb}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes, as a draft</SelectItem>
                  <SelectItem value="Skip">Skip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>)}
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>{cfg.cta}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
