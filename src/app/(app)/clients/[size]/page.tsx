import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import type { SP } from "@/lib/lead-query";
import { SIZE_LABELS, type Size } from "@/lib/lead-schema";
import { LeadsView } from "@/components/leads/leads-view";

export const dynamic = "force-dynamic";
const MAP: Record<string, Size> = { growth: "GROWTH", business: "BUSINESS", starter: "STARTER", subscription: "SUBSCRIPTION" };

export default async function ClientsPage({ params, searchParams }: { params: Promise<{ size: string }>; searchParams: Promise<SP> }) {
  await requireUser(["SUPER_ADMIN"]);
  const { size } = await params;
  if (!Object.prototype.hasOwnProperty.call(MAP, size)) notFound();
  const s = MAP[size];
  return <div className="mx-auto max-w-[1500px]"><LeadsView sp={await searchParams} forcedSize={s} title={`${SIZE_LABELS[s]} Clients`} /></div>;
}
