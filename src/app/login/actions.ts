"use server";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function authenticate(_: string | undefined, fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (rateLimit(`login:${email}`, 8, 15 * 60_000)) return "Too many attempts. Try again in 15 minutes.";
  try {
    await signIn("credentials", { email, password: String(fd.get("password") ?? ""), redirectTo: "/overview" });
  } catch (e) {
    if (e instanceof AuthError) return "Invalid email or password.";
    throw e;
  }
}
