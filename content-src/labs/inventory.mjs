const model = `import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  stock: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
});

export default mongoose.model('Product', productSchema);
`;

const controllerBuggy = `import Product from '../models/Product.js';

export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// body: { delta: number }  (negative = items shipped, positive = restock)
export const adjustStock = async (req, res, next) => {
  try {
    const delta = Number(req.body.delta);
    if (!Number.isInteger(delta) || delta === 0) {
      return res.status(400).json({ message: 'delta must be a non-zero integer' });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { stock: delta } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};
`;

const controllerFixed = controllerBuggy.replace(
  `    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { stock: delta } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);`,
  `    // atomic guard: only decrement when enough stock exists
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, stock: { $gte: delta < 0 ? -delta : 0 } },
      { $inc: { stock: delta } },
      { new: true }
    );
    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) return res.status(404).json({ message: 'Product not found' });
      return res.status(409).json({ message: 'Insufficient stock' });
    }
    res.json(product);`
);

const errorBuggy = `// Central error handler: maps known errors to HTTP responses.
export const errorHandler = (err, req, res) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation failed', details: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate SKU' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
`;

const errorFixed = `// Central error handler: maps known errors to HTTP responses.
export const errorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation failed', details: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid product id' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate SKU' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
`;

const app = `import express from 'express';
import { createProduct, getProduct, adjustStock } from './controllers/productController.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(express.json());

app.post('/api/products', createProduct);
app.get('/api/products/:id', getProduct);
app.patch('/api/products/:id/stock', adjustStock);

app.use(errorHandler);

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';

let p;
beforeEach(async () => {
  await Product.deleteMany({});
  p = await Product.create({ sku: 'SPK-4', name: 'Smart Speaker', stock: 5, price: 49 });
});

describe('validation & error mapping', () => {
  test('missing fields -> 400 JSON', async () => {
    const res = await request(app).post('/api/products').send({ sku: 'X1' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  test('duplicate sku -> 409', async () => {
    const res = await request(app).post('/api/products').send({ sku: 'SPK-4', name: 'dup', stock: 1, price: 1 });
    expect(res.status).toBe(409);
  });

  test('malformed id -> 400 Invalid product id', async () => {
    const res = await request(app).get('/api/products/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid product id' });
  });
});

describe('PATCH /stock', () => {
  test('returns the UPDATED stock', async () => {
    const res = await request(app).patch(\`/api/products/\${p.id}/stock\`).send({ delta: -2 });
    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(3);
  });

  test('cannot go below zero (409) and stock is unchanged', async () => {
    const res = await request(app).patch(\`/api/products/\${p.id}/stock\`).send({ delta: -6 });
    expect(res.status).toBe(409);
    const fresh = await Product.findById(p.id);
    expect(fresh.stock).toBe(5);
  });

  test('restock works', async () => {
    const res = await request(app).patch(\`/api/products/\${p.id}/stock\`).send({ delta: 10 });
    expect(res.body.stock).toBe(15);
  });

  test('unknown product -> 404', async () => {
    const res = await request(app).patch('/api/products/65f000000000000000000000/stock').send({ delta: 1 });
    expect(res.status).toBe(404);
  });
});
`;

export default {
  slug: "inventory-errors",
  order: 3,
  title: "Inventory Stock & Error Handling",
  difficulty: "Medium",
  minutes: 30,
  tagline: "The error handler never runs and stock goes negative.",
  ticket: `**INV-431 · Overselling during peak-sale load test**

During the load test the warehouse dashboard showed **negative stock** for several SKUs, and the stock endpoint shows numbers that are always **one update behind**. Clients also report that bad input returns an **HTML 500 page** instead of our JSON error format.

Expected behaviour:
- \`PATCH /api/products/:id/stock\` returns the **new** document. If shipping would push stock below 0, respond **409** and leave stock untouched (it must be safe under concurrency).
- Malformed ids return **400** \`{ message: 'Invalid product id' }\`.

**Definition of done:** \`tests/inventory.test.js\` is green.`,
  env: {},
  files: {
    "app.js": app,
    "controllers/productController.js": controllerBuggy,
    "middleware/errorHandler.js": errorBuggy,
    "models/Product.js": model,
  },
  tests: { "tests/inventory.test.js": tests },
  fixes: {
    "controllers/productController.js": controllerFixed,
    "middleware/errorHandler.js": errorFixed,
  },
  bugs: [
    { file: "middleware/errorHandler.js", title: "error handler has 3 parameters", explain: "Express recognises an error handler **only** by arity 4: `(err, req, res, next)`. With 3 params it's treated as a normal middleware, so errors fall through to Express's default HTML 500." },
    { file: "middleware/errorHandler.js", title: "CastError isn't mapped", explain: "A malformed ObjectId throws `CastError` from Mongoose. Map it to 400." },
    { file: "controllers/productController.js", title: "findByIdAndUpdate returns the OLD document", explain: "Mongoose returns the pre-update doc unless you pass `{ new: true }`." },
    { file: "controllers/productController.js", title: "no stock guard (and read-then-write is racy)", explain: "Put the guard *inside* the update filter: `{ _id, stock: { $gte: needed } }`. That's atomic, so two concurrent orders can't both pass." },
  ],
  hints: [
    "Count the parameters of the error handler. How does Express tell an error handler apart?",
    "What does findByIdAndUpdate return by default: the doc before or after?",
    "Checking stock first and updating second is a race. Can the filter do the check?",
  ],
  concepts: ["error middleware arity", "CastError", "{ new: true }", "atomic conditional updates", "race conditions"],
};
