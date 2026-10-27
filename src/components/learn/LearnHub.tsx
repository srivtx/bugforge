"use client";
// Learn hub: XP and level, a progress bar per track, and the lesson list filtered by track.
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Check, Clock, Sparkles, Code2 } from "lucide-react";
import { useProgress } from "@/lib/progress";
import type { Track } from "@/content/learn";

export type LessonCard = { slug: string; title: string; blurb: string; minutes: number; track: Track; color: string; widget: boolean; exercises: string[] };
type TrackInfo = { id: Track; label: string; blurb: string; color: string };

const LEVEL = 50;

export function LearnHub({ lessons, tracks }: { lessons: LessonCard[]; tracks: TrackInfo[] }) {
  const p = useProgress();
  const [filter, setFilter] = useState<Track | "all">("all");
  const solved = (l: LessonCard, id: string) => p.exercises[`${l.slug}/${id}`]?.status === "solved";
  const lessonDone = (l: LessonCard) => (l.exercises.length ? l.exercises.every((id) => solved(l, id)) : !!p.lessonsRead[l.slug]);
  const xp = Object.values(p.exercises).reduce((a, e) => a + (e.xp ?? 0), 0) + Object.keys(p.lessonsRead).length;
  const level = Math.floor(xp / LEVEL) + 1;
  const into = xp % LEVEL;
  const shown = lessons.filter((l) => filter === "all" || l.track === filter);

  return (
    <>
      {/* XP strip */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-line bg-panel px-5 py-4 shadow-[0_4px_0_var(--edge)]">
        <div className="flex items-baseline gap-2">
          <span className="font-pixel text-3xl text-orange">LV {level}</span>
          <span className="px-label text-dim">{xp} xp</span>
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="flex gap-[3px]" aria-label={`${into} of ${LEVEL} xp to level ${level + 1}`}>
            {Array.from({ length: 25 }).map((_, i) => (
              <motion.span key={i} initial={false} animate={{ opacity: i < Math.round((into / LEVEL) * 25) ? 1 : 0.18 }} className="h-3 flex-1 bg-orange" />
            ))}
          </div>
          <div className="px-label mt-1.5 text-dim">
            {LEVEL - into} xp to level {level + 1} · read a lesson +1 · solve an exercise up to +10
          </div>
        </div>
      </div>

      {/* tracks */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tracks.map((t) => {
          const ls = lessons.filter((l) => l.track === t.id);
          const done = ls.filter(lessonDone).length;
          const exTotal = ls.reduce((a, l) => a + l.exercises.length, 0);
          const exDone = ls.reduce((a, l) => a + l.exercises.filter((id) => solved(l, id)).length, 0);
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(active ? "all" : t.id)} className={clsx("rounded-2xl border bg-panel p-4 text-left transition hover:-translate-y-0.5", active ? "border-orange shadow-[0_4px_0_var(--orange-edge)]" : "border-line shadow-[0_4px_0_var(--edge)]")}>
              <div className="flex items-center justify-between">
                <span className="px-label" style={{ color: t.color }}>
                  {t.label}
                </span>
                <span className="px-label text-dim">
                  {done}/{ls.length}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{t.blurb}</p>
              <div className="mt-3 flex gap-[2px]">
                {ls.map((l) => (
                  <span key={l.slug} className="h-2 flex-1" style={{ background: t.color, opacity: lessonDone(l) ? 1 : p.lessonsRead[l.slug] ? 0.45 : 0.15 }} />
                ))}
              </div>
              {exTotal > 0 && (
                <div className="px-label mt-2 text-dim">
                  {exDone}/{exTotal} exercises
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[{ id: "all" as const, label: "All" }, ...tracks].map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)} className={clsx("px-label rounded-md border px-3 py-1.5 transition", filter === t.id ? "border-orange bg-orange text-white" : "border-line bg-panel text-dim hover:text-text")}>
            {t.label} · {t.id === "all" ? lessons.length : lessons.filter((l) => l.track === t.id).length}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((l, i) => {
          const done = lessonDone(l);
          const exDone = l.exercises.filter((id) => solved(l, id)).length;
          return (
            <motion.div key={l.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.025 }}>
              <Link href={`/learn/${l.slug}`} className="vx vx-hover group flex h-full flex-col p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="px-label" style={{ color: l.color }}>
                    {tracks.find((t) => t.id === l.track)?.label}
                  </span>
                  <span className="px-label flex items-center gap-1 text-dim">
                    <Clock className="h-3 w-3" /> {l.minutes}m
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {l.widget && <Sparkles className="h-3.5 w-3.5 text-violet" aria-label="interactive" />}
                    {l.exercises.length > 0 && (
                      <span className={clsx("px-label flex items-center gap-1", exDone === l.exercises.length ? "text-mint" : "text-orange")}>
                        <Code2 className="h-3.5 w-3.5" /> {exDone}/{l.exercises.length}
                      </span>
                    )}
                    {done && (
                      <span className="grid h-5 w-5 place-items-center bg-mint text-white" aria-label="done">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </span>
                </div>
                <h3 className="text-lg font-semibold group-hover:text-orange">{l.title}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted">{l.blurb}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
