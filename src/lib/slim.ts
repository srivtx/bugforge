import type { Lab } from "./types";

// Lab summary for list pages (server-side, so the full file contents never ship to the client).
export type Slim = Pick<Lab, "slug" | "title" | "difficulty" | "minutes" | "tagline" | "concepts" | "lang" | "kind"> & { files: number; tests: number; bugs: number };

export function slim(l: Lab): Slim {
  const testCount = Object.values(l.tests).reduce((n, src) => n + (src.match(/^\s*(test|it)(\.each\([^)]*\))?\(|^\s*def test_/gm) || []).length, 0);
  return { slug: l.slug, title: l.title, difficulty: l.difficulty, minutes: l.minutes, tagline: l.tagline, concepts: l.concepts, lang: l.lang, kind: l.kind, files: Object.keys(l.files).length, tests: testCount, bugs: l.bugs.length };
}
