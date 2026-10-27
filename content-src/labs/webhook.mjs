const sig = `// Signature scheme used by the payment provider:
//   header  x-signature: t=<unix seconds>,v1=<digest>
//   digest  = hash(secret + '.' + t + '.' + rawBody)
export const hash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
};

export const sign = (secret, t, body) => \`t=\${t},v1=\${hash(secret + '.' + t + '.' + body)}\`;
`;

const verifyBuggy = `import { hash } from './signature.js';

const TOLERANCE_SECONDS = 300;

export const verifySignature = (secret) => (req, res, next) => {
  const header = req.get('x-signature') || '';
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  const t = parts.t;
  const expected = hash(secret + '.' + t + '.' + JSON.stringify(req.body));

  if (Math.abs(Date.now() - t) > TOLERANCE_SECONDS) {
    return res.status(401).json({ error: 'stale' });
  }
  if (parts.v1 !== expected) {
    res.status(401).json({ error: 'bad signature' });
  }
  next();
};
`;

const verifyFixed = `import { hash } from './signature.js';

const TOLERANCE_SECONDS = 300;

export const verifySignature = (secret) => (req, res, next) => {
  const header = req.get('x-signature') || '';
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  const t = Number(parts.t);
  const expected = hash(secret + '.' + t + '.' + JSON.stringify(req.body));

  if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) {
    return res.status(401).json({ error: 'stale' });
  }
  if (parts.v1 !== expected) {
    return res.status(401).json({ error: 'bad signature' });
  }
  next();
};
`;

const routesBuggy = `import { Router } from 'express';
import Order from '../models/Order.js';
import { verifySignature } from '../lib/verify.js';

const router = Router();

router.post('/payments', verifySignature(process.env.WEBHOOK_SECRET), async (req, res) => {
  const { type, data } = req.body;
  switch (type) {
    case 'payment.succeeded':
      await Order.findByIdAndUpdate(data.orderId, { status: 'paid' });
    case 'payment.refunded':
      await Order.findByIdAndUpdate(data.orderId, { status: 'refunded' });
      break;
    default:
      return res.status(400).json({ error: \`unhandled event \${type}\` });
  }
  res.json({ received: true });
});

export default router;
`;

const routesFixed = routesBuggy
  .replace("{ status: 'paid' });\n", "{ status: 'paid' });\n      break;\n")
  .replace("      return res.status(400).json({ error: `unhandled event ${type}` });", "      // Acknowledge events we don't care about, or the provider retries them forever.\n      return res.json({ received: true, ignored: true });");

const model = `import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  total: Number,
  status: { type: String, default: 'pending' },
});

export default mongoose.model('Order', orderSchema);
`;

const app = `import express from 'express';
import webhooks from './routes/webhooks.js';

const app = express();
app.use(express.json());
app.use('/webhooks', webhooks);

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Order from '../models/Order.js';
import { sign } from '../lib/signature.js';

const SECRET = 'whsec_test';
const now = () => Math.floor(Date.now() / 1000);

const deliver = (event, { t = now(), secret = SECRET } = {}) =>
  request(app)
    .post('/webhooks/payments')
    .set('x-signature', sign(secret, t, JSON.stringify(event)))
    .send(event);

let order;
beforeEach(async () => {
  await Order.deleteMany({});
  order = await Order.create({ total: 4200 });
});

test('a valid payment.succeeded marks the order paid', async () => {
  const res = await deliver({ type: 'payment.succeeded', data: { orderId: order.id } });
  expect(res.status).toBe(200);
  expect((await Order.findById(order.id)).status).toBe('paid');
});

test('payment.refunded marks the order refunded', async () => {
  await deliver({ type: 'payment.refunded', data: { orderId: order.id } });
  expect((await Order.findById(order.id)).status).toBe('refunded');
});

test('a forged signature is rejected and changes nothing', async () => {
  const res = await deliver({ type: 'payment.succeeded', data: { orderId: order.id } }, { secret: 'guess' });
  expect(res.status).toBe(401);
  expect((await Order.findById(order.id)).status).toBe('pending');
});

test('a replayed event older than 5 minutes is rejected', async () => {
  const res = await deliver({ type: 'payment.succeeded', data: { orderId: order.id } }, { t: now() - 600 });
  expect(res.status).toBe(401);
});

test('unknown event types are acknowledged with 200', async () => {
  const res = await deliver({ type: 'customer.updated', data: {} });
  expect(res.status).toBe(200);
});
`;

export default {
  slug: "webhook-receiver",
  order: 18,
  title: "Payment Webhook Receiver",
  difficulty: "Hard",
  minutes: 30,
  tagline: "Every webhook is rejected, forged ones get through, and paid orders show as refunded.",
  ticket: `**PAY-310 · Payment provider is disabling our webhook endpoint**

The provider's dashboard shows **100% failures** for \`POST /webhooks/payments\` and threatens to disable it. Their docs:

- Each delivery has \`x-signature: t=<unix seconds>,v1=<digest>\` (see \`lib/signature.js\`). Reject a bad digest or a timestamp more than **5 minutes** away with **401**.
- Respond **2xx** to every authentic event, **including types you don't handle**. Anything else is retried with backoff for 3 days.

Security also found that a request with a garbage signature **still updated an order**. And on the rare day something got through, paid orders showed as **refunded**.

The webhook secret is \`process.env.WEBHOOK_SECRET\`.`,
  env: { WEBHOOK_SECRET: "whsec_test" },
  files: { "app.js": app, "routes/webhooks.js": routesBuggy, "lib/verify.js": verifyBuggy, "lib/signature.js": sig, "models/Order.js": model },
  tests: { "tests/webhooks.test.js": tests },
  fixes: { "lib/verify.js": verifyFixed, "routes/webhooks.js": routesFixed },
  bugs: [
    { file: "lib/verify.js", title: "milliseconds vs seconds", explain: "`Date.now()` is in **milliseconds**; the header's `t` is in **seconds**. The difference is always about 1.7 trillion, so every event looked stale. Compare `Date.now() / 1000` with `Number(t)`." },
    { file: "lib/verify.js", title: "missing return after 401", explain: "Without `return`, the middleware sends 401 **and then calls `next()`**, so the handler still runs and updates the order. In real Express this also triggers \"headers already sent\"." },
    { file: "routes/webhooks.js", title: "switch fall-through", explain: "`case 'payment.succeeded'` has no `break`, so execution falls into the refunded case and overwrites `paid` with `refunded`." },
    { file: "routes/webhooks.js", title: "non-2xx for unknown events", explain: "Providers retry any non-2xx. Acknowledge events you don't handle with 200, or one new event type fills your logs and gets the endpoint disabled." },
  ],
  hints: ["Log `Date.now()` next to the header's t value.", "After `res.status(401).json(...)`, what runs next?", "Read the switch statement aloud. Where does the first case stop?"],
  concepts: ["webhook signatures", "replay protection", "seconds vs ms", "switch fall-through", "acknowledge unknown events"],
};
