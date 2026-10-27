const buggy = `import time


def ttl_cache(seconds, clock=time.monotonic):
    """Cache results per (args, kwargs) for \`seconds\`. Exposes .cache_clear() and keeps
    the wrapped function's __name__ and __doc__."""

    def decorator(fn):
        store = {}

        def wrapper(*args, **kwargs):
            key = args
            hit = store.get(key)
            if hit and hit[0] and clock() - hit[1] < seconds:
                return hit[0]
            value = fn(*args, **kwargs)
            store[key] = (value, clock())
            return value

        wrapper.cache_clear = store.clear
        return wrapper

    return decorator
`;

const fixed = `import functools
import time


def ttl_cache(seconds, clock=time.monotonic):
    """Cache results per (args, kwargs) for \`seconds\`. Exposes .cache_clear() and keeps
    the wrapped function's __name__ and __doc__."""

    def decorator(fn):
        store = {}

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            hit = store.get(key)
            if hit is not None and clock() - hit[1] < seconds:
                return hit[0]
            value = fn(*args, **kwargs)
            store[key] = (value, clock())
            return value

        wrapper.cache_clear = store.clear
        return wrapper

    return decorator
`;

const tests = `import unittest

from util.memo import ttl_cache


class Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


class MemoTests(unittest.TestCase):
    def setUp(self):
        self.clock = Clock()
        self.calls = 0
        clock = self.clock

        @ttl_cache(10, clock=clock)
        def price(sku, currency="USD"):
            """Look up a price."""
            self.calls += 1
            return {"USD": 10, "EUR": 9}[currency] if sku else None

        self.price = price

    def test_caches_within_ttl(self):
        self.price("a"); self.price("a")
        self.assertEqual(self.calls, 1)

    def test_kwargs_are_part_of_the_key(self):
        self.assertEqual(self.price("a", currency="USD"), 10)
        self.assertEqual(self.price("a", currency="EUR"), 9)

    def test_expires_after_ttl(self):
        self.price("a")
        self.clock.t = 11
        self.price("a")
        self.assertEqual(self.calls, 2)

    def test_falsy_results_are_cached_too(self):
        self.price(""); self.price("")
        self.assertEqual(self.calls, 1)

    def test_metadata_preserved(self):
        self.assertEqual(self.price.__name__, "price")
        self.assertEqual(self.price.__doc__, "Look up a price.")

    def test_cache_clear(self):
        self.price("a"); self.price.cache_clear(); self.price("a")
        self.assertEqual(self.calls, 2)
`;

export default {
  slug: "py-ttl-cache",
  order: 24,
  lang: "py",
  title: "Python: TTL Cache Decorator",
  difficulty: "Easy",
  minutes: 15,
  tagline: "EUR prices come back in USD and None is never cached.",
  ticket: `**PRC-5 · Pricing cache returns wrong currency**

\`@ttl_cache\` wraps the pricing lookup. Customers in Europe see **USD prices** after a US customer views the same SKU. Lookups that return \`None\` hit the database every time, and our tracing shows every cached function named \`wrapper\`.`,
  env: {},
  files: { "util/memo.py": buggy },
  tests: { "tests/test_memo.py": tests },
  fixes: { "util/memo.py": fixed },
  bugs: [
    { file: "util/memo.py", title: "cache key ignores kwargs", explain: "`key = args` makes `price('a', currency='EUR')` collide with `price('a')`. Include `tuple(sorted(kwargs.items()))`." },
    { file: "util/memo.py", title: "truthiness check on the cached value", explain: "`hit[0] and …` treats cached `None`, `0`, `''` or `[]` as a miss, so those lookups hit the DB every time. Check presence with `hit is not None`, never the value's truthiness." },
    { file: "util/memo.py", title: "missing functools.wraps", explain: "Decorators replace the function object. `@functools.wraps(fn)` copies `__name__`, `__doc__` and more." },
  ],
  hints: ["Print the cache key for price('a', currency='EUR').", "What does a decorator return, and what's its __name__?"],
  concepts: ["decorators", "functools.wraps", "cache keys", "TTL"],
};
