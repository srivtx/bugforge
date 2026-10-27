const buggy = `import re
from collections import Counter

# 2026-01-15T10:00:01Z GET /api/orders 200 123ms
LINE = re.compile(r"^(\\S+) (\\S+) (\\S+) (\\d{3}) (\\d+)ms$")


def parse(lines):
    for raw in lines:
        m = LINE.match(raw)
        if not m:
            continue
        ts, method, path, status, ms = m.groups()
        yield {"method": method, "path": path, "status": status, "ms": int(ms)}


def report(lines, top=2):
    """Summary of an access log.

    - top_paths: the \`top\` most requested paths as (path, count), ties broken alphabetically
    - error_rate: % of requests with status >= 500, rounded to 1 decimal
    - p_slowest: the slowest request time in ms
    - total: number of valid lines
    """
    entries = parse(lines)
    counts = Counter(e["path"] for e in entries)
    total = sum(counts.values())
    errors = sum(1 for e in entries if e["status"] >= "500")
    slowest = max(e["ms"] for e in entries)
    return {
        "top_paths": counts.most_common(top),
        "error_rate": round(errors / total * 100) if total else 0.0,
        "p_slowest": slowest,
        "total": total,
    }
`;

const fixed = `import re
from collections import Counter

# 2026-01-15T10:00:01Z GET /api/orders 200 123ms
LINE = re.compile(r"^(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+(\\d{3})\\s+(\\d+)ms\\s*$")


def parse(lines):
    for raw in lines:
        m = LINE.match(raw.strip())
        if not m:
            continue
        ts, method, path, status, ms = m.groups()
        yield {"method": method, "path": path, "status": int(status), "ms": int(ms)}


def report(lines, top=2):
    """Summary of an access log.

    - top_paths: the \`top\` most requested paths as (path, count), ties broken alphabetically
    - error_rate: % of requests with status >= 500, rounded to 1 decimal
    - p_slowest: the slowest request time in ms
    - total: number of valid lines
    """
    entries = list(parse(lines))
    counts = Counter(e["path"] for e in entries)
    total = len(entries)
    errors = sum(1 for e in entries if e["status"] >= 500)
    slowest = max((e["ms"] for e in entries), default=0)
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return {
        "top_paths": ranked[:top],
        "error_rate": round(errors / total * 100, 1) if total else 0.0,
        "p_slowest": slowest,
        "total": total,
    }
`;

const tests = `import unittest

from logs.analyzer import report

LOG = """
2026-01-15T10:00:01Z GET /api/orders 200 120ms
2026-01-15T10:00:02Z GET /api/cart 200 80ms
2026-01-15T10:00:03Z POST /api/orders 503 900ms
2026-01-15T10:00:04Z GET  /api/cart   200  95ms
garbage line
2026-01-15T10:00:05Z GET /api/users 404 30ms
2026-01-15T10:00:06Z GET /api/users 200 1500ms
""".strip().splitlines()


class AnalyzerTests(unittest.TestCase):
    def test_total_counts_valid_lines_including_extra_spaces(self):
        self.assertEqual(report(LOG)["total"], 6)

    def test_error_rate_one_decimal(self):
        self.assertEqual(report(LOG)["error_rate"], 16.7)

    def test_slowest(self):
        self.assertEqual(report(LOG)["p_slowest"], 1500)

    def test_top_paths_ties_alphabetical(self):
        self.assertEqual(report(LOG, top=2)["top_paths"], [("/api/cart", 2), ("/api/orders", 2)])

    def test_404_is_not_a_server_error(self):
        r = report(["t GET /x 404 1ms", "t GET /x 1000 1ms", "t GET /x 500 1ms"])
        self.assertEqual(r["error_rate"], 50.0)

    def test_empty_log(self):
        self.assertEqual(report([]), {"top_paths": [], "error_rate": 0.0, "p_slowest": 0, "total": 0})
`;

export default {
  slug: "py-log-analyzer",
  order: 22,
  lang: "py",
  title: "Python: Access-Log Analyzer",
  difficulty: "Medium",
  minutes: 25,
  tagline: "The on-call dashboard crashes on empty logs and miscounts errors.",
  ticket: `**OPS-33 · On-call summary is wrong**

The nightly access-log summary used by on-call:
- crashes with \`ValueError: max() arg is an empty sequence\`, even on non-empty logs;
- reports **0% errors** when there clearly were 5xx responses;
- ignores lines with doubled spaces;
- shows \`17\` instead of \`16.7\` for the error rate, and ties in top paths come out in random order.

The intended behaviour is in the \`report\` docstring.`,
  env: {},
  files: { "logs/analyzer.py": buggy },
  tests: { "tests/test_analyzer.py": tests },
  fixes: { "logs/analyzer.py": fixed },
  bugs: [
    { file: "logs/analyzer.py", title: "generator consumed more than once", explain: "`parse()` returns a generator. The first `Counter(...)` exhausts it, so later passes see **nothing** (`max()` of empty → ValueError). Materialise with `list(...)`." },
    { file: "logs/analyzer.py", title: "comparing status codes as strings", explain: "`'1000' >= '500'` is False and `'60' >= '500'` is True: string comparison is lexicographic. Convert to `int`." },
    { file: "logs/analyzer.py", title: "regex too strict about whitespace", explain: "Single literal spaces fail on `GET  /api/cart`. Use `\\\\s+`." },
    { file: "logs/analyzer.py", title: "rounding & tie-breaking", explain: "`round(x)` → int. Use `round(x, 1)`. `most_common` keeps insertion order on ties, so sort by `(-count, path)` explicitly. Use `max(..., default=0)` for empty input." },
  ],
  hints: ["How many times can you iterate a generator?", "Compare '1000' >= '500' in a Python shell.", "What does round(16.666) return?"],
  concepts: ["generators", "string vs int comparison", "regex whitespace", "deterministic tie-breaks"],
};
