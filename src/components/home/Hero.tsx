"use client";
import Link from "next/link";
import { useState } from "react";
import { Bug, Hammer, ArrowRight, MousePointerClick } from "lucide-react";
import { PixelArt } from "@/components/PixelArt";
import { bug, wrench, potion, tree } from "@/content/sprites";

// Click the card to cycle the mascot: each sprite re-assembles from scattered pixels.
const STAGES = [
  { sprite: bug, tag: "debug", label: "Find the regression" },
  { sprite: wrench, tag: "hunt", label: "Fix it against the clock" },
  { sprite: potion, tag: "build", label: "Brew it from TODOs" },
  { sprite: tree, tag: "dsa", label: "Crack the pattern" },
];

export function Hero({ counts }: { counts: { debug: number; build: number; dsa: number; drills: number } }) {
  const [i, setI] = useState(0);
  const s = STAGES[i];
  const stats = [
    [counts.debug, "debug labs"],
    [counts.build, "build labs"],
    [counts.drills, "bug drills"],
    [counts.dsa, "DSA problems"],
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-8">
      <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line pb-3 text-dim">
        <span className="px-label">BugForge / 00</span>
        <span className="px-label hidden sm:inline">Interview practice</span>
        <span className="px-label hidden md:inline">Debug · Build · DSA</span>
        <span className="px-label">Runs in your browser</span>
      </div>

      <div className="grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-14">
        <div>
          <h1 className="text-[3rem] font-semibold leading-[0.98] tracking-[-0.035em] md:text-[5rem]">
            Break it.
            <br />
            Fix it.
            <br />
            <span className="text-orange">Build it.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted">Real codebases with failing tests, an endless bug-injection engine, build-from-scratch labs, spot-the-bug drills and DSA. Free, and it all runs in your browser.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/hunt" className="vx-btn inline-flex items-center gap-2 bg-orange px-5 py-3 font-semibold text-white [--btn-edge:var(--orange-edge)]">
              <Bug className="h-5 w-5" /> Start a Bug Hunt <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/debug" className="vx-btn inline-flex items-center gap-2 border-2 border-line bg-panel px-5 py-3 font-semibold">
              <Hammer className="h-5 w-5 text-orange" /> Browse labs
            </Link>
          </div>
        </div>

        <button type="button" onClick={() => setI((i + 1) % STAGES.length)} aria-label={`Show next mascot (now: ${s.label})`} className="group relative mx-auto aspect-square w-full max-w-[520px] cursor-pointer overflow-hidden rounded-2xl border border-line bg-[#fbf8f2] text-left">
          <PixelArt sprite={s.sprite} grid="lines" gridColor="rgba(128,118,104,0.16)" pad={3} label={s.label} className="absolute inset-0 h-full w-full" />
          <span className="px-label absolute left-3 top-3 text-[#8c889a]">fig. {String(i + 1).padStart(2, "0")} — {s.tag}</span>
          <span className="px-label absolute right-3 top-3 text-[#8c889a]">
            {i + 1}/{STAGES.length}
          </span>
          <span className="absolute inset-x-3 bottom-3 flex items-end justify-between">
            <span className="text-sm font-semibold text-[#17151c]">{s.label}</span>
            <span className="px-label flex items-center gap-1 text-[#8c889a] transition group-hover:text-[#17151c]">
              <MousePointerClick className="h-3 w-3" /> click
            </span>
          </span>
        </button>
      </div>

      <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-4">
        {stats.map(([n, l], k) => (
          <div key={l} className={`py-4 ${k ? "sm:border-l sm:pl-5" : ""} ${k % 2 ? "border-l border-line pl-5" : ""} border-line`}>
            <dt className="px-label text-dim">{l}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{n}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
