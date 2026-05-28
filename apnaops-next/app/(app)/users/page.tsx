"use client";
import * as React from "react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Users, Eye, EyeOff } from "lucide-react";
import type { User, AccessLevel, GeoType } from "@/lib/types";

export default function UsersPage() {
  const users = useAppStore((s) => s.users);
  const roles = useAppStore((s) => s.roles);
  const upsertUser = useAppStore((s) => s.upsertUser);
  const toggleUserActive = useAppStore((s) => s.toggleUserActive);
  const issues = useAppStore((s) => s.issues);
  const me = useCurrentUser();
  function confirmToggleActive(id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    if (u.active) {
      const orphans = issues.filter((i) => i.owner === u.name && i.status !== "resolved" && i.status !== "rejected");
      const msg = `Set ${u.name} as inactive?\n\nThey'll no longer be able to log in.\n${orphans.length ? `${orphans.length} open issue${orphans.length === 1 ? "" : "s"} owned by them will be flagged for reassignment.` : "No open issues are owned by them."}`;
      if (!confirm(msg)) return;
    }
    toggleUserActive(id);
  }
  const isOwner = me?.accessLevel === "owner";
  const [showInactive, setShowInactive] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | "new" | null>(null);

  const list = showInactive ? users : users.filter((u) => u.active);
  const activeCount = users.filter((u) => u.active).length;
  const inactiveCount = users.length - activeCount;

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${activeCount} active${inactiveCount ? ` · ${inactiveCount} inactive` : ""} · each user gets a role + geo + password`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowInactive((v) => !v)}>{showInactive ? "Hide" : "Show"} inactive ({inactiveCount})</Button>
            <Button onClick={() => setOpenId("new")}>+ Add user</Button>
          </>
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" subtitle="Add your first user from the button above." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Area</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((u) => {
                const role = roles.find((r) => r.name === u.role);
                const metrics = role ? role.metrics.slice(0, 3).join(", ") + (role.metrics.length > 3 ? ` +${role.metrics.length - 3}` : "") : "—";
                const areaTxt = u.geoType === "Global" ? "Global" : u.geoType ? `${u.geoType} · ${u.geoName}` : "—";
                return (
                  <TableRow key={u.id} className={u.active ? "" : "opacity-55"}>
                    <TableCell><div className="font-semibold">{u.name}</div><div className="text-xs text-muted-foreground mt-0.5">{u.email}</div><div className="text-xs text-muted-foreground mt-0.5">{metrics}</div></TableCell>
                    <TableCell>{u.role || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{areaTxt}</TableCell>
                    <TableCell><Badge variant={u.active ? "success" : "muted"} className="text-[10px]">{u.active ? "active" : "inactive"}</Badge></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setOpenId(u.id)}>Edit</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      {openId && (
        <UserDialog
          user={openId === "new" ? null : users.find((u) => u.id === openId) || null}
          roles={roles}
          isOwnerEditor={!!isOwner}
          onClose={() => setOpenId(null)}
          onSave={(u) => { upsertUser(u); setOpenId(null); }}
          onToggleActive={(id) => { confirmToggleActive(id); setOpenId(null); }}
        />
      )}
    </>
  );
}

function UserDialog({ user, roles, isOwnerEditor, onClose, onSave, onToggleActive }: { user: User | null; roles: { name: string }[]; isOwnerEditor: boolean; onClose: () => void; onSave: (u: User) => void; onToggleActive: (id: string) => void }) {
  const isNew = !user;
  const [name, setName] = React.useState(user?.name || "");
  const [email, setEmail] = React.useState(user?.email || "");
  const [role, setRole] = React.useState(user?.role || "");
  const [accessLevel, setAccessLevel] = React.useState<AccessLevel>(user?.accessLevel || "operator");
  const [geoType, setGeoType] = React.useState<GeoType | "">(user?.geoType || "");
  const [geoName, setGeoName] = React.useState(user?.geoName || "");
  const [password, setPassword] = React.useState(user?.password || "");
  const [showPw, setShowPw] = React.useState(false);
  const visibleRoles = roles.filter((r) => isOwnerEditor || (r as { id?: string }).id !== "r-owner");

  function save() {
    if (!name.trim() || !email.trim()) { alert("Name and Email are required"); return; }
    const payload: User = {
      id: user?.id || `u_${Date.now().toString(36)}`,
      name: name.trim(), email: email.trim(), role, accessLevel,
      geoType: geoType as GeoType, geoName: geoName.trim(),
      password: password || user?.password,
      active: user?.active ?? true,
    };
    onSave(payload);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isNew ? "Add user" : "Edit user"}</DialogTitle><DialogDescription>Only Name and Email are required.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Role</Label>
          <Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue placeholder="(assign later)" /></SelectTrigger>
            <SelectContent>{visibleRoles.map((r) => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Access level</Label>
          <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as AccessLevel)}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="operator">operator</SelectItem><SelectItem value="admin">admin</SelectItem><SelectItem value="owner">owner</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Geo-type</Label>
            <Select value={geoType} onValueChange={(v) => setGeoType(v as GeoType)}><SelectTrigger><SelectValue placeholder="(assign later)" /></SelectTrigger>
              <SelectContent><SelectItem value="Global">Global</SelectItem><SelectItem value="State">State</SelectItem><SelectItem value="City">City</SelectItem><SelectItem value="Store">Store</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Geo name</Label><Input value={geoName} onChange={(e) => setGeoName(e.target.value)} placeholder={geoType === "Global" ? "Global" : "comma-separated"} disabled={geoType === "Global"} /></div>
        </div>
        {isOwnerEditor && (
          <div className="space-y-1.5"><Label>Password (owner-only)</Label>
            <div className="flex gap-2">
              <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={user?.password ? "(unchanged — type to update)" : "set on first login"} />
              {user?.password && <Button type="button" variant="outline" size="icon" onClick={() => setShowPw((v) => !v)}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>}
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {user && <Button variant="destructive" onClick={() => onToggleActive(user.id)}>{user.active ? "Set inactive" : "Reactivate"}</Button>}
          <Button onClick={save}>{isNew ? "Add user" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
