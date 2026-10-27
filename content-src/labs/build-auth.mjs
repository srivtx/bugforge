const model = `import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
});

userSchema.methods.verify = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model('User', userSchema);
`;

const stub = `import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// POST /api/auth/signup { email, password }
//  -> 400 { message } if email lacks '@' or password shorter than 8
//  -> 409 if the email is taken (case-insensitive)
//  -> 201 { token, user: { id, email } }  (never return the hash)
export const signup = async (req, res, next) => {
  // TODO
  res.status(501).json({ message: 'not implemented' });
};

// POST /api/auth/login { email, password } -> 200 { token } | 401 { message: 'Invalid credentials' }
export const login = async (req, res, next) => {
  // TODO
  res.status(501).json({ message: 'not implemented' });
};

// Middleware: expects "Authorization: Bearer <token>" signed with process.env.JWT_SECRET (payload { sub: userId }).
// Sets req.user = the user document, else 401 { message: 'Unauthorized' }.
export const requireAuth = async (req, res, next) => {
  // TODO
  res.status(501).json({ message: 'not implemented' });
};
`;

const solution = `import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const issue = (user) => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

// POST /api/auth/signup { email, password }
//  -> 400 { message } if email lacks '@' or password shorter than 8
//  -> 409 if the email is taken (case-insensitive)
//  -> 201 { token, user: { id, email } }  (never return the hash)
export const signup = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ message: 'valid email required' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'password must be at least 8 characters' });
    const normalized = email.trim().toLowerCase();
    if (await User.exists({ email: normalized })) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ email: normalized, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: issue(user), user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login { email, password } -> 200 { token } | 401 { message: 'Invalid credentials' }
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(401).json({ message: 'Invalid credentials' });
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.verify(password))) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ token: issue(user) });
  } catch (err) {
    next(err);
  }
};

// Middleware: expects "Authorization: Bearer <token>" signed with process.env.JWT_SECRET (payload { sub: userId }).
// Sets req.user = the user document, else 401 { message: 'Unauthorized' }.
export const requireAuth = async (req, res, next) => {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(sub);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
`;

const app = `import express from 'express';
import { signup, login, requireAuth } from './controllers/auth.js';

const app = express();
app.use(express.json());
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.get('/api/profile', requireAuth, (req, res) => res.json({ email: req.user.email }));
app.use((err, req, res, next) => res.status(500).json({ message: err.message }));

export default app;
`;

const tests = `import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';

const signup = (b) => request(app).post('/api/auth/signup').send(b);
const login = (b) => request(app).post('/api/auth/login').send(b);
const good = { email: 'Dev@Example.com', password: 'hunter2hunter2' };

beforeEach(async () => {
  await User.deleteMany({});
});

test('signup returns 201, a token and a safe user object', async () => {
  const res = await signup(good);
  expect(res.status).toBe(201);
  expect(typeof res.body.token).toBe('string');
  expect(res.body.user).toEqual({ id: expect.any(String), email: 'dev@example.com' });
});

test('password is stored hashed', async () => {
  await signup(good);
  const u = await User.findOne({ email: 'dev@example.com' });
  expect(u.passwordHash).not.toBe(good.password);
});

test('signup validation', async () => {
  expect((await signup({ email: 'nope', password: 'longenough' })).status).toBe(400);
  expect((await signup({ email: 'a@b.c', password: 'short' })).status).toBe(400);
});

test('duplicate email (different case) -> 409', async () => {
  await signup(good);
  expect((await signup({ ...good, email: 'DEV@example.com' })).status).toBe(409);
});

test('login success and failure', async () => {
  await signup(good);
  expect((await login({ email: 'dev@EXAMPLE.com', password: good.password })).status).toBe(200);
  expect((await login({ email: 'dev@example.com', password: 'wrongwrong' })).status).toBe(401);
  expect((await login({ email: 'ghost@example.com', password: 'whatever1' })).status).toBe(401);
});

test('protected route with a valid token', async () => {
  const { body } = await signup(good);
  const res = await request(app).get('/api/profile').set('Authorization', 'Bearer ' + body.token);
  expect(res.body).toEqual({ email: 'dev@example.com' });
});

test('protected route rejects missing, malformed, forged and expired tokens', async () => {
  const { body } = await signup(good);
  expect((await request(app).get('/api/profile')).status).toBe(401);
  expect((await request(app).get('/api/profile').set('Authorization', body.token)).status).toBe(401);
  const forged = jwt.sign({ sub: body.user.id }, 'not-the-secret');
  expect((await request(app).get('/api/profile').set('Authorization', 'Bearer ' + forged)).status).toBe(401);
  jest.useFakeTimers();
  jest.advanceTimersByTime(2 * 60 * 60 * 1000);
  expect((await request(app).get('/api/profile').set('Authorization', 'Bearer ' + body.token)).status).toBe(401);
  jest.useRealTimers();
});
`;

export default {
  slug: "build-jwt-auth",
  order: 106,
  kind: "build",
  title: "Build: Signup, Login & JWT Middleware",
  difficulty: "Hard",
  minutes: 40,
  tagline: "Implement a complete auth flow: hashing, tokens, expiry and a guard middleware.",
  ticket: `## Spec

Implement \`signup\`, \`login\` and \`requireAuth\` in \`controllers/auth.js\`. Contracts are in the comments.

Available libraries: \`bcryptjs\` (\`hash\`, \`compare\`), \`jsonwebtoken\` (\`sign\`, \`verify\`), and the \`User\` model with a \`verify(password)\` method.

Security checklist the tests enforce: normalise emails, never leak hashes, same **401** message for "no user" and "wrong password" (no user enumeration), reject forged and expired tokens.`,
  env: { JWT_SECRET: "build-lab-secret" },
  files: { "app.js": app, "controllers/auth.js": stub, "models/User.js": model },
  tests: { "tests/auth.test.js": tests },
  fixes: { "controllers/auth.js": solution },
  bugs: [
    { file: "controllers/auth.js", title: "signup", explain: "Validate → normalise email → `User.exists` → 409 → `bcrypt.hash` → create → `jwt.sign({ sub: user.id }, secret, { expiresIn: '1h' })`." },
    { file: "controllers/auth.js", title: "login", explain: "Find by normalised email, `user.verify(password)`, identical 401 on any failure." },
    { file: "controllers/auth.js", title: "requireAuth", explain: "Split the header into scheme + token, `jwt.verify` inside try/catch (throws on bad signature or expiry), load the user, set `req.user`, `next()`." },
  ],
  hints: ["`jwt.verify` throws. Wrap it in try/catch.", "Why should 'unknown email' and 'wrong password' look identical?"],
  concepts: ["password hashing", "JWT", "auth middleware", "user enumeration"],
};
