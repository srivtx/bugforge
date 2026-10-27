// Hands-on exercises for the "Databases with Node" lessons. Each one runs in the in-browser
// sandbox (in-memory mongoose + express + supertest). build-exercises.mjs checks that every
// starter fails at least one test and every solution passes them all.

const bookModel = `import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, default: 'Unknown' },
  year: Number,
});

export default mongoose.model('Book', bookSchema);
`;

const productModel = `import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  tags: { type: [String], default: [] },
  stock: { type: Number, default: 0 },
});

export default mongoose.model('Product', productSchema);
`;

const seedProducts = `const seed = () => Product.create([
  { name: 'iPhone', price: 999, tags: ['phone', 'apple'], stock: 3 },
  { name: 'Phone case', price: 19, tags: ['phone', 'accessory'], stock: 40 },
  { name: 'USB cable', price: 9, tags: ['accessory'], stock: 100 },
  { name: 'Laptop', price: 1499, tags: ['computer'], stock: 2 },
  { name: 'Mouse', price: 25, tags: ['computer', 'accessory'], stock: 0 },
]);
`;

export default [
  {
    lesson: "db-first-steps",
    exercises: [
      {
        id: "book-model",
        title: "Define your first model",
        goal: "Describe a **Book** to the database: a required `title`, an `author` that defaults to `'Unknown'`, and a numeric `year`.",
        file: "models/Book.js",
        starter: `import mongoose from 'mongoose';

// A book has:
//   title  - text, required
//   author - text, defaults to 'Unknown'
//   year   - a number
const bookSchema = new mongoose.Schema({
  // TODO: add the three fields here
});

export default mongoose.model('Book', bookSchema);
`,
        solution: bookModel,
        tests: {
          "book.test.js": `import Book from './models/Book.js';

beforeEach(async () => {
  await Book.deleteMany({});
});

test('saves a book with all three fields', async () => {
  const b = await Book.create({ title: 'Dune', author: 'Frank Herbert', year: 1965 });
  expect(b.title).toBe('Dune');
  expect(b.author).toBe('Frank Herbert');
  expect(b.year).toBe(1965);
});

test('title is required', async () => {
  await expect(Book.create({ author: 'Nobody' })).rejects.toThrow();
});

test("author defaults to 'Unknown'", async () => {
  const b = await Book.create({ title: 'Anonymous poems' });
  expect(b.author).toBe('Unknown');
});

test('year is stored as a number', async () => {
  const b = await Book.create({ title: 'Space Odyssey', year: '2001' });
  expect(b.year).toBe(2001);
});
`,
        },
        hints: [
          "Each field is a key inside the object you pass to `new mongoose.Schema({ ... })`.",
          "A field can be just a type (`year: Number`) or an options object: `{ type: String, required: true }`.",
          "Defaults go in the options object too: `author: { type: String, default: 'Unknown' }`.",
        ],
      },
      {
        id: "book-crud",
        title: "Save and read books",
        goal: "Write `addBook`, `listBooks` (oldest first) and `findByAuthor`. The model is ready in `models/Book.js`.",
        file: "books.js",
        support: { "models/Book.js": bookModel },
        starter: `import Book from './models/Book.js';

// Save a new book and return it.
export async function addBook(data) {
  // TODO
}

// Every book, oldest first (sorted by year, ascending).
export async function listBooks() {
  // TODO
}

// Books whose author is exactly 'name'.
export async function findByAuthor(name) {
  // TODO
}
`,
        solution: `import Book from './models/Book.js';

export async function addBook(data) {
  return Book.create(data);
}

export async function listBooks() {
  return Book.find().sort({ year: 1 });
}

export async function findByAuthor(name) {
  return Book.find({ author: name });
}
`,
        tests: {
          "books.test.js": `import Book from './models/Book.js';
import { addBook, listBooks, findByAuthor } from './books.js';

beforeEach(async () => {
  await Book.deleteMany({});
});

test('addBook saves and returns the book', async () => {
  const b = await addBook({ title: 'Neuromancer', author: 'William Gibson', year: 1984 });
  expect(b.title).toBe('Neuromancer');
  expect(await Book.countDocuments()).toBe(1);
});

test('listBooks returns books oldest first', async () => {
  await addBook({ title: 'B', year: 2000 });
  await addBook({ title: 'A', year: 1950 });
  await addBook({ title: 'C', year: 2020 });
  const list = await listBooks();
  expect(list.map((b) => b.title)).toEqual(['A', 'B', 'C']);
});

test('findByAuthor only returns that author', async () => {
  await addBook({ title: 'Foundation', author: 'Asimov', year: 1951 });
  await addBook({ title: 'I, Robot', author: 'Asimov', year: 1950 });
  await addBook({ title: 'Dune', author: 'Herbert', year: 1965 });
  const list = await findByAuthor('Asimov');
  expect(list).toHaveLength(2);
});
`,
        },
        hints: [
          "`Model.create(data)` saves a document and resolves to it. Return it.",
          "`Model.find()` with no filter returns everything. Chain `.sort({ year: 1 })` for ascending.",
          "A filter is a plain object: `Book.find({ author: name })`.",
        ],
      },
    ],
  },
  {
    lesson: "db-queries",
    exercises: [
      {
        id: "price-filters",
        title: "Filter by price",
        goal: "Use comparison operators: `cheaperThan(max)` (strictly below, cheapest first) and `inPriceRange(min, max)` (both ends included).",
        file: "shop.js",
        support: { "models/Product.js": productModel },
        starter: `import Product from './models/Product.js';

// Products with price strictly below max, cheapest first.
export async function cheaperThan(max) {
  // TODO
}

// Products with min <= price <= max.
export async function inPriceRange(min, max) {
  // TODO
}
`,
        solution: `import Product from './models/Product.js';

export async function cheaperThan(max) {
  return Product.find({ price: { $lt: max } }).sort({ price: 1 });
}

export async function inPriceRange(min, max) {
  return Product.find({ price: { $gte: min, $lte: max } });
}
`,
        tests: {
          "shop.test.js": `import Product from './models/Product.js';
import { cheaperThan, inPriceRange } from './shop.js';

${seedProducts}
beforeEach(async () => {
  await Product.deleteMany({});
  await seed();
});

test('cheaperThan(25) excludes the 25 mouse and sorts cheapest first', async () => {
  const list = await cheaperThan(25);
  expect(list.map((p) => p.name)).toEqual(['USB cable', 'Phone case']);
});

test('inPriceRange includes both ends', async () => {
  const list = await inPriceRange(19, 999);
  expect(list.map((p) => p.name).sort()).toEqual(['Mouse', 'Phone case', 'iPhone']);
});
`,
        },
        hints: [
          "Operators go inside the field's value: `{ price: { $lt: 10 } }`.",
          "`$lt` is strictly less than; `$lte`, `$gte` include the boundary.",
          "Combine two operators on one field: `{ price: { $gte: min, $lte: max } }`.",
        ],
      },
      {
        id: "tags-search",
        title: "Tags and search",
        goal: "`withAnyTag(tags)` returns products having at least one of the tags. `searchByName(q)` matches names containing `q`, ignoring case.",
        file: "search.js",
        support: { "models/Product.js": productModel },
        starter: `import Product from './models/Product.js';

// Products that have at least one of the given tags.
export async function withAnyTag(tags) {
  // TODO
}

// Products whose name contains q, case-insensitive. 'phone' matches 'iPhone' and 'Phone case'.
export async function searchByName(q) {
  // TODO
}
`,
        solution: `import Product from './models/Product.js';

const escape = (s) => s.replace(/[.*+?^$()|[\\]\\\\{}]/g, '\\\\$&');

export async function withAnyTag(tags) {
  return Product.find({ tags: { $in: tags } });
}

export async function searchByName(q) {
  return Product.find({ name: { $regex: escape(q), $options: 'i' } });
}
`,
        tests: {
          "search.test.js": `import Product from './models/Product.js';
import { withAnyTag, searchByName } from './search.js';

${seedProducts}
beforeEach(async () => {
  await Product.deleteMany({});
  await seed();
});

test('withAnyTag matches any of the tags', async () => {
  const list = await withAnyTag(['apple', 'computer']);
  expect(list.map((p) => p.name).sort()).toEqual(['Laptop', 'Mouse', 'iPhone']);
});

test('searchByName ignores case', async () => {
  const list = await searchByName('phone');
  expect(list.map((p) => p.name).sort()).toEqual(['Phone case', 'iPhone']);
});

test('searchByName treats symbols literally', async () => {
  const list = await searchByName('.');
  expect(list).toHaveLength(0);
});
`,
        },
        hints: [
          "When a field holds an array, `{ tags: 'x' }` already means \"contains x\". For several options use `$in`.",
          "Case-insensitive contains: `{ name: { $regex: q, $options: 'i' } }`.",
          "User text inside a regex must be escaped, or `.` matches everything: `q.replace(/[.*+?^$()|[\\]\\\\{}]/g, '\\\\$&')`.",
        ],
      },
    ],
  },
  {
    lesson: "db-express-api",
    exercises: [
      {
        id: "todo-api",
        title: "Your first database-backed API",
        goal: "Finish the controller: `POST /todos` saves a todo (201, or 400 when `title` is missing), `GET /todos/:id` returns it (404 if missing, 400 for a malformed id).",
        file: "todos.controller.js",
        support: {
          "models/Todo.js": `import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
});

export default mongoose.model('Todo', todoSchema);
`,
          "app.js": `import express from 'express';
import { listTodos, createTodo, getTodo } from './todos.controller.js';

const app = express();
app.use(express.json());
app.get('/todos', listTodos);
app.post('/todos', createTodo);
app.get('/todos/:id', getTodo);

export default app;
`,
        },
        starter: `import mongoose from 'mongoose';
import Todo from './models/Todo.js';

export async function listTodos(req, res) {
  const todos = await Todo.find();
  res.json(todos);
}

// POST /todos  { title }  ->  201 + the saved todo,  400 { error } if title is missing
export async function createTodo(req, res) {
  // TODO
  res.status(501).json({ error: 'not implemented' });
}

// GET /todos/:id  ->  200 todo,  404 { error } if not found,  400 { error } if the id is malformed
export async function getTodo(req, res) {
  // TODO
  res.status(501).json({ error: 'not implemented' });
}
`,
        solution: `import mongoose from 'mongoose';
import Todo from './models/Todo.js';

export async function listTodos(req, res) {
  const todos = await Todo.find();
  res.json(todos);
}

export async function createTodo(req, res) {
  if (!req.body.title) return res.status(400).json({ error: 'title is required' });
  const todo = await Todo.create({ title: req.body.title });
  res.status(201).json(todo);
}

export async function getTodo(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'bad id' });
  const todo = await Todo.findById(req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  res.json(todo);
}
`,
        tests: {
          "todos.test.js": `import request from 'supertest';
import app from './app.js';
import Todo from './models/Todo.js';

beforeEach(async () => {
  await Todo.deleteMany({});
});

test('POST /todos creates a todo with 201', async () => {
  const res = await request(app).post('/todos').send({ title: 'Learn Mongoose' });
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Learn Mongoose');
  expect(res.body.done).toBe(false);
  expect(await Todo.countDocuments()).toBe(1);
});

test('POST /todos without a title is a 400', async () => {
  const res = await request(app).post('/todos').send({});
  expect(res.status).toBe(400);
  expect(res.body.error).toBeDefined();
});

test('GET /todos/:id returns the todo', async () => {
  const t = await Todo.create({ title: 'Read docs' });
  const res = await request(app).get('/todos/' + t._id);
  expect(res.status).toBe(200);
  expect(res.body.title).toBe('Read docs');
});

test('GET /todos/:id for a missing id is a 404', async () => {
  const res = await request(app).get('/todos/' + new mongoose.Types.ObjectId());
  expect(res.status).toBe(404);
});

test('GET /todos/:id for a malformed id is a 400', async () => {
  const res = await request(app).get('/todos/not-an-id');
  expect(res.status).toBe(400);
});
`.replace("import request from 'supertest';", "import request from 'supertest';\nimport mongoose from 'mongoose';"),
        },
        hints: [
          "Read the body from `req.body.title`. If it's missing, `return res.status(400).json({ error: '...' })`. The `return` stops the handler.",
          "`Todo.create(...)` saves; reply with `res.status(201).json(todo)`.",
          "Check the id first with `mongoose.isValidObjectId(id)` (400), then `findById` returns `null` when nothing matches (404).",
        ],
      },
    ],
  },
  {
    lesson: "db-updates",
    exercises: [
      {
        id: "stock-updates",
        title: "Update without losing stock",
        goal: "`restock` should return the **updated** product. `buy` must never sell more than is in stock, even when two orders arrive at once.",
        file: "inventory.js",
        support: { "models/Product.js": productModel },
        starter: `import Product from './models/Product.js';

// Add n units and return the product AFTER the update.
export async function restock(id, n) {
  return Product.findByIdAndUpdate(id, { $inc: { stock: n } });
}

// Take qty units if there are enough. Returns true if the purchase went through.
export async function buy(id, qty) {
  const p = await Product.findById(id);
  if (p.stock < qty) return false;
  p.stock -= qty;
  await p.save();
  return true;
}
`,
        solution: `import Product from './models/Product.js';

export async function restock(id, n) {
  return Product.findByIdAndUpdate(id, { $inc: { stock: n } }, { new: true });
}

export async function buy(id, qty) {
  const r = await Product.updateOne({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
  return r.modifiedCount === 1;
}
`,
        tests: {
          "inventory.test.js": `import Product from './models/Product.js';
import { restock, buy } from './inventory.js';

let lamp;
beforeEach(async () => {
  await Product.deleteMany({});
  lamp = await Product.create({ name: 'Lamp', price: 30, stock: 1 });
});

test('restock returns the updated stock', async () => {
  const p = await restock(lamp._id, 4);
  expect(p.stock).toBe(5);
});

test('buy refuses when there is not enough stock', async () => {
  expect(await buy(lamp._id, 2)).toBe(false);
  expect((await Product.findById(lamp._id)).stock).toBe(1);
});

test('two buyers racing for the last lamp: only one wins', async () => {
  const results = await Promise.all([buy(lamp._id, 1), buy(lamp._id, 1)]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect((await Product.findById(lamp._id)).stock).toBe(0);
});
`,
        },
        hints: [
          "`findByIdAndUpdate` returns the document as it was **before** the update unless you pass `{ new: true }`.",
          "In `buy`, the read and the write are separate steps. Two requests can both read `stock: 1` before either saves.",
          "Make it one atomic step: `Product.updateOne({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty } })`, then check `modifiedCount === 1`.",
        ],
      },
    ],
  },
  {
    lesson: "db-relations",
    exercises: [
      {
        id: "posts-authors",
        title: "Posts and their authors",
        goal: "Posts reference users. `postsWithAuthors()` returns every post with its `author` filled in (sorted by title), and `postsBy(userId)` returns one user's posts.",
        file: "posts.js",
        support: {
          "models/User.js": `import mongoose from 'mongoose';

export default mongoose.model('User', new mongoose.Schema({ name: { type: String, required: true } }));
`,
          "models/Post.js": `import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

export default mongoose.model('Post', postSchema);
`,
        },
        starter: `import Post from './models/Post.js';

// Every post, sorted by title, with post.author replaced by the full user document.
export async function postsWithAuthors() {
  return Post.find().sort({ title: 1 });
}

// Posts written by the user with this id.
export async function postsBy(userId) {
  // TODO
}
`,
        solution: `import Post from './models/Post.js';

export async function postsWithAuthors() {
  return Post.find().sort({ title: 1 }).populate('author');
}

export async function postsBy(userId) {
  return Post.find({ author: userId });
}
`,
        tests: {
          "posts.test.js": `import User from './models/User.js';
import Post from './models/Post.js';
import { postsWithAuthors, postsBy } from './posts.js';

let ada, linus;
beforeEach(async () => {
  await Post.deleteMany({});
  await User.deleteMany({});
  ada = await User.create({ name: 'Ada' });
  linus = await User.create({ name: 'Linus' });
  await Post.create({ title: 'Engines', author: ada._id });
  await Post.create({ title: 'Kernels', author: linus._id });
  await Post.create({ title: 'Analytics', author: ada._id });
});

test('postsWithAuthors fills in author names', async () => {
  const posts = await postsWithAuthors();
  expect(posts.map((p) => p.title)).toEqual(['Analytics', 'Engines', 'Kernels']);
  expect(posts.map((p) => p.author.name)).toEqual(['Ada', 'Ada', 'Linus']);
});

test('postsBy returns only that author\\'s posts', async () => {
  const posts = await postsBy(ada._id);
  expect(posts.map((p) => p.title).sort()).toEqual(['Analytics', 'Engines']);
});
`,
        },
        hints: [
          "The post only stores the author's `_id`. `.populate('author')` swaps it for the user document.",
          "`populate` chains like `sort`: `Post.find().sort(...).populate('author')`.",
          "To filter by a reference, compare the id field: `Post.find({ author: userId })`.",
        ],
      },
    ],
  },
  {
    lesson: "db-pagination",
    exercises: [
      {
        id: "paged-list",
        title: "Pages that add up",
        goal: "`listPage(page, limit)` returns `{ items, page, total, totalPages }`. Pages start at 1, items are sorted by `n`, and `limit` is capped at 50.",
        file: "pages.js",
        support: {
          "models/Item.js": `import mongoose from 'mongoose';

export default mongoose.model('Item', new mongoose.Schema({ n: Number }));
`,
        },
        starter: `import Item from './models/Item.js';

export async function listPage(page = 1, limit = 10) {
  const items = await Item.find().skip(page * limit).limit(limit);
  return { items, page, total: items.length, totalPages: 1 };
}
`,
        solution: `import Item from './models/Item.js';

export async function listPage(page = 1, limit = 10) {
  const size = Math.min(Math.max(limit, 1), 50);
  const p = Math.max(page, 1);
  const [items, total] = await Promise.all([
    Item.find().sort({ n: 1 }).skip((p - 1) * size).limit(size),
    Item.countDocuments(),
  ]);
  return { items, page: p, total, totalPages: Math.ceil(total / size) };
}
`,
        tests: {
          "pages.test.js": `import Item from './models/Item.js';
import { listPage } from './pages.js';

beforeEach(async () => {
  await Item.deleteMany({});
  const docs = [];
  for (let n = 25; n >= 1; n--) docs.push({ n });
  await Item.create(docs);
});

test('page 1 starts at the first item', async () => {
  const r = await listPage(1, 10);
  expect(r.items.map((i) => i.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('total and totalPages describe the whole collection', async () => {
  const r = await listPage(1, 10);
  expect(r.total).toBe(25);
  expect(r.totalPages).toBe(3);
});

test('the last page is partial', async () => {
  const r = await listPage(3, 10);
  expect(r.items.map((i) => i.n)).toEqual([21, 22, 23, 24, 25]);
});

test('limit is capped at 50', async () => {
  const r = await listPage(1, 1000);
  expect(r.totalPages).toBe(1);
  expect(r.items).toHaveLength(25);
});
`,
        },
        hints: [
          "Page 1 should skip nothing: `skip((page - 1) * limit)`.",
          "Without `.sort({ n: 1 })` the order is whatever the database feels like, so pages can repeat or skip items.",
          "`total` is the size of the whole collection: `Item.countDocuments()`, not `items.length`. Then `totalPages = Math.ceil(total / limit)`.",
        ],
      },
    ],
  },
  {
    lesson: "db-aggregate",
    exercises: [
      {
        id: "sales-report",
        title: "Your first report",
        goal: "Group orders: `totalsByCategory()` returns `{ _id: category, total, count }` sorted by total, highest first. `topCustomers(n)` returns the n biggest spenders as `{ _id: customer, spent }`.",
        file: "report.js",
        support: {
          "models/Order.js": `import mongoose from 'mongoose';

export default mongoose.model('Order', new mongoose.Schema({
  customer: String,
  category: String,
  amount: Number,
}));
`,
        },
        starter: `import Order from './models/Order.js';

// [{ _id: 'books', total: 55, count: 2 }, ...] sorted by total, highest first.
export async function totalsByCategory() {
  // TODO: Order.aggregate([...])
}

// The n customers who spent the most: [{ _id: 'ana', spent: 120 }, ...]
export async function topCustomers(n) {
  // TODO
}
`,
        solution: `import Order from './models/Order.js';

export async function totalsByCategory() {
  return Order.aggregate([
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
}

export async function topCustomers(n) {
  return Order.aggregate([
    { $group: { _id: '$customer', spent: { $sum: '$amount' } } },
    { $sort: { spent: -1 } },
    { $limit: n },
  ]);
}
`,
        tests: {
          "report.test.js": `import Order from './models/Order.js';
import { totalsByCategory, topCustomers } from './report.js';

beforeEach(async () => {
  await Order.deleteMany({});
  await Order.create([
    { customer: 'ana', category: 'books', amount: 20 },
    { customer: 'ben', category: 'games', amount: 60 },
    { customer: 'ana', category: 'games', amount: 100 },
    { customer: 'cy', category: 'books', amount: 35 },
    { customer: 'ben', category: 'music', amount: 10 },
  ]);
});

test('totalsByCategory sums and counts per category', async () => {
  const rows = await totalsByCategory();
  expect(rows).toEqual([
    { _id: 'games', total: 160, count: 2 },
    { _id: 'books', total: 55, count: 2 },
    { _id: 'music', total: 10, count: 1 },
  ]);
});

test('topCustomers returns the biggest spenders', async () => {
  const rows = await topCustomers(2);
  expect(rows).toEqual([
    { _id: 'ana', spent: 120 },
    { _id: 'ben', spent: 70 },
  ]);
});
`,
        },
        hints: [
          "`aggregate` takes an array of stages. Each document flows through them in order.",
          "`{ $group: { _id: '$category', total: { $sum: '$amount' } } }`: the `$` in `'$amount'` means \"the value of this field\". `{ $sum: 1 }` counts.",
          "Add `{ $sort: { total: -1 } }` after the group, and `{ $limit: n }` for the top-n.",
        ],
      },
    ],
  },
  {
    lesson: "db-errors",
    exercises: [
      {
        id: "signup-errors",
        title: "Turn database errors into status codes",
        goal: "`POST /users` creates a user (201). A validation failure is **400**, a duplicate email is **409**, and the password never comes back in the response.",
        file: "users.controller.js",
        support: {
          "models/User.js": `import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
});

export default mongoose.model('User', userSchema);
`,
          "app.js": `import express from 'express';
import { createUser } from './users.controller.js';

const app = express();
app.use(express.json());
app.post('/users', createUser);

export default app;
`,
        },
        starter: `import User from './models/User.js';

export async function createUser(req, res) {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}
`,
        solution: `import User from './models/User.js';

export async function createUser(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.create({ email, password });
    res.status(201).json({ id: user._id, email: user.email });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Something went wrong' });
  }
}
`,
        tests: {
          "users.test.js": `import request from 'supertest';
import app from './app.js';
import User from './models/User.js';

beforeEach(async () => {
  await User.deleteMany({});
});

test('creates a user with 201', async () => {
  const res = await request(app).post('/users').send({ email: 'Ada@Example.com', password: 'correct-horse' });
  expect(res.status).toBe(201);
  expect(res.body.email).toBe('ada@example.com');
});

test('never returns the password', async () => {
  const res = await request(app).post('/users').send({ email: 'a@b.co', password: 'correct-horse' });
  expect(res.body).not.toHaveProperty('password');
});

test('a short password is a 400', async () => {
  const res = await request(app).post('/users').send({ email: 'a@b.co', password: 'short' });
  expect(res.status).toBe(400);
});

test('a duplicate email is a 409', async () => {
  await request(app).post('/users').send({ email: 'a@b.co', password: 'correct-horse' });
  const res = await request(app).post('/users').send({ email: 'A@B.co', password: 'another-one' });
  expect(res.status).toBe(409);
});
`,
        },
        hints: [
          "Look at the error before answering: `err.name === 'ValidationError'` means the input broke a schema rule, so it's the client's fault (400).",
          "A unique index violation has `err.code === 11000`. That's a conflict: 409.",
          "Respond with only safe fields, e.g. `{ id: user._id, email: user.email }`, instead of the whole document.",
        ],
      },
    ],
  },
];
