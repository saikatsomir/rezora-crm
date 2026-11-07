"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { passwordSchema } from "@/lib/password";
import { fail, firstErrors, type Fail } from "@/lib/action-utils";

const admin = () => requireUser(["SUPER_ADMIN"]);
const base = z.object({ name: z.string().trim().min(1, "Required").max(100), email: z.string().trim().toLowerCase().email("Invalid email").max(200) });
const dupEmail = (e: unknown) => (e as { code?: string })?.code === "P2002";

export async function createModerator(input: unknown): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const p = base.extend({ password: passwordSchema }).safeParse(input);
  if (!p.success) return fail("Please fix the highlighted fields.", firstErrors(p.error));
  try {
    const m = await db.user.create({ data: { name: p.data.name, email: p.data.email, passwordHash: await bcrypt.hash(p.data.password, 12), role: "MODERATOR" }, select: { id: true } });
    await db.auditLog.create({ data: { userId: u.id, action: "MODERATOR_CREATE", entity: "User", entityId: m.id } });
  } catch (e) { return dupEmail(e) ? fail("That email is already in use.", { email: "Already in use" }) : fail("Could not create moderator."); }
  revalidatePath("/moderators");
  return { ok: true };
}

export async function updateModerator(id: string, input: unknown): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const p = base.extend({ password: z.preprocess((v) => (v === "" || v == null ? undefined : v), passwordSchema.optional()) }).safeParse(input);
  if (!p.success) return fail("Please fix the highlighted fields.", firstErrors(p.error));
  const target = await db.user.findFirst({ where: { id: String(id), role: "MODERATOR" }, select: { id: true } }); // super admins are never editable here
  if (!target) return fail("Moderator not found.");
  try {
    await db.user.update({ where: { id: target.id }, data: { name: p.data.name, email: p.data.email, ...(p.data.password ? { passwordHash: await bcrypt.hash(p.data.password, 12) } : {}) } });
    await db.auditLog.create({ data: { userId: u.id, action: p.data.password ? "MODERATOR_UPDATE_PASSWORD" : "MODERATOR_UPDATE", entity: "User", entityId: target.id } });
  } catch (e) { return dupEmail(e) ? fail("That email is already in use.", { email: "Already in use" }) : fail("Could not update moderator."); }
  revalidatePath("/moderators");
  return { ok: true };
}

export async function setModeratorActive(id: string, active: boolean): Promise<{ ok: true } | Fail> {
  const u = await admin();
  const target = await db.user.findFirst({ where: { id: String(id), role: "MODERATOR" }, select: { id: true } });
  if (!target) return fail("Moderator not found.");
  await db.$transaction([db.user.update({ where: { id: target.id }, data: { isActive: !!active } }), db.auditLog.create({ data: { userId: u.id, action: active ? "MODERATOR_REACTIVATE" : "MODERATOR_DISABLE", entity: "User", entityId: target.id } })]);
  revalidatePath("/moderators");
  return { ok: true };
}
