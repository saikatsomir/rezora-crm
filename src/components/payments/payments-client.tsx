"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PaymentDialog } from "./payment-dialog";
import { useQs } from "@/components/leads/use-qs";
import { btn, btnPrimary, cellSelect } from "@/components/leads/ui";
import { setPaymentStatus, deletePayment } from "@/app/(app)/payments/actions";
import { bdt } from "@/lib/format";
import { PAYMENT_METHODS, PAYMENT_STATUSES, type PaymentDTO } from "@/lib/payment-schema";
import { SIZE_LABELS, type Size } from "@/lib/lead-schema";

const tone: Record<string, string> = { PAID: "text-emerald-600 dark:text-emerald-400", PENDING: "text-amber-600 dark:text-amber-400", PARTIAL: "text-primary", REFUNDED: "text-muted" };
type Totals = { month: number; year: number; total: number; pending: number; refunded: number; byClass: Record<string, number> };

export function PaymentsClient({ payments, leads, totals, total, page, per }: { payments: PaymentDTO[]; leads: { id: string; businessName: string }[]; totals: Totals; total: number; page: number; per: number }) {
  const router = useRouter();
  const { sp, set } = useQs();
  const [edit, setEdit] = useState<{ payment?: PaymentDTO } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const pages = Math.max(1, Math.ceil(total / per));
  const cards: [string, number, boolean?][] = [["Collected This Month", totals.month], ["Collected This Year", totals.year], ["Total Collected", totals.total], ["Pending Payments", totals.pending], ["Refunded", totals.refunded]];

  async function status(p: PaymentDTO, s: string) { const r = await setPaymentStatus(p.id, s); if (!r.ok) setError(r.error); else { setError(null); router.refresh(); } }
  async function remove(p: PaymentDTO) { if (!confirm(`Delete this ${bdt(p.amount)} payment from ${p.businessName}?`)) return; const r = await deletePayment(p.id); if (!r.ok) setError(r.error); else router.refresh(); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Payments</h1><p className="text-sm text-muted">Revenue is calculated from recorded payments only</p></div>
        <button className={btnPrimary} onClick={() => setEdit({})}><Plus size={15} />Record Payment</button>
      </div>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">{cards.map(([t, v]) => <div key={t} className="card p-4"><p className="text-xs text-muted">{t}</p><p className="mt-1 text-lg font-semibold text-primary">{bdt(v)}</p></div>)}</section>
      <div className="card flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-sm"><span className="text-xs font-medium uppercase tracking-wide text-muted">Revenue by classification</span>
        {Object.keys(totals.byClass).length === 0 ? <span className="text-muted">No collected payments yet</span> : Object.entries(totals.byClass).map(([k, v]) => <span key={k}>{SIZE_LABELS[k as Size] ?? "Unclassified"} <b>{bdt(v)}</b></span>)}</div>
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={(e) => { e.preventDefault(); set({ q }); }} className="relative"><Search size={16} className="absolute left-3 top-2.5 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client or reference…" aria-label="Search payments" className="input !w-64 !pl-9" /></form>
        <select aria-label="Status" className="input !w-auto !py-1.5" value={sp.get("status") ?? ""} onChange={(e) => set({ status: e.target.value })}><option value="">All statuses</option>{Object.entries(PAYMENT_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select aria-label="Method" className="input !w-auto !py-1.5" value={sp.get("method") ?? ""} onChange={(e) => set({ method: e.target.value })}><option value="">All methods</option>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
        <label className="flex items-center gap-1.5 text-xs text-muted">From<input type="date" className="input !w-auto !py-1" value={sp.get("from") ?? ""} onChange={(e) => set({ from: e.target.value })} />to<input type="date" className="input !w-auto !py-1" value={sp.get("to") ?? ""} onChange={(e) => set({ to: e.target.value })} /></label>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-elev text-xs uppercase tracking-wide text-muted"><tr>{["Date", "Client", "Amount", "Method", "Reference", "Status", "Notes", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-elev/60">
                <td className="whitespace-nowrap px-3 py-2.5">{p.paymentDate}</td><td className="px-3 py-2.5 font-medium">{p.businessName}</td><td className="px-3 py-2.5 font-semibold">{bdt(p.amount)}</td>
                <td className="px-3 py-2.5">{p.method ?? "—"}</td><td className="px-3 py-2.5 text-muted">{p.reference ?? "—"}</td>
                <td className="px-3 py-2.5"><select aria-label="Status" className={`${cellSelect} font-medium ${tone[p.status]}`} value={p.status} onChange={(e) => status(p, e.target.value)}>{Object.entries(PAYMENT_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                <td className="max-w-[220px] truncate px-3 py-2.5 text-xs text-muted" title={p.notes ?? ""}>{p.notes ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right"><button aria-label="Edit payment" className="mr-2 text-muted hover:text-primary" onClick={() => setEdit({ payment: p })}><Pencil size={15} /></button><button aria-label="Delete payment" className="text-muted hover:text-red-500" onClick={() => remove(p)}><Trash2 size={15} /></button></td>
              </tr>))}
            {payments.length === 0 && <tr><td colSpan={8} className="px-4 py-14 text-center text-muted">No payments recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 text-sm text-muted"><button className={btn} disabled={page <= 1} aria-label="Previous page" onClick={() => set({ page: String(page - 1) })}><ChevronLeft size={15} /></button>Page {Math.min(page, pages)} of {pages}<button className={btn} disabled={page >= pages} aria-label="Next page" onClick={() => set({ page: String(page + 1) })}><ChevronRight size={15} /></button></div>
      {edit && <PaymentDialog payment={edit.payment} leads={leads} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} />}
    </div>
  );
}
