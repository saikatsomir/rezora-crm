import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const ADMIN_NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: "overview" }, { href: "/leads", label: "Leads", icon: "leads" },
  { href: "/clients/growth", label: "Growth Clients", icon: "growth" }, { href: "/clients/business", label: "Business Clients", icon: "business" },
  { href: "/clients/starter", label: "Starter Clients", icon: "starter" }, { href: "/clients/subscription", label: "Subscription Clients", icon: "subscription" },
  { href: "/meetings", label: "Meetings", icon: "meetings" }, { href: "/payments", label: "Payments", icon: "payments" }, { href: "/moderators", label: "Moderators", icon: "moderators" }, { href: "/settings", label: "Settings", icon: "settings" },
];

async function logout() { "use server"; await signOut({ redirectTo: "/login" }); }

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items: NavItem[] = user.role === "SUPER_ADMIN" ? ADMIN_NAV : [{ href: "/leads", label: "Leads", icon: "leads" }];
  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} user={{ name: user.name, role: user.role }} logout={logout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-bg/70 px-5 backdrop-blur">
          <p className="text-sm text-muted">Welcome back, <span className="font-medium text-fg">{user.name}</span></p>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
