import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(raw) {
        const p = z.object({ email: z.string().email(), password: z.string().min(1).max(200) }).safeParse(raw);
        if (!p.success) return null;
        const user = await db.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
        // Always run a compare so response time doesn't reveal whether the email exists.
        const ok = await bcrypt.compare(p.data.password, user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi");
        if (!user || !ok || !user.isActive) return null;
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await db.auditLog.create({ data: { userId: user.id, action: "LOGIN" } });
        return { id: user.id, name: user.name, email: user.email, role: user.role } as never;
      },
    }),
  ],
});
