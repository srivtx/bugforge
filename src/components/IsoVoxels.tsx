// Lightweight isometric voxel art (pure SVG, no WebGL) for section headers.
// Each voxel drops into place on mount, then the whole model idles with a slow float.
import type { CSSProperties } from "react";

type V = [x: number, y: number, z: number, color: string];
export type IsoModel = "debug" | "build" | "drills" | "dsa" | "learn" | "progress" | "lab3d" | "hunt";

const O = "var(--orange)";
const R = "var(--rose)";
const VI = "var(--violet)";
const C = "var(--cyan)";
const M = "var(--mint)";
const A = "var(--amber)";
const P = "var(--panel-2)";

function box(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, color: (x: number, y: number, z: number) => string | null): V[] {
  const out: V[] = [];
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const c = color(x, y, z);
    if (c) out.push([x, y, z, c]);
  }
  return out;
}

const MODELS: Record<IsoModel, () => V[]> = {
  // a codebase tower with one bad block poking out
  debug: () => [
    ...box(0, 0, 2, 2, 0, 2, (x, y, z) => (x === 2 && y === 1 && z === 1 ? null : z === 2 && x + y > 3 ? null : O)),
    [3, 1, 1, R],
    [1, 1, 3, A],
  ],
  // staircase being built, one block still being placed
  build: () => [
    ...box(0, 0, 3, 1, 0, 3, (x, _y, z) => (z <= x ? (z % 2 ? C : VI) : null)),
    [3, 0, 5, A],
  ],
  // stepped target: rings rising to a bullseye
  drills: () =>
    box(0, 0, 4, 4, 0, 2, (x, y, z) => {
      const d = Math.max(Math.abs(x - 2), Math.abs(y - 2));
      return z <= 2 - d ? (d === 0 ? R : d === 1 ? P : A) : null;
    }),
  // bars sorted ascending
  dsa: () => box(0, 0, 4, 0, 0, 4, (x, _y, z) => (z <= x ? (x === 4 ? M : VI) : null)),
  // a stack of books
  learn: () => [
    ...box(0, 0, 3, 1, 0, 0, () => O),
    ...box(0, 0, 2, 1, 1, 1, () => VI),
    ...box(1, 0, 3, 1, 2, 2, () => C),
    [1, 1, 3, A],
  ],
  // skyline of progress columns
  progress: () => {
    const h = [[1, 2, 1], [2, 4, 3], [1, 3, 2]];
    const out: V[] = [];
    h.forEach((row, x) => row.forEach((n, y) => box(x, y, x, y, 0, n - 1, (_a, _b, z) => (z === n - 1 ? M : n >= 4 ? A : "var(--mint-edge)")).forEach((v) => out.push(v))));
    return out;
  },
  // request blocks flowing into a database tower
  lab3d: () => [
    ...box(3, 0, 4, 1, 0, 3, (_x, _y, z) => (z % 2 ? C : "var(--violet)")),
    [0, 0, 0, O],
    [1, 0, 0, P],
    [2, 0, 0, O],
    [0, 2, 0, P],
    [1, 2, 0, R],
  ],
  // an endless stack of bugs to clear
  hunt: () => [
    ...box(0, 0, 3, 3, 0, 0, (x, y) => ((x + y) % 2 ? P : O)),
    [1, 1, 1, R],
    [2, 2, 1, R],
    [2, 1, 2, A],
  ],
};

const S = 18; // cube edge in px
const CX = S * Math.cos(Math.PI / 6);

function shade(c: string, toward: "white" | "black", pct: number) {
  return `color-mix(in oklab, ${c} ${100 - pct}%, ${toward})`;
}

export function IsoVoxels({ model, className, style }: { model: IsoModel; className?: string; style?: CSSProperties }) {
  const vox = MODELS[model]().sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[2] - b[2] || a[0] - b[0]);
  const pts = vox.map(([x, y, z]) => [(x - y) * CX, (x + y) * S * 0.5 - z * S] as const);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs) - CX - 4;
  const maxX = Math.max(...xs) + CX + 4;
  const minY = Math.min(...ys) - S - 26;
  const maxY = Math.max(...ys) + S + 10;

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className={className} style={style} aria-hidden>
      <ellipse cx={(minX + maxX) / 2} cy={maxY - 10} rx={(maxX - minX) * 0.36} ry={S * 0.55} className="iso-shadow" fill="var(--shadow)" />
      <g className="iso-float">
        {vox.map(([, , , c], i) => {
          const [px, py] = pts[i];
          const top = `M${px},${py - S * 0.5} L${px + CX},${py} L${px},${py + S * 0.5} L${px - CX},${py} Z`;
          const left = `M${px - CX},${py} L${px},${py + S * 0.5} L${px},${py + S * 1.5} L${px - CX},${py + S} Z`;
          const right = `M${px + CX},${py} L${px},${py + S * 0.5} L${px},${py + S * 1.5} L${px + CX},${py + S} Z`;
          return (
            <g key={i} className="iso-drop" style={{ animationDelay: `${i * 35}ms` }}>
              <path d={left} style={{ fill: shade(c, "black", 12) }} />
              <path d={right} style={{ fill: shade(c, "black", 28) }} />
              <path d={top} style={{ fill: shade(c, "white", 18) }} />
              <path d={`M${px - CX * 0.55},${py - S * 0.02} L${px},${py - S * 0.3}`} stroke="white" strokeOpacity={0.45} strokeWidth={1.4} strokeLinecap="round" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
