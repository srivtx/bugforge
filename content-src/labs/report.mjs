const model = `import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  amountCents: Number,
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
  createdAt: Date,
});

export default mongoose.model('Sale', saleSchema);
`;

const reportBuggy = `// Groups sales into UTC calendar buckets. All dates are handled in UTC.
const pad = (n) => String(n).padStart(2, '0');

export const bucketKey = (date, by) => {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth());
  return by === 'month' ? \`\${y}-\${m}\` : \`\${y}-\${m}-\${pad(date.getUTCDate())}\`;
};

export const summarize = (sales, by) => {
  const buckets = {};
  for (const s of sales) {
    const key = bucketKey(s.createdAt, by);
    buckets[key] = buckets[key] || { totalCents: 0, count: 0 };
    buckets[key].totalCents += s.amountCents;
    buckets[key].count += 1;
  }
  return Object.keys(buckets)
    .sort()
    .map((key) => ({
      key,
      totalCents: buckets[key].totalCents,
      avgCents: Math.round(buckets[key].totalCents / sales.length),
    }));
};
`;

const reportFixed = reportBuggy
  .replace("const m = pad(date.getUTCMonth());", "const m = pad(date.getUTCMonth() + 1);")
  .replace("buckets[key].totalCents / sales.length", "buckets[key].totalCents / buckets[key].count");

const routesBuggy = `import { Router } from 'express';
import Sale from '../models/Sale.js';
import { summarize } from '../lib/report.js';

const router = Router();

// GET /api/reports/sales?from=2024-03-01&to=2024-03-31&by=day
// "to" is inclusive: the whole of that day is part of the report.
router.get('/sales', async (req, res) => {
  const { from, to, by = 'day' } = req.query;
  const sales = await Sale.find({
    createdAt: { $gte: new Date(from), $lte: new Date(to) },
  });
  res.json(summarize(sales, by));
});

export default router;
`;

const routesFixed = routesBuggy.replace(
  "  const sales = await Sale.find({\n    createdAt: { $gte: new Date(from), $lte: new Date(to) },\n  });",
  "  const end = new Date(to);\n  end.setUTCDate(end.getUTCDate() + 1); // first instant AFTER the inclusive day\n  const sales = await Sale.find({\n    status: 'completed',\n    createdAt: { $gte: new Date(from), $lt: end },\n  });"
);

const app = `import express from 'express';
import reports from './routes/reports.js';

const app = express();
app.use('/api/reports', reports);

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Sale from '../models/Sale.js';

const at = (iso, amountCents, status = 'completed') => ({ createdAt: new Date(iso), amountCents, status });

beforeEach(async () => {
  await Sale.deleteMany({});
  await Sale.insertMany([
    at('2024-03-01T09:00:00Z', 1000),
    at('2024-03-01T17:30:00Z', 3000),
    at('2024-03-02T08:00:00Z', 500),
    at('2024-03-02T12:00:00Z', 9900, 'cancelled'),
    at('2024-03-31T21:15:00Z', 2000),
    at('2024-04-01T00:00:00Z', 7777),
  ]);
});

const get = (q) => request(app).get('/api/reports/sales?' + q);

test('daily keys use real month numbers (March = 03)', async () => {
  const res = await get('from=2024-03-01&to=2024-03-02&by=day');
  expect(res.body.map((r) => r.key)).toEqual(['2024-03-01', '2024-03-02']);
});

test('average is per bucket', async () => {
  const res = await get('from=2024-03-01&to=2024-03-01&by=day');
  expect(res.body).toEqual([{ key: '2024-03-01', totalCents: 4000, avgCents: 2000 }]);
});

test('cancelled sales are excluded', async () => {
  const res = await get('from=2024-03-02&to=2024-03-02&by=day');
  expect(res.body[0].totalCents).toBe(500);
});

test('"to" includes the whole last day, but not the next one', async () => {
  const res = await get('from=2024-03-01&to=2024-03-31&by=month');
  expect(res.body).toEqual([{ key: '2024-03', totalCents: 6500, avgCents: 1625 }]);
});
`;

export default {
  slug: "sales-report",
  order: 19,
  title: "Monthly Sales Report",
  difficulty: "Medium",
  minutes: 25,
  tagline: "March shows up as February, the last day of the month vanishes, and averages are tiny.",
  ticket: `**FIN-88 · Finance doesn't trust the dashboard**

The sales report (\`GET /api/reports/sales?from=…&to=…&by=day|month\`) disagrees with the bank statement:

- The March report is labelled **2024-02**.
- Sales on **the last day** of a range are missing (\`to\` is meant to be inclusive).
- **Cancelled** sales are counted as revenue.
- The average sale per day is far too small on busy reports.

Everything is in UTC. Amounts are integer cents.`,
  env: {},
  files: { "app.js": app, "routes/reports.js": routesBuggy, "lib/report.js": reportBuggy, "models/Sale.js": model },
  tests: { "tests/report.test.js": tests },
  fixes: { "lib/report.js": reportFixed, "routes/reports.js": routesFixed },
  bugs: [
    { file: "lib/report.js", title: "zero-based month", explain: "`getUTCMonth()` returns 0–11. Add 1 before formatting." },
    { file: "lib/report.js", title: "average divides by the wrong count", explain: "Each bucket's average must divide by **that bucket's** count, not by the number of sales in the whole report." },
    { file: "routes/reports.js", title: "inclusive end date at midnight", explain: "`new Date('2024-03-31')` is **00:00** on the 31st, so `$lte` drops everything later that day. Use `$lt` with the start of the **next** day." },
    { file: "routes/reports.js", title: "cancelled sales counted", explain: "Filter on `status: 'completed'` in the query." },
  ],
  hints: ["What does `new Date(2024, 0, 1).getMonth()` return?", "A date string with no time is which instant?", "Compute the average of one bucket by hand."],
  concepts: ["zero-based months", "inclusive date ranges", "UTC bucketing", "per-group aggregates"],
};
