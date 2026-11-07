"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getRevenue } from "@/app/(app)/overview/actions";
import { bdt } from "@/lib/format";
import { SIZE_LABELS, type Size } from "@/lib/lead-schema";
import type { Preset, RevenueResult } from "@/lib/revenue";

const PRESETS: [Preset, string][] = [["week", "This Week"], ["month", "This Month"], ["year", "This Year"], ["custom", "Custom Range"]];

export function RevenueChart() {
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [data, setData] = useState<RevenueResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (preset === "custom" && (!from || !to)) return;
    let live = true; setData(null); setErr(null);
    getRevenue({ preset, from, to }).then((r) => { if (!live) return; if (r.ok) setData(r); else setErr(r.error); });
    return () => { live = false; };
  }, [preset, from, to]);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold">Revenue Analytics</h2><p className="text-xs text-muted">Collected payments (Paid + Partial)</p></div>
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-elev p-0.5">
          {PRESETS.map(([v, l]) => <button key={v} onClick={() => setPreset(v)} aria-pressed={preset === v} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${preset === v ? "bg-card text-primary shadow-sm" : "text-muted hover:text-fg"}`}>{l}</button>)}
        </div>
      </div>
      {preset === "custom" && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input !w-auto !py-1" />to<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input !w-auto !py-1" /></div>}
      <div className="mt-4 h-64">
        {err ? <p className="grid h-full place-items-center text-sm text-red-500">{err}</p>
          : !data ? <div className="h-full animate-pulse rounded-xl bg-elev" aria-busy="true" />
          : data.count === 0 ? <p className="grid h-full place-items-center text-sm text-muted">No collected payments in this range.</p>
          : <ResponsiveContainer width="100%" height="100%"><BarChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--line)" }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
              <Tooltip cursor={{ fill: "var(--elev)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--fg)", fontSize: 12 }} formatter={(v) => [bdt(Number(v)), "Revenue"]} />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart></ResponsiveContainer>}
      </div>
      {data && <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-3 text-sm">
        <span>Total <b className="text-primary">{bdt(data.total)}</b></span><span className="text-muted">{data.count} payment{data.count === 1 ? "" : "s"}</span>
        <span className="ml-auto flex flex-wrap gap-x-4 text-xs text-muted">{Object.entries(data.byClass).map(([k, v]) => <span key={k}>{SIZE_LABELS[k as Size] ?? "Unclassified"}: <b className="text-fg">{bdt(v)}</b></span>)}</span>
      </div>}
    </div>
  );
}
