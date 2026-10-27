const pricingBuggy = `// Pricing rules for the checkout service.
// subtotal = sum(price * qty)
// discount = coupon percent of subtotal
// tax      = 8% of (subtotal - discount)
// total    = subtotal - discount + tax
// All money values are rounded to 2 decimals and returned as numbers.

export const COUPONS = {
  SAVE10: { percent: 10 },
  PRIME20: { percent: 20, minSubtotal: 100 },
};

export const TAX_RATE = 0.08;

const round2 = (n) => n.toFixed(2);

export function priceCart(items, couponCode) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty);

  let discount = 0;
  const coupon = COUPONS[couponCode];
  if (coupon && subtotal > coupon.minSubtotal) {
    discount = subtotal * coupon.percent;
  }

  const tax = subtotal * TAX_RATE;
  const total = subtotal - discount + tax;

  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    total: round2(total),
  };
}
`;

const pricingFixed = `// Pricing rules for the checkout service.
// subtotal = sum(price * qty)
// discount = coupon percent of subtotal
// tax      = 8% of (subtotal - discount)
// total    = subtotal - discount + tax
// All money values are rounded to 2 decimals and returned as numbers.

export const COUPONS = {
  SAVE10: { percent: 10 },
  PRIME20: { percent: 20, minSubtotal: 100 },
};

export const TAX_RATE = 0.08;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function priceCart(items, couponCode) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  let discount = 0;
  const coupon = COUPONS[couponCode];
  if (coupon && subtotal >= (coupon.minSubtotal ?? 0)) {
    discount = (subtotal * coupon.percent) / 100;
  }

  const tax = (subtotal - discount) * TAX_RATE;
  const total = subtotal - discount + tax;

  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    total: round2(total),
  };
}
`;

const routeBuggy = `import { Router } from 'express';
import { priceCart } from '../services/pricing.js';

const router = Router();

// POST /api/checkout/quote  { items: [{ sku, price, qty }], coupon? }
router.post('/quote', (req, res) => {
  const { items, coupon } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'items must be an array' });
  }
  for (const it of items) {
    if (it.qty <= 0 || it.price < 0) {
      return res.status(400).json({ message: 'invalid line item' });
    }
  }
  res.json(priceCart(items, coupon));
});

export default router;
`;

const routeFixed = routeBuggy
  .replace("if (!Array.isArray(items)) {", "if (!Array.isArray(items) || items.length === 0) {")
  .replace("if (it.qty <= 0 || it.price < 0) {", "if (!Number.isInteger(it.qty) || it.qty <= 0 || typeof it.price !== 'number' || it.price < 0) {");

const app = `import express from 'express';
import checkout from './routes/checkout.js';

const app = express();
app.use(express.json());
app.use('/api/checkout', checkout);

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import { priceCart } from '../services/pricing.js';

const quote = (body) => request(app).post('/api/checkout/quote').send(body);

describe('priceCart (unit)', () => {
  test('sums line items', () => {
    const r = priceCart([{ sku: 'a', price: 10, qty: 2 }, { sku: 'b', price: 5.5, qty: 1 }]);
    expect(r.subtotal).toBe(25.5);
  });

  test('money values are numbers rounded to cents', () => {
    const r = priceCart([{ sku: 'a', price: 0.1, qty: 3 }]);
    expect(r.subtotal).toBe(0.3);
    expect(typeof r.total).toBe('number');
  });

  test('SAVE10 takes 10% off and tax applies AFTER discount', () => {
    const r = priceCart([{ sku: 'a', price: 50, qty: 1 }], 'SAVE10');
    expect(r).toEqual({ subtotal: 50, discount: 5, tax: 3.6, total: 48.6 });
  });

  test('PRIME20 applies at exactly the minimum subtotal', () => {
    const r = priceCart([{ sku: 'a', price: 100, qty: 1 }], 'PRIME20');
    expect(r.discount).toBe(20);
    expect(r.total).toBe(86.4);
  });

  test('unknown coupon is ignored', () => {
    const r = priceCart([{ sku: 'a', price: 10, qty: 1 }], 'FREE');
    expect(r.discount).toBe(0);
    expect(r.total).toBe(10.8);
  });
});

describe('POST /api/checkout/quote', () => {
  test('happy path', async () => {
    const res = await quote({ items: [{ sku: 'k', price: 19.99, qty: 3 }] });
    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe(59.97);
    expect(res.body.total).toBe(64.77);
  });

  test('empty cart -> 400', async () => {
    const res = await quote({ items: [] });
    expect(res.status).toBe(400);
  });

  test('qty must be a positive integer (strings rejected)', async () => {
    const res = await quote({ items: [{ sku: 'k', price: 1, qty: '2' }] });
    expect(res.status).toBe(400);
  });
});
`;

export default {
  slug: "checkout-math",
  order: 5,
  title: "Checkout Pricing Engine",
  difficulty: "Easy",
  minutes: 20,
  tagline: "Totals come back as strings and coupons give 1000% off.",
  ticket: `**CHK-19 · Customers charged wrong amounts**

Finance flagged quotes where a 10% coupon produced a **negative total**, tax was computed **before** the discount, and the mobile app crashed because money fields arrived as **strings** (\`"48.60"\`). A malformed request with \`qty: "2"\` was accepted too.

Pricing rules are documented at the top of \`services/pricing.js\`. Make the tests pass.`,
  env: {},
  files: { "app.js": app, "routes/checkout.js": routeBuggy, "services/pricing.js": pricingBuggy },
  tests: { "tests/checkout.test.js": tests },
  fixes: { "services/pricing.js": pricingFixed, "routes/checkout.js": routeFixed },
  bugs: [
    { file: "services/pricing.js", title: "reduce without an initial value", explain: "Without `0` as the seed, the first accumulator is the first *item object*, so you get `'[object Object]11'`-style garbage." },
    { file: "services/pricing.js", title: "percent used as a fraction", explain: "`percent: 10` means 10%, so divide by 100." },
    { file: "services/pricing.js", title: "minSubtotal comparison", explain: "`subtotal > undefined` is always false, so SAVE10 never applied, and 'at least 100' means `>=`. Default the minimum with `?? 0`." },
    { file: "services/pricing.js", title: "tax base and string rounding", explain: "Tax applies to `subtotal - discount`. `toFixed` returns a **string**, so round with `Math.round(n * 100) / 100`." },
    { file: "routes/checkout.js", title: "weak validation", explain: "Reject empty carts and non-integer quantities. `'2' <= 0` is false, so string quantities slipped through." },
  ],
  hints: ["What is the accumulator on the first iteration of reduce with no seed?", "What type does Number.prototype.toFixed return?", "Compare `5 > undefined` in the console."],
  concepts: ["reduce seed", "floating point money", "type coercion", "input validation"],
};
