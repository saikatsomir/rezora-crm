"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { passwordSchema } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { fail, firstErrors, type Fail } from "@/lib/action-utils";

const schema = z.object({ current: z.string().min(1, "Required").max(200), next: passwordSchema, confirm: z.string() }).refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export async function changePassword(input: unknown): Promise<{ ok: true } | Fail> {
  const u = await requireUser(["SUPER_ADMIN"]);
  if (rateLimit(`pw:${u.id}`, 5, 15 * 60_000)) return fail("Too many attempts. Try again later.");
  const p = schema.safeParse(input);
  if (!p.success) return fail("Please fix the highlighted fields.", firstErrors(p.error));
  const row = await db.user.findUnique({ where: { id: u.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(p.data.current, row.passwordHash))) return fail("Current password is incorrect.", { current: "Incorrect password" });
  await db.$transaction([db.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(p.data.next, 12) } }), db.auditLog.create({ data: { userId: u.id, action: "PASSWORD_CHANGE", entity: "User", entityId: u.id } })]);
  return { ok: true };
}
