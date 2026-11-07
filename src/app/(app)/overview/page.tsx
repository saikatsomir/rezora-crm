import { format } from "date-fns";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { bdt, label, TZ } from "@/lib/format";
import { dhakaDate, dhakaDay } from "@/lib/dates";
import { COLLECTED } from "@/lib/revenue";
import { revenueTotals } from "@/lib/revenue-server";
import { RevenueChart } from "@/components/payments/revenue-chart";

export const dynamic = "force-dynamic";

export default async function Overview() {
  await requireUser(["SUPER_ADMIN"]);
  const now = new Date();
  const todayD = dhakaDate(dhakaDay(now));
  const [leads, meetings, bySize, ads, contacted, interested, converted, totals, upcoming, recent, conversions, activity] = await Promise.all([
    db.lead.count(), db.meeting.count(), db.lead.groupBy({ by: ["businessSize"], _count: true }), db.lead.groupBy({ by: ["runningAds"], _count: true }),
    db.lead.count({ where: { called: true } }),
    db.lead.count({ where: { meetings: { some: { status: { in: ["SCHEDULED", "COMPLETED", "RESCHEDULED"] } } } } }),
    db.lead.count({ where: { payments: { some: { status: { in: [...COLLECTED] } } } } }),
    revenueTotals(),
    db.meeting.findMany({ where: { date: { gte: todayD }, status: { in: ["SCHEDULED", "RESCHEDULED"] } }, orderBy: [{ date: "asc" }, { startTime: "asc" }], take: 5, include: { lead: { select: { businessName: true } } } }),
    db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, businessName: true, category: true, createdAt: true } }),
    db.payment.findMany({ where: { status: { in: [...COLLECTED] } }, orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }], take: 5, include: { lead: { select: { businessName: true } } } }),
    db.leadActivity.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { lead: { select: { businessName: true } } } }),
  ]);
  const size = (s: string) => bySize.find((b) => b.businessSize === s)?._count ?? 0;
  const adc = (s: string) => ads.find((a) => a.runningAds === s)?._count ?? 0;
  const dt = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "medium" }).format(d);

  const stats: [string, number][] = [["Total Leads", leads], ["Total Meetings", meetings], ["Growth Clients", size("GROWTH")], ["Business Clients", size("BUSINESS")], ["Starter Clients", size("STARTER")], ["Subscription Clients", size("SUBSCRIPTION")]];
  const money: [string, number][] = [["Revenue This Month", totals.month], ["Revenue This Year", totals.year], ["Total Collected Revenue", totals.total], ["Pending Payments", totals.pending]];
  const adStats: [string, number][] = [["Running ads", adc("YES")], ["Not running", adc("NO")], ["Unknown", adc("UNKNOWN")]];
  const sales: [string, number][] = [["Total leads", leads], ["Contacted", contacted], ["Interested", interested], ["Converted", converted]];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Overview</h1><p className="text-sm text-muted">{format(now, "EEEE, d MMMM yyyy")}</p></div>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-6">{stats.map(([t, v]) => <div key={t} className="card p-4"><p className="text-xs text-muted">{t}</p><p className="mt-1 text-2xl font-semibold">{v}</p></div>)}</section>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">{money.map(([t, v]) => <div key={t} className="card p-4"><p className="text-xs text-muted">{t}</p><p className="mt-1 text-xl font-semibold text-primary">{bdt(v)}</p></div>)}</section>
      <RevenueChart />
      <section className="grid gap-4 lg:grid-cols-2">
        <List title="Upcoming Meetings" empty="No upcoming meetings" rows={upcoming.map((m) => [m.lead.businessName, `${dt(m.date)} · ${m.startTime}`, label(m.status)])} />
        <List title="Recent Leads" empty="No leads yet" rows={recent.map((l) => [l.businessName, label(l.category), dt(l.createdAt)])} />
        <List title="Recent Conversions" empty="No payments recorded yet" rows={conversions.map((p) => [p.lead.businessName, bdt(Number(p.amount)), dt(p.paymentDate)])} />
        <List title="Recent Activity" empty="No activity recorded yet" rows={activity.map((a) => [a.lead.businessName, a.summary, dt(a.createdAt)])} />
        <Tiles title="Advertisement Overview" items={adStats} cols={3} />
        <Tiles title="Sales Overview" items={sales} cols={4} note="Interested = has a meeting booked or held · Converted = has a collected payment" />
      </section>
    </div>
  );
}

function Tiles({ title, items, cols, note }: { title: string; items: [string, number][]; cols: 3 | 4; note?: string }) {
  return (
    <div className="card p-5"><h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <dl className={`grid gap-3 text-center ${cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>{items.map(([t, v]) => <div key={t} className="rounded-xl bg-elev p-3"><dd className="text-xl font-semibold">{v}</dd><dt className="text-xs text-muted">{t}</dt></div>)}</dl>
      {note && <p className="mt-3 text-[11px] text-muted">{note}</p>}
    </div>
  );
}
function List({ title, rows, empty }: { title: string; rows: string[][]; empty: string }) {
  return (
    <div className="card p-5"><h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted">{empty}</p> :
        <ul className="divide-y divide-line">{rows.map((r, i) => <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="truncate font-medium">{r[0]}</span><span className="shrink-0 text-xs text-muted">{r[1]}{r[2] ? ` · ${r[2]}` : ""}</span></li>)}</ul>}
    </div>
  );
}
