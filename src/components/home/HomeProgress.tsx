"use client";
import Link from "next/link";
import { Flame, Trophy, Bug, Code2, Zap, ArrowRight } from "lucide-react";
import { useProgress } from "@/lib/progress";

export function HomeProgress() {
  const p = useProgress();
  const labsSolved = Object.values(p.labs).filter((l) => l.status === "solved").length;
  const dsaSolved = Object.values(p.problems).filter((l) => l.status === "solved").length;
  const drillsRight = Object.values(p.drills).filter((d) => d.correct).length;
  const days = Object.keys(p.activity).length;
  const items = [
    { icon: Flame, c: "var(--orange)", v: p.hunts.streak, l: "hunt streak" },
    { icon: Trophy, c: "var(--amber)", v: p.hunts.solved, l: "hunts cleared" },
    { icon: Bug, c: "var(--rose)", v: labsSolved, l: "labs solved" },
    { icon: Zap, c: "var(--amber)", v: drillsRight, l: "drills correct" },
    { icon: Code2, c: "var(--violet)", v: dsaSolved, l: "DSA solved" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-line bg-panel px-5 py-3">
        <span className="px-label text-orange">Your forge · {days ? `${days} day${days > 1 ? "s" : ""}` : "start today"}</span>
        {items.map((it) => {
          const I = it.icon;
          return (
            <div key={it.l} className="flex items-center gap-2">
              <I className="h-4 w-4" style={{ color: it.c }} />
              <span className="text-lg font-semibold tabular-nums">{it.v}</span>
              <span className="px-label text-dim">{it.l}</span>
            </div>
          );
        })}
        <Link href="/progress" className="px-label ml-auto flex items-center gap-1 text-dim hover:text-orange">
          Stats <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
