"use client";
// Visualises each HTTP request the tests made as a chain of blocks:
// request -> middleware -> handler -> db calls -> response
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Database, Shield, Server, AlertTriangle, ArrowRight, GitBranch } from "lucide-react";
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
            <button key={t} onClick={() => setSel(t)} className={clsx("flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs", t === current ? "bg-panel-2 text-text" : "text-muted hover:text-text")}>
              <span className={clsx("h-2 w-2 shrink-0 rounded-sm", st === "pass" ? "bg-mint" : st === "fail" ? "bg-rose" : "bg-dim")} />
              <span className="truncate">{t}</span>
            </button>
          );
        })}
      </div>
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
    </div>
  );
}
