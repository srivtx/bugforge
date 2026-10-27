import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-20">
      <h1 className="text-5xl font-semibold">BugForge</h1>
      <Link className="text-orange" href="/debug">Debug labs →</Link>
    </div>
  );
}
