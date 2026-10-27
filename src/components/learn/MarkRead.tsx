"use client";
// Records that a lesson was opened, for the Learn hub's track progress.
import { useEffect } from "react";
import { getProgress, update } from "@/lib/progress";

export function MarkRead({ slug }: { slug: string }) {
  useEffect(() => {
    if (!getProgress().lessonsRead[slug]) update((p) => ({ ...p, lessonsRead: { ...p.lessonsRead, [slug]: Date.now() } }));
  }, [slug]);
  return null;
}
