import { db } from "@/lib/db";
import { TZ } from "@/lib/format";
import { parseLeadQuery, type SP } from "@/lib/lead-query";
import type { LeadRow, Size } from "@/lib/lead-schema";
import { LeadsClient } from "./leads-client";

/** Shared server view for /leads and the four /clients/* pages — all read the same Lead records. */
export async function LeadsView({ sp, forcedSize, title = "Leads" }: { sp: SP; forcedSize?: Size; title?: string }) {
  const { where, orderBy, sort, dir, per, page } = parseLeadQuery(sp, forcedSize);
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const endToday = new Date(`${todayStr}T23:59:59.999+06:00`);
  const [total, leads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where, orderBy, skip: (page - 1) * per, take: per,
      include: {
        _count: { select: { notes: true } },
        notes: { where: { completed: false, reminderDate: { not: null, lte: endToday } }, select: { id: true }, take: 1 },
        meetings: { where: { status: "SCHEDULED", date: { gte: new Date(Date.now() - 86400000) } }, orderBy: { date: "asc" }, take: 1, select: { date: true, startTime: true } },
      },
    }),
  ]);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "medium" });
  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id, businessName: l.businessName, facebookUrl: l.facebookUrl, instagramUrl: l.instagramUrl, phone: l.phone, category: l.category,
    businessSize: l.businessSize, email: l.email, called: l.called, runningAds: l.runningAds, ownerNumber: l.ownerNumber,
    servicePrice: l.servicePrice == null ? null : Number(l.servicePrice), createdAt: l.createdAt.toISOString(),
    nextMeeting: l.meetings[0] ? `${fmt.format(l.meetings[0].date)} · ${l.meetings[0].startTime}` : null,
    notesCount: l._count.notes, notesDue: l.notes.length > 0,
  }));
  return <LeadsClient rows={rows} total={total} page={page} per={per} sort={sort} dir={dir} title={title} fixedSize={forcedSize} />;
}
