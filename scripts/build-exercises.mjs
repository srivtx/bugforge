// Verifies every lesson exercise (starter must fail a test, solution must pass all) and emits
// src/content/exercises.generated.json, keyed by lesson slug.
import { readdirSync, writeFileSync } from "node:fs";
import { runLab } from "./lab-harness.mjs";

const dir = new URL("../content-src/exercises/", import.meta.url);
const out = {};
let ok = true;
let count = 0;

for (const f of readdirSync(dir).filter((x) => x.endsWith(".mjs")).sort()) {
  for (const set of (await import(new URL(f, dir))).default) {
    for (const ex of set.exercises) {
      const testFiles = Object.keys(ex.tests);
      const base = { ...(ex.support ?? {}), ...ex.tests };
      const start = await runLab({ files: { ...base, [ex.file]: ex.starter }, testFiles, env: {} });
      const done = await runLab({ files: { ...base, [ex.file]: ex.solution }, testFiles, env: {} });
      const sf = start.tests.filter((t) => t.status !== "pass").length;
      const df = done.tests.filter((t) => t.status !== "pass");
      console.log(`${(set.lesson + "/" + ex.id).padEnd(36)} starter: ${start.tests.length - sf}/${start.tests.length}   solution: ${done.tests.length - df.length}/${done.tests.length}${done.loadError ? "  load error: " + done.loadError : ""}`);
      if (!start.tests.length || sf === 0) {
        ok = false;
        console.log("   !! starter passes everything");
      }
      if (!done.tests.length || df.length) {
        ok = false;
        for (const t of df) console.log(`   !! solution fails: ${t.name}\n      ${String(t.error).split("\n").join("\n      ")}`);
      }
      count++;
    }
    out[set.lesson] = set.exercises.map((ex) => ({ lang: "js", ...ex }));
  }
}

writeFileSync(new URL("../src/content/exercises.generated.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(ok ? `\n✓ ${count} exercises verified` : "\n✗ exercise verification failed");
process.exit(ok ? 0 : 1);
