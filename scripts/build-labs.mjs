// Verifies every lab (buggy code must fail, fixed code must pass) and emits src/content/labs.generated.json
import { readdirSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { runLab as runJsLab } from "./lab-harness.mjs";

const harnessDir = new URL("../public/workers/", import.meta.url).pathname;

function runPyLab({ files, testFiles }) {
  const root = mkdtempSync(join(tmpdir(), "bf-lab-")) + "/lab";
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), c);
  }
  for (const d of new Set(Object.keys(files).map((p) => p.split("/").slice(0, -1).join("/")).filter(Boolean))) {
    if (!files[`${d}/__init__.py`]) writeFileSync(join(root, d, "__init__.py"), "");
  }
  const mods = testFiles.map((f) => f.replace(/\.py$/, "").replace(/\//g, "."));
  const code = `import sys; sys.path.insert(0, ${JSON.stringify(harnessDir)}); from py_lab_harness import run_lab; print(run_lab(${JSON.stringify(root)}, ${JSON.stringify(mods)}))`;
  const r = spawnSync("python3", ["-c", code], { timeout: 30000 });
  rmSync(dirname(root), { recursive: true, force: true });
  if (r.status !== 0) return { tests: [{ name: "python crashed", status: "fail", error: r.stderr.toString() }] };
  const out = r.stdout.toString().trim().split("\n");
  return JSON.parse(out[out.length - 1]);
}

const runLab = (lab, opts) => (lab.lang === "py" ? Promise.resolve(runPyLab(opts)) : runJsLab(opts));

const dir = new URL("../content-src/labs/", import.meta.url);
const only = process.argv[2];
const out = [];
let ok = true;

for (const f of readdirSync(dir).filter((x) => x.endsWith(".mjs")).sort()) {
  const lab = { kind: "debug", lang: "js", ...(await import(new URL(f, dir))).default };
  if (only && lab.slug !== only) {
    out.push(lab);
    continue;
  }
  const testFiles = Object.keys(lab.tests);
  const base = { ...lab.files, ...lab.tests };
  const buggy = await runLab(lab, { files: base, testFiles, env: lab.env });
  const fixed = await runLab(lab, { files: { ...base, ...lab.fixes }, testFiles, env: lab.env });
  const bf = buggy.tests.filter((t) => t.status === "fail").length;
  const ff = fixed.tests.filter((t) => t.status === "fail");
  const line = `${lab.slug.padEnd(24)} buggy: ${buggy.tests.length - bf}/${buggy.tests.length} pass   fixed: ${fixed.tests.length - ff.length}/${fixed.tests.length} pass`;
  console.log(line);
  if (bf === 0) {
    ok = false;
    console.log("   !! buggy version passes everything");
  }
  if (ff.length) {
    ok = false;
    for (const t of ff) console.log(`   !! fixed fails: ${t.name}\n      ${t.error.split("\n").join("\n      ")}`);
  }
  if (process.env.VERBOSE) for (const t of buggy.tests) console.log(`   [buggy ${t.status}] ${t.name}${t.error ? " — " + t.error.split("\n")[0] : ""}`);
  out.push(lab);
}

out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "debug" ? -1 : 1) || (a.order ?? 99) - (b.order ?? 99));
writeFileSync(new URL("../src/content/labs.generated.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(ok ? `\n✓ ${out.length} labs verified` : "\n✗ lab verification failed");
process.exit(ok ? 0 : 1);
