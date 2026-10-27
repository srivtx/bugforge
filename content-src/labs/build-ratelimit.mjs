const stub = `/**
 * Fixed-window rate limiter middleware.
 *
 *   rateLimit({ windowMs, max, keyFn })
 *
 * - key each client with keyFn(req) (default: req.ip)
 * - allow at most \`max\` requests per key per window; the window starts at the key's FIRST request
 * - on every allowed response set header  X-RateLimit-Remaining: <requests left in window>
 * - when exceeded respond 429 { message: 'Too many requests' } with header Retry-After: <seconds, rounded up>
 * - once the window has passed, the key starts a fresh window
 *
 * Use Date.now() for time (tests control the clock).
 */
export function rateLimit({ windowMs, max, keyFn = (req) => req.ip }) {
  // TODO: keep per-key state here (closure)

  return (req, res, next) => {
    // TODO: implement
    next();
  };
}
`;

const solution = `/**
 * Fixed-window rate limiter middleware.
 *
 *   rateLimit({ windowMs, max, keyFn })
 *
 * - key each client with keyFn(req) (default: req.ip)
 * - allow at most \`max\` requests per key per window; the window starts at the key's FIRST request
 * - on every allowed response set header  X-RateLimit-Remaining: <requests left in window>
 * - when exceeded respond 429 { message: 'Too many requests' } with header Retry-After: <seconds, rounded up>
 * - once the window has passed, the key starts a fresh window
 *
 * Use Date.now() for time (tests control the clock).
 */
export function rateLimit({ windowMs, max, keyFn = (req) => req.ip }) {
  const windows = new Map(); // key -> { start, count }

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let w = windows.get(key);
    if (!w || now - w.start >= windowMs) {
      w = { start: now, count: 0 };
      windows.set(key, w);
    }
    if (w.count >= max) {
      const retryAfter = Math.ceil((w.start + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message: 'Too many requests' });
    }
    w.count++;
    res.set('X-RateLimit-Remaining', String(max - w.count));
    next();
  };
}
`;

const app = `import express from 'express';
import { rateLimit } from './middleware/rateLimit.js';

const app = express();
app.use(express.json());

const perUser = rateLimit({ windowMs: 60_000, max: 3, keyFn: (req) => req.get('x-api-key') || req.ip });

app.get('/api/ping', perUser, (req, res) => res.json({ pong: true }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';

const ping = (key) => request(app).get('/api/ping').set('x-api-key', key);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('allows up to max requests and counts down the remaining header', async () => {
  const r1 = await ping('k1');
  const r2 = await ping('k1');
  const r3 = await ping('k1');
  expect([r1.status, r2.status, r3.status]).toEqual([200, 200, 200]);
  expect([r1.headers['x-ratelimit-remaining'], r2.headers['x-ratelimit-remaining'], r3.headers['x-ratelimit-remaining']]).toEqual(['2', '1', '0']);
});

test('the request over the limit gets 429 with a JSON body', async () => {
  for (let i = 0; i < 3; i++) await ping('k2');
  const res = await ping('k2');
  expect(res.status).toBe(429);
  expect(res.body).toEqual({ message: 'Too many requests' });
});

test('Retry-After is the seconds left in the window, rounded up', async () => {
  for (let i = 0; i < 3; i++) await ping('k3');
  jest.advanceTimersByTime(20_500);
  const res = await ping('k3');
  expect(res.headers['retry-after']).toBe('40');
});

test('keys are independent', async () => {
  for (let i = 0; i < 3; i++) await ping('k4');
  expect((await ping('k5')).status).toBe(200);
});

test('a new window starts after windowMs', async () => {
  for (let i = 0; i < 4; i++) await ping('k6');
  jest.advanceTimersByTime(60_000);
  const res = await ping('k6');
  expect(res.status).toBe(200);
  expect(res.headers['x-ratelimit-remaining']).toBe('2');
});

test('unlimited routes are unaffected', async () => {
  for (let i = 0; i < 10; i++) await request(app).get('/api/health');
  expect((await request(app).get('/api/health')).status).toBe(200);
});
`;

export default {
  slug: "build-rate-limiter",
  order: 101,
  kind: "build",
  title: "Build: Rate-Limit Middleware",
  difficulty: "Medium",
  minutes: 30,
  tagline: "Write a fixed-window limiter with proper headers from an empty stub.",
  ticket: `## Spec

Implement \`rateLimit({ windowMs, max, keyFn })\` in \`middleware/rateLimit.js\`. The full contract is in the doc comment.

**Why it matters:** rate limiting shows up constantly, both in "build an API" tasks and in system-design follow-ups. You'll need per-key state in a closure, time math, and correct HTTP semantics (\`429\`, \`Retry-After\`).

**Approach to practise:**
1. Read every test first and list the behaviours.
2. Make the first test pass with the simplest code.
3. Add behaviours one at a time, rerunning after each.`,
  env: {},
  files: { "app.js": app, "middleware/rateLimit.js": stub },
  tests: { "tests/rateLimit.test.js": tests },
  fixes: { "middleware/rateLimit.js": solution },
  bugs: [
    { file: "middleware/rateLimit.js", title: "State per key", explain: "Create a `Map` *outside* the returned middleware (closure) holding `{ start, count }` per key." },
    { file: "middleware/rateLimit.js", title: "Window rollover", explain: "If there's no entry, or `now - start >= windowMs`, start a fresh window `{ start: now, count: 0 }`." },
    { file: "middleware/rateLimit.js", title: "Reject when full", explain: "If `count >= max`: set `Retry-After = ceil((start + windowMs - now) / 1000)` and `return res.status(429).json(...)`." },
    { file: "middleware/rateLimit.js", title: "Count & header, then next()", explain: "Increment `count`, set `X-RateLimit-Remaining` to `max - count`, call `next()`." },
  ],
  hints: ["Where should the Map live so it survives between requests?", "Headers are strings: `res.set('X-RateLimit-Remaining', String(n))`.", "Fixed window vs sliding log: which one does the spec describe?"],
  concepts: ["closures", "fixed-window limiting", "HTTP 429 + Retry-After", "time math"],
};
