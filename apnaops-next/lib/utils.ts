import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function nowTs() {
  return new Date().toISOString().replace("T", " ").slice(0, 16);
}
export function tsMinus(days: number, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - (days || 0));
  d.setHours(d.getHours() - (hours || 0));
  return d.toISOString().replace("T", " ").slice(0, 16);
}
export function daysBetween(tsStr: string) {
  const t = new Date(tsStr.replace(" ", "T"));
  return Math.max(0, Math.floor((Date.now() - t.getTime()) / (24 * 3600 * 1000)));
}
