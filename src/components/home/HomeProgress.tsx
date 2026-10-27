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
    <div className="vx flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4">
      <div className="text-sm font-semibold">
        Your forge <span className="ml-1 text-xs font-normal text-dim">{days ? `${days} active day${days > 1 ? "s" : ""}` : "start today"}</span>
      </div>
      {items.map((it) => {
        const I = it.icon;
        return (
          <div key={it.l} className="flex items-center gap-2">
            <I className="h-5 w-5" style={{ color: it.c }} />
            <span className="text-lg font-bold tabular-nums">{it.v}</span>
            <span className="text-xs text-dim">{it.l}</span>
          </div>
        );
      })}
      <Link href="/progress" className="ml-auto flex items-center gap-1 text-sm font-medium text-violet hover:underline">
        Full stats <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
