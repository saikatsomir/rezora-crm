import type { Prisma } from "@prisma/client";
import { CATEGORIES, SIZES, ADS, type Size } from "./lead-schema";

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(v: string, allowed: readonly T[]): T[] => v.split(",").filter((x): x is T => (allowed as readonly string[]).includes(x));
const day = (v: string, end = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T${end ? "23:59:59.999" : "00:00:00"}+06:00`); // Asia/Dhaka
  return isNaN(d.getTime()) ? undefined : d;
};
const SORTABLE = ["businessName", "category", "businessSize", "called", "runningAds", "servicePrice", "createdAt"];

export function parseLeadQuery(sp: SP, forcedSize?: Size) {
  const and: Prisma.LeadWhereInput[] = [];
  const q = one(sp.q).trim().slice(0, 100);
  if (q) and.push({ OR: ["businessName", "phone", "email", "facebookUrl", "instagramUrl"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) as Prisma.LeadWhereInput[] });
  const cat = pick(one(sp.category), CATEGORIES); if (cat.length) and.push({ category: { in: cat } });
  const size = forcedSize ? [forcedSize] : pick(one(sp.size), SIZES); if (size.length) and.push({ businessSize: { in: size } });
  const ads = pick(one(sp.ads), ADS); if (ads.length) and.push({ runningAds: { in: ads } });
  const called = one(sp.called); if (called === "yes" || called === "no") and.push({ called: called === "yes" });
  const from = day(one(sp.from)), to = day(one(sp.to), true);
  if (from || to) and.push({ createdAt: { gte: from, lte: to } });
  const mf = day(one(sp.mfrom)), mt = day(one(sp.mto), true);
  if (mf || mt) and.push({ meetings: { some: { date: { gte: mf, lte: mt } } } });

  const sort = SORTABLE.includes(one(sp.sort)) ? one(sp.sort) : "createdAt";
  const dir: "asc" | "desc" = one(sp.dir) === "asc" ? "asc" : "desc";
  const perN = Number(one(sp.per));
  const per = [25, 50, 100].includes(perN) ? perN : 25;
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1);
  return { where: { AND: and } as Prisma.LeadWhereInput, orderBy: [{ [sort]: dir }, { id: "desc" }] as Prisma.LeadOrderByWithRelationInput[], sort, dir, per, page };
}
