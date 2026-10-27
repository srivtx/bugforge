import labsJson from "./labs.generated.json";
import type { Lab } from "@/lib/types";

export const labs = labsJson as unknown as Lab[];
export const debugLabs = labs.filter((l) => l.kind === "debug");
export const buildLabs = labs.filter((l) => l.kind === "build");
export const getLab = (slug: string) => labs.find((l) => l.slug === slug);
