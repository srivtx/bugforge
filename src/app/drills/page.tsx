import { drills } from "@/content";
import { DrillArena } from "@/components/drills/DrillArena";
import { SectionTitle } from "@/components/ui";

export const metadata = { title: "Spot the Bug · BugForge" };

export default function DrillsPage() {
  return (
    <div className="bg-grid min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <SectionTitle
          eyebrow="Rapid fire"
          color="var(--amber)"
          title={
            <>
              Spot the bug in <span className="text-gradient">45 seconds</span>.
            </>
          }
          sub="Short snippets in JavaScript, Python, Java and C++. Train your eyes to jump straight to the line that's wrong: off-by-ones, coercion traps, async mistakes, shared mutable state, overflow, iterator invalidation and more."
        />
        <DrillArena drills={drills} />
      </div>
    </div>
  );
}
