export default [
  {
    slug: "min-ship-capacity",
    title: "Minimum Truck Capacity",
    difficulty: "Medium",
    patterns: ["binary search on answer"],
    freq: 5,
    viz: { id: "binary-search", input: { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], days: 5 } },
    story: `Packages must ship **in the given order** within \`days\` days. Each day one truck loads consecutive packages as long as total weight ≤ capacity. Return the **minimum capacity** that ships everything on time.`,
    fn: "minCapacity",
    params: [["weights", "int[]"], ["days", "int"]],
    returns: "int",
    examples: [
      { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5], explain: "capacity 15: [1..5][6,7][8][9][10]" },
      { input: [[3, 2, 2, 4, 1, 4], 3], explain: "capacity 6" },
    ],
    constraints: ["1 ≤ days ≤ n ≤ 5·10^4", "1 ≤ weights[i] ≤ 500"],
    hints: ["If capacity C works, does C + 1 work?", "Binary search C in [max(weights), sum(weights)] with a greedy day counter."],
    approach: `**Binary search on the answer.** Feasibility is monotone: if capacity C ships within \`days\`, any larger C does too.

\`feasible(C)\`: greedily fill each day until the next package would overflow, count days. The search range is \`[max weight, total weight]\`. Find the smallest feasible C.`,
    time: "O(n log Σw)",
    space: "O(1)",
    ref: function minCapacity(weights, days) {
      let lo = Math.max(...weights);
      let hi = weights.reduce((a, b) => a + b, 0);
      const ok = (cap) => {
        let d = 1;
        let load = 0;
        for (const w of weights) {
          if (load + w > cap) {
            d++;
            load = 0;
          }
          load += w;
        }
        return d <= days;
      };
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (ok(mid)) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
    brute: (w, days) => {
      for (let c = Math.max(...w); ; c++) {
        let d = 1;
        let l = 0;
        for (const x of w) {
          if (l + x > c) {
            d++;
            l = 0;
          }
          l += x;
        }
        if (d <= days) return c;
      }
    },
    py: `def minCapacity(weights, days):
    lo, hi = max(weights), sum(weights)
    def ok(cap):
        d, load = 1, 0
        for w in weights:
            if load + w > cap:
                d += 1
                load = 0
            load += w
        return d <= days
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo`,
    gen: (r) => {
      const a = r.arr(r.int(1, 12), 1, 9);
      return [a, r.int(1, a.length)];
    },
    big: [(r) => [r.arr(50000, 1, 500), 37]],
  },
  {
    slug: "search-rotated",
    title: "Find a Version in a Rotated Release List",
    difficulty: "Medium",
    patterns: ["binary search"],
    freq: 3,
    viz: { id: "binary-search", input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 } },
    story: `A sorted list of **distinct** version numbers was rotated at an unknown pivot (e.g. \`[4,5,6,7,0,1,2]\`). Return the index of \`target\`, or -1. Must be **O(log n)**.`,
    fn: "searchRotated",
    params: [["nums", "int[]"], ["target", "int"]],
    returns: "int",
    examples: [
      { input: [[4, 5, 6, 7, 0, 1, 2], 0], explain: "index 4" },
      { input: [[4, 5, 6, 7, 0, 1, 2], 3], explain: "absent" },
    ],
    constraints: ["1 ≤ n ≤ 5000", "values distinct"],
    hints: ["At any mid, at least one half is sorted.", "Check if the target lies inside the sorted half; otherwise go to the other half."],
    approach: `At each step compare \`nums[lo]\` with \`nums[mid]\`. If \`nums[lo] ≤ nums[mid]\`, the **left half is sorted**: if target is within \`[nums[lo], nums[mid])\` go left, else right. Otherwise the **right half is sorted**, and you apply the mirror test.`,
    time: "O(log n)",
    space: "O(1)",
    ref: function searchRotated(nums, target) {
      let lo = 0;
      let hi = nums.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[lo] <= nums[mid]) {
          if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
          else lo = mid + 1;
        } else if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
        else hi = mid - 1;
      }
      return -1;
    },
    brute: (nums, t) => nums.indexOf(t),
    py: `def searchRotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        elif nums[mid] < target <= nums[hi]:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    gen: (r) => {
      const n = r.int(1, 12);
      const base = [...new Set(r.arr(n * 2, -20, 20))].sort((a, b) => a - b).slice(0, n);
      const k = r.int(0, base.length - 1);
      const rot = [...base.slice(k), ...base.slice(0, k)];
      return [rot, r.bool(0.7) ? r.pick(rot) : r.int(-25, 25)];
    },
  },
  {
    slug: "valid-brackets",
    title: "Validate Template Brackets",
    difficulty: "Easy",
    patterns: ["stack"],
    freq: 4,
    viz: { id: "stack", input: { s: "{[()()]}(" } },
    story: `A template string contains only \`()[]{}\`. Return \`true\` if every bracket is closed by the **same type** in the **correct order**.`,
    fn: "isValid",
    params: [["s", "string"]],
    returns: "bool",
    examples: [
      { input: ["()[]{}"], explain: "" },
      { input: ["([)]"], explain: "closes in the wrong order" },
      { input: ["{[]}"], explain: "" },
    ],
    constraints: ["1 ≤ |s| ≤ 10^4"],
    hints: ["Push openers; on a closer, the top of the stack must be its matching opener."],
    approach: `Use a stack. Push every opening bracket. For a closing bracket, the stack must be non-empty and its top must be the matching opener, so pop it. At the end the stack must be empty.`,
    time: "O(n)",
    space: "O(n)",
    ref: function isValid(s) {
      const pair = { ")": "(", "]": "[", "}": "{" };
      const st = [];
      for (const c of s) {
        if (c in pair) {
          if (st.pop() !== pair[c]) return false;
        } else st.push(c);
      }
      return st.length === 0;
    },
    brute: (s) => {
      let prev;
      do {
        prev = s;
        s = s.replace("()", "").replace("[]", "").replace("{}", "");
      } while (s !== prev);
      return s === "";
    },
    py: `def isValid(s):
    pair = {')': '(', ']': '[', '}': '{'}
    st = []
    for c in s:
        if c in pair:
            if not st or st.pop() != pair[c]:
                return False
        else:
            st.append(c)
    return not st`,
    gen: (r) => [r.str(r.int(1, 10), "()[]{}")],
    smallGen: (r) => [r.str(r.int(1, 8), "()[]")],
  },
  {
    slug: "days-until-higher-price",
    title: "Days Until a Higher Price",
    difficulty: "Medium",
    patterns: ["monotonic stack"],
    freq: 4,
    viz: { id: "stack", input: { nums: [73, 74, 75, 71, 69, 72, 76, 73] } },
    story: `For each day, return how many days you must wait for a **strictly higher** price. Use 0 if it never happens.`,
    fn: "daysUntilHigher",
    params: [["prices", "int[]"]],
    returns: "int[]",
    examples: [
      { input: [[73, 74, 75, 71, 69, 72, 76, 73]], explain: "[1,1,4,2,1,1,0,0]" },
      { input: [[30, 40, 50, 60]], explain: "" },
    ],
    constraints: ["1 ≤ n ≤ 10^5", "1 ≤ prices[i] ≤ 10^5"],
    hints: ["Keep a stack of indices still waiting for a higher price.", "The stack's prices are decreasing from bottom to top."],
    approach: `Maintain a **monotonic decreasing stack** of indices whose answer isn't known yet. For each new price, pop every index with a lower price: its answer is \`i - j\`. Then push \`i\`.

Every index is pushed and popped at most once → O(n).`,
    time: "O(n)",
    space: "O(n)",
    ref: function daysUntilHigher(prices) {
      const out = new Array(prices.length).fill(0);
      const st = [];
      for (let i = 0; i < prices.length; i++) {
        while (st.length && prices[st[st.length - 1]] < prices[i]) {
          const j = st.pop();
          out[j] = i - j;
        }
        st.push(i);
      }
      return out;
    },
    brute: (p) => p.map((x, i) => {
      for (let j = i + 1; j < p.length; j++) if (p[j] > x) return j - i;
      return 0;
    }),
    py: `def daysUntilHigher(prices):
    out = [0] * len(prices)
    st = []
    for i, p in enumerate(prices):
        while st and prices[st[-1]] < p:
            j = st.pop()
            out[j] = i - j
        st.append(i)
    return out`,
    gen: (r) => [r.arr(r.int(1, 14), 1, 9)],
    big: [(r) => [Array.from({ length: 100000 }, (_, i) => 100000 - i)]],
  },
  {
    slug: "largest-rectangle",
    title: "Largest Billboard in a Skyline",
    difficulty: "Hard",
    patterns: ["monotonic stack"],
    freq: 3,
    viz: { id: "stack", input: { nums: [2, 1, 5, 6, 2, 3] } },
    story: `Building heights form a histogram (width 1 each). Return the area of the **largest rectangle** that fits entirely inside it.`,
    fn: "largestRectangle",
    params: [["heights", "int[]"]],
    returns: "int",
    examples: [
      { input: [[2, 1, 5, 6, 2, 3]], explain: "5 and 6 → height 5 × width 2 = 10" },
      { input: [[2, 4]], explain: "" },
    ],
    constraints: ["1 ≤ n ≤ 10^5", "0 ≤ heights[i] ≤ 10^4"],
    hints: ["For each bar, how far can it extend left and right while staying the minimum?", "A bar popped from an increasing stack knows both boundaries at once."],
    approach: `Keep a stack of indices with **increasing** heights. When the current bar is lower than the top, the top bar's rectangle ends here: its right boundary is \`i\`, its left boundary is the new stack top. Area = \`h × (i - left - 1)\`.

Append a sentinel 0 at the end to flush the stack.`,
    time: "O(n)",
    space: "O(n)",
    ref: function largestRectangle(heights) {
      const h = [...heights, 0];
      const st = [];
      let best = 0;
      for (let i = 0; i < h.length; i++) {
        while (st.length && h[st[st.length - 1]] > h[i]) {
          const height = h[st.pop()];
          const left = st.length ? st[st.length - 1] : -1;
          best = Math.max(best, height * (i - left - 1));
        }
        st.push(i);
      }
      return best;
    },
    brute: (h) => {
      let b = 0;
      for (let i = 0; i < h.length; i++) {
        let m = Infinity;
        for (let j = i; j < h.length; j++) {
          m = Math.min(m, h[j]);
          b = Math.max(b, m * (j - i + 1));
        }
      }
      return b;
    },
    py: `def largestRectangle(heights):
    h = heights + [0]
    st = []
    best = 0
    for i, x in enumerate(h):
        while st and h[st[-1]] > x:
            height = h[st.pop()]
            left = st[-1] if st else -1
            best = max(best, height * (i - left - 1))
        st.append(i)
    return best`,
    gen: (r) => [r.arr(r.int(1, 12), 0, 8)],
    big: [(r) => [r.arr(100000, 0, 10000)]],
  },
  {
    slug: "connect-ropes",
    title: "Merge Log Files at Minimum Cost",
    difficulty: "Medium",
    patterns: ["heap", "greedy"],
    freq: 4,
    viz: { id: "heap", input: { nums: [8, 4, 6, 12] } },
    story: `Merging two files of sizes \`a\` and \`b\` costs \`a + b\` and produces a file of size \`a + b\`. Return the **minimum total cost** to merge all files into one.`,
    fn: "minMergeCost",
    params: [["sizes", "int[]"]],
    returns: "int",
    examples: [
      { input: [[8, 4, 6, 12]], explain: "4+6=10, 8+10=18, 12+18=30 → 58" },
      { input: [[20]], explain: "nothing to merge" },
    ],
    constraints: ["1 ≤ n ≤ 10^5", "1 ≤ sizes[i] ≤ 10^4"],
    hints: ["Always merge the two smallest files first (Huffman).", "A min-heap gives the two smallest in O(log n)."],
    approach: `Greedy (Huffman coding): every merge's cost is paid again by every later merge involving the result, so merge the **two smallest** first. Use a min-heap: pop two, push their sum, add it to the cost.`,
    time: "O(n log n)",
    space: "O(n)",
    ref: function minMergeCost(sizes) {
      const h = [];
      const push = (x) => {
        h.push(x);
        let i = h.length - 1;
        while (i > 0) {
          const p = (i - 1) >> 1;
          if (h[p] <= h[i]) break;
          [h[p], h[i]] = [h[i], h[p]];
          i = p;
        }
      };
      const pop = () => {
        const top = h[0];
        const last = h.pop();
        if (h.length) {
          h[0] = last;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1;
            const r = l + 1;
            let m = i;
            if (l < h.length && h[l] < h[m]) m = l;
            if (r < h.length && h[r] < h[m]) m = r;
            if (m === i) break;
            [h[m], h[i]] = [h[i], h[m]];
            i = m;
          }
        }
        return top;
      };
      sizes.forEach(push);
      let cost = 0;
      while (h.length > 1) {
        const s = pop() + pop();
        cost += s;
        push(s);
      }
      return cost;
    },
    brute: (sizes) => {
      const a = [...sizes];
      let c = 0;
      while (a.length > 1) {
        a.sort((x, y) => x - y);
        const s = a.shift() + a.shift();
        c += s;
        a.push(s);
      }
      return c;
    },
    py: `import heapq

def minMergeCost(sizes):
    h = list(sizes)
    heapq.heapify(h)
    cost = 0
    while len(h) > 1:
        s = heapq.heappop(h) + heapq.heappop(h)
        cost += s
        heapq.heappush(h, s)
    return cost`,
    gen: (r) => [r.arr(r.int(1, 10), 1, 30)],
    big: [(r) => [r.arr(100000, 1, 10000)]],
  },
  {
    slug: "k-closest-hubs",
    title: "K Closest Delivery Hubs",
    difficulty: "Medium",
    patterns: ["heap", "sorting"],
    freq: 4,
    viz: null,
    story: `Hubs are points \`[x, y]\`. Return the indices of the \`k\` hubs closest to the origin, closest first; ties broken by **smaller index**.`,
    fn: "kClosest",
    params: [["points", "int[][]"], ["k", "int"]],
    returns: "int[]",
    examples: [
      { input: [[[1, 3], [-2, 2], [2, -2]], 2], explain: "dist² = 10, 8, 8 → indices 1, 2" },
      { input: [[[3, 3], [5, -1], [-2, 4]], 1], explain: "" },
    ],
    constraints: ["1 ≤ k ≤ n ≤ 10^5", "-10^4 ≤ x, y ≤ 10^4"],
    hints: ["Compare squared distances; no sqrt needed.", "A max-heap of size k gives O(n log k); sorting gives O(n log n)."],
    approach: `Compute \`x² + y²\` (no square roots, which avoids float issues). Sorting indices by \`(dist², index)\` is simplest; a **size-k max-heap** keeps the k best seen so far in O(n log k), which is the expected follow-up for streams.`,
    time: "O(n log k)",
    space: "O(k)",
    ref: function kClosest(points, k) {
      return points
        .map((p, i) => [p[0] * p[0] + p[1] * p[1], i])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1])
        .slice(0, k)
        .map((x) => x[1]);
    },
    py: `def kClosest(points, k):
    order = sorted(range(len(points)), key=lambda i: (points[i][0] ** 2 + points[i][1] ** 2, i))
    return order[:k]`,
    gen: (r) => {
      const n = r.int(1, 10);
      return [Array.from({ length: n }, () => [r.int(-5, 5), r.int(-5, 5)]), r.int(1, n)];
    },
    big: [(r) => [Array.from({ length: 60000 }, () => [r.int(-10000, 10000), r.int(-10000, 10000)]), 25]],
  },
  {
    slug: "min-servers",
    title: "Minimum Servers for All Jobs",
    difficulty: "Medium",
    patterns: ["heap", "intervals", "sweep line"],
    freq: 5,
    viz: { id: "intervals", input: { intervals: [[0, 30], [5, 10], [15, 20], [25, 35]] } },
    story: `Each job runs during \`[start, end)\`. One server runs one job at a time. Return the **minimum number of servers** needed. A server freed at time t can start a job at time t.`,
    fn: "minServers",
    params: [["jobs", "int[][]"]],
    returns: "int",
    examples: [
      { input: [[[0, 30], [5, 10], [15, 20]]], explain: "[0,30] overlaps both others → 2" },
      { input: [[[7, 10], [2, 4]]], explain: "" },
    ],
    constraints: ["1 ≤ n ≤ 10^5", "0 ≤ start < end ≤ 10^9"],
    hints: ["Sort by start; keep a min-heap of end times of running jobs.", "Or sweep: +1 at each start, -1 at each end (process ends first on ties)."],
    approach: `**Sweep line:** create events (start, +1) and (end, -1), sort by time with **ends before starts** at equal times (half-open intervals). The running sum's maximum is the answer.

Heap version: sort by start; pop the heap while its smallest end ≤ current start; push the current end; answer = max heap size.`,
    time: "O(n log n)",
    space: "O(n)",
    ref: function minServers(jobs) {
      const ev = [];
      for (const [s, e] of jobs) ev.push([s, 1], [e, -1]);
      ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let cur = 0;
      let best = 0;
      for (const [, d] of ev) best = Math.max(best, (cur += d));
      return best;
    },
    brute: (jobs) => {
      let b = 0;
      for (const [t] of jobs) b = Math.max(b, jobs.filter(([s, e]) => s <= t && t < e).length);
      return b;
    },
    py: `def minServers(jobs):
    ev = []
    for s, e in jobs:
        ev.append((s, 1))
        ev.append((e, -1))
    ev.sort()
    cur = best = 0
    for _, d in ev:
        cur += d
        best = max(best, cur)
    return best`,
    gen: (r) => [
      Array.from({ length: r.int(1, 8) }, () => {
        const s = r.int(0, 20);
        return [s, s + r.int(1, 10)];
      }),
    ],
    big: [
      (r) => [
        Array.from({ length: 80000 }, () => {
          const s = r.int(0, 1000000);
          return [s, s + r.int(1, 5000)];
        }),
      ],
    ],
  },
];
