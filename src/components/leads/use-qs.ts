"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/** Reads/writes table state (search, filters, sort, page) in the URL. */
export function useQs() {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const set = (u: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(u)) { if (v == null || v === "") n.delete(k); else n.set(k, v); }
    if (!("page" in u)) n.delete("page");
    router.replace(`${path}?${n.toString()}`, { scroll: false });
  };
  return { sp, set };
}
