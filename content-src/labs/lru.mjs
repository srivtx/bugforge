const buggy = `/**
 * Least-recently-used cache with O(1) get/put.
 * - get(key) returns the value or -1, and marks the key as most recently used
 * - put(key, value) inserts/updates and marks it most recent; when size exceeds
 *   capacity, evicts the LEAST recently used entry
 * - stats() returns { hits, misses, evictions }
 */
export class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  get(key) {
    if (!this.map[key]) {
      this.misses++;
      return -1;
    }
    this.hits++;
    return this.map.get(key);
  }

  put(key, value) {
    this.map.set(key, value);
    if (this.map.size >= this.capacity) {
      const newest = [...this.map.keys()].pop();
      this.map.delete(newest);
      this.evictions++;
    }
  }

  stats() {
    return { hits: this.hits, misses: this.misses, evictions: this.evictions };
  }
}
`;

const fixed = `/**
 * Least-recently-used cache with O(1) get/put.
 * - get(key) returns the value or -1, and marks the key as most recently used
 * - put(key, value) inserts/updates and marks it most recent; when size exceeds
 *   capacity, evicts the LEAST recently used entry
 * - stats() returns { hits, misses, evictions }
 */
export class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  get(key) {
    if (!this.map.has(key)) {
      this.misses++;
      return -1;
    }
    this.hits++;
    const value = this.map.get(key);
    // Map keeps insertion order: delete + set moves the key to the end (most recent)
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
      this.evictions++;
    }
  }

  stats() {
    return { hits: this.hits, misses: this.misses, evictions: this.evictions };
  }
}
`;

const tests = `import { LRUCache } from '../lib/lru.js';

test('stores up to capacity items', () => {
  const c = new LRUCache(2);
  c.put('a', 1);
  c.put('b', 2);
  expect(c.get('a')).toBe(1);
  expect(c.get('b')).toBe(2);
});

test('evicts the least recently used', () => {
  const c = new LRUCache(2);
  c.put('a', 1);
  c.put('b', 2);
  c.put('c', 3);
  expect(c.get('a')).toBe(-1);
  expect(c.get('c')).toBe(3);
});

test('get refreshes recency', () => {
  const c = new LRUCache(2);
  c.put('a', 1);
  c.put('b', 2);
  c.get('a');
  c.put('c', 3);
  expect(c.get('b')).toBe(-1);
  expect(c.get('a')).toBe(1);
});

test('updating an existing key refreshes it and does not evict', () => {
  const c = new LRUCache(2);
  c.put('a', 1);
  c.put('b', 2);
  c.put('a', 10);
  c.put('c', 3);
  expect(c.get('a')).toBe(10);
  expect(c.get('b')).toBe(-1);
});

test('falsy values (0, "") are real hits', () => {
  const c = new LRUCache(2);
  c.put('zero', 0);
  expect(c.get('zero')).toBe(0);
  expect(c.stats()).toEqual({ hits: 1, misses: 0, evictions: 0 });
});

test('stats count hits, misses and evictions', () => {
  const c = new LRUCache(1);
  c.put('a', 1);
  c.get('a');
  c.get('x');
  c.put('b', 2);
  expect(c.stats()).toEqual({ hits: 1, misses: 1, evictions: 1 });
});
`;

export default {
  slug: "lru-cache-bugs",
  order: 16,
  title: "LRU Cache Gone Wrong",
  difficulty: "Medium",
  minutes: 20,
  tagline: "It evicts the newest item and never actually remembers anything.",
  ticket: `**PERF-17 · Hot-item cache hit rate is 0%**

The catalogue team's in-process LRU cache reports **0 hits** in production and seems to throw away whatever was just inserted. The contract is in the class doc comment.`,
  env: {},
  files: { "lib/lru.js": buggy },
  tests: { "tests/lru.test.js": tests },
  fixes: { "lib/lru.js": fixed },
  bugs: [
    { file: "lib/lru.js", title: "`this.map[key]` on a Map", explain: "Map entries aren't properties. `map[key]` is always undefined. Use `map.has(key)`. Also, a truthiness check would treat 0 as a miss." },
    { file: "lib/lru.js", title: "get() doesn't refresh recency", explain: "A Map iterates in insertion order. Delete and re-set the key to move it to the 'most recent' end." },
    { file: "lib/lru.js", title: "evicts newest, and too early", explain: "Evict when `size > capacity` (not `>=`), and evict the **first** key: `map.keys().next().value`." },
    { file: "lib/lru.js", title: "put() on an existing key", explain: "Delete first so the update moves the key to the most-recent position." },
  ],
  hints: ["Is `new Map()` indexable with brackets?", "In which order does a Map iterate its keys?", "With capacity 2, after the 2nd put should anything be evicted?"],
  concepts: ["Map insertion order", "LRU eviction", "falsy values", "boundary conditions"],
};
