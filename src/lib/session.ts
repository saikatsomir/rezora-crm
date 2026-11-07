import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type Role = "SUPER_ADMIN" | "MODERATOR";

/** Server-side guard. Re-checks the DB so deactivated users lose access immediately. */
export async function requireUser(allowed: Role[] = ["SUPER_ADMIN", "MODERATOR"]) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, isActive: true } });
  if (!user || !user.isActive) redirect("/login");
  if (!allowed.includes(user.role)) redirect("/leads");
  return user;
}

/** Fields a moderator may read. Used in Prisma `select` so other columns never leave the DB. */
export const MODERATOR_LEAD_SELECT = {
  id: true, businessName: true, facebookUrl: true, instagramUrl: true, phone: true, email: true, runningAds: true, category: true,
} as const;

/** Non-redirecting variant for route handlers. */
export async function getActiveUser() {
  const s = await auth();
  if (!s?.user?.id) return null;
  const u = await db.user.findUnique({ where: { id: s.user.id }, select: { id: true, role: true, isActive: true } });
  return u?.isActive ? u : null;
}
