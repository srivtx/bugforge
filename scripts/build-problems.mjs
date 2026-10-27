// Builds the DSA problem bank:
//  - computes expected outputs with each problem's reference solution
//  - cross-checks against an optional brute force on small random inputs
//  - runs the Python reference solution on every test and compares
//  - writes metadata to src/content/problems.generated.json and tests to public/tests/<slug>.json
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { compareOutput } from "../src/lib/compare.js";

const dir = new URL("../content-src/problems/", import.meta.url);
const only = process.argv[2];
mkdirSync(new URL("../public/tests/", import.meta.url), { recursive: true });

function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    arr: (n, lo, hi) => Array.from({ length: n }, () => r.int(lo, hi)),
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    str: (n, alpha = "abcdefghijklmnopqrstuvwxyz") => Array.from({ length: n }, () => alpha[Math.floor(next() * alpha.length)]).join(""),
    shuffle: (xs) => {
      const a2 = xs.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    bool: (p = 0.5) => next() < p,
    grid: (rows, cols, fn) => Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => fn(i, j))),
  };
  return r;
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const call = (f, input) => {
  const out = f(...clone(input));
  return out === undefined ? null : JSON.parse(JSON.stringify(out));
};

function slugSeed(s) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const TYPE_JS = { int: "number", long: "number", float: "number", string: "string", bool: "boolean", char: "string" };
function jsType(t) {
  if (t.endsWith("[][]")) return `${jsType(t.slice(0, -4))}[][]`;
  if (t.endsWith("[]")) return `${jsType(t.slice(0, -2))}[]`;
  return TYPE_JS[t] || "any";
}
const TYPE_PY = { int: "int", long: "int", float: "float", string: "str", bool: "bool", char: "str" };
function pyType(t) {
  if (t.endsWith("[]")) return `List[${pyType(t.slice(0, -2))}]`;
  return TYPE_PY[t] || "Any";
}

function starters(p) {
  const names = p.params.map(([n]) => n);
  const js = `/**\n${p.params.map(([n, t]) => ` * @param {${jsType(t)}} ${n}`).join("\n")}\n * @return {${jsType(p.returns)}}\n */\nfunction ${p.fn}(${names.join(", ")}) {\n  // Write your code here\n\n}\n`;
  const py = `from typing import List\n\ndef ${p.fn}(${p.params.map(([n, t]) => `${n}: ${pyType(t)}`).join(", ")}) -> ${pyType(p.returns)}:\n    # Write your code here\n    pass\n`;
  return { js, py };
}

function runPython(code, fn, tests) {
  const harness = `
import json, sys
from typing import *
import collections, heapq, bisect, itertools, functools, math
from collections import *
from heapq import *
from functools import *
from itertools import *
from bisect import *
from math import *
sys.setrecursionlimit(100000)
data = json.load(sys.stdin)
ns = {}
exec(data["code"], ns)
f = ns[data["fn"]]
out = []
for t in data["tests"]:
    r = f(*t)
    if isinstance(r, (set, tuple)): r = list(r)
    out.append(r)
print(json.dumps(out, default=list))
`;
  const res = spawnSync("python3", ["-c", harness], { input: JSON.stringify({ code, fn, tests: tests.map((t) => t.input) }), maxBuffer: 512 * 1024 * 1024 });
  if (res.status !== 0) return { error: res.stderr.toString().slice(-1500) };
  return { outputs: JSON.parse(res.stdout.toString()) };
}

const meta = [];
let failed = 0;
const files = readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort();
for (const f of files) {
  const group = (await import(new URL(f, dir))).default;
  for (const p of group) {
    if (only && p.slug !== only) continue;
    const r = rng(slugSeed(p.slug));
    const tests = [];
    const seen = new Set();
    const add = (input, kind) => {
      const key = JSON.stringify(input);
      if (seen.has(key)) return;
      seen.add(key);
      tests.push({ input: clone(input), output: call(p.ref, input), kind });
    };
    for (const ex of p.examples) add(ex.input, "example");
    for (const c of p.cases || []) add(c, "edge");
    const n = p.randomCount ?? 14;
    for (let i = 0; i < n * 3 && tests.filter((t) => t.kind === "random").length < n; i++) add(p.gen(r, i), "random");
    for (const g of p.big || []) add(g(r), "big");

    // brute force cross-check on small inputs
    let problemOk = true;
    if (p.brute) {
      const br = rng(slugSeed(p.slug) ^ 0xabcdef);
      for (let i = 0; i < 300; i++) {
        const input = (p.smallGen || p.gen)(br, i);
        const a = call(p.ref, input);
        const b = call(p.brute, input);
        if (!compareOutput(a, b, p.compare)) {
          console.log(`  !! ${p.slug}: ref vs brute mismatch on ${JSON.stringify(input).slice(0, 300)}\n     ref=${JSON.stringify(a).slice(0, 200)} brute=${JSON.stringify(b).slice(0, 200)}`);
          problemOk = false;
          break;
        }
      }
    }

    const py = runPython(p.py, p.fn, tests);
    if (py.error) {
      console.log(`  !! ${p.slug}: python error\n${py.error}`);
      problemOk = false;
    } else {
      py.outputs.forEach((o, i) => {
        if (problemOk && !compareOutput(o, tests[i].output, p.compare)) {
          console.log(`  !! ${p.slug}: python mismatch on test ${i} ${JSON.stringify(tests[i].input).slice(0, 200)}\n     py=${JSON.stringify(o).slice(0, 200)} js=${JSON.stringify(tests[i].output).slice(0, 200)}`);
          problemOk = false;
        }
      });
    }

    if (!problemOk) failed++;
    const examples = p.examples.map((ex) => ({ input: ex.input, output: call(p.ref, ex.input), explain: ex.explain || "" }));
    writeFileSync(new URL(`../public/tests/${p.slug}.json`, import.meta.url), JSON.stringify(tests.map(({ input, output, kind }) => ({ input, output, kind }))));
    const { js, py: pyStarter } = starters(p);
    meta.push({
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      patterns: p.patterns,
      group: f.replace(".mjs", "").replace(/^\d+-/, ""),
      freq: p.freq || 3,
      story: p.story.trim(),
      fn: p.fn,
      params: p.params,
      returns: p.returns,
      examples,
      constraints: p.constraints,
      hints: p.hints,
      approach: p.approach.trim(),
      time: p.time,
      space: p.space,
      compare: p.compare || "exact",
      starter: { js, py: pyStarter },
      solution: { js: p.ref.toString(), py: p.py.trim() + "\n" },
      viz: p.viz || null,
      testCount: tests.length,
      followUps: p.followUps || [],
    });
    console.log(`${problemOk ? "✓" : "✗"} ${p.slug.padEnd(34)} ${String(tests.length).padStart(3)} tests`);
  }
}

if (!only) {
  writeFileSync(new URL("../src/content/problems.generated.json", import.meta.url), JSON.stringify(meta, null, 1));
}
console.log(failed ? `\n✗ ${failed} problem(s) failed verification` : `\n✓ ${meta.length} problems verified`);
process.exit(failed ? 1 : 0);
