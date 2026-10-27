const userModel = `import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },
});

export default mongoose.model('User', userSchema);
`;

const authMw = `import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(sub);
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
`;

const roleBuggy = `export const requireRole = (role) => (req, res, next) => {
  if (req.user.role = role) {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};
`;

const roleFixed = `export const requireRole = (role) => (req, res, next) => {
  if (req.user && req.user.role === role) {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};
`;

const routesBuggy = `import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.use(requireRole('admin'));
router.use(requireAuth);

router.get('/users', async (req, res) => {
  const users = await User.find().sort({ email: 1 });
  res.json(users);
});

router.delete('/users/:id', async (req, res) => {
  if (req.user._id === req.params.id) {
    return res.status(400).json({ message: 'Admins cannot delete themselves' });
  }
  const gone = await User.findByIdAndDelete(req.params.id);
  if (!gone) return res.status(404).json({ message: 'User not found' });
  res.status(204).end();
});

export default router;
`;

const routesFixed = routesBuggy
  .replace("router.use(requireRole('admin'));\nrouter.use(requireAuth);", "router.use(requireAuth);\nrouter.use(requireRole('admin'));")
  .replace("if (req.user._id === req.params.id) {", "if (req.user._id.equals(req.params.id)) {");

const app = `import express from 'express';
import admin from './routes/admin.js';

const app = express();
app.use(express.json());
app.use('/api/admin', admin);

app.use((err, req, res, next) => {
  res.status(500).json({ message: 'Internal error' });
});

export default app;
`;

const tests = `import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';

let admin, alice;
const bearer = (u) => ({ Authorization: \`Bearer \${jwt.sign({ sub: u.id }, process.env.JWT_SECRET)}\` });

beforeEach(async () => {
  await User.deleteMany({});
  admin = await User.create({ email: 'root@corp.com', role: 'admin' });
  alice = await User.create({ email: 'alice@corp.com' });
});

test('401 without a token', async () => {
  const res = await request(app).get('/api/admin/users');
  expect(res.status).toBe(401);
});

test('403 for a customer', async () => {
  const res = await request(app).get('/api/admin/users').set(bearer(alice));
  expect(res.status).toBe(403);
});

test('a forbidden request must not change the caller\\'s role', async () => {
  await request(app).get('/api/admin/users').set(bearer(alice));
  const res = await request(app).delete(\`/api/admin/users/\${admin.id}\`).set(bearer(alice));
  expect(res.status).toBe(403);
  expect(await User.findById(admin.id)).not.toBeNull();
});

test('admin lists users', async () => {
  const res = await request(app).get('/api/admin/users').set(bearer(admin));
  expect(res.status).toBe(200);
  expect(res.body.map((u) => u.email)).toEqual(['alice@corp.com', 'root@corp.com']);
});

test('admin deletes another user', async () => {
  const res = await request(app).delete(\`/api/admin/users/\${alice.id}\`).set(bearer(admin));
  expect(res.status).toBe(204);
});

test('admin cannot delete themselves', async () => {
  const res = await request(app).delete(\`/api/admin/users/\${admin.id}\`).set(bearer(admin));
  expect(res.status).toBe(400);
  expect(await User.findById(admin.id)).not.toBeNull();
});
`;

export default {
  slug: "rbac-admin",
  order: 9,
  title: "Admin Panel Access Control",
  difficulty: "Medium",
  minutes: 25,
  tagline: "Unauthenticated users crash it; logged-in customers become admins.",
  ticket: `**SEC-140 · P0 · Privilege escalation in admin API**

Pen-test found that **any logged-in customer can call admin endpoints**. Anonymous calls return **500** instead of 401. Separately, an admin managed to **delete their own account**, locking the team out.`,
  env: { JWT_SECRET: "rbac-secret" },
  files: {
    "app.js": app,
    "routes/admin.js": routesBuggy,
    "middleware/requireAuth.js": authMw,
    "middleware/requireRole.js": roleBuggy,
    "models/User.js": userModel,
  },
  tests: { "tests/admin.test.js": tests },
  fixes: { "middleware/requireRole.js": roleFixed, "routes/admin.js": routesFixed },
  bugs: [
    { file: "middleware/requireRole.js", title: "assignment instead of comparison", explain: "`req.user.role = role` *sets* the role and is truthy, so everyone passes and becomes admin in memory. Use `===`." },
    { file: "routes/admin.js", title: "middleware order", explain: "`requireRole` runs before `requireAuth`, so `req.user` is undefined and you get a TypeError and a 500. Authenticate first, then authorise." },
    { file: "routes/admin.js", title: "ObjectId compared with ===", explain: "`req.user._id` is an ObjectId, `req.params.id` is a string, and `===` is never true. Use `.equals()` or compare `String()`s." },
  ],
  hints: ["Read requireRole character by character.", "Which middleware populates req.user?", "typeof req.user._id vs typeof req.params.id?"],
  concepts: ["authn vs authz", "middleware order", "= vs ===", "ObjectId equality"],
};
