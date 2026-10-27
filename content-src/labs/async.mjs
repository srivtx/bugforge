const model = `import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
});

export default mongoose.model('Task', taskSchema);
`;

const controllerBuggy = `import mongoose from 'mongoose';
import Task from '../models/Task.js';

export const getTask = async (req, res) => {
  const task = Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json(task);
};

// body: { ids: string[] } -> { updated: number }
export const completeMany = async (req, res) => {
  const { ids } = req.body;
  let updated = 0;
  ids.forEach(async (id) => {
    const r = await Task.updateOne({ _id: id, done: false }, { $set: { done: true } });
    updated += r.modifiedCount;
  });
  res.json({ updated });
};

export const deleteTask = async (req, res) => {
  try {
    Task.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ message: 'Invalid id' });
  }
};
`;

const controllerFixed = `import mongoose from 'mongoose';
import Task from '../models/Task.js';

export const getTask = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json(task);
};

// body: { ids: string[] } -> { updated: number }
export const completeMany = async (req, res) => {
  const { ids } = req.body;
  const results = await Promise.all(
    ids.map((id) => Task.updateOne({ _id: id, done: false }, { $set: { done: true } }))
  );
  const updated = results.reduce((sum, r) => sum + r.modifiedCount, 0);
  res.json({ updated });
};

export const deleteTask = async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Task not found' });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ message: 'Invalid id' });
  }
};
`;

const app = `import express from 'express';
import { getTask, completeMany, deleteTask } from './controllers/taskController.js';

const app = express();
app.use(express.json());

app.get('/api/tasks/:id', getTask);
app.post('/api/tasks/complete', completeMany);
app.delete('/api/tasks/:id', deleteTask);

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Task from '../models/Task.js';

let a, b, c;
beforeEach(async () => {
  await Task.deleteMany({});
  [a, b, c] = await Task.create([{ title: 'write doc' }, { title: 'review PR' }, { title: 'deploy', done: true }]);
});

describe('GET /api/tasks/:id', () => {
  test('returns the task document', async () => {
    const res = await request(app).get(\`/api/tasks/\${a.id}\`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('write doc');
  });

  test('404 for a valid but unknown id', async () => {
    const res = await request(app).get('/api/tasks/65f000000000000000000001');
    expect(res.status).toBe(404);
  });

  test('400 for a malformed id', async () => {
    const res = await request(app).get('/api/tasks/xyz');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tasks/complete', () => {
  test('reports how many tasks actually changed', async () => {
    const res = await request(app).post('/api/tasks/complete').send({ ids: [a.id, b.id, c.id] });
    expect(res.body).toEqual({ updated: 2 });
    expect(await Task.countDocuments({ done: true })).toBe(3);
  });
});

describe('DELETE /api/tasks/:id', () => {
  test('deletes and returns 204', async () => {
    const res = await request(app).delete(\`/api/tasks/\${a.id}\`);
    expect(res.status).toBe(204);
    expect(await Task.findById(a.id)).toBeNull();
  });

  test('404 when nothing was deleted', async () => {
    const res = await request(app).delete('/api/tasks/65f000000000000000000001');
    expect(res.status).toBe(404);
  });

  test('400 for a malformed id', async () => {
    const res = await request(app).delete('/api/tasks/nope');
    expect(res.status).toBe(400);
  });
});
`;

export default {
  slug: "async-pitfalls",
  order: 7,
  title: "Async/Await Pitfalls in a Task API",
  difficulty: "Medium",
  minutes: 25,
  tagline: "Responses go out before the database work finishes.",
  ticket: `**TSK-9 · Task API returns garbage and lies about results**

- \`GET /api/tasks/:id\` returns a strange object with \`op\` and \`_sort\` keys instead of the task.
- Bulk complete always reports \`{ updated: 0 }\`.
- Deleting a malformed id returns 204 and an *UnhandledPromiseRejection* shows up in the logs.

Make \`tests/tasks.test.js\` pass.`,
  env: {},
  files: { "app.js": app, "controllers/taskController.js": controllerBuggy, "models/Task.js": model },
  tests: { "tests/tasks.test.js": tests },
  fixes: { "controllers/taskController.js": controllerFixed },
  bugs: [
    { file: "controllers/taskController.js", title: "missing await on a Query", explain: "A Mongoose Query object is always truthy. Without `await` you serialise the query itself. Validate the id up front for the 400 case." },
    { file: "controllers/taskController.js", title: "async callback inside forEach", explain: "`forEach` ignores returned promises, so the response is sent before any update resolves. Use `Promise.all(ids.map(...))` or a `for...of` with `await`." },
    { file: "controllers/taskController.js", title: "try/catch can't catch an un-awaited promise", explain: "Without `await`, the rejection happens after the try block has exited. Await it, then check for `null` and return 404." },
  ],
  hints: ["Log `typeof task.then` in getTask.", "When does `res.json({ updated })` run relative to the awaits inside forEach?", "A try/catch only catches what you await inside it."],
  concepts: ["await", "forEach + async", "Promise.all", "unhandled rejections"],
};
