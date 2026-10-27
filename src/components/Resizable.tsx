"use client";
// Draggable panel sizes for IDE-style layouts. Sizes and collapsed state persist per key in localStorage.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type PanelState = { size: number; collapsed: boolean };

export function usePanel(key: string, initial: number) {
  const [state, setState] = useState<PanelState>({ size: initial, collapsed: false });
  // read after mount so server and client render the same first frame
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bugforge.panel." + key);
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {}
  }, [key]);
  const change = useCallback(
    (fn: (s: PanelState) => PanelState) =>
      setState((s) => {
        const next = fn(s);
        try {
          localStorage.setItem("bugforge.panel." + key, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [key],
  );
  const actions = useMemo(
    () => ({
      setSize: (size: number) => change(() => ({ size, collapsed: false })),
      setCollapsed: (collapsed: boolean) => change((s) => ({ ...s, collapsed })),
      toggle: () => change((s) => ({ ...s, collapsed: !s.collapsed })),
      reset: () => change(() => ({ size: initial, collapsed: false })),
    }),
    [change, initial],
  );
  return { size: state.size, collapsed: state.collapsed, ...actions };
}

// A thin drag handle. "x" resizes a panel to its left (drag right = bigger);
// "y" resizes a panel below it (drag up = bigger). Double-click resets.
export function Splitter({ axis, size, min, max, onSize, onReset, className }: { axis: "x" | "y"; size: number; min: number; max: () => number; onSize: (n: number) => void; onReset?: () => void; className?: string }) {
  const start = useRef<{ p: number; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { p: axis === "x" ? e.clientX : e.clientY, size };
    setDragging(true);
    document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const d = (axis === "x" ? e.clientX : e.clientY) - start.current.p;
    const next = start.current.size + (axis === "x" ? d : -d);
    onSize(Math.round(Math.min(Math.max(next, min), max())));
  };
  const end = () => {
    start.current = null;
    setDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={onReset}
      className={clsx(
        "group relative z-20 shrink-0 touch-none",
        axis === "x" ? "-mx-[3px] w-[6px] cursor-col-resize" : "-my-[3px] h-[6px] cursor-row-resize",
        className,
      )}
    >
      <div
        className={clsx(
          "absolute rounded-full transition-colors",
          axis === "x" ? "inset-y-0 left-1/2 w-[2px] -translate-x-1/2" : "inset-x-0 top-1/2 h-[2px] -translate-y-1/2",
          dragging ? "bg-orange" : "bg-transparent group-hover:bg-orange/60",
        )}
      />
    </div>
  );
}
