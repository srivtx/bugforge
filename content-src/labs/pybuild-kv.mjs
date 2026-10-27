const stub = `class KVStore:
    """In-memory key-value store with nested transactions.

    set(key, value), get(key) -> value or None, delete(key)
    count(value) -> how many keys currently hold \`value\`
    begin()      start a (possibly nested) transaction
    rollback()   undo everything since the most recent begin(); raise RuntimeError("NO TRANSACTION") if none
    commit()     make ALL open transactions permanent; raise RuntimeError("NO TRANSACTION") if none
    """

    def __init__(self):
        pass  # TODO

    def set(self, key, value):
        raise NotImplementedError

    def get(self, key):
        raise NotImplementedError

    def delete(self, key):
        raise NotImplementedError

    def count(self, value):
        raise NotImplementedError

    def begin(self):
        raise NotImplementedError

    def rollback(self):
        raise NotImplementedError

    def commit(self):
        raise NotImplementedError
`;

const solution = `class KVStore:
    """In-memory key-value store with nested transactions.

    set(key, value), get(key) -> value or None, delete(key)
    count(value) -> how many keys currently hold \`value\`
    begin()      start a (possibly nested) transaction
    rollback()   undo everything since the most recent begin(); raise RuntimeError("NO TRANSACTION") if none
    commit()     make ALL open transactions permanent; raise RuntimeError("NO TRANSACTION") if none
    """

    _MISSING = object()

    def __init__(self):
        self.data = {}
        self.counts = {}
        self.undo_stack = []  # one dict per open transaction: key -> previous value (or _MISSING)

    def _write(self, key, value):
        old = self.data.get(key, self._MISSING)
        if self.undo_stack and key not in self.undo_stack[-1]:
            self.undo_stack[-1][key] = old
        if old is not self._MISSING:
            self.counts[old] -= 1
        if value is self._MISSING:
            self.data.pop(key, None)
        else:
            self.data[key] = value
            self.counts[value] = self.counts.get(value, 0) + 1

    def set(self, key, value):
        self._write(key, value)

    def get(self, key):
        return self.data.get(key)

    def delete(self, key):
        if key in self.data:
            self._write(key, self._MISSING)

    def count(self, value):
        return self.counts.get(value, 0)

    def begin(self):
        self.undo_stack.append({})

    def rollback(self):
        if not self.undo_stack:
            raise RuntimeError("NO TRANSACTION")
        undo = self.undo_stack.pop()
        for key, old in undo.items():
            # write without recording into the (now) outer transaction twice
            cur = self.data.get(key, self._MISSING)
            if cur is not self._MISSING:
                self.counts[cur] -= 1
            if old is self._MISSING:
                self.data.pop(key, None)
            else:
                self.data[key] = old
                self.counts[old] = self.counts.get(old, 0) + 1

    def commit(self):
        if not self.undo_stack:
            raise RuntimeError("NO TRANSACTION")
        self.undo_stack.clear()
`;

const tests = `import unittest

from store.kv import KVStore


class BasicTests(unittest.TestCase):
    def test_set_get_delete(self):
        s = KVStore()
        s.set("a", 10)
        self.assertEqual(s.get("a"), 10)
        s.delete("a")
        self.assertIsNone(s.get("a"))

    def test_count_tracks_values(self):
        s = KVStore()
        s.set("a", 10); s.set("b", 10); s.set("b", 20)
        self.assertEqual((s.count(10), s.count(20), s.count(99)), (1, 1, 0))


class TransactionTests(unittest.TestCase):
    def test_rollback_restores_previous_values(self):
        s = KVStore()
        s.set("a", 1)
        s.begin()
        s.set("a", 2); s.set("b", 3); s.delete("a")
        s.rollback()
        self.assertEqual((s.get("a"), s.get("b")), (1, None))
        self.assertEqual(s.count(1), 1)

    def test_nested_rollback_only_undoes_inner(self):
        s = KVStore()
        s.begin(); s.set("a", 1)
        s.begin(); s.set("a", 2)
        s.rollback()
        self.assertEqual(s.get("a"), 1)
        s.rollback()
        self.assertIsNone(s.get("a"))

    def test_commit_closes_all_transactions(self):
        s = KVStore()
        s.begin(); s.set("a", 1); s.begin(); s.set("a", 2)
        s.commit()
        self.assertEqual(s.get("a"), 2)
        with self.assertRaisesRegex(RuntimeError, "NO TRANSACTION"):
            s.rollback()

    def test_errors_without_transaction(self):
        s = KVStore()
        with self.assertRaises(RuntimeError):
            s.commit()

    def test_counts_after_rollback(self):
        s = KVStore()
        s.set("x", "v")
        s.begin(); s.set("y", "v"); s.set("x", "w")
        self.assertEqual(s.count("v"), 1)
        s.rollback()
        self.assertEqual((s.count("v"), s.count("w")), (1, 0))
`;

export default {
  slug: "pybuild-kv-transactions",
  order: 110,
  kind: "build",
  lang: "py",
  title: "Build (Python): Transactional Key-Value Store",
  difficulty: "Hard",
  minutes: 40,
  tagline: "set/get/delete/count with nested BEGIN, ROLLBACK and COMMIT.",
  ticket: `## Spec

Implement \`KVStore\` in \`store/kv.py\`. Contract in the docstring.

This is a well-known take-home and onsite problem. The elegant solution keeps an **undo log per open transaction**: before the first write to a key inside a transaction, remember its previous value. Rollback replays the top undo log. Keep \`count\` **O(1)** with a value → count map.`,
  env: {},
  files: { "store/kv.py": stub },
  tests: { "tests/test_kv.py": tests },
  fixes: { "store/kv.py": solution },
  bugs: [
    { file: "store/kv.py", title: "Core state", explain: "`data` dict, `counts` dict (value → number of keys), and `undo_stack` (list of dicts)." },
    { file: "store/kv.py", title: "Single write path", explain: "Route set and delete through one `_write` that records the old value (once per key per transaction) and keeps `counts` in sync." },
    { file: "store/kv.py", title: "rollback / commit", explain: "Rollback pops the top undo dict and restores each key; commit just clears the stack. Both raise when the stack is empty." },
  ],
  hints: ["Use a sentinel object to remember 'key did not exist'.", "Only record the FIRST old value for a key per transaction."],
  concepts: ["undo logs", "nested transactions", "sentinels", "O(1) counters"],
};
