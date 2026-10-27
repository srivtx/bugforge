// Shared answer checker. Plain JS so the Node build script and the app use the same logic.
// Modes:
//   exact          deep equality
//   unordered      top-level array order ignored
//   unorderedDeep  order ignored at top level and inside each nested array
//   float          numbers compared with 1e-5 tolerance (recursively)

function canon(v) {
  return JSON.stringify(v);
}

function sortDeep(v) {
  if (!Array.isArray(v)) return v;
  return v.map(sortDeep).sort((a, b) => (canon(a) < canon(b) ? -1 : canon(a) > canon(b) ? 1 : 0));
}

function floatEq(a, b) {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => floatEq(x, b[i]));
  return canon(a) === canon(b);
}

// Normalise values coming out of user code: undefined -> null, typed arrays/sets -> arrays.
export function normalize(v) {
  if (v === undefined) return null;
  if (v instanceof Set) return [...v].map(normalize);
  if (ArrayBuffer.isView(v)) return Array.from(v);
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = normalize(v[k]);
    return o;
  }
  if (typeof v === "number" && Object.is(v, -0)) return 0;
  return v;
}

export function compareOutput(got, expected, mode = "exact") {
  got = normalize(got);
  if (mode === "float") return floatEq(got, expected);
  if (mode === "unordered") {
    if (!Array.isArray(got) || !Array.isArray(expected)) return false;
    const s = (arr) => arr.map(canon).sort();
    return canon(s(got)) === canon(s(expected));
  }
  if (mode === "unorderedDeep") {
    return canon(sortDeep(got)) === canon(sortDeep(expected));
  }
  return canon(got) === canon(expected);
}
