import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { COLLECTED } from "./revenue";
import { dhakaDate, dhakaDay } from "./dates";

const sum = async (where: Prisma.PaymentWhereInput) => Number((await db.payment.aggregate({ _sum: { amount: true }, where }))._sum.amount ?? 0);

/** All figures come from recorded payments — never from service pricing. */
export async function revenueTotals() {
  const today = dhakaDay(new Date());
  const col: Prisma.PaymentWhereInput = { status: { in: [...COLLECTED] } };
  const [month, year, total, pending, refunded, rows] = await Promise.all([
    sum({ ...col, paymentDate: { gte: dhakaDate(today.slice(0, 8) + "01") } }),
    sum({ ...col, paymentDate: { gte: dhakaDate(today.slice(0, 4) + "-01-01") } }),
    sum(col), sum({ status: "PENDING" }), sum({ status: "REFUNDED" }),
    db.payment.findMany({ where: col, select: { amount: true, lead: { select: { businessSize: true } } } }),
  ]);
  const byClass: Record<string, number> = {};
  for (const r of rows) { const k = r.lead.businessSize ?? "UNCLASSIFIED"; byClass[k] = Math.round(((byClass[k] ?? 0) + Number(r.amount)) * 100) / 100; }
  return { month, year, total, pending, refunded, byClass };
}
