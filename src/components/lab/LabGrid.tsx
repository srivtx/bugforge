"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Clock, CircleDot, Search } from "lucide-react";
import type { Slim } from "@/lib/slim";
import { DifficultyBadge, Pill, VoxelMeter } from "@/components/ui";
import { useProgress } from "@/lib/progress";


export function LabGrid({ labs }: { labs: Slim[] }) {
  const progress = useProgress();
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<"all" | "js" | "py">("all");
  const [diff, setDiff] = useState<"all" | "Easy" | "Medium" | "Hard">("all");
  const shown = useMemo(
    () =>
      labs.filter(
        (l) =>
          (lang === "all" || l.lang === lang) &&
          (diff === "all" || l.difficulty === diff) &&
          (!q || (l.title + l.tagline + l.concepts.join(" ")).toLowerCase().includes(q.toLowerCase())),
      ),
    [labs, q, lang, diff],
  );
  const solved = labs.filter((l) => progress.labs[l.slug]?.status === "solved").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search labs, concepts…" className="w-64 rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none placeholder:text-dim focus:border-orange/60" />
        </div>
        <Seg value={lang} set={setLang} opts={[["all", "All"], ["js", "Node.js"], ["py", "Python"]]} />
        <Seg value={diff} set={setDiff} opts={[["all", "Any"], ["Easy", "Easy"], ["Medium", "Medium"], ["Hard", "Hard"]]} />
        <div className="ml-auto text-sm text-muted">
          <span className="font-semibold text-mint">{solved}</span> / {labs.length} solved
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((l, i) => {
          const st = progress.labs[l.slug]?.status;
          return (
            <motion.div key={l.slug} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
              <Link href={`/lab/${l.slug}`} className="clay vx-hover group flex h-full flex-col overflow-hidden p-5">
                <div className={clsx("absolute inset-x-5 top-0 h-1 rounded-b-full opacity-60 transition group-hover:opacity-100", l.kind === "build" ? "bg-cyan" : l.lang === "py" ? "bg-violet" : "bg-orange")} />
                <div className="mb-3 flex items-center gap-2">
                  <DifficultyBadge d={l.difficulty} />
                  <Pill tone={l.lang === "py" ? "cyan" : "orange"}>{l.lang === "py" ? "Python" : "Node.js"}</Pill>
                  <span className="ml-auto flex items-center gap-2">
                    <VoxelMeter d={l.difficulty} />
                    {st === "solved" ? <CheckCircle2 className="h-5 w-5 text-mint" /> : st === "attempted" ? <CircleDot className="h-5 w-5 text-amber" /> : null}
                  </span>
                </div>
                <h3 className="text-lg font-semibold leading-snug group-hover:text-orange">{l.title}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted">{l.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {l.concepts.slice(0, 3).map((c) => (
                    <span key={c} className="rounded-md bg-bg-2 px-2 py-0.5 text-[11px] text-dim ring-1 ring-line">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-line/70 pt-3 font-mono text-[11px] text-dim">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {l.minutes}m
                  </span>
                  <span>{l.files} files</span>
                  <span>{l.tests} tests</span>
                  <span className={l.kind === "build" ? "text-cyan" : "text-rose"}>
                    {l.bugs} {l.kind === "build" ? "steps" : "bugs"}
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Seg<T extends string>({ value, set, opts }: { value: T; set: (v: T) => void; opts: [T, string][] }) {
  return (
    <div className="flex rounded-lg border border-line bg-panel p-0.5">
      {opts.map(([v, label]) => (
        <button key={v} onClick={() => set(v)} className={clsx("rounded-md px-3 py-1.5 text-xs transition", value === v ? "bg-panel-2 text-text ring-1 ring-line-2" : "text-muted hover:text-text")}>
          {label}
        </button>
      ))}
    </div>
  );
}
