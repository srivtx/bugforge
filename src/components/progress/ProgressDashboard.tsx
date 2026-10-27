"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useRef } from "react";
import { ArrowRight, Download, Upload, Trash2 } from "lucide-react";
import { useProgress, getProgress, update, type Progress } from "@/lib/progress";
import { OPS } from "@/lib/mutate";
import { Button } from "@/components/ui";

type L = { slug: string; title: string; kind: "debug" | "build"; lang: "js" | "py" };
type P = { slug: string; title: string; group: string };
type D = { id: string; topic: string; lang: string };

const KEY = "bugforge.progress.v1";

function VoxelBar({ label, done, total, color, href }: { label: string; done: number; total: number; color: string; href: string }) {
  return (
    <Link href={href} className="vx vx-hover block p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-sm text-muted">
          <span className="font-bold text-text">{done}</span>/{total}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: total }, (_, i) => (
          <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.012 }} className="h-4 w-4 rounded-[4px]" style={{ background: i < done ? color : "var(--line)", boxShadow: i < done ? "inset -2px -2px 0 rgba(0,0,0,.2)" : undefined }} />
        ))}
      </div>
    </Link>
  );
}

function Heatmap({ activity }: { activity: Record<string, number> }) {
  const weeks = 20;
  const days = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { key, n: activity[key] || 0, future: d > end };
    });
  }, [activity]);
  const max = Math.max(1, ...days.map((d) => d.n));
  const color = (n: number) => (n === 0 ? "var(--line)" : `color-mix(in oklab, var(--mint) ${30 + (n / max) * 70}%, var(--panel))`);
  return (
    <div className="vx overflow-x-auto p-5 scroll-thin">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-semibold">Activity</span>
        <span className="text-xs text-dim">{Object.keys(activity).length} active days · {Object.values(activity).reduce((a, b) => a + b, 0)} actions</span>
      </div>
      <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
        {days.map((d) => (
          <span key={d.key} title={`${d.key}: ${d.n}`} className="h-3.5 w-3.5 rounded-[4px]" style={{ background: d.future ? "transparent" : color(d.n), boxShadow: d.n ? "inset -2px -2px 0 rgba(0,0,0,.18)" : undefined }} />
        ))}
      </div>
    </div>
  );
}

export function ProgressDashboard({ labs, problems, drills }: { labs: L[]; problems: P[]; drills: D[] }) {
  const p = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const solvedLab = (k: L["kind"]) => labs.filter((l) => l.kind === k && p.labs[l.slug]?.status === "solved").length;
  const dsa = problems.filter((x) => p.problems[x.slug]?.status === "solved").length;
  const drillsDone = drills.filter((d) => p.drills[d.id]).length;
  const drillsRight = drills.filter((d) => p.drills[d.id]?.correct).length;
  const nextLab = labs.find((l) => p.labs[l.slug]?.status !== "solved");
  const nextProblem = problems.find((x) => p.problems[x.slug]?.status !== "solved");
  const species = Object.entries(p.hunts.mutations).sort((a, b) => b[1] - a[1]);
  const opName = (id: string) => OPS.find((o) => o.id === id)?.name ?? id;

  const topics = useMemo(() => {
    const m: Record<string, { right: number; total: number }> = {};
    for (const d of drills) {
      const r = p.drills[d.id];
      if (!r) continue;
      m[d.topic] ||= { right: 0, total: 0 };
      m[d.topic].total++;
      if (r.correct) m[d.topic].right++;
    }
    return Object.entries(m).sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total);
  }, [drills, p.drills]);

  const exportIt = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bugforge-progress.json";
    a.click();
  };
  const importIt = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as Progress;
      localStorage.setItem(KEY, JSON.stringify(data));
      location.reload();
    } catch {
      alert("That file isn't a BugForge progress export.");
    }
  };
  const resetIt = () => {
    if (!confirm("Erase all progress in this browser? This can't be undone.")) return;
    update(() => ({ labs: {}, problems: {}, drills: {}, hunts: { played: 0, solved: 0, bestStreak: 0, streak: 0, mutations: {} }, activity: {} }));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VoxelBar label="Debug labs" done={solvedLab("debug")} total={labs.filter((l) => l.kind === "debug").length} color="var(--rose)" href="/debug" />
        <VoxelBar label="Build labs" done={solvedLab("build")} total={labs.filter((l) => l.kind === "build").length} color="var(--cyan)" href="/build" />
        <VoxelBar label="DSA problems" done={dsa} total={problems.length} color="var(--violet)" href="/dsa" />
        <VoxelBar label="Drills answered" done={drillsDone} total={drills.length} color="var(--amber)" href="/drills" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Heatmap activity={p.activity} />
        <div className="vx p-5">
          <div className="mb-3 font-semibold">Bug Hunt</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [p.hunts.solved, "cleared"],
              [p.hunts.streak, "streak"],
              [p.hunts.bestStreak, "best"],
            ].map(([v, l]) => (
              <div key={l} className="vx-sm py-2">
                <div className="text-xl font-bold tabular-nums">{v}</div>
                <div className="text-[11px] text-dim">{l}</div>
              </div>
            ))}
          </div>
          {p.hunts.fastestMs !== undefined && <div className="mt-3 text-sm text-muted">Fastest clear: {(p.hunts.fastestMs / 1000).toFixed(1)}s</div>}
          {species.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs font-semibold uppercase tracking-widest text-dim">bug species caught</div>
              {species.slice(0, 5).map(([id, n]) => (
                <div key={id} className="flex justify-between text-sm">
                  <span>{opName(id)}</span>
                  <span className="font-mono text-dim">×{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="vx p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-semibold">Drill accuracy by topic</span>
            <span className="font-mono text-sm text-muted">{drillsDone ? Math.round((drillsRight / drillsDone) * 100) : 0}% overall</span>
          </div>
          {topics.length === 0 && <p className="text-sm text-dim">Answer some Spot the Bug drills to see your weak spots here.</p>}
          <div className="space-y-2">
            {topics.slice(0, 8).map(([t, s]) => {
              const pct = s.right / s.total;
              return (
                <div key={t}>
                  <div className="flex justify-between text-sm">
                    <span>{t}</span>
                    <span className="font-mono text-dim">
                      {s.right}/{s.total}
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-line">
                    <div className="h-2.5 rounded-full" style={{ width: `${pct * 100}%`, background: pct < 0.5 ? "var(--rose)" : pct < 0.8 ? "var(--amber)" : "var(--mint)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="vx p-5">
          <div className="mb-3 font-semibold">Up next</div>
          <div className="space-y-2">
            {nextLab && (
              <Link href={`/lab/${nextLab.slug}`} className="vx-sm vx-hover flex items-center justify-between px-4 py-3">
                <span>
                  <span className="text-xs text-dim">{nextLab.kind === "debug" ? "Debug lab" : "Build lab"} · </span>
                  {nextLab.title}
                </span>
                <ArrowRight className="h-4 w-4 text-orange" />
              </Link>
            )}
            {nextProblem && (
              <Link href={`/dsa/${nextProblem.slug}`} className="vx-sm vx-hover flex items-center justify-between px-4 py-3">
                <span>
                  <span className="text-xs text-dim">DSA · </span>
                  {nextProblem.title}
                </span>
                <ArrowRight className="h-4 w-4 text-orange" />
              </Link>
            )}
            <Link href="/hunt" className="vx-sm vx-hover flex items-center justify-between px-4 py-3">
              <span>
                <span className="text-xs text-dim">Warm-up · </span>3 Bug Hunts
              </span>
              <ArrowRight className="h-4 w-4 text-orange" />
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t-2 border-line pt-4">
            <Button variant="outline" onClick={exportIt}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => file.current?.click()}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importIt(e.target.files[0])} />
            <Button variant="ghost" onClick={resetIt} className="ml-auto text-rose">
              <Trash2 className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
