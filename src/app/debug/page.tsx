import { debugLabs } from "@/content";
import { LabGrid } from "@/components/lab/LabGrid";
import { slim } from "@/lib/slim";
import { SectionTitle } from "@/components/ui";

export const metadata = { title: "Debug Labs · BugForge" };

export default function DebugPage() {
  return (
    <div className="bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <SectionTitle art="debug"
          eyebrow="Repository debugging"
          title={
            <>
              Real codebases. Real bugs. <span className="text-gradient">Failing tests.</span>
            </>
          }
          sub="Each lab is a small multi-file service with a bug ticket and a test suite, the same shape as the repository-debugging rounds used in modern online assessments. Find the root causes, fix them, turn every test green. Everything runs in your browser."
        />
        <LabGrid labs={debugLabs.map(slim)} />
      </div>
    </div>
  );
}
