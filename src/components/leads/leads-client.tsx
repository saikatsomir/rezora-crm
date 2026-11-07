"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Download, ExternalLink, Plus, StickyNote, Trash2, Upload, CalendarPlus } from "lucide-react";
import { EditableText, SelectCell } from "./editable";
import { AddLeadDialog } from "./add-lead-dialog";
import { ImportDialog } from "./import-dialog";
import { NotesDialog } from "./notes-dialog";
import { MeetingDialog } from "../meetings/meeting-dialog";
import { LeadFilters } from "./lead-filters";
import { useQs } from "./use-qs";
import { btn, btnPrimary } from "./ui";
import { bdt } from "@/lib/format";
import { updateLeadField, bulkUpdate, bulkDelete } from "@/app/(app)/leads/actions";
import { CATEGORY_LABELS, SIZE_LABELS, ADS_LABELS, type LeadField, type LeadRow, type Size } from "@/lib/lead-schema";

const COLS = [
  { key: "businessName", label: "Business Name", sort: "businessName" }, { key: "facebookUrl", label: "Facebook Page" }, { key: "instagramUrl", label: "Instagram Page" },
  { key: "phone", label: "Phone" }, { key: "category", label: "Category", sort: "category" }, { key: "businessSize", label: "Business Size", sort: "businessSize" },
  { key: "email", label: "Gmail" }, { key: "called", label: "Called", sort: "called" }, { key: "runningAds", label: "Running Ads", sort: "runningAds" },
  { key: "ownerNumber", label: "Owner Number" }, { key: "servicePrice", label: "Service Pricing", sort: "servicePrice" }, { key: "notes", label: "Notes" },
  { key: "meeting", label: "Meeting Time" }, { key: "createdAt", label: "Created", sort: "createdAt" },
];
const LS = "rezora.leads.hidden-columns";
const SIZE_OPTS: [string, string][] = [["", "—"], ...Object.entries(SIZE_LABELS)];

export function LeadsClient({ rows: initial, total, page, per, sort, dir, title = "Leads", fixedSize }: { rows: LeadRow[]; total: number; page: number; per: number; sort: string; dir: "asc" | "desc"; title?: string; fixedSize?: Size }) {
  const router = useRouter();
  const { sp, set } = useQs();
  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [modal, setModal] = useState<"add" | "import" | null>(null);
  const [notesFor, setNotesFor] = useState<LeadRow | null>(null);
  const [meetFor, setMeetFor] = useState<LeadRow | null>(null);
  const [toast, setToast] = useState<{ m: string; ok: boolean } | null>(null);
  useEffect(() => { try { setHidden(JSON.parse(localStorage.getItem(LS) ?? "[]")); } catch { /* ignore */ } }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);
  const notify = (m: string, ok = true) => setToast({ m, ok });
  const toggleCol = (k: string) => { const n = hidden.includes(k) ? hidden.filter((x) => x !== k) : [...hidden, k]; setHidden(n); try { localStorage.setItem(LS, JSON.stringify(n)); } catch { /* ignore */ } };
  const cols = COLS.filter((c) => !hidden.includes(c.key));
  const pages = Math.max(1, Math.ceil(total / per));

  async function save(id: string, field: LeadField, value: unknown) {
    const r = await updateLeadField(id, field, value);
    if (!r.ok) { notify(r.error, false); return r.error; }
    if (fixedSize && field === "businessSize" && r.value !== fixedSize) { setRows((rs) => rs.filter((x) => x.id !== id)); notify(`Moved to ${r.value ? SIZE_LABELS[r.value as Size] + " Clients" : "unclassified leads"}`); return null; }
    setRows((rs) => rs.map((x) => (x.id === id ? { ...x, [field]: r.value } : x)));
    notify("Saved");
    return null;
  }
  async function bulk(field: string, value: unknown) {
    const r = await bulkUpdate([...sel], field, value);
    if (!r.ok) return notify(r.error, false);
    notify(`Updated ${r.count} lead${r.count === 1 ? "" : "s"}`); setSel(new Set()); router.refresh();
  }
  async function del() {
    if (!confirm(`Delete ${sel.size} selected lead(s)? Notes and meetings are deleted too. This cannot be undone.`)) return;
    const r = await bulkDelete([...sel]);
    if (!r.ok) return notify(r.error, false);
    notify(`Deleted ${r.count}`); setSel(new Set()); router.refresh();
  }
  const exportHref = () => { const n = new URLSearchParams(sp.toString()); n.delete("page"); if (fixedSize) n.set("size", fixedSize); if (sel.size) n.set("ids", [...sel].join(",")); return `/api/leads/export?${n}`; };
  const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" }).format(new Date(iso));

  function cell(key: string, r: LeadRow) {
    const txt = (f: LeadField) => <EditableText value={((r as unknown as Record<string, unknown>)[f] as string | null) ?? ""} onSave={(v) => save(r.id, f, v)} />;
    const url = (f: "facebookUrl" | "instagramUrl") => { const v = r[f]; return (
      <EditableText value={v ?? ""} onSave={(x) => save(r.id, f, x)} display={v ? (
        <span className="flex items-center gap-2"><span className="max-w-[140px] truncate text-muted">{v.replace(/^https?:\/\/(www\.)?/, "")}</span>
          <a href={v} target="_blank" rel="noopener noreferrer" onDoubleClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"><ExternalLink size={12} />Open</a></span>) : undefined} />); };
    switch (key) {
      case "businessName": return <div className="font-medium">{txt("businessName")}</div>;
      case "facebookUrl": case "instagramUrl": return url(key);
      case "phone": case "email": case "ownerNumber": return txt(key);
      case "category": return <SelectCell value={r.category} options={Object.entries(CATEGORY_LABELS)} onChange={(v) => save(r.id, "category", v)} />;
      case "businessSize": return <SelectCell value={r.businessSize ?? ""} options={SIZE_OPTS} onChange={(v) => save(r.id, "businessSize", v)} />;
      case "called": return <SelectCell value={r.called ? "1" : "0"} options={[["1", "Called"], ["0", "Not Called"]]} onChange={(v) => save(r.id, "called", v === "1")} />;
      case "runningAds": return <SelectCell value={r.runningAds} options={Object.entries(ADS_LABELS)} onChange={(v) => save(r.id, "runningAds", v)} />;
      case "servicePrice": return <EditableText value={r.servicePrice == null ? "" : String(r.servicePrice)} display={r.servicePrice == null ? undefined : bdt(r.servicePrice)} onSave={(v) => save(r.id, "servicePrice", v)} />;
      case "notes": return <button onClick={() => setNotesFor(r)} className="relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted hover:bg-elev hover:text-fg"><StickyNote size={15} />{r.notesCount}{r.notesDue && <span title="Reminder due" className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />}</button>;
      case "meeting": return <span className="flex items-center gap-2"><span className={r.nextMeeting ? "whitespace-nowrap" : "text-muted"}>{r.nextMeeting ?? "—"}</span><button title="Schedule meeting" aria-label="Schedule meeting" onClick={() => setMeetFor(r)} className="text-muted hover:text-primary"><CalendarPlus size={15} /></button></span>;
      case "createdAt": return <span className="whitespace-nowrap text-muted">{fmtDate(r.createdAt)}</span>;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="text-sm text-muted">{total.toLocaleString()} lead{total === 1 ? "" : "s"} · double-click a cell to edit</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative"><summary className={`${btn} cursor-pointer list-none`}><Columns3 size={15} />Columns</summary>
            <div className="absolute right-0 z-30 mt-1 w-52 space-y-1 rounded-xl border border-line bg-card p-2 shadow-xl">
              {COLS.slice(1).map((c) => <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-elev"><input type="checkbox" className="accent-[var(--primary)]" checked={!hidden.includes(c.key)} onChange={() => toggleCol(c.key)} />{c.label}</label>)}
            </div></details>
          <button className={btn} onClick={() => setModal("import")}><Upload size={15} />Import</button>
          <a className={btn} href={exportHref()}><Download size={15} />Export CSV{sel.size ? ` (${sel.size})` : ""}</a>
          <button className={btnPrimary} onClick={() => setModal("add")}><Plus size={15} />Add Lead</button>
        </div>
      </div>
      <LeadFilters hideSize={!!fixedSize} />
      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <b>{sel.size} selected</b>
          <select aria-label="Set classification" className="input !w-auto !py-1" value="" onChange={(e) => e.target.value && bulk("businessSize", e.target.value)}><option value="">Set size…</option>{Object.entries(SIZE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select aria-label="Set called" className="input !w-auto !py-1" value="" onChange={(e) => e.target.value && bulk("called", e.target.value === "1")}><option value="">Set called…</option><option value="1">Called</option><option value="0">Not Called</option></select>
          <select aria-label="Set ads" className="input !w-auto !py-1" value="" onChange={(e) => e.target.value && bulk("runningAds", e.target.value)}><option value="">Set ads…</option>{Object.entries(ADS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button onClick={del} className="ml-auto inline-flex items-center gap-1 text-red-500 hover:underline"><Trash2 size={14} />Delete</button>
          <button onClick={() => setSel(new Set())} className="text-muted hover:text-fg">Clear</button>
        </div>)}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-elev text-xs uppercase tracking-wide text-muted"><tr>
            <th className="w-10 px-3 py-3"><input type="checkbox" aria-label="Select all" className="accent-[var(--primary)]" checked={rows.length > 0 && rows.every((r) => sel.has(r.id))} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
            {cols.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-3 py-3 font-medium">
                {c.sort ? <button onClick={() => set({ sort: c.sort!, dir: sort === c.sort && dir === "asc" ? "desc" : "asc" })} className="inline-flex items-center gap-1 uppercase hover:text-fg">{c.label}{sort === c.sort ? (dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}</button> : c.label}
              </th>))}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setActive(r.id)} className={`transition ${active === r.id ? "bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-elev/60"}`}>
                <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${r.businessName}`} className="accent-[var(--primary)]" checked={sel.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} /></td>
                {cols.map((c) => <td key={c.key} className="px-3 py-2 align-middle">{cell(c.key, r)}</td>)}
              </tr>))}
            {rows.length === 0 && <tr><td colSpan={cols.length + 1} className="px-4 py-14 text-center text-muted">No leads match. Add one or import a file.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <label className="flex items-center gap-2">Rows<select className="input !w-auto !py-1" value={per} onChange={(e) => set({ per: e.target.value })}>{[25, 50, 100].map((n) => <option key={n}>{n}</option>)}</select></label>
        <div className="flex items-center gap-2"><button className={btn} disabled={page <= 1} onClick={() => set({ page: String(page - 1) })} aria-label="Previous page"><ChevronLeft size={15} /></button>
          <span>Page {Math.min(page, pages)} of {pages}</span>
          <button className={btn} disabled={page >= pages} onClick={() => set({ page: String(page + 1) })} aria-label="Next page"><ChevronRight size={15} /></button></div>
      </div>
      {modal === "add" && <AddLeadDialog defaultSize={fixedSize} onClose={() => setModal(null)} onCreated={() => { setModal(null); notify("Lead added"); router.refresh(); }} />}
      {modal === "import" && <ImportDialog onClose={() => setModal(null)} onDone={() => router.refresh()} />}
      {meetFor && <MeetingDialog lead={{ id: meetFor.id, name: meetFor.businessName }} onClose={() => setMeetFor(null)} onSaved={() => { setMeetFor(null); notify("Meeting scheduled"); router.refresh(); }} />}
      {notesFor && <NotesDialog lead={notesFor} onClose={() => setNotesFor(null)} onChanged={() => router.refresh()} />}
      {toast && <div role="status" className={`fixed bottom-5 right-5 z-[60] rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>{toast.m}</div>}
    </div>
  );
}
