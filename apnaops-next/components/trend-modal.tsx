"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { METRIC_KEYS } from "@/lib/metric-data";

interface Props { metricKey: string; locId: string; open: boolean; onClose: () => void; }

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; }
function mulberry32(a: number) { return function () { a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function TrendModal({ metricKey, locId, open, onClose }: Props) {
  const data = useAppStore((s) => s.data);
  const locations = useAppStore((s) => s.locations);
  const filters = useAppStore((s) => s.dashFilters);
  const def = METRIC_KEYS.find((m) => m.key === metricKey);
  const loc = locations[locId];
  const baseVal = data[locId]?.[metricKey]?.[0] ?? data.global?.[metricKey]?.[0] ?? 0;
  // Generate fake trend points deterministically
  const counts: Record<string, Record<string, number>> = {
    today: { hourly: 24, daily: 1, weekly: 1, monthly: 1 },
    yesterday: { hourly: 24, daily: 1, weekly: 1, monthly: 1 },
    "7d": { hourly: 168, daily: 7, weekly: 1, monthly: 1 },
    "30d": { hourly: 720, daily: 30, weekly: 4, monthly: 1 },
  };
  const count = counts[filters.dateRange]?.[filters.breakdown] || 7;
  const rng = mulberry32(hash(locId + metricKey + filters.breakdown));
  const swing = (def?.isHigherBetter ? 6 : 8) * 0.5;
  const values: number[] = [];
  for (let i = 0; i < Math.min(count, 30); i++) {
    values.push(+(baseVal + (rng() - 0.5) * swing).toFixed(1));
  }
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const avg = values.length ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0;
  const cur = values.length ? values[values.length - 1] : 0;
  // SVG sparkline
  const W = 640, H = 180, P = 24;
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = P + (i / Math.max(values.length - 1, 1)) * (W - 2 * P);
    const y = H - P - ((v - min) / span) * (H - 2 * P);
    return [x, y] as const;
  });
  const path = points.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const areaPath = path + ` L ${points[points.length - 1][0]} ${H - P} L ${points[0][0]} ${H - P} Z`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{def?.label} · {loc?.name}</DialogTitle>
          <DialogDescription>{loc?.type} · {filters.dateRange} · {filters.breakdown}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <Badge variant="muted">Points · {values.length}</Badge>
          <Badge variant="muted">Range · {filters.dateRange}</Badge>
          <Badge variant="muted">Breakdown · {filters.breakdown}</Badge>
        </div>
        <div className="rounded-md border bg-card p-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.6217 0.1799 287.7754)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="oklch(0.6217 0.1799 287.7754)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#trendFill)" />
            <path d={path} fill="none" stroke="oklch(0.6217 0.1799 287.7754)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r="2.5" fill="oklch(0.6217 0.1799 287.7754)" />
                {(i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)) && (
                  <text x={p[0]} y={p[1] - 8} fontSize="10" textAnchor="middle" className="fill-muted-foreground" fontFamily="var(--font-mono)">{values[i]}{def?.unit}</text>
                )}
              </g>
            ))}
          </svg>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[{ l: "Current", v: cur }, { l: "Min", v: min }, { l: "Max", v: max }, { l: "Average", v: avg }].map((s) => (
            <div key={s.l} className="rounded-md bg-muted px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.l}</div>
              <div className="text-lg font-semibold mt-0.5 tabular-nums">{s.v}{def?.unit}</div>
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
