const retryBuggy = `/**
 * Calls \`fn\` until it succeeds.
 * - makes at most 1 + retries attempts
 * - waits baseMs * 2^(attempt-1) between attempts (100, 200, 400, ...), capped at maxMs
 * - does NOT retry errors where err.retryable === false (e.g. 4xx)
 * - if every attempt fails, rethrows the LAST error
 * \`sleep\` is injectable so tests don't actually wait.
 */
export async function retry(fn, { retries = 3, baseMs = 100, maxMs = 2000, sleep = defaultSleep } = {}) {
  let lastErr;
  for (let attempt = 1; attempt < retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const delay = Math.min(baseMs * 2 * attempt, maxMs);
      await sleep(delay);
    }
  }
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
`;

const retryFixed = `/**
 * Calls \`fn\` until it succeeds.
 * - makes at most 1 + retries attempts
 * - waits baseMs * 2^(attempt-1) between attempts (100, 200, 400, ...), capped at maxMs
 * - does NOT retry errors where err.retryable === false (e.g. 4xx)
 * - if every attempt fails, rethrows the LAST error
 * \`sleep\` is injectable so tests don't actually wait.
 */
export async function retry(fn, { retries = 3, baseMs = 100, maxMs = 2000, sleep = defaultSleep } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (err && err.retryable === false) throw err;
      if (attempt === retries + 1) break;
      const delay = Math.min(baseMs * 2 ** (attempt - 1), maxMs);
      await sleep(delay);
    }
  }
  throw lastErr;
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
`;

const tests = `import { retry } from '../lib/retry.js';

const flaky = (failTimes, err = new Error('boom')) => {
  let calls = 0;
  const fn = jest.fn(async () => {
    calls++;
    if (calls <= failTimes) throw err;
    return 'ok';
  });
  return fn;
};

const sleeper = () => {
  const s = jest.fn(async () => {});
  return s;
};

test('returns immediately on success', async () => {
  const fn = flaky(0);
  await expect(retry(fn, { sleep: sleeper() })).resolves.toBe('ok');
  expect(fn).toHaveBeenCalledTimes(1);
});

test('retries = 3 means up to 4 attempts total', async () => {
  const fn = flaky(3);
  await expect(retry(fn, { retries: 3, sleep: sleeper() })).resolves.toBe('ok');
  expect(fn).toHaveBeenCalledTimes(4);
});

test('exponential backoff 100, 200, 400 between attempts', async () => {
  const s = sleeper();
  await retry(flaky(3), { retries: 3, baseMs: 100, sleep: s });
  expect(s.mock.calls.map((c) => c[0])).toEqual([100, 200, 400]);
});

test('delay is capped at maxMs', async () => {
  const s = sleeper();
  await retry(flaky(5), { retries: 5, baseMs: 500, maxMs: 1500, sleep: s });
  expect(s.mock.calls.map((c) => c[0])).toEqual([500, 1000, 1500, 1500, 1500]);
});

test('rethrows the last error after exhausting attempts', async () => {
  const fn = flaky(10, new Error('still down'));
  await expect(retry(fn, { retries: 2, sleep: sleeper() })).rejects.toThrow('still down');
  expect(fn).toHaveBeenCalledTimes(3);
});

test('does not retry non-retryable errors', async () => {
  const e = Object.assign(new Error('400 bad request'), { retryable: false });
  const fn = flaky(10, e);
  const s = sleeper();
  await expect(retry(fn, { sleep: s })).rejects.toThrow('400 bad request');
  expect(fn).toHaveBeenCalledTimes(1);
  expect(s).toHaveBeenCalledTimes(0);
});

test('no sleep after the final failed attempt', async () => {
  const s = sleeper();
  await expect(retry(flaky(10), { retries: 1, sleep: s })).rejects.toThrow();
  expect(s).toHaveBeenCalledTimes(1);
});
`;

export default {
  slug: "retry-backoff",
  order: 14,
  title: "Retry with Exponential Backoff",
  difficulty: "Medium",
  minutes: 20,
  tagline: "The retry helper gives up early, waits wrong, and swallows errors.",
  ticket: `**INFRA-58 · Outage amplified by our own retry helper**

During yesterday's DynamoDB throttling event, callers using \`lib/retry.js\` saw \`undefined\` results instead of errors, retried **400 Bad Request** responses in a hot loop, and backed off linearly instead of exponentially.

The intended contract is in the doc comment. This is a **unit-test** lab: no HTTP involved.`,
  env: {},
  files: { "lib/retry.js": retryBuggy },
  tests: { "tests/retry.test.js": tests },
  fixes: { "lib/retry.js": retryFixed },
  bugs: [
    { file: "lib/retry.js", title: "loop bound off by two", explain: "`attempt < retries` with attempt starting at 1 makes `retries - 1` attempts. The contract is `1 + retries`, so `attempt <= retries + 1`." },
    { file: "lib/retry.js", title: "linear instead of exponential backoff", explain: "`base * 2 * attempt` gives 200, 400, 600. Exponential is `base * 2 ** (attempt - 1)`." },
    { file: "lib/retry.js", title: "final error swallowed", explain: "After the loop the function falls off the end and returns `undefined`. `throw lastErr`." },
    { file: "lib/retry.js", title: "retries non-retryable errors and sleeps after the last attempt", explain: "Rethrow immediately when `err.retryable === false`, and break before sleeping on the final attempt." },
  ],
  hints: ["Count attempts for retries = 3 by hand.", "What does an async function return if it reaches the end without `return`?", "Write the expected delay sequence next to the formula."],
  concepts: ["exponential backoff", "loop bounds", "error propagation", "dependency injection for tests"],
};
