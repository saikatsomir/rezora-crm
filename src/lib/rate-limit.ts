// In-memory fixed-window limiter (per server instance). Fine for a small private CRM; use Upstash/Redis for strict multi-instance limits.
const hits = new Map<string, { n: number; t: number }>();
/** Returns true when the caller is over the limit. */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k);
  const h = hits.get(key);
  if (!h || now - h.t > windowMs) { hits.set(key, { n: 1, t: now }); return false; }
  h.n++;
  return h.n > max;
}
