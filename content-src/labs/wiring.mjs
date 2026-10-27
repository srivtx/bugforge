const model = `import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
});

export default mongoose.model('User', userSchema);
`;

const routesBuggy = `import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

// fake auth: the gateway puts the caller id in x-user-id
const currentUser = (req, res, next) => {
  req.userId = req.get('x-user-id');
  next();
};

router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/me', currentUser, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
`;

const routesFixed = `import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

// fake auth: the gateway puts the caller id in x-user-id
const currentUser = (req, res, next) => {
  req.userId = req.get('x-user-id');
  next();
};

router.get('/me', currentUser, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
`;

const appBuggy = `import express from 'express';
import users from './routes/users.js';

const app = express();

app.use((req, res) => {
  res.status(404).json({ message: \`No route for \${req.method} \${req.path}\` });
});

app.use('/api/users', users);

app.use((err, req, res, next) => {
  const status = err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500;
  res.status(status).json({ message: err.message });
});

export default app;
`;

const appFixed = `import express from 'express';
import users from './routes/users.js';

const app = express();
app.use(express.json());

app.use('/api/users', users);

app.use((req, res) => {
  res.status(404).json({ message: \`No route for \${req.method} \${req.path}\` });
});

app.use((err, req, res, next) => {
  const status = err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500;
  res.status(status).json({ message: err.message });
});

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';

let ana;
beforeEach(async () => {
  await User.deleteMany({});
  ana = await User.create({ name: 'Ana', email: 'ana@shop.com' });
});

test('GET /api/users/:id returns the user', async () => {
  const res = await request(app).get(\`/api/users/\${ana.id}\`);
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Ana');
});

test('GET /api/users/me resolves the caller, not a user with id "me"', async () => {
  const res = await request(app).get('/api/users/me').set('x-user-id', ana.id);
  expect(res.status).toBe(200);
  expect(res.body.email).toBe('ana@shop.com');
});

test('POST /api/users reads the JSON body', async () => {
  const res = await request(app).post('/api/users').send({ name: 'Bo', email: 'bo@shop.com' });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Bo');
});

test('invalid body -> 400', async () => {
  const res = await request(app).post('/api/users').send({ name: 'NoEmail' });
  expect(res.status).toBe(400);
});

test('unknown route -> JSON 404', async () => {
  const res = await request(app).get('/api/nope');
  expect(res.status).toBe(404);
  expect(res.body.message).toMatch(/No route/);
});
`;

export default {
  slug: "express-wiring",
  order: 11,
  title: "Express Wiring & Route Order",
  difficulty: "Easy",
  minutes: 15,
  tagline: "Every endpoint answers 404 and /me is treated as a user id.",
  ticket: `**PLAT-3 · New users service returns 404 for everything**

A new microservice was scaffolded by an intern. Every request returns **404 "No route…"**, and when that was briefly hot-patched, \`GET /api/users/me\` blew up with a CastError and \`POST\` created users with no fields.

Fix the app wiring. Don't change the response formats.`,
  env: {},
  files: { "app.js": appBuggy, "routes/users.js": routesBuggy, "models/User.js": model },
  tests: { "tests/users.test.js": tests },
  fixes: { "app.js": appFixed, "routes/users.js": routesFixed },
  bugs: [
    { file: "app.js", title: "404 catch-all mounted before the routes", explain: "Express matches in registration order. A middleware with no path matches **everything**, so it must come after all routers." },
    { file: "app.js", title: "express.json() missing", explain: "Without the body parser `req.body` is `undefined`, so `User.create(undefined)` fails validation." },
    { file: "routes/users.js", title: "`/:id` shadows `/me`", explain: "`/:id` also matches `/me` (id = 'me' → CastError). Register static paths before parameterised ones." },
  ],
  hints: ["Express walks middleware/routes top to bottom. What matches first?", "What is req.body without a body-parsing middleware?", "Which route pattern does '/me' match first?"],
  concepts: ["registration order", "body parsing", "route shadowing", "404 handlers"],
};
