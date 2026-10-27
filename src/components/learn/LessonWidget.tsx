"use client";
import { EventLoopWidget, PipelineWidget, StatusCodesWidget } from "./Widgets";

export function LessonWidget({ kind }: { kind: "event-loop" | "status-codes" | "pipeline" }) {
  if (kind === "event-loop") return <EventLoopWidget />;
  if (kind === "status-codes") return <StatusCodesWidget />;
  return <PipelineWidget />;
}
