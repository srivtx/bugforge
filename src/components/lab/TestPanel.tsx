"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { LabRun } from "@/lib/types";

export function TestBlocks({ run, total }: { run: LabRun | null; total: number }) {
  const tests = run?.tests ?? [];
  const n = Math.max(total, tests.length);
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: n }).map((_, i) => {
        const t = tests[i];
        return (
          <motion.span
            key={i + (run ? "r" : "e")}
            initial={{ scale: 0.4, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: i * 0.035, type: "spring", stiffness: 400, damping: 22 }}
            title={t?.name}
            className={clsx(
              "h-3.5 w-3.5 rounded-[4px] ring-1",
              !t && "bg-panel-2 ring-line-2",
              t?.status === "pass" && "bg-mint ring-mint/40 shadow-[0_0_10px_-2px_var(--mint)]",
              t?.status === "fail" && "bg-rose ring-rose/40 shadow-[0_0_10px_-2px_var(--rose)]",
            )}
          />
        );
      })}
    </div>
  );
}

export function TestPanel({ run, running }: { run: LabRun | null; running: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  if (running && !run) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-9 rounded-lg bg-panel-2/60" />
        ))}
      </div>
    );
  }
  if (!run) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-sm text-dim">
        <div>
          <div className="mb-1 text-muted">No run yet</div>
          Press <kbd className="rounded border border-line-2 bg-panel-2 px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl + Enter</kbd> or <span className="text-orange">Run tests</span>
        </div>
      </div>
    );
  }
  const firstFail = run.tests.findIndex((t) => t.status === "fail");
  return (
    <div className="divide-y divide-line/70">
      {run.tests.map((t, i) => {
        const isOpen = open === i || (open === null && i === firstFail);
        return (
          <div key={i}>
            <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-panel-2/50">
              {t.status === "pass" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-mint" /> : <XCircle className="h-4 w-4 shrink-0 text-rose" />}
              <span className={clsx("flex-1 truncate", t.status === "pass" ? "text-muted" : "text-text")}>{t.name}</span>
              <span className="font-mono text-[11px] text-dim">{t.ms.toFixed(0)}ms</span>
              {t.error && <ChevronRight className={clsx("h-3.5 w-3.5 text-dim transition", isOpen && "rotate-90")} />}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && t.error && (
                <motion.pre
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mx-4 mb-3 overflow-x-auto whitespace-pre-wrap rounded-lg border border-rose/25 bg-rose/[0.06] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-rose"
                >
                  {t.error}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function LogsPanel({ run }: { run: LabRun | null }) {
  if (!run || run.logs.length === 0) return <div className="p-6 text-center text-sm text-dim">Nothing logged. `console.log` / `print` output from your code shows up here.</div>;
  return (
    <div className="p-3 font-mono text-[12px] leading-relaxed">
      {run.logs.map((l, i) => (
        <div key={i} className={clsx("flex gap-3 border-b border-line/40 py-1", l.level === "error" ? "text-rose" : l.level === "warn" ? "text-amber" : "text-muted")}>
          <span className="w-14 shrink-0 text-dim">{l.level}</span>
          <span className="whitespace-pre-wrap break-all">{l.text}</span>
        </div>
      ))}
    </div>
  );
}
