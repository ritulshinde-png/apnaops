"use client";
import * as React from "react";
import { useAppStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Box, RefreshCw } from "lucide-react";
import type { Dimension, DimensionType } from "@/lib/types";

export default function DimensionsPage() {
  const dimensions = useAppStore((s) => s.dimensions);
  const metrics = useAppStore((s) => s.metrics);
  const upsertDimension = useAppStore((s) => s.upsertDimension);
  const deleteDimension = useAppStore((s) => s.deleteDimension);
  const crawlDimension = useAppStore((s) => s.crawlDimension);
  const crawlAllDimensions = useAppStore((s) => s.crawlAllDimensions);
  const [openId, setOpenId] = React.useState<string | "new" | null>(null);
  const [valuesOpen, setValuesOpen] = React.useState<string | null>(null);

  return (
    <>
      <PageHeader title="Dimensions" subtitle={`${dimensions.length} defined globally · the agent crawls source data and stores values per level`} actions={<><Button variant="outline" onClick={() => { if(confirm("Run the Dimension crawler agent across all dimensions?")) { crawlAllDimensions(); setTimeout(() => alert(`Crawl complete · ${dimensions.length} dimensions refreshed.`), 50); } }}><RefreshCw className="h-3.5 w-3.5" /> Crawl values</Button><Button onClick={() => setOpenId("new")}>+ Add dimension</Button></>} />
      {dimensions.length === 0 ? (
        <EmptyState icon={Box} title="No dimensions yet" subtitle="Add geo, time, or custom dimensions to slice metrics by." />
      ) : (
        <div className="space-y-3">
          {dimensions.map((d) => {
            const totalValues = Object.values(d.values || {}).reduce((a, v) => a + v.length, 0);
            return (
              <Card key={d.id} className="p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2"><h3 className="font-semibold text-base">{d.name}</h3><Badge variant="muted">{d.type}</Badge></div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {d.levels.length ? d.levels.map((l, i) => <React.Fragment key={l}><Badge variant="outline">{l}</Badge>{i < d.levels.length - 1 && <span className="text-muted-foreground">›</span>}</React.Fragment>) : <span className="text-sm italic text-muted-foreground">flat — no hierarchy</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2.5">{totalValues} crawled values across {d.levels.length || 1} level{d.levels.length === 1 ? "" : "s"} · last crawled {d.lastCrawled || "never"}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <Button size="sm" variant="outline" onClick={() => setValuesOpen(d.id)}>View values</Button>
                    <Button size="sm" variant="outline" onClick={() => { crawlDimension(d.id); setTimeout(() => alert(`Crawled ${d.name}.`), 50); }}><RefreshCw className="h-3 w-3" /> Re-crawl</Button>
                    <Button size="sm" variant="outline" onClick={() => setOpenId(d.id)}>Edit</Button>
                    <Button size="sm" variant="outline" className="hover:bg-destructive hover:text-destructive-foreground" onClick={() => {
                      const affected = metrics.filter((m) => m.dimensions.includes(d.id)).map((m) => m.name);
                      if (confirm(`Delete "${d.name}"?\n\n⚠️ This is global. Removing it will break ${affected.length ? affected.join(", ") : "any metric using it"}.`)) deleteDimension(d.id);
                    }}>Delete</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {openId && <DimensionDialog dim={openId === "new" ? null : dimensions.find((d) => d.id === openId) || null} onClose={() => setOpenId(null)} onSave={(d) => { upsertDimension(d); setOpenId(null); }} />}
      {valuesOpen && (() => {
        const d = dimensions.find((x) => x.id === valuesOpen)!;
        return (
          <Dialog open onOpenChange={() => setValuesOpen(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{d.name} · crawled values</DialogTitle><DialogDescription>Last crawled {d.lastCrawled || "never"}</DialogDescription></DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {d.levels.map((lvl) => (
                  <div key={lvl}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{lvl} <span className="text-muted-foreground font-normal">· {(d.values[lvl] || []).length} values</span></p>
                    <div className="flex flex-wrap gap-1.5">{(d.values[lvl] || []).map((v) => <Badge key={v} variant="outline">{v}</Badge>)}</div>
                  </div>
                ))}
              </div>
              <DialogFooter><Button onClick={() => setValuesOpen(null)}>Close</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </>
  );
}

function DimensionDialog({ dim, onClose, onSave }: { dim: Dimension | null; onClose: () => void; onSave: (d: Dimension) => void }) {
  const [name, setName] = React.useState(dim?.name || "");
  const [type, setType] = React.useState<DimensionType>(dim?.type || "custom");
  const [levels, setLevels] = React.useState((dim?.levels || []).join(", "));
  function save() {
    if (!name.trim()) { alert("Dimension name required"); return; }
    const lvls = levels.split(",").map((s) => s.trim()).filter(Boolean);
    onSave({ id: dim?.id || `d_${Date.now().toString(36)}`, name: name.trim(), type, levels: lvls, values: dim?.values || {}, lastCrawled: dim?.lastCrawled || null });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{dim ? "Edit dimension" : "Add dimension"}</DialogTitle><DialogDescription>Globally defined hierarchy for slicing metrics.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DimensionType)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="geo">geo</SelectItem><SelectItem value="time">time</SelectItem><SelectItem value="channel">channel</SelectItem><SelectItem value="project">project</SelectItem><SelectItem value="custom">custom</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Hierarchy levels (top → bottom, comma-separated)</Label><Input value={levels} onChange={(e) => setLevels(e.target.value)} placeholder="Global, State, City, Store" /></div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
