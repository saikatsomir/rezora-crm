import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { addDays, dhakaDate, dhakaDay, isDay } from "@/lib/dates";
import { revenueTotals } from "@/lib/revenue-server";
import { PAYMENT_METHODS, PAYMENT_STATUSES, type PaymentDTO } from "@/lib/payment-schema";
import type { SP } from "@/lib/lead-query";
import { PaymentsClient } from "@/components/payments/payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser(["SUPER_ADMIN"]);
  const sp = await searchParams;
  const g = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? ""; };
  const and: Prisma.PaymentWhereInput[] = [];
  const q = g("q").trim().slice(0, 100);
  if (q) and.push({ OR: [{ lead: { businessName: { contains: q, mode: "insensitive" } } }, { reference: { contains: q, mode: "insensitive" } }] });
  if (Object.prototype.hasOwnProperty.call(PAYMENT_STATUSES, g("status"))) and.push({ status: g("status") as keyof typeof PAYMENT_STATUSES });
  if (PAYMENT_METHODS.includes(g("method"))) and.push({ method: g("method") });
  if (isDay(g("from")) || isDay(g("to"))) and.push({ paymentDate: { gte: isDay(g("from")) ? dhakaDate(g("from")) : undefined, lt: isDay(g("to")) ? dhakaDate(addDays(g("to"), 1)) : undefined } });
  const where: Prisma.PaymentWhereInput = { AND: and };
  const per = 25, page = Math.max(1, Math.floor(Number(g("page"))) || 1);

  const [total, rows, leads, totals] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({ where, orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }], skip: (page - 1) * per, take: per, include: { lead: { select: { businessName: true } } } }),
    db.lead.findMany({ select: { id: true, businessName: true }, orderBy: { businessName: "asc" }, take: 3000 }),
    revenueTotals(),
  ]);
  const payments: PaymentDTO[] = rows.map((p) => ({ id: p.id, leadId: p.leadId, businessName: p.lead.businessName, amount: Number(p.amount), paymentDate: dhakaDay(p.paymentDate), method: p.method, reference: p.reference, status: p.status, notes: p.notes }));
  return <div className="mx-auto max-w-7xl"><PaymentsClient payments={payments} leads={leads} totals={totals} total={total} page={page} per={per} /></div>;
}
