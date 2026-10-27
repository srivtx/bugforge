"use client";
// Square-pixel confetti that bursts from the middle of its parent and a pixel-font reward label.
import { motion } from "framer-motion";

const COLORS = ["#eb9a5e", "#f3c978", "#78b99a", "#9d92df", "#7f97d6", "#df6a60"];

export function PixelBurst({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden" aria-live="polite">
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.2;
        const r = 120 + (i % 5) * 34;
        const s = 6 + (i % 3) * 4;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r + 40, opacity: 0 }}
            transition={{ duration: 1.1 + (i % 4) * 0.12, ease: [0.2, 0.7, 0.3, 1] }}
            className="absolute"
            style={{ width: s, height: s, background: COLORS[i % COLORS.length] }}
          />
        );
      })}
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.15, 1], opacity: [0, 1, 1, 0] }} transition={{ duration: 1.8, times: [0, 0.25, 0.4, 1] }} className="rounded-xl border border-line bg-panel px-5 py-3 text-center shadow-[0_4px_0_var(--edge)]">
        <div className="font-pixel text-2xl text-orange">{label}</div>
        {sub && <div className="px-label mt-1 text-dim">{sub}</div>}
      </motion.div>
    </div>
  );
}
