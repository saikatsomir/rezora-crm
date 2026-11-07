"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/leads/modal";
import { btn, btnPrimary } from "@/components/leads/ui";
import { savePayment } from "@/app/(app)/payments/actions";
import { PAYMENT_METHODS, PAYMENT_STATUSES, type PaymentDTO } from "@/lib/payment-schema";

type V = { leadId: string; amount: string; paymentDate: string; method: string; reference: string; status: string; notes: string };
const field = (label: string, err: string | undefined, node: React.ReactNode) => <label className="block text-sm font-medium">{label}{node}{err && <span className="mt-1 block text-xs font-normal text-red-500">{err}</span>}</label>;

export function PaymentDialog({ payment, leads, onClose, onSaved }: { payment?: PaymentDTO; leads: { id: string; businessName: string }[]; onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<V>({
    defaultValues: { leadId: payment?.leadId ?? "", amount: payment ? String(payment.amount) : "", paymentDate: payment?.paymentDate ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()), method: payment?.method ?? "bKash", reference: payment?.reference ?? "", status: payment?.status ?? "PAID", notes: payment?.notes ?? "" },
  });
  const [formError, setFormError] = useState<string | null>(null), [q, setQ] = useState("");
  const options = leads.filter((l) => l.businessName.toLowerCase().includes(q.toLowerCase())).slice(0, 300);
  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const r = await savePayment(payment?.id ?? null, v);
    if (!r.ok) { setFormError(r.error); for (const [k, m] of Object.entries(r.fieldErrors ?? {})) setError(k as keyof V, { message: m }); return; }
    onSaved();
  });
  return (
    <Modal title={payment ? "Edit Payment" : "Record Payment"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          {payment ? <p className="text-sm">Client: <b>{payment.businessName}</b><input type="hidden" {...register("leadId")} /></p> : <>
            <input className="input" placeholder="Filter clients…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter clients" />
            {field("Client", errors.leadId?.message, <select className="input mt-1.5" {...register("leadId")}><option value="">Select client…</option>{options.map((l) => <option key={l.id} value={l.id}>{l.businessName}</option>)}</select>)}</>}
        </div>
        {field("Amount (৳)", errors.amount?.message, <input inputMode="decimal" className="input mt-1.5" {...register("amount")} />)}
        {field("Payment date", errors.paymentDate?.message, <input type="date" className="input mt-1.5" {...register("paymentDate")} />)}
        {field("Method", errors.method?.message, <input list="pay-methods" className="input mt-1.5" {...register("method")} />)}
        <datalist id="pay-methods">{PAYMENT_METHODS.map((m) => <option key={m} value={m} />)}</datalist>
        {field("Status", errors.status?.message, <select className="input mt-1.5" {...register("status")}>{Object.entries(PAYMENT_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>)}
        <div className="sm:col-span-2">{field("Transaction reference", errors.reference?.message, <input className="input mt-1.5" {...register("reference")} />)}</div>
        <div className="sm:col-span-2">{field("Notes", errors.notes?.message, <textarea rows={2} className="input mt-1.5" {...register("notes")} />)}</div>
        {formError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 sm:col-span-2 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className={btn}>Cancel</button><button disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? "Saving…" : "Save payment"}</button></div>
      </form>
    </Modal>
  );
}
