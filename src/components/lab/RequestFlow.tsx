"use client";
// Visualises each HTTP request the tests made as a chain of blocks:
// request -> middleware -> handler -> db calls -> response
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Database, Shield, Server, AlertTriangle, ArrowRight, GitBranch, Box, Rows3, RotateCcw, Maximize2, X } from "lucide-react";

const Flow3D = dynamic(() => import("@/components/three/Flow3D").then((m) => m.Flow3D), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-dim">Building voxel world…</div>,
});
import type { LabRun, TraceStep } from "@/lib/types";

const KIND = {
  middleware: { icon: Shield, cls: "border-violet/40 bg-violet/10 text-violet", label: "middleware" },
  router: { icon: GitBranch, cls: "border-line-2 bg-panel-2 text-muted", label: "router" },
  handler: { icon: Server, cls: "border-cyan/40 bg-cyan/10 text-cyan", label: "handler" },
  db: { icon: Database, cls: "border-amber/40 bg-amber/10 text-amber", label: "db" },
  error: { icon: AlertTriangle, cls: "border-rose/50 bg-rose/10 text-rose", label: "error" },
} as const;

function statusTone(s: number | "timeout" | null) {
  if (s === "timeout" || s === null) return "bg-rose/15 text-rose border-rose/40";
  if (s >= 500) return "bg-rose/15 text-rose border-rose/40";
  if (s >= 400) return "bg-amber/15 text-amber border-amber/40";
  if (s >= 300) return "bg-violet/15 text-violet border-violet/40";
  return "bg-mint/15 text-mint border-mint/40";
}

function Block({ step, i }: { step: TraceStep; i: number }) {
  const k = KIND[step.kind] ?? KIND.router;
  const Icon = k.icon;
  return (
    <>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-line-2" />
      <motion.div
        initial={{ opacity: 0, y: 8, rotateX: -40 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: 0.06 * i, type: "spring", stiffness: 300, damping: 20 }}
        title={step.detail || step.name}
        className={clsx("flex max-w-[240px] shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[11px] [box-shadow:0_3px_0_0_rgba(0,0,0,0.35)]", k.cls)}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{step.name}</span>
        {step.detail && step.kind === "db" && <span className="truncate text-[10px] opacity-60">{step.detail}</span>}
      </motion.div>
    </>
  );
}

export function RequestFlow({ run }: { run: LabRun | null }) {
  const tests = useMemo(() => Array.from(new Set((run?.traces ?? []).map((t) => t.test || "setup"))), [run]);
  const [sel, setSel] = useState<string | null>(null);
  const [mode, setMode] = useState<"blocks" | "3d">("blocks");
  const [reqIdx, setReqIdx] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const [full, setFull] = useState(false);
  if (!run || run.traces.length === 0) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-sm text-dim">
        <div className="max-w-sm">
          Run the tests to see every HTTP request flow through your middleware, handlers and database calls as blocks.
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {Object.entries(KIND).map(([k, v]) => (
              <span key={k} className={clsx("rounded-md border px-2 py-0.5 font-mono text-[11px]", v.cls)}>
                {v.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  const current = sel ?? tests.find((t) => run.tests.find((x) => x.name === t)?.status === "fail") ?? tests[0];
  const traces = run.traces.filter((t) => (t.test || "setup") === current);
  return (
    <div className="flex h-full min-h-0">
      <div className="scroll-thin w-56 shrink-0 overflow-y-auto border-r border-line/70 py-1">
        {tests.map((t) => {
          const st = run.tests.find((x) => x.name === t)?.status;
          return (
            <button key={t} onClick={() => (setSel(t), setReqIdx(0), setPlayKey((k) => k + 1))} className={clsx("flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs", t === current ? "bg-panel-2 text-text" : "text-muted hover:text-text")}>
              <span className={clsx("h-2 w-2 shrink-0 rounded-sm", st === "pass" ? "bg-mint" : st === "fail" ? "bg-rose" : "bg-dim")} />
              <span className="truncate">{t}</span>
            </button>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line/70 px-3 py-1.5">
        <div className="flex rounded-lg border-2 border-line bg-panel p-0.5">
          {(
            [
              ["blocks", "Blocks", Rows3],
              ["3d", "3D world", Box],
            ] as const
          ).map(([m, l, I]) => (
            <button key={m} onClick={() => setMode(m)} className={clsx("flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium", mode === m ? "bg-orange text-white" : "text-muted hover:text-text")}>
              <I className="h-3 w-3" /> {l}
            </button>
          ))}
        </div>
        {mode === "3d" && traces.length > 0 && (
          <>
            <select value={reqIdx} onChange={(e) => (setReqIdx(Number(e.target.value)), setPlayKey((k) => k + 1))} className="max-w-[260px] rounded-lg border-2 border-line bg-panel px-2 py-1 font-mono text-[11px]">
              {traces.map((tr, i) => (
                <option key={tr.id} value={i}>
                  #{i + 1} {tr.method} {tr.url} → {String(tr.status)}
                </option>
              ))}
            </select>
            <button onClick={() => setPlayKey((k) => k + 1)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted hover:text-text">
              <RotateCcw className="h-3 w-3" /> replay
            </button>
            <button onClick={() => (setFull(true), setPlayKey((k) => k + 1))} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted hover:text-text">
              <Maximize2 className="h-3 w-3" /> expand
            </button>
            <span className="ml-auto hidden text-[11px] text-dim sm:block">drag to orbit · scroll to zoom · glowing voxels = documents your query matched</span>
          </>
        )}
      </div>
      {full && traces[reqIdx] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg" onClick={() => setFull(false)}>
          <div className="flex items-center gap-3 border-b-2 border-line px-5 py-3" onClick={(e) => e.stopPropagation()}>
            <Box className="h-4 w-4 text-orange" />
            <span className="font-semibold">Request world</span>
            <span className="truncate font-mono text-xs text-muted">{current}</span>
            <select value={reqIdx} onChange={(e) => (setReqIdx(Number(e.target.value)), setPlayKey((k) => k + 1))} className="max-w-[320px] rounded-lg border-2 border-line bg-panel px-2 py-1 font-mono text-xs">
              {traces.map((tr, i) => (
                <option key={tr.id} value={i}>
                  #{i + 1} {tr.method} {tr.url} → {String(tr.status)}
                </option>
              ))}
            </select>
            <button onClick={() => setPlayKey((k) => k + 1)} className="vx-btn flex items-center gap-1 border-2 border-line bg-panel px-3 py-1 text-xs">
              <RotateCcw className="h-3 w-3" /> replay
            </button>
            <button onClick={() => setFull(false)} className="ml-auto rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-text">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
            <Flow3D key={`full-${current}-${reqIdx}`} trace={traces[reqIdx]} playKey={playKey} />
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-2 text-[11px]">
              {[
                ["request", "#ff7a1a"],
                ["middleware", "#6c5cf5"],
                ["handler", "#0aa6c9"],
                ["collection (1 voxel = 1 document)", "#10a874"],
                ["matched by the query", "#ffd23f"],
              ].map(([l, c]) => (
                <span key={l} className="vx-sm flex items-center gap-1.5 px-2.5 py-1">
                  <span className="cube" style={{ background: c, width: 10, height: 10 }} /> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {mode === "3d" ? (
        <div className="relative min-h-0 flex-1">
          {traces[reqIdx] ? <Flow3D key={`${current}-${reqIdx}`} trace={traces[reqIdx]} playKey={playKey} /> : <div className="p-4 text-sm text-dim">This test made no HTTP requests (unit test).</div>}
        </div>
      ) : (
      <div className="scroll-thin min-w-0 flex-1 space-y-2.5 overflow-auto p-3 [perspective:600px]" key={current}>
        {traces.map((tr, ti) => (
          <motion.div key={tr.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ti * 0.08 }} className="rounded-xl border border-line/80 bg-bg-2/70 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="shrink-0 rounded-lg border border-line-2 bg-panel-2 px-2 py-1 font-mono text-[11px] [box-shadow:0_3px_0_0_rgba(0,0,0,0.35)]">
                <span className="text-orange">{tr.method}</span> <span className="text-text">{tr.url.length > 42 ? tr.url.slice(0, 42) + "…" : tr.url}</span>
              </span>
              {tr.steps.map((s, i) => (
                <Block key={i} step={s} i={i + 1} />
              ))}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-line-2" />
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.06 * (tr.steps.length + 1), type: "spring" }}
                className={clsx("shrink-0 rounded-lg border px-2 py-1 font-mono text-[11px] font-semibold", statusTone(tr.status))}
              >
                {tr.status === "timeout" ? "⏱ no response" : tr.status}
              </motion.span>
            </div>
            {tr.body !== null && tr.body !== undefined && (
              <div className="mt-1.5 truncate pl-1 font-mono text-[11px] text-dim">↳ {JSON.stringify(tr.body).slice(0, 160)}</div>
            )}
          </motion.div>
        ))}
        {traces.length === 0 && <div className="p-4 text-sm text-dim">This test made no HTTP requests (unit test).</div>}
      </div>
      )}
      </div>
    </div>
  );
}
