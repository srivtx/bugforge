import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { lessons } from "@/content/learn";
import { SectionTitle } from "@/components/ui";

export const metadata = { title: "Learn · BugForge" };

export default function LearnPage() {
  return (
    <div className="bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <SectionTitle
          eyebrow="Learn"
          color="var(--mint)"
          title={
            <>
              The ideas behind every bug, <span className="text-gradient">explained once, properly.</span>
            </>
          }
          sub="Short, visual explainers for the concepts the labs and drills keep testing. Each one links straight to practice."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => (
            <Link key={l.slug} href={`/learn/${l.slug}`} className="vx vx-hover group flex flex-col p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="cube" style={{ background: l.color }} />
                <span className="flex items-center gap-1 font-mono text-[11px] text-dim">
                  <Clock className="h-3 w-3" /> {l.minutes} min
                </span>
                {l.widget && (
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-violet">
                    <Sparkles className="h-3.5 w-3.5" /> interactive
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold group-hover:text-orange">{l.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{l.blurb}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
