"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bug, Hammer, ArrowRight } from "lucide-react";
import { PixelArt } from "@/components/PixelArt";
import { bug, wrench, potion, tree, bolt, book } from "@/content/sprites";
import type { PixelMode } from "@/lib/pixelfield";

// The hero poster flips every few seconds: each cell of the old sprite flies to the new one,
// and the paper colour changes with it. Only square-pixel modes here, no dots or stitches. Click to flip early, hover to hold.
const STAGES: { sprite: typeof bug; mode: PixelMode; bg: string; tag: string; label: string }[] = [
  { sprite: bug, mode: "original", bg: "#e6e0f3", tag: "debug", label: "Find the regression" },
  { sprite: wrench, mode: "mosaic", bg: "#f5e6b8", tag: "hunt", label: "Fix it against the clock" },
  { sprite: potion, mode: "dither", bg: "#d8ecdf", tag: "build", label: "Brew it from TODOs" },
  { sprite: tree, mode: "original", bg: "#f6dccb", tag: "dsa", label: "Crack the pattern" },
  { sprite: bolt, mode: "original", bg: "#f1dad6", tag: "drills", label: "Spot it in seconds" },
  { sprite: book, mode: "dither", bg: "#dbe7ee", tag: "learn", label: "Know why it broke" },
];
const HOLD = 3400;

export function Hero({ counts }: { counts: { debug: number; build: number; dsa: number; drills: number } }) {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const s = STAGES[i];
  useEffect(() => {
    if (held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setI((n) => (n + 1) % STAGES.length), HOLD);
    return () => clearTimeout(id);
  }, [i, held]);
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

        <button
          type="button"
          onClick={() => setI((i + 1) % STAGES.length)}
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          aria-label={`Show next illustration (now: ${s.label})`}
          className="group relative mx-auto aspect-square w-full max-w-[520px] cursor-pointer overflow-hidden rounded-2xl text-left border border-line text-[#17151c] shadow-[0_4px_0_var(--edge)] transition-[background-color] duration-700"
          style={{ background: s.bg }}
        >
          <PixelArt sprite={s.sprite} mode={s.mode} grid="lines" gridColor="rgba(60,48,36,0.08)" pad={3} label={s.label} className="absolute inset-0 h-full w-full" />
          <span className="px-label absolute left-4 top-4 text-[#17151c]/55">
            fig. {String(i + 1).padStart(2, "0")} — {s.tag}
          </span>
          <span className="px-label absolute right-4 top-4 text-[#17151c]/55">{s.mode}</span>
          <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
            <span className="text-base font-semibold">{s.label}</span>
            <span className="flex gap-1" aria-hidden>
              {STAGES.map((_, k) => (
                <span key={k} className={`h-2 w-2 ${k === i ? "bg-[#17151c]/70" : "bg-[#17151c]/15"}`} />
              ))}
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
