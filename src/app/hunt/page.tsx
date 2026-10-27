import { HuntArena } from "@/components/hunt/HuntArena";
import { labs } from "@/content";

export const metadata = { title: "Bug Hunt ∞ · BugForge" };

export default function HuntPage() {
  return <HuntArena labs={labs} />;
}
