// Asia/Dhaka has no DST (fixed +06:00), so day strings <-> Dates are safe to convert this way.
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });
export const dhakaDay = (d: Date) => fmt.format(d); // "2026-11-04"
export const dhakaDate = (s: string) => new Date(`${s}T00:00:00+06:00`);
export const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && dhakaDay(dhakaDate(s)) === s;
export const addDays = (s: string, n: number) => dhakaDay(new Date(dhakaDate(s).getTime() + n * 86400000));
