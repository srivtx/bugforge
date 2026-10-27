import clsx from "clsx";
import type { Difficulty } from "@/lib/types";
import { IsoVoxels, type IsoModel } from "@/components/IsoVoxels";

export function DifficultyBadge({ d, className }: { d: Difficulty; className?: string }) {
  const c = d === "Easy" ? "text-mint bg-mint/12 border-mint/30" : d === "Medium" ? "text-amber bg-amber/12 border-amber/35" : "text-rose bg-rose/12 border-rose/30";
  return <span className={clsx("inline-flex items-center rounded-lg border-2 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider", c, className)}>{d}</span>;
}

// three stacked mini cubes: how hard this is at a glance
export function VoxelMeter({ d, className }: { d: Difficulty; className?: string }) {
  const n = d === "Easy" ? 1 : d === "Medium" ? 2 : 3;
  const c = d === "Easy" ? "var(--mint)" : d === "Medium" ? "var(--amber)" : "var(--rose)";
  return (
    <span title={d} className={clsx("inline-flex items-end gap-[3px]", className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="cube" style={{ width: 10, height: 6 + i * 4, borderRadius: 2, background: i < n ? c : "var(--line)" }} />
      ))}
    </span>
  );
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

export function SectionTitle({ eyebrow, title, sub, color = "var(--orange)", art }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; color?: string; art?: IsoModel }) {
  return (
    <div className="mb-8 flex items-center gap-8">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="px-label mb-3 flex items-center gap-2" style={{ color }}>
            <span className="cube" style={{ background: color }} />
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight md:text-[2.6rem] md:leading-[1.1]">{title}</h1>
        {sub && <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {art && <IsoVoxels model={art} className="hidden h-44 w-auto shrink-0 md:block lg:mr-6 lg:h-52" />}
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
