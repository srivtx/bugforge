// Runs user JavaScript against test inputs inside a worker so infinite loops can be killed.
// Message in:  { code, fn, tests: [{ input }], }
// Message out: { type: 'result', results: [{ output, error, ms, logs }] } | { type: 'compile-error', error }

function fmt(v) {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, (_, x) => (x instanceof Set ? [...x] : x instanceof Map ? Object.fromEntries(x) : x));
  } catch {
    return String(v);
  }
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

self.onmessage = (e) => {
  const { code, fn, tests } = e.data;
  let logs = [];
  const sink = (...args) => {
    if (logs.length < 200) logs.push(args.map(fmt).join(" "));
  };
  const fakeConsole = { log: sink, info: sink, warn: sink, error: sink, debug: sink, table: sink };

  let target;
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function("console", `"use strict";\n${code}\n;return typeof ${fn} === "function" ? ${fn} : undefined;`);
    target = factory(fakeConsole);
  } catch (err) {
    self.postMessage({ type: "compile-error", error: String(err && err.stack ? err.message : err) });
    return;
  }
  if (typeof target !== "function") {
    self.postMessage({ type: "compile-error", error: `Function "${fn}" was not found. Keep the given function name and signature.` });
    return;
  }

  const results = [];
  for (const t of tests) {
    logs = [];
    const args = clone(t.input);
    const start = performance.now();
    try {
      const out = target(...args);
      const ms = performance.now() - start;
      results.push({ output: out === undefined ? null : JSON.parse(JSON.stringify(out instanceof Set ? [...out] : out)), ms, logs });
    } catch (err) {
      results.push({ error: String(err && err.message ? `${err.name}: ${err.message}` : err), ms: performance.now() - start, logs });
    }
    self.postMessage({ type: "progress", done: results.length });
  }
  self.postMessage({ type: "result", results });
};
