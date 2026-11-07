import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { addDays, dhakaDate, dhakaDay } from "@/lib/dates";
import type { SP } from "@/lib/lead-query";
import type { MeetingDTO } from "@/lib/meeting-schema";
import { MeetingsClient } from "@/components/meetings/meetings-client";

export const dynamic = "force-dynamic";
const VIEWS = ["calendar", "table", "upcoming", "today", "completed", "cancelled"];

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser(["SUPER_ADMIN"]);
  const sp = await searchParams;
  const g = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? ""; };
  const view = VIEWS.includes(g("view")) ? g("view") : "calendar";
  const today = dhakaDay(new Date());
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(g("month")) ? g("month") : today.slice(0, 7);

  let where: Prisma.MeetingWhereInput = {};
  let orderBy: Prisma.MeetingOrderByWithRelationInput[] = [{ date: "asc" }, { startTime: "asc" }];
  if (view === "calendar") {
    const [y, m] = month.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    where = { date: { gte: dhakaDate(`${month}-01`), lt: dhakaDate(next) } };
  } else if (view === "upcoming") where = { date: { gte: dhakaDate(today) }, status: { in: ["SCHEDULED", "RESCHEDULED"] } };
  else if (view === "today") where = { date: { gte: dhakaDate(today), lt: dhakaDate(addDays(today, 1)) } };
  else if (view === "completed") { where = { status: "COMPLETED" }; orderBy = [{ date: "desc" }, { startTime: "desc" }]; }
  else if (view === "cancelled") { where = { status: "CANCELLED" }; orderBy = [{ date: "desc" }, { startTime: "desc" }]; }
  else orderBy = [{ date: "desc" }, { startTime: "desc" }];

  const [rows, leads] = await Promise.all([
    db.meeting.findMany({ where, orderBy, take: 300, include: { lead: { select: { businessName: true } } } }),
    db.lead.findMany({ select: { id: true, businessName: true }, orderBy: { businessName: "asc" }, take: 3000 }),
  ]);
  const meetings: MeetingDTO[] = rows.map((m) => ({
    id: m.id, leadId: m.leadId, businessName: m.lead.businessName, title: m.title, date: dhakaDay(m.date), startTime: m.startTime, endTime: m.endTime,
    type: m.type, link: m.link, location: m.location, agenda: m.agenda, notes: m.notes, outcome: m.outcome, nextAction: m.nextAction, status: m.status,
  }));
  return <div className="mx-auto max-w-7xl"><MeetingsClient meetings={meetings} view={view} month={month} today={today} leads={leads} /></div>;
}
