const gateway = `// Fake card processor. Every call to charge() moves real money!
export const ledger = [];

export async function charge({ customerId, amountCents }) {
  await new Promise((r) => setTimeout(r, 5)); // network latency
  const id = 'ch_' + (ledger.length + 1);
  ledger.push({ id, customerId, amountCents });
  return { id, amountCents };
}
`;

const routeBuggy = `import { Router } from 'express';
import { charge } from '../services/gateway.js';

const router = Router();
const responses = new Map(); // idempotency key -> response body

// POST /api/payments  headers: Idempotency-Key   body: { customerId, amount }  (amount in dollars)
router.post('/', async (req, res) => {
  const key = req.headers['Idempotency-Key'];
  if (!key) return res.status(400).json({ message: 'Idempotency-Key header required' });

  if (responses.has(key)) {
    return res.status(200).json(responses.get(key));
  }

  const { customerId, amount } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'amount must be positive' });
  }

  const result = await charge({ customerId, amountCents: amount * 100 });
  const body = { chargeId: result.id, amountCents: result.amountCents };
  responses.set(key, body);
  res.status(201).json(body);
});

export default router;
`;

const routeFixed = `import { Router } from 'express';
import { charge } from '../services/gateway.js';

const router = Router();
const responses = new Map(); // idempotency key -> Promise<response body>

// POST /api/payments  headers: Idempotency-Key   body: { customerId, amount }  (amount in dollars)
router.post('/', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key) return res.status(400).json({ message: 'Idempotency-Key header required' });

  if (responses.has(key)) {
    const body = await responses.get(key);
    return res.status(200).json(body);
  }

  const { customerId, amount } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'amount must be positive' });
  }

  // store the in-flight promise first so concurrent retries share it
  const pending = charge({ customerId, amountCents: Math.round(amount * 100) }).then((result) => ({
    chargeId: result.id,
    amountCents: result.amountCents,
  }));
  responses.set(key, pending);
  try {
    res.status(201).json(await pending);
  } catch (err) {
    responses.delete(key);
    res.status(502).json({ message: 'payment failed' });
  }
});

export default router;
`;

const app = `import express from 'express';
import payments from './routes/payments.js';

const app = express();
app.use(express.json());
app.use('/api/payments', payments);

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import { ledger } from '../services/gateway.js';

const pay = (key, body) => {
  const r = request(app).post('/api/payments');
  if (key) r.set('Idempotency-Key', key);
  return r.send(body);
};

beforeEach(() => {
  ledger.length = 0;
});

test('charges once and returns 201', async () => {
  const res = await pay('k1', { customerId: 'c1', amount: 25 });
  expect(res.status).toBe(201);
  expect(ledger).toHaveLength(1);
});

test('missing key -> 400', async () => {
  const res = await pay(null, { customerId: 'c1', amount: 25 });
  expect(res.status).toBe(400);
});

test('retry with the same key replays the response without charging again', async () => {
  const a = await pay('k2', { customerId: 'c1', amount: 10 });
  const b = await pay('k2', { customerId: 'c1', amount: 10 });
  expect(b.status).toBe(200);
  expect(b.body).toEqual(a.body);
  expect(ledger).toHaveLength(1);
});

test('two CONCURRENT requests with the same key charge only once', async () => {
  const [a, b] = await Promise.all([pay('k3', { customerId: 'c1', amount: 5 }), pay('k3', { customerId: 'c1', amount: 5 })]);
  expect(ledger).toHaveLength(1);
  expect(a.body.chargeId).toBe(b.body.chargeId);
});

test('amounts are exact integer cents', async () => {
  const res = await pay('k4', { customerId: 'c1', amount: 19.99 });
  expect(res.body.amountCents).toBe(1999);
  expect(Number.isInteger(ledger[0].amountCents)).toBe(true);
});
`;

export default {
  slug: "payment-idempotency",
  order: 13,
  title: "Payments: Idempotency & Double Charges",
  difficulty: "Hard",
  minutes: 35,
  tagline: "Mobile retries charge customers twice, and $19.99 becomes 1998.9999 cents.",
  ticket: `**PAY-911 · SEV-2 · Customers double charged**

The mobile client retries \`POST /api/payments\` on timeouts and always sends an \`Idempotency-Key\` header. Customers are still being charged twice, sometimes even when two retries arrive **at the same time**. Finance also found charges with **fractional cents**.

Requirements: same key ⇒ exactly one charge; replays return **200** with the original body; amounts are stored as **integer cents**.`,
  env: {},
  files: { "app.js": app, "routes/payments.js": routeBuggy, "services/gateway.js": gateway },
  tests: { "tests/payments.test.js": tests },
  fixes: { "routes/payments.js": routeFixed },
  bugs: [
    { file: "routes/payments.js", title: "header lookup is case-sensitive", explain: "Node lowercases incoming header names. `req.headers['Idempotency-Key']` is always undefined. Use `req.get('Idempotency-Key')` or the lowercase key." },
    { file: "routes/payments.js", title: "race between check and set", explain: "Both concurrent requests pass `responses.has(key)` before either finishes `await charge()`. Store the **in-flight promise** before awaiting, so the second request awaits the same one." },
    { file: "routes/payments.js", title: "floating-point cents", explain: "`19.99 * 100 === 1998.9999999999998`. Use `Math.round(amount * 100)`. Money should be integers in the smallest unit." },
  ],
  hints: ["Log Object.keys(req.headers).", "Between `responses.has` and `responses.set` there is an `await`. What can happen during it?", "Type 19.99 * 100 in a JS console."],
  concepts: ["idempotency keys", "check-then-act races", "promise memoization", "money as integers"],
};
