"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bug, Hammer, Infinity as InfinityIcon, Zap, Code2, Boxes, BarChart3, GraduationCap, Sun, Moon, Menu } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { setTheme, useTheme } from "@/lib/theme";

const links = [
  { href: "/debug", label: "Debug", icon: Bug, color: "var(--rose)" },
  { href: "/build", label: "Build", icon: Hammer, color: "var(--cyan)" },
  { href: "/hunt", label: "Hunt ∞", icon: InfinityIcon, color: "var(--orange)" },
  { href: "/drills", label: "Spot the Bug", icon: Zap, color: "var(--amber)" },
  { href: "/dsa", label: "DSA", icon: Code2, color: "var(--violet)" },
  { href: "/learn", label: "Learn", icon: GraduationCap, color: "var(--mint)" },
  { href: "/visualize", label: "3D Lab", icon: Boxes, color: "var(--cyan)" },
  { href: "/progress", label: "Progress", icon: BarChart3, color: "var(--violet)" },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <polygon points="14,2 25,8 14,14 3,8" fill="var(--amber)" />
        <polygon points="3,8 14,14 14,26 3,20" fill="var(--orange)" />
        <polygon points="25,8 14,14 14,26 25,20" fill="var(--orange-edge)" />
        <rect x="11.5" y="6.2" width="5" height="3.2" rx="1" fill="var(--panel)" opacity="0.9" />
      </svg>
      <span>
        Bug<span className="text-orange">Forge</span>
      </span>
    </span>
  );
}

export function ThemeToggle() {
  const t = useTheme();
  return (
    <button
      aria-label="Toggle light/dark mode"
      onClick={() => setTheme(t === "dark" ? "light" : "dark")}
      className="vx-btn grid h-9 w-9 place-items-center border-2 border-line bg-panel text-muted hover:text-text"
    >
      <motion.span key={t} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
        {t === "dark" ? <Sun className="h-4 w-4 text-amber" /> : <Moon className="h-4 w-4 text-violet" />}
      </motion.span>
    </button>
  );
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isWorkspace = path.startsWith("/lab/") || /^\/dsa\/.+/.test(path);
  return (
    <header className={clsx("z-40 border-b-2 border-line bg-bg/85 backdrop-blur-xl", isWorkspace ? "relative" : "sticky top-0")}>
      <div className={clsx("mx-auto flex h-14 items-center gap-5 px-4", isWorkspace ? "max-w-none" : "max-w-7xl")}>
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-0.5 xl:flex">
          {links.map((l) => {
            const active = path.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className={clsx("relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors", active ? "text-text" : "text-muted hover:text-text")}>
                {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl border-2 border-line bg-panel shadow-[0_3px_0_var(--edge)]" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />}
                <Icon className="relative h-4 w-4" style={{ color: active ? l.color : undefined }} />
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setOpen((o) => !o)} className="vx-btn grid h-9 w-9 place-items-center border-2 border-line bg-panel text-muted xl:hidden" aria-label="Menu">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-2 border-t-2 border-line bg-bg p-3 xl:hidden">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="vx-sm flex items-center gap-2 px-3 py-2 text-sm">
                <Icon className="h-4 w-4" style={{ color: l.color }} /> {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
