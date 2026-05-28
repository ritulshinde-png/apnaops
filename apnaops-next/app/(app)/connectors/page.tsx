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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { Plug } from "lucide-react";
import type { Connector } from "@/lib/types";

const CONNECTOR_TYPES = [
  { id: "postgres", label: "PostgreSQL", fields: ["host", "port", "database", "user"], secretLabel: "Password" },
  { id: "bigquery", label: "Google BigQuery", fields: ["project", "dataset"], secretLabel: "Service account JSON" },
  { id: "snowflake", label: "Snowflake", fields: ["account", "warehouse", "database", "user"], secretLabel: "Password" },
  { id: "mysql", label: "MySQL", fields: ["host", "port", "database", "user"], secretLabel: "Password" },
  { id: "mongodb", label: "MongoDB", fields: ["host", "port", "database", "user"], secretLabel: "Password" },
  { id: "rest-api", label: "REST API", fields: ["baseUrl", "authHeader"], secretLabel: "API key / Bearer token" },
  { id: "google-sheets", label: "Google Sheets", fields: ["sheetUrl"], secretLabel: "Service account JSON" },
  { id: "csv-upload", label: "CSV upload", fields: ["uploadPath"], secretLabel: null },
  { id: "mcp", label: "MCP server", fields: ["serverSlug"], secretLabel: "OAuth token (optional)" },
] as const;

export default function ConnectorsPage() {
  const connectors = useAppStore((s) => s.connectors);
  const upsertConnector = useAppStore((s) => s.upsertConnector);
  const toggleConnectorActive = useAppStore((s) => s.toggleConnectorActive);
  const testConnector = useAppStore((s) => s.testConnector);
  const me = useCurrentUser();
  const isAdmin = me?.accessLevel === "owner" || me?.accessLevel === "admin";
  const [openId, setOpenId] = React.useState<string | "new" | null>(null);

  return (
    <>
      <PageHeader title="Connectors" subtitle={`${connectors.length} connector${connectors.length === 1 ? "" : "s"} · data sources the platform pulls from. Credentials encrypted server-side.`} actions={isAdmin ? <Button onClick={() => setOpenId("new")}>+ Add connector</Button> : undefined} />
      {connectors.length === 0 ? (
        <EmptyState icon={Plug} title="No connectors yet" subtitle="Add a Postgres / BigQuery / Sheets / REST / MCP source." action={isAdmin ? <Button onClick={() => setOpenId("new")}>+ Add your first connector</Button> : undefined} />
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Last tested</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>{connectors.map((c) => {
              const def = CONNECTOR_TYPES.find((t) => t.id === c.type);
              return (
                <TableRow key={c.id}>
                  <TableCell><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground mt-0.5">{c.active ? "active" : "inactive"}</div></TableCell>
                  <TableCell><Badge variant="outline">{def?.label || c.type}</Badge></TableCell>
                  <TableCell><Badge variant={c.status === "connected" ? "success" : c.status === "failed" ? "p0" : "muted"} className="text-[10px]">{c.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.lastTestedAt || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col gap-1.5 ml-auto items-stretch min-w-[100px]">
                      <Button size="sm" variant="outline" onClick={() => testConnector(c.id)}>Test</Button>
                      {isAdmin && <Button size="sm" variant="outline" onClick={() => setOpenId(c.id)}>Edit</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </Card>
      )}

      <Card className="p-4 mt-5 border-l-4 border-l-primary text-sm text-muted-foreground">
        <p><strong className="text-foreground">How it works.</strong> A Connector describes <i>where</i> the data lives + <i>how</i> to authenticate. The Connector/DB agent picks the right adapter for the <strong>type</strong> and auto-builds queries from the base tables you give each metric. Credentials are stored encrypted in a secrets vault keyed by <code className="font-mono text-xs">secret_ref</code>.</p>
      </Card>

      {openId && <ConnectorDialog c={openId === "new" ? null : connectors.find((c) => c.id === openId) || null} onClose={() => setOpenId(null)} onSave={(c, alsoTest) => { upsertConnector(c); if(alsoTest) testConnector(c.id); setOpenId(null); }} onToggleActive={(id) => { toggleConnectorActive(id); setOpenId(null); }} />}
    </>
  );
}

function ConnectorDialog({ c, onClose, onSave, onToggleActive }: { c: Connector | null; onClose: () => void; onSave: (c: Connector, alsoTest?: boolean) => void; onToggleActive: (id: string) => void }) {
  const [name, setName] = React.useState(c?.name || "");
  const [type, setType] = React.useState(c?.type || "postgres");
  const [cfg, setCfg] = React.useState<Record<string, string>>(c?.config || {});
  const [secret, setSecret] = React.useState("");
  const def = CONNECTOR_TYPES.find((t) => t.id === type)!;
  function save(alsoTest = false) {
    if (!name.trim()) { alert("Name required"); return; }
    const payload: Connector = {
      id: c?.id || `c_${Date.now().toString(36)}`,
      name: name.trim(), type, config: cfg, status: c?.status || "untested", lastTestedAt: c?.lastTestedAt || null, active: c?.active ?? true,
      secretRef: secret ? `vault://apnaops/${type}/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${Date.now().toString(36)}` : c?.secretRef,
    };
    onSave(payload, alsoTest);
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{c ? "Edit connector" : "New connector"}</DialogTitle><DialogDescription>Define type, config, and secret. Secret is stored encrypted; only the reference is kept in metadata.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prod Mirror PG" /></div>
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={type} onValueChange={(v) => { setType(v); setCfg({}); }}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONNECTOR_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Config</p>
            <div className="space-y-2">{def.fields.map((f) => (
              <div key={f} className="space-y-1.5"><Label>{f}</Label><Input value={cfg[f] || ""} onChange={(e) => setCfg({ ...cfg, [f]: e.target.value })} placeholder={f} /></div>
            ))}</div>
          </div>
          {def.secretLabel && (
            <div className="space-y-1.5"><Label>{def.secretLabel}</Label>
              <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={c?.secretRef ? "(unchanged — type to rotate)" : "paste value"} />
              <p className="text-xs text-muted-foreground">Encrypted server-side. Only a <code className="font-mono">secret_ref</code> is stored in metadata.</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button>{c && <Button variant="destructive" onClick={() => onToggleActive(c.id)}>{c.active ? "Set inactive" : "Reactivate"}</Button>}<Button variant="outline" onClick={() => save(true)}>Save &amp; Test</Button><Button onClick={() => save(false)}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
