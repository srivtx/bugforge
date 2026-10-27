const stub = `/**
 * Leaderboard for a game service.
 *
 * submit(player, score, at)  keep each player's BEST score; \`at\` (ms timestamp) is when that best
 *                            score was first reached. A lower score never replaces a higher one.
 * top(n)       -> [{ rank, player, score }] best first.
 *                 Ties: same score => same rank ("1224" competition ranking),
 *                 ordered by who reached the score first (earlier \`at\` first).
 * rankOf(player) -> rank number, or null if unknown
 * around(player, k) -> up to k entries above and k below the player (same shape as top), or []
 */
export class Leaderboard {
  // TODO
}
`;

const solution = `/**
 * Leaderboard for a game service.
 *
 * submit(player, score, at)  keep each player's BEST score; \`at\` (ms timestamp) is when that best
 *                            score was first reached. A lower score never replaces a higher one.
 * top(n)       -> [{ rank, player, score }] best first.
 *                 Ties: same score => same rank ("1224" competition ranking),
 *                 ordered by who reached the score first (earlier \`at\` first).
 * rankOf(player) -> rank number, or null if unknown
 * around(player, k) -> up to k entries above and k below the player (same shape as top), or []
 */
export class Leaderboard {
  constructor() {
    this.best = new Map(); // player -> { score, at }
  }

  submit(player, score, at) {
    const cur = this.best.get(player);
    if (!cur || score > cur.score) this.best.set(player, { score, at });
  }

  ranked() {
    const rows = [...this.best.entries()]
      .map(([player, v]) => ({ player, score: v.score, at: v.at }))
      .sort((a, b) => b.score - a.score || a.at - b.at || (a.player < b.player ? -1 : 1));
    let rank = 0;
    return rows.map((r, i) => {
      if (i === 0 || r.score !== rows[i - 1].score) rank = i + 1;
      return { rank, player: r.player, score: r.score };
    });
  }

  top(n) {
    return this.ranked().slice(0, n);
  }

  rankOf(player) {
    const row = this.ranked().find((r) => r.player === player);
    return row ? row.rank : null;
  }

  around(player, k) {
    const rows = this.ranked();
    const i = rows.findIndex((r) => r.player === player);
    if (i < 0) return [];
    return rows.slice(Math.max(0, i - k), i + k + 1);
  }
}
`;

const tests = `import { Leaderboard } from '../lib/leaderboard.js';

function board() {
  const b = new Leaderboard();
  b.submit('ana', 50, 1);
  b.submit('bo', 80, 2);
  b.submit('cy', 80, 3);
  b.submit('di', 70, 4);
  b.submit('ed', 10, 5);
  return b;
}

test('top orders by score desc', () => {
  expect(board().top(2).map((r) => r.player)).toEqual(['bo', 'cy']);
});

test('ties share a rank and the next rank skips (1224)', () => {
  expect(board().top(4)).toEqual([
    { rank: 1, player: 'bo', score: 80 },
    { rank: 1, player: 'cy', score: 80 },
    { rank: 3, player: 'di', score: 70 },
    { rank: 4, player: 'ana', score: 50 },
  ]);
});

test('earlier achiever comes first among ties', () => {
  const b = new Leaderboard();
  b.submit('late', 100, 50);
  b.submit('early', 100, 10);
  expect(b.top(2).map((r) => r.player)).toEqual(['early', 'late']);
});

test('keeps only the best score; lower submissions are ignored', () => {
  const b = board();
  b.submit('bo', 5, 99);
  b.submit('ed', 90, 100);
  expect(b.top(1)[0]).toEqual({ rank: 1, player: 'ed', score: 90 });
  expect(b.rankOf('bo')).toBe(2);
});

test('rankOf unknown is null', () => {
  expect(board().rankOf('zed')).toBeNull();
});

test('around returns neighbours clipped at the edges', () => {
  const b = board();
  expect(b.around('di', 1).map((r) => r.player)).toEqual(['cy', 'di', 'ana']);
  expect(b.around('bo', 2).map((r) => r.player)).toEqual(['bo', 'cy', 'di']);
  expect(b.around('nobody', 2)).toEqual([]);
});
`;

export default {
  slug: "build-leaderboard",
  order: 105,
  kind: "build",
  title: "Build: Game Leaderboard",
  difficulty: "Medium",
  minutes: 30,
  tagline: "Best-score tracking, competition ranking with ties, and 'players around me'.",
  ticket: `## Spec

Implement \`Leaderboard\` in \`lib/leaderboard.js\`. Ranking rules are in the doc comment.

This exercises the details interviewers love: **multi-key comparators**, **tie handling** (\`1, 1, 3, 4\`), and **boundary-safe slicing**.`,
  env: {},
  files: { "lib/leaderboard.js": stub },
  tests: { "tests/leaderboard.test.js": tests },
  fixes: { "lib/leaderboard.js": solution },
  bugs: [
    { file: "lib/leaderboard.js", title: "Best score per player", explain: "`Map<player, { score, at }>`. Only overwrite when the new score is strictly higher (keeps the earliest `at`)." },
    { file: "lib/leaderboard.js", title: "Comparator", explain: "`b.score - a.score || a.at - b.at`. The `||` chains tie-breakers because 0 is falsy." },
    { file: "lib/leaderboard.js", title: "Competition rank", explain: "Walk the sorted rows; when the score changes, `rank = index + 1`; otherwise keep the previous rank." },
    { file: "lib/leaderboard.js", title: "around()", explain: "`rows.slice(Math.max(0, i - k), i + k + 1)`. Clamp the start, and slice already clamps the end." },
  ],
  hints: ["How do you chain tie-breakers in a JS comparator?", "Dense rank (1,1,2) vs competition rank (1,1,3): which one is specified?"],
  concepts: ["comparators", "ranking", "slicing", "data modelling"],
};
