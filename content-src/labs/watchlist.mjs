const auth = `import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
`;

const movieModel = `import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  year: Number,
  genre: String,
});

export default mongoose.model('Movie', movieSchema);
`;

const watchlistModel = `import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Watchlist', watchlistSchema);
`;

const controllerBuggy = `import Watchlist from '../models/Watchlist.js';
import Movie from '../models/Movie.js';

export const getWatchlist = async (req, res) => {
  try {
    const userId = req.userId;
    const items = await Watchlist.find({ user: userId });
    res.json(items.map((item) => item.movie));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addToWatchlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // add the movie (duplicates are handled by the unique check above... though we check above)
    res.status(201).json({ message: 'Movie added to watchlist successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    await Watchlist.find({ user: userId, movie: movieId });
    res.json({ message: 'Movie removed from watchlist successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const checkWatchlistStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { movieId } = req.params;
    const entry = await Watchlist.find({ user: userId, movie: movieId });
    res.json({ isInWatchlist: entry });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
`;

const controllerFixed = `import Watchlist from '../models/Watchlist.js';
import Movie from '../models/Movie.js';

export const getWatchlist = async (req, res) => {
  try {
    const userId = req.userId;
    const items = await Watchlist.find({ user: userId }).populate('movie');
    res.json(items.map((item) => item.movie));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addToWatchlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const existing = await Watchlist.findOne({ user: userId, movie: movieId });
    if (existing) {
      return res.status(400).json({ message: 'Movie already in watchlist' });
    }

    await Watchlist.create({ user: userId, movie: movieId });
    res.status(201).json({ message: 'Movie added to watchlist successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ message: 'Movie ID is required' });
    }

    const deleted = await Watchlist.findOneAndDelete({ user: userId, movie: movieId });
    if (!deleted) {
      return res.status(404).json({ message: 'Movie not found in watchlist' });
    }
    res.json({ message: 'Movie removed from watchlist successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const checkWatchlistStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { movieId } = req.params;
    const entry = await Watchlist.findOne({ user: userId, movie: movieId });
    res.json({ inWatchlist: !!entry });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
`;

const limiterBuggy = `const rateLimitStore = new Map();

/**
 * Allows at most \`max\` add/remove operations per user inside a sliding window.
 */
export const watchlistRateLimiter = (max = 10) => {
  return (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const key = \`\${userId}-watchlist-operations\`;
    const now = Date.now();
    const requests = (rateLimitStore.get(key) || []).filter(
      (timestamp) => now - timestamp >= windowMs
    );

    if (requests) {
      return res.status(429).json({
        message: 'Too many watchlist operations. You can add or remove movies up to 10 times within 2 minutes.',
      });
    }

    validRequests.push(now);
    rateLimitStore.set(key, validRequests);
    next();
  };
};
`;

const limiterFixed = `const rateLimitStore = new Map();

/**
 * Allows at most \`max\` add/remove operations per user inside a sliding window.
 */
export const watchlistRateLimiter = (max = 10, windowMs = 2 * 60 * 1000) => {
  return (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const key = \`\${userId}-watchlist-operations\`;
    const now = Date.now();
    const requests = (rateLimitStore.get(key) || []).filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (requests.length >= max) {
      return res.status(429).json({
        message: 'Too many watchlist operations. You can add or remove movies up to 10 times within 2 minutes.',
      });
    }

    requests.push(now);
    rateLimitStore.set(key, requests);
    next();
  };
};
`;

const routesBuggy = `import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  checkWatchlistStatus,
} from '../controllers/watchlistController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getWatchlist);
router.get('/check/:movieId', checkWatchlistStatus);
router.post('/add', addToWatchlist);
router.post('/remove', removeFromWatchlist);

export default router;
`;

const routesFixed = `import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  checkWatchlistStatus,
} from '../controllers/watchlistController.js';
import { watchlistRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const limitWatchlist = watchlistRateLimiter();

router.use(authMiddleware);

router.get('/', getWatchlist);
router.get('/check/:movieId', checkWatchlistStatus);
router.post('/add', limitWatchlist, addToWatchlist);
router.post('/remove', limitWatchlist, removeFromWatchlist);

export default router;
`;

const app = `import express from 'express';
import watchlistRoutes from './routes/watchlistRoutes.js';

const app = express();
app.use(express.json());

app.use('/api/watchlist', watchlistRoutes);

export default app;
`;

const tests = `import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../app.js';
import Movie from '../models/Movie.js';
import Watchlist from '../models/Watchlist.js';

const userId = new mongoose.Types.ObjectId().toString();
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
const auth = { Authorization: \`Bearer \${token}\` };

let movie;
let movie2;

beforeEach(async () => {
  await Watchlist.deleteMany({});
  await Movie.deleteMany({});
  movie = await Movie.create({ title: 'Inception', year: 2010 });
  movie2 = await Movie.create({ title: 'Arrival', year: 2016 });
});

describe('POST /api/watchlist/add', () => {
  test('adds a movie and persists it', async () => {
    const res = await request(app).post('/api/watchlist/add').set(auth).send({ movieId: movie.id });
    expect(res.status).toBe(201);
    const saved = await Watchlist.findOne({ user: userId, movie: movie.id });
    expect(saved).not.toBeNull();
  });

  test('rejects duplicates with 400', async () => {
    await request(app).post('/api/watchlist/add').set(auth).send({ movieId: movie.id });
    const res = await request(app).post('/api/watchlist/add').set(auth).send({ movieId: movie.id });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/watchlist', () => {
  test('returns populated movie objects', async () => {
    await request(app).post('/api/watchlist/add').set(auth).send({ movieId: movie.id });
    await request(app).post('/api/watchlist/add').set(auth).send({ movieId: movie2.id });
    const res = await request(app).get('/api/watchlist').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty('title', 'Inception');
  });
});

describe('POST /api/watchlist/remove', () => {
  test('removes an existing entry', async () => {
    await request(app).post('/api/watchlist/add').set(auth).send({ movieId: movie.id });
    const res = await request(app).post('/api/watchlist/remove').set(auth).send({ movieId: movie.id });
    expect(res.status).toBe(200);
    const left = await Watchlist.findOne({ user: userId, movie: movie.id });
    expect(left).toBeNull();
  });

  test('returns 404 when movie is not in the watchlist', async () => {
    const res = await request(app).post('/api/watchlist/remove').set(auth).send({ movieId: movie.id });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Movie not found in watchlist');
  });
});

describe('GET /api/watchlist/check/:movieId', () => {
  test('returns a boolean inWatchlist flag', async () => {
    let res = await request(app).get(\`/api/watchlist/check/\${movie.id}\`).set(auth);
    expect(res.body).toEqual({ inWatchlist: false });
    await request(app).post('/api/watchlist/add').set(auth).send({ movieId: movie.id });
    res = await request(app).get(\`/api/watchlist/check/\${movie.id}\`).set(auth);
    expect(res.body).toEqual({ inWatchlist: true });
  });
});

describe('rate limiting', () => {
  test('11th add/remove inside 2 minutes gets 429', async () => {
    const other = jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET);
    const h = { Authorization: \`Bearer \${other}\` };
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/watchlist/add').set(h).send({ movieId: movie.id });
      await request(app).post('/api/watchlist/remove').set(h).send({ movieId: movie.id });
    }
    const res = await request(app).post('/api/watchlist/add').set(h).send({ movieId: movie.id });
    expect(res.status).toBe(429);
  });

  test('window slides: allowed again after 2 minutes', async () => {
    jest.useFakeTimers();
    const other = jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET);
    const h = { Authorization: \`Bearer \${other}\` };
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/watchlist/remove').set(h).send({ movieId: movie.id });
    }
    jest.advanceTimersByTime(2 * 60 * 1000 + 1);
    const res = await request(app).post('/api/watchlist/add').set(h).send({ movieId: movie.id });
    expect(res.status).toBe(201);
    jest.useRealTimers();
  });
});
`;

export default {
  slug: "watchlist-api",
  order: 1,
  title: "Movie Watchlist API",
  difficulty: "Hard",
  minutes: 45,
  tagline: "Saves nothing, deletes nothing, and the rate limiter is never wired in.",
  ticket: `**WATCH-212 · Watchlist endpoints broken after refactor**

QA reports that the watchlist feature silently does nothing. Users click **Add**, see a success toast, but the movie never shows up. Removing returns success even for movies that were never added. The mobile team also says \`/check/:movieId\` returns an array instead of a flag.

Product additionally requires **rate limiting**: a user may add/remove at most **10 times in a rolling 2-minute window**; the 11th call must get **429**. A teammate started a limiter in \`middleware/rateLimiter.js\` but it was never finished.

**Definition of done:** all tests in \`tests/watchlist.test.js\` pass. Don't edit the tests.`,
  env: { JWT_SECRET: "test-secret" },
  files: {
    "app.js": app,
    "routes/watchlistRoutes.js": routesBuggy,
    "controllers/watchlistController.js": controllerBuggy,
    "middleware/auth.js": auth,
    "middleware/rateLimiter.js": limiterBuggy,
    "models/Watchlist.js": watchlistModel,
    "models/Movie.js": movieModel,
  },
  tests: { "tests/watchlist.test.js": tests },
  fixes: {
    "controllers/watchlistController.js": controllerFixed,
    "middleware/rateLimiter.js": limiterFixed,
    "routes/watchlistRoutes.js": routesFixed,
  },
  bugs: [
    { file: "controllers/watchlistController.js", title: "addToWatchlist never writes to the DB", explain: "It validates the movie then sends 201 without calling `Watchlist.create`. There is also no duplicate check, so a second add also gets 201 instead of 400." },
    { file: "controllers/watchlistController.js", title: "remove uses find() instead of a delete", explain: "`find()` only reads. Use `findOneAndDelete({ user, movie })` and send **404** with the exact message the test expects when it returns `null`." },
    { file: "controllers/watchlistController.js", title: "check status returns an array under the wrong key", explain: "`find()` always resolves to an array (`[]` is truthy!). Use `findOne` and `!!entry`, and the key must be `inWatchlist`." },
    { file: "controllers/watchlistController.js", title: "getWatchlist returns ids, not movies", explain: "`item.movie` is just an ObjectId until you call `.populate('movie')` on the query." },
    { file: "middleware/rateLimiter.js", title: "limiter logic is inverted and crashes", explain: "`windowMs` is undefined, the filter keeps *old* timestamps (`>=` should be `<`), `if (requests)` is always true for arrays, and `validRequests` doesn't exist." },
    { file: "routes/watchlistRoutes.js", title: "limiter never mounted", explain: "Create one limiter instance and put it between auth and the handler on `/add` and `/remove`. One shared instance means add+remove share the same counter." },
  ],
  hints: [
    "Run the tests first and group failures by file. Six tests, four root causes.",
    "`await Model.find(...)` always resolves to an array. Arrays are truthy even when empty.",
    "For the limiter: what is `windowMs` inside the inner function? Where is it defined?",
    "Express runs route handlers left to right: `router.post('/add', auth?, limiter, handler)`.",
  ],
  concepts: ["Mongoose find vs findOne", "populate", "sliding-window rate limiting", "middleware order", "exact error contracts"],
};
