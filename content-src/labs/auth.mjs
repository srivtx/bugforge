const userModelBuggy = `import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
});

// hash the password before every save
userSchema.pre('save', async () => {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(this.password, plain);
};

export default mongoose.model('User', userSchema);
`;

const userModelFixed = `import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

// hash the password before every save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);
`;

const controllerBuggy = `import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const sign = (user) => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password });
    res.status(201).json({ user, token: sign(user) });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ token: sign(user) });
  } catch (err) {
    next(err);
  }
};

export const me = (req, res) => {
  res.json({ user: req.user });
};
`;

const controllerFixed = controllerBuggy
  .replace("const exists = await User.findOne({ email });", "const exists = await User.findOne({ email: String(email).toLowerCase().trim() });")
  .replace("const user = await User.findOne({ email });", "const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });");

const requireAuthBuggy = `import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Missing token' });
  }
  try {
    const token = header.split(' ')[0];
    const payload = jwt.verify(token, process.env.JWT_SECRT);
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
`;

const requireAuthFixed = requireAuthBuggy
  .replace("header.split(' ')[0]", "header.split(' ')[1]")
  .replace("process.env.JWT_SECRT", "process.env.JWT_SECRET");

const routes = `import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);

export default router;
`;

const app = `import express from 'express';
import authRoutes from './routes/authRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal error' });
});

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';

const alice = { name: 'Alice', email: 'Alice@Example.com', password: 'correct-horse' };

beforeEach(async () => {
  await User.deleteMany({});
});

describe('register', () => {
  test('creates a user and never stores the plain password', async () => {
    const res = await request(app).post('/api/auth/register').send(alice);
    expect(res.status).toBe(201);
    const stored = await User.findOne({ email: 'alice@example.com' });
    expect(stored).not.toBeNull();
    expect(stored.password).not.toBe(alice.password);
  });

  test('response does not leak the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(alice);
    expect(res.body.user).toBeDefined();
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('duplicate email (any casing) gets 409', async () => {
    await request(app).post('/api/auth/register').send(alice);
    const res = await request(app).post('/api/auth/register').send({ ...alice, email: 'ALICE@example.com' });
    expect(res.status).toBe(409);
  });
});

describe('login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(alice);
  });

  test('correct password returns a token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: alice.password });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  test('email is case-insensitive', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ALICE@EXAMPLE.COM', password: alice.password });
    expect(res.status).toBe(200);
  });

  test('wrong password gets 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'nope-nope' });
    expect(res.status).toBe(401);
  });
});

describe('GET /me', () => {
  test('returns the current user with a valid Bearer token', async () => {
    const reg = await request(app).post('/api/auth/register').send(alice);
    const res = await request(app).get('/api/auth/me').set('Authorization', \`Bearer \${reg.body.token}\`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
  });

  test('401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('401 once the token is older than 1 hour', async () => {
    jest.useFakeTimers();
    const reg = await request(app).post('/api/auth/register').send(alice);
    jest.advanceTimersByTime(61 * 60 * 1000);
    const res = await request(app).get('/api/auth/me').set('Authorization', \`Bearer \${reg.body.token}\`);
    expect(res.status).toBe(401);
    jest.useRealTimers();
  });
});
`;

export default {
  slug: "auth-jwt",
  order: 2,
  title: "Auth Service: Register, Login, JWT",
  difficulty: "Medium",
  minutes: 35,
  tagline: "Passwords stored in plain text and nobody can log in.",
  ticket: `**SEC-88 · P1 · Auth service regressions**

Security scan flagged that **passwords appear in plain text** in the users collection and that \`/register\` returns the password field in its response. Meanwhile support says **nobody can log in**, and users who registered with a capitalised email can't log in at all. Even freshly issued tokens are rejected by \`GET /me\`.

**Definition of done:** all tests in \`tests/auth.test.js\` pass. Keep the API contract unchanged.`,
  env: { JWT_SECRET: "s3cret-test-key" },
  files: {
    "app.js": app,
    "routes/authRoutes.js": routes,
    "controllers/authController.js": controllerBuggy,
    "middleware/requireAuth.js": requireAuthBuggy,
    "models/User.js": userModelBuggy,
  },
  tests: { "tests/auth.test.js": tests },
  fixes: {
    "models/User.js": userModelFixed,
    "controllers/authController.js": controllerFixed,
    "middleware/requireAuth.js": requireAuthFixed,
  },
  bugs: [
    { file: "models/User.js", title: "pre('save') hook uses an arrow function", explain: "Arrow functions don't get their own `this`, so `this` is not the document. Mongoose hooks and methods must be `function () {}`." },
    { file: "models/User.js", title: "bcrypt.compare arguments reversed", explain: "Signature is `compare(plainText, hash)`. Reversed, it's always false, so every login is 401." },
    { file: "models/User.js", title: "password leaks in JSON", explain: "Add a `toJSON.transform` that deletes `ret.password` (or `select: false` on the field)." },
    { file: "controllers/authController.js", title: "email lookups are case-sensitive", explain: "The schema lowercases on save, but queries use the raw input. Normalise with `.toLowerCase().trim()` before `findOne`." },
    { file: "middleware/requireAuth.js", title: "token parsing + env var typo", explain: "`'Bearer xyz'.split(' ')[0]` is `'Bearer'`, so take index 1. Also `JWT_SECRT` is a typo, so the secret is `undefined` and verify always throws." },
  ],
  hints: [
    "What is `this` inside an arrow function declared at module level?",
    "Read bcrypt's signature carefully: which argument is the hash?",
    "Log `process.env` keys. Is the variable you read actually set?",
    "Schema `lowercase: true` transforms on save, not on your query input.",
  ],
  concepts: ["this binding in hooks", "bcrypt", "JWT verify/expiry", "data leakage", "input normalisation"],
};
