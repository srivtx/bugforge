import { labs, problems, drills } from "@/content";
import { SectionTitle } from "@/components/ui";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";

export const metadata = { title: "Progress · BugForge" };

export default function ProgressPage() {
  return (
    <div className="bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <SectionTitle art="progress" eyebrow="Progress" color="var(--violet)" title={<>Every rep, <span className="text-gradient">stacked up.</span></>} sub="Stored only in this browser. Export it to move between machines." />
        <ProgressDashboard
          labs={labs.map((l) => ({ slug: l.slug, title: l.title, kind: l.kind, lang: l.lang }))}
          problems={problems.map((p) => ({ slug: p.slug, title: p.title, group: p.group }))}
          drills={drills.map((d) => ({ id: d.id, topic: d.topic, lang: d.lang }))}
        />
      </div>
    </div>
  );
}
