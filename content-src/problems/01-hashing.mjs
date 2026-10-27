export default [
  {
    slug: "pair-sum-shipments",
    title: "Pair of Packages",
    difficulty: "Easy",
    patterns: ["hash map"],
    freq: 5,
    viz: { id: "hashmap", input: { nums: [4, 11, 7, 2, 15], target: 9 } },
    story: `A cargo drone can carry exactly \`capacity\` kilograms. Given the package \`weights\`, return the indices \`[i, j]\` (with \`i < j\`) of the **two packages** whose weights sum to exactly \`capacity\`.

Exactly one valid pair exists.`,
    fn: "pairSum",
    params: [["weights", "int[]"], ["capacity", "int"]],
    returns: "int[]",
    examples: [
      { input: [[4, 11, 7, 2, 15], 9], explain: "weights[2] + weights[3] = 7 + 2 = 9" },
      { input: [[3, 3], 6], explain: "" },
    ],
    constraints: ["2 ≤ n ≤ 10^5", "-10^9 ≤ weights[i], capacity ≤ 10^9", "exactly one answer"],
    hints: ["For each weight w, which partner weight do you need?", "Store weights you've already seen in a map: value → index."],
    approach: `Brute force checks every pair: O(n²), which times out at n = 10⁵.

Walk once, keeping a map \`seen[value] = index\`. For each \`w\` at index \`j\`, the partner is \`capacity - w\`. If it's already in the map at index \`i\`, return \`[i, j]\`; otherwise store \`w\`.

Because you look up **before** inserting, an element is never paired with itself, and duplicates like \`[3, 3]\` work.`,
    time: "O(n)",
    space: "O(n)",
    ref: function pairSum(weights, capacity) {
      const seen = new Map();
      for (let j = 0; j < weights.length; j++) {
        const need = capacity - weights[j];
        if (seen.has(need)) return [seen.get(need), j];
        seen.set(weights[j], j);
      }
      return [];
    },
    py: `def pairSum(weights, capacity):
    seen = {}
    for j, w in enumerate(weights):
        if capacity - w in seen:
            return [seen[capacity - w], j]
        seen[w] = j
    return []`,
    gen: (r) => {
      // one odd + one even form the answer; every other value is even and != the even partner,
      // so exactly one pair sums to the (odd) target
      const n = r.int(2, 12);
      const partner = r.int(-50, 50) * 2;
      const a = Array.from({ length: n }, () => {
        let x;
        do x = r.int(-50, 50) * 2;
        while (x === partner);
        return x;
      });
      const i = r.int(0, n - 2);
      const j = r.int(i + 1, n - 1);
      const odd = r.int(-50, 50) * 2 + 1;
      if (r.bool()) [a[i], a[j]] = [odd, partner];
      else [a[i], a[j]] = [partner, odd];
      return [a, odd + partner];
    },
    big: [
      (r) => {
        const n = 60000;
        const a = Array.from({ length: n }, () => r.int(0, 400000000) * 2);
        a[n - 2] = 1000000001;
        a[n - 1] = 999999999;
        return [a, 2000000000];
      },
    ],
  },
  {
    slug: "longest-consecutive-ids",
    title: "Longest Run of Consecutive IDs",
    difficulty: "Medium",
    patterns: ["hash set"],
    freq: 4,
    viz: { id: "hashmap", input: { nums: [100, 4, 200, 1, 3, 2], target: null } },
    story: `Order IDs arrive unsorted, possibly with duplicates. Return the length of the **longest run of consecutive integers** present (e.g. 1, 2, 3, 4).

Must run in **O(n)**.`,
    fn: "longestRun",
    params: [["ids", "int[]"]],
    returns: "int",
    examples: [
      { input: [[100, 4, 200, 1, 3, 2]], explain: "1, 2, 3, 4 → length 4" },
      { input: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], explain: "0..8 → 9" },
    ],
    constraints: ["0 ≤ n ≤ 10^5", "-10^9 ≤ ids[i] ≤ 10^9"],
    hints: ["Put everything in a Set.", "Only start counting from numbers that have no predecessor (x - 1 not in set)."],
    approach: `Sorting is O(n log n). For O(n): put all ids into a Set. A number \`x\` **starts** a run only if \`x - 1\` is absent. From each start, count upward while \`x + k\` exists.

Each number is visited at most twice (once in the outer loop, once while extending a run), so the total is linear.`,
    time: "O(n)",
    space: "O(n)",
    ref: function longestRun(ids) {
      const s = new Set(ids);
      let best = 0;
      for (const x of s) {
        if (s.has(x - 1)) continue;
        let len = 1;
        while (s.has(x + len)) len++;
        best = Math.max(best, len);
      }
      return best;
    },
    brute: (ids) => {
      const a = [...new Set(ids)].sort((x, y) => x - y);
      let best = a.length ? 1 : 0;
      let cur = 1;
      for (let i = 1; i < a.length; i++) {
        cur = a[i] === a[i - 1] + 1 ? cur + 1 : 1;
        best = Math.max(best, cur);
      }
      return best;
    },
    py: `def longestRun(ids):
    s = set(ids)
    best = 0
    for x in s:
        if x - 1 in s:
            continue
        n = 1
        while x + n in s:
            n += 1
        best = max(best, n)
    return best`,
    cases: [[[]], [[5]], [[1, 1, 1]]],
    gen: (r) => [r.arr(r.int(0, 15), -10, 10)],
    big: [(r) => [r.shuffle(Array.from({ length: 80000 }, (_, i) => (i % 3 === 0 ? i * 7 : i)))]],
  },
  {
    slug: "top-k-frequent-products",
    title: "Top K Viewed Products",
    difficulty: "Medium",
    patterns: ["hash map", "heap", "bucket sort"],
    freq: 5,
    viz: null,
    story: `Given the stream of product ids users viewed, return the \`k\` **most viewed** ids, most viewed first. Break ties by **smaller id first**.`,
    fn: "topK",
    params: [["views", "int[]"], ["k", "int"]],
    returns: "int[]",
    examples: [
      { input: [[1, 1, 1, 2, 2, 3], 2], explain: "1 seen 3×, 2 seen 2×" },
      { input: [[4, 4, 5, 5, 6], 2], explain: "4 and 5 tie at 2 views; 6 has 1" },
    ],
    constraints: ["1 ≤ n ≤ 10^5", "1 ≤ k ≤ number of distinct ids"],
    hints: ["Count with a hash map first.", "Sort the (id, count) pairs by (-count, id), or keep a size-k min-heap."],
    approach: `Count frequencies in O(n). Then either sort the distinct ids by \`(-count, id)\` in O(d log d), or maintain a min-heap of size k for O(d log k).

The **bucket sort** variant indexes ids by frequency (frequency ≤ n) for O(n). Mention it as the follow-up.`,
    time: "O(n + d log d)",
    space: "O(d)",
    ref: function topK(views, k) {
      const c = new Map();
      for (const v of views) c.set(v, (c.get(v) || 0) + 1);
      return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((e) => e[0]);
    },
    py: `from collections import Counter

def topK(views, k):
    c = Counter(views)
    return [x for x, _ in sorted(c.items(), key=lambda e: (-e[1], e[0]))[:k]]`,
    gen: (r) => {
      const a = r.arr(r.int(1, 20), 1, 6);
      return [a, r.int(1, new Set(a).size)];
    },
    big: [(r) => [r.arr(100000, 1, 5000), 10]],
  },
  {
    slug: "subarray-sum-k",
    title: "Delivery Windows Summing to K",
    difficulty: "Medium",
    patterns: ["prefix sum", "hash map"],
    freq: 5,
    viz: { id: "prefix", input: { nums: [1, 2, 1, -1, 3, 1], k: 3 } },
    story: `\`deliveries[i]\` is the net change in packages at hour \`i\` (can be negative for returns). Count the **contiguous windows** of hours whose total is exactly \`k\`.`,
    fn: "countWindows",
    params: [["deliveries", "int[]"], ["k", "int"]],
    returns: "int",
    examples: [
      { input: [[1, 1, 1], 2], explain: "[1,1] twice" },
      { input: [[1, 2, 3], 3], explain: "[1,2] and [3]" },
    ],
    constraints: ["1 ≤ n ≤ 2·10^4", "-1000 ≤ deliveries[i] ≤ 1000", "-10^7 ≤ k ≤ 10^7"],
    hints: ["sum(i..j) = prefix[j+1] - prefix[i].", "Negatives break sliding window. Count earlier prefixes equal to prefix - k."],
    approach: `A sliding window fails because values can be negative. Use **prefix sums**: the window \`(i, j]\` sums to \`k\` iff \`prefix[j] - prefix[i] = k\`, i.e. \`prefix[i] = prefix[j] - k\`.

Scan left to right with a map \`count[prefix]\` (seeded with \`{0: 1}\`). At each step add \`count[prefix - k]\` to the answer, then record the current prefix.`,
    time: "O(n)",
    space: "O(n)",
    ref: function countWindows(deliveries, k) {
      const seen = new Map([[0, 1]]);
      let sum = 0;
      let ans = 0;
      for (const x of deliveries) {
        sum += x;
        ans += seen.get(sum - k) || 0;
        seen.set(sum, (seen.get(sum) || 0) + 1);
      }
      return ans;
    },
    brute: (a, k) => {
      let c = 0;
      for (let i = 0; i < a.length; i++) {
        let s = 0;
        for (let j = i; j < a.length; j++) if ((s += a[j]) === k) c++;
      }
      return c;
    },
    py: `def countWindows(deliveries, k):
    seen = {0: 1}
    s = ans = 0
    for x in deliveries:
        s += x
        ans += seen.get(s - k, 0)
        seen[s] = seen.get(s, 0) + 1
    return ans`,
    gen: (r) => [r.arr(r.int(1, 14), -3, 4), r.int(-3, 6)],
    big: [(r) => [r.arr(20000, -2, 3), 5]],
  },
  {
    slug: "product-except-self",
    title: "Demand Multiplier Except Self",
    difficulty: "Medium",
    patterns: ["prefix product"],
    freq: 3,
    viz: null,
    story: `For each warehouse \`i\`, compute the product of all **other** warehouses' multipliers. You may **not** use division (multipliers can be 0).`,
    fn: "productExceptSelf",
    params: [["nums", "int[]"]],
    returns: "int[]",
    examples: [
      { input: [[1, 2, 3, 4]], explain: "[2·3·4, 1·3·4, 1·2·4, 1·2·3]" },
      { input: [[-1, 1, 0, -3, 3]], explain: "" },
    ],
    constraints: ["2 ≤ n ≤ 10^5", "-30 ≤ nums[i] ≤ 30", "every answer fits in a 32-bit int"],
    hints: ["answer[i] = (product of everything left of i) × (product of everything right of i).", "Do it with two passes and O(1) extra space besides the output."],
    approach: `First pass left→right writes the running product of everything **before** \`i\` into \`out[i]\`. Second pass right→left multiplies \`out[i]\` by the running product of everything **after** \`i\`.

No division means zeros are handled naturally.`,
    time: "O(n)",
    space: "O(1) extra",
    ref: function productExceptSelf(nums) {
      const n = nums.length;
      const out = new Array(n).fill(1);
      let left = 1;
      for (let i = 0; i < n; i++) {
        out[i] = left;
        left *= nums[i];
      }
      let right = 1;
      for (let i = n - 1; i >= 0; i--) {
        out[i] *= right;
        right *= nums[i];
      }
      return out.map((x) => (x === 0 ? 0 : x));
    },
    py: `def productExceptSelf(nums):
    n = len(nums)
    out = [1] * n
    left = 1
    for i in range(n):
        out[i] = left
        left *= nums[i]
    right = 1
    for i in range(n - 1, -1, -1):
        out[i] *= right
        right *= nums[i]
    return out`,
    gen: (r) => [r.arr(r.int(2, 8), -4, 4)],
    big: [(r) => [Array.from({ length: 50000 }, (_, i) => (i < 20 ? r.pick([-2, 2]) : 1))]],
  },
  {
    slug: "smallest-base-segment",
    title: "Smallest Repeating Segment",
    difficulty: "Hard",
    patterns: ["binary search on answer", "greedy", "counting"],
    freq: 4,
    viz: { id: "binary-answer", input: { need: { a: 3, b: 2, c: 2 }, size: 4 } },
    story: `Data recovery: a segment of length \`segmentSize\` (lowercase letters) will be **copied t times** and concatenated. The concatenation must contain **at least** as many of each letter as appears in \`missingData\` (order doesn't matter).

Choose the segment that needs the **fewest copies t**. Among those, return the **lexicographically smallest** segment. If impossible, return \`"-1"\`.`,
    fn: "getSmallestBaseSegment",
    params: [["segmentSize", "int"], ["missingData", "string"]],
    returns: "string",
    examples: [
      { input: [4, "aaabbcc"], explain: "t=2 needs ceil(3/2)+ceil(2/2)+ceil(2/2) = 4 slots → counts a2 b1 c1 → 'aabc'" },
      { input: [3, "aab"], explain: "t=1 fits exactly: 'aab'" },
      { input: [2, "abc"], explain: "3 distinct letters can't fit in 2 slots → '-1'" },
    ],
    constraints: ["1 ≤ segmentSize ≤ 2·10^5", "1 ≤ |missingData| ≤ 2·10^5"],
    hints: ["Fix t. Then each letter x needs ceil(need[x] / t) copies inside the segment.", "The total slots needed only decreases as t grows → binary search the smallest t that fits.", "Fill leftover slots with 'a', then write letters in sorted order."],
    approach: `Think in **counts**, not strings. For a fixed number of copies \`t\`, letter \`x\` must appear \`c ≥ ceil(need[x] / t)\` times in the segment, so the minimum segment length is \`Σ ceil(need[x] / t)\`.

That sum is **monotone non-increasing** in \`t\`, so binary search the smallest \`t\` whose sum ≤ \`segmentSize\`. If even \`t = max count\` (one slot per distinct letter) doesn't fit, the answer is \`-1\`.

Leftover slots can hold anything, and \`'a'\` is lexicographically smallest. Then emit letters in sorted order.`,
    time: "O(26 · log n + n)",
    space: "O(26)",
    ref: function getSmallestBaseSegment(segmentSize, missingData) {
      const need = {};
      for (const ch of missingData) need[ch] = (need[ch] || 0) + 1;
      const letters = Object.keys(need);
      if (letters.length > segmentSize) return "-1";
      const slots = (t) => letters.reduce((s, ch) => s + Math.ceil(need[ch] / t), 0);
      let lo = 1;
      let hi = Math.max(...Object.values(need));
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (slots(mid) <= segmentSize) hi = mid;
        else lo = mid + 1;
      }
      const cnt = {};
      for (const ch of letters) cnt[ch] = Math.ceil(need[ch] / lo);
      cnt.a = (cnt.a || 0) + segmentSize - slots(lo);
      return Object.keys(cnt)
        .sort()
        .map((ch) => ch.repeat(cnt[ch]))
        .join("");
    },
    py: `from collections import Counter

def getSmallestBaseSegment(segmentSize, missingData):
    need = Counter(missingData)
    if len(need) > segmentSize:
        return "-1"
    def slots(t):
        return sum((v + t - 1) // t for v in need.values())
    lo, hi = 1, max(need.values())
    while lo < hi:
        mid = (lo + hi) // 2
        if slots(mid) <= segmentSize:
            hi = mid
        else:
            lo = mid + 1
    cnt = {ch: (v + lo - 1) // lo for ch, v in need.items()}
    cnt['a'] = cnt.get('a', 0) + segmentSize - slots(lo)
    return ''.join(ch * cnt[ch] for ch in sorted(cnt))`,
    cases: [[1, "z"], [5, "zzzzzzzzzz"], [1, "ab"]],
    gen: (r) => [r.int(1, 8), r.str(r.int(1, 14), "abcdz")],
    big: [(r) => [50, r.str(200000)]],
  },
];
