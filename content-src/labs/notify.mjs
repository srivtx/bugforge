const channels = `// Delivery channels. Each send() resolves on success or rejects on failure.
export const sent = [];

export const channels = {
  email: async (user, msg) => {
    if (!user.email) throw new Error('no email address');
    sent.push(['email', user.id, msg]);
  },
  sms: async (user, msg) => {
    if (!user.phone) throw new Error('no phone number');
    sent.push(['sms', user.id, msg]);
  },
  push: async (user, msg) => {
    if (!user.deviceToken) throw new Error('no device token');
    sent.push(['push', user.id, msg]);
  },
};
`;

const dispatcherBuggy = `import { channels } from './channels.js';

/**
 * Sends \`msg\` to every user on each of their preferred channels.
 * Never throws because one channel failed; instead returns a report:
 *   { delivered: number, failed: [{ userId, channel, error }] }
 */
export async function notifyAll(users, msg) {
  const report = { delivered: 0, failed: [] };
  const jobs = [];
  for (var i = 0; i < users.length; i++) {
    for (const ch of users[i].prefs) {
      jobs.push(
        channels[ch](users[i], msg).then(() => {
          report.delivered++;
        })
      );
    }
  }
  await Promise.all(jobs);
  return report;
}

/**
 * Builds one personalised message per user: "Hi <name>, <text>".
 * Returns an array of zero-arg functions, executed later by a scheduler.
 */
export function buildGreetings(users, text) {
  const tasks = [];
  for (var i = 0; i < users.length; i++) {
    tasks.push(() => \`Hi \${users[i].name}, \${text}\`);
  }
  return tasks;
}
`;

const dispatcherFixed = `import { channels } from './channels.js';

/**
 * Sends \`msg\` to every user on each of their preferred channels.
 * Never throws because one channel failed; instead returns a report:
 *   { delivered: number, failed: [{ userId, channel, error }] }
 */
export async function notifyAll(users, msg) {
  const report = { delivered: 0, failed: [] };
  const jobs = [];
  for (const user of users) {
    for (const ch of user.prefs) {
      jobs.push({ user, ch, p: channels[ch](user, msg) });
    }
  }
  const results = await Promise.allSettled(jobs.map((j) => j.p));
  results.forEach((r, idx) => {
    if (r.status === 'fulfilled') report.delivered++;
    else report.failed.push({ userId: jobs[idx].user.id, channel: jobs[idx].ch, error: r.reason.message });
  });
  return report;
}

/**
 * Builds one personalised message per user: "Hi <name>, <text>".
 * Returns an array of zero-arg functions, executed later by a scheduler.
 */
export function buildGreetings(users, text) {
  const tasks = [];
  for (let i = 0; i < users.length; i++) {
    tasks.push(() => \`Hi \${users[i].name}, \${text}\`);
  }
  return tasks;
}
`;

const tests = `import { notifyAll, buildGreetings } from '../services/dispatcher.js';
import { sent } from '../services/channels.js';

const users = [
  { id: 'u1', name: 'Ana', email: 'a@x.com', phone: '+1', prefs: ['email', 'sms'] },
  { id: 'u2', name: 'Bo', email: 'b@x.com', prefs: ['email', 'push'] },
  { id: 'u3', name: 'Cy', deviceToken: 't', prefs: ['push'] },
];

beforeEach(() => {
  sent.length = 0;
});

test('one failing channel does not abort the batch', async () => {
  const report = await notifyAll(users, 'sale!');
  expect(report.delivered).toBe(4);
  expect(sent).toHaveLength(4);
});

test('failures are reported with user, channel and reason', async () => {
  const report = await notifyAll(users, 'sale!');
  expect(report.failed).toEqual([{ userId: 'u2', channel: 'push', error: 'no device token' }]);
});

test('all deliveries go to the right user', async () => {
  await notifyAll(users, 'x');
  expect(sent.map((s) => s[0] + ':' + s[1]).sort()).toEqual(['email:u1', 'email:u2', 'push:u3', 'sms:u1']);
});

test('deferred greetings capture each user', () => {
  const tasks = buildGreetings(users, 'your order shipped');
  expect(tasks.map((t) => t())).toEqual([
    'Hi Ana, your order shipped',
    'Hi Bo, your order shipped',
    'Hi Cy, your order shipped',
  ]);
});
`;

export default {
  slug: "notification-fanout",
  order: 15,
  title: "Notification Fan-out",
  difficulty: "Medium",
  minutes: 20,
  tagline: "One bad device token kills the whole campaign; every greeting says 'Hi undefined'.",
  ticket: `**MKT-204 · Peak-sale campaign only partially sent**

The campaign job crashed with \`no device token\` and **nobody** got a report of what was delivered. The deferred greeting tasks also produce \`"Hi undefined, …"\` for every customer.

\`notifyAll\` must deliver everything it can and **report** failures (see doc comment).`,
  env: {},
  files: { "services/dispatcher.js": dispatcherBuggy, "services/channels.js": channels },
  tests: { "tests/dispatcher.test.js": tests },
  fixes: { "services/dispatcher.js": dispatcherFixed },
  bugs: [
    { file: "services/dispatcher.js", title: "Promise.all fails fast", explain: "`Promise.all` rejects as soon as one promise rejects, so you lose all the other outcomes. Use `Promise.allSettled` and build the report from each result." },
    { file: "services/dispatcher.js", title: "`var` in a loop with closures", explain: "`var i` is function-scoped. Every closure sees the final `i === users.length`, so `users[i]` is undefined. Use `let` (block scoped per iteration)." },
  ],
  hints: ["What does Promise.all do when one of 5 promises rejects?", "When do the greeting functions actually run, and what is `i` then?"],
  concepts: ["Promise.allSettled", "closures", "var vs let", "partial failure reporting"],
};
