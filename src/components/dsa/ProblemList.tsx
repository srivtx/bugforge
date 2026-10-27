"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, CircleDot, Search, Boxes } from "lucide-react";
import type { Difficulty } from "@/lib/types";
import { DifficultyBadge, VoxelMeter } from "@/components/ui";
import { useProgress } from "@/lib/progress";

type Slim = { slug: string; title: string; difficulty: Difficulty; patterns: string[]; group: string; freq: number; testCount: number; viz: boolean };

const GROUPS: Record<string, { label: string; color: string; blurb: string }> = {
  hashing: { label: "Hashing & prefix sums", color: "var(--orange)", blurb: "Trade memory for O(1) lookups." },
  windows: { label: "Two pointers & windows", color: "var(--violet)", blurb: "Move boundaries instead of re-scanning." },
  "search-stack-heap": { label: "Binary search, stacks & heaps", color: "var(--cyan)", blurb: "Halve it, stack it, or always grab the smallest." },
  "graphs-dp": { label: "Graphs & dynamic programming", color: "var(--mint)", blurb: "Explore level by level; reuse sub-answers." },
};

export function ProblemList({ problems }: { problems: Slim[] }) {
  const progress = useProgress();
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState<"all" | Difficulty>("all");
  const [status, setStatus] = useState<"all" | "todo" | "solved">("all");
  const shown = useMemo(
    () =>
      problems.filter((p) => {
        const st = progress.problems[p.slug]?.status;
        return (diff === "all" || p.difficulty === diff) && (status === "all" || (status === "solved" ? st === "solved" : st !== "solved")) && (!q || (p.title + p.patterns.join(" ")).toLowerCase().includes(q.toLowerCase()));
      }),
    [problems, q, diff, status, progress],
  );
  const solved = problems.filter((p) => progress.problems[p.slug]?.status === "solved").length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems, patterns…" className="w-64 rounded-xl border-2 border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none placeholder:text-dim focus:border-violet/60" />
        </div>
        <Seg value={diff} set={setDiff} opts={[["all", "Any"], ["Easy", "Easy"], ["Medium", "Medium"], ["Hard", "Hard"]]} />
        <Seg value={status} set={setStatus} opts={[["all", "All"], ["todo", "To do"], ["solved", "Solved"]]} />
        <div className="ml-auto flex items-center gap-3 text-sm text-muted">
          <div className="flex gap-0.5">
            {problems.map((p) => (
              <span key={p.slug} className="h-3 w-2 rounded-[3px]" style={{ background: progress.problems[p.slug]?.status === "solved" ? "var(--mint)" : "var(--line)" }} />
            ))}
          </div>
          <span>
            <span className="font-semibold text-mint">{solved}</span> / {problems.length}
          </span>
        </div>
      </div>

      <div className="space-y-10">
        {Object.entries(GROUPS).map(([g, meta]) => {
          const list = shown.filter((p) => p.group === g);
          if (!list.length) return null;
          return (
            <section key={g}>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="cube" style={{ background: meta.color }} />
                <h2 className="text-xl font-bold">{meta.label}</h2>
                <span className="hidden text-sm text-dim sm:inline">{meta.blurb}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p, i) => {
                  const st = progress.problems[p.slug]?.status;
                  return (
                    <motion.div key={p.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                      <Link href={`/dsa/${p.slug}`} className="clay vx-hover group flex h-full flex-col p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <DifficultyBadge d={p.difficulty} />
                          {p.viz && (
                            <span title="Has a step-by-step visualization" className="flex items-center gap-1 text-[11px] text-cyan">
                              <Boxes className="h-3.5 w-3.5" /> viz
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-2"><VoxelMeter d={p.difficulty} />{st === "solved" ? <CheckCircle2 className="h-5 w-5 text-mint" /> : st === "attempted" ? <CircleDot className="h-5 w-5 text-amber" /> : null}</span>
                        </div>
                        <h3 className="font-semibold leading-snug group-hover:text-violet">{p.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.patterns.map((x) => (
                            <span key={x} className="rounded-md bg-panel-2 px-2 py-0.5 text-[11px] text-dim ring-1 ring-line">
                              {x}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center gap-3 pt-3 font-mono text-[11px] text-dim">
                          <span className="flex items-center gap-1" title="How often this pattern shows up in coding rounds">
                            {Array.from({ length: 5 }, (_, k) => (
                              <span key={k} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: k < p.freq ? meta.color : "var(--line)" }} />
                            ))}
                          </span>
                          <span>{p.testCount} tests</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!shown.length && <div className="vx p-10 text-center text-muted">Nothing matches those filters.</div>}
      </div>
    </div>
  );
}

function Seg<T extends string>({ value, set, opts }: { value: T; set: (v: T) => void; opts: [T, string][] }) {
  return (
    <div className="flex rounded-xl border-2 border-line bg-panel p-0.5">
      {opts.map(([v, label]) => (
        <button key={v} onClick={() => set(v)} className={clsx("rounded-lg px-3 py-1.5 text-xs transition", value === v ? "bg-violet font-semibold text-white" : "text-muted hover:text-text")}>
          {label}
        </button>
      ))}
    </div>
  );
}
