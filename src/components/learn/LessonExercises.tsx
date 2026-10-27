"use client";
// Runnable exercises at the end of a lesson: edit one file, run the tests in the sandbox,
// unlock hints one at a time, and earn XP (fewer hints, more XP) with a pixel burst on success.
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Play, Lightbulb, RotateCcw, Eye, Check, X, Loader2, FileCode2, FlaskConical, Lock } from "lucide-react";
import type { Exercise } from "@/content/learn";
import { runLab } from "@/lib/runners";
import { update, useProgress, loadDraft, saveDraft, clearDraft } from "@/lib/progress";
import { CodeEditor } from "@/components/CodeEditor";
import { Markdown } from "@/components/Markdown";
import { PixelBurst } from "./PixelBurst";

type TestResult = { name: string; status: string; error?: string };

export const xpFor = (hints: number, sawSolution: boolean) => (sawSolution ? 2 : Math.max(4, 10 - hints * 2));

export function LessonExercises({ lesson, exercises }: { lesson: string; exercises: Exercise[] }) {
  const progress = useProgress();
  const [active, setActive] = useState(0);
  const done = exercises.filter((e) => progress.exercises[`${lesson}/${e.id}`]?.status === "solved").length;

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <span className="px-label text-orange">Your turn · {exercises.length} exercise{exercises.length > 1 ? "s" : ""}</span>
        <span className="px-label text-dim">
          {done}/{exercises.length} solved
        </span>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {exercises.map((e, i) => (
          <span key={e.id} className={clsx("h-2 flex-1 transition-colors", progress.exercises[`${lesson}/${e.id}`]?.status === "solved" ? "bg-mint" : i === active ? "bg-orange/60" : "bg-line")} />
        ))}
      </div>
      {exercises.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {exercises.map((e, i) => {
            const solved = progress.exercises[`${lesson}/${e.id}`]?.status === "solved";
            return (
              <button key={e.id} onClick={() => setActive(i)} className={clsx("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition", i === active ? "border-orange bg-orange/10" : "border-line bg-panel hover:border-line-2")}>
                <span className={clsx("grid h-5 w-5 place-items-center text-[10px]", solved ? "bg-mint text-white" : "bg-panel-2")}>{solved ? <Check className="h-3 w-3" /> : <span className="font-pixel">{i + 1}</span>}</span>
                {e.title}
              </button>
            );
          })}
        </div>
      )}
      <ExerciseCard key={exercises[active].id} lesson={lesson} ex={exercises[active]} onNext={active < exercises.length - 1 ? () => setActive(active + 1) : undefined} />
    </section>
  );
}

function ExerciseCard({ lesson, ex, onNext }: { lesson: string; ex: Exercise; onNext?: () => void }) {
  const key = `${lesson}/${ex.id}`;
  const record = useProgress().exercises[key];
  const [code, setCode] = useState(ex.starter);
  const [tab, setTab] = useState<string>(ex.file);
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ xp: number; n: number } | null>(null);

  useEffect(() => {
    const d = loadDraft<{ code: string; hints: number; solution?: boolean }>("ex." + key);
    if (d) {
      setCode(d.code);
      setHints(d.hints);
      setShowSolution(!!d.solution);
    }
  }, [key]);
  useEffect(() => saveDraft("ex." + key, { code, hints, solution: showSolution }), [key, code, hints, showSolution]);

  const files = useMemo(() => [ex.file, ...Object.keys(ex.support ?? {}), ...Object.keys(ex.tests)], [ex]);
  const sourceOf = (f: string) => (f === ex.file ? code : (ex.support?.[f] ?? ex.tests[f]));
  const isTest = (f: string) => f in ex.tests;

  const run = async () => {
    setRunning(true);
    setTab(ex.file);
    const r = await runLab(ex.lang, { ...(ex.support ?? {}), ...ex.tests, [ex.file]: code }, Object.keys(ex.tests), {});
    setRunning(false);
    setResults(r.tests);
    setLoadError(r.loadError ?? null);
    const pass = r.tests.length > 0 && r.tests.every((t: TestResult) => t.status === "pass");
    const first = pass && record?.status !== "solved";
    const xp = xpFor(hints, showSolution);
    update((p) => {
      const prev = p.exercises[key];
      return { ...p, exercises: { ...p.exercises, [key]: { status: pass || prev?.status === "solved" ? "solved" : "attempted", hints, runs: (prev?.runs ?? 0) + 1, xp: Math.max(prev?.xp ?? 0, pass ? xp : 0), at: Date.now() } } };
    });
    if (pass) {
      setBurst({ xp: first ? xp : 0, n: Date.now() });
      setTimeout(() => setBurst(null), 1900);
    }
  };

  const passed = results?.filter((t) => t.status === "pass").length ?? 0;
  const allPass = !!results && results.length > 0 && passed === results.length;

  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_4px_0_var(--edge)]">
      <AnimatePresence>{burst && <PixelBurst key={burst.n} label={burst.xp ? `+${burst.xp} XP` : "Still green"} sub={burst.xp ? "exercise solved" : "already solved"} />}</AnimatePresence>

      <div className="border-b border-line p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold tracking-tight">{ex.title}</h3>
          {record?.status === "solved" && (
            <span className="px-label flex shrink-0 items-center gap-1 bg-mint/15 px-2 py-1 text-mint">
              <Check className="h-3 w-3" /> solved · {record.xp} xp
            </span>
          )}
        </div>
        <Markdown text={ex.goal} className="mt-2 text-[15px] text-muted" />
      </div>

      {/* file tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-line bg-panel-2 px-2 pt-2">
        {files.map((f) => (
          <button key={f} onClick={() => setTab(f)} className={clsx("flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 font-mono text-xs", tab === f ? "border-line bg-panel text-text" : "border-transparent text-dim hover:text-text")}>
            {isTest(f) ? <FlaskConical className="h-3.5 w-3.5 text-violet" /> : f === ex.file ? <FileCode2 className="h-3.5 w-3.5 text-orange" /> : <Lock className="h-3 w-3" />}
            {f}
            {f === ex.file && <span className="px-label text-orange">edit</span>}
          </button>
        ))}
      </div>
      <div className="h-[340px]">
        <CodeEditor key={tab} path={`${key}/${tab}`} language={ex.lang === "py" ? "python" : "javascript"} value={sourceOf(tab)} onChange={tab === ex.file ? setCode : undefined} readOnly={tab !== ex.file} onRun={run} />
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">
        <button onClick={run} disabled={running} className="vx-btn inline-flex items-center gap-2 bg-orange px-4 py-2 text-sm font-semibold text-white [--btn-edge:var(--orange-edge)] disabled:opacity-60">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run tests
        </button>
        <button onClick={() => setHints((h) => Math.min(h + 1, ex.hints.length))} disabled={hints >= ex.hints.length} className="vx-btn inline-flex items-center gap-2 border-2 border-line bg-panel px-3 py-2 text-sm font-semibold disabled:opacity-50">
          <Lightbulb className="h-4 w-4 text-amber" /> {hints < ex.hints.length ? `Hint ${hints + 1}/${ex.hints.length}` : "No more hints"}
        </button>
        {hints >= ex.hints.length && !showSolution && (
          <button onClick={() => setShowSolution(true)} className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-dim hover:text-text">
            <Eye className="h-4 w-4" /> Show solution
          </button>
        )}
        <button
          onClick={() => {
            setCode(ex.starter);
            setResults(null);
            clearDraft("ex." + key);
          }}
          className="ml-auto inline-flex items-center gap-1.5 px-2 py-2 text-sm text-dim hover:text-text"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <span className="px-label hidden text-dim sm:inline">⌘↵ runs · {xpFor(hints, showSolution)} xp</span>
      </div>

      {/* hints */}
      <AnimatePresence initial={false}>
        {hints > 0 && (
          <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-2 border-t border-line bg-amber/5 p-4">
            {ex.hints.slice(0, hints).map((h, i) => (
              <motion.li key={i} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex gap-3 text-sm">
                <span className="font-pixel mt-0.5 text-amber">{i + 1}</span>
                <Markdown text={h} className="text-[14px]" />
              </motion.li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>

      {showSolution && (
        <div className="border-t border-line p-4">
          <div className="px-label mb-2 text-dim">One possible solution (worth 2 xp once you run it)</div>
          <Markdown text={"```" + (ex.lang === "py" ? "python" : "js") + "\n" + ex.solution + "\n```"} className="text-[13px]" />
        </div>
      )}

      {/* results */}
      {results && (
        <div className="border-t border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className={clsx("px-label", allPass ? "text-mint" : "text-rose")}>
              {passed}/{results.length} tests passing
            </span>
            {allPass && onNext && (
              <button onClick={onNext} className="px-label text-orange hover:underline">
                Next exercise →
              </button>
            )}
          </div>
          <div className="mb-3 flex gap-1" aria-hidden>
            {results.map((t, i) => (
              <motion.span key={t.name} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.06 }} className={clsx("h-3 flex-1 origin-bottom", t.status === "pass" ? "bg-mint" : "bg-rose/70")} />
            ))}
          </div>
          {loadError && <pre className="mb-2 whitespace-pre-wrap rounded-lg bg-rose/10 p-3 font-mono text-xs text-rose">{loadError}</pre>}
          <ul className="space-y-1.5">
            {results.map((t) => (
              <li key={t.name} className="text-sm">
                <div className="flex items-start gap-2">
                  {t.status === "pass" ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-rose" />}
                  <span className={t.status === "pass" ? "text-muted" : "font-medium"}>{t.name}</span>
                </div>
                {t.status !== "pass" && t.error && <pre className="ml-6 mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-panel-2 p-2.5 font-mono text-[12px] text-muted">{t.error}</pre>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
