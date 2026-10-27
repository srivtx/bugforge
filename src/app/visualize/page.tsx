import { SectionTitle } from "@/components/ui";
import { VisualizeLab } from "@/components/viz/VisualizeLab";

export const metadata = { title: "3D Lab · BugForge" };

export default function VisualizePage() {
  return (
    <div className="bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <SectionTitle
          eyebrow="3D Lab"
          color="var(--cyan)"
          title={
            <>
              See the code move. <span className="text-gradient">Then you remember it.</span>
            </>
          }
          sub="Watch requests travel through an Express app into MongoDB collections, and watch algorithms make decisions one block at a time."
        />
        <VisualizeLab />
      </div>
    </div>
  );
}
