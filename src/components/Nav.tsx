"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bug, Hammer, Infinity as InfinityIcon, Zap, Code2, Boxes, BarChart3, GraduationCap, Sun, Moon, Menu, Star, Github } from "lucide-react";
import { useEffect, useState } from "react";
import { bug } from "@/content/sprites";
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

// The pixel bug mascot, one rect per horizontal run of colour.
const MARK = bug.rows.flatMap((row, y) => {
  const runs: { x: number; y: number; w: number; c: string }[] = [];
  for (let x = 0; x < row.length; ) {
    const ch = row[x];
    let e = x;
    while (e < row.length && row[e] === ch) e++;
    if (ch !== ".") runs.push({ x, y, w: e - x, c: bug.palette[ch] });
    x = e;
  }
  return runs;
});

export function BugMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-0.5 -0.5 17 18" shapeRendering="crispEdges" aria-hidden>
      {MARK.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-[#fbf8f2]">
        <BugMark size={24} />
      </span>
      <span>
        Bug<span className="text-orange">Forge</span>
      </span>
    </span>
  );
}

export const REPO = "srivtx/bugforge";

/** Star-on-GitHub button with the live star count (cached for the session; hidden if the API is unreachable). */
export function StarButton({ className }: { className?: string }) {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    const k = "bugforge.stars";
    try {
      const c = sessionStorage.getItem(k);
      if (c) return setStars(Number(c));
    } catch {}
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (typeof d?.stargazers_count !== "number") return;
        setStars(d.stargazers_count);
        try {
          sessionStorage.setItem(k, String(d.stargazers_count));
        } catch {}
      })
      .catch(() => {});
  }, []);
  return (
    <a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer" className={clsx("vx-btn group inline-flex h-9 items-center gap-2 border-2 border-line bg-panel px-3 text-sm font-semibold", className)} aria-label="Star BugForge on GitHub">
      <Github className="h-4 w-4" />
      <span className="hidden sm:inline">Star</span>
      <Star className="h-3.5 w-3.5 text-amber transition group-hover:fill-[var(--amber)]" />
      {stars !== null && <span className="font-pixel text-xs tabular-nums text-muted">{stars}</span>}
    </a>
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
          <StarButton />
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
