"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { ArrowLeft, Play, Send, RotateCcw, BookOpen, Lightbulb, Boxes, KeyRound, Timer, CheckCircle2, XCircle, Clock, Trophy, Lock } from "lucide-react";
import type { Problem } from "@/lib/types";
import { runCode, type CodeResult } from "@/lib/runners";
import { compareOutput } from "@/lib/compare";
import { update, loadDraft, saveDraft, clearDraft, useProgress } from "@/lib/progress";
import { Markdown } from "@/components/Markdown";
import { DifficultyBadge, Button, Pill } from "@/components/ui";
import { VizPlayer } from "@/components/viz/VizPlayer";
import { VIZ, type Frame } from "@/viz/frames";

const CodeEditor = dynamic(() => import("@/components/CodeEditor").then((m) => m.CodeEditor), { ssr: false });

type Lang = "js" | "py";
type Tab = "problem" | "hints" | "visualize" | "approach" | "solution";
type Test = { input: unknown[]; output: unknown; kind?: string };
type Outcome = { test: Test; res: CodeResult; ok: boolean };

const show = (v: unknown) => JSON.stringify(v);

function dedent(s: string) {
  const lines = s.split("\n");
  const ind = Math.min(...lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return [lines[0], ...lines.slice(1).map((l) => l.slice(Number.isFinite(ind) ? ind : 0))].join("\n");
}

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function DsaWorkspace({ p }: { p: Problem }) {
  const progress = useProgress();
  const [lang, setLang] = useState<Lang>("js");
  const [code, setCode] = useState<Record<Lang, string>>(p.starter);
  const [tab, setTab] = useState<Tab>("problem");
  const [hints, setHints] = useState(0);
  const [busy, setBusy] = useState<"" | "run" | "submit">("");
  const [status, setStatus] = useState("");
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [verdict, setVerdict] = useState<{ kind: "accepted" | "wrong" | "error" | "tle" | "compile"; msg?: string; passed?: number; total?: number; ms?: number } | null>(null);
  const [caseIdx, setCaseIdx] = useState(0);
  const [startAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [solRevealed, setSolRevealed] = useState(false);
  const [lastMode, setLastMode] = useState<"run" | "submit">("run");

  useEffect(() => {
    const d = loadDraft<Record<Lang, string>>(`dsa.${p.slug}`);
    if (d) setCode((c) => ({ ...c, ...d }));
    try {
      const l = localStorage.getItem("bugforge.lang");
      if (l === "js" || l === "py") setLang(l);
    } catch {
      /* ignore */
    }
  }, [p.slug]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const frames: Frame[] = useMemo(() => {
    if (!p.viz) return [];
    const v = VIZ[p.viz.id];
    return v ? (v.gen as (x: unknown) => Frame[])(p.viz.input ?? v.sample) : [];
  }, [p.viz]);

  const setLangSaved = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("bugforge.lang", l);
    } catch {
      /* ignore */
    }
  };
  const edit = (v: string) =>
    setCode((c) => {
      const next = { ...c, [lang]: v };
      saveDraft(`dsa.${p.slug}`, next);
      return next;
    });

  const exec = useCallback(
    async (mode: "run" | "submit") => {
      if (busy) return;
      setBusy(mode);
      setVerdict(null);
      setStatus(mode === "run" ? "Running examples…" : "Loading hidden tests…");
      let tests: Test[] = p.examples.map((e) => ({ input: e.input, output: e.output, kind: "example" }));
      if (mode === "submit") tests = await fetch(`/tests/${p.slug}.json`).then((r) => r.json());
      setStatus(`Running ${tests.length} test${tests.length > 1 ? "s" : ""}…`);
      const r = await runCode(lang, code[lang], p.fn, tests, setStatus);
      setStatus("");
      setBusy("");
      let v: NonNullable<typeof verdict>;
      let outs: Outcome[] = [];
      if (r.timedOut) v = { kind: "tle", msg: "Time limit exceeded. Your solution is too slow for the large tests (or loops forever). Check the complexity in the Approach tab." };
      else if (r.compileError) v = { kind: "compile", msg: r.compileError };
      else {
        outs = tests.map((t, i) => {
          const res = r.results![i];
          return { test: t, res, ok: !res.error && compareOutput(res.output, t.output, p.compare) };
        });
        const passed = outs.filter((o) => o.ok).length;
        const ms = outs.reduce((s, o) => s + o.res.ms, 0);
        const firstErr = outs.find((o) => o.res.error);
        v = passed === outs.length ? { kind: "accepted", passed, total: outs.length, ms } : firstErr && !outs.find((o) => !o.ok && !o.res.error) ? { kind: "error", msg: firstErr.res.error, passed, total: outs.length } : { kind: "wrong", passed, total: outs.length };
      }
      setLastMode(mode);
      setOutcomes(outs);
      setVerdict(v);
      const firstFail = outs.findIndex((o) => !o.ok);
      setCaseIdx(firstFail >= 0 ? firstFail : 0);
      if (mode === "submit")
        update((pr) => {
          const prev = pr.problems[p.slug];
          return { ...pr, problems: { ...pr.problems, [p.slug]: { status: v.kind === "accepted" || prev?.status === "solved" ? "solved" : "attempted", runs: (prev?.runs ?? 0) + 1, at: Date.now(), lang } } };
        });
    },
    [busy, lang, code, p],
  );

  const reset = () => {
    if (!confirm("Reset your code to the starter template?")) return;
    setCode(p.starter);
    clearDraft(`dsa.${p.slug}`);
  };

  const solved = progress.problems[p.slug]?.status === "solved";
  const tabs: [Tab, string, typeof BookOpen][] = [
    ["problem", "Problem", BookOpen],
    ["hints", "Hints", Lightbulb],
    ...(frames.length ? ([["visualize", "Visualize", Boxes]] as [Tab, string, typeof BookOpen][]) : []),
    ["approach", "Approach", KeyRound],
    ["solution", "Solution", Lock],
  ];
  const shown = outcomes?.[caseIdx];

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-bg">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-line bg-panel px-4 py-2">
        <Link href="/dsa" className="flex items-center gap-1 text-sm text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" /> DSA
        </Link>
        <span className="h-5 w-px bg-line" />
        <h1 className="truncate font-semibold">{p.title}</h1>
        <DifficultyBadge d={p.difficulty} />
        {p.patterns.map((x) => (
          <Pill key={x} tone="violet">
            {x}
          </Pill>
        ))}
        {solved && (
          <span className="flex items-center gap-1 text-sm font-semibold text-mint">
            <CheckCircle2 className="h-4 w-4" /> Solved
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 font-mono text-sm text-muted">
          <Timer className="h-4 w-4" /> {fmtTime(now - startAt)}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* left: statement & learning */}
        <section className="flex min-h-0 flex-col border-line lg:w-[46%] lg:border-r-2">
          <div className="flex gap-1 overflow-x-auto border-b-2 border-line px-3 pt-2 scroll-thin">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)} className={clsx("flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm transition", tab === id ? "bg-panel-2 font-semibold text-text" : "text-muted hover:text-text")}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 scroll-thin">
            {tab === "problem" && (
              <div className="prose-oa">
                <Markdown text={p.story} />
                <h3>Signature</h3>
                <pre>
                  <code>
                    {p.fn}({p.params.map(([n, t]) => `${n}: ${t}`).join(", ")}) → {p.returns}
                  </code>
                </pre>
                {p.examples.map((e, i) => (
                  <div key={i} className="vx-sm my-3 p-3 font-mono text-[12.5px]">
                    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-widest text-dim">Example {i + 1}</div>
                    {p.params.map(([n], j) => (
                      <div key={n}>
                        <span className="text-dim">{n} = </span>
                        {show(e.input[j])}
                      </div>
                    ))}
                    <div>
                      <span className="text-dim">output = </span>
                      <span className="font-bold text-mint">{show(e.output)}</span>
                    </div>
                    {e.explain && <div className="mt-1 font-sans text-[13px] text-muted">{e.explain}</div>}
                  </div>
                ))}
                <h3>Constraints</h3>
                <ul>
                  {p.constraints.map((c) => (
                    <li key={c}>
                      <code>{c}</code>
                    </li>
                  ))}
                </ul>
                {p.compare !== "exact" && <p className="text-sm text-dim">Answer checking: {p.compare === "unordered" || p.compare === "unorderedDeep" ? "any order is accepted." : "floating point within 1e-5."}</p>}
              </div>
            )}
            {tab === "hints" && (
              <div className="space-y-3">
                <p className="text-sm text-muted">Reveal one at a time. Try for a few minutes between each: struggling a bit is what makes it stick.</p>
                {p.hints.map((h, i) => (
                  <div key={i} className={clsx("vx-sm p-4", i >= hints && "opacity-70")}>
                    <div className="mb-1 text-xs font-semibold text-amber">Hint {i + 1}</div>
                    {i < hints ? (
                      <div className="prose-oa text-sm">
                        <Markdown text={h} />
                      </div>
                    ) : i === hints ? (
                      <Button variant="outline" onClick={() => setHints(i + 1)}>
                        Reveal hint {i + 1}
                      </Button>
                    ) : (
                      <div className="text-sm text-dim">Locked</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tab === "visualize" && frames.length > 0 && (
              <div>
                <p className="mb-4 text-sm text-muted">{VIZ[p.viz!.id].blurb} Press play or step through; every frame explains what the algorithm just decided.</p>
                <VizPlayer frames={frames} compact />
              </div>
            )}
            {tab === "approach" && (
              <div className="prose-oa">
                <Markdown text={p.approach} />
                <div className="mt-4 flex gap-2">
                  <Pill tone="cyan">Time {p.time}</Pill>
                  <Pill tone="violet">Space {p.space}</Pill>
                </div>
                {p.followUps.length > 0 && (
                  <>
                    <h3>Interviewer follow-ups</h3>
                    <ul>
                      {p.followUps.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            {tab === "solution" &&
              (solRevealed || solved ? (
                <div className="prose-oa">
                  <p>Reference solution ({lang === "js" ? "JavaScript" : "Python"}). Compare it with yours line by line; then close this tab and re-type it from memory tomorrow.</p>
                  <pre>
                    <code>{dedent(p.solution[lang])}</code>
                  </pre>
                </div>
              ) : (
                <div className="vx grid place-items-center gap-3 p-8 text-center">
                  <Lock className="h-8 w-8 text-dim" />
                  <p className="max-w-sm text-sm text-muted">Peeking early robs you of the practice. Try the hints and the Approach tab first.</p>
                  <Button variant="outline" onClick={() => setSolRevealed(true)}>
                    Show it anyway
                  </Button>
                </div>
              ))}
          </div>
        </section>

        {/* right: editor + results */}
        <section className="flex min-h-[520px] min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b-2 border-line bg-panel px-3 py-2">
            <div className="flex rounded-lg border-2 border-line bg-panel-2 p-0.5">
              {(["js", "py"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLangSaved(l)} className={clsx("rounded-md px-3 py-1 text-xs font-semibold", lang === l ? "bg-panel text-text shadow" : "text-muted")}>
                  {l === "js" ? "JavaScript" : "Python"}
                </button>
              ))}
            </div>
            <span className="hidden text-xs text-dim md:inline">⌘/Ctrl + Enter runs examples</span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={reset} title="Reset code">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => exec("run")} disabled={!!busy}>
                <Play className="h-4 w-4" /> {busy === "run" ? "Running…" : "Run"}
              </Button>
              <Button variant="success" onClick={() => exec("submit")} disabled={!!busy}>
                <Send className="h-4 w-4" /> {busy === "submit" ? "Judging…" : "Submit"}
              </Button>
            </div>
          </div>
          <div className="min-h-[260px] flex-1">
            <CodeEditor key={lang} value={code[lang]} onChange={edit} language={lang === "py" ? "python" : "javascript"} path={`${p.slug}.${lang}`} onRun={() => exec("run")} />
          </div>
          <div className="h-[38%] min-h-[200px] overflow-y-auto border-t-2 border-line bg-panel p-4 scroll-thin">
            {status && <div className="shimmer mb-3 rounded-lg px-3 py-2 text-sm text-muted">{status}</div>}
            {!verdict && !status && <div className="text-sm text-dim">Run checks the examples. Submit runs every hidden test ({p.testCount}, including large inputs that catch slow solutions).</div>}
            <AnimatePresence>
              {verdict && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {verdict.kind === "accepted" ? (
                      <span className="flex items-center gap-2 text-lg font-bold text-mint">
                        <Trophy className="h-5 w-5" /> {lastMode === "run" ? "Examples pass: now Submit" : "Accepted"}
                      </span>
                    ) : verdict.kind === "tle" ? (
                      <span className="flex items-center gap-2 text-lg font-bold text-amber">
                        <Clock className="h-5 w-5" /> Time Limit Exceeded
                      </span>
                    ) : verdict.kind === "compile" ? (
                      <span className="flex items-center gap-2 text-lg font-bold text-rose">
                        <XCircle className="h-5 w-5" /> Compile / Load Error
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-lg font-bold text-rose">
                        <XCircle className="h-5 w-5" /> {verdict.kind === "error" ? "Runtime Error" : "Wrong Answer"}
                      </span>
                    )}
                    {verdict.total !== undefined && (
                      <span className="font-mono text-sm text-muted">
                        {verdict.passed}/{verdict.total} passed{verdict.ms !== undefined && ` · ${verdict.ms.toFixed(0)} ms total`}
                      </span>
                    )}
                  </div>
                  {verdict.msg && <pre className="whitespace-pre-wrap rounded-lg border-2 border-rose/30 bg-rose/5 p-3 font-mono text-[12.5px] text-rose">{verdict.msg}</pre>}
                  {outcomes && outcomes.length > 0 && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {outcomes.map((o, i) => (
                          <button key={i} onClick={() => setCaseIdx(i)} title={o.test.kind} className={clsx("h-6 min-w-6 rounded-md px-1.5 font-mono text-[10.5px] font-bold text-white transition", o.ok ? "bg-mint" : "bg-rose", i === caseIdx && "ring-2 ring-text ring-offset-1 ring-offset-panel")}>
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      {shown && (
                        <div className="space-y-1.5 font-mono text-[12.5px]">
                          <div className="text-[10.5px] uppercase tracking-widest text-dim">
                            Case {caseIdx + 1} · {shown.test.kind ?? "test"}
                          </div>
                          {p.params.map(([n], j) => (
                            <Row key={n} k={n} v={show(shown.test.input[j])} />
                          ))}
                          <Row k="expected" v={show(shown.test.output)} tone="text-mint" />
                          <Row k="yours" v={shown.res.error ?? show(shown.res.output)} tone={shown.ok ? "text-mint" : "text-rose"} />
                          {shown.res.logs.length > 0 && <Row k="stdout" v={shown.res.logs.join("\n")} />}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-dim">{k}</span>
      <span className={clsx("min-w-0 flex-1 whitespace-pre-wrap break-all rounded-md bg-panel-2 px-2 py-1", tone)}>{v.length > 600 ? v.slice(0, 600) + " … (truncated)" : v}</span>
    </div>
  );
}
