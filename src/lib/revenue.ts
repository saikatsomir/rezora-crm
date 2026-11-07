import { eachDayOfInterval, eachMonthOfInterval, endOfMonth, endOfWeek, endOfYear, format, parseISO, startOfMonth, startOfWeek, startOfYear, differenceInCalendarDays } from "date-fns";
import { isDay } from "./dates";

/** Money actually received. PARTIAL rows record the amount received so far. PENDING is owed; REFUNDED is excluded from revenue. */
export const COLLECTED = ["PAID", "PARTIAL"] as const;
export type Preset = "week" | "month" | "year" | "custom";
export type Range = { from: string; to: string; granularity: "day" | "month" };
export type RevenueResult = { series: { key: string; label: string; revenue: number }[]; total: number; count: number; byClass: Record<string, number> };

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export function rangeFor(preset: Preset, today: string, from?: string, to?: string): Range | null {
  const t = parseISO(today);
  if (preset === "week") { const o = { weekStartsOn: 6 as const }; return { from: ymd(startOfWeek(t, o)), to: ymd(endOfWeek(t, o)), granularity: "day" }; }
  if (preset === "month") return { from: ymd(startOfMonth(t)), to: ymd(endOfMonth(t)), granularity: "day" };
  if (preset === "year") return { from: ymd(startOfYear(t)), to: ymd(endOfYear(t)), granularity: "month" };
  if (!isDay(from) || !isDay(to) || from > to) return null;
  const days = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  if (days > 731) return null;
  return { from, to, granularity: days <= 62 ? "day" : "month" };
}

export function bucketRevenue(rows: { date: string; amount: number }[], r: Range) {
  const day = r.granularity === "day";
  const keys = day
    ? eachDayOfInterval({ start: parseISO(r.from), end: parseISO(r.to) }).map(ymd)
    : eachMonthOfInterval({ start: parseISO(r.from), end: parseISO(r.to) }).map((d) => format(d, "yyyy-MM"));
  const m = new Map(keys.map((k) => [k, 0] as [string, number]));
  for (const x of rows) { const k = day ? x.date : x.date.slice(0, 7); if (m.has(k)) m.set(k, (m.get(k) ?? 0) + x.amount); }
  return keys.map((k) => ({ key: k, label: day ? format(parseISO(k), "d MMM") : format(parseISO(k + "-01"), "MMM yy"), revenue: Math.round((m.get(k) ?? 0) * 100) / 100 }));
}
