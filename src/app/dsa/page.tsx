import { problems } from "@/content";
import { SectionTitle } from "@/components/ui";
import { ProblemList } from "@/components/dsa/ProblemList";

export const metadata = { title: "DSA · BugForge" };

export default function DsaPage() {
  const slim = problems.map(({ slug, title, difficulty, patterns, group, freq, testCount, viz }) => ({ slug, title, difficulty, patterns, group, freq, testCount, viz: !!viz }));
  return (
    <div className="bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <SectionTitle art="dsa"
          eyebrow="Algorithms"
          color="var(--violet)"
          title={
            <>
              The patterns that keep coming back, <span className="text-gradient">drilled until automatic.</span>
            </>
          }
          sub="Every problem has hidden tests (including large inputs that punish O(n²)), hints you reveal one at a time, a written approach, and a step-by-step visualization. Solve in JavaScript or Python, right in the browser."
        />
        <ProblemList problems={slim} />
      </div>
    </div>
  );
}
