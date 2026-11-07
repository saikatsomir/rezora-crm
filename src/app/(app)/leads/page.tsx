import { db } from "@/lib/db";
import { requireUser, MODERATOR_LEAD_SELECT } from "@/lib/session";
import { label } from "@/lib/format";
import type { SP } from "@/lib/lead-query";
import { LeadsView } from "@/components/leads/leads-view";

export const dynamic = "force-dynamic";
const ext = (u: string | null) => (u ? <a href={u} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open</a> : <span className="text-muted">—</span>);

export default async function Leads({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") return <ModeratorLeads />;
  return <div className="mx-auto max-w-[1500px]"><LeadsView sp={await searchParams} /></div>;
}

// Moderators: read-only, whitelisted columns only (never queried: owner number, pricing, notes, meetings).
async function ModeratorLeads() {
  const rows = await db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: MODERATOR_LEAD_SELECT });
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Leads</h1><p className="text-sm text-muted">{rows.length} shown · read-only</p></div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-elev text-xs uppercase tracking-wide text-muted"><tr>{["Business", "Facebook", "Instagram", "Phone", "Gmail", "Running Ads", "Category"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((l) => (<tr key={l.id} className="hover:bg-elev/60"><td className="px-4 py-3 font-medium">{l.businessName}</td><td className="px-4 py-3">{ext(l.facebookUrl)}</td><td className="px-4 py-3">{ext(l.instagramUrl)}</td><td className="px-4 py-3">{l.phone ?? "—"}</td><td className="px-4 py-3">{l.email ?? "—"}</td><td className="px-4 py-3">{label(l.runningAds)}</td><td className="px-4 py-3">{label(l.category)}</td></tr>))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No leads yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
