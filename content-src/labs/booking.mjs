const model = `import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  room: { type: String, required: true },
  owner: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
});

export default mongoose.model('Booking', bookingSchema);
`;

const controllerBuggy = `import Booking from '../models/Booking.js';

// POST /api/rooms/:room/bookings  { owner, start, end }  (ISO strings)
export const createBooking = async (req, res, next) => {
  try {
    const { room } = req.params;
    const { owner, start, end } = req.body;
    if (!owner || !start || !end) {
      return res.status(400).json({ message: 'owner, start and end are required' });
    }

    const clash = await Booking.findOne({
      room,
      start: { $gte: start },
      end: { $lte: end },
    });
    if (clash) {
      return res.status(409).json({ message: 'Room already booked for that time' });
    }

    const booking = await Booking.create({ room, owner, start, end });
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

// GET /api/rooms/:room/bookings -> sorted by start time
export const listBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ room: req.params.room });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};
`;

const controllerFixed = `import Booking from '../models/Booking.js';

// POST /api/rooms/:room/bookings  { owner, start, end }  (ISO strings)
export const createBooking = async (req, res, next) => {
  try {
    const { room } = req.params;
    const { owner, start, end } = req.body;
    if (!owner || !start || !end) {
      return res.status(400).json({ message: 'owner, start and end are required' });
    }
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
      return res.status(400).json({ message: 'end must be after start' });
    }

    // two ranges overlap iff each one starts before the other ends
    const clash = await Booking.findOne({
      room,
      start: { $lt: e },
      end: { $gt: s },
    });
    if (clash) {
      return res.status(409).json({ message: 'Room already booked for that time' });
    }

    const booking = await Booking.create({ room, owner, start: s, end: e });
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

// GET /api/rooms/:room/bookings -> sorted by start time
export const listBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ room: req.params.room }).sort({ start: 1 });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};
`;

const app = `import express from 'express';
import { createBooking, listBookings } from './controllers/bookingController.js';

const app = express();
app.use(express.json());
app.post('/api/rooms/:room/bookings', createBooking);
app.get('/api/rooms/:room/bookings', listBookings);

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

export default app;
`;

const tests = `import request from 'supertest';
import app from '../app.js';
import Booking from '../models/Booking.js';

const t = (h, m = 0) => new Date(Date.UTC(2026, 0, 15, h, m)).toISOString();
const book = (room, owner, start, end) => request(app).post(\`/api/rooms/\${room}/bookings\`).send({ owner, start, end });

beforeEach(async () => {
  await Booking.deleteMany({});
  await book('SEA-1', 'ana', t(10), t(11));
});

test.each([
  ['starts inside', t(10, 30), t(11, 30)],
  ['ends inside', t(9, 30), t(10, 30)],
  ['covers fully', t(9), t(12)],
  ['inside fully', t(10, 15), t(10, 45)],
  ['identical', t(10), t(11)],
])('overlap is rejected: %s', async (_, s, e) => {
  const res = await book('SEA-1', 'bo', s, e);
  expect(res.status).toBe(409);
});

test('back-to-back bookings are allowed', async () => {
  expect((await book('SEA-1', 'bo', t(11), t(12))).status).toBe(201);
  expect((await book('SEA-1', 'cy', t(9), t(10))).status).toBe(201);
});

test('same time in a different room is fine', async () => {
  expect((await book('SEA-2', 'bo', t(10), t(11))).status).toBe(201);
});

test('end must be after start', async () => {
  expect((await book('SEA-1', 'bo', t(14), t(13))).status).toBe(400);
  expect((await book('SEA-1', 'bo', t(14), t(14))).status).toBe(400);
});

test('list is sorted by start time', async () => {
  await book('SEA-1', 'bo', t(15), t(16));
  await book('SEA-1', 'cy', t(8), t(9));
  const res = await request(app).get('/api/rooms/SEA-1/bookings');
  expect(res.body.map((b) => b.owner)).toEqual(['cy', 'ana', 'bo']);
});
`;

export default {
  slug: "room-booking",
  order: 8,
  title: "Meeting Room Double-Booking",
  difficulty: "Medium",
  minutes: 25,
  tagline: "Two teams keep landing in the same room at the same time.",
  ticket: `**FAC-301 · Conference rooms double booked**

The booking API only rejects a new booking if it is entirely *inside* an existing one, so partial overlaps get through. Back-to-back meetings (10:00–11:00 then 11:00–12:00) must be **allowed**. Bookings where end ≤ start must be **400**. The listing must be sorted by start time.`,
  env: {},
  files: { "app.js": app, "controllers/bookingController.js": controllerBuggy, "models/Booking.js": model },
  tests: { "tests/booking.test.js": tests },
  fixes: { "controllers/bookingController.js": controllerFixed },
  bugs: [
    { file: "controllers/bookingController.js", title: "wrong overlap predicate", explain: "Intervals [s1,e1) and [s2,e2) overlap **iff** `s1 < e2 && s2 < e1`. As a query: `start: { $lt: newEnd }, end: { $gt: newStart }`. Strict inequalities allow back-to-back." },
    { file: "controllers/bookingController.js", title: "no start/end validation", explain: "Parse the dates, reject invalid ones, and require `end > start`." },
    { file: "controllers/bookingController.js", title: "unsorted list", explain: "`find()` has no guaranteed order. Add `.sort({ start: 1 })`." },
  ],
  hints: ["Draw the 5 overlap cases on a timeline. Which ones does the current query catch?", "What is the negation of 'A ends before B starts OR B ends before A starts'?"],
  concepts: ["interval overlap", "date handling", "query operators", "sorting"],
};
