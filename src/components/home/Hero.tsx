"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, Hammer, ArrowRight, MousePointerClick } from "lucide-react";

const VoxelMorph = dynamic(() => import("@/components/three/VoxelMorph").then((m) => m.VoxelMorph), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[28px] bg-panel-2/60" />,
});

const CAPTIONS: Record<string, { label: string; color: string }> = {
  bug: { label: "Debug: find the regression", color: "var(--orange)" },
  code: { label: "DSA: crack the pattern", color: "var(--violet)" },
  hammer: { label: "Build: TODO → green", color: "var(--cyan)" },
  database: { label: "Data: query it right", color: "var(--mint)" },
};

export function Hero({ counts }: { counts: { debug: number; build: number; dsa: number; drills: number } }) {
  const [shape, setShape] = useState("bug");
  const cap = CAPTIONS[shape];
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-10 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
        <div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="vx-sm mb-6 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
            <span className="cube" style={{ background: "var(--mint)" }} />
            Debug · Build · DSA practice · runs 100% in your browser
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-[2.7rem] font-bold leading-[1.02] tracking-tight md:text-[4.1rem]">
            Break it.
            <br />
            Fix it. <span className="text-gradient">Build it.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Real multi-file codebases with failing tests, an endless bug-injection engine, build-from-scratch labs, rapid spot-the-bug drills and DSA, all with 3D voxel visualizations of what your code is actually doing.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mt-8 flex flex-wrap gap-3">
            <Link href="/hunt" className="vx-btn inline-flex items-center gap-2 bg-orange px-5 py-3 font-semibold text-white [--btn-edge:var(--orange-edge)]">
              <Bug className="h-5 w-5" /> Start a Bug Hunt <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/build" className="vx-btn inline-flex items-center gap-2 border-2 border-line bg-panel px-5 py-3 font-semibold">
              <Hammer className="h-5 w-5 text-cyan" /> Build something
            </Link>
          </motion.div>
          <div className="mt-9 grid max-w-lg grid-cols-4 gap-2">
            {[
              [counts.debug, "debug labs", "var(--rose)"],
              [counts.build, "build labs", "var(--cyan)"],
              [counts.drills, "bug drills", "var(--amber)"],
              [counts.dsa, "DSA problems", "var(--violet)"],
            ].map(([n, l, c]) => (
              <div key={l as string} className="vx-sm px-3 py-2">
                <div className="text-xl font-bold" style={{ color: c as string }}>
                  {n}
                </div>
                <div className="text-[11px] leading-tight text-dim">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-square w-full cursor-pointer">
            <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--orange)_22%,transparent),transparent_65%)] blur-2xl" />
            <VoxelMorph className="absolute inset-0" onShape={setShape} />
          </div>
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.div key={shape} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="vx-sm px-4 py-2 text-sm font-semibold" style={{ color: cap.color }}>
                {cap.label}
              </motion.div>
            </AnimatePresence>
            <span className="flex items-center gap-1 text-[11px] text-dim">
              <MousePointerClick className="h-3 w-3" /> click to morph
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
