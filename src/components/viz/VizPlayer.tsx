"use client";
// Plays a list of Frames: voxel cell strips, pointers, side structures, DP tables, graphs, timelines, 3D grids.
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Box, Square } from "lucide-react";
import clsx from "clsx";
import type { Frame, Tone } from "@/viz/frames";

const VoxelGrid = dynamic(() => import("@/components/three/VoxelGrid").then((m) => m.VoxelGrid), {
  ssr: false,
  loading: () => <div className="shimmer h-full w-full rounded-xl" />,
});

const TONE: Record<Tone, { bg: string; edge: string; fg: string }> = {
  idle: { bg: "var(--panel)", edge: "var(--edge)", fg: "var(--text)" },
  active: { bg: "var(--orange)", edge: "var(--orange-edge)", fg: "#fff" },
  window: { bg: "color-mix(in oklab, var(--violet) 22%, var(--panel))", edge: "var(--violet-edge)", fg: "var(--text)" },
  done: { bg: "var(--mint)", edge: "var(--mint-edge)", fg: "#fff" },
  dim: { bg: "var(--panel-2)", edge: "var(--line)", fg: "var(--dim)" },
  hit: { bg: "var(--amber)", edge: "color-mix(in oklab, var(--amber) 60%, #000)", fg: "#1d1b26" },
  bad: { bg: "var(--rose)", edge: "color-mix(in oklab, var(--rose) 60%, #000)", fg: "#fff" },
  mid: { bg: "var(--cyan)", edge: "color-mix(in oklab, var(--cyan) 60%, #000)", fg: "#fff" },
};
const POINTER_COLORS = ["var(--orange)", "var(--violet)", "var(--cyan)", "var(--rose)"];
const spring = { type: "spring", stiffness: 380, damping: 28 } as const;

function Block({ v, tone = "idle", h, w }: { v: string | number; tone?: Tone; h?: number; w: number }) {
  const t = TONE[tone];
  return (
    <motion.div
      layout
      transition={spring}
      animate={{ backgroundColor: t.bg, boxShadow: `0 4px 0 ${t.edge}`, color: t.fg, height: h ?? w }}
      className="grid shrink-0 place-items-center rounded-[10px] border-2 border-black/5 font-mono text-[13px] font-bold"
      style={{ width: w }}
    >
      {String(v)}
    </motion.div>
  );
}

function Cells({ f }: { f: Frame }) {
  const cells = f.cells!;
  const w = cells.length > 14 ? 30 : cells.length > 10 ? 36 : 44;
  const nums = cells.map((c) => (typeof c.v === "number" ? c.v : NaN));
  const max = Math.max(1, ...nums.filter((x) => !Number.isNaN(x)).map(Math.abs));
  const pointers = Object.entries(f.pointers ?? {});
  return (
    <div className="overflow-x-auto scroll-thin pb-2">
      <div className="mx-auto flex w-max flex-col items-center gap-1.5 px-2 pt-2">
        <div className="flex items-end gap-1.5" style={{ minHeight: f.bars ? 150 : w }}>
          {cells.map((c, i) => (
            <Block key={i} v={c.v} tone={c.tone} w={w} h={f.bars && typeof c.v === "number" ? 26 + (Math.abs(c.v) / max) * 120 : undefined} />
          ))}
        </div>
        <div className="flex gap-1.5">
          {cells.map((_, i) => (
            <div key={i} className="text-center font-mono text-[10px] text-dim" style={{ width: w }}>
              {i}
            </div>
          ))}
        </div>
        <div className="relative h-7" style={{ width: cells.length * (w + 6) - 6 }}>
          {pointers.map(([name, idx], k) => (
            <motion.div
              key={name}
              animate={{ x: idx * (w + 6) + w / 2 - 14 + k * 3 }}
              transition={spring}
              className="absolute top-0 flex w-7 flex-col items-center"
              style={{ zIndex: 10 - k }}
            >
              <div className="h-0 w-0 border-x-[6px] border-b-[7px] border-x-transparent" style={{ borderBottomColor: POINTER_COLORS[k % 4] }} />
              <div className="rounded-md px-1.5 font-mono text-[10.5px] font-bold text-white" style={{ background: POINTER_COLORS[k % 4] }}>
                {name}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Side({ side }: { side: NonNullable<Frame["side"]> }) {
  const kind = side.kind ?? "map";
  return (
    <div className="vx-sm min-w-[150px] p-3">
      <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-dim">{side.title}</div>
      {kind === "stack" ? (
        <div className="flex min-h-[60px] flex-col-reverse gap-1">
          <AnimatePresence initial={false}>
            {side.items.map((it, i) => (
              <motion.div
                key={i + it.k}
                initial={{ y: -24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ x: 30, opacity: 0 }}
                transition={spring}
                className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1 font-mono text-[12.5px] font-bold"
                style={{ background: i === side.items.length - 1 ? "var(--violet)" : "color-mix(in oklab, var(--violet) 18%, var(--panel))", color: i === side.items.length - 1 ? "#fff" : "var(--text)", boxShadow: "0 3px 0 var(--violet-edge)" }}
              >
                <span>{it.k}</span>
                {it.v && <span className="opacity-70">h={it.v}</span>}
              </motion.div>
            ))}
          </AnimatePresence>
          {side.items.length === 0 && <div className="text-xs text-dim">empty</div>}
        </div>
      ) : (
        <div className={clsx("flex flex-wrap gap-1.5", kind === "heap" && "items-end")}>
          <AnimatePresence initial={false}>
            {side.items.map((it, i) => {
              const t = TONE[it.tone ?? "idle"];
              return (
                <motion.div
                  layout
                  key={kind === "heap" ? i + ":" + it.k : it.k}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, backgroundColor: t.bg, color: t.fg }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={spring}
                  className="flex items-center gap-1 rounded-lg border-2 border-line px-2 py-1 font-mono text-[12px] font-bold"
                  style={{ boxShadow: `0 3px 0 ${t.edge}` }}
                >
                  {it.k}
                  {it.v !== undefined && <span className="opacity-60">→ {it.v}</span>}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {side.items.length === 0 && <div className="text-xs text-dim">empty</div>}
        </div>
      )}
    </div>
  );
}

function Table({ t }: { t: NonNullable<Frame["table"]> }) {
  const from = new Set((t.from ?? []).map(([r, c]) => `${r},${c}`));
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="mx-auto border-separate border-spacing-1 font-mono text-[12.5px]">
        <thead>
          <tr>
            <th />
            {t.cols.map((c, j) => (
              <th key={j} className={clsx("px-2 text-dim", t.active?.[1] === j && "text-orange")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.data.map((row, i) => (
            <tr key={i}>
              <th className={clsx("px-2 text-dim", t.active?.[0] === i && "text-orange")}>{t.rows[i]}</th>
              {row.map((v, j) => {
                const active = t.active?.[0] === i && t.active?.[1] === j;
                const isFrom = from.has(`${i},${j}`);
                const tone: Tone = active ? "active" : isFrom ? "hit" : v === null ? "dim" : "idle";
                const s = TONE[tone];
                return (
                  <td key={j} className="h-8 w-8 rounded-md text-center font-bold transition-all" style={{ background: s.bg, color: s.fg, boxShadow: `0 2px 0 ${s.edge}` }}>
                    {v ?? ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Graph({ g }: { g: NonNullable<Frame["graph"]> }) {
  const W = 360;
  const H = 220;
  const pos = Array.from({ length: g.n }, (_, i) => {
    const a = (i / g.n) * Math.PI * 2 - Math.PI / 2;
    return [W / 2 + Math.cos(a) * 140, H / 2 + Math.sin(a) * 80];
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[460px]">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--line-2)" />
        </marker>
      </defs>
      {g.edges.map(([a, b], i) => {
        const [x1, y1] = pos[a];
        const [x2, y2] = pos[b];
        const d = Math.hypot(x2 - x1, y2 - y1);
        const ux = (x2 - x1) / d;
        const uy = (y2 - y1) / d;
        return <line key={i} x1={x1 + ux * 20} y1={y1 + uy * 20} x2={x2 - ux * 22} y2={y2 - uy * 22} stroke={g.done.includes(a) ? "var(--mint)" : "var(--line-2)"} strokeWidth={2.5} markerEnd="url(#arr)" />;
      })}
      {pos.map(([x, y], i) => {
        const tone: Tone = g.active === i ? "active" : g.done.includes(i) ? "done" : g.ready.includes(i) ? "hit" : "idle";
        const t = TONE[tone];
        return (
          <g key={i} style={{ transition: "all .3s" }}>
            <rect x={x - 18} y={y - 14} width={36} height={32} rx={9} fill={t.edge} />
            <rect x={x - 18} y={y - 18} width={36} height={32} rx={9} fill={t.bg} stroke="var(--line)" strokeWidth={2} />
            <text x={x} y={y + 3} textAnchor="middle" fontSize="13" fontWeight="700" fill={t.fg} fontFamily="var(--font-code)">
              {i}
            </text>
            <text x={x + 22} y={y - 14} fontSize="10" fill="var(--dim)" fontFamily="var(--font-code)">
              in:{g.indeg[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Timeline({ t }: { t: NonNullable<Frame["timeline"]> }) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-1.5">
      {t.items.map((it, i) => {
        const s = TONE[it.tone];
        return (
          <div key={i} className="relative h-6 rounded-md bg-panel-2">
            <motion.div
              layout
              transition={spring}
              className="absolute top-0 flex h-6 items-center justify-center rounded-md font-mono text-[10.5px] font-bold"
              style={{ left: `${(it.s / t.max) * 100}%`, width: `${Math.max(2, ((it.e - it.s) / t.max) * 100)}%`, background: s.bg, color: s.fg, boxShadow: `0 2px 0 ${s.edge}` }}
            >
              {it.label ?? `${it.s}–${it.e}`}
            </motion.div>
          </div>
        );
      })}
      <div className="flex justify-between font-mono text-[10px] text-dim">
        <span>0</span>
        <span>{t.max}</span>
      </div>
    </div>
  );
}

function Grid2D({ g, islands }: { g: NonNullable<Frame["grid"]>; islands?: boolean }) {
  const WAVE = ["var(--rose)", "var(--orange)", "var(--amber)", "var(--mint)", "var(--cyan)", "var(--violet)"];
  return (
    <div className="mx-auto grid w-max gap-1" style={{ gridTemplateColumns: `repeat(${g.cells[0].length}, 34px)` }}>
      {g.cells.flatMap((row, r) =>
        row.map((v, c) => {
          const d = g.dist[r][c];
          const bg = d !== null ? WAVE[d % WAVE.length] : v === "#" ? "var(--line-2)" : v === "0" ? "color-mix(in oklab, var(--cyan) 15%, var(--panel))" : "var(--panel)";
          return (
            <div key={`${r}-${c}`} className={clsx("grid h-[34px] place-items-center rounded-md border-2 border-line font-mono text-[11px] font-bold transition-all", d === g.wave && d !== null && "scale-110")} style={{ background: bg, color: d !== null ? "#fff" : "var(--dim)" }}>
              {v === "S" || v === "T" ? v : d !== null ? (islands ? "#" + d : d) : v === "#" ? "" : ""}
            </div>
          );
        }),
      )}
    </div>
  );
}

export function VizPlayer({ frames, compact, islands }: { frames: Frame[]; compact?: boolean; islands?: boolean }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [three, setThree] = useState(true);
  const n = frames.length;
  useEffect(() => setI(0), [frames]);
  useEffect(() => {
    if (!playing) return;
    if (i >= n - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setI((x) => Math.min(n - 1, x + 1)), 1100 / speed);
    return () => clearTimeout(t);
  }, [playing, i, n, speed]);
  const f = frames[Math.min(i, n - 1)];
  const isIslands = useMemo(() => islands ?? frames.some((x) => x.grid && x.grid.cells.flat().includes("1") && !x.grid.cells.flat().includes("2")), [frames, islands]);
  if (!f) return <div className="p-6 text-sm text-dim">No frames: check the input.</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className={clsx("flex flex-col gap-4", !compact && "lg:flex-row lg:items-start")}>
        <div className="min-w-0 flex-1 space-y-4">
          {f.cells && <Cells f={f} />}
          {f.table && <Table t={f.table} />}
          {f.graph && <Graph g={f.graph} />}
          {f.timeline && <Timeline t={f.timeline} />}
          {f.grid && (
            <div>
              <div className="mb-2 flex justify-end gap-1">
                <button onClick={() => setThree(true)} className={clsx("flex items-center gap-1 rounded-lg px-2 py-1 text-xs", three ? "bg-violet text-white" : "text-muted hover:bg-panel-2")}>
                  <Box className="h-3.5 w-3.5" /> 3D
                </button>
                <button onClick={() => setThree(false)} className={clsx("flex items-center gap-1 rounded-lg px-2 py-1 text-xs", !three ? "bg-violet text-white" : "text-muted hover:bg-panel-2")}>
                  <Square className="h-3.5 w-3.5" /> 2D
                </button>
              </div>
              {three ? (
                <div className="h-[300px] w-full overflow-hidden rounded-xl bg-panel-2/60">
                  <VoxelGrid cells={f.grid.cells} dist={f.grid.dist} wave={f.grid.wave} islands={isIslands} />
                </div>
              ) : (
                <Grid2D g={f.grid} islands={isIslands} />
              )}
            </div>
          )}
        </div>
        {f.side && (
          <div className={clsx(!compact && "lg:w-60")}>
            <Side side={f.side} />
          </div>
        )}
      </div>

      {f.stat && (
        <div className="flex flex-wrap justify-center gap-2">
          {f.stat.map((s) => (
            <div key={s.label} className="vx-sm px-3 py-1.5 text-center">
              <div className="font-mono text-[13px] font-bold tabular-nums">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-dim">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="rounded-xl border-2 border-line bg-panel-2 px-4 py-3 text-[14px] leading-relaxed">
          <span className="mr-2 font-mono text-xs font-bold text-orange">
            {i + 1}/{n}
          </span>
          {f.note}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2">
        <button aria-label="Restart" onClick={() => (setI(0), setPlaying(false))} className="vx-btn grid h-9 w-9 place-items-center border-2 border-line bg-panel text-muted">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button aria-label="Previous step" onClick={() => setI((x) => Math.max(0, x - 1))} className="vx-btn grid h-9 w-9 place-items-center border-2 border-line bg-panel text-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button aria-label={playing ? "Pause" : "Play"} onClick={() => (i >= n - 1 && setI(0), setPlaying((p) => !p))} className="vx-btn grid h-9 w-11 place-items-center bg-orange text-white [--btn-edge:var(--orange-edge)]">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button aria-label="Next step" onClick={() => setI((x) => Math.min(n - 1, x + 1))} className="vx-btn grid h-9 w-9 place-items-center border-2 border-line bg-panel text-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
        <input type="range" min={0} max={n - 1} value={i} onChange={(e) => (setI(+e.target.value), setPlaying(false))} className="mx-1 min-w-[120px] flex-1 accent-[var(--orange)]" />
        <select value={speed} onChange={(e) => setSpeed(+e.target.value)} className="rounded-lg border-2 border-line bg-panel px-2 py-1.5 text-xs">
          {[0.5, 1, 2, 4].map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
