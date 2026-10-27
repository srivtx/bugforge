import { buildLabs } from "@/content";
import { LabGrid, slim } from "@/components/lab/LabGrid";
import { SectionTitle } from "@/components/ui";

export const metadata = { title: "Build Labs · BugForge" };

export default function BuildPage() {
  return (
    <div className="bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <SectionTitle
          eyebrow="Implementation"
          title={
            <>
              Build it from <span className="text-gradient">TODO</span> to green.
            </>
          }
          sub="The opposite of debugging: you get a spec, a scaffolded codebase with stubbed functions, and a test suite. Implement the feature until every test passes. Rate limiters, caches, queues, auth, REST resources and more."
        />
        {buildLabs.length ? <LabGrid labs={buildLabs.map(slim)} /> : <p className="text-muted">Build labs are on the way.</p>}
      </div>
    </div>
  );
}
