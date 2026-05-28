import type { Standup } from "./types";

export type StandupStatus = { kind: "upcoming" | "live" | "over"; label: string };

export function getStandupStatus(s: Standup): StandupStatus {
  const now = new Date();
  const [h, m] = s.time.split(":").map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min standup
  if (now < start) {
    const mins = Math.floor((start.getTime() - now.getTime()) / 60000);
    const hrs = Math.floor(mins / 60);
    const r = mins % 60;
    const inText = hrs > 0 ? `in ${hrs}h ${r}m` : `in ${mins}m`;
    return { kind: "upcoming", label: `${s.time} ${s.timezone} · ${inText}` };
  }
  if (now < end) return { kind: "live", label: `${s.time} ${s.timezone} · live now` };
  return { kind: "over", label: `${s.time} ${s.timezone} · ended` };
}

export function isStandupToday(s: Standup): boolean {
  const today = new Date();
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][today.getDay()];
  const dow = today.getDay();
  const isWeekday = dow >= 1 && dow <= 5;
  if (s.cadence === "Daily") return true;
  if (s.cadence === "Weekdays") return isWeekday;
  if (s.cadence && s.cadence.startsWith("Weekly:")) return s.cadence.endsWith(":" + dayName);
  return false;
}
