const model = `import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

export default mongoose.model('Product', productSchema);
`;

const cacheBuggy = `// Tiny in-memory response cache for GET endpoints.
const TTL_MS = 30 * 1000;
export const store = new Map();

export const cacheResponse = (req, res, next) => {
  const key = req.baseUrl;
  const hit = store.get(key);
  if (hit && Date.now() - hit.at > TTL_MS) {
    return res.json(hit.body);
  }

  const originalJson = res.json;
  res.json = (body) => {
    if (res.statusCode === 200) {
      store.set(key, { body, at: Date.now() });
    }
    return originalJson(body);
  };
  next();
};

export const invalidate = (key) => store.delete(key);
`;

const cacheFixed = `// Tiny in-memory response cache for GET endpoints.
const TTL_MS = 30 * 1000;
export const store = new Map();

export const cacheResponse = (req, res, next) => {
  const key = req.originalUrl;
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return res.json(hit.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) {
      store.set(key, { body, at: Date.now() });
    }
    return originalJson(body);
  };
  next();
};

export const invalidate = (key) => store.delete(key);
`;

const routesBuggy = `import { Router } from 'express';
import Product from '../models/Product.js';
import { cacheResponse, invalidate } from '../middleware/cache.js';

const router = Router();

router.get('/:id', cacheResponse, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json(product);
});

router.put('/:id', async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json(product);
});

export default router;
`;

const routesFixed = routesBuggy.replace(
  "  if (!product) return res.status(404).json({ message: 'Not found' });\n  res.json(product);\n});\n\nexport default",
  "  if (!product) return res.status(404).json({ message: 'Not found' });\n  invalidate(`/api/products/${req.params.id}`);\n  res.json(product);\n});\n\nexport default"
);

const app = `import express from 'express';
import products from './routes/products.js';

const app = express();
app.use(express.json());
app.use('/api/products', products);

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';
import { store } from '../middleware/cache.js';

let kindle, echo, spy;

beforeEach(async () => {
  store.clear();
  await Product.deleteMany({});
  kindle = await Product.create({ name: 'Kindle', price: 99 });
  echo = await Product.create({ name: 'Echo', price: 49 });
  spy = jest.spyOn(Product, 'findById');
});

afterEach(() => spy.mockRestore());

test('first GET hits the DB and returns the product', async () => {
  const res = await request(app).get(\`/api/products/\${kindle.id}\`);
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Kindle');
});

test('second GET within TTL is served from cache (1 DB call)', async () => {
  await request(app).get(\`/api/products/\${kindle.id}\`);
  const res = await request(app).get(\`/api/products/\${kindle.id}\`);
  expect(res.body.name).toBe('Kindle');
  expect(spy).toHaveBeenCalledTimes(1);
});

test('different ids never share a cache entry', async () => {
  await request(app).get(\`/api/products/\${kindle.id}\`);
  const res = await request(app).get(\`/api/products/\${echo.id}\`);
  expect(res.body.name).toBe('Echo');
});

test('entry expires after 30s', async () => {
  jest.useFakeTimers();
  await request(app).get(\`/api/products/\${kindle.id}\`);
  jest.advanceTimersByTime(31 * 1000);
  await request(app).get(\`/api/products/\${kindle.id}\`);
  expect(spy).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});

test('PUT invalidates the cached entry', async () => {
  await request(app).get(\`/api/products/\${kindle.id}\`);
  await request(app).put(\`/api/products/\${kindle.id}\`).send({ price: 79 });
  const res = await request(app).get(\`/api/products/\${kindle.id}\`);
  expect(res.body.price).toBe(79);
});
`;

export default {
  slug: "response-cache",
  order: 6,
  title: "Product Page Response Cache",
  difficulty: "Medium",
  minutes: 30,
  tagline: "Every product page shows the same product, and the cache never caches.",
  ticket: `**CAT-512 · Product detail pages show the wrong item**

After adding a response cache to cut DB load, product pages started **crashing** or showing **another product's data**. Updated prices also stay stale.

Requirements: cache \`GET /api/products/:id\` per URL for **30 seconds**. A \`PUT\` to a product must invalidate its cached entry.`,
  env: {},
  files: { "app.js": app, "routes/products.js": routesBuggy, "middleware/cache.js": cacheBuggy, "models/Product.js": model },
  tests: { "tests/cache.test.js": tests },
  fixes: { "middleware/cache.js": cacheFixed, "routes/products.js": routesFixed },
  bugs: [
    { file: "middleware/cache.js", title: "unbound res.json", explain: "`const originalJson = res.json` loses `this`. Calling `originalJson(body)` throws because it runs with `this === undefined`. Use `res.json.bind(res)`." },
    { file: "middleware/cache.js", title: "cache key ignores the id", explain: "`req.baseUrl` is `/api/products` for every product. Use `req.originalUrl`." },
    { file: "middleware/cache.js", title: "TTL check inverted", explain: "It served entries only when they were *older* than the TTL. Fresh means `age < TTL`." },
    { file: "routes/products.js", title: "no invalidation on write", explain: "Call `invalidate('/api/products/' + id)` after a successful update." },
  ],
  hints: ["Detaching a method from its object: what happens to `this`?", "Log the cache key for two different product ids.", "Write the freshness condition in words first."],
  concepts: ["this binding", "cache keys", "TTL", "cache invalidation", "monkey-patching res.json"],
};
