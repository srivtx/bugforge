// Concept explainers for the Learn hub. Markdown bodies; `widget` picks an interactive block rendered above the text.

export interface Lesson {
  slug: string;
  title: string;
  blurb: string;
  color: string;
  minutes: number;
  widget?: "event-loop" | "status-codes" | "pipeline";
  practice?: { label: string; href: string }[];
  body: string;
}

export const lessons: Lesson[] = [
  {
    slug: "debugging-playbook",
    title: "The debugging playbook",
    blurb: "A repeatable loop for any failing codebase: reproduce, localise, explain, fix, verify.",
    color: "var(--rose)",
    minutes: 8,
    practice: [
      { label: "Debug labs", href: "/debug" },
      { label: "Bug Hunt ∞", href: "/hunt" },
    ],
    body: `
Repository-debugging rounds hand you an unfamiliar service, a ticket and a red test suite. You aren't graded on how clever the fix is; you're graded on whether the tests go green **without breaking anything else**, inside the time box. A system beats intuition.

## The loop

1. **Run the tests first.** Before reading any source, see what fails. The failing test names are the spec.
2. **Read one failing test end-to-end.** What request does it send? What does it expect back: status, body shape, database state?
3. **Trace the path.** Follow the request: \`app.js\` → middleware → router → controller → service → model. Use the *Request flow* tab: the station where the actual behaviour diverges from the expected one is where the bug lives.
4. **Form one hypothesis**, in a sentence: "the price is a string, so \`+\` concatenates". If you can't say it, you don't understand it yet.
5. **Make the smallest fix** that addresses the root cause, not the symptom. Don't rewrite the module.
6. **Re-run everything.** A fix that turns one test green and another red is not a fix.

## Where bugs hide (in rough order of frequency)

| Category | Typical shape |
|---|---|
| Async | missing \`await\`, \`forEach(async…)\`, error swallowed in a promise |
| Off-by-one | \`<\` vs \`<=\`, \`slice(0, n-1)\`, page \`* limit\` instead of \`(page-1) * limit\` |
| Types | \`"10" + 5\`, \`req.query\` values are strings, ObjectId vs string compare |
| Middleware order | auth registered after the routes, \`express.json()\` missing |
| Status codes | 200 on create (should be 201), 500 on bad input (should be 400) |
| Mutation | sorting/shared arrays in place, default object reused |
| Boundaries | empty list, missing field, duplicate key, expired token |

## Time management

- Spend the **first 3 minutes** just running tests and skimming the file tree.
- If you've been staring at one file for 10 minutes, step back and re-read the failing assertion.
- Fix bugs in the order the tests fail: earlier failures often cause later ones.
- Use \`console.log\` liberally; the *Logs* tab groups them per test.

> Interviewers love hearing the hypothesis out loud: "I think X because Y; let me confirm by Z." Practise narrating it here.
`,
  },
  {
    slug: "event-loop",
    title: "The event loop, visually",
    blurb: "Call stack, microtasks, macrotasks: why Promise callbacks beat setTimeout(0).",
    color: "var(--orange)",
    minutes: 6,
    widget: "event-loop",
    practice: [{ label: "Async debug lab", href: "/lab/async-pitfalls" }],
    body: `
JavaScript runs **one thing at a time** on the call stack. Everything asynchronous is a callback that waits in a queue until the stack is empty.

## The rules

1. Run the current script to completion (synchronous code first, always).
2. Drain **all microtasks**: \`Promise.then\`, \`await\` continuations, \`queueMicrotask\`.
3. Take **one macrotask**: a \`setTimeout\`, I/O callback or \`setImmediate\`.
4. Drain microtasks again. Repeat.

So the output of the classic puzzle above is \`A, D, C, B\`: synchronous logs first, then the promise callback, then the timer, even with a 0 ms delay.

## Why debugging rounds care

- **Forgotten \`await\`**: the function returns a pending Promise. \`if (promise)\` is always truthy, so a failed password check "passes".
- **\`array.forEach(async x => …)\`** doesn't wait: forEach ignores the returned promises. Use \`for…of\` with \`await\`, or \`await Promise.all(array.map(…))\`.
- **Sequential awaits in a loop** are slow when the calls are independent; \`Promise.all\` runs them concurrently.
- **Unhandled rejections**: an \`async\` Express handler that throws without try/catch never reaches your error middleware in Express 4.

\`\`\`js
// ❌ returns before any save finishes
items.forEach(async (it) => { await it.save(); });
// ✅
await Promise.all(items.map((it) => it.save()));
\`\`\`
`,
  },
  {
    slug: "express-pipeline",
    title: "Express request pipeline",
    blurb: "Middleware order, next(), error handlers with four arguments, and 'headers already sent'.",
    color: "var(--violet)",
    minutes: 7,
    widget: "pipeline",
    practice: [
      { label: "Auth lab", href: "/lab/auth-jwt" },
      { label: "Wiring lab", href: "/lab/express-wiring" },
    ],
    body: `
An Express app is a **list of functions** tried in registration order. Each one either responds or calls \`next()\` to pass control on.

\`\`\`js
app.use(express.json());          // 1. parse body → req.body
app.use(cors());                  // 2. headers
app.use("/api/orders", requireAuth, ordersRouter); // 3. auth only for this mount
app.use((req, res) => res.status(404).json({ error: "Not found" })); // 4. fallthrough
app.use((err, req, res, next) => { /* 5. error handler: FOUR args */ });
\`\`\`

## Rules that cause real bugs

- **Order matters.** Middleware registered *after* a route never runs for that route. \`express.json()\` must come before handlers that read \`req.body\`.
- **An error handler is recognised by arity.** \`(err, req, res, next)\` with four parameters. Drop \`next\` and Express treats it as normal middleware.
- **\`next(err)\` skips to the error handler**; \`next()\` continues normally; \`next('route')\` skips the rest of the current route's handlers.
- **Respond once.** \`res.json()\` followed by another \`res.send()\` throws *Cannot set headers after they are sent*. Usually a missing \`return\` before an early response:

\`\`\`js
if (!user) res.status(404).json({ error: "no user" }); // ❌ falls through
if (!user) return res.status(404).json({ error: "no user" }); // ✅
\`\`\`

- **Async errors (Express 4)**: wrap handlers so rejections reach \`next\`:

\`\`\`js
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
\`\`\`

- **\`req.params\` and \`req.query\` are strings.** \`req.query.limit + 1\` is \`"101"\`.
`,
  },
  {
    slug: "mongoose",
    title: "Mongoose & MongoDB essentials",
    blurb: "Queries, ObjectIds, CastError, {new: true}, populate, unique indexes, hooks.",
    color: "var(--mint)",
    minutes: 8,
    practice: [
      { label: "Watchlist lab", href: "/lab/watchlist-api" },
      { label: "Inventory lab", href: "/lab/inventory-errors" },
      { label: "CRUD build lab", href: "/lab/build-notes-crud" },
    ],
    body: `
## Queries you'll see every time

| Call | Returns | Gotcha |
|---|---|---|
| \`Model.find(filter)\` | array (maybe empty) | never \`null\`, so \`if (!docs)\` is wrong |
| \`Model.findOne(filter)\` | doc or \`null\` | check for \`null\` → 404 |
| \`Model.findById(id)\` | doc or \`null\` | invalid id string → **CastError** |
| \`findByIdAndUpdate(id, upd)\` | the **old** doc | pass \`{ new: true }\` for the updated one |
| \`Model.create(data)\` | new doc | runs validators and \`pre('save')\` hooks |
| \`updateOne\` / \`updateMany\` | \`{ matchedCount, modifiedCount }\` | skips \`save\` hooks |

## ObjectIds

\`doc._id\` is an **ObjectId object**, not a string. \`doc.owner === req.user.id\` is always false; use \`doc.owner.equals(id)\` or \`String(doc.owner) === id\`.

## Errors to translate (not 500!)

- **CastError** (bad id) → \`400\`
- **ValidationError** (required/min/enum) → \`400\` with the field messages
- **E11000 duplicate key** (unique index) → \`409 Conflict\`
- \`null\` result → \`404\`

## Hooks and \`this\`

\`\`\`js
// ❌ arrow function: \`this\` is not the document
userSchema.pre("save", async () => { this.password = await hash(this.password); });
// ✅ and only re-hash when it changed
userSchema.pre("save", async function () {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 10);
});
\`\`\`

## Atomic updates

Read-modify-write in JS (\`doc.stock -= 1; await doc.save()\`) races under concurrency. Push the condition into the query:

\`\`\`js
await Product.updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
\`\`\`

## populate

\`Order.find().populate("user", "name email")\` swaps the stored ObjectId for the referenced document. Without it, \`order.user.name\` is \`undefined\`.
`,
  },
  {
    slug: "http-status",
    title: "HTTP status codes that tests check",
    blurb: "200 vs 201 vs 204, 400 vs 422, 401 vs 403, 404 vs 409: pick the right one every time.",
    color: "var(--cyan)",
    minutes: 4,
    widget: "status-codes",
    body: `
Tests assert status codes precisely, so a correct body with the wrong code still fails. The voxel board above groups them by class. Click any block for when to use it.

## Quick decisions

- Created something → **201** (plus the new resource). Deleted with nothing to return → **204**.
- Client sent garbage (bad JSON, bad id, failed validation) → **400**.
- No/invalid credentials → **401**. Valid credentials, not allowed → **403**.
- Resource doesn't exist → **404**. Unique constraint / state conflict → **409**.
- Rate limited → **429** with \`Retry-After\`.
- Your code threw unexpectedly → **500**. That should be rare; most "500s" in debugging labs are really 400s or 404s.
`,
  },
  {
    slug: "async-pitfalls",
    title: "Async pitfalls catalogue",
    blurb: "Every async bug that shows up in debugging rounds, with the one-line fix.",
    color: "var(--amber)",
    minutes: 6,
    practice: [
      { label: "Async lab", href: "/lab/async-pitfalls" },
      { label: "Retry lab", href: "/lab/retry-backoff" },
    ],
    body: `
| Bug | Symptom | Fix |
|---|---|---|
| Missing \`await\` | value is \`Promise { <pending> }\`, checks always truthy | \`await\` it |
| \`forEach(async…)\` | function returns before work finishes | \`for…of\` + \`await\`, or \`Promise.all(map)\` |
| Sequential awaits | correct but slow | \`Promise.all\` independent calls |
| \`Promise.all\` fail-fast | one rejection loses all results | \`Promise.allSettled\` when partial success is OK |
| Unawaited \`return\` inside try | catch never sees the rejection | \`return await p\` inside try/catch |
| Timer leak | test hangs / never exits | \`clearTimeout\`, \`clearInterval\` in cleanup |
| Shared mutable state | flaky under concurrency | atomic DB ops, locks, or per-request state |
| Retry without backoff | thundering herd | exponential backoff + jitter, max attempts |

\`\`\`js
async function getUser(id) {
  try {
    return await db.users.findById(id); // 'await' here makes the catch work
  } catch (e) {
    throw new NotFound(id);
  }
}
\`\`\`
`,
  },
  {
    slug: "js-gotchas",
    title: "JavaScript gotchas",
    blurb: "The language quirks that turn into one-line bugs.",
    color: "var(--orange)",
    minutes: 6,
    practice: [{ label: "Spot the Bug drills", href: "/drills" }],
    body: `
\`\`\`js
[10, 9, 1].sort();            // [1, 10, 9]  (string order!) → use (a, b) => a - b
"5" + 1;                      // "51"        → Number(x) first
0.1 + 0.2 === 0.3;            // false       → compare with an epsilon, or use integer cents
typeof null;                  // "object"
new Date(2024, 1, 1);         // February: months are 0-based
parseInt("08");               // 8, but pass the radix: parseInt(x, 10)
[] == false;                  // true        → always use ===
Math.max();                   // -Infinity   (empty input)
arr.indexOf(x) > 0;           // misses index 0 → use !== -1 or includes()
\`\`\`

## Reference vs value

\`\`\`js
const a = [1, 2]; const b = a; b.push(3);  // a is [1, 2, 3] too
const copy = { ...obj };                    // shallow: nested objects are shared
const grid = Array(3).fill([]);             // ❌ three references to ONE array
const grid2 = Array.from({ length: 3 }, () => []); // ✅
\`\`\`

## \`this\`

Methods passed as callbacks lose \`this\`: \`setTimeout(obj.method, 0)\`. Use an arrow or \`.bind(obj)\`.

## Closures in loops

\`for (var i…)\` shares one \`i\` across callbacks; \`let\` gives each iteration its own.
`,
  },
  {
    slug: "python-gotchas",
    title: "Python gotchas",
    blurb: "Mutable defaults, late binding, shallow copies, and friends.",
    color: "var(--cyan)",
    minutes: 6,
    practice: [
      { label: "Python debug labs", href: "/debug" },
      { label: "Spot the Bug drills", href: "/drills" },
    ],
    body: `
\`\`\`python
def add(item, bucket=[]):      # ❌ the SAME list is reused across calls
    bucket.append(item); return bucket
def add(item, bucket=None):    # ✅
    bucket = [] if bucket is None else bucket

grid = [[0] * 3] * 3           # ❌ 3 references to one row
grid = [[0] * 3 for _ in range(3)]  # ✅

fns = [lambda: i for i in range(3)]   # all return 2 (late binding)
fns = [lambda i=i: i for i in range(3)]

7 // 2 == 3; -7 // 2 == -4     # floor division rounds toward -∞
a is b                          # identity, not equality → use ==
if value:                       # 0, "", [] are falsy → use 'is not None' when 0 is valid

for k in d:                     # ❌ RuntimeError if you add/delete keys while iterating
for k in list(d):               # ✅
\`\`\`

## Useful built-ins in DSA

\`collections.Counter\`, \`defaultdict(list)\`, \`deque\` (O(1) popleft), \`heapq\` (min-heap; push \`-x\` for max), \`bisect\`, \`functools.lru_cache\` for memoised recursion.
`,
  },
  {
    slug: "concurrency",
    title: "Concurrency, retries & idempotency",
    blurb: "Race conditions, idempotency keys, backoff with jitter: the 'production' bugs.",
    color: "var(--violet)",
    minutes: 7,
    practice: [
      { label: "Payments lab", href: "/lab/payment-idempotency" },
      { label: "Booking lab", href: "/lab/room-booking" },
      { label: "Rate limiter build", href: "/lab/build-rate-limiter" },
    ],
    body: `
## Check-then-act races

\`\`\`js
const seat = await Seat.findById(id);
if (!seat.booked) { seat.booked = true; await seat.save(); } // two requests can both pass the check
\`\`\`

Make the check and the write **one atomic operation**:

\`\`\`js
const r = await Seat.updateOne({ _id: id, booked: false }, { $set: { booked: true } });
if (r.modifiedCount === 0) return res.status(409).json({ error: "already booked" });
\`\`\`

## Idempotency keys

Clients retry. A payment endpoint must not charge twice. Store the result under the client's \`Idempotency-Key\`; a repeated key returns the stored response instead of re-executing.

## Retries

- Only retry **transient** failures (timeouts, 503, 429), never 400s.
- **Exponential backoff**: \`base * 2^attempt\`, capped.
- **Jitter** (random spread) stops every client retrying in lock-step.
- Always cap attempts; surface the last error.

## Rate limiting

Fixed window is simple but bursty at boundaries; sliding window or token bucket smooths it. Key by user or IP, return **429** with \`Retry-After\`.
`,
  },
  {
    slug: "patterns",
    title: "DSA pattern cheat sheet",
    blurb: "Signals in the problem statement → the pattern to reach for, with complexity.",
    color: "var(--mint)",
    minutes: 8,
    practice: [
      { label: "DSA problems", href: "/dsa" },
      { label: "3D Lab playground", href: "/visualize" },
    ],
    body: `
| When you see… | Think | Typical cost |
|---|---|---|
| "pair / complement / seen before" | hash map | O(n) |
| "contiguous subarray sums to k" | prefix sums + map | O(n) |
| "longest/shortest substring with…" | sliding window | O(n) |
| sorted array, pairs/triplets | two pointers | O(n) / O(n²) |
| "minimum capacity / speed such that…" | binary search on the answer | O(n log range) |
| sorted but rotated | modified binary search | O(log n) |
| "next greater / warmer / higher" | monotonic stack | O(n) |
| matching brackets, undo | stack | O(n) |
| "k largest / closest / most frequent" | heap of size k | O(n log k) |
| always combine the two smallest | min-heap (greedy) | O(n log n) |
| overlapping intervals, rooms | sort by start, sweep | O(n log n) |
| grid, shortest steps | BFS | O(R·C) |
| connected regions | DFS/BFS flood fill or union-find | O(R·C) |
| dependencies / ordering | topological sort (Kahn) | O(V+E) |
| "number of ways / minimum cost" with overlapping subproblems | DP | varies |

## How to talk through a problem

1. Restate it and confirm edge cases (empty input, duplicates, negatives).
2. Give the brute force and its complexity, briefly.
3. Name the bottleneck, then the pattern that removes it.
4. Code it cleanly; walk one example by hand.
5. State final time and space complexity.
`,
  },
  {
    slug: "build-playbook",
    title: "Building from a spec",
    blurb: "How to approach implementation labs: interfaces first, edge cases early, tests as the contract.",
    color: "var(--cyan)",
    minutes: 5,
    practice: [{ label: "Build labs", href: "/build" }],
    body: `
Build labs are the opposite of debugging: the tests describe a component that doesn't exist yet.

1. **Read every test name before writing code.** They are the requirements list. Group them: happy path, validation, edge cases, errors.
2. **Write the skeleton**: exported names, method signatures, return shapes. Run the tests: the failures should now be about behaviour, not "is not a function".
3. **Happy path first**, then validation, then edge cases. Re-run after each step; watch the count of green climb.
4. **Choose data structures deliberately.** LRU → Map (insertion order) or hash map + doubly-linked list. Leaderboard → sorted structure or heap. Rate limiter → per-key timestamps or counters.
5. **Keep state private** and return copies, so callers can't mutate internals.
6. **Error contract**: throw specific errors or return specific status codes exactly as the tests expect.

> Treat the test file as the API doc. If a test expects \`201\` and \`{ id }\`, that's the spec, even if you'd design it differently.
`,
  },
];

export const getLesson = (slug: string) => lessons.find((l) => l.slug === slug);
