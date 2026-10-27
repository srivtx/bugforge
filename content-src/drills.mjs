// Spot-the-bug drills. Mark the buggy line with  @bug  in a trailing comment; the build strips it.
// Fields: id, lang, topic, difficulty, prompt, code, fixed, explain, options, answer
const d = (id, lang, topic, difficulty, prompt, code, fixed, explain, options, answer = 0) => ({ id, lang, topic, difficulty, prompt, code, fixed, explain, options, answer });

export default [
  // ---------------------------------------------------------------- JavaScript
  d("js-sum-reduce", "javascript", "arrays", "Easy", "Should return the total price of the cart.", `function cartTotal(items) {
  return items.reduce((sum, item) => {
    sum + item.price * item.qty; // @bug
  }, 0);
}`, "    return sum + item.price * item.qty;", "A block-bodied arrow function needs an explicit `return`. Without it the callback returns `undefined`, so the accumulator becomes `undefined` and the result is NaN-ish/undefined.", ["The reducer callback never returns the new sum", "reduce needs the initial value first", "item.qty must be parsed with parseInt", "`sum` should be declared with let"]),

  d("js-findindex", "javascript", "arrays", "Easy", "Remove a product by id if it exists.", `function removeById(list, id) {
  const i = list.findIndex((p) => p.id === id);
  if (i) { // @bug
    list.splice(i, 1);
  }
  return list;
}`, "  if (i !== -1) {", "`findIndex` returns -1 when nothing matches (truthy!) and 0 for the first element (falsy). Compare explicitly with `-1`.", ["Index 0 is falsy and -1 is truthy, so the check is wrong", "splice should be slice", "findIndex returns the element, not an index", "=== should be =="]),

  d("js-sort-numbers", "javascript", "sorting", "Easy", "Return the three highest scores.", `function top3(scores) {
  const sorted = [...scores].sort(); // @bug
  return sorted.reverse().slice(0, 3);
}`, "  const sorted = [...scores].sort((a, b) => a - b);", "Default `sort()` converts elements to strings: `[100, 9, 25]` sorts as `['100', '25', '9']`. Numbers need a numeric comparator.", ["Default sort is lexicographic (string) order", "Spreading the array loses elements", "reverse() mutates and returns undefined", "slice(0, 3) returns 4 items"]),

  d("js-await-foreach", "javascript", "async", "Medium", "Save all orders, then report how many were saved.", `async function saveAll(orders, db) {
  let saved = 0;
  orders.forEach(async (o) => { // @bug
    await db.save(o);
    saved++;
  });
  return saved;
}`, "  for (const o of orders) {", "`forEach` doesn't await async callbacks. The function returns 0 before any save finishes. Use `for...of` with `await`, or `Promise.all(orders.map(...))`.", ["forEach does not wait for async callbacks", "saved must be a const", "db.save needs a callback", "orders must be awaited first"]),

  d("js-missing-return-res", "javascript", "express", "Medium", "Reject requests without an email.", `app.post('/signup', async (req, res) => {
  if (!req.body.email) {
    res.status(400).json({ error: 'email required' }); // @bug
  }
  const user = await User.create(req.body);
  res.status(201).json(user);
});`, "    return res.status(400).json({ error: 'email required' });", "Without `return`, execution continues: it tries to create the user and send a second response, which throws \"Cannot set headers after they are sent\".", ["Missing return lets the handler continue and respond twice", "Status 400 should be 422", "req.body is undefined in Express", "User.create is synchronous"]),

  d("js-closure-var", "javascript", "closures", "Medium", "Each button should log its own index.", `function attach(buttons) {
  for (var i = 0; i < buttons.length; i++) { // @bug
    buttons[i].onclick = () => console.log(i);
  }
}`, "  for (let i = 0; i < buttons.length; i++) {", "`var` is function-scoped, so every closure shares one `i`, which equals `buttons.length` when clicked. `let` creates a fresh binding per iteration.", ["`var` shares one binding across all closures", "onclick must be addEventListener", "Arrow functions can't capture variables", "buttons.length is evaluated once"]),

  d("js-obj-equal", "javascript", "equality", "Easy", "Check whether the user already liked this post.", `function hasLiked(likes, userId) {
  return likes.includes({ userId }); // @bug
}`, "  return likes.some((l) => l.userId === userId);", "`includes` uses `===`/SameValueZero: a freshly created object is never identical to an element in the array. Compare a field with `some`.", ["Objects compare by reference, so a new literal never matches", "includes only works on strings", "userId must be converted to a string", "Should use indexOf"]),

  d("js-parseint-map", "javascript", "coercion", "Medium", "Parse query-string ids into numbers.", `function parseIds(csv) {
  return csv.split(',').map(parseInt); // @bug
}`, "  return csv.split(',').map((s) => parseInt(s, 10));", "`map` passes `(value, index)`; `parseInt('2', 1)` → NaN because index becomes the radix. Wrap it or use `Number`.", ["map passes the index as parseInt's radix", "split returns a string", "parseInt can't parse negative numbers", "csv must be trimmed first"]),

  d("js-date-month", "javascript", "dates", "Easy", "Format a date as YYYY-MM.", `function yearMonth(d) {
  const m = String(d.getMonth()).padStart(2, '0'); // @bug
  return \`\${d.getFullYear()}-\${m}\`;
}`, "  const m = String(d.getMonth() + 1).padStart(2, '0');", "`getMonth()` is zero-based (January = 0).", ["getMonth() is zero-based", "padStart pads on the right", "getFullYear returns 2 digits", "Template literals can't call methods"]),

  d("js-default-or", "javascript", "coercion", "Medium", "Use the caller's page size, default 20.", `function pageSize(opts) {
  return opts.limit || 20; // @bug
}`, "  return opts.limit ?? 20;", "`||` replaces every falsy value: a deliberate `limit: 0` becomes 20. `??` only falls back for null/undefined.", ["|| treats 0 as missing; use ??", "opts may be a string", "20 should be a constant", "limit must be parsed"]),

  d("js-promise-all-fail", "javascript", "async", "Medium", "Fetch all profiles; skip ones that fail.", `async function loadProfiles(ids, api) {
  const results = await Promise.all(ids.map((id) => api.get(id))); // @bug
  return results.filter(Boolean);
}`, "  const results = (await Promise.allSettled(ids.map((id) => api.get(id)))).map((r) => r.status === 'fulfilled' ? r.value : null);", "`Promise.all` rejects as soon as one request fails, so you lose every result. `allSettled` gives each outcome.", ["Promise.all rejects on the first failure", "map can't return promises", "filter(Boolean) removes valid profiles", "ids must be deduplicated"]),

  d("js-this-callback", "javascript", "this", "Medium", "Count clicks on the widget.", `class Counter {
  constructor(el) {
    this.count = 0;
    el.addEventListener('click', this.inc); // @bug
  }
  inc() { this.count++; }
}`, "    el.addEventListener('click', () => this.inc());", "Passing `this.inc` detaches the method; inside it `this` is the element (or undefined). Bind it or use an arrow wrapper.", ["The method loses its `this` when passed as a callback", "count should be static", "Classes can't add listeners in constructors", "inc must be async"]),

  d("js-off-by-one-loop", "javascript", "loops", "Easy", "Return pairs of adjacent items.", `function pairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) { // @bug
    out.push([arr[i], arr[i + 1]]);
  }
  return out;
}`, "  for (let i = 0; i < arr.length - 1; i++) {", "The last iteration reads `arr[arr.length]` → undefined. Stop one earlier.", ["Loop runs one step too far (arr[i+1] is out of bounds)", "Should start at 1", "push needs spread", "const out can't be modified"]),

  d("js-json-date", "javascript", "serialization", "Medium", "Compare a cached order's createdAt with now.", `function isFresh(cached) {
  const order = JSON.parse(cached);
  return Date.now() - order.createdAt.getTime() < 60000; // @bug
}`, "  return Date.now() - new Date(order.createdAt).getTime() < 60000;", "JSON has no Date type: after `JSON.parse`, `createdAt` is an ISO string, so `.getTime` is not a function.", ["Dates become strings after a JSON round trip", "Date.now() returns seconds", "60000 is 6 seconds", "JSON.parse is async"]),

  d("js-mutate-default", "javascript", "objects", "Medium", "Create a config from defaults.", `const DEFAULTS = { retries: 3, headers: {} };
function makeConfig(overrides) {
  const cfg = Object.assign(DEFAULTS, overrides); // @bug
  return cfg;
}`, "  const cfg = Object.assign({}, DEFAULTS, overrides);", "`Object.assign(target, ...)` mutates the target, so every call permanently changes DEFAULTS. Use a fresh `{}` (and deep-copy nested objects).", ["Object.assign mutates DEFAULTS", "Object.assign is deep", "overrides must be frozen", "const objects can't be returned"]),

  d("js-string-number-add", "javascript", "coercion", "Easy", "Add the quantity from a form field.", `function addToCart(cart, input) {
  cart.qty = cart.qty + input.value; // @bug
  return cart;
}`, "  cart.qty = cart.qty + Number(input.value);", "Form values are strings: `2 + '3'` → `'23'` (string concatenation).", ["Input values are strings, so + concatenates", "cart is immutable", "qty needs Math.floor", "input.value is a number"]),

  d("js-settimeout-zero", "javascript", "event loop", "Hard", "Log 'sync', then 'micro', then 'macro'.", `console.log('sync');
setTimeout(() => console.log('micro'), 0); // @bug
Promise.resolve().then(() => console.log('macro'));`, "queueMicrotask(() => console.log('micro'));", "Promise callbacks are **microtasks** and run before **macrotasks** like setTimeout(0). As written it logs sync, macro, micro, and the labels are swapped.", ["setTimeout is a macrotask; it runs after promise microtasks", "console.log is async", "Promise.resolve blocks", "setTimeout(0) runs immediately"]),

  d("js-regex-global", "javascript", "regex", "Hard", "Validate several SKUs with one regex.", `const SKU = /^[A-Z]{3}-\\d{4}$/g; // @bug
function valid(skus) {
  return skus.map((s) => SKU.test(s));
}`, "const SKU = /^[A-Z]{3}-\\d{4}$/;", "With the `g` flag, `test()` is stateful via `lastIndex`: the second identical valid SKU returns false. Drop `g`.", ["The g flag makes test() remember lastIndex", "^ and $ are not allowed together", "\\d should be [0-9]", "map can't return booleans"]),

  d("js-status-code", "javascript", "http", "Easy", "Respond when a resource doesn't exist.", `app.get('/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(400).json({ message: 'Not found' }); // @bug
  res.json(order);
});`, "  if (!order) return res.status(404).json({ message: 'Not found' });", "A missing resource is **404 Not Found**. 400 means the request itself was malformed.", ["Wrong status: missing resource is 404", "findById needs .exec()", "res.json can't send objects", "req.params.id is a number"]),

  d("js-optional-chain", "javascript", "null safety", "Easy", "Get the city or 'unknown'.", `function city(user) {
  return user.address.city || 'unknown'; // @bug
}`, "  return user.address?.city ?? 'unknown';", "If `address` is missing this throws `Cannot read properties of undefined`. Use optional chaining.", ["Throws when address is undefined", "|| should be &&", "city is always a number", "Strings can't be returned"]),

  d("js-array-length-truthy", "javascript", "coercion", "Easy", "Show 'empty' when there are no results.", `function label(results) {
  if (!results) return 'empty'; // @bug
  return results.length + ' results';
}`, "  if (!results || results.length === 0) return 'empty';", "An empty array is truthy in JS, so `![]` is false. Check `.length`.", ["[] is truthy; check length", "results may be a Set", "length is a function", "Should use ==="]),

  d("js-includes-nan", "javascript", "loops", "Medium", "Return true if any reading is invalid (NaN).", `function anyInvalid(readings) {
  return readings.indexOf(NaN) !== -1; // @bug
}`, "  return readings.some(Number.isNaN);", "`indexOf` uses `===`, and `NaN !== NaN`, so it never finds NaN. Use `Number.isNaN` (or `includes`, which uses SameValueZero).", ["indexOf can't find NaN because NaN !== NaN", "indexOf returns a boolean", "readings must be sorted", "-1 means found"]),

  d("js-delete-array", "javascript", "arrays", "Easy", "Remove the item at index i.", `function removeAt(arr, i) {
  delete arr[i]; // @bug
  return arr;
}`, "  arr.splice(i, 1);", "`delete` leaves a hole (`<empty>`) and doesn't change `length`. Use `splice`.", ["delete leaves a hole and keeps the length", "arr is frozen", "i must be negative", "Should return arr.length"]),

  d("js-async-try", "javascript", "async", "Hard", "Catch errors from the payment call.", `async function pay(api, order) {
  try {
    return api.charge(order); // @bug
  } catch (e) {
    return { ok: false, error: e.message };
  }
}`, "    return await api.charge(order);", "`return promise` inside try exits the try block before the promise rejects, so the catch never runs. `return await` keeps the rejection inside the try.", ["Without await, the rejection escapes the try/catch", "async functions can't use try", "catch needs a finally", "api.charge must be bound"]),

  // ---------------------------------------------------------------- Python
  d("py-mutable-default", "python", "functions", "Easy", "Append a tag and return the list.", `def add_tag(tag, tags=[]):  # @bug
    tags.append(tag)
    return tags`, "def add_tag(tag, tags=None):", "Default values are evaluated once. Every call without `tags` shares the same list. Use `None` and create a list inside.", ["Mutable default list is shared across calls", "append returns a new list", "tag must be a str", "return should be yield"]),

  d("py-is-equality", "python", "equality", "Easy", "Check the order status.", `def is_shipped(order):
    return order.status is "shipped"  # @bug`, "    return order.status == \"shipped\"", "`is` compares identity; strings built at runtime are distinct objects. Use `==`.", ["`is` checks identity, not equality", "Strings are immutable", "status must be upper-case", "Should use in"]),

  d("py-range-off", "python", "loops", "Easy", "Sum the numbers 1..n inclusive.", `def total(n):
    s = 0
    for i in range(1, n):  # @bug
        s += i
    return s`, "    for i in range(1, n + 1):", "`range(a, b)` excludes `b`.", ["range excludes the stop value", "s should start at 1", "+= doesn't work on ints", "range needs a step"]),

  d("py-dict-iter-mutate", "python", "dicts", "Medium", "Drop sessions that have expired.", `def prune(sessions, now):
    for sid, exp in sessions.items():  # @bug
        if exp < now:
            del sessions[sid]`, "    for sid, exp in list(sessions.items()):", "Deleting from a dict while iterating raises `RuntimeError: dictionary changed size during iteration`. Iterate over a snapshot.", ["Mutating a dict while iterating it raises RuntimeError", "items() returns keys only", "exp is a string", "del can't delete dict keys"]),

  d("py-int-div", "python", "math", "Easy", "Average order value with decimals.", `def average(total, count):
    return total // count  # @bug`, "    return total / count", "`//` is floor division and drops the fraction.", ["// floors the result", "count may be zero (always)", "total must be Decimal", "return needs round()"]),

  d("py-late-binding", "python", "closures", "Hard", "Build multipliers x1, x2, x3.", `def multipliers():
    return [lambda x: x * i for i in range(1, 4)]  # @bug`, "    return [lambda x, i=i: x * i for i in range(1, 4)]", "Closures bind variables late: all lambdas see the final `i = 3`. Capture it with a default arg.", ["All lambdas capture the same final i", "lambda can't use multiplication", "range should start at 0", "List comprehensions can't contain lambdas"]),

  d("py-copy-shallow", "python", "copying", "Medium", "Copy a grid and modify the copy only.", `def with_mark(grid, r, c):
    g = grid.copy()  # @bug
    g[r][c] = "X"
    return g`, "    g = [row[:] for row in grid]", "`list.copy()` is shallow: inner row lists are shared, so the original grid changes too.", ["Shallow copy shares the inner row lists", "copy() returns None", "grid must be a tuple", "r and c are swapped"]),

  d("py-except-broad", "python", "errors", "Medium", "Parse an int, default 0 for bad input.", `def to_int(s):
    try:
        return int(s)
    except:  # @bug
        return 0`, "    except (TypeError, ValueError):", "A bare `except` also swallows KeyboardInterrupt/SystemExit and hides real bugs. Catch the specific errors.", ["Bare except catches everything, including interrupts", "int() never raises", "return in try is illegal", "Should use finally"]),

  d("py-sort-return", "python", "lists", "Easy", "Return names alphabetically.", `def sorted_names(names):
    return names.sort()  # @bug`, "    return sorted(names)", "`list.sort()` sorts in place and returns `None`.", ["list.sort() returns None", "sort is descending", "names must be a set", "sort needs key="]),

  d("py-strip-chars", "python", "strings", "Medium", "Remove the '.json' extension.", `def base(filename):
    return filename.rstrip(".json")  # @bug`, "    return filename.removesuffix(\".json\")", "`rstrip` removes any trailing **characters** in the set {. j s o n}: `'season.json'` → `'sea'`. Use `removesuffix`.", ["rstrip strips a character set, not a suffix", "rstrip strips from the left", "filename is bytes", "Needs split('.')"]),

  d("py-global-counter", "python", "scope", "Medium", "Count calls to track().", `calls = 0

def track():
    calls += 1  # @bug
    return calls`, "    global calls\n    calls += 1", "Assignment makes `calls` local to the function, so `+=` reads an unbound local → UnboundLocalError. Declare `global` (or use a class/closure).", ["Assigning makes calls a local: UnboundLocalError", "Integers are immutable so += fails", "calls must be a list", "Functions can't return globals"]),

  d("py-generator-twice", "python", "generators", "Medium", "Return min and max price.", `def min_max(products):
    prices = (p.price for p in products)  # @bug
    return min(prices), max(prices)`, "    prices = [p.price for p in products]", "A generator can be consumed only once: `max()` gets an empty iterator and raises ValueError.", ["A generator is exhausted after min()", "min can't take a generator", "Tuple return is invalid", "price must be float"]),

  d("py-float-eq", "python", "math", "Easy", "Check if the cart total is 0.3.", `def is_thirty_cents(a, b):
    return a + b == 0.3  # @bug`, "    return math.isclose(a + b, 0.3)", "`0.1 + 0.2 == 0.30000000000000004`. Compare floats with a tolerance (or use Decimal for money).", ["Floating-point rounding makes exact == fail", "+ concatenates numbers", "0.3 is an int", "Should use is"]),

  d("py-dict-get-default", "python", "dicts", "Easy", "Count word frequencies.", `def freq(words):
    counts = {}
    for w in words:
        counts[w] += 1  # @bug
    return counts`, "        counts[w] = counts.get(w, 0) + 1", "First access to a missing key raises KeyError. Use `.get(w, 0)`, `defaultdict(int)` or `Counter`.", ["Missing key raises KeyError on +=", "Dicts can't hold ints", "words must be sorted", "return should be counts.items()"]),

  d("py-class-attr", "python", "classes", "Medium", "Each cart has its own items.", `class Cart:
    items = []  # @bug

    def add(self, sku):
        self.items.append(sku)`, "    def __init__(self):\n        self.items = []", "A class attribute list is shared by **every** instance. Create it in `__init__`.", ["Class-level list is shared by all instances", "append is not a list method", "self is missing in add", "items must be private"]),

  d("py-binary-search", "python", "algorithms", "Medium", "Find target index in a sorted list, -1 if absent.", `def search(a, t):
    lo, hi = 0, len(a) - 1
    while lo < hi:  # @bug
        mid = (lo + hi) // 2
        if a[mid] == t: return mid
        if a[mid] < t: lo = mid + 1
        else: hi = mid - 1
    return -1`, "    while lo <= hi:", "With an inclusive `hi`, the loop must run while `lo <= hi`; otherwise a single remaining candidate is never checked (e.g. the last element).", ["Loop exits before checking the last candidate", "mid can overflow", "hi should be len(a)", "// should be /"]),

  d("py-any-all", "python", "logic", "Easy", "True if every item is in stock.", `def all_in_stock(items):
    return any(i.stock > 0 for i in items)  # @bug`, "    return all(i.stock > 0 for i in items)", "`any` is true if at least one item matches. \"Every\" is `all`.", ["any() should be all()", "Generators can't be passed to any", "stock is a string", "Needs a list comprehension"]),

  d("py-time-tz", "python", "dates", "Hard", "Is the coupon still valid (UTC expiry)?", `from datetime import datetime, timezone

def valid(expires_at_utc):
    return datetime.now() < expires_at_utc  # @bug`, "    return datetime.now(timezone.utc) < expires_at_utc", "`datetime.now()` is naive local time. Comparing it with an aware UTC datetime raises TypeError (and even naive-naive mixes timezones). Use `datetime.now(timezone.utc)`.", ["Naive local time compared with an aware UTC datetime", "datetime can't be compared", "expires_at must be a string", "Should use time.time()"]),

  d("py-recursion-base", "python", "recursion", "Easy", "Factorial of n.", `def fact(n):
    if n == 1:  # @bug
        return 1
    return n * fact(n - 1)`, "    if n <= 1:", "`fact(0)` never hits the base case and recurses forever (RecursionError).", ["fact(0) never reaches the base case", "Python has no recursion", "Should multiply by n+1", "return must be yield"]),

  d("py-enumerate-start", "python", "loops", "Easy", "Print a 1-based numbered list.", `def numbered(items):
    return [f"{i}. {x}" for i, x in enumerate(items)]  # @bug`, "    return [f\"{i}. {x}\" for i, x in enumerate(items, start=1)]", "`enumerate` starts at 0 by default.", ["enumerate starts at 0", "f-strings can't use dots", "items must be a dict", "Order of i, x is reversed"]),

  // ---------------------------------------------------------------- Java
  d("java-string-eq", "java", "equality", "Easy", "Check the user's role.", `boolean isAdmin(User u) {
    return u.getRole() == "ADMIN"; // @bug
}`, "    return \"ADMIN\".equals(u.getRole());", "`==` compares references. Strings built at runtime (e.g. read from a DB) aren't interned. Use `.equals`, which is also null-safe when called on the literal.", ["== compares references, not string contents", "Strings must be char[]", "getRole returns an enum", "Needs a cast"]),

  d("java-int-overflow", "java", "math", "Medium", "Midpoint for binary search.", `int mid(int lo, int hi) {
    return (lo + hi) / 2; // @bug
}`, "    return lo + (hi - lo) / 2;", "`lo + hi` can overflow `Integer.MAX_VALUE` for large indices and turn negative.", ["lo + hi can overflow int", "Division by 2 truncates incorrectly", "Should return long always", "hi must be exclusive"]),

  d("java-concurrent-mod", "java", "collections", "Medium", "Remove expired items.", `void prune(List<Item> items) {
    for (Item it : items) { // @bug
        if (it.isExpired()) items.remove(it);
    }
}`, "    items.removeIf(Item::isExpired);", "Structurally modifying a list inside a for-each throws `ConcurrentModificationException`. Use an Iterator's remove or `removeIf`.", ["Removing during for-each throws ConcurrentModificationException", "List has no remove method", "isExpired must be static", "Should use an array"]),

  d("java-integer-cache", "java", "equality", "Hard", "Compare two order quantities.", `boolean sameQty(Integer a, Integer b) {
    return a == b; // @bug
}`, "    return Objects.equals(a, b);", "Boxed `Integer` `==` compares references. It works for -128..127 (cache) and fails for larger values like 1000.", ["Boxed Integers compared by reference (only cached -128..127 match)", "Integers can't be null", "== on Integer unboxes always", "Needs compareTo > 0"]),

  d("java-hashcode", "java", "collections", "Hard", "Use Point as a HashMap key.", `class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        return o instanceof Point p && p.x == x && p.y == y;
    } // @bug
}`, "    @Override public int hashCode() { return Objects.hash(x, y); }", "Overriding `equals` without `hashCode` breaks hash collections: equal points land in different buckets, so `map.get(new Point(1,2))` returns null.", ["equals is overridden without hashCode", "Fields must not be final", "instanceof can't bind variables", "Point must implement Comparable"]),

  d("java-switch-fallthrough", "java", "control flow", "Easy", "Map a status code to a label.", `String label(int code) {
    String s = "unknown";
    switch (code) {
        case 200: s = "ok"; // @bug
        case 404: s = "missing"; break;
    }
    return s;
}`, "        case 200: s = \"ok\"; break;", "Without `break`, case 200 falls through into case 404, so 200 returns \"missing\".", ["Missing break causes fall-through", "switch can't use ints", "s must be final", "default is required"]),

  d("java-optional-get", "java", "null safety", "Medium", "Return the user's name or 'guest'.", `String name(Optional<User> u) {
    return u.get().getName() != null ? u.get().getName() : "guest"; // @bug
}`, "    return u.map(User::getName).orElse(\"guest\");", "`Optional.get()` throws `NoSuchElementException` when empty, which defeats the point. Use `map(...).orElse(...)`.", ["Optional.get() throws when empty", "Ternaries can't return strings", "getName is static", "Optional can't hold User"]),

  d("java-bigdecimal", "java", "money", "Medium", "Create an exact price of 0.10.", `BigDecimal price() {
    return new BigDecimal(0.1); // @bug
}`, "    return new BigDecimal(\"0.1\");", "`new BigDecimal(0.1)` captures the binary double: 0.1000000000000000055511151231257827… Use the String constructor or `BigDecimal.valueOf`.", ["The double constructor captures the inexact binary value", "BigDecimal can't hold decimals", "Should use float", "Needs setScale(0)"]),

  d("java-stream-reuse", "java", "streams", "Medium", "Count and list adult users.", `List<User> adults(List<User> users) {
    Stream<User> s = users.stream().filter(u -> u.age >= 18);
    System.out.println(s.count());
    return s.collect(Collectors.toList()); // @bug
}`, "    return users.stream().filter(u -> u.age >= 18).collect(Collectors.toList());", "A Stream can be consumed only once. After `count()`, `collect` throws IllegalStateException.", ["Streams can't be reused after a terminal operation", "filter needs a Predicate class", "count returns int", "toList requires a size"]),

  d("java-sync", "java", "concurrency", "Hard", "Thread-safe counter.", `class Counter {
    private int n = 0;
    public void inc() { n++; } // @bug
    public synchronized int get() { return n; }
}`, "    public synchronized void inc() { n++; }", "`n++` is read-modify-write, not atomic. Concurrent calls lose updates. Synchronise `inc` (or use AtomicInteger).", ["n++ isn't atomic, so concurrent increments are lost", "get must not be synchronized", "int can't be private", "Should use volatile only"]),

  // ---------------------------------------------------------------- C++
  d("cpp-vector-index", "cpp", "bounds", "Easy", "Sum all elements.", `int sum(const std::vector<int>& v) {
    int s = 0;
    for (size_t i = 0; i <= v.size(); ++i) // @bug
        s += v[i];
    return s;
}`, "    for (size_t i = 0; i < v.size(); ++i)", "`<=` reads one past the end: undefined behaviour.", ["Loop reads past the end (<= size)", "size_t is signed", "v must be non-const", "++i should be i++"]),

  d("cpp-unsigned-loop", "cpp", "types", "Medium", "Iterate a vector backwards.", `void back(const std::vector<int>& v) {
    for (size_t i = v.size() - 1; i >= 0; --i) // @bug
        std::cout << v[i];
}`, "    for (size_t i = v.size(); i-- > 0;)", "`size_t` is unsigned: `i >= 0` is always true and `0 - 1` wraps to a huge number. Infinite loop and out-of-bounds access (also when v is empty).", ["Unsigned i >= 0 is always true and wraps around", "cout can't print ints", "v.size() is signed", "--i is invalid"]),

  d("cpp-dangling-ref", "cpp", "memory", "Hard", "Return the user's display name.", `const std::string& displayName(const User& u) {
    std::string name = u.first + " " + u.last;
    return name; // @bug
}`, "std::string displayName(const User& u) { return u.first + \" \" + u.last; }", "Returning a reference to a local variable leaves a dangling reference once the function returns. Return by value.", ["Returns a reference to a destroyed local", "+ can't join strings", "User must be passed by value", "Needs std::move"]),

  d("cpp-int-division", "cpp", "math", "Easy", "Percentage of passed tests.", `double pct(int passed, int total) {
    return passed / total * 100.0; // @bug
}`, "    return 100.0 * passed / total;", "`passed / total` is integer division (e.g. 3 / 4 == 0) before the multiplication.", ["Integer division happens before converting to double", "100.0 must be 100", "Should return int", "total can't be int"]),

  d("cpp-map-operator", "cpp", "containers", "Medium", "Check whether a key exists without changing the map.", `bool has(std::map<std::string, int>& m, const std::string& k) {
    return m[k] != 0; // @bug
}`, "    return m.find(k) != m.end();", "`operator[]` **inserts** a default value when the key is missing, mutating the map, and a stored 0 looks like 'absent'. Use `find`/`count`/`contains`.", ["operator[] inserts missing keys", "map keys must be ints", "!= isn't defined for int", "m must be const"]),

  d("cpp-iterator-invalidate", "cpp", "containers", "Hard", "Erase all even numbers.", `void dropEven(std::vector<int>& v) {
    for (auto it = v.begin(); it != v.end(); ++it)
        if (*it % 2 == 0) v.erase(it); // @bug
}`, "    std::erase_if(v, [](int x){ return x % 2 == 0; });", "`erase` invalidates `it`. Incrementing it afterwards is undefined behaviour. Use `it = v.erase(it)` without ++, or the erase-remove idiom.", ["erase invalidates the iterator that is then incremented", "% doesn't work on negatives", "auto can't deduce iterators", "vector has no erase"]),

  d("cpp-uninit", "cpp", "initialisation", "Easy", "Count positive numbers.", `int positives(const std::vector<int>& v) {
    int count; // @bug
    for (int x : v) if (x > 0) count++;
    return count;
}`, "    int count = 0;", "Local `int` isn't zero-initialised: it starts with garbage.", ["count is uninitialised", "Range-for can't take const&", "x must be unsigned", "++ is undefined for int"]),

  d("cpp-shared-ptr-cycle", "cpp", "memory", "Hard", "Doubly linked nodes managed by smart pointers.", `struct Node {
    std::shared_ptr<Node> next;
    std::shared_ptr<Node> prev; // @bug
};`, "    std::weak_ptr<Node> prev;", "Two shared_ptrs pointing at each other form a reference cycle: neither count reaches zero, so the nodes leak. Make the back-pointer a `weak_ptr`.", ["shared_ptr cycle: nodes never freed", "struct can't hold pointers", "Must use unique_ptr for both", "prev must be raw new"]),

  d("cpp-string-compare-c", "cpp", "strings", "Medium", "Compare two C strings.", `bool same(const char* a, const char* b) {
    return a == b; // @bug
}`, "    return std::strcmp(a, b) == 0;", "Comparing `const char*` compares the pointer addresses, not the characters.", ["Pointer comparison, not content comparison", "char can't be const", "== is undefined for pointers", "Should compare lengths"]),

  d("cpp-abs-overflow", "cpp", "math", "Hard", "Distance between two ints.", `int dist(int a, int b) {
    return std::abs(a - b); // @bug
}`, "    return static_cast<long long>(a) > b ? (long long)a - b : (long long)b - a;", "`a - b` can overflow `int` (e.g. INT_MAX - (-1)), which is undefined behaviour before abs even runs. Widen first.", ["a - b can overflow int before abs", "abs only accepts doubles", "Should return unsigned", "b must be positive"]),

  d("cpp-endl-loop", "cpp", "performance", "Medium", "Print 1e6 lines quickly.", `void dump(const std::vector<int>& v) {
    for (int x : v) std::cout << x << std::endl; // @bug
}`, "    for (int x : v) std::cout << x << '\\n';", "`std::endl` flushes the stream every line, which is a classic reason a correct solution gets TLE. Use `'\\n'`.", ["std::endl flushes on every line (slow)", "cout can't print ints", "Range-for copies the vector", "x must be long"]),
];
