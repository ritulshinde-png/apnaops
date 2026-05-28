"use client";
import * as React from "react";
import { useAppStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, X, Video, RefreshCw } from "lucide-react";
import type { Role, Standup } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function RolesPage() {
  const roles = useAppStore((s) => s.roles);
  const metrics = useAppStore((s) => s.metrics);
  const users = useAppStore((s) => s.users);
  const standups = useAppStore((s) => s.standups);
  const upsertRole = useAppStore((s) => s.upsertRole);
  const deleteRole = useAppStore((s) => s.deleteRole);
  const upsertStandup = useAppStore((s) => s.upsertStandup);
  const deleteStandup = useAppStore((s) => s.deleteStandup);
  const syncMeetings = useAppStore((s) => s.syncMeetings);
  const selectedRoleId = useAppStore((s) => s.selectedRoleId);
  const selectRole = useAppStore((s) => s.selectRole);
  const [roleDialog, setRoleDialog] = React.useState<string | "new" | null>(null);
  const [standupDialog, setStandupDialog] = React.useState<string | "new" | null>(null);

  const rootRole = roles.find((r) => r.id === "r-admin") || roles.find((r) => !r.parent);
  const unsyncedCount = standups.filter((s) => !s.meetLink || s.syncDirty).length;

  function tree(role: Role | undefined): React.ReactNode {
    if (!role) return null;
    const children = roles.filter((r) => r.parent === role.id);
    const isSelected = selectedRoleId === role.id;
    return (
      <li key={role.id}>
        <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-card min-w-[260px] cursor-pointer transition-all relative", isSelected ? "border-primary ring-2 ring-ring/40" : "border-border hover:border-primary/60")} onClick={() => selectRole(role.id)}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{role.name}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{role.metrics.length} metrics · {role.metrics.slice(0, 2).join(", ")}{role.metrics.length > 2 ? "…" : ""}</div>
          </div>
          {isSelected && (
            <div className="flex gap-1 ml-1">
              <Button size="icon" variant="outline" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setRoleDialog(role.id); }}><Pencil className="h-3 w-3" /></Button>
              <Button size="icon" variant="outline" className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground" onClick={(e) => { e.stopPropagation(); confirmDelete(role); }}><X className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
        {children.length > 0 && <ul>{children.map((c) => tree(c))}</ul>}
      </li>
    );
  }
  function confirmDelete(role: Role) {
    const usersIn = users.filter((u) => u.role === role.name).map((u) => u.name);
    const childRoles = roles.filter((r) => r.parent === role.id).map((r) => r.name);
    const lines = [`Delete role "${role.name}"?`];
    if (role.metrics.length) lines.push(`\n• Owned metrics: ${role.metrics.join(", ")}`);
    if (usersIn.length) lines.push(`• Users in this role: ${usersIn.join(", ")}`);
    if (childRoles.length) lines.push(`• Child roles will become top-level: ${childRoles.join(", ")}`);
    if (confirm(lines.join("\n"))) deleteRole(role.id);
  }
  function runSync() {
    const res = syncMeetings();
    setTimeout(() => alert(`Sync complete · ${res.created} created${res.updated ? `, ${res.updated} updated` : ""}.`), 50);
  }

  return (
    <>
      <PageHeader title="Roles & Permissions" subtitle={`${roles.length} roles · click any to select. Edit and Delete appear when selected.`} actions={<Button onClick={() => setRoleDialog("new")}>+ Add role</Button>} />
      <Card className="p-0 overflow-hidden">
        <div className="p-5 overflow-x-auto"><ul className="role-tree">{tree(rootRole)}</ul></div>
      </Card>

      <div className="flex justify-between items-center mt-8 mb-4 flex-wrap gap-3">
        <div><h2 className="text-lg font-semibold tracking-tight">Standup Meetings</h2><p className="text-sm text-muted-foreground mt-1">{standups.length} standup{standups.length === 1 ? "" : "s"} · attendees come from the role tree</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runSync}><RefreshCw className="h-3.5 w-3.5" /> Sync Meetings{unsyncedCount ? ` (${unsyncedCount} pending)` : ""}</Button>
          <Button onClick={() => setStandupDialog("new")}>+ Add standup</Button>
        </div>
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b"><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Time</th><th className="px-4 py-2.5">Cadence</th><th className="px-4 py-2.5">Attendees</th><th className="px-4 py-2.5">Meet</th><th></th>
          </tr></thead>
          <tbody>
            {standups.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.time} {s.timezone}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.cadence}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{s.attendees.length} people</td>
                <td className="px-4 py-3">{s.meetLink ? (s.syncDirty ? <Badge variant="warn">Pending edit</Badge> : <Badge variant="success"><Video className="h-3 w-3" /> Synced</Badge>) : <Badge variant="muted">No link</Badge>}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => setStandupDialog(s.id)}>Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {roleDialog && <RoleDialog role={roleDialog === "new" ? null : roles.find((r) => r.id === roleDialog) || null} roles={roles} metrics={metrics} onClose={() => setRoleDialog(null)} onSave={(r) => { upsertRole(r); setRoleDialog(null); }} />}
      {standupDialog && <StandupDialog standup={standupDialog === "new" ? null : standups.find((s) => s.id === standupDialog) || null} users={users.filter((u) => u.active)} onClose={() => setStandupDialog(null)} onSave={(s) => { upsertStandup(s); setStandupDialog(null); }} onDelete={(id) => { if (confirm("Delete this standup?")) { deleteStandup(id); setStandupDialog(null); } }} />}
    </>
  );
}

function RoleDialog({ role, roles, metrics, onClose, onSave }: { role: Role | null; roles: Role[]; metrics: { name: string }[]; onClose: () => void; onSave: (r: Role) => void }) {
  const [name, setName] = React.useState(role?.name || "");
  const [parent, setParent] = React.useState(role?.parent || "r-admin");
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>(role?.metrics || []);
  function save() {
    if (!name.trim()) { alert("Role name required"); return; }
    onSave({ id: role?.id || `r_${Date.now().toString(36)}`, name: name.trim(), parent: parent || null, metrics: selectedMetrics });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{role ? "Edit role" : "Add role"}</DialogTitle><DialogDescription>Define role name, parent in tree, and owned metrics.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Role name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zonal Manager" /></div>
          <div className="space-y-1.5"><Label>Parent role</Label>
            <Select value={parent || ""} onValueChange={setParent}><SelectTrigger><SelectValue placeholder="(top level)" /></SelectTrigger>
              <SelectContent>{roles.filter((r) => r.id !== role?.id && r.id !== "r-owner").map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Metrics owned</Label>
            <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1.5">
              {metrics.map((m) => (
                <label key={m.name} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selectedMetrics.includes(m.name)} onCheckedChange={(c) => setSelectedMetrics((cur) => c ? [...cur, m.name] : cur.filter((x) => x !== m.name))} />
                  {m.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StandupDialog({ standup, users, onClose, onSave, onDelete }: { standup: Standup | null; users: { id: string; name: string; role?: string }[]; onClose: () => void; onSave: (s: Standup) => void; onDelete: (id: string) => void }) {
  const [name, setName] = React.useState(standup?.name || "");
  const [time, setTime] = React.useState(standup?.time || "09:30");
  const [tz, setTz] = React.useState(standup?.timezone || "IST");
  const [cadence, setCadence] = React.useState(standup?.cadence || "Daily");
  const [attendees, setAttendees] = React.useState<string[]>(standup?.attendees || []);
  function save() {
    if (!name.trim()) { alert("Meeting name required"); return; }
    onSave({ ...(standup || { id: `sd_${Date.now().toString(36)}`, meetLink: null, lastSyncedAt: null }), name: name.trim(), time, timezone: tz, cadence, attendees });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{standup ? "Edit standup" : "Add standup"}</DialogTitle><DialogDescription>Meeting metadata. Click Sync Meetings to create the Meet link.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Meeting name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Daily Ops Standup" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Timezone</Label>
              <Select value={tz} onValueChange={setTz}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="IST">IST</SelectItem><SelectItem value="GMT">GMT</SelectItem><SelectItem value="UTC">UTC</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Cadence</Label>
            <Select value={cadence} onValueChange={setCadence}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekdays">Weekdays</SelectItem><SelectItem value="Weekly:Mon">Weekly · Monday</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Attendees</Label>
            <div className="border rounded-md max-h-44 overflow-y-auto p-2 space-y-1.5">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={attendees.includes(u.id)} onCheckedChange={(c) => setAttendees((cur) => c ? [...cur, u.id] : cur.filter((x) => x !== u.id))} />
                  {u.name} <span className="text-muted-foreground text-xs">· {u.role || "no role"}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button>{standup && <Button variant="destructive" onClick={() => onDelete(standup.id)}>Delete</Button>}<Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
