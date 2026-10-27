"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bug, Hammer, Infinity as InfinityIcon, Zap, Code2, Boxes, BarChart3 } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const links = [
  { href: "/debug", label: "Debug Labs", icon: Bug },
  { href: "/build", label: "Build Labs", icon: Hammer },
  { href: "/hunt", label: "Bug Hunt ∞", icon: InfinityIcon },
  { href: "/drills", label: "Spot the Bug", icon: Zap },
  { href: "/dsa", label: "DSA", icon: Code2 },
  { href: "/visualize", label: "Visualize", icon: Boxes },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="relative grid h-7 w-7 place-items-center">
        <span className="absolute inset-0 rotate-45 rounded-[7px] bg-gradient-to-br from-amber via-orange to-rose" />
        <span className="absolute inset-[5px] rotate-45 rounded-[4px] bg-bg" />
        <span className="relative h-2 w-2 rounded-sm bg-orange" />
      </span>
      <span>
        Bug<span className="text-orange">Forge</span>
      </span>
    </span>
  );
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isWorkspace = path.startsWith("/lab/") || /^\/dsa\/.+/.test(path) || path.startsWith("/hunt/play");
  return (
    <header className={clsx("sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-xl", isWorkspace && "relative")}>
      <div className={clsx("mx-auto flex h-14 items-center gap-6 px-4", isWorkspace ? "max-w-none" : "max-w-7xl")}>
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = path.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className={clsx("relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors", active ? "text-text" : "text-muted hover:text-text")}>
                {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-panel-2 ring-1 ring-line-2" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto lg:hidden">
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted">
            Menu
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-bg px-4 py-2 lg:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2 text-sm text-muted hover:text-text">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
