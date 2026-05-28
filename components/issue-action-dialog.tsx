"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { nowTs } from "@/lib/utils";
import type { Issue } from "@/lib/types";

export type ActionKind = "working" | "resolved" | "rejected" | "reassign" | "editRca" | "editFix";

const TITLES: Record<ActionKind, { title: string; description: string; cta: string }> = {
  working: { title: "Working on it", description: "Tell the agent what you're doing and your expected ETA.", cta: "Mark as working" },
  resolved: { title: "Mark as resolved", description: "How did you fix it? This goes to the Rule Book.", cta: "Resolve issue" },
  rejected: { title: "Not an issue", description: "Tell the agent why this should not be flagged.", cta: "Dismiss" },
  reassign: { title: "Reassign", description: "Pick a new owner.", cta: "Reassign" },
  editRca: { title: "Edit RCA", description: "Refine the agent's ranked hypotheses.", cta: "Save RCA" },
  editFix: { title: "Edit fix", description: "Edit the suggested fix text.", cta: "Save fix" },
};

export function IssueActionDialog({ open, onClose, action, issue }: { open: boolean; onClose: () => void; action: ActionKind; issue: Issue }) {
  const cfg = TITLES[action];
  const updateIssue = useAppStore((s) => s.updateIssue);
  const users = useAppStore((s) => s.users);
  const addAction = useAppStore((s) => s.addAction);
  const [note, setNote] = React.useState("");
  const [eta, setEta] = React.useState("");
  const [fix, setFix] = React.useState(issue.fix);
  const [why, setWhy] = React.useState("");
  const [stopScope, setStopScope] = React.useState("This metric+store only");
  const [worked, setWorked] = React.useState("Yes");
  const [rb, setRb] = React.useState("Yes");
  const [newOwnerId, setNewOwnerId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [rcaText, setRcaText] = React.useState(issue.hypotheses.map((h) => `${h.h} · ${h.c}`).join("\n"));
  const [ref, setRef] = React.useState("");

  function submit() {
    const ts = nowTs();
    const locName = issue.locId;
    if (action === "working") {
      updateIssue(issue.id, { status: "working" });
      addAction({ ts, kind: "issue", text: `Working on it · ${issue.metric} at ${locName}`, meta: `ETA: ${eta}${note ? " · " + note.slice(0, 60) : ""}`, issueId: issue.id });
    } else if (action === "resolved") {
      if (!fix.trim()) { alert("Please describe how you fixed it."); return; }
      updateIssue(issue.id, { status: "resolved" });
      addAction({ ts, kind: "resolved", text: `Resolved · ${issue.metric} at ${locName}`, meta: `Worked: ${worked} · Rule Book: ${rb} · ${fix.slice(0, 80)}`, issueId: issue.id });
    } else if (action === "rejected") {
      if (!why.trim()) { alert("Please tell the agent why this is not an issue."); return; }
      updateIssue(issue.id, { status: "rejected" });
      addAction({ ts, kind: "rejected", text: `Marked not-an-issue · ${issue.metric} at ${locName}`, meta: `Scope: ${stopScope} · ${why.slice(0, 80)}`, issueId: issue.id });
    } else if (action === "reassign") {
      if (!newOwnerId) { alert("Pick a user to reassign to."); return; }
      const nu = users.find((u) => u.id === newOwnerId);
      if (!nu) return;
      const old = issue.owner;
      updateIssue(issue.id, { status: "reassigned", owner: nu.name });
      addAction({ ts, kind: "reassigned", text: `Reassigned ${issue.metric} at ${locName} → ${nu.name}`, meta: `was: ${old}${reason ? " · " + reason.slice(0, 60) : ""}`, issueId: issue.id });
    } else if (action === "editRca") {
      const lines = rcaText.split("\n").map((l) => l.trim()).filter(Boolean);
      const hypotheses = lines.map((l) => { const parts = l.split("·").map((s) => s.trim()); return { h: parts[0] || l, c: parseFloat(parts[1]) || 0.5 }; });
      updateIssue(issue.id, { hypotheses });
      addAction({ ts, kind: "editrca", text: `Edited RCA · ${issue.metric} at ${locName}`, meta: `${hypotheses.length} hypotheses · sent to Rule Book editor`, issueId: issue.id });
    } else if (action === "editFix") {
      updateIssue(issue.id, { fix });
      addAction({ ts, kind: "editfix", text: `Edited fix · ${issue.metric} at ${locName}`, meta: `${ref ? ref + " · " : ""}sent to Rule Book editor`, issueId: issue.id });
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cfg.title}</DialogTitle><DialogDescription>{cfg.description}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {action === "working" && (<>
            <div className="space-y-1.5"><Label>What are you doing?</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></div>
            <div className="space-y-1.5"><Label>Expected ETA</Label><Input type="time" value={eta} onChange={(e) => setEta(e.target.value)} /></div>
          </>)}
          {action === "resolved" && (<>
            <div className="space-y-1.5"><Label>How did you fix it?</Label><Textarea value={fix} onChange={(e) => setFix(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Did it work?</Label>
              <Select value={worked} onValueChange={setWorked}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="Partial">Partial</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
              </Select>
            </div>
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
            <div className="space-y-1.5"><Label>New owner</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}><SelectTrigger><SelectValue placeholder="Pick a user" /></SelectTrigger>
                <SelectContent>{users.filter((u) => u.active).map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.role || "no role"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Reason (optional)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          </>)}
          {action === "editRca" && (
            <div className="space-y-1.5"><Label>Ranked hypotheses (one per line · text · confidence)</Label><Textarea rows={6} value={rcaText} onChange={(e) => setRcaText(e.target.value)} /></div>
          )}
          {action === "editFix" && (<>
            <div className="space-y-1.5"><Label>Suggested fix</Label><Textarea value={fix} onChange={(e) => setFix(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Rule Book reference (optional)</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. S-04" /></div>
          </>)}
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>{cfg.cta}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
