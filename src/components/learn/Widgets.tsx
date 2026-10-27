"use client";
// Interactive blocks for Learn lessons.
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Play, RotateCcw } from "lucide-react";

/* ---------------------------------------------------------------- event loop */

const LOOP_CODE = [`console.log("A");`, `setTimeout(() => console.log("B"), 0);`, `Promise.resolve().then(() => console.log("C"));`, `console.log("D");`];

type LoopState = { line: number | null; stack: string[]; micro: string[]; macro: string[]; out: string[]; note: string };
const LOOP: LoopState[] = [
  { line: null, stack: ["main()"], micro: [], macro: [], out: [], note: "The script itself is the first task. It runs top to bottom on the call stack." },
  { line: 0, stack: ["main()", "console.log"], micro: [], macro: [], out: ["A"], note: "Synchronous: prints A immediately." },
  { line: 1, stack: ["main()", "setTimeout"], micro: [], macro: ["() => log B"], out: ["A"], note: "setTimeout hands the callback to the timer. After 0 ms it lands in the macrotask queue, but it can't run until the stack is empty." },
  { line: 2, stack: ["main()", "then"], micro: ["() => log C"], macro: ["() => log B"], out: ["A"], note: "The promise is already resolved, so its .then callback goes to the microtask queue." },
  { line: 3, stack: ["main()", "console.log"], micro: ["() => log C"], macro: ["() => log B"], out: ["A", "D"], note: "Still synchronous: prints D." },
  { line: null, stack: [], micro: ["() => log C"], macro: ["() => log B"], out: ["A", "D"], note: "The script finished; the stack is empty. Before any macrotask, drain ALL microtasks." },
  { line: null, stack: ["() => log C"], micro: [], macro: ["() => log B"], out: ["A", "D", "C"], note: "Microtask runs: prints C." },
  { line: null, stack: ["() => log B"], micro: [], macro: [], out: ["A", "D", "C", "B"], note: "Microtasks empty → take one macrotask: prints B. Final order: A, D, C, B." },
];

function Queue({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="vx-sm min-h-[120px] p-3">
      <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-dim">{title}</div>
      <div className="flex flex-col-reverse gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((x) => (
            <motion.div key={x} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0, x: 40 }} transition={{ type: "spring", stiffness: 380, damping: 26 }} className="rounded-lg px-2.5 py-1.5 font-mono text-[12px] font-bold text-white" style={{ background: color, boxShadow: "0 3px 0 rgba(0,0,0,.25)" }}>
              {x}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function EventLoopWidget() {
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (!play) return;
    if (i >= LOOP.length - 1) return setPlay(false);
    const t = setTimeout(() => setI(i + 1), 1300);
    return () => clearTimeout(t);
  }, [play, i]);
  const s = LOOP[i];
  return (
    <div className="vx p-5">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border-2 border-line bg-code p-3 font-mono text-[13px]">
          {LOOP_CODE.map((l, k) => (
            <div key={k} className={clsx("rounded px-2 py-0.5 transition", s.line === k && "bg-orange/20 ring-2 ring-orange")}>
              <span className="mr-3 text-dim">{k + 1}</span>
              {l}
            </div>
          ))}
        </div>
        <div className="vx-sm p-3">
          <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-dim">console</div>
          <div className="flex gap-1.5">
            {s.out.map((o) => (
              <motion.span key={o} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="grid h-9 w-9 place-items-center rounded-lg bg-mint font-mono font-bold text-white" style={{ boxShadow: "0 3px 0 var(--mint-edge)" }}>
                {o}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Queue title="call stack" items={s.stack} color="var(--violet)" />
        <Queue title="microtasks (promises)" items={s.micro} color="var(--orange)" />
        <Queue title="macrotasks (timers)" items={s.macro} color="var(--cyan)" />
      </div>
      <div className="mt-4 rounded-xl border-2 border-line bg-panel-2 px-4 py-3 text-sm">
        <span className="mr-2 font-mono text-xs font-bold text-orange">
          {i + 1}/{LOOP.length}
        </span>
        {s.note}
      </div>
      <Controls i={i} n={LOOP.length} setI={setI} play={play} setPlay={setPlay} />
    </div>
  );
}

function Controls({ i, n, setI, play, setPlay }: { i: number; n: number; setI: (n: number) => void; play: boolean; setPlay: (b: boolean) => void }) {
  return (
    <div className="mt-3 flex gap-2">
      <button aria-label="Restart" onClick={() => (setI(0), setPlay(false))} className="vx-btn grid h-9 w-9 place-items-center border-2 border-line bg-panel text-muted">
        <RotateCcw className="h-4 w-4" />
      </button>
      <button aria-label="Previous" onClick={() => setI(Math.max(0, i - 1))} className="vx-btn grid h-9 w-9 place-items-center border-2 border-line bg-panel text-muted">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button aria-label="Play" onClick={() => (i >= n - 1 && setI(0), setPlay(!play))} className="vx-btn grid h-9 w-11 place-items-center bg-orange text-white [--btn-edge:var(--orange-edge)]">
        <Play className="h-4 w-4" />
      </button>
      <button aria-label="Next" onClick={() => setI(Math.min(n - 1, i + 1))} className="vx-btn grid h-9 w-9 place-items-center border-2 border-line bg-panel text-muted">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- status codes */

const CODES: { code: number; name: string; when: string }[] = [
  { code: 200, name: "OK", when: "Successful GET, or an update that returns the resource." },
  { code: 201, name: "Created", when: "POST created a resource. Return it (or its id); optionally a Location header." },
  { code: 204, name: "No Content", when: "Success with no body, typically DELETE. Don't send JSON with it." },
  { code: 301, name: "Moved Permanently", when: "Permanent redirect, e.g. a short URL that never changes. Cached by browsers." },
  { code: 302, name: "Found", when: "Temporary redirect. Use when the target may change (or you need to count clicks)." },
  { code: 304, name: "Not Modified", when: "Conditional GET: the client's cached copy (ETag) is still valid." },
  { code: 400, name: "Bad Request", when: "Malformed input: invalid JSON, bad ObjectId (CastError), failed validation." },
  { code: 401, name: "Unauthorized", when: "Not authenticated: missing, malformed or expired token." },
  { code: 403, name: "Forbidden", when: "Authenticated but not allowed: wrong role, not the owner." },
  { code: 404, name: "Not Found", when: "Resource doesn't exist (findById returned null) or unknown route." },
  { code: 409, name: "Conflict", when: "Duplicate key (E11000), double booking, version conflict." },
  { code: 422, name: "Unprocessable", when: "Syntactically valid but semantically wrong. Some APIs use it for validation; match the tests." },
  { code: 429, name: "Too Many Requests", when: "Rate limited. Include Retry-After." },
  { code: 500, name: "Internal Error", when: "Unexpected server failure. In a debugging lab, usually a bug you should fix or translate." },
  { code: 502, name: "Bad Gateway", when: "An upstream service returned garbage." },
  { code: 503, name: "Unavailable", when: "Overloaded or down for maintenance. A transient error: safe to retry with backoff." },
];
const CLASS_COLOR: Record<number, string> = { 2: "var(--mint)", 3: "var(--violet)", 4: "var(--amber)", 5: "var(--rose)" };

export function StatusCodesWidget() {
  const [sel, setSel] = useState(CODES[1]);
  return (
    <div className="vx p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          {[2, 3, 4, 5].map((cls) => (
            <div key={cls} className="flex flex-wrap items-center gap-2">
              <span className="w-10 font-mono text-xs font-bold text-dim">{cls}xx</span>
              {CODES.filter((c) => Math.floor(c.code / 100) === cls).map((c) => (
                <motion.button
                  key={c.code}
                  whileHover={{ y: -3 }}
                  whileTap={{ y: 2 }}
                  onClick={() => setSel(c)}
                  className={clsx("rounded-xl px-3 py-2 font-mono text-sm font-bold text-white", sel.code === c.code && "ring-2 ring-text ring-offset-2 ring-offset-panel")}
                  style={{ background: CLASS_COLOR[cls], boxShadow: "0 4px 0 rgba(0,0,0,.25)" }}
                >
                  {c.code}
                </motion.button>
              ))}
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={sel.code} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="vx-sm p-4">
            <div className="font-mono text-3xl font-bold" style={{ color: CLASS_COLOR[Math.floor(sel.code / 100)] }}>
              {sel.code}
            </div>
            <div className="font-semibold">{sel.name}</div>
            <p className="mt-2 text-sm text-muted">{sel.when}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- express pipeline */

const STATIONS = ["express.json()", "cors()", "requireAuth", "router", "handler", "404 fallback", "errorHandler"];
const PATHS: { id: string; label: string; path: number[]; status: number; note: string }[] = [
  { id: "ok", label: "Valid token", path: [0, 1, 2, 3, 4], status: 200, note: "Every middleware calls next(); the handler responds with res.json(). Nothing after it runs." },
  { id: "noauth", label: "No token", path: [0, 1, 2], status: 401, note: "requireAuth responds with 401 and does NOT call next(). The router and handler never run." },
  { id: "throws", label: "Handler throws", path: [0, 1, 2, 3, 4, 6], status: 500, note: "The handler calls next(err) (or the async wrapper does). Express skips normal middleware and jumps to the 4-argument error handler." },
  { id: "unknown", label: "Unknown route", path: [0, 1, 2, 3, 5], status: 404, note: "No route matched, so the request falls through to the final app.use((req, res) => 404)." },
];

export function PipelineWidget() {
  const [p, setP] = useState(PATHS[0]);
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    const t = setInterval(() => setStep((s) => (s < p.path.length ? s + 1 : s)), 550);
    return () => clearInterval(t);
  }, [p]);
  const reached = p.path.slice(0, step);
  const current = reached[reached.length - 1];
  const done = step >= p.path.length;
  return (
    <div className="vx p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {PATHS.map((x) => (
          <button key={x.id} onClick={() => setP(x)} className={clsx("vx-btn border-2 px-3 py-1.5 text-[13px]", p.id === x.id ? "border-violet bg-violet font-semibold text-white [--btn-edge:var(--violet-edge)]" : "border-line bg-panel text-muted")}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {STATIONS.map((s, i) => {
          const on = reached.includes(i);
          const isErr = i === 6;
          return (
            <div key={s} className="flex items-center gap-2">
              <motion.div
                animate={{ y: current === i ? -6 : 0, scale: current === i ? 1.06 : 1 }}
                className="rounded-xl border-2 px-3 py-2 font-mono text-[12px] font-bold"
                style={{
                  background: on ? (isErr ? "var(--rose)" : "var(--violet)") : "var(--panel-2)",
                  color: on ? "#fff" : "var(--dim)",
                  borderColor: on ? "transparent" : "var(--line)",
                  boxShadow: on ? `0 4px 0 ${isErr ? "color-mix(in oklab, var(--rose) 60%, #000)" : "var(--violet-edge)"}` : "0 3px 0 var(--edge)",
                }}
              >
                {s}
              </motion.div>
              {i < STATIONS.length - 1 && <span className="text-dim">→</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border-2 border-line bg-panel-2 px-4 py-3 text-sm">
        <span className={clsx("rounded-lg px-2 py-0.5 font-mono font-bold text-white transition-opacity", !done && "opacity-30")} style={{ background: p.status < 300 ? "var(--mint)" : p.status < 500 ? "var(--amber)" : "var(--rose)" }}>
          {p.status}
        </span>
        <span>{p.note}</span>
      </div>
    </div>
  );
}
