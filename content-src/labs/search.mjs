const model = `import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
});

export default mongoose.model('Product', productSchema);
`;

const userModel = `import mongoose from 'mongoose';

const sellerSchema = new mongoose.Schema({
  email: { type: String, required: true },
  apiKey: { type: String, required: true },
});

export default mongoose.model('Seller', sellerSchema);
`;

const searchBuggy = `import Product from '../models/Product.js';

// GET /api/search?q=echo&category=devices
// Case-insensitive substring match on name. Results: highest rating first.
export const search = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.q) filter.name = new RegExp(req.query.q, 'i');
    if (req.query.category) filter.category = req.query.category;
    const items = await Product.find(filter);
    items.sort((a, b) => a.rating < b.rating);
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// GET /api/search/prices?category=devices -> distinct prices, ascending
export const priceList = async (req, res, next) => {
  try {
    const items = await Product.find({ category: req.query.category });
    const prices = [...new Set(items.map((p) => p.price))].sort();
    res.json(prices);
  } catch (err) {
    next(err);
  }
};
`;

const searchFixed = `import Product from '../models/Product.js';

const escapeRegex = (s) => s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');

// GET /api/search?q=echo&category=devices
// Case-insensitive substring match on name. Results: highest rating first.
export const search = async (req, res, next) => {
  try {
    const filter = {};
    if (typeof req.query.q === 'string' && req.query.q) filter.name = new RegExp(escapeRegex(req.query.q), 'i');
    if (req.query.category) filter.category = req.query.category;
    const items = await Product.find(filter);
    items.sort((a, b) => b.rating - a.rating);
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// GET /api/search/prices?category=devices -> distinct prices, ascending
export const priceList = async (req, res, next) => {
  try {
    const items = await Product.find({ category: req.query.category });
    const prices = [...new Set(items.map((p) => p.price))].sort((a, b) => a - b);
    res.json(prices);
  } catch (err) {
    next(err);
  }
};
`;

const sellerBuggy = `import Seller from '../models/Seller.js';

// POST /api/sellers/login { email, apiKey }
export const sellerLogin = async (req, res) => {
  const seller = await Seller.findOne({ email: req.body.email, apiKey: req.body.apiKey });
  if (!seller) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ ok: true, seller: seller.email });
};
`;

const sellerFixed = `import Seller from '../models/Seller.js';

// POST /api/sellers/login { email, apiKey }
export const sellerLogin = async (req, res) => {
  const { email, apiKey } = req.body;
  if (typeof email !== 'string' || typeof apiKey !== 'string') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const seller = await Seller.findOne({ email, apiKey });
  if (!seller) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ ok: true, seller: seller.email });
};
`;

const app = `import express from 'express';
import { search, priceList } from './controllers/searchController.js';
import { sellerLogin } from './controllers/sellerController.js';

const app = express();
app.use(express.json());
app.get('/api/search', search);
app.get('/api/search/prices', priceList);
app.post('/api/sellers/login', sellerLogin);

app.use((err, req, res, next) => res.status(500).json({ message: err.message }));

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';

beforeEach(async () => {
  await Product.deleteMany({});
  await Seller.deleteMany({});
  await Product.create([
    { name: 'Echo Dot', category: 'devices', price: 49, rating: 4.1 },
    { name: 'Echo Show', category: 'devices', price: 100, rating: 4.7 },
    { name: 'Kindle', category: 'devices', price: 9, rating: 4.9 },
    { name: 'C++ Primer', category: 'books', price: 25, rating: 4.4 },
    { name: 'Fire TV', category: 'devices', price: 100, rating: 3.9 },
  ]);
  await Seller.create({ email: 'shop@acme.com', apiKey: 'k-123' });
});

test('search is case-insensitive and sorted by rating desc', async () => {
  const res = await request(app).get('/api/search?q=ECHO');
  expect(res.body.map((p) => p.name)).toEqual(['Echo Show', 'Echo Dot']);
});

test('special characters are matched literally', async () => {
  const res = await request(app).get('/api/search?q=c%2B%2B');
  expect(res.status).toBe(200);
  expect(res.body.map((p) => p.name)).toEqual(['C++ Primer']);
});

test('a "." in the query is not a wildcard', async () => {
  const res = await request(app).get('/api/search?q=e.h');
  expect(res.body).toEqual([]);
});

test('price list is numeric ascending and distinct', async () => {
  const res = await request(app).get('/api/search/prices?category=devices');
  expect(res.body).toEqual([9, 49, 100]);
});

test('seller login works with correct credentials', async () => {
  const res = await request(app).post('/api/sellers/login').send({ email: 'shop@acme.com', apiKey: 'k-123' });
  expect(res.status).toBe(200);
});

test('NoSQL operator injection is rejected', async () => {
  const res = await request(app).post('/api/sellers/login').send({ email: 'shop@acme.com', apiKey: { $ne: 'x' } });
  expect(res.status).toBe(401);
});
`;

export default {
  slug: "search-injection",
  order: 12,
  title: "Product Search, Sorting & Injection",
  difficulty: "Medium",
  minutes: 25,
  tagline: "Searching 'c++' crashes, sorting is random, and sellers log in without a key.",
  ticket: `**SRCH-61 · Search 500s + security finding**

- Searching for \`c++\` or \`(\` returns **500**.
- Results are in a random order instead of highest rating first.
- The price filter widget shows \`[100, 49, 9]\` as "ascending".
- **AppSec:** \`POST /api/sellers/login\` accepts \`{"apiKey": {"$ne": "x"}}\` and logs the attacker in.`,
  env: {},
  files: { "app.js": app, "controllers/searchController.js": searchBuggy, "controllers/sellerController.js": sellerBuggy, "models/Product.js": model, "models/Seller.js": userModel },
  tests: { "tests/search.test.js": tests },
  fixes: { "controllers/searchController.js": searchFixed, "controllers/sellerController.js": sellerFixed },
  bugs: [
    { file: "controllers/searchController.js", title: "user input compiled as a regex", explain: "`new RegExp('c++')` throws (`Nothing to repeat`) and `.` matches anything. Escape regex metacharacters first." },
    { file: "controllers/searchController.js", title: "comparator returns a boolean", explain: "`sort` needs a negative/zero/positive **number**. `a < b` returns true/false, which gives an engine-dependent order. Use `b.rating - a.rating`." },
    { file: "controllers/searchController.js", title: "default sort is lexicographic", explain: "`[100, 49, 9].sort()` compares strings, so `'100' < '49' < '9'`. Pass `(a, b) => a - b`." },
    { file: "controllers/sellerController.js", title: "NoSQL injection", explain: "JSON bodies can contain objects. `{ $ne: 'x' }` turns the filter into 'any key that isn't x'. Validate that credentials are strings." },
  ],
  hints: ["What does `new RegExp('c++')` do?", "What must an Array.prototype.sort comparator return?", "What if req.body.apiKey is an object instead of a string?"],
  concepts: ["regex escaping", "sort comparators", "NoSQL injection", "input type validation"],
};
