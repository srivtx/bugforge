const model = `import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  clicks: { type: Number, default: 0 },
});

export default mongoose.model('Link', linkSchema);
`;

const controllerBuggy = `import Link from '../models/Link.js';

const makeCode = () => Math.random().toString(36).substring(2, 2);

const isHttpUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// POST /api/links { url } -> 201 { code, url } (or 200 with the existing code)
export const shorten = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!isHttpUrl(url)) return res.status(400).json({ message: 'A valid http(s) url is required' });

    const link = await Link.create({ code: makeCode(), url });
    res.status(201).json({ code: link.code, url: link.url });
  } catch (err) {
    next(err);
  }
};

// GET /:code -> 302 redirect and count the click
export const redirect = async (req, res, next) => {
  try {
    const link = await Link.findOne({ code: req.params.code });
    if (!link) return res.status(404).json({ message: 'Unknown code' });
    link.clicks + 1;
    await link.save();
    res.redirect(301, link.url);
  } catch (err) {
    next(err);
  }
};

// GET /api/links/:code/stats -> { code, url, clicks }
export const stats = async (req, res) => {
  const link = await Link.findOne({ code: req.params.code });
  if (!link) return res.status(404).json({ message: 'Unknown code' });
  res.json({ code: link.code, url: link.url, clicks: link.clicks });
};
`;

const controllerFixed = controllerBuggy
  .replace("substring(2, 2)", "substring(2, 9)")
  .replace(
    "    const link = await Link.create({ code: makeCode(), url });",
    "    const existing = await Link.findOne({ url });\n    if (existing) return res.status(200).json({ code: existing.code, url: existing.url });\n\n    const link = await Link.create({ code: makeCode(), url });"
  )
  .replace("    link.clicks + 1;\n    await link.save();", "    await Link.updateOne({ _id: link._id }, { $inc: { clicks: 1 } });")
  .replace("res.redirect(301, link.url);", "res.redirect(302, link.url);");

const app = `import express from 'express';
import { shorten, redirect, stats } from './controllers/linkController.js';

const app = express();
app.use(express.json());

app.post('/api/links', shorten);
app.get('/api/links/:code/stats', stats);
app.get('/:code', redirect);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: 'Internal error' });
});

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Link from '../models/Link.js';

beforeEach(async () => {
  await Link.deleteMany({});
});

const shorten = (url) => request(app).post('/api/links').send({ url });

test('creates a non-empty code', async () => {
  const res = await shorten('https://aws.amazon.com/s3/');
  expect(res.status).toBe(201);
  expect(res.body.code.length).toBeGreaterThanOrEqual(6);
});

test('different urls get different codes', async () => {
  const a = await shorten('https://a.example.com');
  const b = await shorten('https://b.example.com');
  expect(b.status).toBe(201);
  expect(a.body.code).not.toBe(b.body.code);
});

test('same url returns the existing code with 200', async () => {
  const a = await shorten('https://dup.example.com');
  const b = await shorten('https://dup.example.com');
  expect(b.status).toBe(200);
  expect(b.body.code).toBe(a.body.code);
  expect(await Link.countDocuments({})).toBe(1);
});

test('rejects non-http urls', async () => {
  expect((await shorten('javascript:alert(1)')).status).toBe(400);
  expect((await shorten('not a url')).status).toBe(400);
});

test('redirect is a temporary 302 to the target', async () => {
  const { body } = await shorten('https://example.com/deals');
  const res = await request(app).get('/' + body.code);
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe('https://example.com/deals');
});

test('clicks are counted', async () => {
  const { body } = await shorten('https://example.com/count');
  await request(app).get('/' + body.code);
  await request(app).get('/' + body.code);
  const res = await request(app).get(\`/api/links/\${body.code}/stats\`);
  expect(res.body.clicks).toBe(2);
});
`;

export default {
  slug: "url-shortener",
  order: 10,
  title: "URL Shortener Service",
  difficulty: "Easy",
  minutes: 20,
  tagline: "The second link ever created crashes the service.",
  ticket: `**LNK-4 · Shortener fails after the first link**

Marketing can create exactly **one** short link; every later request returns 500. Clicks always show **0**, and browsers cache the redirect forever, which breaks link edits.

Spec: codes ≥ 6 chars; re-shortening an existing URL returns the **same code with 200**; redirects are **302**; each visit increments \`clicks\`.`,
  env: {},
  files: { "app.js": app, "controllers/linkController.js": controllerBuggy, "models/Link.js": model },
  tests: { "tests/links.test.js": tests },
  fixes: { "controllers/linkController.js": controllerFixed },
  bugs: [
    { file: "controllers/linkController.js", title: "substring(2, 2) is always empty", explain: "Every code is `''`, so the unique index throws E11000 on the 2nd insert. Use `substring(2, 9)`." },
    { file: "controllers/linkController.js", title: "`link.clicks + 1` is a no-op", explain: "The expression is computed and thrown away. Better still, use an atomic `$inc` so concurrent clicks aren't lost." },
    { file: "controllers/linkController.js", title: "301 vs 302", explain: "301 is permanent and browsers cache it. Editable links need 302." },
    { file: "controllers/linkController.js", title: "no idempotency for duplicate urls", explain: "Look up an existing link by url first and return it with 200." },
  ],
  hints: ["What does 'abcdef'.substring(2, 2) return?", "Is there an assignment in `link.clicks + 1`?", "Which redirect status do browsers cache permanently?"],
  concepts: ["unique indexes", "atomic $inc", "HTTP redirects", "idempotency"],
};
