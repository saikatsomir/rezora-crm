"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cellSelect } from "./ui";

/** Double-click to edit. Enter saves, Escape cancels, blur saves. onSave returns an error string or null. */
export function EditableText({ value, display, onSave }: { value: string; display?: React.ReactNode; onSave: (v: string) => Promise<string | null> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const skip = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) input.current?.focus(); }, [editing, busy]);

  async function commit() {
    if (skip.current || busy) return;
    if (draft.trim() === value.trim()) { setEditing(false); setErr(null); return; }
    setBusy(true);
    const e = await onSave(draft);
    setBusy(false);
    if (e) setErr(e); else { setErr(null); setEditing(false); }
  }
  function cancel() { skip.current = true; setDraft(value); setErr(null); setEditing(false); }

  if (!editing)
    return <div onDoubleClick={() => { skip.current = false; setEditing(true); }} title="Double-click to edit" className="min-h-6 cursor-text rounded px-1 py-0.5 hover:bg-elev">{display ?? (value || <span className="text-muted">—</span>)}</div>;
  return (
    <div className="relative">
      <input ref={input} value={draft} disabled={busy} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } else if (e.key === "Escape") cancel(); }}
        className={`input !py-1 ${err ? "!border-red-500" : ""}`} aria-invalid={!!err} />
      {busy && <Loader2 size={14} className="absolute right-2 top-2 animate-spin text-muted" />}
      {err && <p className="absolute left-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-red-600 px-2 py-1 text-xs text-white">{err}</p>}
    </div>
  );
}

export function SelectCell({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => Promise<string | null> }) {
  const [busy, setBusy] = useState(false);
  return (
    <select className={cellSelect} value={value} disabled={busy} onChange={async (e) => { setBusy(true); await onChange(e.target.value); setBusy(false); }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
