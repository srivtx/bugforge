import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PixelArt } from "@/components/PixelArt";
import { bug, wrench, potion, bolt, tree, book } from "@/content/sprites";
import type { PixelMode, Sprite } from "@/lib/pixelfield";
import { debugLabs, buildLabs } from "@/content";

/** Home section header: numbered pixel label on a hairline, then one headline style for every chapter. */
export function Chapter({ n, label, title, sub, right }: { n: string; label: string; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-3 text-dim">
        <span className="px-label">
          {n} / {label}
        </span>
        {right}
      </div>
      <h2 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-5xl">{title}</h2>
      {sub && <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

const rows = [
  {
    n: "01",
    title: "Debug labs",
    sprite: bug,
    href: "/debug",
    cta: "Open a lab",
    meta: "Repository debugging",
    body: "Every lab ships a real codebase, a bug ticket and a red test suite. Read the first failure, form one hypothesis, change one thing.",
    facts: [
      ["Labs", String(debugLabs.length)],
      ["Stack", "Node · Python"],
      ["Bugs", "~3 per lab"],
    ],
    steps: ["Read the ticket", "Run the tests", "Trace", "Fix", "Verify"],
  },
  {
    n: "02",
    title: "Bug Hunt",
    sprite: wrench,
    href: "/hunt",
    cta: "Start hunting",
    meta: "Endless reps",
    body: "A mutation engine plants fresh, verified regressions in working code. Clear them against the clock until the patterns are reflexes.",
    facts: [
      ["Bugs", "Endless"],
      ["Mode", "Timed"],
      ["Track", "Streaks"],
    ],
    steps: ["Get a mutant", "Spot the diff", "Patch", "Next"],
  },
  {
    n: "03",
    title: "Build labs",
    sprite: potion,
    href: "/build",
    cta: "Build something",
    meta: "Implementation",
    body: "A spec, some stubs and the tests. Brew rate limiters, queues, caches and auth from scratch until every check turns green.",
    facts: [
      ["Labs", String(buildLabs.length)],
      ["Start", "Spec + stubs"],
      ["Done", "All green"],
    ],
    steps: ["Read the spec", "Fill the TODOs", "Run", "Ship"],
  },
];

/** The three core modes: sprite card and a filled spec column, alternating sides. */
export function PixelRows() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      {rows.map((r, k) => (
        <div key={r.n} className="grid items-center gap-8 border-t border-line py-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14">
          <div className={k % 2 ? "md:order-2" : ""}>
            <SpriteCard sprite={r.sprite} label={`${r.title} pixel illustration`} tl={`fig. ${r.n}`} br="poke it" />
          </div>
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="px-label text-orange">
                {r.n} / {r.meta}
              </span>
              <span className="px-label text-dim">{["Break", "Fix", "Build"][k]} it</span>
            </div>
            <h3 className="mt-6 text-5xl font-semibold leading-[1] tracking-[-0.035em] md:text-6xl">{r.title}</h3>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-muted">{r.body}</p>

            <dl className="mt-8 grid grid-cols-3 border-y border-line">
              {r.facts.map(([l, v], i) => (
                <div key={l} className={`py-4 ${i ? "border-l border-line pl-4" : ""}`}>
                  <dt className="px-label text-dim">{l}</dt>
                  <dd className="mt-1 text-xl font-semibold tracking-tight">{v}</dd>
                </div>
              ))}
            </dl>

            <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2">
              {r.steps.map((st, i) => (
                <li key={st} className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1">
                    <span className="px-label text-orange">{i + 1}</span>
                    <span className="text-[13px] font-medium">{st}</span>
                  </span>
                  {i < r.steps.length - 1 && <span className="px-label text-dim">→</span>}
                </li>
              ))}
            </ol>

            <Link href={r.href} className="vx-btn mt-8 inline-flex items-center gap-2 bg-orange px-4 py-2.5 text-sm font-semibold text-white [--btn-edge:var(--orange-edge)]">
              {r.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ))}
      <div className="flex justify-between border-t border-line pt-3 text-dim">
        {["Break", "Fix", "Build", "Repeat"].map((w) => (
          <span key={w} className="px-label">
            {w}
          </span>
        ))}
      </div>
    </section>
  );
}

function SpriteCard({ sprite, label, tl, br }: { sprite: Sprite; label: string; tl: string; br: string }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px] overflow-hidden rounded-2xl border border-line bg-[#fbf8f2]">
      <PixelArt sprite={sprite} grid="lines" gridColor="rgba(128,118,104,0.16)" pad={3} label={label} className="absolute inset-0 h-full w-full" />
      <span className="px-label absolute left-3 top-3 text-[#8c889a]">{tl}</span>
      <span className="px-label absolute bottom-3 right-3 text-[#8c889a]">{br}</span>
    </div>
  );
}

// Flat-colour poster cards, the same in both themes.
const posters = [
  { n: "04", href: "/drills", title: "Spot the Bug", sprite: bolt, bg: "#ff9a3c", body: "Timed: click the buggy line in JS, Python, Java and C++." },
  { n: "05", href: "/dsa", title: "DSA Arena", sprite: tree, bg: "#b7acff", body: "OA-style problems, hidden tests, hints and visualizations." },
  { n: "06", href: "/learn", title: "Learn Hub", sprite: book, bg: "#8fe0bf", body: "The event loop, middleware, HTTP and concurrency, drawn out." },
];

export function ModePosters() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <Chapter
        n="04–06"
        label="More modes"
        title="Sharpen the edges."
        sub="Speed reading, patterns and the concepts underneath. Point at a sprite to poke it."
        right={
          <Link href="/visualize" className="px-label hidden items-center gap-1 hover:text-orange sm:flex">
            3D lab <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="grid gap-5 sm:grid-cols-3">
        {posters.map((p) => (
          <Link key={p.href} href={p.href} className="group relative flex flex-col overflow-hidden rounded-2xl text-[#17151c] transition hover:-translate-y-1" style={{ background: p.bg }}>
            <div className="flex justify-between px-4 pt-4">
              <span className="px-label">{p.n}</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
            <div className="relative aspect-[4/3]">
              <PixelArt sprite={p.sprite} pad={2} label={`${p.title} pixel illustration`} className="absolute inset-0 h-full w-full" />
            </div>
            <div className="border-t border-[#17151c]/15 p-4">
              <h3 className="text-2xl font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#17151c]/75">{p.body}</p>
            </div>
          </Link>
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

/** One bug, six renders: an effect sheet on a printed-paper band. */
export function EffectSheet() {
  return (
    <section className="poster-band py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between gap-4 border-b border-[#17151c]/15 pb-3 text-[#8c7f6c]">
          <span className="px-label">07 / Field guide</span>
          <span className="px-label">1 bug × 6 renders</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr] md:items-end">
          <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-5xl">
            Same bug,
            <br />
            <span className="text-[#ff7a1a]">six disguises.</span>
          </h2>
          <p className="max-w-md text-[15.5px] leading-relaxed text-[#5d5a6b] md:justify-self-end md:text-right">A regression looks different in every codebase. Learn its shape, not its outfit.</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {effects.map((e, k) => (
            <figure key={e.mode}>
              <div className="relative mx-auto aspect-[4/5] w-full">
                <PixelArt sprite={bug} mode={e.mode} pad={1} label={`Bug rendered as ${e.label}`} className="absolute inset-0 h-full w-full" />
              </div>
              <figcaption className="mt-3 flex justify-between border-t border-[#17151c]/15 pt-2">
                <span className="px-label text-[#8c7f6c]">{String(k + 1).padStart(2, "0")}</span>
                <span className="px-label">{e.label}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
