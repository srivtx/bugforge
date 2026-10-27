"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Play, Database, Wand2, AlertTriangle } from "lucide-react";
import type { Trace } from "@/lib/types";
import { VIZ, type Frame } from "@/viz/frames";
import { VizPlayer } from "./VizPlayer";
import { Button } from "@/components/ui";

const Flow3D = dynamic(() => import("@/components/three/Flow3D").then((m) => m.Flow3D), {
  ssr: false,
  loading: () => <div className="shimmer h-full w-full" />,
});

type Scenario = { id: string; title: string; trace: Trace; explain: string[]; lesson: string };

const S = (id: number, method: string, url: string, status: Trace["status"], steps: Trace["steps"], body: unknown = null): Trace => ({ id, test: null, method, url, status, steps, body });

const SCENARIOS: Scenario[] = [
  {
    id: "find",
    title: "GET /users?role=admin: find users",
    trace: S(1, "GET", "/users?role=admin", 200, [
      { kind: "middleware", name: "cors()", detail: "adds Access-Control headers" },
      { kind: "middleware", name: "requireAuth", detail: "verifies the JWT in Authorization" },
      { kind: "router", name: "usersRouter", detail: "matches GET /users" },
      { kind: "handler", name: "listUsers", detail: "builds filter { role: 'admin' }" },
      { kind: "db", name: "User.find", detail: "{ role: 'admin' } → 3 docs", coll: "users", size: 12, matched: 3, op: "find" },
    ]),
    explain: [
      "The request enters the Express app and walks the middleware chain in the order it was registered with app.use().",
      "requireAuth reads the Bearer token. If it were missing, the chain would stop here with a 401 and the handler would never run.",
      "The router matches the path and method, then calls the handler.",
      "The handler turns the query string into a Mongo filter. User.find scans the users collection: 12 documents in the tower, 3 match and light up.",
      "The handler sends 200 with the 3 users. Always strip passwordHash before sending (select('-passwordHash')).",
    ],
    lesson: "Every request is a pipeline: middleware → router → handler → database → response. When a test fails, find which station behaved differently.",
  },
  {
    id: "login",
    title: "POST /login: wrong password",
    trace: S(2, "POST", "/login", 401, [
      { kind: "middleware", name: "express.json()", detail: "parses the JSON body" },
      { kind: "router", name: "authRouter", detail: "matches POST /login" },
      { kind: "handler", name: "login", detail: "looks up the user by email" },
      { kind: "db", name: "User.findOne", detail: "{ email } → 1 doc", coll: "users", size: 12, matched: 1, op: "findOne" },
      { kind: "handler", name: "bcrypt.compare", detail: "hash mismatch → 401" },
    ]),
    explain: [
      "Without express.json() req.body would be undefined. A very common bug in debugging rounds.",
      "The router hands the request to the login handler.",
      "findOne returns the single user with that email (one voxel glows).",
      "bcrypt.compare must be awaited. Forgetting await makes the comparison a Promise, which is truthy, so every password 'matches'.",
      "Wrong password → 401 with a generic message (don't reveal whether the email exists).",
    ],
    lesson: "Auth bugs hide in tiny details: a missing await, comparing plain text to a hash, or leaking which part was wrong.",
  },
  {
    id: "cast",
    title: "GET /orders/abc: invalid id",
    trace: S(3, "GET", "/orders/abc", 400, [
      { kind: "router", name: "ordersRouter", detail: "matches GET /orders/:id" },
      { kind: "handler", name: "getOrder", detail: "calls Order.findById('abc')" },
      { kind: "db", name: "Order.findById", detail: "CastError: 'abc' is not an ObjectId", coll: "orders", size: 8, matched: 0, op: "findById" },
      { kind: "error", name: "errorHandler", detail: "CastError → 400 Bad Request" },
    ]),
    explain: [
      "The router extracts :id = 'abc' from the path.",
      "The handler passes it straight to findById.",
      "Mongoose can't cast 'abc' into an ObjectId, so it throws a CastError and nothing in the tower matches.",
      "In Express 4 an async handler's rejection is lost unless you catch it and call next(err). Here it reaches the 4-argument error handler, which maps CastError to 400.",
    ],
    lesson: "Bad input is a 4xx, not a 500. Know where errors travel: throw → next(err) → error middleware (err, req, res, next).",
  },
  {
    id: "dup",
    title: "POST /users: duplicate email",
    trace: S(4, "POST", "/users", 409, [
      { kind: "middleware", name: "express.json()", detail: "parses the JSON body" },
      { kind: "middleware", name: "validate(userSchema)", detail: "email and password present" },
      { kind: "handler", name: "createUser", detail: "hashes the password, then User.create" },
      { kind: "db", name: "User.create", detail: "E11000 duplicate key { email }", coll: "users", size: 12, matched: 1, op: "insert" },
      { kind: "error", name: "errorHandler", detail: "code 11000 → 409 Conflict" },
    ]),
    explain: [
      "The body is parsed.",
      "Validation middleware rejects malformed input early, before any database work.",
      "The handler hashes the password (never store plain text).",
      "The unique index on email rejects the insert: the existing document glows as the conflict.",
      "The error handler converts Mongo's E11000 into 409 Conflict instead of a generic 500.",
    ],
    lesson: "Check-then-insert races; a unique index doesn't. Let the database enforce uniqueness and translate its error.",
  },
];

export function VisualizeLab() {
  const [sc, setSc] = useState(SCENARIOS[0]);
  const [playKey, setPlayKey] = useState(0);
  const ids = Object.keys(VIZ);
  const [vizId, setVizId] = useState("grid-bfs");
  const [input, setInput] = useState(() => JSON.stringify(VIZ["grid-bfs"].sample, null, 1));
  const [err, setErr] = useState("");
  const [frames, setFrames] = useState<Frame[]>(() => (VIZ["grid-bfs"].gen as (x: unknown) => Frame[])(VIZ["grid-bfs"].sample));

  const pick = (id: string) => {
    setVizId(id);
    setErr("");
    setInput(JSON.stringify(VIZ[id].sample, null, 1));
    setFrames((VIZ[id].gen as (x: unknown) => Frame[])(VIZ[id].sample));
  };
  const apply = () => {
    try {
      const v = JSON.parse(input);
      const f = (VIZ[vizId].gen as (x: unknown) => Frame[])(v);
      if (!f.length) throw new Error("That input produced no steps.");
      setFrames(f);
      setErr("");
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };
  const viz = VIZ[vizId];
  const stations = useMemo(() => sc.trace.steps, [sc]);

  return (
    <div className="space-y-14">
      {/* request world */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-mint" />
          <h2 className="text-2xl font-bold">Request → database, in 3D</h2>
        </div>
        <p className="mb-5 max-w-3xl text-muted">The orange cube is one HTTP request. Pillars are middleware (violet), the router (grey) and handlers (cyan). Towers are MongoDB collections: one voxel per document, and the ones a query matches glow yellow. Drag to orbit, scroll to zoom.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => (setSc(s), setPlayKey((k) => k + 1))} className={clsx("vx-btn border-2 px-3 py-1.5 font-mono text-[12.5px]", sc.id === s.id ? "border-mint bg-mint text-white [--btn-edge:var(--mint-edge)]" : "border-line bg-panel text-muted")}>
              {s.title}
            </button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="vx relative h-[360px] overflow-hidden sm:h-[480px]">
            <Flow3D key={sc.id + playKey} trace={sc.trace} playKey={playKey} />
            <div className="absolute bottom-3 left-3">
              <Button variant="primary" onClick={() => setPlayKey((k) => k + 1)}>
                <Play className="h-4 w-4" /> Replay
              </Button>
            </div>
          </div>
          <div className="vx max-h-[480px] overflow-y-auto p-4 scroll-thin">
            <div className="mb-3 font-mono text-xs text-dim">
              {sc.trace.method} {sc.trace.url} → <span className={clsx("font-bold", typeof sc.trace.status === "number" && sc.trace.status < 300 ? "text-mint" : "text-rose")}>{sc.trace.status}</span>
            </div>
            <ol className="space-y-3">
              {stations.map((st, i) => (
                <motion.li key={sc.id + i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="text-sm">
                  <div className="flex items-center gap-2 font-mono text-[12px] font-bold">
                    <span className="grid h-5 w-5 place-items-center rounded-md text-[10px] text-white" style={{ background: { middleware: "var(--violet)", router: "var(--dim)", handler: "var(--cyan)", db: "var(--mint)", error: "var(--rose)" }[st.kind] }}>
                      {i + 1}
                    </span>
                    {st.name}
                  </div>
                  <p className="mt-1 pl-7 leading-relaxed text-muted">{sc.explain[i]}</p>
                </motion.li>
              ))}
            </ol>
            <div className="mt-4 rounded-xl border-2 border-amber/40 bg-amber/10 p-3 text-sm">
              <span className="font-semibold">Takeaway: </span>
              {sc.lesson}
            </div>
          </div>
        </div>
      </section>

      {/* algorithm player */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-violet" />
          <h2 className="text-2xl font-bold">Algorithm playground</h2>
        </div>
        <p className="mb-5 max-w-3xl text-muted">Pick a pattern, edit the input, and step through. Every frame says what the algorithm decided and why. Grid BFS renders as rising voxel waves you can orbit.</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {ids.map((id) => (
            <button key={id} onClick={() => pick(id)} className={clsx("vx-btn border-2 px-3 py-1.5 text-[13px]", vizId === id ? "border-violet bg-violet font-semibold text-white [--btn-edge:var(--violet-edge)]" : "border-line bg-panel text-muted")}>
              {VIZ[id].title}
            </button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="vx h-fit p-4">
            <h3 className="font-semibold">{viz.title}</h3>
            <p className="mt-1 text-sm text-muted">{viz.blurb}</p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-dim">Input (JSON)</label>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} rows={8} className="mt-1 w-full rounded-xl border-2 border-line bg-panel-2 p-2 font-mono text-[12px] outline-none focus:border-violet/60" />
            {err && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-rose">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="violet" onClick={apply}>
                Visualize
              </Button>
              <Button variant="ghost" onClick={() => pick(vizId)}>
                Reset
              </Button>
            </div>
          </div>
          <div className="vx min-w-0 p-5">
            <VizPlayer frames={frames} />
          </div>
        </div>
      </section>
    </div>
  );
}
