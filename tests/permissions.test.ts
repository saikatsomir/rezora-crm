import { describe, it, expect } from "vitest";
import { authConfig } from "@/auth.config";

const run = (role: string | null, path: string) =>
  authConfig.callbacks.authorized({ auth: role ? { user: { role } } : null, request: { nextUrl: new URL(`http://localhost${path}`) } } as never) as unknown;
const redirectPath = (r: unknown) => (r instanceof Response ? new URL(r.headers.get("location")!).pathname : null);

describe("route authorisation (middleware)", () => {
  it("blocks anonymous users except on /login", () => {
    expect(run(null, "/overview")).toBe(false);
    expect(run(null, "/leads")).toBe(false);
    expect(run(null, "/login")).toBe(true);
  });
  it("confines moderators to /leads", () => {
    for (const p of ["/overview", "/meetings", "/payments", "/moderators", "/settings", "/clients/growth", "/api/leads/export"]) expect(redirectPath(run("MODERATOR", p))).toBe("/leads");
    expect(run("MODERATOR", "/leads")).toBe(true);
  });
  it("lets super admins through and bounces them off /login", () => {
    for (const p of ["/overview", "/leads", "/meetings", "/payments", "/moderators", "/settings"]) expect(run("SUPER_ADMIN", p)).toBe(true);
    expect(redirectPath(run("SUPER_ADMIN", "/login"))).toBe("/overview");
    expect(redirectPath(run("MODERATOR", "/login"))).toBe("/leads");
  });
});
