import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no DB / bcrypt). Used by middleware.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const p = nextUrl.pathname;
      const user = auth?.user as { role?: string } | undefined;
      if (p === "/login") return user ? Response.redirect(new URL(user.role === "MODERATOR" ? "/leads" : "/overview", nextUrl)) : true;
      if (!user) return false;
      if (user.role === "MODERATOR" && !p.startsWith("/leads")) return Response.redirect(new URL("/leads", nextUrl));
      return true;
    },
    jwt({ token, user }) {
      if (user) { token.role = (user as { role?: string }).role; token.uid = user.id; }
      return token;
    },
    session({ session, token }) {
      (session.user as unknown as { role?: string }).role = token.role as string;
      session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
