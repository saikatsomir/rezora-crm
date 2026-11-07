"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { addDays, dhakaDate, dhakaDay } from "@/lib/dates";
import { fail, type Fail } from "@/lib/action-utils";
import { COLLECTED, bucketRevenue, rangeFor, type RevenueResult } from "@/lib/revenue";

const input = z.object({ preset: z.enum(["week", "month", "year", "custom"]), from: z.string().max(10).optional(), to: z.string().max(10).optional() });

export async function getRevenue(raw: unknown): Promise<({ ok: true } & RevenueResult) | Fail> {
  await requireUser(["SUPER_ADMIN"]);
  const p = input.safeParse(raw);
  if (!p.success) return fail("Invalid range.");
  const r = rangeFor(p.data.preset, dhakaDay(new Date()), p.data.from, p.data.to);
  if (!r) return fail("Choose a valid date range (up to 2 years).");
  const rows = await db.payment.findMany({
    where: { status: { in: [...COLLECTED] }, paymentDate: { gte: dhakaDate(r.from), lt: dhakaDate(addDays(r.to, 1)) } },
    select: { amount: true, paymentDate: true, lead: { select: { businessSize: true } } },
  });
  const flat = rows.map((x) => ({ date: dhakaDay(x.paymentDate), amount: Number(x.amount) }));
  const byClass: Record<string, number> = {};
  for (const x of rows) { const k = x.lead.businessSize ?? "UNCLASSIFIED"; byClass[k] = Math.round(((byClass[k] ?? 0) + Number(x.amount)) * 100) / 100; }
  return { ok: true, series: bucketRevenue(flat, r), total: Math.round(flat.reduce((a, b) => a + b.amount, 0) * 100) / 100, count: rows.length, byClass };
}
