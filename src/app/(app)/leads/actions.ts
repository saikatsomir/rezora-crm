"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { TZ } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { createLeadSchema, leadFieldSchemas, FIELD_LABELS, dupKeys, normalizeRow, type LeadField, type ImportField, type NoteDTO } from "@/lib/lead-schema";

type Fail = { ok: false; error: string; fieldErrors?: Record<string, string> };
const fail = (error: string, fieldErrors?: Record<string, string>): Fail => ({ ok: false, error, fieldErrors });
const admin = () => requireUser(["SUPER_ADMIN"]);
const firstErrors = (e: z.ZodError) => { const o: Record<string, string> = {}; for (const i of e.issues) o[String(i.path[0] ?? "form")] ??= i.message; return o; };
const idList = z.array(z.string().min(1).max(40)).min(1).max(1000);

async function existingKeys() {
  const rows = await db.lead.findMany({ select: { businessName: true, phone: true, ownerNumber: true, facebookUrl: true, instagramUrl: true, email: true } });
  const m = new Map<string, string>();
  for (const r of rows) for (const k of dupKeys(r)) if (!m.has(k)) m.set(k, r.businessName);
  return m;
}

// ---------------- Leads ----------------
export async function createLead(input: unknown): Promise<{ ok: true; id: string } | Fail> {
  const u = await admin();
  const p = createLeadSchema.safeParse(input);
  if (!p.success) return fail("Please fix the highlighted fields.", firstErrors(p.error));
  const ex = await existingKeys();
  for (const k of dupKeys(p.data)) { const n = ex.get(k); if (n) return fail(`Possible duplicate of "${n}" (same phone, page or email).`); }
  const lead = await db.$transaction(async (tx) => {
    const l = await tx.lead.create({ data: { ...p.data, createdById: u.id } });
    await tx.leadActivity.create({ data: { leadId: l.id, userId: u.id, type: "LEAD_CREATED", summary: "Lead created" } });
    await tx.auditLog.create({ data: { userId: u.id, action: "LEAD_CREATE", entity: "Lead", entityId: l.id } });
    return l;
  });
  revalidatePath("/leads");
  return { ok: true, id: lead.id };
}

const TRACKED = ["called", "runningAds", "businessSize", "category"];
export async function updateLeadField(id: string, field: string, value: unknown): Promise<{ ok: true; value: unknown } | Fail> {
  const u = await admin();
  if (!Object.prototype.hasOwnProperty.call(leadFieldSchemas, field)) return fail("Unknown field");
  const p = (leadFieldSchemas[field as LeadField] as z.ZodTypeAny).safeParse(value);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid value");
  const before = await db.lead.findUnique({ where: { id } });
  if (!before) return fail("Lead no longer exists");
  const old = (before as Record<string, unknown>)[field];
  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.lead.update({ where: { id }, data: { [field]: p.data } as Prisma.LeadUpdateInput }),
    db.leadActivity.create({ data: { leadId: id, userId: u.id, type: field === "called" ? "CALL" : "UPDATE", summary: field === "called" ? (p.data ? "Marked as called" : "Marked as not called") : `Updated ${FIELD_LABELS[field as ImportField]}` } }),
    db.auditLog.create({ data: { userId: u.id, action: "LEAD_UPDATE", entity: "Lead", entityId: id, meta: { field } } }),
  ];
  if (TRACKED.includes(field)) ops.push(db.leadStatusHistory.create({ data: { leadId: id, field, fromValue: old == null ? null : String(old), toValue: p.data == null ? null : String(p.data), changedBy: u.id } }));
  await db.$transaction(ops);
  return { ok: true, value: p.data };
}

export async function bulkDelete(ids: unknown): Promise<{ ok: true; count: number } | Fail> {
  const u = await admin();
  const p = idList.safeParse(ids); if (!p.success) return fail("Invalid selection");
  try {
    const r = await db.$transaction(async (tx) => {
      const d = await tx.lead.deleteMany({ where: { id: { in: p.data } } });
      await tx.auditLog.create({ data: { userId: u.id, action: "LEAD_BULK_DELETE", entity: "Lead", meta: { count: d.count } } });
      return d;
    });
    revalidatePath("/leads");
    return { ok: true, count: r.count };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") return fail("Some selected leads have payments and cannot be deleted.");
    return fail("Could not delete leads.");
  }
}

const BULK = new Set(["businessSize", "called", "runningAds", "category"]);
export async function bulkUpdate(ids: unknown, field: string, value: unknown): Promise<{ ok: true; count: number } | Fail> {
  const u = await admin();
  const p = idList.safeParse(ids); if (!p.success || !BULK.has(field)) return fail("Invalid request");
  const v = (leadFieldSchemas[field as LeadField] as z.ZodTypeAny).safeParse(value); if (!v.success) return fail("Invalid value");
  const r = await db.$transaction(async (tx) => {
    const d = await tx.lead.updateMany({ where: { id: { in: p.data } }, data: { [field]: v.data } as Prisma.LeadUpdateManyMutationInput });
    await tx.auditLog.create({ data: { userId: u.id, action: "LEAD_BULK_UPDATE", entity: "Lead", meta: { field, count: d.count } } });
    return d;
  });
  revalidatePath("/leads");
  return { ok: true, count: r.count };
}

// ---------------- Notes ----------------
const dateStr = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const toDTO = (n: { id: string; content: string; createdAt: Date; reminderDate: Date | null; reminderTime: string | null; completed: boolean }): NoteDTO => ({
  id: n.id, content: n.content, createdAt: n.createdAt.toISOString(), reminderDate: n.reminderDate ? dateStr(n.reminderDate) : null, reminderTime: n.reminderTime, completed: n.completed,
});
const empty = (v: unknown) => (v == null || v === "" ? null : v);
const noteSchema = z.object({
  leadId: z.string().min(1).max(40), content: z.string().trim().min(1, "Write something first").max(2000),
  reminderDate: z.preprocess(empty, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  reminderTime: z.preprocess(empty, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable()),
});

export async function listNotes(leadId: string): Promise<{ ok: true; notes: NoteDTO[] } | Fail> {
  await admin();
  const notes = await db.leadNote.findMany({ where: { leadId: String(leadId) }, orderBy: { createdAt: "desc" }, take: 200 });
  return { ok: true, notes: notes.map(toDTO) };
}
export async function addNote(input: unknown): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const p = noteSchema.safeParse(input); if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid note");
  if (p.data.reminderTime && !p.data.reminderDate) return fail("Pick a reminder date too.");
  await db.$transaction([
    db.leadNote.create({ data: { leadId: p.data.leadId, authorId: u.id, content: p.data.content, reminderDate: p.data.reminderDate ? new Date(`${p.data.reminderDate}T00:00:00+06:00`) : null, reminderTime: p.data.reminderTime } }),
    db.leadActivity.create({ data: { leadId: p.data.leadId, userId: u.id, type: "NOTE", summary: "Added a note" } }),
  ]);
  revalidatePath("/leads");
  return { ok: true };
}
export async function toggleNote(id: string, completed: boolean): Promise<{ ok: true } | Fail> {
  await admin();
  await db.leadNote.update({ where: { id: String(id) }, data: { completed: !!completed } });
  revalidatePath("/leads");
  return { ok: true };
}
export async function deleteNote(id: string): Promise<{ ok: true } | Fail> {
  const u = await admin();
  await db.$transaction([db.leadNote.delete({ where: { id: String(id) } }), db.auditLog.create({ data: { userId: u.id, action: "NOTE_DELETE", entity: "LeadNote", entityId: String(id) } })]);
  revalidatePath("/leads");
  return { ok: true };
}

// ---------------- Import ----------------
const rowsSchema = z.array(z.record(z.string(), z.string().max(1000))).min(1).max(5000);
type Classified = { index: number; status: "valid" | "duplicate" | "invalid"; reason?: string; data?: z.infer<typeof createLeadSchema> };

async function classify(rows: Record<string, string>[]): Promise<Classified[]> {
  const ex = await existingKeys();
  const seen = new Set<string>();
  return rows.map((raw, index): Classified => {
    const { data, errors } = normalizeRow(raw as Partial<Record<ImportField, string>>);
    if (!data) return { index, status: "invalid", reason: errors.join("; ") };
    const keys = dupKeys(data);
    const hit = keys.find((k) => ex.has(k) || seen.has(k));
    if (hit) return { index, status: "duplicate", reason: ex.has(hit) ? `Already exists as "${ex.get(hit)}"` : "Duplicate of an earlier row in this file" };
    keys.forEach((k) => seen.add(k));
    return { index, status: "valid", data };
  });
}
const count = (r: Classified[], s: Classified["status"]) => r.filter((x) => x.status === s).length;
const slim = (r: Classified[]) => r.map(({ index, status, reason }) => ({ index, status, reason }));

export async function previewImport(rows: unknown) {
  const u = await admin();
  if (rateLimit(`import:${u.id}`, 20, 60_000)) return fail("Too many requests. Try again shortly.");
  const p = rowsSchema.safeParse(rows); if (!p.success) return fail("File must contain 1–5000 valid rows.");
  const r = await classify(p.data);
  return { ok: true as const, results: slim(r), total: r.length, valid: count(r, "valid"), duplicates: count(r, "duplicate"), invalid: count(r, "invalid") };
}

export async function commitImport(rows: unknown) {
  const u = await admin();
  if (rateLimit(`import:${u.id}`, 20, 60_000)) return fail("Too many requests. Try again shortly.");
  const p = rowsSchema.safeParse(rows); if (!p.success) return fail("File must contain 1–5000 valid rows.");
  const r = await classify(p.data); // re-validated server-side; client results are never trusted
  const valid = r.filter((x) => x.status === "valid" && x.data);
  await db.$transaction(async (tx) => {
    for (let i = 0; i < valid.length; i += 500)
      await tx.lead.createMany({ data: valid.slice(i, i + 500).map((x) => ({ ...x.data!, createdById: u.id })) });
    await tx.auditLog.create({ data: { userId: u.id, action: "LEAD_IMPORT", entity: "Lead", meta: { imported: valid.length, total: r.length } } });
  }, { timeout: 60_000 });
  revalidatePath("/leads");
  return { ok: true as const, results: slim(r), total: r.length, imported: valid.length, duplicates: count(r, "duplicate"), invalid: count(r, "invalid") };
}
