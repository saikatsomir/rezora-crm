import { describe, it, expect } from "vitest";
import { rangeFor, bucketRevenue } from "@/lib/revenue";
import { addDays, dhakaDay, isDay } from "@/lib/dates";

describe("revenue ranges", () => {
  it("month / week (Sat–Fri) / year presets", () => {
    expect(rangeFor("month", "2026-11-04")).toEqual({ from: "2026-11-01", to: "2026-11-30", granularity: "day" });
    expect(rangeFor("week", "2026-11-04")).toEqual({ from: "2026-10-31", to: "2026-11-06", granularity: "day" });
    expect(rangeFor("year", "2026-11-04")).toEqual({ from: "2026-01-01", to: "2026-12-31", granularity: "month" });
  });
  it("validates custom ranges", () => {
    expect(rangeFor("custom", "2026-11-04", "2026-11-10", "2026-11-01")).toBeNull();
    expect(rangeFor("custom", "2026-11-04", "2020-01-01", "2026-11-01")).toBeNull();
    expect(rangeFor("custom", "2026-11-04", "2026-02-31", "2026-03-01")).toBeNull();
    expect(rangeFor("custom", "2026-11-04", "2026-01-01", "2026-03-15")?.granularity).toBe("month");
  });
});
describe("revenue bucketing", () => {
  it("sums per day and zero-fills", () => {
    const r = rangeFor("month", "2026-11-04")!;
    const out = bucketRevenue([{ date: "2026-11-02", amount: 100 }, { date: "2026-11-02", amount: 50.5 }, { date: "2026-11-30", amount: 10 }, { date: "2026-12-01", amount: 999 }], r);
    expect(out).toHaveLength(30);
    expect(out[1].revenue).toBe(150.5);
    expect(out.reduce((a, b) => a + b.revenue, 0)).toBe(160.5);
  });
  it("buckets by month for a year", () => { expect(bucketRevenue([], rangeFor("year", "2026-11-04")!)).toHaveLength(12); });
});
describe("Asia/Dhaka dates", () => {
  it("handles day boundaries and invalid days", () => {
    expect(dhakaDay(new Date("2026-11-03T20:00:00Z"))).toBe("2026-11-04");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(isDay("2026-02-31")).toBe(false);
    expect(isDay("2026-11-04")).toBe(true);
  });
});
