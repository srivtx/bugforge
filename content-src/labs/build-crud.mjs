const model = `import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    tags: { type: [String], default: [] },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Note', noteSchema);
`;

const stub = `import Note from '../models/Note.js';

// GET /api/notes?tag=work&q=meeting
// -> 200 array; pinned notes first, then newest (createdAt desc).
//    tag filters by tag; q is a case-insensitive substring match on title.
export const listNotes = async (req, res, next) => {
  // TODO
  res.status(501).json({ message: 'not implemented' });
};

// POST /api/notes { title, body?, tags?, pinned? } -> 201 note | 400 { message } when title is missing/blank
export const createNote = async (req, res, next) => {
  // TODO
  res.status(501).json({ message: 'not implemented' });
};

// GET /api/notes/:id -> 200 note | 404 { message: 'Note not found' } | 400 for a malformed id
export const getNote = async (req, res, next) => {
  // TODO
  res.status(501).json({ message: 'not implemented' });
};

// PATCH /api/notes/:id  partial update of title/body/tags/pinned only (ignore other fields)
// -> 200 updated note | 404 | 400 (malformed id or blank title)
export const updateNote = async (req, res, next) => {
  // TODO
  res.status(501).json({ message: 'not implemented' });
};

// DELETE /api/notes/:id -> 204 | 404
export const deleteNote = async (req, res, next) => {
  // TODO
  res.status(501).json({ message: 'not implemented' });
};
`;

const solution = `import mongoose from 'mongoose';
import Note from '../models/Note.js';

const ALLOWED = ['title', 'body', 'tags', 'pinned'];
const escape = (s) => s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
const badId = (id) => !mongoose.isValidObjectId(id);

// GET /api/notes?tag=work&q=meeting
// -> 200 array; pinned notes first, then newest (createdAt desc).
//    tag filters by tag; q is a case-insensitive substring match on title.
export const listNotes = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.tag) filter.tags = req.query.tag;
    if (req.query.q) filter.title = new RegExp(escape(String(req.query.q)), 'i');
    const notes = await Note.find(filter).sort({ pinned: -1, createdAt: -1 });
    res.json(notes);
  } catch (err) {
    next(err);
  }
};

// POST /api/notes { title, body?, tags?, pinned? } -> 201 note | 400 { message } when title is missing/blank
export const createNote = async (req, res, next) => {
  try {
    const { title, body, tags, pinned } = req.body || {};
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required' });
    }
    const note = await Note.create({ title, body, tags, pinned });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
};

// GET /api/notes/:id -> 200 note | 404 { message: 'Note not found' } | 400 for a malformed id
export const getNote = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notes/:id  partial update of title/body/tags/pinned only (ignore other fields)
// -> 200 updated note | 404 | 400 (malformed id or blank title)
export const updateNote = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const update = {};
    for (const k of ALLOWED) if (req.body[k] !== undefined) update[k] = req.body[k];
    if ('title' in update && (typeof update.title !== 'string' || !update.title.trim())) {
      return res.status(400).json({ message: 'title cannot be blank' });
    }
    const note = await Note.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/notes/:id -> 204 | 404
export const deleteNote = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const gone = await Note.findByIdAndDelete(req.params.id);
    if (!gone) return res.status(404).json({ message: 'Note not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
`;

const routes = `import { Router } from 'express';
import { listNotes, createNote, getNote, updateNote, deleteNote } from '../controllers/notes.js';

const router = Router();
router.get('/', listNotes);
router.post('/', createNote);
router.get('/:id', getNote);
router.patch('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;
`;

const app = `import express from 'express';
import notes from './routes/notes.js';

const app = express();
app.use(express.json());
app.use('/api/notes', notes);
app.use((err, req, res, next) => res.status(500).json({ message: err.message }));

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Note from '../models/Note.js';

beforeEach(async () => {
  jest.useFakeTimers();
  await Note.deleteMany({});
});
afterEach(() => jest.useRealTimers());

const create = (body) => request(app).post('/api/notes').send(body);

describe('create', () => {
  test('201 with defaults', async () => {
    const res = await create({ title: 'Standup' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Standup', body: '', tags: [], pinned: false });
    expect(res.body._id).toBeDefined();
  });
  test('400 when title missing or blank', async () => {
    expect((await create({ body: 'x' })).status).toBe(400);
    expect((await create({ title: '   ' })).status).toBe(400);
  });
});

describe('list', () => {
  beforeEach(async () => {
    await create({ title: 'Old work', tags: ['work'] });
    jest.advanceTimersByTime(1000);
    await create({ title: 'Groceries', tags: ['home'], pinned: true });
    jest.advanceTimersByTime(1000);
    await create({ title: 'New work meeting', tags: ['work'] });
  });
  test('pinned first, then newest', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.body.map((n) => n.title)).toEqual(['Groceries', 'New work meeting', 'Old work']);
  });
  test('filter by tag', async () => {
    const res = await request(app).get('/api/notes?tag=work');
    expect(res.body.map((n) => n.title)).toEqual(['New work meeting', 'Old work']);
  });
  test('search title case-insensitively', async () => {
    const res = await request(app).get('/api/notes?q=MEETING');
    expect(res.body).toHaveLength(1);
  });
});

describe('read / update / delete', () => {
  let id;
  beforeEach(async () => {
    id = (await create({ title: 'Draft', body: 'v1' })).body._id;
  });
  test('get by id', async () => {
    expect((await request(app).get('/api/notes/' + id)).body.title).toBe('Draft');
  });
  test('404 unknown and 400 malformed id', async () => {
    expect((await request(app).get('/api/notes/65f000000000000000000000')).status).toBe(404);
    expect((await request(app).get('/api/notes/abc')).status).toBe(400);
  });
  test('patch updates only provided allowed fields and returns the new doc', async () => {
    const res = await request(app).patch('/api/notes/' + id).send({ pinned: true, hacker: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Draft', body: 'v1', pinned: true });
    expect(res.body.hacker).toBeUndefined();
  });
  test('patch rejects a blank title', async () => {
    expect((await request(app).patch('/api/notes/' + id).send({ title: '' })).status).toBe(400);
  });
  test('delete then 404', async () => {
    expect((await request(app).delete('/api/notes/' + id)).status).toBe(204);
    expect((await request(app).delete('/api/notes/' + id)).status).toBe(404);
  });
});
`;

export default {
  slug: "build-notes-crud",
  order: 102,
  kind: "build",
  title: "Build: Notes REST API (CRUD)",
  difficulty: "Medium",
  minutes: 40,
  tagline: "Implement five endpoints with validation, filtering, sorting and proper status codes.",
  ticket: `## Spec

The model and routes exist. Implement the five handlers in \`controllers/notes.js\`; each one's contract is in its comment.

You'll practise the skills every backend task uses:
- input validation → **400**; missing → **404**; malformed ids → **400**
- **mass-assignment safety**: only update whitelisted fields
- multi-key sorting: \`pinned\` desc, then \`createdAt\` desc
- regex search with escaping

Tip: write \`createNote\` first, since every other test depends on it.`,
  env: {},
  files: { "app.js": app, "routes/notes.js": routes, "controllers/notes.js": stub, "models/Note.js": model },
  tests: { "tests/notes.test.js": tests },
  fixes: { "controllers/notes.js": solution },
  bugs: [
    { file: "controllers/notes.js", title: "createNote", explain: "Validate `typeof title === 'string' && title.trim()`, then `Note.create` → 201." },
    { file: "controllers/notes.js", title: "listNotes", explain: "Build a filter object (`tags: tag` matches arrays containing the tag; escaped `RegExp` for q), then `.sort({ pinned: -1, createdAt: -1 })`." },
    { file: "controllers/notes.js", title: "getNote / deleteNote", explain: "Guard with `mongoose.isValidObjectId(id)` → 400; `null` result → 404; delete returns `204` with `res.status(204).end()`." },
    { file: "controllers/notes.js", title: "updateNote", explain: "Copy only `title, body, tags, pinned` from the body, validate a provided title, then `findByIdAndUpdate(id, { $set }, { new: true })`." },
  ],
  hints: ["Mongo matches `{ tags: 'work' }` against arrays that contain 'work'.", "Sort objects can have multiple keys; order matters.", "Never pass req.body straight into an update."],
  concepts: ["REST semantics", "validation", "mass assignment", "multi-key sort", "ObjectId validation"],
};
