import { lessons, exercisesFor, TRACKS } from "@/content/learn";
import { SectionTitle } from "@/components/ui";
import { LearnHub, type LessonCard } from "@/components/learn/LearnHub";

export const metadata = { title: "Learn · BugForge" };

export default function LearnPage() {
  // only card metadata goes to the client; lesson bodies stay on their own pages
  const cards: LessonCard[] = lessons.map((l) => ({ slug: l.slug, title: l.title, blurb: l.blurb, minutes: l.minutes, track: l.track ?? "core", color: l.color, widget: !!l.widget, exercises: exercisesFor(l.slug).map((e) => e.id) }));
  return (
    <div className="bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <SectionTitle
          art="learn"
          eyebrow="Learn"
          color="var(--mint)"
          title={
            <>
              The ideas behind every bug, <span className="text-gradient">explained once, properly.</span>
            </>
          }
          sub={`${lessons.length} short lessons across Node.js, databases, Python and the core debugging loop. The database track starts from zero and every lesson ends with code you run right here.`}
        />
        <LearnHub lessons={cards} tracks={TRACKS} />
      </div>
    </div>
  );
}
