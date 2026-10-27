export default [
  {
    slug: "count-islands",
    title: "Count Delivery Zones",
    difficulty: "Medium",
    patterns: ["BFS", "DFS", "grid"],
    freq: 5,
    viz: { id: "grid-bfs", input: { grid: ["11000", "11000", "00100", "00011"] } },
    story: `The map is a grid of \`'1'\` (served) and \`'0'\` (not served). Cells connect **up/down/left/right**. Return the number of connected served zones.`,
    fn: "countZones",
    params: [["grid", "string[]"]],
    returns: "int",
    examples: [
      { input: [["11000", "11000", "00100", "00011"]], explain: "3 zones" },
      { input: [["111", "010", "111"]], explain: "1 zone" },
    ],
    constraints: ["1 ≤ rows, cols ≤ 300"],
    hints: ["Scan cells; every unvisited '1' starts a new zone.", "Flood-fill (BFS/DFS) marks the whole zone visited."],
    approach: `Iterate every cell. When you hit an unvisited \`'1'\`, increment the count and **flood fill** from it (BFS with a queue, or iterative DFS, to avoid recursion depth limits on 300×300 grids), marking every reachable \`'1'\` as visited.

Every cell is processed a constant number of times → O(R·C).`,
    time: "O(R·C)",
    space: "O(R·C)",
    ref: function countZones(grid) {
      const R = grid.length;
      const C = grid[0].length;
      const seen = Array.from({ length: R }, () => new Array(C).fill(false));
      let zones = 0;
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          if (grid[r][c] !== "1" || seen[r][c]) continue;
          zones++;
          const q = [[r, c]];
          seen[r][c] = true;
          while (q.length) {
            const [y, x] = q.pop();
            for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < R && nx >= 0 && nx < C && grid[ny][nx] === "1" && !seen[ny][nx]) {
                seen[ny][nx] = true;
                q.push([ny, nx]);
              }
            }
          }
        }
      return zones;
    },
    py: `def countZones(grid):
    R, C = len(grid), len(grid[0])
    seen = [[False] * C for _ in range(R)]
    zones = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] != '1' or seen[r][c]:
                continue
            zones += 1
            stack = [(r, c)]
            seen[r][c] = True
            while stack:
                y, x = stack.pop()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < R and 0 <= nx < C and grid[ny][nx] == '1' and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((ny, nx))
    return zones`,
    gen: (r) => {
      const R = r.int(1, 6);
      const C = r.int(1, 6);
      return [Array.from({ length: R }, () => r.str(C, "001"))];
    },
    big: [(r) => [Array.from({ length: 300 }, () => r.str(300, "01"))]],
  },
  {
    slug: "spoiled-packages",
    title: "Spoiling Packages",
    difficulty: "Medium",
    patterns: ["multi-source BFS", "grid"],
    freq: 4,
    viz: { id: "grid-bfs", input: { grid: ["211", "110", "011"], multi: true } },
    story: `Grid cells: \`0\` empty, \`1\` fresh package, \`2\` spoiled. Every minute, spoilage spreads from each spoiled package to fresh **4-directional** neighbours. Return the minutes until no fresh package remains, or **-1** if some can never spoil.`,
    fn: "minutesToSpoil",
    params: [["grid", "int[][]"]],
    returns: "int",
    examples: [
      { input: [[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], explain: "4 minutes" },
      { input: [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], explain: "bottom-left is unreachable → -1" },
      { input: [[[0, 2]]], explain: "no fresh packages → 0" },
    ],
    constraints: ["1 ≤ rows, cols ≤ 200"],
    hints: ["Start a BFS from ALL spoiled cells at once (multi-source).", "Process the queue level by level; each level is one minute."],
    approach: `Seed one queue with **every** initially spoiled cell (multi-source BFS) and count the fresh cells. Process level by level: each level spoils its fresh neighbours and is one minute. When the queue empties, return the minutes if fresh = 0, else -1.

This is the classic shape for "spread / infection / distance to nearest X".`,
    time: "O(R·C)",
    space: "O(R·C)",
    ref: function minutesToSpoil(grid) {
      const g = grid.map((row) => [...row]);
      const R = g.length;
      const C = g[0].length;
      let q = [];
      let fresh = 0;
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          if (g[r][c] === 2) q.push([r, c]);
          if (g[r][c] === 1) fresh++;
        }
      let minutes = 0;
      while (q.length && fresh) {
        const next = [];
        for (const [y, x] of q)
          for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < R && nx >= 0 && nx < C && g[ny][nx] === 1) {
              g[ny][nx] = 2;
              fresh--;
              next.push([ny, nx]);
            }
          }
        q = next;
        minutes++;
      }
      return fresh ? -1 : minutes;
    },
    py: `def minutesToSpoil(grid):
    g = [row[:] for row in grid]
    R, C = len(g), len(g[0])
    q = [(r, c) for r in range(R) for c in range(C) if g[r][c] == 2]
    fresh = sum(row.count(1) for row in g)
    minutes = 0
    while q and fresh:
        nxt = []
        for y, x in q:
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < R and 0 <= nx < C and g[ny][nx] == 1:
                    g[ny][nx] = 2
                    fresh -= 1
                    nxt.append((ny, nx))
        q = nxt
        minutes += 1
    return -1 if fresh else minutes`,
    gen: (r) => [r.grid(r.int(1, 5), r.int(1, 5), () => r.pick([0, 1, 1, 1, 2]))],
    big: [(r) => [r.grid(200, 200, (i, j) => (i === 0 && j === 0 ? 2 : r.bool(0.97) ? 1 : 0))]],
  },
  {
    slug: "robot-shortest-path",
    title: "Warehouse Robot Shortest Route",
    difficulty: "Medium",
    patterns: ["BFS", "grid"],
    freq: 5,
    viz: { id: "grid-bfs", input: { grid: ["S.#.", "..#.", "...T"], path: true } },
    story: `A robot moves on a grid: \`'S'\` start, \`'T'\` target, \`'#'\` shelf (blocked), \`'.'\` open. Each move goes one cell up/down/left/right. Return the **minimum moves** from S to T, or -1.`,
    fn: "shortestRoute",
    params: [["grid", "string[]"]],
    returns: "int",
    examples: [
      { input: [["S.#.", "..#.", "...T"]], explain: "down, down, right ×3 = 5" },
      { input: [["S#", "#T"]], explain: "blocked → -1" },
    ],
    constraints: ["1 ≤ rows, cols ≤ 500", "exactly one S and one T"],
    hints: ["Unweighted shortest path = BFS.", "Mark cells visited when you ENQUEUE them, not when you dequeue."],
    approach: `BFS from \`S\` explores cells in order of distance, so the first time you reach \`T\` is optimal. Use a head index instead of \`shift()\` (O(1) dequeue), and mark visited on enqueue so no cell is queued twice.`,
    time: "O(R·C)",
    space: "O(R·C)",
    ref: function shortestRoute(grid) {
      const R = grid.length;
      const C = grid[0].length;
      let sr = 0;
      let sc = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grid[r][c] === "S") [sr, sc] = [r, c];
      const dist = Array.from({ length: R }, () => new Array(C).fill(-1));
      const q = [[sr, sc]];
      dist[sr][sc] = 0;
      for (let h = 0; h < q.length; h++) {
        const [y, x] = q[h];
        if (grid[y][x] === "T") return dist[y][x];
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < R && nx >= 0 && nx < C && grid[ny][nx] !== "#" && dist[ny][nx] < 0) {
            dist[ny][nx] = dist[y][x] + 1;
            q.push([ny, nx]);
          }
        }
      }
      return -1;
    },
    py: `from collections import deque

def shortestRoute(grid):
    R, C = len(grid), len(grid[0])
    start = next((r, c) for r in range(R) for c in range(C) if grid[r][c] == 'S')
    dist = {start: 0}
    q = deque([start])
    while q:
        y, x = q.popleft()
        if grid[y][x] == 'T':
            return dist[(y, x)]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < R and 0 <= nx < C and grid[ny][nx] != '#' and (ny, nx) not in dist:
                dist[(ny, nx)] = dist[(y, x)] + 1
                q.append((ny, nx))
    return -1`,
    gen: (r) => {
      const R = r.int(1, 6);
      const C = r.int(2, 6);
      const g = Array.from({ length: R }, () => [...r.str(C, "..#")]);
      const cells = [];
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) cells.push([i, j]);
      const [a, b] = r.shuffle(cells);
      g[a[0]][a[1]] = "S";
      g[b[0]][b[1]] = "T";
      return [g.map((row) => row.join(""))];
    },
    big: [
      (r) => {
        const g = Array.from({ length: 500 }, () => [...r.str(500, "....#")]);
        g[0][0] = "S";
        g[499][499] = "T";
        return [g.map((row) => row.join(""))];
      },
    ],
  },
  {
    slug: "deployment-order",
    title: "Service Deployment Order",
    difficulty: "Medium",
    patterns: ["topological sort", "heap"],
    freq: 4,
    viz: { id: "graph", input: { n: 5, edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]] } },
    story: `There are \`n\` services labelled \`0..n-1\`. Each pair \`[a, b]\` in \`deps\` means **a must deploy before b**. Return a valid deployment order; when several services are ready, deploy the **smallest label first**. Return \`[]\` if there's a cycle.`,
    fn: "deployOrder",
    params: [["n", "int"], ["deps", "int[][]"]],
    returns: "int[]",
    examples: [
      { input: [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], explain: "3 first, then 1, 2, then 0" },
      { input: [2, [[0, 1], [1, 0]]], explain: "cycle → []" },
    ],
    constraints: ["1 ≤ n ≤ 10^4", "0 ≤ |deps| ≤ 5·10^4"],
    hints: ["Kahn's algorithm: start with all in-degree-0 nodes.", "Use a min-heap (or sorted set) instead of a queue to always pick the smallest ready label."],
    approach: `Compute in-degrees. Put every node with in-degree 0 into a **min-heap**. Repeatedly pop the smallest, append it, and decrement its neighbours' in-degrees (pushing those that hit 0).

If the output has fewer than \`n\` nodes, a cycle blocked the rest → \`[]\`.`,
    time: "O((n + m) log n)",
    space: "O(n + m)",
    ref: function deployOrder(n, deps) {
      const adj = Array.from({ length: n }, () => []);
      const indeg = new Array(n).fill(0);
      for (const [a, b] of deps) {
        adj[a].push(b);
        indeg[b]++;
      }
      const heap = [];
      const push = (x) => {
        heap.push(x);
        let i = heap.length - 1;
        while (i > 0 && heap[(i - 1) >> 1] > heap[i]) {
          [heap[(i - 1) >> 1], heap[i]] = [heap[i], heap[(i - 1) >> 1]];
          i = (i - 1) >> 1;
        }
      };
      const pop = () => {
        const top = heap[0];
        const last = heap.pop();
        if (heap.length) {
          heap[0] = last;
          let i = 0;
          for (;;) {
            let m = i;
            const l = 2 * i + 1;
            const r = l + 1;
            if (l < heap.length && heap[l] < heap[m]) m = l;
            if (r < heap.length && heap[r] < heap[m]) m = r;
            if (m === i) break;
            [heap[m], heap[i]] = [heap[i], heap[m]];
            i = m;
          }
        }
        return top;
      };
      for (let i = 0; i < n; i++) if (indeg[i] === 0) push(i);
      const out = [];
      while (heap.length) {
        const u = pop();
        out.push(u);
        for (const v of adj[u]) if (--indeg[v] === 0) push(v);
      }
      return out.length === n ? out : [];
    },
    py: `import heapq

def deployOrder(n, deps):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in deps:
        adj[a].append(b)
        indeg[b] += 1
    h = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(h)
    out = []
    while h:
        u = heapq.heappop(h)
        out.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(h, v)
    return out if len(out) == n else []`,
    gen: (r) => {
      const n = r.int(1, 7);
      const deps = [];
      const m = r.int(0, n * 2);
      for (let i = 0; i < m; i++) {
        const a = r.int(0, n - 1);
        const b = r.int(0, n - 1);
        if (a !== b) deps.push(r.bool(0.85) ? [Math.min(a, b), Math.max(a, b)] : [a, b]);
      }
      return [n, deps];
    },
    big: [
      (r) => {
        const n = 10000;
        const deps = [];
        for (let i = 0; i < 50000; i++) {
          const a = r.int(0, n - 2);
          deps.push([a, r.int(a + 1, n - 1)]);
        }
        return [n, deps];
      },
    ],
  },
  {
    slug: "coin-change",
    title: "Fewest Coupons to Reach an Amount",
    difficulty: "Medium",
    patterns: ["dynamic programming"],
    freq: 4,
    viz: { id: "dp", input: { coins: [1, 2, 5], amount: 11 } },
    story: `Coupons come in denominations \`coins\` (unlimited supply). Return the **fewest coupons** that sum to exactly \`amount\`, or -1 if impossible.`,
    fn: "fewestCoupons",
    params: [["coins", "int[]"], ["amount", "int"]],
    returns: "int",
    examples: [
      { input: [[1, 2, 5], 11], explain: "5 + 5 + 1" },
      { input: [[2], 3], explain: "-1" },
      { input: [[1], 0], explain: "0" },
    ],
    constraints: ["1 ≤ |coins| ≤ 12", "0 ≤ amount ≤ 10^4"],
    hints: ["Greedy (largest first) fails for coins like [1, 3, 4] and amount 6.", "dp[x] = 1 + min(dp[x - c]) over coins c."],
    approach: `Greedy is wrong in general (\`[1,3,4]\`, 6 → greedy 4+1+1 = 3, optimal 3+3 = 2).

Bottom-up DP: \`dp[0] = 0\`, \`dp[x] = min(dp[x - c] + 1)\` over all coins \`c ≤ x\`. Unreachable amounts stay ∞.`,
    time: "O(amount · |coins|)",
    space: "O(amount)",
    ref: function fewestCoupons(coins, amount) {
      const dp = new Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let x = 1; x <= amount; x++) for (const c of coins) if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
      return dp[amount] === Infinity ? -1 : dp[amount];
    },
    brute: (coins, amount) => {
      let best = Infinity;
      const go = (left, used) => {
        if (left === 0) best = Math.min(best, used);
        if (left <= 0 || used >= best) return;
        for (const c of coins) go(left - c, used + 1);
      };
      go(amount, 0);
      return best === Infinity ? -1 : best;
    },
    smallGen: (r) => [[...new Set(r.arr(r.int(1, 3), 1, 6))], r.int(0, 14)],
    py: `def fewestCoupons(coins, amount):
    INF = float('inf')
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x and dp[x - c] + 1 < dp[x]:
                dp[x] = dp[x - c] + 1
    return -1 if dp[amount] == INF else dp[amount]`,
    gen: (r) => [[...new Set(r.arr(r.int(1, 4), 1, 9))], r.int(0, 40)],
    big: [() => [[186, 419, 83, 408], 6249]],
  },
  {
    slug: "longest-increasing-subsequence",
    title: "Longest Rising Sales Streak (Subsequence)",
    difficulty: "Medium",
    patterns: ["dynamic programming", "binary search"],
    freq: 3,
    viz: null,
    story: `Return the length of the longest **strictly increasing subsequence** of \`sales\` (not necessarily contiguous).`,
    fn: "lisLength",
    params: [["sales", "int[]"]],
    returns: "int",
    examples: [
      { input: [[10, 9, 2, 5, 3, 7, 101, 18]], explain: "2, 3, 7, 101 → 4" },
      { input: [[7, 7, 7]], explain: "strict → 1" },
    ],
    constraints: ["1 ≤ n ≤ 10^5"],
    hints: ["O(n²): dp[i] = 1 + max(dp[j]) for j < i with a[j] < a[i].", "O(n log n): keep tails[k] = smallest tail of an increasing subsequence of length k+1."],
    approach: `**Patience sorting.** Maintain \`tails\`, where \`tails[k]\` is the smallest possible tail of an increasing subsequence of length \`k+1\`. \`tails\` is always sorted. For each value, binary-search the first tail ≥ value and replace it (or append if none). The answer is \`tails.length\`.`,
    time: "O(n log n)",
    space: "O(n)",
    ref: function lisLength(sales) {
      const tails = [];
      for (const x of sales) {
        let lo = 0;
        let hi = tails.length;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (tails[m] < x) lo = m + 1;
          else hi = m;
        }
        tails[lo] = x;
      }
      return tails.length;
    },
    brute: (a) => {
      const dp = a.map(() => 1);
      for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) if (a[j] < a[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
      return Math.max(...dp);
    },
    py: `from bisect import bisect_left

def lisLength(sales):
    tails = []
    for x in sales:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)`,
    gen: (r) => [r.arr(r.int(1, 14), 0, 9)],
    big: [(r) => [r.arr(100000, 0, 1000000)]],
  },
  {
    slug: "longest-common-subsequence",
    title: "Common Shopping Pattern",
    difficulty: "Medium",
    patterns: ["dynamic programming", "2D DP"],
    freq: 3,
    viz: { id: "dp-table", input: { a: "abcde", b: "ace" } },
    story: `Two customers' click histories are strings. Return the length of their **longest common subsequence**.`,
    fn: "lcs",
    params: [["a", "string"], ["b", "string"]],
    returns: "int",
    examples: [
      { input: ["abcde", "ace"], explain: "'ace' → 3" },
      { input: ["abc", "def"], explain: "0" },
    ],
    constraints: ["1 ≤ |a|, |b| ≤ 1000"],
    hints: ["dp[i][j] = LCS of a[:i] and b[:j].", "Match → dp[i-1][j-1] + 1, else max(dp[i-1][j], dp[i][j-1])."],
    approach: `Classic 2D DP. If \`a[i-1] === b[j-1]\` the characters extend the diagonal: \`dp[i][j] = dp[i-1][j-1] + 1\`. Otherwise drop one character: \`max(dp[i-1][j], dp[i][j-1])\`.

Space can be reduced to two rows.`,
    time: "O(|a|·|b|)",
    space: "O(|b|)",
    ref: function lcs(a, b) {
      let prev = new Array(b.length + 1).fill(0);
      for (let i = 1; i <= a.length; i++) {
        const cur = new Array(b.length + 1).fill(0);
        for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
        prev = cur;
      }
      return prev[b.length];
    },
    py: `def lcs(a, b):
    prev = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            cur[j] = prev[j - 1] + 1 if a[i - 1] == b[j - 1] else max(prev[j], cur[j - 1])
        prev = cur
    return prev[-1]`,
    gen: (r) => [r.str(r.int(1, 10), "abc"), r.str(r.int(1, 10), "abc")],
    big: [(r) => [r.str(1000, "abcd"), r.str(1000, "abcd")]],
  },
  {
    slug: "word-break",
    title: "Split a Search Query Into Keywords",
    difficulty: "Medium",
    patterns: ["dynamic programming", "strings"],
    freq: 3,
    viz: null,
    story: `Return \`true\` if the query \`s\` (no spaces) can be split into a sequence of words from \`wordList\` (words reusable).`,
    fn: "canSplit",
    params: [["s", "string"], ["wordList", "string[]"]],
    returns: "bool",
    examples: [
      { input: ["smartspeaker", ["smart", "speaker", "speak"]], explain: "" },
      { input: ["catsandog", ["cats", "dog", "sand", "and", "cat"]], explain: "" },
    ],
    constraints: ["1 ≤ |s| ≤ 300", "1 ≤ |wordList| ≤ 1000"],
    hints: ["ok[i] = the prefix s[:i] can be split.", "ok[i] = any(ok[j] and s[j:i] in wordList)."],
    approach: `\`ok[0] = true\`. For each end \`i\`, try every split point \`j\` (only the last \`maxWordLen\` positions matter): if \`ok[j]\` and \`s.slice(j, i)\` is a word, then \`ok[i] = true\`. A Set makes word lookup O(1) per substring.`,
    time: "O(n · L)",
    space: "O(n)",
    ref: function canSplit(s, wordList) {
      const words = new Set(wordList);
      const maxLen = Math.max(...wordList.map((w) => w.length));
      const ok = new Array(s.length + 1).fill(false);
      ok[0] = true;
      for (let i = 1; i <= s.length; i++)
        for (let j = Math.max(0, i - maxLen); j < i && !ok[i]; j++) if (ok[j] && words.has(s.slice(j, i))) ok[i] = true;
      return ok[s.length];
    },
    brute: (s, dict) => {
      const go = (i) => i === s.length || dict.some((w) => s.startsWith(w, i) && go(i + w.length));
      return go(0);
    },
    smallGen: (r) => [r.str(r.int(1, 9), "ab"), Array.from({ length: r.int(1, 4) }, () => r.str(r.int(1, 3), "ab"))],
    py: `def canSplit(s, wordList):
    words = set(wordList)
    max_len = max(len(w) for w in wordList)
    ok = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        for j in range(max(0, i - max_len), i):
            if ok[j] and s[j:i] in words:
                ok[i] = True
                break
    return ok[-1]`,
    gen: (r) => [r.str(r.int(1, 12), "ab"), Array.from({ length: r.int(1, 4) }, () => r.str(r.int(1, 3), "ab"))],
    big: [() => ["a".repeat(299) + "b", ["a", "aa", "aaa", "aaaa", "aaaaa", "aaaaaa"]]],
  },
  {
    slug: "merge-intervals",
    title: "Merge Maintenance Windows",
    difficulty: "Medium",
    patterns: ["intervals", "sorting"],
    freq: 5,
    viz: { id: "intervals", input: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] } },
    story: `Merge all overlapping maintenance windows \`[start, end]\` (inclusive; touching windows like \`[1,4]\` and \`[4,5]\` merge). Return them sorted by start.`,
    fn: "mergeWindows",
    params: [["windows", "int[][]"]],
    returns: "int[][]",
    examples: [
      { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], explain: "[[1,6],[8,10],[15,18]]" },
      { input: [[[1, 4], [4, 5]]], explain: "[[1,5]]" },
    ],
    constraints: ["1 ≤ n ≤ 10^4", "0 ≤ start ≤ end ≤ 10^4"],
    hints: ["Sort by start.", "Compare each window to the LAST merged one only."],
    approach: `Sort by start. Walk through: if the current start ≤ the last merged end, extend the last end with \`max\`; otherwise start a new merged window. Sorting dominates the cost.`,
    time: "O(n log n)",
    space: "O(n)",
    ref: function mergeWindows(windows) {
      const a = windows.map((w) => [...w]).sort((x, y) => x[0] - y[0]);
      const out = [];
      for (const [s, e] of a) {
        if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e);
        else out.push([s, e]);
      }
      return out;
    },
    py: `def mergeWindows(windows):
    out = []
    for s, e in sorted(windows):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out`,
    gen: (r) => [
      Array.from({ length: r.int(1, 7) }, () => {
        const s = r.int(0, 20);
        return [s, s + r.int(0, 6)];
      }),
    ],
  },
  {
    slug: "min-jumps",
    title: "Fewest Hops Across Relay Towers",
    difficulty: "Medium",
    patterns: ["greedy", "BFS levels"],
    freq: 3,
    viz: null,
    story: `\`range[i]\` is how many towers ahead tower \`i\` can relay to. Starting at tower 0, return the **minimum hops** to reach the last tower. It's guaranteed reachable.`,
    fn: "minHops",
    params: [["reach", "int[]"]],
    returns: "int",
    examples: [
      { input: [[2, 3, 1, 1, 4]], explain: "0 → 1 → 4: 2 hops" },
      { input: [[2, 3, 0, 1, 4]], explain: "" },
    ],
    constraints: ["1 ≤ n ≤ 10^4", "0 ≤ range[i] ≤ 1000", "last tower reachable"],
    hints: ["Think of BFS levels over indices: each level is one hop.", "Track the farthest index reachable within the current hop."],
    approach: `Greedy BFS-by-levels: \`end\` is the edge of the current hop's reach; \`far\` is the farthest reachable from anything inside it. When \`i\` hits \`end\`, you must take another hop: \`hops++\`, \`end = far\`.`,
    time: "O(n)",
    space: "O(1)",
    ref: function minHops(reach) {
      let hops = 0;
      let end = 0;
      let far = 0;
      for (let i = 0; i < reach.length - 1; i++) {
        far = Math.max(far, i + reach[i]);
        if (i === end) {
          hops++;
          end = far;
        }
      }
      return hops;
    },
    brute: (a) => {
      const d = a.map(() => Infinity);
      d[0] = 0;
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j <= Math.min(a.length - 1, i + a[i]); j++) d[j] = Math.min(d[j], d[i] + 1);
      return d[a.length - 1];
    },
    py: `def minHops(reach):
    hops = end = far = 0
    for i in range(len(reach) - 1):
        far = max(far, i + reach[i])
        if i == end:
            hops += 1
            end = far
    return hops`,
    gen: (r) => [Array.from({ length: r.int(1, 12) }, () => r.int(1, 4))],
    big: [(r) => [Array.from({ length: 10000 }, () => r.int(1, 30))]],
  },
];
