// Mutation engine for "Bug Hunt": injects realistic single-line bugs into working code.
// Every operator rewrites one line. The hunt page verifies the mutant actually fails tests.

export interface MutationOp {
  id: string;
  name: string;
  lang: "js" | "py" | "both";
  // returns replacement candidates for a line (each a new version of the line)
  apply: (line: string) => string[];
  lesson: string;
}

export interface Mutation {
  file: string;
  line: number; // 1-based
  before: string;
  after: string;
  op: string;
  name: string;
  lesson: string;
}

const skipLine = (l: string) => {
  const t = l.trim();
  return !t || t.startsWith("//") || t.startsWith("#") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("import ") || t.startsWith("from ") || t.startsWith("export {") || t.startsWith("console.") || t.startsWith("print(");
};

// replace the n-th occurrence of a regex match in a line, for each occurrence -> multiple candidates
function each(line: string, re: RegExp, rep: (m: RegExpExecArray) => string): string[] {
  const out: string[] = [];
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  // don't mutate inside string literals: crude check on quotes before the match
  while ((m = g.exec(line))) {
    const before = line.slice(0, m.index);
    const quotes = (before.match(/['"`]/g) || []).length;
    if (quotes % 2 === 0) out.push(before + rep(m) + line.slice(m.index + m[0].length));
    if (m[0].length === 0) g.lastIndex++;
  }
  return out;
}

export const OPS: MutationOp[] = [
  { id: "negate-eq", name: "Equality flipped", lang: "js", apply: (l) => [...each(l, /===/, () => "!=="), ...each(l, /!==/, () => "===")], lesson: "A flipped equality inverts a whole branch. Check every comparison against the spec." },
  { id: "py-negate-eq", name: "Equality flipped", lang: "py", apply: (l) => [...each(l, / == /, () => " != "), ...each(l, / != /, () => " == ")], lesson: "A flipped equality inverts a whole branch." },
  { id: "boundary", name: "Off-by-one boundary", lang: "both", apply: (l) => [...each(l, / < (?!=)/, () => " <= "), ...each(l, / <= /, () => " < "), ...each(l, / > (?!=)/, () => " >= "), ...each(l, / >= /, () => " > ")], lesson: "Boundaries (< vs <=) are the #1 source of off-by-one bugs. Test the exact edge value." },
  { id: "flip-relational", name: "Comparison reversed", lang: "both", apply: (l) => [...each(l, / < (?!=)/, () => " > "), ...each(l, / > (?!=)/, () => " < ")], lesson: "A reversed comparison usually makes a check pass when it should fail." },
  { id: "logic-op", name: "&& / || swapped", lang: "js", apply: (l) => [...each(l, / && /, () => " || "), ...each(l, / \|\| /, () => " && ")], lesson: "Swapping AND/OR changes which inputs reach a branch. De Morgan your conditions." },
  { id: "py-logic-op", name: "and / or swapped", lang: "py", apply: (l) => [...each(l, / and /, () => " or "), ...each(l, / or /, () => " and ")], lesson: "Swapping and/or changes which inputs reach a branch." },
  { id: "drop-not", name: "Negation removed", lang: "js", apply: (l) => each(l, /if \(!/, () => "if ("), lesson: "A missing `!` makes a guard do the opposite of what it says." },
  { id: "py-drop-not", name: "Negation removed", lang: "py", apply: (l) => each(l, /if not /, () => "if "), lesson: "A missing `not` makes a guard do the opposite of what it says." },
  { id: "drop-await", name: "Missing await", lang: "js", apply: (l) => (/=\s*await |return await |^\s*await /.test(l) ? each(l, /await /, () => "") : []), lesson: "Without `await` you get a pending Promise/Query object (always truthy) instead of the value." },
  { id: "drop-return", name: "Missing return after response", lang: "js", apply: (l) => each(l, /return (res\.(status|json|send|sendStatus))/, (m) => m[1]), lesson: "Without `return`, execution continues after sending a response, leading to double responses or wrong writes." },
  { id: "status-code", name: "Wrong HTTP status", lang: "js", apply: (l) => {
      const swap: Record<string, string> = { "200": "201", "201": "200", "204": "200", "400": "422", "401": "403", "403": "401", "404": "400", "409": "400", "429": "403", "302": "301" };
      return each(l, /status\((\d{3})\)/, (m) => `status(${swap[m[1]] ?? m[1]})`).filter((x) => x !== l);
    }, lesson: "Status codes are part of the API contract. 400 bad input, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict, 429 throttled." },
  { id: "drop-new", name: "Update returns old document", lang: "js", apply: (l) => [...each(l, /,\s*\{\s*new:\s*true\s*\}/, () => ""), ...each(l, /new:\s*true/, () => "new: false")], lesson: "Mongoose findOneAndUpdate returns the pre-update doc unless `{ new: true }`." },
  { id: "find-vs-findone", name: "find() instead of findOne()", lang: "js", apply: (l) => each(l, /\.findOne\(/, () => ".find("), lesson: "`find()` always resolves to an array, and `[]` is truthy." },
  { id: "arith", name: "Arithmetic operator swapped", lang: "both", apply: (l) => [...each(l, / \+ /, () => " - "), ...each(l, / - /, () => " + "), ...each(l, / \* /, () => " / "), ...each(l, /\+= /, () => "-= "), ...each(l, /-= /, () => "+= ")], lesson: "Re-derive the formula from the spec and check it with a tiny hand example." },
  { id: "off-by-one-literal", name: "Literal off by one", lang: "both", apply: (l) => [...each(l, /(?<![\w.])1(?![\w.])/, () => "0"), ...each(l, /(?<![\w.])0(?![\w.x])/, () => "1"), ...each(l, /\[1\]/, () => "[0]"), ...each(l, /\[0\]/, () => "[1]")], lesson: "Indices and counters that start at 0 vs 1 are classic off-by-one bugs." },
  { id: "sort-dir", name: "Sort direction flipped", lang: "js", apply: (l) => [...each(l, /:\s*-1\s*\}/, () => ": 1 }"), ...each(l, /(sort\(\{\s*\w+:\s*)1/, (m) => m[1] + "-1"), ...each(l, /\(a, b\) => a - b/, () => "(a, b) => b - a"), ...each(l, /\(a, b\) => b - a/, () => "(a, b) => a - b")], lesson: "Ascending vs descending: verify with the first and last element." },
  { id: "min-max", name: "min/max swapped", lang: "both", apply: (l) => [...each(l, /Math\.min/, () => "Math.max"), ...each(l, /Math\.max/, () => "Math.min"), ...each(l, /\bmin\(/, () => "max("), ...each(l, /\bmax\(/, () => "min(")], lesson: "Clamping uses min for the upper bound and max for the lower bound. Easy to mix up." },
  { id: "bool-literal", name: "Boolean literal flipped", lang: "js", apply: (l) => [...each(l, /\btrue\b/, () => "false"), ...each(l, /\bfalse\b/, () => "true")], lesson: "A flipped default or flag silently changes behaviour." },
  { id: "py-bool-literal", name: "Boolean literal flipped", lang: "py", apply: (l) => [...each(l, /\bTrue\b/, () => "False"), ...each(l, /\bFalse\b/, () => "True")], lesson: "A flipped default or flag silently changes behaviour." },
  { id: "drop-next", name: "Middleware never calls next()", lang: "js", apply: (l) => (/^\s*(return )?next\(\);?\s*$/.test(l) ? [l.replace(/(return )?next\(\);?/, "/* next() */")] : []), lesson: "If middleware neither responds nor calls next(), the request hangs forever." },
  { id: "drop-populate", name: "populate() removed", lang: "js", apply: (l) => each(l, /\.populate\([^)]*\)/, () => ""), lesson: "Without populate, refs are just ObjectIds, not documents." },
  { id: "length-cmp", name: "Collection compared instead of its size", lang: "js", apply: (l) => each(l, /(\w+)\.length (>=|>|<|<=|===) /, (m) => `${m[1]} ${m[2]} `), lesson: "Comparing an array to a number coerces it. Compare `.length`." },
  { id: "py-len", name: "len() dropped", lang: "py", apply: (l) => each(l, /len\((\w+)\) (>=|>|<|<=|==) /, (m) => `${m[1]} ${m[2]} `), lesson: "Comparing a list to a number raises TypeError in Python 3. Compare `len(...)`." },
  { id: "py-range", name: "range() bound off by one", lang: "py", apply: (l) => [...each(l, /range\(([^,()]+)\)/, (m) => `range(${m[1]} - 1)`), ...each(l, /range\(([^,()]+), ([^,()]+)\)/, (m) => `range(${m[1]}, ${m[2]} + 1)`)], lesson: "`range(a, b)` excludes b. Off-by-one there skips or overruns the last element." },
  { id: "slice-bound", name: "Slice bound shifted", lang: "both", apply: (l) => [...each(l, /\.slice\((\d+)\)/, (m) => `.slice(${Number(m[1]) + 1})`), ...each(l, /\[(\w+):\]/, (m) => `[${m[1]} + 1:]`), ...each(l, /\[:(\w+)\]/, (m) => `[:${m[1]} - 1]`)], lesson: "Slice ends are exclusive. Shifting a bound drops or duplicates an element." },
  { id: "py-none-check", name: "`is None` inverted", lang: "py", apply: (l) => [...each(l, / is None/, () => " is not None"), ...each(l, / is not None/, () => " is None")], lesson: "Inverted None checks swap the found and not-found paths." },
];

export function opsFor(lang: "js" | "py") {
  return OPS.filter((o) => o.lang === "both" || o.lang === lang);
}

export interface Site {
  file: string;
  line: number;
  before: string;
  after: string;
  op: MutationOp;
}

export function enumerateSites(files: Record<string, string>, lang: "js" | "py"): Site[] {
  const sites: Site[] = [];
  const ops = opsFor(lang);
  for (const [file, src] of Object.entries(files)) {
    const lines = src.split("\n");
    lines.forEach((text, i) => {
      if (skipLine(text)) return;
      for (const op of ops) {
        for (const after of op.apply(text)) {
          if (after !== text) sites.push({ file, line: i + 1, before: text, after, op });
        }
      }
    });
  }
  return sites;
}

export function applySites(files: Record<string, string>, sites: Site[]): Record<string, string> {
  const out = { ...files };
  for (const s of sites) {
    const lines = out[s.file].split("\n");
    lines[s.line - 1] = s.after;
    out[s.file] = lines.join("\n");
  }
  return out;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// pick `count` sites on distinct lines, biased so different operators show up
export function pickSites(all: Site[], count: number, rand: () => number): Site[] {
  const byOp = new Map<string, Site[]>();
  for (const s of all) (byOp.get(s.op.id) ?? byOp.set(s.op.id, []).get(s.op.id)!).push(s);
  const opIds = [...byOp.keys()];
  const chosen: Site[] = [];
  const usedLines = new Set<string>();
  let guard = 0;
  while (chosen.length < count && guard++ < 200 && opIds.length) {
    const op = opIds[Math.floor(rand() * opIds.length)];
    const list = byOp.get(op)!;
    const s = list[Math.floor(rand() * list.length)];
    const k = `${s.file}:${s.line}`;
    if (usedLines.has(k)) continue;
    usedLines.add(k);
    chosen.push(s);
  }
  return chosen;
}

export function toMutation(s: Site): Mutation {
  return { file: s.file, line: s.line, before: s.before, after: s.after, op: s.op.id, name: s.op.name, lesson: s.op.lesson };
}
