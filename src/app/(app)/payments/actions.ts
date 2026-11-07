"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { dhakaDate } from "@/lib/dates";
import { fail, firstErrors, type Fail } from "@/lib/action-utils";
import { paymentSchema, PAYMENT_STATUSES } from "@/lib/payment-schema";

const admin = () => requireUser(["SUPER_ADMIN"]);
const refresh = () => { revalidatePath("/payments"); revalidatePath("/overview"); };

export async function savePayment(id: string | null, input: unknown): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const p = paymentSchema.safeParse(input);
  if (!p.success) return fail("Please fix the highlighted fields.", firstErrors(p.error));
  if (!(await db.lead.findUnique({ where: { id: p.data.leadId }, select: { id: true } }))) return fail("Client not found.");
  const { paymentDate, ...rest } = p.data;
  const data = { ...rest, paymentDate: dhakaDate(paymentDate) };
  try {
    if (id) {
      await db.$transaction([db.payment.update({ where: { id }, data }), db.auditLog.create({ data: { userId: u.id, action: "PAYMENT_UPDATE", entity: "Payment", entityId: id } })]);
    } else {
      await db.$transaction(async (tx) => {
        const c = await tx.payment.create({ data });
        await tx.leadActivity.create({ data: { leadId: rest.leadId, userId: u.id, type: "PAYMENT", summary: `Payment recorded (${PAYMENT_STATUSES[rest.status]})` } });
        await tx.auditLog.create({ data: { userId: u.id, action: "PAYMENT_CREATE", entity: "Payment", entityId: c.id } });
      });
    }
  } catch { return fail("Could not save payment."); }
  refresh();
  return { ok: true };
}

export async function setPaymentStatus(id: string, status: string): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const s = z.enum(Object.keys(PAYMENT_STATUSES) as [keyof typeof PAYMENT_STATUSES, ...(keyof typeof PAYMENT_STATUSES)[]]).safeParse(status);
  if (!s.success) return fail("Invalid status.");
  await db.$transaction([db.payment.update({ where: { id: String(id) }, data: { status: s.data } }), db.auditLog.create({ data: { userId: u.id, action: "PAYMENT_STATUS", entity: "Payment", entityId: String(id), meta: { status: s.data } } })]);
  refresh();
  return { ok: true };
}

export async function deletePayment(id: string): Promise<{ ok: true } | Fail> {
  const u = await admin();
  await db.$transaction([db.payment.delete({ where: { id: String(id) } }), db.auditLog.create({ data: { userId: u.id, action: "PAYMENT_DELETE", entity: "Payment", entityId: String(id) } })]);
  refresh();
  return { ok: true };
}
