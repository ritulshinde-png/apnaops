"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { METRIC_KEYS } from "@/lib/metric-data";
import { MetricTrendCard } from "@/components/metric-trend-card";
import type { TimeRange, Breakdown } from "@/lib/metric-trend";

interface Props { metricKey: string; locId: string; open: boolean; onClose: () => void; }

// Trend chart for a dashboard cell. The body is a `MetricTrendCard` — the exact
// component the homepage uses — so the look, hover popups, stat picker, tick
// formatting, dot/value rendering, and breakdown semantics all match.
export function TrendModal({ metricKey, locId, open, onClose }: Props) {
  const data = useAppStore((s) => s.data);
  const locations = useAppStore((s) => s.locations);
  const filters = useAppStore((s) => s.dashFilters);
  const def = METRIC_KEYS.find((m) => m.key === metricKey);
  const loc = locations[locId];
  // Use the same baseline derivation pattern as the homepage: the cell's current
  // value, with a fallback default for surge/picker-drop style metrics.
  const cell = data[locId]?.[metricKey];
  const baseline = cell ? cell[0] : (metricKey === "surge" || metricKey === "pickerDrop" ? 10 : 95);
  const amp = Math.max(0.5, Math.abs(baseline) * 0.04);
  const customRange = filters.customRange
    ? { start: new Date(filters.customRange.startIso), end: new Date(filters.customRange.endIso) }
    : null;

  if (!def) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{def.label} · {loc?.name}</DialogTitle>
        </DialogHeader>
        <MetricTrendCard
          name={def.label}
          def={def}
          baseline={baseline}
          amp={amp}
          range={filters.dateRange as TimeRange}
          breakdown={filters.breakdown as Breakdown}
          custom={filters.dateRange === "custom" ? customRange : null}
          hideName
        />
      </DialogContent>
    </Dialog>
  );
}
