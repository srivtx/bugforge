"use client";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Infinity as InfinityIcon, Flame, Trophy, Target, Timer, Dice5, Skull, SkipForward, Eye, FileSearch, Crosshair, Sparkles } from "lucide-react";
import type { Lab } from "@/lib/types";
import { enumerateSites, applySites, pickSites, rng, toMutation, OPS, type Mutation, type Site } from "@/lib/mutate";
import { runLab } from "@/lib/runners";
import { update, useProgress } from "@/lib/progress";
import { LabWorkspace } from "@/components/lab/LabWorkspace";
import { Button, Stat, Pill } from "@/components/ui";

interface Hunt {
  id: number;
  base: Lab;
  lab: Lab;
  mutations: Mutation[];
  failing: number;
  total: number;
}

const LEVELS = [
  { k: 1, label: "Recruit", sub: "1 bug", tone: "text-mint" },
  { k: 2, label: "Hunter", sub: "2 bugs", tone: "text-amber" },
  { k: 3, label: "Predator", sub: "3 bugs", tone: "text-rose" },
] as const;

function fmt(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function HuntArena({ labs }: { labs: Lab[] }) {
  const progress = useProgress();
  const [k, setK] = useState(1);
  const [lang, setLang] = useState<"any" | "js" | "py">("js");
  const [phase, setPhase] = useState<"lobby" | "gen" | "play">("lobby");
  const [genMsg, setGenMsg] = useState("");
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [solved, setSolved] = useState<number | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const seed = useRef(Date.now());

  const pool = useMemo(() => labs.filter((l) => lang === "any" || l.lang === lang), [labs, lang]);
  const h = progress.hunts;

  async function start() {
    setPhase("gen");
    setSolved(null);
    setGaveUp(false);
    const rand = rng(seed.current++);
    for (let attempt = 0; attempt < 6; attempt++) {
      const base = pool[Math.floor(rand() * pool.length)];
      const baseFiles = { ...base.files, ...base.fixes };
      setGenMsg(`Scanning ${base.title}…`);
      const sites = enumerateSites(baseFiles, base.lang);
      const testFiles = Object.keys(base.tests);
      const accepted: Site[] = [];
      const lines = new Set<string>();
      for (let tries = 0; tries < 30 && accepted.length < k; tries++) {
        const [s] = pickSites(sites, 1, rand);
        if (!s || lines.has(`${s.file}:${s.line}`)) continue;
        setGenMsg(`Injecting bug ${accepted.length + 1}/${k} → ${s.file}`);
        const r = await runLab(base.lang, { ...applySites(baseFiles, [s]), ...base.tests }, testFiles, base.env, setGenMsg);
        const fails = r.tests.filter((t) => t.status === "fail");
        if (fails.length && fails.length < r.tests.length + 1 && !r.loadError && !r.timedOut) {
          accepted.push(s);
          lines.add(`${s.file}:${s.line}`);
        }
      }
      if (accepted.length < k) continue;
      const mutated = applySites(baseFiles, accepted);
      const r = await runLab(base.lang, { ...mutated, ...base.tests }, testFiles, base.env, setGenMsg);
      const failing = r.tests.filter((t) => t.status === "fail").length;
      if (!failing) continue;
      const mutations = accepted.map(toMutation);
      const id = (h.played || 0) + 1;
      const lab: Lab = {
        ...base,
        slug: `hunt-${base.slug}`,
        title: `Hunt #${id}: ${base.title}`,
        files: mutated,
        fixes: Object.fromEntries(Object.entries(baseFiles).filter(([f]) => mutations.some((m) => m.file === f))),
        bugs: mutations.map((m) => ({ file: m.file, title: m.name, explain: m.lesson })),
        ticket: `**HUNT-${id} · ${k} regression${k > 1 ? "s" : ""} introduced by the last commit**\n\nThis codebase was fully green before the last deploy. Now **${failing} of ${r.tests.length} tests fail**.\n\nEach regression is a **single-line change** somewhere in the source files. Tests are the spec, and they are untouched.\n\n**Service:** ${base.title}. ${base.tagline.replace(/\.$/, "")} *(original ticket solved)*.\n\nTip: run the tests, read the first assertion, open the Request flow, then narrow it to one file.`,
        hints: [
          "Group failing tests by endpoint or function. Which code path do they share?",
          "Each bug is one line. Compare what the code *does* with what the test name says it *should* do.",
          "Look hard at operators: `<` vs `<=`, `===` vs `!==`, `&&` vs `||`, `+` vs `-`, and missing `await`/`return`.",
        ],
        kind: base.kind,
      };
      update((p) => ({ ...p, hunts: { ...p.hunts, played: p.hunts.played + 1 } }));
      setHunt({ id: seed.current, base, lab, mutations, failing, total: r.tests.length });
      setRevealed(mutations.map(() => 0));
      setPhase("play");
      return;
    }
    setGenMsg("Couldn't build a hunt from this pool. Try another language or level.");
    setPhase("lobby");
  }

  function onSolved(ms: number) {
    setSolved(ms);
    const usedReveals = revealed.reduce((a, b) => a + b, 0);
    update((p) => {
      const streak = gaveUp ? 0 : p.hunts.streak + 1;
      const muts = { ...p.hunts.mutations };
      hunt?.mutations.forEach((m) => (muts[m.op] = (muts[m.op] || 0) + 1));
      return {
        ...p,
        hunts: {
          ...p.hunts,
          solved: p.hunts.solved + 1,
          streak,
          bestStreak: Math.max(p.hunts.bestStreak, streak),
          fastestMs: usedReveals === 0 ? Math.min(p.hunts.fastestMs ?? Infinity, ms) : p.hunts.fastestMs,
          mutations: muts,
        },
      };
    });
  }

  function giveUp() {
    setGaveUp(true);
    setRevealed((r) => r.map(() => 3));
    update((p) => ({ ...p, hunts: { ...p.hunts, streak: 0 } }));
  }

  if (phase === "play" && hunt) {
    const notes = (
      <div className="space-y-3">
        <p className="text-xs text-dim">Reveals cost you the perfect-run bonus. Level 1 = file, 2 = line, 3 = full diff + lesson.</p>
        {hunt.mutations.map((m, i) => {
          const lv = revealed[i];
          return (
            <div key={i} className="rounded-xl border border-line bg-panel p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-rose/15 font-mono text-[11px] text-rose">{i + 1}</span>
                {lv >= 3 ? m.name : "Hidden bug"}
              </div>
              {lv >= 1 && (
                <div className="font-mono text-xs text-cyan">
                  {m.file}
                  {lv >= 2 && <span className="text-amber">:{m.line}</span>}
                </div>
              )}
              {lv >= 3 && (
                <div className="mt-2 space-y-1 font-mono text-[11.5px]">
                  <div className="overflow-x-auto whitespace-pre rounded-md bg-rose/10 px-2 py-1 text-rose">- {m.after.trim()}</div>
                  <div className="overflow-x-auto whitespace-pre rounded-md bg-mint/10 px-2 py-1 text-mint">+ {m.before.trim()}</div>
                  <p className="pt-1 font-sans text-xs leading-relaxed text-muted">{m.lesson}</p>
                </div>
              )}
              {lv < 3 && (
                <button onClick={() => setRevealed((r) => r.map((x, j) => (j === i ? x + 1 : x)))} className="mt-2 flex items-center gap-1.5 text-xs text-amber hover:underline">
                  {lv === 0 ? <FileSearch className="h-3.5 w-3.5" /> : lv === 1 ? <Crosshair className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {lv === 0 ? "Reveal file" : lv === 1 ? "Reveal line" : "Reveal fix"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
    return (
      <div className="relative">
        <LabWorkspace
          key={hunt.id}
          lab={hunt.lab}
          storageKey={`hunt.${hunt.id}`}
          initialFiles={hunt.lab.files}
          onSolved={onSolved}
          backHref="/hunt"
          hideSolution
          notesOverride={notes}
          headerExtra={
            <div className="flex items-center gap-2">
              <Pill tone="rose">
                <Target className="h-3 w-3" /> {hunt.mutations.length} bug{hunt.mutations.length > 1 ? "s" : ""} · {hunt.failing}/{hunt.total} failing
              </Pill>
              <Pill tone="orange">
                <Flame className="h-3 w-3" /> streak {progress.hunts.streak}
              </Pill>
              {!solved && !gaveUp && (
                <button onClick={giveUp} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-dim hover:bg-panel-2 hover:text-rose">
                  <Skull className="h-3.5 w-3.5" /> give up
                </button>
              )}
              <button onClick={start} className="flex items-center gap-1 rounded-lg border border-line-2 px-2 py-1 text-xs text-muted hover:text-text">
                <SkipForward className="h-3.5 w-3.5" /> next hunt
              </button>
            </div>
          }
        />
        <AnimatePresence>
          {solved !== null && (
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="glass glow-orange fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl px-5 py-3">
              <Trophy className="h-6 w-6 text-amber" />
              <div className="text-sm">
                <div className="font-semibold">Hunt cleared in {fmt(solved)}</div>
                <div className="text-muted">
                  {revealed.every((r) => r === 0) ? "Perfect run, no reveals 🔥" : `${revealed.reduce((a, b) => a + b, 0)} reveal(s) used`} · streak {progress.hunts.streak}
                </div>
              </div>
              <Button onClick={start}>
                <SkipForward className="h-4 w-4" /> Next hunt
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-grid min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-orange">
              <InfinityIcon className="h-4 w-4" /> Endless mode
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Bug Hunt <span className="text-gradient">∞</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted">
              We take a <b className="text-text">working</b> codebase, inject 1–3 realistic regressions with a mutation engine ({OPS.length} bug operators: off-by-one, flipped conditions, missing <code className="font-mono text-amber">await</code>, wrong status codes, swapped sort order…), check that the tests catch them, and hand it to you. Endless fresh reps until spotting bugs is reflex.
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-dim">Difficulty</div>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((lv) => (
                    <button key={lv.k} onClick={() => setK(lv.k)} className={clsx("rounded-xl border p-3 text-left transition", k === lv.k ? "border-orange/60 bg-orange/10" : "border-line bg-panel hover:border-line-2")}>
                      <div className={clsx("font-semibold", lv.tone)}>{lv.label}</div>
                      <div className="text-xs text-muted">{lv.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-dim">Codebase language</div>
                <div className="flex gap-2">
                  {(
                    [
                      ["js", "Node.js"],
                      ["py", "Python"],
                      ["any", "Mixed"],
                    ] as const
                  ).map(([v, l]) => (
                    <button key={v} onClick={() => setLang(v)} className={clsx("rounded-lg border px-4 py-2 text-sm", lang === v ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-line bg-panel text-muted hover:text-text")}>
                      {l}
                    </button>
                  ))}
                  <span className="self-center text-xs text-dim">{pool.length} codebases</span>
                </div>
              </div>
              <Button onClick={start} disabled={phase === "gen" || pool.length === 0} className="mt-2 px-6 py-3 text-base">
                <Dice5 className="h-5 w-5" /> {phase === "gen" ? "Generating…" : "Start a hunt"}
              </Button>
              {phase === "gen" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 font-mono text-xs text-amber">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }} className="h-2 w-2 rounded-sm bg-amber" />
                    ))}
                  </span>
                  {genMsg}
                </motion.div>
              )}
              {phase === "lobby" && genMsg && <p className="text-sm text-rose">{genMsg}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="hunts played" value={h.played} />
              <Stat label="hunts cleared" value={h.solved} tone="text-mint" />
              <Stat label="current streak" value={<span className="flex items-center gap-1">{h.streak} <Flame className="h-5 w-5 text-orange" /></span>} tone="text-orange" />
              <Stat label="best streak" value={h.bestStreak} tone="text-amber" />
            </div>
            <div className="rounded-2xl border border-line bg-panel/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-violet" /> Bug species you&apos;ve caught
                {h.fastestMs && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-dim">
                    <Timer className="h-3 w-3" /> fastest perfect: {fmt(h.fastestMs)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {Array.from(new Map(OPS.map((o) => [o.name, o])).values()).map((o) => {
                  const n = Object.entries(h.mutations).filter(([id]) => OPS.find((x) => x.id === id)?.name === o.name).reduce((a, [, c]) => a + c, 0);
                  return (
                    <div key={o.name} title={o.lesson} className={clsx("rounded-lg border px-2 py-1.5 text-[11px] leading-tight", n ? "border-mint/30 bg-mint/[0.07] text-text" : "border-line bg-bg-2 text-dim")}>
                      <div className="truncate">{o.name}</div>
                      <div className={clsx("font-mono", n ? "text-mint" : "text-dim")}>×{n}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
