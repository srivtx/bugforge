// Pixel-art renderer, after Morphotype's PixelField: a sprite becomes a grid of cells drawn
// as pixels, mosaic tiles, round dots, halftone, cross-stitch or ordered dither. Cells are
// batched into one Path2D per colour, and the pointer pushes nearby cells away.

export type PixelMode = "original" | "mosaic" | "rounded" | "halftone" | "cross" | "dither";
export type Sprite = { rows: string[]; palette: Record<string, string>; sparks?: { x: number; y: number; c: string }[] };

const INF = 1e20;

/** Mixes a #rrggbb colour toward black (t < 0) or white (t > 0). */
function tone(hex: string, t: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t));
  return `rgb(${ch.join(",")})`;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** 1D squared distance transform (Felzenszwalb & Huttenlocher). */
function dt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Squared distance to the nearest zero cell, in place. */
function edt(g: Float64Array, w: number, h: number) {
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    dt1(f, h, d, v, z);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    dt1(f, w, d, v, z);
    for (let x = 0; x < w; x++) g[y * w + x] = d[x];
  }
}

/** Sub-cells per sprite pixel: textured modes need finer cells than the sprite. */
const SUB: Record<PixelMode, number> = { original: 1, mosaic: 1, rounded: 1, cross: 1, halftone: 3, dither: 2 };

type Cell = { i: number; j: number; color: string; depth: number; shade: number };

/** Lays a sprite out as cells; depth is distance (in cells) to the shape's edge, used by halftone/dither. */
function layout(sprite: Sprite, sub: number) {
  const h = sprite.rows.length * sub;
  const w = Math.max(...sprite.rows.map((r) => r.length)) * sub;
  const color = (i: number, j: number) => {
    const ch = sprite.rows[Math.floor(j / sub)]?.[Math.floor(i / sub)];
    return ch && ch !== "." ? sprite.palette[ch] ?? null : null;
  };
  const inside = new Float64Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) inside[j * w + i] = color(i, j) ? INF : 0;
  edt(inside, w, h);
  const cells: Cell[] = [];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const c = color(i, j);
      if (!c) continue;
      const s = Math.sin((i * 12.9898 + j * 78.233) * 1.7) * 43758.5453;
      cells.push({ i, j, color: c, depth: Math.sqrt(inside[j * w + i]), shade: s - Math.floor(s) });
    }
  return { w, h, cells };
}

export class PixelField {
  private ctx: CanvasRenderingContext2D;
  private cells: Cell[] = [];
  private gw = 0;
  private gh = 0;
  private cs = 8;
  private ox = 0;
  private oy = 0;
  private w = 0;
  private h = 0;
  mouse = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, on: false };

  constructor(
    private canvas: HTMLCanvasElement,
    private sprite: Sprite,
    private mode: PixelMode,
    private opts: { grid?: "lines" | "dots" | null; gridColor?: string; pad?: number } = {},
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sub = SUB[this.mode];
    const l = layout(this.sprite, sub);
    this.cells = l.cells;
    this.gw = l.w;
    this.gh = l.h;
    const pad = (this.opts.pad ?? 2) * sub;
    this.cs = Math.max(1.5, Math.min(r.width / (l.w + pad * 2), r.height / (l.h + pad * 2)));
    this.ox = (r.width - l.w * this.cs) / 2;
    this.oy = (r.height - l.h * this.cs) / 2;
  }

  /** Draws one frame. `scatter` (0..1) throws cells outward; `time` drives sparks and halftone shimmer. Returns true while the pointer is still settling. */
  draw(scatter = 0, time = 0) {
    const { ctx, cs, ox, oy, mode } = this;
    const m = this.mouse;
    m.sx += ((m.on ? m.x : -1e4) - m.sx) * (m.on ? 0.25 : 1);
    m.sy += ((m.on ? m.y : -1e4) - m.sy) * (m.on ? 0.25 : 1);
    const R = cs * 6 * SUB[mode], R2 = R * R;
    ctx.clearRect(0, 0, this.w, this.h);
    this.drawGrid();

    const paths = new Map<string, Path2D>();
    const path = (style: string) => {
      let p = paths.get(style);
      if (!p) paths.set(style, (p = new Path2D()));
      return p;
    };

    for (const c of this.cells) {
      let x = ox + c.i * cs, y = oy + c.j * cs;
      if (scatter) {
        const a = c.shade * Math.PI * 2;
        x += Math.cos(a) * scatter * cs * 14 * (0.4 + c.shade);
        y += Math.sin(a) * scatter * cs * 14 * (0.4 + c.shade) - scatter * cs * 6;
      }
      const dx = x + cs / 2 - m.sx, dy = y + cs / 2 - m.sy;
      const q = dx * dx + dy * dy;
      let near = 0;
      if (q < R2) {
        const dist = Math.sqrt(q) || 1;
        near = (1 - dist / R) ** 2;
        x += (dx / dist) * near * cs * 2.4;
        y += (dy / dist) * near * cs * 2.4;
      }

      if (mode === "original") {
        path(c.color).rect(x - 0.25, y - 0.25, cs + 0.5, cs + 0.5);
      } else if (mode === "mosaic") {
        const g = cs * 0.07;
        // per-tile tone jitter, like a rasterised mosaic
        const tone = c.shade < 0.33 ? "dark" : c.shade > 0.8 ? "light" : "";
        path(tone ? `${c.color}|${tone}` : c.color).rect(x + g, y + g, cs - 2 * g, cs - 2 * g);
      } else if (mode === "rounded") {
        const r = cs * 0.43;
        const p = path(c.color);
        p.moveTo(x + cs / 2 + r, y + cs / 2);
        p.arc(x + cs / 2, y + cs / 2, r, 0, Math.PI * 2);
      } else if (mode === "cross") {
        const g = cs * 0.2;
        const p = path(`${c.color}|stroke`);
        p.moveTo(x + g, y + g);
        p.lineTo(x + cs - g, y + cs - g);
        p.moveTo(x + cs - g, y + g);
        p.lineTo(x + g, y + cs - g);
      } else if (mode === "halftone") {
        // dots grow toward the middle of each shape and shimmer slowly
        let s = Math.min(1, 0.32 + c.depth / 5);
        s *= 0.8 + 0.2 * Math.sin(c.i * 0.35 + c.j * 0.22 - time * 1.4);
        const r = (cs / 2) * Math.sqrt(s) * 1.25 * (1 + near * 0.5);
        const p = path(c.color);
        p.moveTo(x + cs / 2 + r, y + cs / 2);
        p.arc(x + cs / 2, y + cs / 2, r, 0, Math.PI * 2);
      } else if (mode === "dither") {
        // solid rim, ordered-dither body
        const th = BAYER[(c.j & 3) * 4 + (c.i & 3)];
        if (c.depth < 1.6 || 0.58 > th || near > 0.25) path(c.color).rect(x, y, cs, cs);
      }
    }

    for (const [style, p] of paths) {
      const [color, kind] = style.split("|");
      if (kind === "stroke") {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, cs * 0.2);
        ctx.lineCap = "round";
        ctx.stroke(p);
      } else {
        ctx.fillStyle = kind === "dark" ? tone(color, -0.16) : kind === "light" ? tone(color, 0.2) : color;
        ctx.fill(p);
      }
    }
    this.drawSparks(time, scatter);
    return m.on || Math.abs(m.sx - m.x) > 0.5;
  }

  private drawGrid() {
    const { grid, gridColor = "rgba(40,30,20,0.12)" } = this.opts;
    if (!grid) return;
    const { ctx, cs } = this;
    const step = cs * SUB[this.mode];
    const x0 = this.ox - Math.floor(this.ox / step) * step;
    const y0 = this.oy - Math.floor(this.oy / step) * step;
    ctx.fillStyle = gridColor;
    if (grid === "lines") {
      for (let x = x0; x <= this.w; x += step) ctx.fillRect(Math.round(x), 0, 1, this.h);
      for (let y = y0; y <= this.h; y += step) ctx.fillRect(0, Math.round(y), this.w, 1);
    } else {
      const s = Math.max(1.2, step * 0.14);
      for (let x = x0; x <= this.w; x += step) for (let y = y0; y <= this.h; y += step) ctx.fillRect(x + step / 2 - s / 2, y + step / 2 - s / 2, s, s);
    }
  }

  /** Loose pixels rising off the sprite (potion bubbles, sparks). */
  private drawSparks(time: number, scatter: number) {
    const sparks = this.sprite.sparks;
    if (!sparks?.length) return;
    const sub = SUB[this.mode];
    const step = this.cs * sub;
    sparks.forEach((s, k) => {
      const t = (time * 0.35 + k * 0.37) % 1;
      const rise = t * 2.2;
      const alpha = Math.sin(t * Math.PI) * (1 - scatter);
      if (alpha <= 0.02) return;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = s.c;
      this.ctx.fillRect(this.ox + s.x * step, this.oy + (s.y - rise) * step, step, step);
    });
    this.ctx.globalAlpha = 1;
  }
}
