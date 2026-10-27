export default [
  {
    slug: "container-max-water",
    title: "Largest Storage Between Racks",
    difficulty: "Medium",
    patterns: ["two pointers", "greedy"],
    freq: 4,
    viz: { id: "two-pointers", input: { nums: [1, 8, 6, 2, 5, 4, 8, 3, 7] } },
    story: `Rack heights stand in a row at unit spacing. Pick **two racks**; the storage between them is \`min(h[i], h[j]) × (j - i)\`. Return the **maximum** storage.`,
    fn: "maxStorage",
    params: [["heights", "int[]"]],
    returns: "int",
    examples: [
      { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], explain: "racks 1 and 8: min(8,7) × 7 = 49" },
      { input: [[1, 1]], explain: "" },
    ],
    constraints: ["2 ≤ n ≤ 10^5", "0 ≤ heights[i] ≤ 10^4"],
    hints: ["Start with the widest pair.", "Moving the taller side inward can never help. Why?"],
    approach: `Start with \`l = 0, r = n-1\`. The area is limited by the **shorter** rack. Moving the taller pointer inward can only shrink the width while the limit stays ≤ the shorter rack, so it can never improve. Always move the shorter side.

Each step discards one rack forever → O(n).`,
    time: "O(n)",
    space: "O(1)",
    ref: function maxStorage(heights) {
      let l = 0;
      let r = heights.length - 1;
      let best = 0;
      while (l < r) {
        best = Math.max(best, Math.min(heights[l], heights[r]) * (r - l));
        if (heights[l] < heights[r]) l++;
        else r--;
      }
      return best;
    },
    brute: (h) => {
      let b = 0;
      for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) b = Math.max(b, Math.min(h[i], h[j]) * (j - i));
      return b;
    },
    py: `def maxStorage(heights):
    l, r, best = 0, len(heights) - 1, 0
    while l < r:
        best = max(best, min(heights[l], heights[r]) * (r - l))
        if heights[l] < heights[r]:
            l += 1
        else:
            r -= 1
    return best`,
    gen: (r) => [r.arr(r.int(2, 14), 0, 12)],
    big: [(r) => [r.arr(100000, 0, 10000)]],
  },
  {
    slug: "three-sum-zero",
    title: "Balanced Triplets",
    difficulty: "Medium",
    patterns: ["two pointers", "sorting"],
    freq: 4,
    viz: { id: "two-pointers", input: { nums: [-4, -1, -1, 0, 1, 2] } },
    story: `Return all **unique** triplets \`[a, b, c]\` from \`nums\` with \`a + b + c = 0\`. Each triplet sorted ascending; the list of triplets in any order.`,
    fn: "threeSum",
    params: [["nums", "int[]"]],
    returns: "int[][]",
    compare: "unordered",
    examples: [
      { input: [[-1, 0, 1, 2, -1, -4]], explain: "[-1,-1,2] and [-1,0,1]" },
      { input: [[0, 0, 0, 0]], explain: "only one unique triplet" },
    ],
    constraints: ["3 ≤ n ≤ 3000", "-10^5 ≤ nums[i] ≤ 10^5"],
    hints: ["Sort first.", "Fix the first element, then solve two-sum on the rest with two pointers. Skip duplicates."],
    approach: `Sort. For each index \`i\` (skipping equal neighbours), run two pointers \`l = i+1, r = n-1\` looking for \`-nums[i]\`. On a hit, record it and move both pointers past duplicates.

O(n²) total, which is optimal for listing all triplets.`,
    time: "O(n²)",
    space: "O(1) extra",
    ref: function threeSum(nums) {
      const a = [...nums].sort((x, y) => x - y);
      const out = [];
      for (let i = 0; i < a.length - 2; i++) {
        if (i > 0 && a[i] === a[i - 1]) continue;
        let l = i + 1;
        let r = a.length - 1;
        while (l < r) {
          const s = a[i] + a[l] + a[r];
          if (s === 0) {
            out.push([a[i], a[l], a[r]]);
            while (l < r && a[l] === a[l + 1]) l++;
            while (l < r && a[r] === a[r - 1]) r--;
            l++;
            r--;
          } else if (s < 0) l++;
          else r--;
        }
      }
      return out;
    },
    brute: (nums) => {
      const set = new Set();
      for (let i = 0; i < nums.length; i++)
        for (let j = i + 1; j < nums.length; j++)
          for (let k = j + 1; k < nums.length; k++) if (nums[i] + nums[j] + nums[k] === 0) set.add(JSON.stringify([nums[i], nums[j], nums[k]].sort((x, y) => x - y)));
      return [...set].map((s) => JSON.parse(s));
    },
    py: `def threeSum(nums):
    a = sorted(nums)
    out = []
    for i in range(len(a) - 2):
        if i and a[i] == a[i - 1]:
            continue
        l, r = i + 1, len(a) - 1
        while l < r:
            s = a[i] + a[l] + a[r]
            if s == 0:
                out.append([a[i], a[l], a[r]])
                while l < r and a[l] == a[l + 1]: l += 1
                while l < r and a[r] == a[r - 1]: r -= 1
                l += 1; r -= 1
            elif s < 0:
                l += 1
            else:
                r -= 1
    return out`,
    gen: (r) => [r.arr(r.int(3, 12), -5, 5)],
    big: [(r) => [r.arr(3000, -1000, 1000)]],
  },
  {
    slug: "longest-unique-substring",
    title: "Longest Session Without Repeats",
    difficulty: "Medium",
    patterns: ["sliding window", "hash map"],
    freq: 5,
    viz: { id: "sliding-window", input: { s: "abcabcbb" } },
    story: `A session is a string of page codes (characters). Return the length of the longest **contiguous** stretch with **no repeated** character.`,
    fn: "longestUnique",
    params: [["s", "string"]],
    returns: "int",
    examples: [
      { input: ["abcabcbb"], explain: "'abc' → 3" },
      { input: ["pwwkew"], explain: "'wke' → 3" },
      { input: [""], explain: "" },
    ],
    constraints: ["0 ≤ |s| ≤ 5·10^4"],
    hints: ["Keep a window [left, right] that never contains duplicates.", "Remember the last index of each char; jump left past it."],
    approach: `Expand \`right\` one char at a time. If \`s[right]\` was last seen at index \`p ≥ left\`, the window now has a duplicate, so move \`left = p + 1\`. Track \`last[ch] = right\` and the best width.

Both pointers only move forward → O(n).`,
    time: "O(n)",
    space: "O(alphabet)",
    ref: function longestUnique(s) {
      const last = new Map();
      let left = 0;
      let best = 0;
      for (let right = 0; right < s.length; right++) {
        const p = last.get(s[right]);
        if (p !== undefined && p >= left) left = p + 1;
        last.set(s[right], right);
        best = Math.max(best, right - left + 1);
      }
      return best;
    },
    brute: (s) => {
      let b = 0;
      for (let i = 0; i < s.length; i++) {
        const seen = new Set();
        for (let j = i; j < s.length && !seen.has(s[j]); j++) {
          seen.add(s[j]);
          b = Math.max(b, j - i + 1);
        }
      }
      return b;
    },
    py: `def longestUnique(s):
    last = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best`,
    gen: (r) => [r.str(r.int(0, 16), "abcde")],
    big: [(r) => [r.str(50000, "abcdefghijklmnopqrstuvwxyz0123456789")]],
  },
  {
    slug: "max-sum-distinct-k",
    title: "Best K-Day Window With Distinct Products",
    difficulty: "Medium",
    patterns: ["sliding window", "hash map"],
    freq: 5,
    viz: { id: "sliding-window", input: { nums: [1, 5, 4, 2, 9, 9, 9], k: 3 } },
    story: `\`sales[i]\` is the product id sold on day \`i\` (its value is also its revenue). Among all windows of exactly \`k\` consecutive days where **all values are distinct**, return the **maximum sum**. Return 0 if none exist.`,
    fn: "maxDistinctWindow",
    params: [["sales", "int[]"], ["k", "int"]],
    returns: "int",
    examples: [
      { input: [[1, 5, 4, 2, 9, 9, 9], 3], explain: "[5,4,2]=11, [4,2,9]=15 ← best; windows with repeated 9s don't count" },
      { input: [[4, 4, 4], 3], explain: "no window has distinct values → 0" },
    ],
    constraints: ["1 ≤ k ≤ n ≤ 10^5", "1 ≤ sales[i] ≤ 10^5"],
    hints: ["Fixed-size window: add the new right element, remove the element that falls off the left.", "Keep a count map; the window is valid when map.size === k."],
    approach: `Slide a window of size \`k\` maintaining its **sum** and a **count map**. When the map has exactly \`k\` keys, all values are distinct, so update the answer.

Each step is O(1) → O(n) total.`,
    time: "O(n)",
    space: "O(k)",
    ref: function maxDistinctWindow(sales, k) {
      const c = new Map();
      let sum = 0;
      let best = 0;
      for (let i = 0; i < sales.length; i++) {
        sum += sales[i];
        c.set(sales[i], (c.get(sales[i]) || 0) + 1);
        if (i >= k) {
          const out = sales[i - k];
          sum -= out;
          if (c.get(out) === 1) c.delete(out);
          else c.set(out, c.get(out) - 1);
        }
        if (i >= k - 1 && c.size === k) best = Math.max(best, sum);
      }
      return best;
    },
    brute: (a, k) => {
      let b = 0;
      for (let i = 0; i + k <= a.length; i++) {
        const w = a.slice(i, i + k);
        if (new Set(w).size === k) b = Math.max(b, w.reduce((x, y) => x + y, 0));
      }
      return b;
    },
    py: `def maxDistinctWindow(sales, k):
    c = {}
    s = best = 0
    for i, x in enumerate(sales):
        s += x
        c[x] = c.get(x, 0) + 1
        if i >= k:
            out = sales[i - k]
            s -= out
            c[out] -= 1
            if c[out] == 0:
                del c[out]
        if i >= k - 1 and len(c) == k:
            best = max(best, s)
    return best`,
    gen: (r) => {
      const a = r.arr(r.int(1, 14), 1, 7);
      return [a, r.int(1, a.length)];
    },
    big: [(r) => [r.arr(100000, 1, 100000), 500]],
  },
  {
    slug: "min-window-substring",
    title: "Shortest Log Slice Covering All Codes",
    difficulty: "Hard",
    patterns: ["sliding window", "hash map"],
    freq: 3,
    viz: { id: "sliding-window", input: { s: "ADOBECODEBANC", t: "ABC" } },
    story: `Return the **shortest substring** of \`s\` that contains every character of \`t\` (with multiplicity). If there are several, return the **leftmost**. Return \`""\` if none.`,
    fn: "minWindow",
    params: [["s", "string"], ["t", "string"]],
    returns: "string",
    examples: [
      { input: ["ADOBECODEBANC", "ABC"], explain: "'BANC'" },
      { input: ["a", "aa"], explain: "not enough a's → ''" },
    ],
    constraints: ["1 ≤ |s|, |t| ≤ 10^5"],
    hints: ["Expand right until the window covers t; then shrink left as long as it still covers.", "Track how many required characters are still missing in a single counter."],
    approach: `Keep \`need[ch]\` counts and \`missing = |t|\`. Expand \`right\`: if \`need[s[right]] > 0\`, decrement \`missing\`; always decrement \`need[s[right]]\`.

When \`missing === 0\` the window covers \`t\`. Shrink from the left while it stays valid, recording the best, then step past the first required char to look for the next window.`,
    time: "O(|s| + |t|)",
    space: "O(alphabet)",
    ref: function minWindow(s, t) {
      const need = new Map();
      for (const ch of t) need.set(ch, (need.get(ch) || 0) + 1);
      let missing = t.length;
      let left = 0;
      let bestL = 0;
      let bestLen = Infinity;
      for (let right = 0; right < s.length; right++) {
        const c = s[right];
        if ((need.get(c) || 0) > 0) missing--;
        need.set(c, (need.get(c) || 0) - 1);
        while (missing === 0) {
          if (right - left + 1 < bestLen) {
            bestLen = right - left + 1;
            bestL = left;
          }
          const lc = s[left];
          need.set(lc, need.get(lc) + 1);
          if (need.get(lc) > 0) missing++;
          left++;
        }
      }
      return bestLen === Infinity ? "" : s.slice(bestL, bestL + bestLen);
    },
    brute: (s, t) => {
      const cover = (w) => {
        const c = {};
        for (const ch of w) c[ch] = (c[ch] || 0) + 1;
        for (const ch of t) if (!c[ch]--) return false;
        return true;
      };
      for (let len = t.length; len <= s.length; len++) for (let i = 0; i + len <= s.length; i++) if (cover(s.slice(i, i + len))) return s.slice(i, i + len);
      return "";
    },
    py: `from collections import Counter

def minWindow(s, t):
    need = Counter(t)
    missing = len(t)
    left = best_l = 0
    best_len = float('inf')
    for right, c in enumerate(s):
        if need[c] > 0:
            missing -= 1
        need[c] -= 1
        while missing == 0:
            if right - left + 1 < best_len:
                best_len, best_l = right - left + 1, left
            need[s[left]] += 1
            if need[s[left]] > 0:
                missing += 1
            left += 1
    return "" if best_len == float('inf') else s[best_l:best_l + best_len]`,
    gen: (r) => [r.str(r.int(1, 14), "ABCD"), r.str(r.int(1, 3), "ABC")],
    big: [(r) => [r.str(100000, "ABCDEFGH"), "ABCDEFGHH"]],
  },
  {
    slug: "longest-ones-k-flips",
    title: "Longest Uptime With K Repairs",
    difficulty: "Medium",
    patterns: ["sliding window"],
    freq: 4,
    viz: { id: "sliding-window", input: { nums: [1, 1, 0, 0, 1, 1, 1, 0, 1, 1], k: 2 } },
    story: `\`status[i]\` is 1 if the server was up in minute \`i\`, else 0. You may retroactively **repair at most k** down-minutes (turn 0 into 1). Return the longest run of consecutive 1s achievable.`,
    fn: "longestUptime",
    params: [["status", "int[]"], ["k", "int"]],
    returns: "int",
    examples: [
      { input: [[1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2], explain: "repair two zeros → 6" },
      { input: [[0, 0, 0], 0], explain: "" },
    ],
    constraints: ["1 ≤ n ≤ 10^5", "0 ≤ k ≤ n"],
    hints: ["Find the longest window containing at most k zeros."],
    approach: `This is "longest window with at most k zeros". Expand right, counting zeros; while zeros > k, move left (decrementing when a zero leaves). The window width is a candidate answer at every step.`,
    time: "O(n)",
    space: "O(1)",
    ref: function longestUptime(status, k) {
      let left = 0;
      let zeros = 0;
      let best = 0;
      for (let right = 0; right < status.length; right++) {
        if (status[right] === 0) zeros++;
        while (zeros > k) if (status[left++] === 0) zeros--;
        best = Math.max(best, right - left + 1);
      }
      return best;
    },
    brute: (a, k) => {
      let b = 0;
      for (let i = 0; i < a.length; i++) {
        let z = 0;
        for (let j = i; j < a.length; j++) {
          if (a[j] === 0) z++;
          if (z > k) break;
          b = Math.max(b, j - i + 1);
        }
      }
      return b;
    },
    py: `def longestUptime(status, k):
    left = zeros = best = 0
    for right, x in enumerate(status):
        if x == 0:
            zeros += 1
        while zeros > k:
            if status[left] == 0:
                zeros -= 1
            left += 1
        best = max(best, right - left + 1)
    return best`,
    gen: (r) => {
      const a = r.arr(r.int(1, 15), 0, 1);
      return [a, r.int(0, 3)];
    },
    big: [(r) => [r.arr(100000, 0, 1), 300]],
  },
];
