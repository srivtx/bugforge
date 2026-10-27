import clsx from "clsx";
import type { Difficulty } from "@/lib/types";

export function DifficultyBadge({ d, className }: { d: Difficulty; className?: string }) {
  const c = d === "Easy" ? "text-mint bg-mint/10 ring-mint/25" : d === "Medium" ? "text-amber bg-amber/10 ring-amber/25" : "text-rose bg-rose/10 ring-rose/25";
  return <span className={clsx("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1", c, className)}>{d}</span>;
}

export function Pill({ children, className, tone = "default" }: { children: React.ReactNode; className?: string; tone?: "default" | "orange" | "violet" | "cyan" | "mint" | "rose" }) {
  const tones = {
    default: "bg-panel-2 text-muted ring-line-2",
    orange: "bg-orange/10 text-orange ring-orange/25",
    violet: "bg-violet/10 text-violet ring-violet/25",
    cyan: "bg-cyan/10 text-cyan ring-cyan/25",
    mint: "bg-mint/10 text-mint ring-mint/25",
    rose: "bg-rose/10 text-rose ring-rose/25",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ring-1", tones[tone], className)}>{children}</span>;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "success";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const v = {
    primary: "bg-gradient-to-b from-orange to-[#f07b1a] text-[#1a0d00] font-semibold shadow-[0_6px_24px_-8px_var(--orange)] hover:brightness-110",
    success: "bg-gradient-to-b from-mint to-[#22c98d] text-[#00140c] font-semibold shadow-[0_6px_24px_-8px_var(--mint)] hover:brightness-110",
    outline: "border border-line-2 bg-panel text-text hover:bg-panel-2",
    ghost: "text-muted hover:text-text hover:bg-panel-2",
  };
  return (
    <button title={title} onClick={onClick} disabled={disabled} className={clsx("inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50", v[variant], className)}>
      {children}
    </button>
  );
}

export function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-8">
      {eyebrow && <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-orange">{eyebrow}</div>}
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-muted">{sub}</p>}
    </div>
  );
}

export function Stat({ label, value, tone = "text-text" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel/60 px-4 py-3">
      <div className={clsx("text-2xl font-semibold tabular-nums", tone)}>{value}</div>
      <div className="text-xs text-dim">{label}</div>
    </div>
  );
}
