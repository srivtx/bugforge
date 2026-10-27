import labsJson from "./labs.generated.json";
import problemsJson from "./problems.generated.json";
import drillsJson from "./drills.generated.json";
import type { Drill, Lab, Problem } from "@/lib/types";

export const labs = labsJson as unknown as Lab[];
export const debugLabs = labs.filter((l) => l.kind === "debug");
export const buildLabs = labs.filter((l) => l.kind === "build");
export const getLab = (slug: string) => labs.find((l) => l.slug === slug);

export const problems = problemsJson as unknown as Problem[];
export const getProblem = (slug: string) => problems.find((p) => p.slug === slug);

export const drills = drillsJson as unknown as Drill[];
