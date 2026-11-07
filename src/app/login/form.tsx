"use client";
import { useActionState } from "react";
import { authenticate } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(authenticate, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">Email<input name="email" type="email" required autoComplete="email" className="input mt-1.5" /></label>
      <label className="block text-sm font-medium">Password<input name="password" type="password" required autoComplete="current-password" className="input mt-1.5" /></label>
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-60 dark:text-[#0B1120]">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
