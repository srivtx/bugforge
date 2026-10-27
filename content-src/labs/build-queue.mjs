const stub = `/**
 * createQueue({ concurrency = 1, retries = 0 })
 *
 * queue.add(task)  task: async () => value
 *   -> returns a Promise that resolves with the task's value
 *      (or rejects with its LAST error after 1 + retries attempts)
 * At most \`concurrency\` tasks run at the same time; the rest wait in FIFO order.
 *
 * queue.onIdle() -> Promise that resolves when nothing is running or waiting
 * queue.stats()  -> { running, pending, done, failed }
 */
export function createQueue({ concurrency = 1, retries = 0 } = {}) {
  // TODO
  return {
    add(task) {
      throw new Error('not implemented');
    },
    onIdle() {
      throw new Error('not implemented');
    },
    stats() {
      return { running: 0, pending: 0, done: 0, failed: 0 };
    },
  };
}
`;

const solution = `/**
 * createQueue({ concurrency = 1, retries = 0 })
 *
 * queue.add(task)  task: async () => value
 *   -> returns a Promise that resolves with the task's value
 *      (or rejects with its LAST error after 1 + retries attempts)
 * At most \`concurrency\` tasks run at the same time; the rest wait in FIFO order.
 *
 * queue.onIdle() -> Promise that resolves when nothing is running or waiting
 * queue.stats()  -> { running, pending, done, failed }
 */
export function createQueue({ concurrency = 1, retries = 0 } = {}) {
  const waiting = [];
  let running = 0;
  let done = 0;
  let failed = 0;
  let idleWaiters = [];

  const checkIdle = () => {
    if (running === 0 && waiting.length === 0) {
      idleWaiters.forEach((r) => r());
      idleWaiters = [];
    }
  };

  async function runWithRetries(task) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await task();
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  }

  const pump = () => {
    while (running < concurrency && waiting.length) {
      const { task, resolve, reject } = waiting.shift();
      running++;
      runWithRetries(task)
        .then(
          (v) => {
            done++;
            resolve(v);
          },
          (e) => {
            failed++;
            reject(e);
          }
        )
        .finally(() => {
          running--;
          pump();
          checkIdle();
        });
    }
  };

  return {
    add(task) {
      return new Promise((resolve, reject) => {
        waiting.push({ task, resolve, reject });
        pump();
      });
    },
    onIdle() {
      if (running === 0 && waiting.length === 0) return Promise.resolve();
      return new Promise((r) => idleWaiters.push(r));
    },
    stats() {
      return { running, pending: waiting.length, done, failed };
    },
  };
}
`;

const tests = `import { createQueue } from '../lib/queue.js';

// a task we can resolve/reject by hand
function deferred() {
  let resolve, reject;
  const p = new Promise((a, b) => ((resolve = a), (reject = b)));
  return { p, resolve, reject };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('resolves with the task value', async () => {
  const q = createQueue();
  await expect(q.add(async () => 42)).resolves.toBe(42);
});

test('never runs more than concurrency tasks at once', async () => {
  const q = createQueue({ concurrency: 2 });
  let active = 0;
  let peak = 0;
  const gates = [deferred(), deferred(), deferred(), deferred()];
  gates.forEach((g) =>
    q.add(async () => {
      active++;
      peak = Math.max(peak, active);
      await g.p;
      active--;
    })
  );
  await tick();
  expect(q.stats()).toMatchObject({ running: 2, pending: 2 });
  gates.forEach((g) => g.resolve());
  await q.onIdle();
  expect(peak).toBe(2);
});

test('runs waiting tasks in FIFO order', async () => {
  const q = createQueue({ concurrency: 1 });
  const order = [];
  await Promise.all(['a', 'b', 'c'].map((x) => q.add(async () => order.push(x))));
  expect(order).toEqual(['a', 'b', 'c']);
});

test('retries failed tasks and resolves when an attempt succeeds', async () => {
  const q = createQueue({ retries: 2 });
  let n = 0;
  const v = await q.add(async () => {
    n++;
    if (n < 3) throw new Error('flaky');
    return 'ok';
  });
  expect(v).toBe('ok');
  expect(n).toBe(3);
});

test('rejects with the last error after exhausting retries; queue keeps going', async () => {
  const q = createQueue({ retries: 1 });
  let n = 0;
  await expect(q.add(async () => { n++; throw new Error('e' + n); })).rejects.toThrow('e2');
  await expect(q.add(async () => 'next')).resolves.toBe('next');
  expect(q.stats()).toEqual({ running: 0, pending: 0, done: 1, failed: 1 });
});

test('onIdle resolves immediately on an empty queue', async () => {
  await expect(createQueue().onIdle()).resolves.toBeUndefined();
});
`;

export default {
  slug: "build-job-queue",
  order: 103,
  kind: "build",
  title: "Build: Concurrent Job Queue",
  difficulty: "Hard",
  minutes: 40,
  tagline: "A promise queue with a concurrency limit, retries, stats and onIdle().",
  ticket: `## Spec

Implement \`createQueue\` in \`lib/queue.js\` (contract in the doc comment). This is the pattern behind upload managers, crawlers and background workers.

**Key ideas:** keep a FIFO array of \`{ task, resolve, reject }\`; a \`pump()\` function starts tasks while \`running < concurrency\`; when a task settles, decrement \`running\` and pump again.`,
  env: {},
  files: { "lib/queue.js": stub },
  tests: { "tests/queue.test.js": tests },
  fixes: { "lib/queue.js": solution },
  bugs: [
    { file: "lib/queue.js", title: "Wrap each task in a promise", explain: "`add(task)` returns `new Promise((resolve, reject) => { waiting.push({ task, resolve, reject }); pump(); })`." },
    { file: "lib/queue.js", title: "pump()", explain: "`while (running < concurrency && waiting.length)`: shift a job, `running++`, run it, and in `finally` do `running--; pump();`." },
    { file: "lib/queue.js", title: "Retries", explain: "Loop `attempt = 0..retries`, return on success, remember the error, and throw the last one at the end." },
    { file: "lib/queue.js", title: "onIdle + stats", explain: "Keep a list of idle resolvers and flush it when `running === 0 && waiting.length === 0`." },
  ],
  hints: ["You can store a Promise's resolve function and call it later.", "When should pump() run? On add AND whenever a task finishes.", "Count done/failed in the then/catch handlers."],
  concepts: ["promises", "concurrency limiting", "FIFO scheduling", "retries"],
};
