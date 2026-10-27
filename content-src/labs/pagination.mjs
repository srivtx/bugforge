const model = `import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNo: { type: Number, required: true },
  customer: { type: String, required: true },
  status: { type: String, enum: ['pending', 'shipped', 'delivered'], default: 'pending' },
  placedAt: { type: Number, required: true },
});

export default mongoose.model('Order', orderSchema);
`;

const controllerBuggy = `import Order from '../models/Order.js';

const MAX_LIMIT = 50;

// GET /api/orders?page=1&limit=10&status=shipped
// Newest orders first (by placedAt).
export const listOrders = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const data = await Order.find(filter)
      .sort({ placedAt: 1 })
      .skip(page * limit)
      .limit(limit);

    const total = data.length;
    res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
`;

const controllerFixed = `import Order from '../models/Order.js';

const MAX_LIMIT = 50;

// GET /api/orders?page=1&limit=10&status=shipped
// Newest orders first (by placedAt).
export const listOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [data, total] = await Promise.all([
      Order.find(filter)
        .sort({ placedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
`;

const app = `import express from 'express';
import { listOrders } from './controllers/orderController.js';

const app = express();
app.use(express.json());
app.get('/api/orders', listOrders);

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Order from '../models/Order.js';

beforeEach(async () => {
  await Order.deleteMany({});
  const docs = [];
  for (let i = 1; i <= 23; i++) {
    docs.push({ orderNo: i, customer: 'c' + (i % 4), status: i % 3 === 0 ? 'shipped' : 'pending', placedAt: 1000 + i });
  }
  await Order.insertMany(docs);
});

const nums = (res) => res.body.data.map((o) => o.orderNo);

test('defaults: page 1, 10 items, newest first', async () => {
  const res = await request(app).get('/api/orders');
  expect(res.status).toBe(200);
  expect(nums(res)).toEqual([23, 22, 21, 20, 19, 18, 17, 16, 15, 14]);
});

test('page 2 with limit 5 returns the 6th-10th newest', async () => {
  const res = await request(app).get('/api/orders?page=2&limit=5');
  expect(nums(res)).toEqual([18, 17, 16, 15, 14]);
});

test('metadata uses numbers and counts ALL matching orders', async () => {
  const res = await request(app).get('/api/orders?page=3&limit=10');
  expect(res.body.page).toBe(3);
  expect(res.body.limit).toBe(10);
  expect(res.body.total).toBe(23);
  expect(res.body.totalPages).toBe(3);
  expect(nums(res)).toEqual([3, 2, 1]);
});

test('status filter applies to data and total', async () => {
  const res = await request(app).get('/api/orders?status=shipped&limit=3');
  expect(res.body.total).toBe(7);
  expect(nums(res)).toEqual([21, 18, 15]);
});

test('limit is capped at 50 and garbage falls back to defaults', async () => {
  const res = await request(app).get('/api/orders?limit=1000&page=abc');
  expect(res.body.limit).toBe(50);
  expect(res.body.page).toBe(1);
  expect(res.body.data).toHaveLength(23);
});
`;

export default {
  slug: "orders-pagination",
  order: 4,
  title: "Order History Pagination",
  difficulty: "Easy",
  minutes: 20,
  tagline: "Page 1 is empty, totals are wrong, the oldest orders show first.",
  ticket: `**ORD-77 · Order history page shows the wrong orders**

Customers opening *Your Orders* see an **empty first page** or random old orders. The pager says "1 of 1" even for customers with hundreds of orders. A partner integration also sent \`limit=100000\` and took down a replica.

Spec: newest first by \`placedAt\`; \`page\` is 1-based; \`limit\` defaults to 10 and is capped at 50; \`page\` and \`limit\` in the response are **numbers**; \`total\` counts all matching orders.`,
  env: {},
  files: { "app.js": app, "controllers/orderController.js": controllerBuggy, "models/Order.js": model },
  tests: { "tests/orders.test.js": tests },
  fixes: { "controllers/orderController.js": controllerFixed },
  bugs: [
    { file: "controllers/orderController.js", title: "off-by-one page offset", explain: "With 1-based pages, the skip is `(page - 1) * limit`. `page * limit` skips the whole first page." },
    { file: "controllers/orderController.js", title: "query params are strings", explain: "`req.query.page` is `'2'`, not `2`. Parse with `parseInt` and validate, falling back to defaults on NaN." },
    { file: "controllers/orderController.js", title: "sort direction", explain: "Newest first means descending: `{ placedAt: -1 }`." },
    { file: "controllers/orderController.js", title: "total counts the page, not the collection", explain: "Use `countDocuments(filter)`. You can run it in parallel with the page query via `Promise.all`." },
    { file: "controllers/orderController.js", title: "no limit cap", explain: "Clamp with `Math.min(MAX_LIMIT, …)`. `MAX_LIMIT` was declared but never used." },
  ],
  hints: ["Write out page 1 with limit 10 by hand: which indices should be returned?", "typeof req.query.page?", "Is `data.length` the number of orders or the number on this page?"],
  concepts: ["offset pagination", "query string parsing", "countDocuments", "defensive limits"],
};
