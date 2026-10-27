// Strips the @bug marker, records the buggy line, shuffles options deterministically.
import { writeFileSync } from "node:fs";
import drills from "../content-src/drills.mjs";

const out = [];
const ids = new Set();
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

for (const d of drills) {
  if (ids.has(d.id)) throw new Error("duplicate drill id " + d.id);
  ids.add(d.id);
  const lines = d.code.split("\n");
  const bugIdx = lines.findIndex((l) => /@bug/.test(l));
  if (bugIdx < 0) throw new Error("no @bug marker in " + d.id);
  lines[bugIdx] = lines[bugIdx].replace(/\s*(\/\/|#)\s*@bug\s*$/, "").replace(/\s*\/\/\s*@bug/, "");
  // shuffle options, track the correct one
  const opts = d.options.map((o, i) => ({ o, ok: i === d.answer }));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  out.push({ ...d, code: lines.join("\n"), bugLine: bugIdx + 1, options: opts.map((x) => x.o), answer: opts.findIndex((x) => x.ok) });
}

writeFileSync(new URL("../src/content/drills.generated.json", import.meta.url), JSON.stringify(out, null, 1));
const by = out.reduce((m, d) => ((m[d.lang] = (m[d.lang] || 0) + 1), m), {});
console.log(`✓ ${out.length} drills`, by);
