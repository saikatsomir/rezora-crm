import type { z } from "zod";
export type Fail = { ok: false; error: string; fieldErrors?: Record<string, string> };
export const fail = (error: string, fieldErrors?: Record<string, string>): Fail => ({ ok: false, error, fieldErrors });
export const firstErrors = (e: z.ZodError) => { const o: Record<string, string> = {}; for (const i of e.issues) o[String(i.path[0] ?? "form")] ??= i.message; return o; };
