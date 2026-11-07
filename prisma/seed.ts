import { PrismaClient, BusinessSize, RunningAds, LeadCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`Missing ${k}`); return v; };

async function main() {
  const admin = await db.user.upsert({
    where: { email: need("SUPER_ADMIN_EMAIL").toLowerCase() },
    update: {},
    create: { name: need("SUPER_ADMIN_NAME"), email: need("SUPER_ADMIN_EMAIL").toLowerCase(), passwordHash: await bcrypt.hash(need("SUPER_ADMIN_PASSWORD"), 12), role: "SUPER_ADMIN" },
  });
  for (const s of ["GROWTH", "BUSINESS", "STARTER", "SUBSCRIPTION"] as BusinessSize[])
    await db.clientCategory.upsert({ where: { size: s }, update: {}, create: { size: s, label: s[0] + s.slice(1).toLowerCase() } });

  if (process.env.SKIP_DEMO === "1" || (await db.lead.count()) > 0) return;
  const demoHash = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD ?? "ChangeMe-Demo-123", 12);
  for (const n of [1, 2]) await db.user.upsert({ where: { email: `moderator${n}@rezora.demo` }, update: {}, create: { name: `Demo Moderator ${n}`, email: `moderator${n}@rezora.demo`, passwordHash: demoHash, role: "MODERATOR" } });

  const cats: LeadCategory[] = ["FASHION_CLOTHING", "THREE_PIECE_SAREE", "COSMETICS_BEAUTY", "ELECTRONICS_GADGETS", "FOOD_RESTAURANT", "JEWELRY_ACCESSORIES", "FOOTWEAR", "ECOMMERCE"];
  const sizes: BusinessSize[] = ["GROWTH", "BUSINESS", "STARTER", "SUBSCRIPTION"];
  const ads: RunningAds[] = ["YES", "NO", "UNKNOWN"];
  const leads = [];
  for (let i = 1; i <= 20; i++)
    leads.push(await db.lead.create({ data: {
      businessName: `Demo Business ${i}`, facebookUrl: `https://facebook.com/demo.business.${i}`, phone: `0171000${String(i).padStart(4, "0")}`,
      category: cats[i % cats.length], businessSize: sizes[i % 4], email: `demo${i}@example.com`, called: i % 3 === 0,
      runningAds: ads[i % 3], servicePrice: 15000 + i * 1000, createdById: admin.id,
    } }));
  const day = 86400000;
  for (let i = 0; i < 3; i++) await db.meeting.create({ data: { leadId: leads[i].id, title: `Intro call – ${leads[i].businessName}`, date: new Date(Date.now() + (i + 1) * day), startTime: "15:00", type: "ONLINE", status: "SCHEDULED" } });
  for (let i = 0; i < 4; i++) await db.payment.create({ data: { leadId: leads[i].id, amount: 5000 * (i + 1), paymentDate: new Date(Date.now() - i * 9 * day), method: "bKash", status: i === 3 ? "PENDING" : "PAID" } });
}
main().finally(() => db.$disconnect());
