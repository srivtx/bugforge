import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PixelArt } from "@/components/PixelArt";
import { bug } from "@/content/sprites";

export const metadata = { title: "404 · BugForge" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-2xl border border-line bg-[#fbf8f2]">
        <PixelArt sprite={bug} mode="halftone" grid="dots" gridColor="rgba(128,118,104,0.25)" pad={3} label="A sleepy pixel bug" className="absolute inset-0 h-full w-full" />
        <span className="px-label absolute left-3 top-3 text-[#8c889a]">error state</span>
        <span className="px-label absolute right-3 top-3 text-[#8c889a]">404</span>
      </div>
      <h1 className="font-pixel mt-8 text-5xl font-bold text-orange md:text-6xl">404</h1>
      <p className="mt-2 text-lg font-semibold">This page has a bug we can&apos;t fix.</p>
      <p className="mt-1 text-sm text-muted">It doesn&apos;t exist. The ones in the labs do, though.</p>
      <Link href="/" className="vx-btn mt-6 inline-flex items-center gap-2 bg-orange px-4 py-2 text-sm font-semibold text-white [--btn-edge:var(--orange-edge)]">
        <ArrowLeft className="h-4 w-4" /> Back home
      </Link>
    </div>
  );
}
