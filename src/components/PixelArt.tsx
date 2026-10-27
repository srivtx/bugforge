"use client";
// Canvas pixel sprite. Pixels fly in when it scrolls into view and shove away from the pointer.
// The animation loop only runs while something is moving, so idle sprites cost nothing.
import { useEffect, useRef } from "react";
import { PixelField, type PixelMode, type Sprite } from "@/lib/pixelfield";

export function PixelArt({ sprite, mode = "original", grid = null, gridColor, pad, className, label }: { sprite: Sprite; mode?: PixelMode; grid?: "lines" | "dots" | null; gridColor?: string; pad?: number; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const field = new PixelField(canvas, sprite, mode, { grid, gridColor, pad });
    const live = !!sprite.sparks?.length || mode === "halftone";
    let raf = 0;
    let visible = false;
    let born: number | null = reduced ? -1e9 : null; // time the sprite started assembling
    const t0 = performance.now();

    const frame = () => {
      raf = 0;
      const now = (performance.now() - t0) / 1000;
      if (born === null && visible) born = now;
      const scatter = born === null ? 1 : (1 - Math.min(1, (now - born) / 0.9)) ** 3;
      const moving = field.draw(scatter, reduced ? 0 : now);
      if (visible && (scatter > 0 || moving || (live && !reduced))) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      field.resize();
      kick();
    });
    ro.observe(canvas);
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      field.mouse.x = e.clientX - r.left;
      field.mouse.y = e.clientY - r.top;
      if (!field.mouse.on) Object.assign(field.mouse, { sx: field.mouse.x, sy: field.mouse.y, on: true });
      kick();
    };
    const leave = () => {
      field.mouse.on = false;
      kick();
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    field.draw(reduced ? 0 : 1, 0);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, [sprite, mode, grid, gridColor, pad]);

  return <canvas ref={ref} role="img" aria-label={label} className={className} />;
}
