import { Bug, Hammer, Zap, Code2, Bot, FlaskConical, Repeat } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { debugLabs, buildLabs, drills, problems } from "@/content";
import { HomeProgress } from "@/components/home/HomeProgress";
import { PixelRows, ModePosters, EffectSheet, Chapter } from "@/components/home/PixelSections";

const blocks = [
  { icon: Code2, c: "var(--violet)", t: "DSA coding", time: "40–90 min · 1–2 problems", d: "LeetCode-medium style in a HackerRank-like editor. Arrays, sliding window, hashing, heaps, BFS/DFS, greedy, DP. Hidden tests hit edge cases and large inputs." },
  { icon: Bot, c: "var(--rose)", t: "AI-assisted debugging", time: "≈ 60 min · ~3 bugs", d: "A real codebase, a ticket, failing tests and an AI assistant. Reproduce, trace, hypothesize, fix, verify. Exactly what the Debug Labs train." },
  { icon: FlaskConical, c: "var(--cyan)", t: "What graders love", time: "behaviour signals", d: "Small targeted diffs, reading the failing assertion first, not editing tests, checking the AI's suggestions, clean edge-case handling." },
];

const loop = [
  { icon: Repeat, t: "1 Bug Hunt", d: "warm-up", m: 10 },
  { icon: Zap, t: "10 Spot-the-Bug", d: "speed reading", m: 8 },
  { icon: Bug, t: "1 Debug Lab", d: "OA simulation", m: 30 },
  { icon: Hammer, t: "1 Build Lab", d: "implementation", m: 30 },
  { icon: Code2, t: "1 DSA problem", d: "pattern practice", m: 30 },
];

export default function Home() {
  return (
    <div>
      <Hero counts={{ debug: debugLabs.length, build: buildLabs.length, dsa: problems.length, drills: drills.length }} />
      <HomeProgress />
      <PixelRows />
      <ModePosters />
      <EffectSheet />

      <section className="mx-auto max-w-7xl px-4 py-16">
        <Chapter n="08" label="The assessment, decoded" title="What the online assessment looks like." sub="Formats vary by level and batch (candidate reports, not an official spec), but these blocks show up again and again." />
        <div className="grid border-t border-line md:grid-cols-3">
          {blocks.map((s, k) => {
            const I = s.icon;
            return (
              <div key={s.t} className={`py-6 md:px-6 ${k ? "border-t border-line md:border-l md:border-t-0" : "md:pl-0"}`}>
                <div className="flex items-center justify-between">
                  <I className="h-5 w-5" style={{ color: s.c }} />
                  <span className="px-label text-dim">{s.time}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <Chapter n="09" label="Daily loop" title="About two hours a day." sub="Repetition is the whole trick. Run this loop daily and bug patterns become reflexes." right={<span className="px-label">≈ {loop.reduce((a, s) => a + s.m, 0)} min</span>} />
        <ol className="border-t border-line">
          {loop.map((s, i) => {
            const I = s.icon;
            return (
              <li key={s.t} className="grid grid-cols-[2.5rem_1.5rem_1fr_auto] items-center gap-3 border-b border-line py-4">
                <span className="px-label text-orange">{String(i + 1).padStart(2, "0")}</span>
                <I className="h-4 w-4 text-dim" />
                <span className="text-lg font-semibold tracking-tight">
                  {s.t} <span className="ml-2 text-sm font-normal text-muted">{s.d}</span>
                </span>
                <span className="px-label text-dim">{s.m} min</span>
              </li>
            );
          })}
        </ol>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 border-t border-line px-4 pb-12 pt-4 text-dim">
        <span className="px-label">BugForge · MIT</span>
        <span className="px-label">Runs locally in Web Workers · progress stays in your browser</span>
      </footer>
    </div>
  );
}
