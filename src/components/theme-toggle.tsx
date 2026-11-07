"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const opts = [{ v: "light", Icon: Sun, t: "Light" }, { v: "dark", Icon: Moon, t: "Dark" }, { v: "system", Icon: Monitor, t: "System" }] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div role="radiogroup" aria-label="Theme" className="flex items-center gap-0.5 rounded-xl border border-line bg-elev p-0.5">
      {opts.map(({ v, Icon, t }) => {
        const active = mounted && theme === v;
        return (
          <button key={v} role="radio" aria-checked={active} title={t} onClick={() => setTheme(v)}
            className={`grid h-8 w-8 place-items-center rounded-lg transition ${active ? "bg-card text-primary shadow-sm" : "text-muted hover:text-fg"}`}>
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
