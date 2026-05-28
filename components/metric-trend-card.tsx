"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  generateTrend,
  computeStat,
  formatTickShort,
  formatHoverLabel,
  STAT_OPTIONS,
  type TimeRange,
  type Breakdown,
  type StatType,
  type CustomRange,
} from "@/lib/metric-trend";
import type { MetricDef } from "@/lib/metric-data";

interface Props {
  name: string;
  def: MetricDef;
  baseline: number;
  amp: number;
  range: TimeRange;
  breakdown: Breakdown;
  custom?: CustomRange | null;
}

export function MetricTrendCard({ name, def, baseline, amp, range, breakdown, custom }: Props) {
  const [statType, setStatType] = React.useState<StatType>("avg");
  const points = React.useMemo(
    () => generateTrend(name, range, breakdown, baseline, amp, custom),
    [name, range, breakdown, baseline, amp, custom]
  );
  const values = React.useMemo(() => points.map((p) => p.v), [points]);
  const statValue = computeStat(values, statType);

  return (
    <Card className="p-4 flex flex-col gap-3 min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">{name}</p>
      <TrendChart points={points} statValue={statValue} unit={def.unit} breakdown={breakdown} />
      <div className="flex items-center justify-between border-t -mx-4 px-3 pt-2 -mb-1">
        <Select value={statType} onValueChange={(v) => setStatType(v as StatType)}>
          <SelectTrigger
            className="h-7 text-xs font-medium text-foreground gap-1 border-0 shadow-none px-1.5 hover:bg-accent focus:ring-0 focus:ring-offset-0 w-auto [&>svg]:opacity-60"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {STAT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs font-medium text-foreground tabular-nums">
          {statValue.toFixed(1)}
          {def.unit}
        </span>
      </div>
    </Card>
  );
}

interface ChartProps {
  points: { t: number; v: number }[];
  statValue: number;
  unit: string;
  breakdown: Breakdown;
}

function TrendChart({ points, statValue, unit, breakdown }: ChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(260);
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const gradId = React.useId();

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = Math.max(80, Math.floor(entries[0].contentRect.width));
      setW(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 116;
  const padX = 24;
  const padTop = 16; // room for value labels above dots
  const padBottom = 18; // room for date labels below

  if (points.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-[116px] flex items-center justify-center text-[11px] text-muted-foreground">
        No data
      </div>
    );
  }

  const ys = points.map((p) => p.v);
  const yMin = Math.min(...ys, statValue);
  const yMax = Math.max(...ys, statValue);
  const yRange = yMax - yMin;
  const isFlat = yRange < 0.0001;
  const midY = padTop + (H - padTop - padBottom) / 2;

  const fx = (i: number) => {
    if (points.length === 1) return w / 2;
    return padX + (i / (points.length - 1)) * (w - 2 * padX);
  };
  const fy = (v: number) => {
    if (isFlat) return midY;
    return padTop + (1 - (v - yMin) / yRange) * (H - padTop - padBottom);
  };

  const linePath =
    points.length >= 2
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${fx(i).toFixed(2)} ${fy(p.v).toFixed(2)}`).join(" ")
      : "";
  const areaPath =
    points.length >= 2
      ? `${linePath} L ${fx(points.length - 1).toFixed(2)} ${H - padBottom} L ${fx(0).toFixed(2)} ${H - padBottom} Z`
      : "";

  // Tick density: estimate per-label width and drop to every-Nth as soon as
  // adjacent labels would visually overlap. ~5px per char for the 9px font + 4px buffer.
  const sampleLabel = points.length ? formatTickShort(points[0].t, breakdown) : "";
  const labelPx = Math.max(28, sampleLabel.length * 5.4 + 4);
  const gap = points.length > 1 ? (w - 2 * padX) / (points.length - 1) : Infinity;
  const step = gap >= labelPx ? 1 : Math.max(1, Math.ceil(labelPx / gap));
  const tickIndices = new Set<number>();
  tickIndices.add(0);
  if (points.length > 1) tickIndices.add(points.length - 1);
  for (let i = step; i < points.length - 1; i += step) tickIndices.add(i);

  const showValueLabels = points.length <= 15;
  const showDots = points.length <= 60;

  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div ref={containerRef} className="w-full relative">
      <svg width={w} height={H} className="block text-primary overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Stat reference line */}
        <line
          x1={padX}
          x2={w - padX}
          y1={fy(statValue)}
          y2={fy(statValue)}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.35"
        />

        {/* Date / hour ticks at the bottom */}
        {Array.from(tickIndices)
          .sort((a, b) => a - b)
          .map((i) => (
            <text
              key={`tick-${i}`}
              x={fx(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize="9"
              className="fill-muted-foreground"
            >
              {formatTickShort(points[i].t, breakdown)}
            </text>
          ))}

        {/* Value labels above each dot, with a card-colored halo so the trendline doesn't cross the text */}
        {showValueLabels &&
          points.map((p, i) => {
            const px = fx(i);
            const py = fy(p.v) - 8;
            return (
              <text
                key={`val-${i}`}
                x={px}
                y={py}
                textAnchor="middle"
                fontSize="9"
                paintOrder="stroke"
                stroke="var(--card)"
                strokeWidth="3"
                strokeLinejoin="round"
                className="fill-foreground"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {p.v.toFixed(1)}
              </text>
            );
          })}

        {/* Dots */}
        {showDots &&
          points.map((p, i) => (
            <circle
              key={`dot-${i}`}
              cx={fx(i)}
              cy={fy(p.v)}
              r={points.length <= 15 ? 3 : 2}
              fill="currentColor"
            />
          ))}

        {/* Larger transparent hit areas for hover */}
        {points.map((p, i) => (
          <circle
            key={`hit-${i}`}
            cx={fx(i)}
            cy={fy(p.v)}
            r="10"
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ cursor: "pointer" }}
          />
        ))}

        {/* Highlight ring on hovered dot */}
        {hoverPoint && (
          <circle
            cx={fx(hoverIdx!)}
            cy={fy(hoverPoint.v)}
            r="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.4"
            pointerEvents="none"
          />
        )}
      </svg>

      {/* Hover popup */}
      {hoverPoint && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-[10px] text-background shadow-md whitespace-nowrap"
          style={{ left: fx(hoverIdx!), top: fy(hoverPoint.v) - 8 }}
        >
          <div className="font-semibold tabular-nums">
            {hoverPoint.v.toFixed(2)}
            {unit}
          </div>
          <div className="opacity-80">{formatHoverLabel(hoverPoint.t, breakdown)}</div>
        </div>
      )}
    </div>
  );
}
