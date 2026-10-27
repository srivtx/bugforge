import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { lessons, getLesson, exercisesFor, TRACKS } from "@/content/learn";
import { LessonExercises } from "@/components/learn/LessonExercises";
import { MarkRead } from "@/components/learn/MarkRead";
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
  const track = lessons.filter((x) => x.track === l.track);
  const idx = track.indexOf(l);
  const next = track[(idx + 1) % track.length];
  const exercises = exercisesFor(l.slug);
  const trackInfo = TRACKS.find((t) => t.id === l.track);
  return (
    <div className="bg-grid">
      <article className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/learn" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" /> All lessons
        </Link>
        <MarkRead slug={l.slug} />
        <div className="mb-3 flex items-center gap-3 text-dim">
          <span className="px-label" style={{ color: trackInfo?.color }}>
            {trackInfo?.label} · {String(idx + 1).padStart(2, "0")}/{String(track.length).padStart(2, "0")}
          </span>
          <span className="px-label flex items-center gap-1">
            <Clock className="h-3 w-3" /> {l.minutes} min
          </span>
          {exercises.length > 0 && <span className="px-label text-orange">{exercises.length} hands-on</span>}
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
        {exercises.length > 0 && <LessonExercises lesson={l.slug} exercises={exercises} />}
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
            <div className="px-label text-dim">Next in {trackInfo?.label}</div>
            <div className="font-semibold">{next.title}</div>
          </div>
          <ArrowRight className="h-5 w-5 text-orange" />
        </Link>
      </article>
    </div>
  );
}
