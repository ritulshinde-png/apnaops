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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { BarChart3 } from "lucide-react";
import type { Metric, Threshold, ThresholdTier, ThresholdOperator } from "@/lib/types";

export default function MetricsPage() {
  const metrics = useAppStore((s) => s.metrics);
  const roles = useAppStore((s) => s.roles);
  const connectors = useAppStore((s) => s.connectors);
  const dimensions = useAppStore((s) => s.dimensions);
  const thresholds = useAppStore((s) => s.thresholds);
  const upsertMetric = useAppStore((s) => s.upsertMetric);
  const toggleMetricActive = useAppStore((s) => s.toggleMetricActive);
  const upsertThreshold = useAppStore((s) => s.upsertThreshold);
  const deleteThreshold = useAppStore((s) => s.deleteThreshold);
  const [openId, setOpenId] = React.useState<string | "new" | null>(null);
  const [thresholdId, setThresholdId] = React.useState<string | "new" | null>(null);
  const [showInactive, setShowInactive] = React.useState(false);

  const list = showInactive ? metrics : metrics.filter((m) => m.active);
  const inactiveCount = metrics.filter((m) => !m.active).length;
  const thresholdsByMetric: Record<string, typeof thresholds> = {};
  thresholds.forEach((t) => { (thresholdsByMetric[t.metric] = thresholdsByMetric[t.metric] || []).push(t); });

  return (
    <>
      <PageHeader title="Metrics Catalog" subtitle={`${list.length} active${inactiveCount ? ` · ${inactiveCount} inactive` : ""} · canonical metric definitions`} actions={<><Button variant="outline" onClick={() => setShowInactive((v) => !v)}>{showInactive ? "Hide" : "Show"} inactive ({inactiveCount})</Button><Button onClick={() => setOpenId("new")}>+ New metric</Button></>} />
      {list.length === 0 ? (
        <EmptyState icon={BarChart3} title="No metrics defined yet" subtitle="Add a metric to start measuring something." />
      ) : (
        <Card className="p-0 overflow-hidden mb-8">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Metric</TableHead><TableHead>Data source</TableHead><TableHead>Granularity</TableHead><TableHead>Owner role(s)</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>{list.map((m) => (
              <TableRow key={m.id} className={m.active ? "" : "opacity-55"}>
                <TableCell><div className="font-semibold">{m.name}</div><div className="text-xs text-muted-foreground mt-0.5">refresh · {m.refreshInterval}</div></TableCell>
                <TableCell><span className="text-muted-foreground text-sm">{m.dataSource}</span></TableCell>
                <TableCell className="text-sm">{m.stdGran}</TableCell>
                <TableCell className="text-xs">{m.ownerRoles.length ? m.ownerRoles.join(", ") : "—"}</TableCell>
                <TableCell><Badge variant={m.active ? "success" : "muted"} className="text-[10px]">{m.active ? "active" : "inactive"}</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setOpenId(m.id)}>Edit</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      )}

      <div className="flex items-end justify-between mb-3">
        <div><h2 className="text-lg font-semibold tracking-tight">Thresholds</h2><p className="text-sm text-muted-foreground mt-1">Per metric, with scope overrides.</p></div>
        <Button onClick={() => setThresholdId("new")}>+ New threshold</Button>
      </div>
      {Object.keys(thresholdsByMetric).length === 0 ? (
        <p className="text-sm text-muted-foreground">No thresholds yet.</p>
      ) : Object.entries(thresholdsByMetric).map(([metric, ts]) => (
        <Card key={metric} className="p-4 mb-3">
          <p className="font-semibold mb-2">{metric}</p>
          <Table>
            <TableHeader><TableRow><TableHead>Scope</TableHead><TableHead>Tier</TableHead><TableHead>Condition</TableHead><TableHead>Updated</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{ts.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.scopeType === "Global" ? "Global (default)" : `${t.scopeType} · ${t.scopeName}`}</TableCell>
                <TableCell><Badge variant={t.tier === "P0" ? "p0" : t.tier === "P1" ? "p1" : "muted"}>{t.tier}</Badge></TableCell>
                <TableCell>{t.operator === "between" ? `${t.value} – ${t.value2}` : `${t.operator} ${t.value}`}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.updatedAt} · {t.updatedBy}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setThresholdId(t.id)}>Edit</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      ))}

      {openId && <MetricDialog metric={openId === "new" ? null : metrics.find((m) => m.id === openId) || null} roles={roles} connectors={connectors} dimensions={dimensions} onClose={() => setOpenId(null)} onSave={(m) => { upsertMetric(m); setOpenId(null); }} onToggleActive={(id) => { toggleMetricActive(id); setOpenId(null); }} />}
      {thresholdId && <ThresholdDialog threshold={thresholdId === "new" ? null : thresholds.find((t) => t.id === thresholdId) || null} metrics={metrics} onClose={() => setThresholdId(null)} onSave={(t) => { upsertThreshold(t); setThresholdId(null); }} onDelete={(id) => { if (confirm("Delete this threshold?")) { deleteThreshold(id); setThresholdId(null); } }} />}
    </>
  );
}

function MetricDialog({ metric, roles, connectors, dimensions, onClose, onSave, onToggleActive }: { metric: Metric | null; roles: { name: string }[]; connectors: { name: string; active: boolean }[]; dimensions: { id: string; name: string }[]; onClose: () => void; onSave: (m: Metric) => void; onToggleActive: (id: string) => void }) {
  const [name, setName] = React.useState(metric?.name || "");
  const [dataSource, setDataSource] = React.useState(metric?.dataSource || "Mirror PG");
  const [baseTables, setBaseTables] = React.useState(metric?.baseTables || "");
  const [stdGran, setStdGran] = React.useState(metric?.stdGran || "Store × Day");
  const [refreshInterval, setRefreshInterval] = React.useState(metric?.refreshInterval || "1h");
  const [queryTemplate, setQueryTemplate] = React.useState(metric?.queryTemplate || "");
  const [ownerRoles, setOwnerRoles] = React.useState<string[]>(metric?.ownerRoles || []);
  const [selectedDims, setSelectedDims] = React.useState<string[]>(metric?.dimensions || ["geo", "time"]);
  function save() {
    if (!name.trim()) { alert("Metric name required"); return; }
    onSave({ id: metric?.id || `m_${Date.now().toString(36)}`, name: name.trim(), dataSource, baseTables, queryTemplate, stdGran, refreshInterval, ownerRoles, dimensions: selectedDims, active: metric?.active ?? true });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{metric ? "Edit metric" : "New metric"}</DialogTitle><DialogDescription>Define what the system computes and how often.</DialogDescription></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1.5"><Label>Metric name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Data source</Label>
              <Select value={dataSource} onValueChange={setDataSource}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{connectors.filter((c) => c.active).map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Refresh interval</Label>
              <Select value={refreshInterval} onValueChange={setRefreshInterval}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="5m">every 5 min</SelectItem><SelectItem value="15m">every 15 min</SelectItem><SelectItem value="1h">every 1 h</SelectItem><SelectItem value="6h">every 6 h</SelectItem><SelectItem value="daily">daily</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Base tables</Label><Input value={baseTables} onChange={(e) => setBaseTables(e.target.value)} placeholder="orders, order_items" /></div>
          <div className="space-y-1.5"><Label>Granularity</Label><Input value={stdGran} onChange={(e) => setStdGran(e.target.value)} placeholder="Store × Day" /></div>
          <div className="space-y-1.5"><Label>Query template (optional · agent auto-builds if blank)</Label><Textarea rows={3} value={queryTemplate} onChange={(e) => setQueryTemplate(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Owner roles</Label>
              <div className="border rounded-md max-h-32 overflow-y-auto p-2 space-y-1">
                {roles.map((r) => <label key={r.name} className="flex items-center gap-2 text-sm"><Checkbox checked={ownerRoles.includes(r.name)} onCheckedChange={(c) => setOwnerRoles((cur) => c ? [...cur, r.name] : cur.filter((x) => x !== r.name))} />{r.name}</label>)}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Dimensions</Label>
              <div className="border rounded-md max-h-32 overflow-y-auto p-2 space-y-1">
                {dimensions.map((d) => <label key={d.id} className="flex items-center gap-2 text-sm"><Checkbox checked={selectedDims.includes(d.id)} onCheckedChange={(c) => setSelectedDims((cur) => c ? [...cur, d.id] : cur.filter((x) => x !== d.id))} />{d.name}</label>)}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button>{metric && <Button variant="destructive" onClick={() => onToggleActive(metric.id)}>{metric.active ? "Set inactive" : "Reactivate"}</Button>}<Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThresholdDialog({ threshold, metrics, onClose, onSave, onDelete }: { threshold: Threshold | null; metrics: { name: string; active: boolean }[]; onClose: () => void; onSave: (t: Threshold) => void; onDelete: (id: string) => void }) {
  const [metric, setMetric] = React.useState(threshold?.metric || metrics[0]?.name || "");
  const [tier, setTier] = React.useState<ThresholdTier>(threshold?.tier || "P0");
  const [customTier, setCustomTier] = React.useState(threshold?.customTier || "");
  const [operator, setOperator] = React.useState<ThresholdOperator>(threshold?.operator || "lt");
  const [value, setValue] = React.useState(threshold?.value?.toString() || "");
  const [value2, setValue2] = React.useState(threshold?.value2?.toString() || "");
  const [scopeType, setScopeType] = React.useState<"Global" | "State" | "City" | "Store">(threshold?.scopeType || "Global");
  const [scopeName, setScopeName] = React.useState(threshold?.scopeName || "");
  function save() {
    const v = parseFloat(value);
    if (!metric || isNaN(v)) { alert("Metric and value are required."); return; }
    const payload: Threshold = {
      id: threshold?.id || `t_${Date.now().toString(36)}`,
      metric, tier, operator, value: v,
      ...(operator === "between" ? { value2: parseFloat(value2) || 0 } : {}),
      ...(tier === "Other" ? { customTier } : {}),
      scopeType, ...(scopeType !== "Global" ? { scopeName: scopeName.trim() } : {}),
      updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      updatedBy: "you",
    };
    onSave(payload);
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{threshold ? "Edit threshold" : "New threshold"}</DialogTitle><DialogDescription>Define when a metric breaches into a tier, optionally for a specific scope.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Metric *</Label>
            <Select value={metric} onValueChange={setMetric}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{metrics.filter((m) => m.active).map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as ThresholdTier)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="P0">P0</SelectItem><SelectItem value="P1">P1</SelectItem><SelectItem value="Other">Custom</SelectItem></SelectContent>
              </Select>
            </div>
            {tier === "Other" && <div className="space-y-1.5"><Label>Custom tier name</Label><Input value={customTier} onChange={(e) => setCustomTier(e.target.value)} /></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Operator</Label>
              <Select value={operator} onValueChange={(v) => setOperator(v as ThresholdOperator)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">&gt; greater than</SelectItem>
                  <SelectItem value="lt">&lt; lower than</SelectItem>
                  <SelectItem value="gte">≥ greater than or equal</SelectItem>
                  <SelectItem value="lte">≤ lower than or equal</SelectItem>
                  <SelectItem value="eq">= equal</SelectItem>
                  <SelectItem value="between">between</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Value *</Label><Input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} /></div>
            {operator === "between" && <div className="space-y-1.5"><Label>Upper bound</Label><Input type="number" step="any" value={value2} onChange={(e) => setValue2(e.target.value)} /></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Scope type</Label>
              <Select value={scopeType} onValueChange={(v) => setScopeType(v as typeof scopeType)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Global">Global</SelectItem><SelectItem value="State">State</SelectItem><SelectItem value="City">City</SelectItem><SelectItem value="Store">Store</SelectItem></SelectContent>
              </Select>
            </div>
            {scopeType !== "Global" && <div className="space-y-1.5"><Label>Scope name</Label><Input value={scopeName} onChange={(e) => setScopeName(e.target.value)} placeholder={scopeType === "Store" ? "280" : "Ranchi"} /></div>}
          </div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button>{threshold && <Button variant="destructive" onClick={() => onDelete(threshold.id)}>Delete</Button>}<Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
