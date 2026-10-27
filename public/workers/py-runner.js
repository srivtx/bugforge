// Python runner backed by Pyodide (loaded lazily from the jsDelivr CDN, cached by the browser).
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

let pyReady = null;

function boot() {
  if (!pyReady) {
    pyReady = loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" }).then((py) => {
      self.postMessage({ type: "ready" });
      return py;
    });
  }
  return pyReady;
}

boot();

const HARNESS = `
import json, time, sys, io, traceback
from typing import *
import collections, heapq, bisect, itertools, functools, math, string, re
from collections import *
from heapq import *
from functools import *
from itertools import *
from bisect import *
from math import *

def __oa_run(src, fn, tests_json):
    ns = {"__name__": "__main__"}
    try:
        exec(compile(src, "solution.py", "exec"), ns)
    except Exception as e:
        tb = traceback.format_exc(limit=2)
        return json.dumps({"compile": tb})
    f = ns.get(fn)
    if f is None:
        for v in ns.values():
            if isinstance(v, type) and hasattr(v, fn):
                f = getattr(v(), fn)
                break
    if f is None:
        return json.dumps({"compile": f'Function "{fn}" was not found. Keep the given function name.'})
    out = []
    for t in json.loads(tests_json):
        buf = io.StringIO()
        old = sys.stdout
        sys.stdout = buf
        start = time.perf_counter()
        try:
            r = f(*t["input"])
            if isinstance(r, (set, tuple)):
                r = list(r)
            ms = (time.perf_counter() - start) * 1000
            sys.stdout = old
            out.append({"output": json.loads(json.dumps(r, default=list)), "ms": ms, "logs": buf.getvalue().splitlines()[:200]})
        except Exception as e:
            ms = (time.perf_counter() - start) * 1000
            sys.stdout = old
            out.append({"error": f"{type(e).__name__}: {e}", "ms": ms, "logs": buf.getvalue().splitlines()[:200]})
    return json.dumps({"results": out})
`;

let harnessLoaded = false;

self.onmessage = async (e) => {
  const { code, fn, tests } = e.data;
  try {
    const py = await boot();
    if (!harnessLoaded) {
      py.runPython(HARNESS);
      harnessLoaded = true;
    }
    const run = py.globals.get("__oa_run");
    const raw = run(code, fn, JSON.stringify(tests.map((t) => ({ input: t.input }))));
    run.destroy();
    const parsed = JSON.parse(raw);
    if (parsed.compile) self.postMessage({ type: "compile-error", error: parsed.compile });
    else self.postMessage({ type: "result", results: parsed.results });
  } catch (err) {
    self.postMessage({ type: "compile-error", error: String(err && err.message ? err.message : err) });
  }
};
