import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getActiveUser } from "@/lib/session";
import { parseLeadQuery } from "@/lib/lead-query";
import { CATEGORY_LABELS, SIZE_LABELS, ADS_LABELS } from "@/lib/lead-schema";

export const dynamic = "force-dynamic";
// Escape quotes and neutralise spreadsheet formula injection (=, +, -, @).
const cell = (v: unknown) => { let s = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };

export async function GET(req: NextRequest) {
  const u = await getActiveUser();
  if (!u || u.role !== "SUPER_ADMIN") return new Response("Forbidden", { status: 403 });
  if (rateLimit(`export:${u.id}`, 10, 60_000)) return new Response("Too many requests", { status: 429 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { where, orderBy } = parseLeadQuery(sp);
  const ids = sp.ids?.split(",").filter(Boolean).slice(0, 5000);
  const leads = await db.lead.findMany({ where: ids?.length ? { id: { in: ids } } : where, orderBy, take: 20000 });
  const head = ["Business Name", "Facebook Page", "Instagram Page", "Phone Number", "Category", "Business Size", "Gmail", "Called", "Running Ads", "Owner Number", "Service Pricing (BDT)", "Created"];
  const lines = leads.map((l) => [l.businessName, l.facebookUrl, l.instagramUrl, l.phone, CATEGORY_LABELS[l.category], l.businessSize ? SIZE_LABELS[l.businessSize] : "", l.email, l.called ? "Called" : "Not Called", ADS_LABELS[l.runningAds], l.ownerNumber, l.servicePrice?.toString() ?? "", l.createdAt.toISOString()].map(cell).join(","));
  await db.auditLog.create({ data: { userId: u.id, action: "LEAD_EXPORT", entity: "Lead", meta: { count: leads.length } } });
  return new Response("\uFEFF" + [head.map(cell).join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rezora-leads-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
