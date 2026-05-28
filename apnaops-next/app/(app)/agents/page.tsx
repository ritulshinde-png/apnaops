"use client";
import * as React from "react";
import { useAppStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, RotateCw } from "lucide-react";
import type { AgentDef } from "@/lib/types";

export default function AgentsPage() {
  const agents = useAppStore((s) => s.agents);
  const upsertAgent = useAppStore((s) => s.upsertAgent);
  const deleteAgent = useAppStore((s) => s.deleteAgent);
  const runAgentNow = useAppStore((s) => s.runAgentNow);
  const pauseAgent = useAppStore((s) => s.pauseAgent);
  const resumeAgent = useAppStore((s) => s.resumeAgent);
  const [openId, setOpenId] = React.useState<string | "new" | null>(null);
  const [historyId, setHistoryId] = React.useState<string | null>(null);
  const customCount = agents.filter((a) => !a.isSystem).length;

  return (
    <>
      <PageHeader title="Agents & Schedules" subtitle={`${agents.length} agents · ${agents.length - customCount} system + ${customCount} custom`} actions={<Button onClick={() => setOpenId("new")}>+ Add agent</Button>} />
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Kind</TableHead><TableHead>Schedule</TableHead><TableHead>Last run</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{agents.map((a) => (
            <TableRow key={a.id}>
              <TableCell><div className="flex items-center gap-2"><span className="font-semibold">{a.name}</span><Badge variant={a.isSystem ? "muted" : "info"} className="text-[10px]">{a.isSystem ? "system" : "custom"}</Badge></div><div className="text-xs text-muted-foreground mt-0.5">{a.description}</div></TableCell>
              <TableCell><Badge variant="muted" className="text-xs">{a.kind}</Badge></TableCell>
              <TableCell className="text-xs">{a.schedule}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{a.lastRun}</TableCell>
              <TableCell><Badge variant={a.paused ? "muted" : a.status === "fail" ? "p0" : a.status === "running" ? "info" : "success"} className="text-[10px]">{a.paused ? "paused" : a.status}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col gap-1.5 ml-auto items-stretch min-w-[120px]">
                  {a.paused ? (
                    <Button size="sm" onClick={() => resumeAgent(a.id)}><Play className="h-3 w-3" /> Resume</Button>
                  ) : a.running ? (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => pauseAgent(a.id)}>Running / Pause</Button>
                  ) : (
                    <Button size="sm" onClick={() => runAgentNow(a.id)}><Play className="h-3 w-3" /> Run now</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setOpenId(a.id)}>View / Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setHistoryId(a.id)}>History</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>

      <Card className="p-4 mt-5 border-l-4 border-l-primary text-sm text-muted-foreground">
        <p><strong className="text-foreground">Build your own agent.</strong> Click <b>+ Add agent</b> to schedule a new workflow. Define the trigger, context, instructions in plain English, rules, knowledge docs, and outputs — just like a Claude scheduled job.</p>
      </Card>

      {openId && <AgentDialog agent={openId === "new" ? null : agents.find((a) => a.id === openId) || null} onClose={() => setOpenId(null)} onSave={(a) => { upsertAgent(a); setOpenId(null); }} onDelete={(id) => { if (confirm("Delete this agent?")) { deleteAgent(id); setOpenId(null); } }} />}
      {historyId && <AgentHistoryDialog agentId={historyId} agentName={agents.find((a) => a.id === historyId)?.name || ""} onClose={() => setHistoryId(null)} onRunNow={() => runAgentNow(historyId)} />}
    </>
  );
}

function AgentDialog({ agent, onClose, onSave, onDelete }: { agent: AgentDef | null; onClose: () => void; onSave: (a: AgentDef) => void; onDelete: (id: string) => void }) {
  const isNew = !agent;
  const [name, setName] = React.useState(agent?.name || "");
  const [desc, setDesc] = React.useState(agent?.description || "");
  const [trigger, setTrigger] = React.useState(agent?.trigger || "cron");
  const [kind, setKind] = React.useState(agent?.kind || "cron");
  const [schedule, setSchedule] = React.useState(agent?.schedule || "");
  const [instructions, setInstructions] = React.useState(agent?.instructions || "");
  const [rules, setRules] = React.useState((agent?.rules || []).join("\n"));
  const [knowledge, setKnowledge] = React.useState((agent?.knowledge || []).join("\n"));
  const [perHour, setPerHour] = React.useState(agent?.rateLimit?.perHour ?? 60);
  const [perMin, setPerMin] = React.useState(agent?.rateLimit?.perMinPerChannel ?? 10);
  function save() {
    if (!name.trim()) { alert("Agent name required"); return; }
    if (trigger === "cron" && /every\s+\d+\s*(s|sec|second)/i.test(schedule)) { alert("Sub-minute cadence is not allowed. Minimum cadence is 1 minute."); return; }
    const payload: AgentDef = {
      id: agent?.id || `a-custom_${Date.now().toString(36)}`,
      isSystem: agent?.isSystem ?? false,
      name: name.trim(),
      description: desc.trim(),
      trigger: trigger as "cron" | "event" | "manual" | "worker",
      kind: kind as "cron" | "oneshot" | "worker" | "manual",
      schedule: schedule.trim() || "—",
      context: agent?.context || [],
      instructions: instructions.trim(),
      rules: rules.split("\n").map((s) => s.trim()).filter(Boolean),
      knowledge: knowledge.split("\n").map((s) => s.trim()).filter(Boolean),
      outputs: agent?.outputs || [],
      rateLimit: { perHour, perMinPerChannel: perMin },
      lastRun: agent?.lastRun || "never",
      status: agent?.status || "success",
      paused: agent?.paused ?? false,
    };
    onSave(payload);
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isNew ? "Add agent" : "Edit agent"}</DialogTitle><DialogDescription>Schedule any new workflow as an agent — like a Claude scheduled job.</DialogDescription></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Trigger</Label>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as typeof trigger)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cron">cron</SelectItem><SelectItem value="event">event</SelectItem><SelectItem value="manual">manual</SelectItem><SelectItem value="worker">worker</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What does this agent do in one line?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cron">cron</SelectItem><SelectItem value="oneshot">oneshot</SelectItem><SelectItem value="worker">worker</SelectItem><SelectItem value="manual">manual</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Schedule</Label><Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="every 1 h" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Max runs / hour</Label><Input type="number" min={1} value={perHour} onChange={(e) => setPerHour(parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-1.5"><Label>Max msgs / min / channel</Label><Input type="number" min={1} value={perMin} onChange={(e) => setPerMin(parseInt(e.target.value) || 0)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Instructions (the agent&apos;s prompt)</Label><Textarea rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Write what the agent should do each cycle, in plain English." /></div>
          <div className="space-y-1.5"><Label>Rules / constraints (one per line)</Label><Textarea rows={3} value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Never include PII in Slack" /></div>
          <div className="space-y-1.5"><Label>Knowledge refs (one per line)</Label><Textarea rows={2} value={knowledge} onChange={(e) => setKnowledge(e.target.value)} placeholder="Outline doc URL or Rule Book entry ID" /></div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button>{agent && !agent.isSystem && <Button variant="destructive" onClick={() => onDelete(agent.id)}>Delete</Button>}<Button onClick={save}>{isNew ? "Create agent" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentHistoryDialog({ agentId, agentName, onClose, onRunNow }: { agentId: string; agentName: string; onClose: () => void; onRunNow: () => void }) {
  type Run = { id: string; start: string; end: string; durMs: number; status: string; trigger: string; output: string };
  const [runs, setRuns] = React.useState<Run[]>(() => {
    const out: Run[] = [];
    let seed = agentId.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0) >>> 0;
    const rng = () => { seed = (seed + 0x6D2B79F5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = 0; i < 18; i++) {
      const start = new Date(Date.now() - (i * (10 + Math.floor(rng() * 110))) * 60000);
      const durMs = Math.floor(rng() * 9000) + 600;
      const end = new Date(start.getTime() + durMs);
      const r = rng();
      const status = r < 0.84 ? "success" : r < 0.95 ? "fail" : "retrying";
      const output = status === "success" ? (rng() < 0.5 ? "wrote 3 snapshots" : "no-op — within thresholds") : ["Connector timeout", "Rate-limited", "Outline patch conflict"][Math.floor(rng() * 3)];
      out.push({ id: `jr_${i}`, start: start.toISOString().replace("T", " ").slice(0, 16), end: end.toISOString().replace("T", " ").slice(0, 16), durMs, status, trigger: rng() < 0.85 ? "cron" : "manual", output });
    }
    return out;
  });
  const success = runs.filter((r) => r.status === "success").length;
  const fail = runs.filter((r) => r.status === "fail").length;
  function rerun(jrId: string) {
    setRuns((rs) => rs.map((r) => r.id === jrId ? { ...r, status: "success", output: "rerun: success", end: new Date().toISOString().replace("T", " ").slice(0, 16) } : r));
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{agentName} · run history</DialogTitle><DialogDescription>Last {runs.length} invocations · {success} success · {fail} failed</DialogDescription></DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Started</TableHead><TableHead>Duration</TableHead><TableHead>Trigger</TableHead><TableHead>Status</TableHead><TableHead>Output / Error</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{r.start}</TableCell>
                <TableCell className="text-xs">{r.durMs}ms</TableCell>
                <TableCell className="text-xs">{r.trigger}</TableCell>
                <TableCell><Badge variant={r.status === "success" ? "success" : r.status === "fail" ? "p0" : "info"} className="text-[10px]">{r.status}</Badge></TableCell>
                <TableCell className={`text-xs ${r.status === "fail" ? "text-destructive" : "text-muted-foreground"}`}>{r.output}</TableCell>
                <TableCell className="text-right">{r.status === "fail" && <Button size="sm" onClick={() => rerun(r.id)}><RotateCw className="h-3 w-3" /> Rerun</Button>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={onRunNow}><Play className="h-3 w-3" /> Run now</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
