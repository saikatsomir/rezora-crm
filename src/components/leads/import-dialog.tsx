"use client";
import { useState } from "react";
import Papa from "papaparse";
import readXlsxFile from "read-excel-file";
import { Modal } from "./modal";
import { btn, btnPrimary } from "./ui";
import { previewImport, commitImport } from "@/app/(app)/leads/actions";
import { IMPORT_FIELDS, FIELD_LABELS, HEADER_ALIASES, normKey, type ImportField } from "@/lib/lead-schema";

type Result = { index: number; status: "valid" | "duplicate" | "invalid"; reason?: string };
type Summary = { total: number; valid?: number; imported?: number; duplicates: number; invalid: number };
const MAX_BYTES = 5 * 1024 * 1024;

export function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]), [body, setBody] = useState<string[][]>([]);
  const [map, setMap] = useState<(ImportField | "")[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [results, setResults] = useState<Result[]>([]), [sum, setSum] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setErr(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (file.size > MAX_BYTES) return setErr("File is larger than 5 MB.");
    if (ext !== "csv" && ext !== "xlsx") return setErr("Only .csv and .xlsx files are supported.");
    try {
      const all: string[][] = ext === "csv"
        ? await new Promise<string[][]>((res, rej) => Papa.parse<string[]>(file, { skipEmptyLines: true, complete: (r) => res(r.data), error: (e) => rej(e) }))
        : (await readXlsxFile(file)).map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))));
      if (all.length < 2) return setErr("The file needs a header row and at least one data row.");
      if (all.length - 1 > 5000) return setErr("Maximum 5000 rows per import.");
      const h = all[0].map((x) => String(x).trim());
      const used = new Set<ImportField>();
      setMap(h.map((name) => {
        const f = IMPORT_FIELDS.find((k) => !used.has(k) && (HEADER_ALIASES[k].includes(normKey(name)) || normKey(FIELD_LABELS[k]) === normKey(name)));
        if (f) used.add(f);
        return f ?? "";
      }));
      setHeaders(h); setBody(all.slice(1)); setStep("map");
    } catch { setErr("Could not read this file."); }
  }

  async function toPreview() {
    if (!map.includes("businessName")) return setErr("Map a column to Business Name.");
    setErr(null); setBusy(true);
    const mapped = body.map((r) => { const o: Record<string, string> = {}; map.forEach((f, i) => { if (f) o[f] = String(r[i] ?? ""); }); return o; });
    const r = await previewImport(mapped);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setRows(mapped); setResults(r.results); setSum(r); setStep("preview");
  }
  async function confirm() {
    setBusy(true); setErr(null);
    const r = await commitImport(rows);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setResults(r.results); setSum(r); setStep("done"); onDone();
  }
  function report() {
    const esc = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replace(/"/g, '""')}"`;
    const bad = results.filter((r) => r.status !== "valid");
    const csv = [["Row", "Status", "Reason", ...IMPORT_FIELDS].map(esc).join(","), ...bad.map((r) => [String(r.index + 2), r.status, r.reason ?? "", ...IMPORT_FIELDS.map((f) => rows[r.index]?.[f] ?? "")].map(esc).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" })); a.download = "import-error-report.csv"; a.click();
  }
  const issues = results.filter((r) => r.status !== "valid");

  return (
    <Modal title="Import Leads" onClose={onClose} wide>
      {step === "upload" && (
        <div className="space-y-3">
          <label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line bg-elev p-10 text-center text-sm text-muted hover:border-primary">
            <span><b className="text-fg">Choose a .csv or .xlsx file</b><br />Up to 5 MB and 5000 rows</span>
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <a href="/leads-import-template.csv" download className="text-sm text-primary hover:underline">Download CSV template</a>
        </div>
      )}
      {step === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{body.length} rows found. Match your columns to lead fields.</p>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {headers.map((h, i) => (
              <div key={i} className="grid grid-cols-2 items-center gap-3">
                <div className="truncate text-sm"><span className="font-medium">{h || `Column ${i + 1}`}</span><span className="ml-2 text-xs text-muted">{body[0]?.[i]?.slice(0, 24)}</span></div>
                <select className="input !py-1.5" value={map[i]} onChange={(e) => setMap(map.map((m, j) => (j === i ? (e.target.value as ImportField | "") : m)))}>
                  <option value="">Skip this column</option>
                  {IMPORT_FIELDS.map((f) => <option key={f} value={f} disabled={map.includes(f) && map[i] !== f}>{FIELD_LABELS[f]}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-between"><button className={btn} onClick={() => setStep("upload")}>Back</button><button className={btnPrimary} disabled={busy} onClick={toPreview}>{busy ? "Validating…" : "Validate"}</button></div>
        </div>
      )}
      {(step === "preview" || step === "done") && sum && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            {([["Total rows", sum.total], [step === "done" ? "Imported" : "Ready to import", sum.imported ?? sum.valid ?? 0], ["Duplicates", sum.duplicates], ["Invalid", sum.invalid]] as [string, number][]).map(([t, v]) => (
              <div key={t} className="rounded-xl bg-elev p-3"><p className="text-xl font-semibold">{v}</p><p className="text-xs text-muted">{t}</p></div>))}
          </div>
          {issues.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-line text-sm">
              <table className="w-full text-left"><thead className="sticky top-0 bg-elev text-xs text-muted"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Reason</th></tr></thead>
                <tbody className="divide-y divide-line">{issues.slice(0, 100).map((r) => <tr key={r.index}><td className="px-3 py-1.5">{r.index + 2}</td><td className="px-3 py-1.5 capitalize">{r.status}</td><td className="px-3 py-1.5 text-muted">{r.reason}</td></tr>)}</tbody></table>
              {issues.length > 100 && <p className="p-2 text-center text-xs text-muted">Showing first 100. Download the report for all.</p>}
            </div>)}
          <div className="flex flex-wrap justify-between gap-2">
            {issues.length > 0 ? <button className={btn} onClick={report}>Download error report</button> : <span />}
            {step === "preview" ? <div className="flex gap-2"><button className={btn} onClick={() => setStep("map")}>Back</button><button className={btnPrimary} disabled={busy || !sum.valid} onClick={confirm}>{busy ? "Importing…" : `Import ${sum.valid} lead${sum.valid === 1 ? "" : "s"}`}</button></div>
              : <button className={btnPrimary} onClick={onClose}>Done</button>}
          </div>
        </div>
      )}
      {err && <p role="alert" className="mt-3 text-sm text-red-500">{err}</p>}
    </Modal>
  );
}
