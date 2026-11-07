"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, TrendingUp, Briefcase, Sprout, Repeat, CalendarDays, ShieldCheck, Settings, PanelLeftClose, PanelLeftOpen, LogOut, Wallet } from "lucide-react";
import { Logo } from "./logo";

const icons = { overview: LayoutDashboard, leads: Users, growth: TrendingUp, business: Briefcase, starter: Sprout, subscription: Repeat, meetings: CalendarDays, moderators: ShieldCheck, settings: Settings, payments: Wallet };
export type NavItem = { href: string; label: string; icon: keyof typeof icons };

export function Sidebar({ items, user, logout }: { items: NavItem[]; user: { name: string; role: string }; logout: () => Promise<void> }) {
  const [collapsed, setCollapsed] = useState(false);
  const path = usePathname();
  return (
    <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-sidebar transition-[width] md:flex ${collapsed ? "w-[72px]" : "w-64"}`}>
      <div className="flex h-16 items-center justify-between px-4">
        {collapsed ? <span className="mx-auto text-lg font-bold text-primary">R</span> : <Logo />}
        <button onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar" className={`text-muted hover:text-fg ${collapsed ? "hidden" : ""}`}><PanelLeftClose size={18} /></button>
      </div>
      {collapsed && <button onClick={() => setCollapsed(false)} aria-label="Expand sidebar" className="mx-auto mb-2 text-muted hover:text-fg"><PanelLeftOpen size={18} /></button>}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ href, label, icon }) => {
          const Icon = icons[icon]; const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} title={label}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary/10 text-primary" : "text-muted hover:bg-elev hover:text-fg"} ${collapsed ? "justify-center" : ""}`}>
              {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />}
              <Icon size={18} />{!collapsed && label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{user.name[0]}</div>
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.name}</p><p className="text-xs text-muted">{user.role === "SUPER_ADMIN" ? "Super Admin" : "Moderator"}</p></div>}
          <form action={logout}><button title="Log out" className="text-muted hover:text-fg"><LogOut size={16} /></button></form>
        </div>
      </div>
    </aside>
  );
}
