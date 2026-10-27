import { notFound } from "next/navigation";
import { labs, getLab } from "@/content";
import { LabWorkspace } from "@/components/lab/LabWorkspace";

export function generateStaticParams() {
  return labs.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const lab = getLab((await params).slug);
  return { title: lab ? `${lab.title} · BugForge` : "Lab · BugForge" };
}

export default async function LabPage({ params }: { params: Promise<{ slug: string }> }) {
  const lab = getLab((await params).slug);
  if (!lab) notFound();
  return <LabWorkspace lab={lab} />;
}
