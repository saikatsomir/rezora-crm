"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { Modal } from "@/components/leads/modal";
import { btn, btnPrimary } from "@/components/leads/ui";
import { createModerator, updateModerator, setModeratorActive } from "@/app/(app)/moderators/actions";

export type Mod = { id: string; name: string; email: string; isActive: boolean; createdAt: string; lastLoginAt: string | null };
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "Never");
const gen = () => { const a = new Uint32Array(14); crypto.getRandomValues(a); const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from(a, (x) => c[x % c.length]).join("") + "7a"; };

export function ModeratorsClient({ mods }: { mods: Mod[] }) {
  const router = useRouter();
  const [dlg, setDlg] = useState<{ mod?: Mod } | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function toggle(m: Mod) {
    if (m.isActive && !confirm(`Disable ${m.name}? They will lose access immediately.`)) return;
    const r = await setModeratorActive(m.id, !m.isActive);
    if (!r.ok) setError(r.error); else { setError(null); router.refresh(); }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Moderators</h1><p className="text-sm text-muted">Moderators can only view the Leads page (7 fields, read-only)</p></div>
        <button className={btnPrimary} onClick={() => setDlg({})}><Plus size={15} />Add Moderator</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-line bg-elev text-xs uppercase tracking-wide text-muted"><tr>{["Name", "Email", "Status", "Created", "Last login", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {mods.map((m) => (
              <tr key={m.id} className="hover:bg-elev/60">
                <td className="px-4 py-3 font-medium">{m.name}</td><td className="px-4 py-3">{m.email}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>{m.isActive ? "Active" : "Disabled"}</span></td>
                <td className="px-4 py-3 text-muted">{fmt(m.createdAt)}</td><td className="px-4 py-3 text-muted">{fmt(m.lastLoginAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button className="mr-3 text-muted hover:text-primary" aria-label="Edit moderator" onClick={() => setDlg({ mod: m })}><Pencil size={15} /></button>
                  <button className={`inline-flex items-center gap-1 text-xs font-medium ${m.isActive ? "text-red-500" : "text-emerald-600"} hover:underline`} onClick={() => toggle(m)}>{m.isActive ? <><UserX size={14} />Disable</> : <><UserCheck size={14} />Reactivate</>}</button>
                </td>
              </tr>))}
            {mods.length === 0 && <tr><td colSpan={6} className="px-4 py-14 text-center text-muted">No moderators yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {dlg && <ModDialog mod={dlg.mod} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); router.refresh(); }} />}
    </div>
  );
}

function ModDialog({ mod, onClose, onSaved }: { mod?: Mod; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ name: mod?.name ?? "", email: mod?.email ?? "", password: "" });
  const [errs, setErrs] = useState<Record<string, string>>({}), [formError, setFormError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErrs({}); setFormError(null);
    const r = mod ? await updateModerator(mod.id, v) : await createModerator(v);
    setBusy(false);
    if (!r.ok) { setErrs(r.fieldErrors ?? {}); setFormError(r.error); return; }
    onSaved();
  }
  const row = (k: "name" | "email" | "password", label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm font-medium">{label}<input className="input mt-1.5" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...props} />{errs[k] && <span className="mt-1 block text-xs font-normal text-red-500">{errs[k]}</span>}</label>
  );
  return (
    <Modal title={mod ? "Edit Moderator" : "Add Moderator"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {row("name", "Name", { autoFocus: true })}
        {row("email", "Email", { type: "email", autoComplete: "off" })}
        {row("password", mod ? "New password (leave blank to keep)" : "Temporary password", { type: "text", autoComplete: "new-password", placeholder: "Min 10 characters, letters + numbers" })}
        <button type="button" onClick={() => setV({ ...v, password: gen() })} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><KeyRound size={13} />Generate strong password</button>
        {formError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={btn}>Cancel</button><button disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </Modal>
  );
}
