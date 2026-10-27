// Step generators for algorithm visualisations. Each returns a list of frames;
// a frame is a pure description of what to draw plus a sentence explaining the step.

export type Tone = "idle" | "active" | "window" | "done" | "dim" | "hit" | "bad" | "mid";

export interface Cell {
  v: string | number;
  tone?: Tone;
}

export interface Frame {
  cells?: Cell[];
  bars?: boolean;
  pointers?: Record<string, number>;
  side?: { title: string; items: { k: string; v?: string; tone?: Tone }[]; kind?: "map" | "stack" | "heap" | "list" };
  table?: { rows: string[]; cols: string[]; data: (number | string | null)[][]; active?: [number, number]; from?: [number, number][] };
  grid?: { cells: (number | string)[][]; dist: (number | null)[][]; wave: number };
  graph?: { n: number; edges: [number, number][]; indeg: number[]; done: number[]; ready: number[]; active?: number };
  timeline?: { items: { s: number; e: number; tone: Tone; label?: string }[]; max: number };
  stat?: { label: string; value: string | number }[];
  note: string;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function twoPointers({ nums }: { nums: number[] }): Frame[] {
  const f: Frame[] = [];
  let l = 0;
  let r = nums.length - 1;
  let best = 0;
  f.push({ cells: nums.map((v) => ({ v })), bars: true, pointers: { L: l, R: r }, stat: [{ label: "best", value: 0 }], note: "Start with the widest pair: L at the first rack, R at the last." });
  while (l < r) {
    const area = Math.min(nums[l], nums[r]) * (r - l);
    const improved = area > best;
    best = Math.max(best, area);
    const cells: Cell[] = nums.map((v, i) => ({ v, tone: i === l || i === r ? "active" : i > l && i < r ? "window" : "dim" }));
    f.push({ cells, bars: true, pointers: { L: l, R: r }, stat: [{ label: "area", value: area }, { label: "best", value: best }], note: `min(${nums[l]}, ${nums[r]}) × ${r - l} = ${area}${improved ? " → new best!" : ""}. Move the shorter side (${nums[l] < nums[r] ? "L" : "R"}); the taller one can't do better with less width.` });
    if (nums[l] < nums[r]) l++;
    else r--;
  }
  f.push({ cells: nums.map((v) => ({ v, tone: "done" })), bars: true, stat: [{ label: "answer", value: best }], note: `Pointers met. Maximum storage = ${best}. Each step discarded one rack for good → O(n).` });
  return f;
}

export function slidingWindow(input: { s?: string; t?: string; nums?: number[]; k?: number }): Frame[] {
  const f: Frame[] = [];
  if (input.s !== undefined && input.t === undefined) {
    const s = input.s;
    const last = new Map<string, number>();
    let left = 0;
    let best = 0;
    for (let right = 0; right < s.length; right++) {
      const p = last.get(s[right]);
      let jumped = "";
      if (p !== undefined && p >= left) {
        jumped = ` '${s[right]}' was already in the window at ${p}, so jump L to ${p + 1}.`;
        left = p + 1;
      }
      last.set(s[right], right);
      best = Math.max(best, right - left + 1);
      f.push({
        cells: [...s].map((v, i) => ({ v, tone: i === right ? "active" : i >= left && i < right ? "window" : i < left ? "dim" : "idle" })),
        pointers: { L: left, R: right },
        side: { title: "last seen", kind: "map", items: [...last.entries()].map(([k, v]) => ({ k, v: String(v), tone: k === s[right] ? "hit" : "idle" })) },
        stat: [{ label: "window", value: right - left + 1 }, { label: "best", value: best }],
        note: `Expand R to '${s[right]}'.${jumped} Window "${s.slice(left, right + 1)}" has no repeats.`,
      });
    }
    f.push({ cells: [...s].map((v) => ({ v, tone: "done" })), stat: [{ label: "answer", value: best }], note: `Done: longest window without repeats = ${best}.` });
    return f;
  }
  if (input.s !== undefined && input.t !== undefined) {
    const { s, t } = input;
    const need = new Map<string, number>();
    for (const c of t) need.set(c, (need.get(c) || 0) + 1);
    let missing = t.length;
    let left = 0;
    let best = "";
    for (let right = 0; right < s.length; right++) {
      const c = s[right];
      if ((need.get(c) || 0) > 0) missing--;
      need.set(c, (need.get(c) || 0) - 1);
      const snap = (note: string, tone: Tone = "window") =>
        f.push({
          cells: [...s].map((v, i) => ({ v, tone: i === right ? "active" : i >= left && i < right ? tone : "dim" })),
          pointers: { L: left, R: right },
          side: { title: "still needed", kind: "map", items: [...t].filter((x, i, a) => a.indexOf(x) === i).map((k) => ({ k, v: String(Math.max(0, need.get(k) || 0)), tone: (need.get(k) || 0) > 0 ? "bad" : "done" })) },
          stat: [{ label: "missing", value: missing }, { label: "best", value: best ? `"${best}"` : "-" }],
          note,
        });
      snap(`Add '${c}'. Still missing ${missing} required char(s).`);
      while (missing === 0) {
        if (!best || right - left + 1 < best.length) best = s.slice(left, right + 1);
        snap(`Window "${s.slice(left, right + 1)}" covers t → record it, then shrink from the left.`, "hit");
        const lc = s[left];
        need.set(lc, (need.get(lc) || 0) + 1);
        if ((need.get(lc) || 0) > 0) missing++;
        left++;
      }
    }
    f.push({ cells: [...s].map((v) => ({ v, tone: "done" })), stat: [{ label: "answer", value: `"${best}"` }], note: `Shortest covering window: "${best}".` });
    return f;
  }
  const nums = input.nums ?? [];
  const k = input.k ?? 2;
  if (nums.every((x) => x === 0 || x === 1) && input.k !== undefined && nums.some((x) => x === 0)) {
    let left = 0;
    let zeros = 0;
    let best = 0;
    for (let right = 0; right < nums.length; right++) {
      if (nums[right] === 0) zeros++;
      while (zeros > k) if (nums[left++] === 0) zeros--;
      best = Math.max(best, right - left + 1);
      f.push({ cells: nums.map((v, i) => ({ v, tone: i === right ? "active" : i >= left && i < right ? (v === 0 ? "hit" : "window") : "dim" })), pointers: { L: left, R: right }, stat: [{ label: "zeros", value: `${zeros}/${k}` }, { label: "best", value: best }], note: `R → ${right}. Window holds ${zeros} zero(s) (≤ ${k} repairs). Width ${right - left + 1}.` });
    }
    f.push({ cells: nums.map((v) => ({ v, tone: "done" })), stat: [{ label: "answer", value: best }], note: `Longest window with ≤ ${k} zeros = ${best}.` });
    return f;
  }
  const c = new Map<number, number>();
  let sum = 0;
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
    c.set(nums[i], (c.get(nums[i]) || 0) + 1);
    let dropped = "";
    if (i >= k) {
      const out = nums[i - k];
      sum -= out;
      if (c.get(out) === 1) c.delete(out);
      else c.set(out, (c.get(out) || 0) - 1);
      dropped = ` Drop ${out} from the left.`;
    }
    const full = i >= k - 1;
    const valid = full && c.size === k;
    if (valid) best = Math.max(best, sum);
    f.push({
      cells: nums.map((v, j) => ({ v, tone: j === i ? "active" : j > i - k && j < i ? (valid ? "window" : "bad") : "dim" })),
      pointers: { L: Math.max(0, i - k + 1), R: i },
      side: { title: "counts", kind: "map", items: [...c.entries()].map(([kk, v]) => ({ k: String(kk), v: "×" + v, tone: v > 1 ? "bad" : "idle" })) },
      stat: [{ label: "sum", value: sum }, { label: "best", value: best }],
      note: `Add ${nums[i]}.${dropped} ${full ? (valid ? `All ${k} distinct → candidate ${sum}.` : "Duplicate inside → window doesn't count.") : "Window not full yet."}`,
    });
  }
  f.push({ cells: nums.map((v) => ({ v, tone: "done" })), stat: [{ label: "answer", value: best }], note: `Best distinct window sum = ${best}.` });
  return f;
}

export function binarySearch(input: { nums: number[]; target?: number; days?: number }): Frame[] {
  const f: Frame[] = [];
  const nums = input.nums;
  if (input.days !== undefined) {
    const days = input.days;
    let lo = Math.max(...nums);
    let hi = nums.reduce((a, b) => a + b, 0);
    const daysFor = (cap: number) => {
      let d = 1;
      let load = 0;
      for (const w of nums) {
        if (load + w > cap) {
          d++;
          load = 0;
        }
        load += w;
      }
      return d;
    };
    f.push({ cells: nums.map((v) => ({ v })), bars: true, stat: [{ label: "lo", value: lo }, { label: "hi", value: hi }], note: `Answer lies in [max weight = ${lo}, total = ${hi}]. Binary search it: feasibility is monotone.` });
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const d = daysFor(mid);
      const ok = d <= days;
      f.push({ cells: nums.map((v) => ({ v, tone: ok ? "done" : "bad" })), bars: true, stat: [{ label: "lo", value: lo }, { label: "mid", value: mid }, { label: "hi", value: hi }, { label: "days", value: `${d}/${days}` }], note: `Try capacity ${mid}: greedy loading needs ${d} days → ${ok ? "fits, so search lower (hi = mid)" : "too slow, so search higher (lo = mid + 1)"}.` });
      if (ok) hi = mid;
      else lo = mid + 1;
    }
    f.push({ cells: nums.map((v) => ({ v, tone: "done" })), bars: true, stat: [{ label: "answer", value: lo }], note: `lo == hi → minimum capacity is ${lo}.` });
    return f;
  }
  const target = input.target ?? 0;
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cells = nums.map((v, i) => ({ v, tone: (i === mid ? "mid" : i >= lo && i <= hi ? "window" : "dim") as Tone }));
    if (nums[mid] === target) {
      cells[mid].tone = "hit";
      f.push({ cells, pointers: { lo, mid, hi }, note: `nums[${mid}] = ${target}. Found it!` });
      return f;
    }
    let note: string;
    if (nums[lo] <= nums[mid]) {
      const goLeft = nums[lo] <= target && target < nums[mid];
      note = `Left half [${nums[lo]}..${nums[mid]}] is sorted. ${target} ${goLeft ? "is" : "isn't"} inside it → go ${goLeft ? "left" : "right"}.`;
      f.push({ cells, pointers: { lo, mid, hi }, note });
      if (goLeft) hi = mid - 1;
      else lo = mid + 1;
    } else {
      const goRight = nums[mid] < target && target <= nums[hi];
      note = `Right half [${nums[mid]}..${nums[hi]}] is sorted. ${target} ${goRight ? "is" : "isn't"} inside it → go ${goRight ? "right" : "left"}.`;
      f.push({ cells, pointers: { lo, mid, hi }, note });
      if (goRight) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  f.push({ cells: nums.map((v) => ({ v, tone: "dim" })), note: `lo > hi → ${target} is not present. Return -1.` });
  return f;
}

export function hashmap(input: { nums: number[]; target: number | null }): Frame[] {
  const f: Frame[] = [];
  const { nums, target } = input;
  if (target === null) {
    const s = new Set(nums);
    let best = 0;
    f.push({ cells: nums.map((v) => ({ v })), side: { title: "set", kind: "map", items: [...s].map((k) => ({ k: String(k) })) }, note: "Put every id into a hash set (O(1) membership)." });
    for (const x of s) {
      if (s.has(x - 1)) {
        f.push({ cells: nums.map((v) => ({ v, tone: v === x ? "dim" : "idle" })), side: { title: "set", kind: "map", items: [...s].map((k) => ({ k: String(k), tone: k === x - 1 ? "bad" : "idle" })) }, note: `${x}: ${x - 1} exists, so ${x} isn't a run start. Skip it.` });
        continue;
      }
      let len = 1;
      while (s.has(x + len)) len++;
      best = Math.max(best, len);
      f.push({ cells: nums.map((v) => ({ v, tone: v >= x && v < x + len ? "hit" : "idle" })), side: { title: "set", kind: "map", items: [...s].map((k) => ({ k: String(k), tone: k >= x && k < x + len ? "hit" : "idle" })) }, stat: [{ label: "run", value: len }, { label: "best", value: best }], note: `${x} starts a run: ${Array.from({ length: len }, (_, i) => x + i).join(", ")} → length ${len}.` });
    }
    return f;
  }
  const seen = new Map<number, number>();
  for (let j = 0; j < nums.length; j++) {
    const need = target - nums[j];
    const hit = seen.has(need);
    f.push({
      cells: nums.map((v, i) => ({ v, tone: i === j ? "active" : hit && i === seen.get(need) ? "hit" : i < j ? "dim" : "idle" })),
      pointers: { j },
      side: { title: "seen value → index", kind: "map", items: [...seen.entries()].map(([k, v]) => ({ k: String(k), v: String(v), tone: k === need ? "hit" : "idle" })) },
      note: hit ? `Need ${target} − ${nums[j]} = ${need}. It's in the map at index ${seen.get(need)} → answer [${seen.get(need)}, ${j}].` : `Need ${need}. Not seen yet, so store ${nums[j]} → ${j}.`,
    });
    if (hit) return f;
    seen.set(nums[j], j);
  }
  return f;
}

export function prefix({ nums, k }: { nums: number[]; k: number }): Frame[] {
  const f: Frame[] = [];
  const seen = new Map<number, number>([[0, 1]]);
  let sum = 0;
  let ans = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
    const add = seen.get(sum - k) || 0;
    ans += add;
    f.push({
      cells: nums.map((v, j) => ({ v, tone: j === i ? "active" : j < i ? "window" : "idle" })),
      pointers: { i },
      side: { title: "prefix sum → count", kind: "map", items: [...seen.entries()].map(([kk, v]) => ({ k: String(kk), v: "×" + v, tone: kk === sum - k ? "hit" : "idle" })) },
      stat: [{ label: "prefix", value: sum }, { label: "looking for", value: sum - k }, { label: "count", value: ans }],
      note: `prefix = ${sum}. Windows ending here sum to ${k} once for every earlier prefix equal to ${sum} − ${k} = ${sum - k}: found ${add}.`,
    });
    seen.set(sum, (seen.get(sum) || 0) + 1);
  }
  return f;
}

export function stack(input: { s?: string; nums?: number[] }): Frame[] {
  const f: Frame[] = [];
  if (input.s !== undefined) {
    const s = input.s;
    const pair: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
    const st: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c in pair) {
        const top = st[st.length - 1];
        if (top !== pair[c]) {
          f.push({ cells: [...s].map((v, j) => ({ v, tone: j === i ? "bad" : j < i ? "dim" : "idle" })), side: { title: "stack", kind: "stack", items: st.map((k) => ({ k })) }, note: `'${c}' needs '${pair[c]}' on top, but top is ${top ? `'${top}'` : "empty"} → invalid.` });
          return f;
        }
        st.pop();
        f.push({ cells: [...s].map((v, j) => ({ v, tone: j === i ? "hit" : j < i ? "dim" : "idle" })), side: { title: "stack", kind: "stack", items: st.map((k) => ({ k })) }, note: `'${c}' matches top '${pair[c]}' → pop.` });
      } else {
        st.push(c);
        f.push({ cells: [...s].map((v, j) => ({ v, tone: j === i ? "active" : j < i ? "dim" : "idle" })), side: { title: "stack", kind: "stack", items: st.map((k) => ({ k })) }, note: `Opener '${c}' → push.` });
      }
    }
    f.push({ cells: [...s].map((v) => ({ v, tone: st.length ? "bad" : "done" })), side: { title: "stack", kind: "stack", items: st.map((k) => ({ k })) }, note: st.length ? `End of input but ${st.length} opener(s) unclosed → invalid.` : "Stack empty at the end → valid!" });
    return f;
  }
  const nums = input.nums ?? [];
  const isHist = nums.length <= 8 && Math.max(...nums) <= 10;
  if (isHist) {
    const h = [...nums, 0];
    const st: number[] = [];
    let best = 0;
    for (let i = 0; i < h.length; i++) {
      while (st.length && h[st[st.length - 1]] > h[i]) {
        const top = st.pop()!;
        const left = st.length ? st[st.length - 1] : -1;
        const area = h[top] * (i - left - 1);
        best = Math.max(best, area);
        f.push({ cells: nums.map((v, j) => ({ v, tone: j > left && j < i ? "hit" : j === i ? "active" : "idle" })), bars: true, side: { title: "stack (indices)", kind: "stack", items: st.map((k) => ({ k: String(k), v: String(h[k]) })) }, stat: [{ label: "area", value: area }, { label: "best", value: best }], note: `${i < nums.length ? `Bar ${h[i]}` : "Sentinel 0"} is lower than ${h[top]} → pop it. It spans (${left}, ${i}) → ${h[top]} × ${i - left - 1} = ${area}.` });
      }
      st.push(i);
      if (i < nums.length) f.push({ cells: nums.map((v, j) => ({ v, tone: j === i ? "active" : "idle" })), bars: true, side: { title: "stack (indices)", kind: "stack", items: st.map((k) => ({ k: String(k), v: String(h[k]) })) }, stat: [{ label: "best", value: best }], note: `Push index ${i} (height ${h[i]}). Stack heights stay increasing.` });
    }
    f.push({ cells: nums.map((v) => ({ v, tone: "done" })), bars: true, stat: [{ label: "answer", value: best }], note: `Largest rectangle = ${best}.` });
    return f;
  }
  const out = new Array(nums.length).fill(0);
  const st: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    while (st.length && nums[st[st.length - 1]] < nums[i]) {
      const j = st.pop()!;
      out[j] = i - j;
      f.push({ cells: nums.map((v, x) => ({ v, tone: x === i ? "active" : x === j ? "hit" : "idle" })), bars: true, side: { title: "waiting (stack)", kind: "stack", items: st.map((k) => ({ k: String(k), v: String(nums[k]) })) }, stat: [{ label: "answers", value: out.join(",") }], note: `${nums[i]} > ${nums[j]} → day ${j} waited ${i - j} day(s). Pop.` });
    }
    st.push(i);
    f.push({ cells: nums.map((v, x) => ({ v, tone: x === i ? "active" : st.includes(x) ? "window" : "dim" })), bars: true, side: { title: "waiting (stack)", kind: "stack", items: st.map((k) => ({ k: String(k), v: String(nums[k]) })) }, stat: [{ label: "answers", value: out.join(",") }], note: `Push day ${i} (${nums[i]}); stack prices stay decreasing.` });
  }
  return f;
}

export function heap({ nums }: { nums: number[] }): Frame[] {
  const f: Frame[] = [];
  const h = [...nums].sort((a, b) => a - b);
  let cost = 0;
  f.push({ side: { title: "min-heap", kind: "heap", items: h.map((k) => ({ k: String(k) })) }, stat: [{ label: "cost", value: 0 }], note: "Load every file size into a min-heap." });
  while (h.length > 1) {
    const a = h.shift()!;
    const b = h.shift()!;
    cost += a + b;
    f.push({ side: { title: "min-heap", kind: "heap", items: [{ k: String(a), tone: "active" }, { k: String(b), tone: "active" }, ...h.map((k) => ({ k: String(k) }))] }, stat: [{ label: "merge", value: `${a}+${b}` }, { label: "cost", value: cost }], note: `Pop the two smallest (${a}, ${b}), merge for ${a + b}. Cheap files get merged early, so their cost repeats least.` });
    h.push(a + b);
    h.sort((x, y) => x - y);
    f.push({ side: { title: "min-heap", kind: "heap", items: h.map((k) => ({ k: String(k), tone: k === a + b ? "hit" : "idle" })) }, stat: [{ label: "cost", value: cost }], note: `Push ${a + b} back.` });
  }
  f.push({ side: { title: "min-heap", kind: "heap", items: h.map((k) => ({ k: String(k), tone: "done" })) }, stat: [{ label: "answer", value: cost }], note: `One file left. Total cost = ${cost}.` });
  return f;
}

export function intervals({ intervals }: { intervals: number[][] }): Frame[] {
  const f: Frame[] = [];
  const a = intervals.map((x) => [...x]).sort((x, y) => x[0] - y[0]);
  const max = Math.max(...a.map((x) => x[1])) + 1;
  const merged: number[][] = [];
  f.push({ timeline: { items: a.map(([s, e]) => ({ s, e, tone: "idle" as Tone })), max }, note: "Sort by start time." });
  for (const [s, e] of a) {
    const last = merged[merged.length - 1];
    const overlap = last && s <= last[1];
    if (overlap) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
    f.push({
      timeline: { items: [...a.map(([x, y]) => ({ s: x, e: y, tone: (x === s && y === e ? "active" : "dim") as Tone })), ...merged.map(([x, y]) => ({ s: x, e: y, tone: "hit" as Tone, label: "merged" }))], max },
      stat: [{ label: "merged", value: merged.length }],
      note: overlap ? `[${s},${e}] starts before the last merged block ends → extend it to [${last[0]},${last[1]}].` : `[${s},${e}] doesn't overlap → start a new block.`,
    });
  }
  return f;
}

export function dp({ coins, amount }: { coins: number[]; amount: number }): Frame[] {
  const f: Frame[] = [];
  const d: (number | null)[] = new Array(amount + 1).fill(null);
  d[0] = 0;
  const show = (x: number, note: string, from?: number) =>
    f.push({ cells: d.map((v, i) => ({ v: v === null ? "∞" : v, tone: i === x ? "active" : i === from ? "hit" : v === null ? "dim" : "done" })), pointers: { x }, note });
  show(0, "dp[0] = 0: zero coupons make amount 0.");
  for (let x = 1; x <= amount; x++) {
    let best: number | null = null;
    let from = -1;
    for (const c of coins) if (c <= x && d[x - c] !== null && (best === null || d[x - c]! + 1 < best)) {
      best = d[x - c]! + 1;
      from = x - c;
    }
    d[x] = best;
    show(x, best === null ? `dp[${x}]: no coin leads to a reachable amount → ∞.` : `dp[${x}] = dp[${from}] + 1 = ${best} (use coin ${x - from}).`, from);
  }
  return f;
}

export function dpTable({ a, b }: { a: string; b: string }): Frame[] {
  const f: Frame[] = [];
  const t: (number | null)[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const match = a[i - 1] === b[j - 1];
      t[i][j] = match ? t[i - 1][j - 1]! + 1 : Math.max(t[i - 1][j]!, t[i][j - 1]!);
      f.push({
        table: { rows: ["∅", ...a], cols: ["∅", ...b], data: clone(t), active: [i, j], from: match ? [[i - 1, j - 1]] : [[i - 1, j], [i, j - 1]] },
        note: match ? `'${a[i - 1]}' == '${b[j - 1]}' → diagonal + 1 = ${t[i][j]}.` : `'${a[i - 1]}' ≠ '${b[j - 1]}' → max(up, left) = ${t[i][j]}.`,
      });
    }
  return f;
}

export function binaryAnswer({ need, size }: { need: Record<string, number>; size: number }): Frame[] {
  const f: Frame[] = [];
  const max = Math.max(...Object.values(need));
  const slots = (t: number) => Object.values(need).reduce((s, v) => s + Math.ceil(v / t), 0);
  const cellsFor = (lo: number, hi: number, mid?: number) =>
    Array.from({ length: max }, (_, i) => {
      const t = i + 1;
      const ok = slots(t) <= size;
      return { v: `t=${t}`, tone: (t === mid ? "mid" : t < lo || t > hi ? "dim" : ok ? "done" : "bad") as Tone };
    });
  let lo = 1;
  let hi = max;
  f.push({ cells: cellsFor(lo, hi), stat: [{ label: "segment size", value: size }], note: `Candidate copy counts t = 1..${max}. Green = needs ≤ ${size} slots. Notice it's monotone: once green, always green.` });
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const s = slots(mid);
    f.push({ cells: cellsFor(lo, hi, mid), stat: [{ label: "t", value: mid }, { label: "slots", value: `${s}/${size}` }], note: `t = ${mid}: ${Object.values(need).map((v) => `ceil(${v}/${mid})`).join(" + ")} = ${s} ${s <= size ? `≤ ${size} → fits, try fewer copies` : `> ${size} → need more copies`}.` });
    if (s <= size) hi = mid;
    else lo = mid + 1;
  }
  const counts = Object.fromEntries(Object.entries(need).map(([k, v]) => [k, Math.ceil(v / lo)]));
  counts.a = (counts.a || 0) + size - slots(lo);
  const seg = Object.keys(counts)
    .sort()
    .map((k) => k.repeat(counts[k]))
    .join("");
  f.push({ cells: [...seg].map((v) => ({ v, tone: "done" })), stat: [{ label: "t", value: lo }, { label: "segment", value: seg }], note: `Smallest t = ${lo}. Fill leftovers with 'a', sort letters → "${seg}".` });
  return f;
}

export function graph({ n, edges }: { n: number; edges: [number, number][] }): Frame[] {
  const f: Frame[] = [];
  const indeg = new Array(n).fill(0);
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    indeg[b]++;
  }
  const ready = indeg.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0);
  const done: number[] = [];
  f.push({ graph: { n, edges, indeg: [...indeg], done: [], ready: [...ready] }, note: `In-degree = number of prerequisites. Ready (in-degree 0): ${ready.join(", ")}.` });
  while (ready.length) {
    ready.sort((a, b) => a - b);
    const u = ready.shift()!;
    done.push(u);
    for (const v of adj[u]) if (--indeg[v] === 0) ready.push(v);
    f.push({ graph: { n, edges, indeg: [...indeg], done: [...done], ready: [...ready], active: u }, stat: [{ label: "order", value: done.join(" → ") }], note: `Deploy ${u} (smallest ready). Decrement its dependents: ${adj[u].join(", ") || "none"}.` });
  }
  f.push({ graph: { n, edges, indeg, done, ready: [] }, stat: [{ label: "order", value: done.join(" → ") }], note: done.length === n ? "All services deployed: valid topological order." : "Some nodes never reached in-degree 0 → cycle!" });
  return f;
}

export function gridBfs(input: { grid: string[]; multi?: boolean; path?: boolean }): Frame[] {
  const f: Frame[] = [];
  const g = input.grid.map((r) => [...r]);
  const R = g.length;
  const C = g[0].length;
  const dist: (number | null)[][] = g.map((r) => r.map(() => null));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const snap = (wave: number, note: string) => f.push({ grid: { cells: clone(g), dist: clone(dist), wave }, note });
  if (input.path || input.multi) {
    let q: [number, number][] = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g[r][c] === "S" || (input.multi && g[r][c] === "2")) {
          q.push([r, c]);
          dist[r][c] = 0;
        }
    snap(0, input.multi ? "Multi-source BFS: every spoiled package starts in the queue at minute 0." : "BFS from S. Distance 0.");
    let wave = 0;
    while (q.length) {
      const next: [number, number][] = [];
      for (const [y, x] of q)
        for (const [dy, dx] of dirs) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= R || nx >= C || dist[ny][nx] !== null) continue;
          const cell = g[ny][nx];
          if (cell === "#" || cell === "0") continue;
          dist[ny][nx] = wave + 1;
          next.push([ny, nx]);
        }
      if (!next.length) break;
      wave++;
      const hitT = input.path && next.some(([y, x]) => g[y][x] === "T");
      snap(wave, input.multi ? `Minute ${wave}: spoilage spreads to ${next.length} neighbouring package(s).` : hitT ? `Wave ${wave} reaches T → shortest route = ${wave} moves.` : `Wave ${wave}: ${next.length} new cell(s) at distance ${wave}.`);
      if (hitT) break;
      q = next;
    }
    return f;
  }
  let zone = 0;
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (g[r][c] !== "1" || dist[r][c] !== null) continue;
      zone++;
      const st: [number, number][] = [[r, c]];
      dist[r][c] = zone;
      while (st.length) {
        const [y, x] = st.pop()!;
        for (const [dy, dx] of dirs) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && nx >= 0 && ny < R && nx < C && g[ny][nx] === "1" && dist[ny][nx] === null) {
            dist[ny][nx] = zone;
            st.push([ny, nx]);
          }
        }
      }
      snap(zone, `Found unvisited land at (${r},${c}) → flood-fill zone #${zone}.`);
    }
  snap(zone, `Scan complete: ${zone} zone(s).`);
  return f;
}

export const VIZ: Record<string, { title: string; gen: (input: never) => Frame[]; blurb: string; sample: unknown }> = {
  "two-pointers": { title: "Two Pointers", gen: twoPointers as never, blurb: "Shrink a range from both ends, discarding what can't be optimal.", sample: { nums: [1, 8, 6, 2, 5, 4, 8, 3, 7] } },
  "sliding-window": { title: "Sliding Window", gen: slidingWindow as never, blurb: "Grow on the right, shrink on the left; every element enters and leaves once.", sample: { s: "abcabcbb" } },
  "binary-search": { title: "Binary Search", gen: binarySearch as never, blurb: "Halve the search space using a sorted half, or a monotone feasibility check.", sample: { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 } },
  "binary-answer": { title: "Binary Search on the Answer", gen: binaryAnswer as never, blurb: "When 'does t work?' flips from false to true once, binary search t itself.", sample: { need: { a: 3, b: 2, c: 2 }, size: 4 } },
  hashmap: { title: "Hash Map Lookups", gen: hashmap as never, blurb: "Trade memory for O(1) 'have I seen this?' questions.", sample: { nums: [4, 11, 7, 2, 15], target: 9 } },
  prefix: { title: "Prefix Sums + Map", gen: prefix as never, blurb: "sum(i..j) = prefix[j] − prefix[i]. Count matching earlier prefixes.", sample: { nums: [1, 2, 1, -1, 3, 1], k: 3 } },
  stack: { title: "Stack / Monotonic Stack", gen: stack as never, blurb: "Last-in-first-out: matching brackets, and the 'next greater element' family.", sample: { nums: [73, 74, 75, 71, 69, 72, 76, 73] } },
  heap: { title: "Min-Heap (Greedy Merging)", gen: heap as never, blurb: "Always grab the smallest two: a priority queue does it in O(log n).", sample: { nums: [8, 4, 6, 12] } },
  intervals: { title: "Intervals", gen: intervals as never, blurb: "Sort by start, then sweep, comparing only with the last merged block.", sample: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] } },
  dp: { title: "1-D Dynamic Programming", gen: dp as never, blurb: "Build answers for small amounts first; reuse them for bigger ones.", sample: { coins: [1, 2, 5], amount: 11 } },
  "dp-table": { title: "2-D DP Table", gen: dpTable as never, blurb: "Each cell depends on its top, left and diagonal neighbours.", sample: { a: "abcde", b: "ace" } },
  graph: { title: "Topological Sort", gen: graph as never, blurb: "Repeatedly take nodes with no remaining prerequisites.", sample: { n: 5, edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]] } },
  "grid-bfs": { title: "Grid BFS (3D voxels)", gen: gridBfs as never, blurb: "Waves of equal distance rise out of the grid: BFS explores level by level.", sample: { grid: ["S...#....", ".##.#.##.", "....#..#.", ".#....#..", "...#....T"], path: true } },
};
