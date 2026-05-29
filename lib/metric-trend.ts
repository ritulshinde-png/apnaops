export type TimeRange = "today" | "yesterday" | "last7" | "last30" | "last90" | "custom";
export type Breakdown = "hourly" | "daily" | "weekly";
export type StatType = "avg" | "min" | "max" | "median" | "p75" | "p90" | "p95" | "p99";

export interface CustomRange {
  start: Date;
  end: Date;
}

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

export const BREAKDOWN_OPTIONS: { value: Breakdown; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const PRESET_ALLOWED: Record<Exclude<TimeRange, "custom">, Breakdown[]> = {
  today: ["hourly", "daily"],
  yesterday: ["hourly", "daily"],
  last7: ["hourly", "daily"],
  last30: ["daily", "weekly"],
  last90: ["daily", "weekly"],
};

export function getAllowedBreakdowns(range: TimeRange, custom?: CustomRange | null): Breakdown[] {
  if (range !== "custom") return PRESET_ALLOWED[range];
  if (!custom) return [];
  const days = Math.max(1, Math.ceil((custom.end.getTime() - custom.start.getTime()) / 86_400_000));
  const allowed: Breakdown[] = [];
  if (days <= 7) allowed.push("hourly");
  if (days <= 90) allowed.push("daily");
  if (days <= 365) allowed.push("weekly");
  return allowed;
}

export const STAT_OPTIONS: { value: StatType; label: string }[] = [
  { value: "avg", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "median", label: "Median" },
  { value: "p75", label: "p75" },
  { value: "p90", label: "p90" },
  { value: "p95", label: "p95" },
  { value: "p99", label: "p99" },
];

function seedRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rangeBounds(range: TimeRange, custom?: CustomRange | null): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case "today": {
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return { start: today, end };
    }
    case "yesterday": {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { start, end: today };
    }
    case "last7": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case "last30": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case "last90": {
      const start = new Date(today);
      start.setDate(start.getDate() - 89);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case "custom": {
      if (!custom) return { start: today, end: today };
      const start = new Date(custom.start.getFullYear(), custom.start.getMonth(), custom.start.getDate());
      const end = new Date(custom.end.getFullYear(), custom.end.getMonth(), custom.end.getDate());
      end.setDate(end.getDate() + 1); // make end exclusive
      return { start, end };
    }
  }
}

export function generateTrend(
  seed: string,
  range: TimeRange,
  breakdown: Breakdown,
  baseline: number,
  amp: number,
  custom?: CustomRange | null
): { t: number; v: number }[] {
  const { start, end } = rangeBounds(range, custom);
  const rng = seedRandom(`${seed}|${range}|${breakdown}|${start.getTime()}|${end.getTime()}`);
  const points: { t: number; v: number }[] = [];

  if (breakdown === "weekly") {
    const cursor = new Date(start);
    const dow = cursor.getDay(); // 0 Sun .. 6 Sat
    const daysToMonday = (1 - dow + 7) % 7;
    cursor.setDate(cursor.getDate() + daysToMonday);
    while (cursor < end) {
      const v = baseline + (rng() - 0.5) * 2 * amp;
      points.push({ t: cursor.getTime(), v: +v.toFixed(2) });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    const stepMs = breakdown === "hourly" ? 3600_000 : 86_400_000;
    const cursor = new Date(start);
    while (cursor < end) {
      const v = baseline + (rng() - 0.5) * 2 * amp;
      points.push({ t: cursor.getTime(), v: +v.toFixed(2) });
      cursor.setTime(cursor.getTime() + stepMs);
    }
  }
  return points;
}

export function computeStat(values: number[], stat: StatType): number {
  if (!values.length) return 0;
  if (stat === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  if (stat === "min") return Math.min(...values);
  if (stat === "max") return Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  if (stat === "median") {
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  }
  const pct = stat === "p75" ? 0.75 : stat === "p90" ? 0.9 : stat === "p95" ? 0.95 : 0.99;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(pct * sorted.length) - 1));
  return sorted[idx];
}

export function formatDateDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatTickShort(t: number, breakdown: Breakdown): string {
  const d = new Date(t);
  if (breakdown === "hourly") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "");
  }
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function formatHoverLabel(t: number, breakdown: Breakdown): string {
  const d = new Date(t);
  if (breakdown === "hourly") {
    return d.toLocaleString("en-US", { hour: "numeric", hour12: true, day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
