import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PixelArt } from "@/components/PixelArt";
import { bug, wrench, potion } from "@/content/sprites";
import type { PixelMode } from "@/lib/pixelfield";

const rows = [
  { n: "01", title: ["Break", "it."], sprite: bug, href: "/debug", cta: "Debug labs", meta: "Repository debugging", body: "Every lab ships a real codebase, a bug ticket and a red test suite. Read the first failure, form one hypothesis, change one thing." },
  { n: "02", title: ["Fix", "it."], sprite: wrench, href: "/hunt", cta: "Bug Hunt", meta: "Endless reps", body: "A mutation engine plants fresh, verified regressions in working code. Clear them against the clock until the patterns are reflexes." },
  { n: "03", title: ["Build", "it."], sprite: potion, href: "/build", cta: "Build labs", meta: "Implementation", body: "A spec, some stubs and the tests. Brew rate limiters, queues, caches and auth from scratch until every check turns green." },
];

/** Editorial rows: a big numbered headline, a pixel sprite on its drawing grid, a short note. */
export function PixelRows() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      {rows.map((r) => (
        <div key={r.n} className="grid items-center gap-6 border-t border-line py-10 md:grid-cols-[1fr_minmax(0,1.15fr)_1fr]">
          <div className="self-start">
            <div className="px-label text-dim">{r.n}</div>
            <h2 className="mt-3 text-5xl font-light leading-[0.95] tracking-tight md:text-6xl">
              {r.title[0]}
              <br />
              {r.title[1]}
            </h2>
          </div>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-[#fbf8f2]">
            <PixelArt sprite={r.sprite} grid="lines" gridColor="rgba(128,118,104,0.16)" pad={3} label={`${r.meta} pixel illustration`} className="absolute inset-0 h-full w-full" />
            <span className="px-label absolute left-3 top-3 text-[#8c889a]">{r.meta}</span>
            <span className="px-label absolute bottom-3 right-3 text-[#8c889a]">bf/{r.n}</span>
          </div>
          <div className="self-end md:text-right">
            <p className="text-[15px] leading-relaxed text-muted">{r.body}</p>
            <Link href={r.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:underline">
              {r.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ))}
      <div className="flex justify-between border-t border-line pt-3">
        {["Break", "Fix", "Build", "Repeat"].map((w) => (
          <span key={w} className="px-label text-dim">
            {w}
          </span>
        ))}
      </div>
    </section>
  );
}

const effects: { mode: PixelMode; label: string }[] = [
  { mode: "original", label: "Original" },
  { mode: "mosaic", label: "Mosaic" },
  { mode: "rounded", label: "Rounded" },
  { mode: "halftone", label: "Halftone" },
  { mode: "cross", label: "Cross-stitch" },
  { mode: "dither", label: "Dither" },
];

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 0 C21 15 25 19 40 20 C25 21 21 25 20 40 C19 25 15 21 0 20 C15 19 19 15 20 0 Z" fill="currentColor" />
    </svg>
  );
}

/** One bug, six renders: an effect sheet on a printed-paper band. */
export function EffectSheet() {
  return (
    <section className="poster-band relative overflow-hidden py-16">
      <Sparkle className="absolute left-[6%] top-10 h-12 w-12 text-[#2f5fd0]" />
      <Sparkle className="absolute right-[8%] top-6 h-16 w-16 text-[#2f5fd0]" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="font-pixel text-5xl font-bold tracking-tight text-[#2f5fd0] md:text-7xl">EFFECTS</h2>
          <p className="mt-2 text-lg font-semibold">same bug, six renders</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#5d5a6b]">A bug looks different in every codebase. Point at one to poke it.</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {effects.map((e) => (
            <figure key={e.mode} className="text-center">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[180px]">
                <PixelArt sprite={bug} mode={e.mode} pad={1} label={`Bug rendered as ${e.label}`} className="absolute inset-0 h-full w-full" />
              </div>
              <figcaption className="mt-3 text-[15px] font-semibold text-[#2f5fd0]">{e.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
