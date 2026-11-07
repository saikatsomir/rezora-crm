import { z } from "zod";
import { isDay } from "./dates";

export const PAYMENT_STATUSES = { PENDING: "Pending", PAID: "Paid", PARTIAL: "Partial", REFUNDED: "Refunded" } as const;
export type PaymentStatus = keyof typeof PAYMENT_STATUSES;
export const PAYMENT_METHODS = ["bKash", "Nagad", "Rocket", "Bank Transfer", "Cash", "Card", "Other"];
const nul = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v);
const text = (n: number) => z.preprocess(nul, z.string().trim().max(n).nullable());

export const paymentSchema = z.object({
  leadId: z.string().min(1, "Choose a client").max(40),
  amount: z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/[৳,\s]/g, "")) : v), z.number({ invalid_type_error: "Enter an amount" }).positive("Must be greater than 0").max(1_000_000_000).transform((n) => Math.round(n * 100) / 100)),
  paymentDate: z.string().refine(isDay, "Pick a valid date"),
  method: text(50), reference: text(100), notes: text(1000),
  status: z.enum(Object.keys(PAYMENT_STATUSES) as [PaymentStatus, ...PaymentStatus[]]),
});
export type PaymentDTO = { id: string; leadId: string; businessName: string; amount: number; paymentDate: string; method: string | null; reference: string | null; status: PaymentStatus; notes: string | null };
