import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ModeratorsClient } from "@/components/admin/moderators-client";

export const dynamic = "force-dynamic";

export default async function ModeratorsPage() {
  await requireUser(["SUPER_ADMIN"]);
  // Explicit select: passwordHash is never loaded into this page.
  const rows = await db.user.findMany({ where: { role: "MODERATOR" }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, isActive: true, createdAt: true, lastLoginAt: true } });
  return <div className="mx-auto max-w-5xl"><ModeratorsClient mods={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), lastLoginAt: r.lastLoginAt?.toISOString() ?? null }))} /></div>;
}
