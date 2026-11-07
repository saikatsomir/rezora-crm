"use client";
import { useState } from "react";
import { btnPrimary } from "@/components/leads/ui";
import { changePassword } from "@/app/(app)/settings/actions";

export function PasswordForm() {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errs, setErrs] = useState<Record<string, string>>({}), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErrs({}); setMsg(null);
    const r = await changePassword(v);
    setBusy(false);
    if (r.ok) { setV({ current: "", next: "", confirm: "" }); setMsg({ ok: true, t: "Password updated." }); } else { setErrs(r.fieldErrors ?? {}); setMsg({ ok: false, t: r.error }); }
  }
  const f = (k: "current" | "next" | "confirm", label: string, ac: string) => (
    <label className="block text-sm font-medium">{label}<input type="password" autoComplete={ac} className="input mt-1.5" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} required />{errs[k] && <span className="mt-1 block text-xs font-normal text-red-500">{errs[k]}</span>}</label>
  );
  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      {f("current", "Current password", "current-password")}{f("next", "New password", "new-password")}{f("confirm", "Confirm new password", "new-password")}
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{msg.t}</p>}
      <button disabled={busy} className={btnPrimary}>{busy ? "Updating…" : "Update password"}</button>
    </form>
  );
}
