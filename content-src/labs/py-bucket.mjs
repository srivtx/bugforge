const buggy = `class TokenBucket:
    """capacity tokens max; refills \`rate\` tokens per second; allow() spends 1 token."""

    def __init__(self, capacity, rate, clock):
        self.capacity = capacity
        self.rate = rate
        self.clock = clock  # callable returning seconds (float)
        self.tokens = capacity
        self.last = clock()

    def _refill(self):
        now = self.clock()
        elapsed = now - self.last
        self.tokens = self.tokens + elapsed // 1 * self.rate
        self.last = now

    def allow(self):
        self._refill()
        self.tokens -= 1
        if self.tokens >= 0:
            return True
        return False


class RateLimiter:
    """One bucket per client id."""

    def __init__(self, client_ids, capacity, rate, clock):
        self.capacity = capacity
        self.rate = rate
        self.clock = clock
        self.buckets = dict.fromkeys(client_ids, TokenBucket(capacity, rate, clock))

    def allow(self, client_id):
        if client_id not in self.buckets:
            self.buckets[client_id] = TokenBucket(self.capacity, self.rate, self.clock)
        return self.buckets[client_id].allow()
`;

const fixed = `class TokenBucket:
    """capacity tokens max; refills \`rate\` tokens per second; allow() spends 1 token."""

    def __init__(self, capacity, rate, clock):
        self.capacity = capacity
        self.rate = rate
        self.clock = clock  # callable returning seconds (float)
        self.tokens = capacity
        self.last = clock()

    def _refill(self):
        now = self.clock()
        elapsed = now - self.last
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last = now

    def allow(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


class RateLimiter:
    """One bucket per client id."""

    def __init__(self, client_ids, capacity, rate, clock):
        self.capacity = capacity
        self.rate = rate
        self.clock = clock
        self.buckets = {cid: TokenBucket(capacity, rate, clock) for cid in client_ids}

    def allow(self, client_id):
        if client_id not in self.buckets:
            self.buckets[client_id] = TokenBucket(self.capacity, self.rate, self.clock)
        return self.buckets[client_id].allow()
`;

const tests = `import unittest

from limiter.bucket import TokenBucket, RateLimiter


class FakeClock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t

    def advance(self, s):
        self.t += s


class BucketTests(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()

    def test_burst_up_to_capacity(self):
        b = TokenBucket(3, 1, self.clock)
        self.assertEqual([b.allow() for _ in range(4)], [True, True, True, False])

    def test_rejected_calls_do_not_go_into_debt(self):
        b = TokenBucket(1, 1, self.clock)
        b.allow()
        for _ in range(5):
            b.allow()
        self.clock.advance(1)
        self.assertTrue(b.allow())

    def test_fractional_refill(self):
        """rate 2/s: after 0.5s exactly one token is back"""
        b = TokenBucket(2, 2, self.clock)
        b.allow(); b.allow()
        self.clock.advance(0.5)
        self.assertTrue(b.allow())
        self.assertFalse(b.allow())

    def test_refill_is_capped_at_capacity(self):
        b = TokenBucket(2, 1, self.clock)
        self.clock.advance(100)
        self.assertEqual([b.allow() for _ in range(3)], [True, True, False])


class LimiterTests(unittest.TestCase):
    def test_clients_have_independent_buckets(self):
        clock = FakeClock()
        rl = RateLimiter(["a", "b"], 1, 1, clock)
        self.assertTrue(rl.allow("a"))
        self.assertTrue(rl.allow("b"))
        self.assertFalse(rl.allow("a"))

    def test_unknown_clients_get_a_bucket(self):
        rl = RateLimiter([], 2, 1, FakeClock())
        self.assertEqual([rl.allow("z") for _ in range(3)], [True, True, False])
`;

export default {
  slug: "py-token-bucket",
  order: 21,
  lang: "py",
  title: "Python: Token Bucket Rate Limiter",
  difficulty: "Medium",
  minutes: 25,
  tagline: "One noisy client throttles everyone, and limits never recover.",
  ticket: `**API-77 · Throttling misbehaves**

- Client **A** hammering the API also gets **client B** throttled.
- After a client is throttled, it stays blocked far longer than the configured rate allows.
- With \`rate=2\` tokens/s, waiting 0.5s should give exactly one more request.
- After a long idle period, clients get a burst **bigger than capacity**.`,
  env: {},
  files: { "limiter/bucket.py": buggy },
  tests: { "tests/test_bucket.py": tests },
  fixes: { "limiter/bucket.py": fixed },
  bugs: [
    { file: "limiter/bucket.py", title: "dict.fromkeys shares one object", explain: "`dict.fromkeys(keys, value)` puts the **same** TokenBucket under every key. Use a dict comprehension to create one per client." },
    { file: "limiter/bucket.py", title: "spending before checking (token debt)", explain: "Decrementing first lets rejected calls push tokens negative, so the client must 'repay' before it recovers. Check `tokens >= 1`, then spend." },
    { file: "limiter/bucket.py", title: "floor division drops fractional refill", explain: "`elapsed // 1` truncates 0.5s to 0. Use `elapsed * rate`." },
    { file: "limiter/bucket.py", title: "no capacity cap", explain: "Clamp with `min(capacity, …)` so idle time can't build an unbounded burst." },
  ],
  hints: ["What does `dict.fromkeys(['a','b'], X())` do with X()?", "What is `0.5 // 1`?", "Should a *rejected* call cost a token?"],
  concepts: ["token bucket", "shared references", "floor vs true division", "clamping", "injectable clocks"],
};
