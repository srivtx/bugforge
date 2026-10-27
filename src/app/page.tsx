import Link from "next/link";
import { Bug, Hammer, Infinity as InfinityIcon, Zap, Code2, GraduationCap, Boxes, ArrowRight, Clock, Bot, FlaskConical, Repeat } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { debugLabs, buildLabs, drills, problems } from "@/content";
import { HomeProgress } from "@/components/home/HomeProgress";
import { PixelRows, EffectSheet } from "@/components/home/PixelSections";

const modes = [
  { href: "/debug", icon: Bug, color: "var(--rose)", title: "Debug Labs", body: "Multi-file Node & Python services with a bug ticket and failing tests. Exactly the AI-assisted debugging round shape.", tag: "core" },
  { href: "/hunt", icon: InfinityIcon, color: "var(--orange)", title: "Bug Hunt ∞", body: "A mutation engine injects fresh, verified regressions into working code. Infinite reps, streaks, bug species collection.", tag: "endless" },
  { href: "/build", icon: Hammer, color: "var(--cyan)", title: "Build Labs", body: "The opposite of debugging: a spec + TODO stubs + tests. Implement rate limiters, caches, queues, auth, ledgers.", tag: "implement" },
  { href: "/drills", icon: Zap, color: "var(--amber)", title: "Spot the Bug", body: "Timed rapid-fire: click the buggy line in JS, Python, Java and C++ snippets, then learn why.", tag: "speed" },
  { href: "/dsa", icon: Code2, color: "var(--violet)", title: "DSA Arena", body: "OA-style problems with JS/Python runners, hidden tests, hints, editorials and block visualizations.", tag: "coding" },
  { href: "/learn", icon: GraduationCap, color: "var(--mint)", title: "Learn Hub", body: "Visual explainers for every concept the labs test: the event loop, middleware, Mongoose, HTTP, concurrency.", tag: "explain" },
];

const loop = [
  { icon: Repeat, color: "var(--orange)", t: "1 Bug Hunt", d: "warm-up, ~10 min" },
  { icon: Zap, color: "var(--amber)", t: "10 Spot-the-Bug", d: "speed reading, ~8 min" },
  { icon: Bug, color: "var(--rose)", t: "1 Debug Lab", d: "OA simulation, ~30 min" },
  { icon: Hammer, color: "var(--cyan)", t: "1 Build Lab", d: "implementation, ~30 min" },
  { icon: Code2, color: "var(--violet)", t: "1 DSA problem", d: "pattern practice, ~30 min" },
];

export default function Home() {
  return (
    <div className="bg-cubes">
      <Hero counts={{ debug: debugLabs.length, build: buildLabs.length, dsa: problems.length, drills: drills.length }} />

      <section className="mx-auto max-w-7xl px-4 pb-6">
        <HomeProgress />
      </section>

      <PixelRows />

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-orange">Training modes</div>
            <h2 className="text-3xl font-bold tracking-tight">Six ways to get unbeatable</h2>
          </div>
          <Link href="/visualize" className="hidden items-center gap-1.5 text-sm font-medium text-cyan hover:underline sm:flex">
            <Boxes className="h-4 w-4" /> Open the 3D lab <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="vx vx-hover group relative flex flex-col p-6">
                <div className="mb-5 flex items-center justify-between">
                  <IsoIcon color={m.color}>
                    <Icon className="h-6 w-6 text-white" />
                  </IsoIcon>
                  <span className="rounded-full border-2 border-line px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-dim">{m.tag}</span>
                </div>
                <h3 className="text-xl font-bold">{m.title}</h3>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-muted">{m.body}</p>
                <div className="mt-5 flex items-center gap-1 text-sm font-semibold" style={{ color: m.color }}>
                  Enter <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <EffectSheet />

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="vx p-7">
            <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-violet">The assessment, decoded</div>
            <h2 className="text-2xl font-bold">What the current SDE online assessment looks like</h2>
            <p className="mt-2 text-sm text-muted">Formats vary by level and batch (candidate reports, not an official spec), but two blocks show up again and again:</p>
            <div className="mt-6 space-y-4">
              {[
                { icon: Code2, c: "var(--violet)", t: "DSA coding", time: "≈ 40–90 min · 1–2 problems", d: "LeetCode-medium style on HackerRank-like editors. Arrays/strings, sliding window, hashing, heaps, BFS/DFS, greedy, DP. Hidden tests hit edge cases and large inputs." },
                { icon: Bot, c: "var(--rose)", t: "AI-assisted repository debugging", time: "≈ 60 min · ~3 bugs", d: "A real codebase (Node.js, Python or Java), a ticket, failing tests and an AI assistant. Reproduce → trace → hypothesize → fix → verify. Exactly what the Debug Labs train." },
                { icon: FlaskConical, c: "var(--cyan)", t: "What graders love", time: "behaviour signals", d: "Small targeted diffs, reading the failing assertion first, not editing tests, verifying the AI's suggestions, and clean edge-case handling." },
              ].map((s) => {
                const I = s.icon;
                return (
                  <div key={s.t} className="flex gap-4">
                    <IsoIcon color={s.c} small>
                      <I className="h-4 w-4 text-white" />
                    </IsoIcon>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold">{s.t}</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-dim">
                          <Clock className="h-3 w-3" />
                          {s.time}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{s.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="vx p-7">
            <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-mint">Daily loop</div>
            <h2 className="text-2xl font-bold">≈ 2 hours a day, every day</h2>
            <p className="mt-2 text-sm text-muted">Repetition is the whole trick. Do this loop daily and bug patterns become reflexes.</p>
            <ol className="mt-6 space-y-3">
              {loop.map((s, i) => {
                const I = s.icon;
                return (
                  <li key={s.t} className="vx-sm flex items-center gap-3 px-3 py-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-lg font-mono text-xs font-bold text-white" style={{ background: s.color }}>
                      {i + 1}
                    </span>
                    <I className="h-4 w-4" style={{ color: s.color }} />
                    <span className="font-semibold">{s.t}</span>
                    <span className="ml-auto text-xs text-dim">{s.d}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 pb-12 pt-6 text-center text-xs text-dim">
        Built for personal practice. Code runs locally in Web Workers (Node-like sandbox + Pyodide). Progress is saved in your browser.
      </footer>
    </div>
  );
}

function IsoIcon({ color, children, small }: { color: string; children: React.ReactNode; small?: boolean }) {
  const s = small ? 40 : 54;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: s, height: s }}>
      <span className="absolute inset-0 rounded-[14px]" style={{ background: color, boxShadow: `0 ${small ? 3 : 5}px 0 color-mix(in oklab, ${color} 60%, black), inset 0 2px 0 rgba(255,255,255,.35)` }} />
      <span className="relative">{children}</span>
    </span>
  );
}
