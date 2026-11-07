export const bdt = (n: number | string | { toString(): string } | null | undefined) =>
  n == null ? "—" : `৳${Number(n.toString()).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
export const label = (s: string | null | undefined) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "—");
export const TZ = "Asia/Dhaka";
