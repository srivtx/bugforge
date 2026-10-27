import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { lessons, getLesson } from "@/content/learn";
import { Markdown } from "@/components/Markdown";
import { LessonWidget } from "@/components/learn/LessonWidget";

export function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const l = getLesson((await params).slug);
  return { title: l ? `${l.title} · BugForge` : "Learn · BugForge" };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const l = getLesson((await params).slug);
  if (!l) notFound();
  const idx = lessons.indexOf(l);
  const next = lessons[(idx + 1) % lessons.length];
  return (
    <div className="bg-grid">
      <article className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/learn" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" /> All lessons
        </Link>
        <div className="mb-2 flex items-center gap-2 font-mono text-xs text-dim">
          <span className="cube" style={{ background: l.color }} />
          <Clock className="h-3 w-3" /> {l.minutes} min read
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{l.title}</h1>
        <p className="mt-2 text-lg text-muted">{l.blurb}</p>
        {l.widget && (
          <div className="mt-8">
            <LessonWidget kind={l.widget} />
          </div>
        )}
        <div className="mt-6">
          <Markdown text={l.body} className="text-[15.5px]" />
        </div>
        {l.practice && (
          <div className="vx mt-10 p-5">
            <div className="mb-3 font-semibold">Practise it now</div>
            <div className="flex flex-wrap gap-2">
              {l.practice.map((p) => (
                <Link key={p.href} href={p.href} className="vx-btn bg-orange px-3.5 py-2 text-sm font-semibold text-white [--btn-edge:var(--orange-edge)]">
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        )}
        <Link href={`/learn/${next.slug}`} className="vx vx-hover mt-6 flex items-center justify-between p-5">
          <div>
            <div className="text-xs text-dim">Next lesson</div>
            <div className="font-semibold">{next.title}</div>
          </div>
          <ArrowRight className="h-5 w-5 text-orange" />
        </Link>
      </article>
    </div>
  );
}
