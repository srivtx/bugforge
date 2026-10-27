"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Zap, Timer, Check, X, ArrowRight, RotateCcw, Trophy, Target, Brain, Flame } from "lucide-react";
import type { Drill } from "@/lib/types";
import { CodeLines } from "./CodeLines";
import { Button, DifficultyBadge, Pill, Stat } from "@/components/ui";
import { update, useProgress } from "@/lib/progress";

const LANGS = [
  ["all", "All"],
  ["javascript", "JavaScript"],
  ["python", "Python"],
  ["java", "Java"],
  ["cpp", "C++"],
] as const;
const SECONDS = 45;

interface Answer {
  drill: Drill;
  lineOk: boolean;
  diagOk: boolean;
  ms: number;
}

function shuffle<T>(xs: T[]) {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function DrillArena({ drills }: { drills: Drill[] }) {
  const progress = useProgress();
  const [lang, setLang] = useState<(typeof LANGS)[number][0]>("all");
  const [size, setSize] = useState(10);
  const [deck, setDeck] = useState<Drill[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [diag, setDiag] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [left, setLeft] = useState(SECONDS);
  const started = useRef(Date.now());

  const pool = useMemo(() => drills.filter((d) => lang === "all" || d.lang === lang), [drills, lang]);
  const drill = deck?.[idx];
  const stage: "line" | "diag" | "done" = picked === null ? "line" : diag === null ? "diag" : "done";

  useEffect(() => {
    if (!drill || stage === "done") return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [drill, stage]);

  useEffect(() => {
    if (left <= 0 && drill && stage !== "done") {
      if (picked === null) setPicked(-1);
      setDiag(-1);
    }
  }, [left, drill, stage, picked]);

  useEffect(() => {
    if (drill && stage === "done") {
      const a: Answer = { drill, lineOk: picked === drill.bugLine, diagOk: diag === drill.answer, ms: Date.now() - started.current };
      setAnswers((prev) => [...prev, a]);
      update((p) => ({ ...p, drills: { ...p.drills, [drill.id]: { correct: a.lineOk && a.diagOk, at: Date.now() } } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function start(source?: Drill[]) {
    const unseenFirst = shuffle(pool).sort((a, b) => Number(!!progress.drills[a.id]?.correct) - Number(!!progress.drills[b.id]?.correct));
    setDeck(source ?? unseenFirst.slice(0, size));
    setIdx(0);
    setAnswers([]);
    resetRound();
  }

  function resetRound() {
    setPicked(null);
    setDiag(null);
    setLeft(SECONDS);
    started.current = Date.now();
  }

  function next() {
    setIdx((i) => i + 1);
    resetRound();
  }

  const score = answers.reduce((s, a) => s + (a.lineOk ? 1 : 0) + (a.diagOk ? 1 : 0), 0);
  const mastered = drills.filter((d) => progress.drills[d.id]?.correct).length;

  // ---------------------------------------------------------------- lobby
  if (!deck) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="vx p-6">
          <h2 className="text-xl font-bold">Set up a session</h2>
          <p className="mt-1 text-sm text-muted">Unsolved drills come first. Each round: <b className="text-text">click the buggy line</b>, then <b className="text-text">pick the diagnosis</b>. {SECONDS}s per round.</p>
          <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-dim">Language</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGS.map(([v, l]) => (
              <button key={v} onClick={() => setLang(v)} className={clsx("vx-btn border-2 px-3.5 py-1.5 text-sm font-medium", lang === v ? "border-amber bg-amber/15 text-text" : "border-line bg-panel text-muted")}>
                {l} <span className="text-xs text-dim">{v === "all" ? drills.length : drills.filter((d) => d.lang === v).length}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-dim">Rounds</div>
          <div className="mt-2 flex gap-2">
            {[5, 10, 20].map((n) => (
              <button key={n} onClick={() => setSize(n)} className={clsx("vx-btn border-2 px-4 py-1.5 text-sm font-semibold", size === n ? "border-amber bg-amber/15" : "border-line bg-panel text-muted")}>
                {n}
              </button>
            ))}
          </div>
          <Button onClick={() => start()} className="mt-7 px-6 py-3 text-base" disabled={pool.length === 0}>
            <Zap className="h-5 w-5" /> Start drilling
          </Button>
        </div>
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="drills mastered" value={`${mastered}/${drills.length}`} tone="text-mint" />
            <Stat label="attempted" value={Object.keys(progress.drills).length} />
          </div>
          <div className="vx p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4 text-violet" /> Topics covered
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(drills.map((d) => d.topic))).map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- summary
  if (!drill) {
    const misses = answers.filter((a) => !a.lineOk || !a.diagOk);
    const pct = Math.round((score / (answers.length * 2)) * 100);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
        <div className="vx p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-amber" />
          <h2 className="mt-3 text-3xl font-bold">
            {score} / {answers.length * 2} points
          </h2>
          <p className="mt-1 text-muted">{pct >= 90 ? "Elite bug radar. 🔥" : pct >= 70 ? "Strong. Review the misses below." : "Good reps. Repeat the misses until they're automatic."}</p>
          <div className="mt-6 flex justify-center gap-3">
            {misses.length > 0 && (
              <Button variant="violet" onClick={() => start(misses.map((m) => m.drill))}>
                <RotateCcw className="h-4 w-4" /> Retry {misses.length} missed
              </Button>
            )}
            <Button onClick={() => start()}>
              <Zap className="h-4 w-4" /> New session
            </Button>
            <Button variant="outline" onClick={() => setDeck(null)}>
              Settings
            </Button>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {answers.map((a, i) => (
            <div key={i} className="vx-sm flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className={clsx("grid h-6 w-6 place-items-center rounded-md text-white", a.lineOk ? "bg-mint" : "bg-rose")}>{a.lineOk ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span>
              <span className={clsx("grid h-6 w-6 place-items-center rounded-md text-white", a.diagOk ? "bg-mint" : "bg-rose")}>{a.diagOk ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span>
              <span className="font-medium">{a.drill.prompt}</span>
              <span className="ml-auto font-mono text-xs text-dim">{(a.ms / 1000).toFixed(1)}s</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------- round
  const lineOk = picked === drill.bugLine;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {deck.map((_, i) => {
            const a = answers[i];
            return <span key={i} className={clsx("h-3 w-6 rounded-[4px] border-2", i === idx ? "border-amber bg-amber/40" : a ? (a.lineOk && a.diagOk ? "border-mint bg-mint" : "border-rose bg-rose") : "border-line bg-panel-2")} />;
          })}
        </div>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-sm font-semibold">
          <Flame className="h-4 w-4 text-orange" /> {score} pts
        </span>
        <span className={clsx("vx-sm flex items-center gap-1.5 px-3 py-1 font-mono text-sm font-bold tabular-nums", left <= 10 ? "text-rose" : "text-text")}>
          <Timer className="h-4 w-4" /> {Math.max(0, left)}s
        </span>
      </div>

      <motion.div key={drill.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Pill tone="cyan">{drill.lang}</Pill>
          <Pill>{drill.topic}</Pill>
          <DifficultyBadge d={drill.difficulty} />
        </div>
        <h2 className="mb-1 text-xl font-bold">{drill.prompt}</h2>
        <p className="mb-4 flex items-center gap-1.5 text-sm text-muted">
          <Target className="h-4 w-4 text-orange" />
          {stage === "line" ? "Click the line that contains the bug." : stage === "diag" ? "Now: what exactly is wrong?" : "Here's the fix."}
        </p>

        <CodeLines code={drill.code} lang={drill.lang} picked={picked} bugLine={drill.bugLine} reveal={stage !== "line"} onPick={stage === "line" ? (n) => setPicked(n) : undefined} />

        <AnimatePresence>
          {stage !== "line" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <div className={clsx("mb-3 text-sm font-semibold", lineOk ? "text-mint" : "text-rose")}>
                {picked === -1 ? "⏱ Time's up." : lineOk ? "✓ Right line!" : `✗ The bug is on line ${drill.bugLine}.`}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {drill.options.map((o, i) => {
                  const chosen = diag === i;
                  const correct = i === drill.answer;
                  return (
                    <button
                      key={i}
                      disabled={stage === "done"}
                      onClick={() => setDiag(i)}
                      className={clsx(
                        "vx-btn border-2 px-4 py-3 text-left text-sm font-medium",
                        stage !== "done" && "border-line bg-panel hover:border-amber",
                        stage === "done" && correct && "border-mint bg-mint/15",
                        stage === "done" && chosen && !correct && "border-rose bg-rose/10",
                        stage === "done" && !chosen && !correct && "border-line bg-panel opacity-60",
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage === "done" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="vx mt-5 p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Brain className="h-4 w-4 text-violet" /> Why it&apos;s a bug
              </div>
              <p className="text-[15px] leading-relaxed text-muted">{drill.explain}</p>
              <div className="mt-4 space-y-1 font-mono text-[12.5px]">
                <div className="overflow-x-auto whitespace-pre rounded-lg bg-rose/10 px-3 py-1.5 text-rose">- {drill.code.split("\n")[drill.bugLine - 1].trim()}</div>
                <div className="overflow-x-auto whitespace-pre rounded-lg bg-mint/10 px-3 py-1.5 text-mint">+ {drill.fixed.trim()}</div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={next}>
                  {idx + 1 < deck.length ? "Next" : "See results"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
