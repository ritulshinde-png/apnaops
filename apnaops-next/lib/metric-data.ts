import { SEED_LOCATIONS } from "./seed-data";

// Deterministic store metric generator (mirrors the prototype's mulberry32-based approach)
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; }
function mulberry32(a: number) { return function () { a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export type Cell = [number, "up" | "down" | null, number];
export type MetricRow = Record<string, Cell>;

function generateStoreMetrics(locId: string): MetricRow {
  const rng = mulberry32(hash(locId));
  const fillRate = +(98 + (rng() - 0.4) * 3).toFixed(1);
  const serv = +(94.5 + (rng() - 0.4) * 4).toFixed(1);
  const surge = +(11 + (rng() - 0.4) * 6).toFixed(1);
  const riderAvail = Math.round(83 + (rng() - 0.4) * 10);
  const pickerDrop = +(3 + (rng() - 0.3) * 3.5).toFixed(1);
  const t = (r: () => number): "up" | "down" | null => (r() < 0.3 ? "down" : r() < 0.55 ? "up" : null);
  const d = (r: () => number, s = 1) => +((r() - 0.5) * 2 * s).toFixed(1);
  return {
    fillRate: [fillRate, t(rng), d(rng, 1.5)],
    serv: [serv, t(rng), d(rng, 1.5)],
    surge: [surge, t(rng), d(rng, 2)],
    riderAvail: [riderAvail, t(rng), Math.round(d(rng, 1) * 3)],
    pickerDrop: [pickerDrop, t(rng), d(rng, 1.5)],
  };
}

function aggregate(arr: MetricRow[]): MetricRow {
  const result: MetricRow = {} as MetricRow;
  (["fillRate", "serv", "surge", "riderAvail", "pickerDrop"] as const).forEach((k) => {
    const vals = arr.map((d) => d[k]?.[0]).filter((v): v is number => typeof v === "number" && !isNaN(v));
    const deltas = arr.map((d) => d[k]?.[2] || 0);
    const trends = arr.map((d) => d[k]?.[1]);
    const avg = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
    const avgDelta = deltas.length ? +(deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1) : 0;
    const downC = trends.filter((x) => x === "down").length;
    const upC = trends.filter((x) => x === "up").length;
    result[k] = [avg, downC > upC ? "down" : upC > downC ? "up" : null, avgDelta];
  });
  return result;
}

export function buildMetricData(): Record<string, MetricRow> {
  const data: Record<string, MetricRow> = {};
  Object.keys(SEED_LOCATIONS).forEach((locId) => {
    if (SEED_LOCATIONS[locId].type === "Store") data[locId] = generateStoreMetrics(locId);
  });
  // Issue-aligned overrides
  data["st_280"] = { fillRate: [94.2, "down", -3.6], serv: [93.5, "down", -2.3], surge: [15.8, "down", 3.2], riderAvail: [78, "up", 2], pickerDrop: [6.2, "down", 2.1] };
  data["st_465"] = { fillRate: [97.0, null, -0.5], serv: [95.3, "down", -1.4], surge: [16.1, "down", 3.5], riderAvail: [76, "up", 1], pickerDrop: [3.8, null, 0.3] };
  data["st_270"] = { fillRate: [96.5, "down", -1.2], serv: [93.0, "down", -1.8], surge: [15.0, null, 0.5], riderAvail: [80, null, 0], pickerDrop: [7.2, "down", 2.3] };
  data["st_274"] = { fillRate: [98.6, "down", -0.6], serv: [93.9, null, -0.3], surge: [14.2, null, 1.0], riderAvail: [81, "up", 2], pickerDrop: [4.1, null, 0.2] };
  data["st_311"] = { fillRate: [97.1, null, -0.4], serv: [93.0, "down", -1.5], surge: [13.5, null, 0.6], riderAvail: [80, null, 0], pickerDrop: [3.5, null, 0.1] };
  data["st_396"] = { fillRate: [99.1, "up", 1.0], serv: [95.0, "up", 0.4], surge: [10.2, "up", -1.0], riderAvail: [85, "up", 3], pickerDrop: [2.6, "up", -0.6] };
  data["st_290"] = { fillRate: [97.3, null, -0.3], serv: [93.6, "down", -0.8], surge: [17.2, "down", 2.4], riderAvail: [79, null, 1], pickerDrop: [3.4, null, 0.1] };
  // Aggregate City -> State -> Global
  (["City", "State", "Global"] as const).forEach((type) => {
    Object.keys(SEED_LOCATIONS).forEach((locId) => {
      const loc = SEED_LOCATIONS[locId];
      if (loc.type === type) data[locId] = aggregate(loc.children.map((c) => data[c]).filter(Boolean));
    });
  });
  return data;
}

// Threshold helpers for cell coloring
export const METRIC_KEYS = [
  { key: "fillRate", label: "Fill Rate", unit: "%", good: (v: number) => v >= 99, watch: (v: number) => v >= 98, p1: (v: number) => v >= 96, isHigherBetter: true, ownerName: "Fill Rate" },
  { key: "serv", label: "Serv %", unit: "%", good: (v: number) => v >= 96, watch: (v: number) => v >= 94, p1: (v: number) => v >= 92, isHigherBetter: true, ownerName: "Serv %" },
  { key: "surge", label: "Surge %", unit: "%", good: (v: number) => v <= 10, watch: (v: number) => v <= 15, p1: (v: number) => v <= 18, isHigherBetter: false, ownerName: "Surge %" },
  { key: "riderAvail", label: "Rider Avail", unit: "%", good: (v: number) => v >= 85, watch: (v: number) => v >= 80, p1: (v: number) => v >= 75, isHigherBetter: true, ownerName: "Rider Avail" },
  { key: "pickerDrop", label: "Picker Drop", unit: "%", good: (v: number) => v <= 3, watch: (v: number) => v <= 5, p1: (v: number) => v <= 7, isHigherBetter: false, ownerName: "Picker Drop" },
] as const;

export type MetricDef = (typeof METRIC_KEYS)[number];
export function cellClass(def: MetricDef, v: number) {
  if (def.good(v)) return "cell-good";
  if (def.watch(v)) return "cell-watch";
  if (def.p1(v)) return "cell-p1";
  return "cell-p0";
}
