"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { dhakaDate } from "@/lib/dates";
import { fail, firstErrors, type Fail } from "@/lib/action-utils";
import { meetingSchema, MEETING_STATUSES } from "@/lib/meeting-schema";

const admin = () => requireUser(["SUPER_ADMIN"]);
const refresh = () => { revalidatePath("/meetings"); revalidatePath("/leads"); revalidatePath("/overview"); };

export async function createMeeting(input: unknown): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const p = meetingSchema.safeParse(input);
  if (!p.success) return fail("Please fix the highlighted fields.", firstErrors(p.error));
  const { date, ...rest } = p.data;
  if (!(await db.lead.findUnique({ where: { id: rest.leadId }, select: { id: true } }))) return fail("Business not found.");
  await db.$transaction([
    db.meeting.create({ data: { ...rest, date: dhakaDate(date) } }),
    db.leadActivity.create({ data: { leadId: rest.leadId, userId: u.id, type: "MEETING", summary: `Meeting scheduled: ${rest.title}` } }),
    db.auditLog.create({ data: { userId: u.id, action: "MEETING_CREATE", entity: "Lead", entityId: rest.leadId } }),
  ]);
  refresh();
  return { ok: true };
}

export async function updateMeeting(id: string, input: unknown): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const p = meetingSchema.safeParse(input);
  if (!p.success) return fail("Please fix the highlighted fields.", firstErrors(p.error));
  const before = await db.meeting.findUnique({ where: { id: String(id) } });
  if (!before) return fail("Meeting no longer exists.");
  const { date, ...rest } = p.data;
  const ops = [
    db.meeting.update({ where: { id: before.id }, data: { ...rest, date: dhakaDate(date) } }),
    db.auditLog.create({ data: { userId: u.id, action: "MEETING_UPDATE", entity: "Meeting", entityId: before.id } }),
  ];
  if (before.status !== rest.status) ops.push(db.leadActivity.create({ data: { leadId: before.leadId, userId: u.id, type: "MEETING", summary: `Meeting ${MEETING_STATUSES[rest.status].toLowerCase()}: ${rest.title}` } }) as never);
  await db.$transaction(ops);
  refresh();
  return { ok: true };
}

export async function setMeetingStatus(id: string, status: string): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const s = z.enum(Object.keys(MEETING_STATUSES) as [keyof typeof MEETING_STATUSES, ...(keyof typeof MEETING_STATUSES)[]]).safeParse(status);
  if (!s.success) return fail("Invalid status.");
  const m = await db.meeting.findUnique({ where: { id: String(id) } });
  if (!m) return fail("Meeting no longer exists.");
  await db.$transaction([
    db.meeting.update({ where: { id: m.id }, data: { status: s.data } }),
    db.leadActivity.create({ data: { leadId: m.leadId, userId: u.id, type: "MEETING", summary: `Meeting ${MEETING_STATUSES[s.data].toLowerCase()}: ${m.title}` } }),
  ]);
  refresh();
  return { ok: true };
}

export async function deleteMeeting(id: string): Promise<{ ok: true } | Fail> {
  const u = await admin();
  await db.$transaction([db.meeting.delete({ where: { id: String(id) } }), db.auditLog.create({ data: { userId: u.id, action: "MEETING_DELETE", entity: "Meeting", entityId: String(id) } })]);
  refresh();
  return { ok: true };
}
