import clsx from "clsx";
import type { Difficulty } from "@/lib/types";

export function DifficultyBadge({ d, className }: { d: Difficulty; className?: string }) {
  const c = d === "Easy" ? "text-mint bg-mint/12 border-mint/30" : d === "Medium" ? "text-amber bg-amber/12 border-amber/35" : "text-rose bg-rose/12 border-rose/30";
  return <span className={clsx("inline-flex items-center rounded-lg border-2 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider", c, className)}>{d}</span>;
}

export function Pill({ children, className, tone = "default" }: { children: React.ReactNode; className?: string; tone?: "default" | "orange" | "violet" | "cyan" | "mint" | "rose" | "amber" }) {
  const tones = {
    default: "bg-panel-2 text-muted border-line",
    orange: "bg-orange/10 text-orange border-orange/25",
    violet: "bg-violet/10 text-violet border-violet/25",
    cyan: "bg-cyan/10 text-cyan border-cyan/25",
    mint: "bg-mint/10 text-mint border-mint/25",
    rose: "bg-rose/10 text-rose border-rose/25",
    amber: "bg-amber/10 text-amber border-amber/30",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
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
  variant?: "primary" | "ghost" | "outline" | "success" | "violet";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const v = {
    primary: "vx-btn bg-orange text-white font-semibold [--btn-edge:var(--orange-edge)]",
    success: "vx-btn bg-mint text-white font-semibold [--btn-edge:var(--mint-edge)]",
    violet: "vx-btn bg-violet text-white font-semibold [--btn-edge:var(--violet-edge)]",
    outline: "vx-btn border-2 border-line bg-panel text-text font-medium",
    ghost: "rounded-xl text-muted hover:text-text hover:bg-panel-2",
  };
  return (
    <button title={title} onClick={onClick} disabled={disabled} className={clsx("inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50", v[variant], className)}>
      {children}
    </button>
  );
}

export function SectionTitle({ eyebrow, title, sub, color = "var(--orange)" }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; color?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <div className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color }}>
          <span className="cube" style={{ background: color }} />
          {eyebrow}
        </div>
      )}
      <h1 className="text-3xl font-bold tracking-tight md:text-[2.6rem] md:leading-[1.1]">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

export function Stat({ label, value, tone = "text-text" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="vx px-4 py-3">
      <div className={clsx("text-2xl font-bold tabular-nums", tone)}>{value}</div>
      <div className="text-xs font-medium text-dim">{label}</div>
    </div>
  );
}
