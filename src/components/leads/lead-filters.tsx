"use client";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useQs } from "./use-qs";
import { CATEGORY_LABELS, SIZE_LABELS, ADS_LABELS } from "@/lib/lead-schema";

const KEYS = ["q", "category", "size", "called", "ads", "from", "to", "mfrom", "mto"];
const Sel = ({ k, label, opts }: { k: string; label: string; opts: [string, string][] }) => {
  const { sp, set } = useQs();
  return <select aria-label={label} value={sp.get(k) ?? ""} onChange={(e) => set({ [k]: e.target.value })} className="input !w-auto !py-1.5"><option value="">{label}</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
};
const Dt = ({ k, label }: { k: string; label: string }) => {
  const { sp, set } = useQs();
  return <label className="flex items-center gap-1.5 text-xs text-muted">{label}<input type="date" value={sp.get(k) ?? ""} onChange={(e) => set({ [k]: e.target.value })} className="input !w-auto !py-1" /></label>;
};

export function LeadFilters({ hideSize }: { hideSize?: boolean }) {
  const { sp, set } = useQs();
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => { const t = setTimeout(() => { if (q !== (sp.get("q") ?? "")) set({ q }); }, 350); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q]);
  useEffect(() => { setQ(sp.get("q") ?? ""); }, [sp]);
  const active = KEYS.filter((k) => sp.get(k)).length;
  return (
    <div className="space-y-3">
      <div className="relative max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, Gmail, Facebook, Instagram…" className="input !pl-9" aria-label="Search leads" /></div>
      <div className="flex flex-wrap items-center gap-2">
        <Sel k="category" label="All categories" opts={Object.entries(CATEGORY_LABELS)} />
        {!hideSize && <Sel k="size" label="All sizes" opts={Object.entries(SIZE_LABELS)} />}
        <Sel k="called" label="Called: any" opts={[["yes", "Called"], ["no", "Not Called"]]} />
        <Sel k="ads" label="Ads: any" opts={Object.entries(ADS_LABELS)} />
        <Dt k="from" label="Created from" /><Dt k="to" label="to" /><Dt k="mfrom" label="Meeting from" /><Dt k="mto" label="to" />
        {active > 0 && <button onClick={() => set(Object.fromEntries(KEYS.map((k) => [k, null])))} className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><X size={14} />Clear ({active})</button>}
      </div>
    </div>
  );
}
