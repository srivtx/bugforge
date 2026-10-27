import { notFound } from "next/navigation";
import { problems, getProblem } from "@/content";
import { DsaWorkspace } from "@/components/dsa/DsaWorkspace";

export function generateStaticParams() {
  return problems.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProblem((await params).slug);
  return { title: p ? `${p.title} · BugForge` : "Problem · BugForge" };
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProblem((await params).slug);
  if (!p) notFound();
  return <DsaWorkspace p={p} />;
}
