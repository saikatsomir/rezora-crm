"use client";
import { useEffect, useState } from "react";
import { Trash2, Bell } from "lucide-react";
import { Modal } from "./modal";
import { btnPrimary } from "./ui";
import { listNotes, addNote, toggleNote, deleteNote } from "@/app/(app)/leads/actions";
import type { NoteDTO } from "@/lib/lead-schema";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export function NotesDialog({ lead, onClose, onChanged }: { lead: { id: string; businessName: string }; onClose: () => void; onChanged: () => void }) {
  const [notes, setNotes] = useState<NoteDTO[] | null>(null);
  const [content, setContent] = useState(""), [date, setDate] = useState(""), [time, setTime] = useState("");
  const [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const load = async () => { const r = await listNotes(lead.id); if (r.ok) setNotes(r.notes); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function add() {
    setBusy(true); setErr(null);
    const r = await addNote({ leadId: lead.id, content, reminderDate: date, reminderTime: time });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setContent(""); setDate(""); setTime(""); await load(); onChanged();
  }
  return (
    <Modal title={`Notes — ${lead.businessName}`} onClose={onClose}>
      <div className="space-y-3">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} maxLength={2000} placeholder="Add a note…" className="input" />
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted">Reminder date<input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} className="input mt-1 !py-1.5" /></label>
          <label className="text-xs text-muted">Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input mt-1 !py-1.5" /></label>
          <button disabled={busy || !content.trim()} onClick={add} className={`${btnPrimary} ml-auto`}>{busy ? "Adding…" : "Add note"}</button>
        </div>
        {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      </div>
      <ul className="mt-5 space-y-2">
        {notes === null && <li className="py-6 text-center text-sm text-muted">Loading…</li>}
        {notes?.length === 0 && <li className="py-6 text-center text-sm text-muted">No notes yet.</li>}
        {notes?.map((n) => {
          const overdue = !n.completed && n.reminderDate && n.reminderDate <= today();
          return (
            <li key={n.id} className="rounded-xl border border-line bg-elev p-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={n.completed} aria-label="Mark complete" className="mt-1 h-4 w-4 accent-[var(--primary)]" onChange={async (e) => { await toggleNote(n.id, e.target.checked); await load(); onChanged(); }} />
                <p className={`flex-1 whitespace-pre-wrap text-sm ${n.completed ? "text-muted line-through" : ""}`}>{n.content}</p>
                <button aria-label="Delete note" className="text-muted hover:text-red-500" onClick={async () => { if (confirm("Delete this note?")) { await deleteNote(n.id); await load(); onChanged(); } }}><Trash2 size={15} /></button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 pl-7 text-xs text-muted">
                <span>{fmt(n.createdAt)}</span>
                {n.reminderDate && <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-amber-600 dark:text-amber-400" : ""}`}><Bell size={12} />{n.reminderDate}{n.reminderTime ? ` · ${n.reminderTime}` : ""}{overdue ? " · due" : ""}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
