"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "./modal";
import { btn, btnPrimary } from "./ui";
import { createLead } from "@/app/(app)/leads/actions";
import { CATEGORY_LABELS, SIZE_LABELS, ADS_LABELS } from "@/lib/lead-schema";

type V = { businessName: string; facebookUrl: string; instagramUrl: string; phone: string; category: string; businessSize: string; email: string; called: boolean; runningAds: string; ownerNumber: string; servicePrice: string };

export function AddLeadDialog({ onClose, onCreated, defaultSize }: { onClose: () => void; onCreated: () => void; defaultSize?: string }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<V>({
    defaultValues: { businessName: "", facebookUrl: "", instagramUrl: "", phone: "", category: "OTHER", businessSize: defaultSize ?? "", email: "", called: false, runningAds: "UNKNOWN", ownerNumber: "", servicePrice: "" },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const r = await createLead(v);
    if (!r.ok) {
      setFormError(r.error);
      for (const [k, m] of Object.entries(r.fieldErrors ?? {})) setError(k as keyof V, { message: m });
      return;
    }
    onCreated();
  });
  const F = ({ name, label, children }: { name: keyof V; label: string; children: React.ReactNode }) => (
    <label className="block text-sm font-medium">{label}{children}{errors[name] && <span className="mt-1 block text-xs font-normal text-red-500">{errors[name]?.message}</span>}</label>
  );
  return (
    <Modal title="Add Lead" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><F name="businessName" label="Business Name *"><input className="input mt-1.5" {...register("businessName", { required: "Required" })} autoFocus /></F></div>
        <F name="facebookUrl" label="Facebook Page"><input className="input mt-1.5" placeholder="https://facebook.com/…" {...register("facebookUrl")} /></F>
        <F name="instagramUrl" label="Instagram Page"><input className="input mt-1.5" placeholder="https://instagram.com/…" {...register("instagramUrl")} /></F>
        <F name="phone" label="Phone Number"><input className="input mt-1.5" {...register("phone")} /></F>
        <F name="ownerNumber" label="Owner Number"><input className="input mt-1.5" {...register("ownerNumber")} /></F>
        <F name="email" label="Gmail"><input type="email" className="input mt-1.5" {...register("email")} /></F>
        <F name="servicePrice" label="Service Pricing (৳)"><input inputMode="decimal" className="input mt-1.5" {...register("servicePrice")} /></F>
        <F name="category" label="Category"><select className="input mt-1.5" {...register("category")}>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></F>
        <F name="businessSize" label="Business Size"><select className="input mt-1.5" {...register("businessSize")}><option value="">Not classified</option>{Object.entries(SIZE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></F>
        <F name="runningAds" label="Running Ads"><select className="input mt-1.5" {...register("runningAds")}>{Object.entries(ADS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></F>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" {...register("called")} /> Already called</label>
        {formError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 sm:col-span-2 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className={btn}>Cancel</button><button disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? "Saving…" : "Add Lead"}</button></div>
      </form>
    </Modal>
  );
}
