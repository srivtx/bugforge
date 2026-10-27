"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  ArrowLeft, Play, RotateCcw, FileCode2, FolderOpen, Lock, Lightbulb, ScrollText, Wrench, Workflow, Terminal, ListChecks, Eye, Timer, Trophy, GitCompare, CheckCircle2, Bug, Hammer,
} from "lucide-react";
import type { Lab, LabRun } from "@/lib/types";
import { runLab } from "@/lib/runners";
import { update, loadDraft, saveDraft, clearDraft, useProgress } from "@/lib/progress";
import { Markdown } from "@/components/Markdown";
import { DifficultyBadge, Button, Pill } from "@/components/ui";
import { langFor } from "@/components/CodeEditor";
import { TestBlocks, TestPanel, LogsPanel } from "./TestPanel";
import { RequestFlow } from "./RequestFlow";

const CodeEditor = dynamic(() => import("@/components/CodeEditor").then((m) => m.CodeEditor), { ssr: false });
const DiffEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.DiffEditor), { ssr: false });

type LeftTab = "ticket" | "hints" | "notes";
type BottomTab = "tests" | "flow" | "logs";

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function buildTree(paths: string[]) {
  const dirs: Record<string, string[]> = {};
  for (const p of paths) {
    const d = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
    (dirs[d] ||= []).push(p);
  }
  return Object.entries(dirs).sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
}

export interface WorkspaceProps {
  lab: Lab;
  storageKey?: string;
  initialFiles?: Record<string, string>;
  headerExtra?: React.ReactNode;
  onSolved?: (ms: number) => void;
  backHref?: string;
  hideSolution?: boolean;
  notesOverride?: React.ReactNode;
}

export function LabWorkspace({ lab, storageKey, initialFiles, headerExtra, onSolved, backHref, hideSolution, notesOverride }: WorkspaceProps) {
  const key = storageKey ?? `lab.${lab.slug}`;
  const starting = useMemo(() => initialFiles ?? lab.files, [initialFiles, lab.files]);
  const editable = useMemo(() => Object.keys(starting), [starting]);
  const allPaths = useMemo(() => [...editable, ...Object.keys(lab.tests)], [editable, lab.tests]);
  const progress = useProgress();

  const [files, setFiles] = useState<Record<string, string>>(starting);
  const [active, setActive] = useState<string>(() => editable.find((p) => /controller|service|middleware|solution|limiter/i.test(p)) ?? editable[0]);
  const [openTabs, setOpenTabs] = useState<string[]>(() => [active]);
  const [run, setRun] = useState<LabRun | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [leftTab, setLeftTab] = useState<LeftTab>("ticket");
  const [bottom, setBottom] = useState<BottomTab>("tests");
  const [hintsShown, setHintsShown] = useState(0);
  const [notesShown, setNotesShown] = useState(0);
  const [diffFor, setDiffFor] = useState<string | null>(null);
  const [startAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [celebrate, setCelebrate] = useState(false);
  const solvedRef = useRef(false);

  // restore draft
  useEffect(() => {
    const d = loadDraft<Record<string, string>>(key);
    if (d && !initialFiles) setFiles((f) => ({ ...f, ...d }));
  }, [key, initialFiles]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const setFile = (path: string, v: string) => {
    setFiles((f) => {
      const next = { ...f, [path]: v };
      if (!initialFiles) saveDraft(key, next);
      return next;
    });
  };

  const open = (p: string) => {
    setActive(p);
    setOpenTabs((t) => (t.includes(p) ? t : [...t, p]));
  };

  const doRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStatus("Running tests…");
    const res = await runLab(lab.lang, { ...files, ...lab.tests }, Object.keys(lab.tests), lab.env, setStatus);
    setRun(res);
    setRunning(false);
    setStatus("");
    const allPass = res.tests.length > 0 && res.tests.every((t) => t.status === "pass");
    const ms = Date.now() - startAt;
    if (!initialFiles) {
      update((p) => {
        const prev = p.labs[lab.slug];
        return {
          ...p,
          labs: {
            ...p.labs,
            [lab.slug]: {
              status: allPass || prev?.status === "solved" ? "solved" : "attempted",
              runs: (prev?.runs ?? 0) + 1,
              at: Date.now(),
              bestMs: allPass ? Math.min(prev?.bestMs ?? Infinity, ms) : prev?.bestMs,
            },
          },
        };
      });
    }
    if (allPass && !solvedRef.current) {
      solvedRef.current = true;
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 3200);
      onSolved?.(ms);
    }
  }, [running, lab, files, startAt, initialFiles, onSolved]);

  const reset = () => {
    if (!confirm("Reset all files to the original starting code?")) return;
    setFiles(starting);
    clearDraft(key);
    setRun(null);
    solvedRef.current = false;
  };

  const passed = run?.tests.filter((t) => t.status === "pass").length ?? 0;
  const total = run?.tests.length ?? 0;
  const isTest = (p: string) => p in lab.tests;
  const value = isTest(active) ? lab.tests[active] : files[active] ?? "";
  const solvedBefore = progress.labs[lab.slug]?.status === "solved";
  const changed = (p: string) => !isTest(p) && files[p] !== starting[p];
  const KindIcon = lab.kind === "build" ? Hammer : Bug;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-bg">
      {/* top bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-bg-2/80 px-3 py-2">
        <Link href={backHref ?? (lab.kind === "build" ? "/build" : "/debug")} className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-text">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <KindIcon className={clsx("h-4 w-4", lab.kind === "build" ? "text-cyan" : "text-rose")} />
        <h1 className="truncate font-semibold">{lab.title}</h1>
        <DifficultyBadge d={lab.difficulty} />
        <Pill tone={lab.lang === "py" ? "cyan" : "orange"}>{lab.lang === "py" ? "Python · unittest" : "Node · Express · Jest"}</Pill>
        {solvedBefore && (
          <Pill tone="mint">
            <CheckCircle2 className="h-3 w-3" /> solved
          </Pill>
        )}
        {headerExtra}
        <div className="ml-auto flex items-center gap-2">
          <span className={clsx("flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-mono text-xs tabular-nums", now - startAt > lab.minutes * 60000 ? "text-rose" : "text-muted")}>
            <Timer className="h-3.5 w-3.5" />
            {fmtTime(now - startAt)} <span className="text-dim">/ {lab.minutes}:00</span>
          </span>
          <Button variant="ghost" onClick={reset} title="Reset to starting code">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button onClick={doRun} disabled={running}>
            <Play className="h-4 w-4" /> {running ? "Running…" : "Run tests"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* left: ticket */}
        <aside className="hidden w-[min(400px,32vw)] shrink-0 flex-col border-r border-line bg-bg-2/40 md:flex">
          <div className="flex shrink-0 gap-1 border-b border-line px-2 pt-2">
            {(
              [
                ["ticket", lab.kind === "build" ? "Spec" : "Ticket", ScrollText],
                ["hints", "Hints", Lightbulb],
                ["notes", lab.kind === "build" ? "Steps" : "Root causes", Wrench],
              ] as const
            ).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setLeftTab(k)} className={clsx("flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs", leftTab === k ? "bg-panel text-text ring-1 ring-line" : "text-muted hover:text-text")}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
            {leftTab === "ticket" && (
              <div>
                <Markdown text={lab.ticket} />
                <div className="mt-5 rounded-xl border border-line bg-panel/60 p-3">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-dim">Concepts</div>
                  <div className="flex flex-wrap gap-1.5">
                    {lab.concepts.map((c) => (
                      <Pill key={c} tone="violet">
                        {c}
                      </Pill>
                    ))}
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-panel/60 p-3 text-xs leading-relaxed text-muted">
                  <b className="text-text">Workflow that wins the OA:</b> run the tests → read the first failure → open the file it points to → form one hypothesis → change one thing → rerun. Use the <b className="text-cyan">Request flow</b> tab to see exactly which middleware/handler/DB calls ran.
                </div>
              </div>
            )}
            {leftTab === "hints" && (
              <div className="space-y-2">
                {lab.hints.slice(0, hintsShown).map((h, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-amber/25 bg-amber/[0.06] p-3 text-sm">
                    <Markdown text={h} />
                  </motion.div>
                ))}
                {hintsShown < lab.hints.length ? (
                  <Button variant="outline" onClick={() => setHintsShown((n) => n + 1)} className="w-full">
                    <Lightbulb className="h-4 w-4 text-amber" /> Reveal hint {hintsShown + 1} of {lab.hints.length}
                  </Button>
                ) : (
                  <p className="text-center text-xs text-dim">That&apos;s all the hints.</p>
                )}
              </div>
            )}
            {leftTab === "notes" &&
              (notesOverride ?? (
                <div className="space-y-2">
                  <p className="mb-3 text-xs text-dim">{lab.kind === "build" ? "The implementation broken into steps. Reveal one at a time if you get stuck." : "Each root cause, revealed one at a time. Try to find them yourself first!"}</p>
                  {lab.bugs.slice(0, notesShown).map((b, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-line bg-panel p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                        <span className="grid h-5 w-5 place-items-center rounded-md bg-rose/15 font-mono text-[11px] text-rose">{i + 1}</span>
                        {b.title}
                      </div>
                      <button onClick={() => open(b.file)} className="mb-1.5 font-mono text-[11px] text-cyan hover:underline">
                        {b.file}
                      </button>
                      <Markdown text={b.explain} className="text-[13px]" />
                    </motion.div>
                  ))}
                  {notesShown < lab.bugs.length && (
                    <Button variant="outline" onClick={() => setNotesShown((n) => n + 1)} className="w-full">
                      <Eye className="h-4 w-4" /> Reveal {lab.kind === "build" ? "step" : "root cause"} {notesShown + 1} of {lab.bugs.length}
                    </Button>
                  )}
                  {!hideSolution && notesShown >= lab.bugs.length && (
                    <div className="pt-2">
                      <div className="mb-2 text-xs text-dim">Compare your code with the reference:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(lab.fixes).map((f) => (
                          <button key={f} onClick={() => setDiffFor(f)} className="flex items-center gap-1 rounded-md border border-line-2 bg-panel-2 px-2 py-1 font-mono text-[11px] text-muted hover:text-text">
                            <GitCompare className="h-3 w-3" /> {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </aside>

        {/* explorer */}
        <div className="hidden w-52 shrink-0 flex-col border-r border-line bg-bg-2/30 py-2 lg:flex">
          <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-dim">Explorer</div>
          <div className="scroll-thin overflow-y-auto">
            {buildTree(allPaths).map(([dir, ps]) => (
              <div key={dir} className="mb-1">
                {dir && (
                  <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted">
                    <FolderOpen className="h-3.5 w-3.5 text-amber/80" /> {dir}
                  </div>
                )}
                {ps.map((p) => (
                  <button
                    key={p}
                    onClick={() => open(p)}
                    className={clsx("flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[12.5px]", dir ? "pl-7" : "pl-3", active === p ? "bg-panel-2 text-text" : "text-muted hover:bg-panel/70 hover:text-text")}
                  >
                    {isTest(p) ? <Lock className="h-3.5 w-3.5 shrink-0 text-dim" /> : <FileCode2 className={clsx("h-3.5 w-3.5 shrink-0", lab.lang === "py" ? "text-cyan" : "text-amber")} />}
                    <span className="truncate">{p.split("/").pop()}</span>
                    {changed(p) && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-orange" title="modified" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* editor + results */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="scroll-thin flex shrink-0 overflow-x-auto border-b border-line bg-bg-2/60">
            {openTabs.map((p) => (
              <button key={p} onClick={() => setActive(p)} className={clsx("flex shrink-0 items-center gap-1.5 border-r border-line px-3 py-2 font-mono text-xs", active === p ? "bg-[#0b0b13] text-text shadow-[inset_0_2px_0_0_var(--orange)]" : "text-dim hover:text-muted")}>
                {isTest(p) && <Lock className="h-3 w-3" />}
                {p}
                {changed(p) && <span className="h-1.5 w-1.5 rounded-full bg-orange" />}
                {openTabs.length > 1 && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTabs((t) => t.filter((x) => x !== p));
                      if (active === p) setActive(openTabs.find((x) => x !== p)!);
                    }}
                    className="ml-1 text-dim hover:text-text"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            {/* mobile file picker */}
            <select value={active} onChange={(e) => open(e.target.value)} className="ml-auto bg-transparent px-2 text-xs text-muted lg:hidden">
              {allPaths.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="relative min-h-0 flex-[1.4]">
            {isTest(active) && <div className="absolute right-3 top-2 z-10 rounded-md bg-panel-2 px-2 py-0.5 text-[11px] text-dim ring-1 ring-line">read-only test file</div>}
            <CodeEditor path={`${lab.slug}/${active}`} value={value} language={langFor(active)} readOnly={isTest(active)} onChange={(v) => setFile(active, v)} onRun={doRun} />
          </div>

          {/* results */}
          <div className="flex min-h-0 flex-1 flex-col border-t border-line bg-bg-2/50">
            <div className="flex shrink-0 items-center gap-1 border-b border-line px-2">
              {(
                [
                  ["tests", "Tests", ListChecks],
                  ["flow", "Request flow", Workflow],
                  ["logs", "Logs", Terminal],
                ] as const
              ).map(([k, label, Icon]) => (
                <button key={k} onClick={() => setBottom(k)} className={clsx("flex items-center gap-1.5 px-3 py-2 text-xs", bottom === k ? "text-text shadow-[inset_0_-2px_0_0_var(--orange)]" : "text-muted hover:text-text")}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                  {k === "logs" && run && run.logs.length > 0 && <span className="rounded bg-panel-2 px-1 text-[10px]">{run.logs.length}</span>}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-3 pr-2">
                {status && <span className="text-xs text-amber">{status}</span>}
                {run && (
                  <span className={clsx("font-mono text-xs font-semibold", passed === total ? "text-mint" : "text-rose")}>
                    {passed}/{total} passed
                  </span>
                )}
                <TestBlocks run={run} total={total} />
              </div>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {bottom === "tests" && <TestPanel run={run} running={running} />}
              {bottom === "flow" && <RequestFlow run={run} />}
              {bottom === "logs" && <LogsPanel run={run} />}
            </div>
          </div>
        </div>
      </div>

      {/* diff modal */}
      <AnimatePresence>
        {diffFor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={() => setDiffFor(null)}>
            <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-line-2 bg-panel" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-sm">
                <GitCompare className="h-4 w-4 text-cyan" />
                <span className="font-mono">{diffFor}</span>
                <span className="text-dim">your code (left) vs reference (right)</span>
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(diffFor, lab.fixes[diffFor]);
                      open(diffFor);
                      setDiffFor(null);
                    }}
                  >
                    Use reference
                  </Button>
                  <Button variant="ghost" onClick={() => setDiffFor(null)}>
                    Close
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <DiffEditor original={files[diffFor] ?? ""} modified={lab.fixes[diffFor]} language={langFor(diffFor)} theme="vs-dark" options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 13 }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* celebration */}
      <AnimatePresence>
        {celebrate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
            {Array.from({ length: 28 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                animate={{ x: Math.cos((i / 28) * Math.PI * 2) * (180 + (i % 5) * 40), y: Math.sin((i / 28) * Math.PI * 2) * (180 + (i % 4) * 40), scale: 1, rotate: 180 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className={clsx("absolute h-4 w-4 rounded-[4px]", ["bg-orange", "bg-mint", "bg-violet", "bg-cyan", "bg-amber", "bg-rose"][i % 6])}
              />
            ))}
            <motion.div initial={{ scale: 0.6, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass glow-orange flex items-center gap-3 rounded-2xl px-6 py-4">
              <Trophy className="h-7 w-7 text-amber" />
              <div>
                <div className="text-lg font-semibold">All tests green!</div>
                <div className="text-sm text-muted">Solved in {fmtTime(now - startAt)}</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
