import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { label, TZ } from "@/lib/format";
import { PasswordForm } from "@/components/admin/password-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser(["SUPER_ADMIN"]);
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } } } });
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Settings</h1><p className="text-sm text-muted">Account, security and activity log</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-3 text-sm font-semibold">Account</h2>
          <dl className="space-y-2 text-sm"><div className="flex justify-between"><dt className="text-muted">Name</dt><dd>{user.name}</dd></div><div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{user.email}</dd></div><div className="flex justify-between"><dt className="text-muted">Role</dt><dd>Super Admin</dd></div><div className="flex justify-between"><dt className="text-muted">Timezone</dt><dd>Asia/Dhaka</dd></div><div className="flex justify-between"><dt className="text-muted">Currency</dt><dd>BDT (৳)</dd></div></dl>
        </section>
        <section className="card p-5"><h2 className="mb-3 text-sm font-semibold">Change password</h2><PasswordForm /></section>
      </div>
      <section className="card overflow-x-auto"><h2 className="px-5 pt-5 text-sm font-semibold">Recent activity (audit log)</h2>
        <table className="mt-3 w-full min-w-[600px] text-left text-sm">
          <thead className="border-y border-line bg-elev text-xs uppercase tracking-wide text-muted"><tr>{["When", "User", "Action", "Entity"].map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => <tr key={l.id}><td className="whitespace-nowrap px-5 py-2 text-muted">{fmt.format(l.createdAt)}</td><td className="px-5 py-2">{l.user?.name ?? "—"}</td><td className="px-5 py-2 font-medium">{label(l.action)}</td><td className="px-5 py-2 text-muted">{l.entity ?? "—"}</td></tr>)}
            {logs.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">No activity yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
