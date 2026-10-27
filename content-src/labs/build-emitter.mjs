const stub = `/**
 * A tiny EventEmitter.
 *
 * on(event, fn)    subscribe; returns an unsubscribe function
 * once(event, fn)  subscribe for the next emit only
 * off(event, fn)   unsubscribe (works for once-listeners too, using the original fn)
 * emit(event, ...args) call listeners in subscription order; returns true if there were any
 *   - a listener that throws must not stop the others; collect errors and, after all
 *     listeners ran, emit them on the 'error' event (or rethrow the first if nobody listens to 'error')
 * listenerCount(event)
 */
export class Emitter {
  // TODO
}
`;

const solution = `/**
 * A tiny EventEmitter.
 *
 * on(event, fn)    subscribe; returns an unsubscribe function
 * once(event, fn)  subscribe for the next emit only
 * off(event, fn)   unsubscribe (works for once-listeners too, using the original fn)
 * emit(event, ...args) call listeners in subscription order; returns true if there were any
 *   - a listener that throws must not stop the others; collect errors and, after all
 *     listeners ran, emit them on the 'error' event (or rethrow the first if nobody listens to 'error')
 * listenerCount(event)
 */
export class Emitter {
  constructor() {
    this.listeners = new Map(); // event -> [{ fn, original }]
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push({ fn, original: fn });
    return () => this.off(event, fn);
  }

  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, fn);
      return fn(...args);
    };
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push({ fn: wrapper, original: fn });
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this.listeners.get(event);
    if (!list) return;
    const i = list.findIndex((l) => l.original === fn || l.fn === fn);
    if (i >= 0) list.splice(i, 1);
  }

  emit(event, ...args) {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) return false;
    const errors = [];
    for (const { fn } of [...list]) {
      try {
        fn(...args);
      } catch (err) {
        errors.push(err);
      }
    }
    if (errors.length) {
      if (event !== 'error' && this.listenerCount('error')) errors.forEach((e) => this.emit('error', e));
      else throw errors[0];
    }
    return true;
  }

  listenerCount(event) {
    return (this.listeners.get(event) || []).length;
  }
}
`;

const tests = `import { Emitter } from '../lib/emitter.js';

test('on + emit passes args in order', () => {
  const e = new Emitter();
  const calls = [];
  e.on('order', (id, total) => calls.push(['a', id, total]));
  e.on('order', (id) => calls.push(['b', id]));
  expect(e.emit('order', 7, 99)).toBe(true);
  expect(calls).toEqual([['a', 7, 99], ['b', 7]]);
});

test('emit with no listeners returns false', () => {
  expect(new Emitter().emit('nothing')).toBe(false);
});

test('on returns an unsubscribe function', () => {
  const e = new Emitter();
  const fn = jest.fn();
  const off = e.on('x', fn);
  off();
  e.emit('x');
  expect(fn).toHaveBeenCalledTimes(0);
});

test('once fires a single time and can be removed with off(original)', () => {
  const e = new Emitter();
  const a = jest.fn();
  const b = jest.fn();
  e.once('x', a);
  e.once('x', b);
  e.off('x', b);
  e.emit('x', 1);
  e.emit('x', 2);
  expect(a.mock.calls).toEqual([[1]]);
  expect(b).toHaveBeenCalledTimes(0);
});

test('removing a listener during emit does not skip the next one', () => {
  const e = new Emitter();
  const calls = [];
  e.once('x', () => calls.push(1));
  e.on('x', () => calls.push(2));
  e.emit('x');
  expect(calls).toEqual([1, 2]);
});

test('a throwing listener does not stop others; error goes to "error" listeners', () => {
  const e = new Emitter();
  const after = jest.fn();
  const onErr = jest.fn();
  e.on('error', onErr);
  e.on('x', () => {
    throw new Error('bad listener');
  });
  e.on('x', after);
  e.emit('x');
  expect(after).toHaveBeenCalledTimes(1);
  expect(onErr.mock.calls[0][0].message).toBe('bad listener');
});

test('without an error listener the first error is rethrown after all listeners ran', () => {
  const e = new Emitter();
  const after = jest.fn();
  e.on('x', () => {
    throw new Error('boom');
  });
  e.on('x', after);
  expect(() => e.emit('x')).toThrow('boom');
  expect(after).toHaveBeenCalledTimes(1);
});

test('listenerCount', () => {
  const e = new Emitter();
  e.on('a', () => {});
  e.once('a', () => {});
  expect(e.listenerCount('a')).toBe(2);
  expect(e.listenerCount('b')).toBe(0);
});
`;

export default {
  slug: "build-event-emitter",
  order: 104,
  kind: "build",
  title: "Build: Event Emitter",
  difficulty: "Medium",
  minutes: 30,
  tagline: "on / once / off / emit with error isolation, a frequent interview build.",
  ticket: `## Spec

Implement the \`Emitter\` class in \`lib/emitter.js\` (contract in the doc comment).

Watch out for two classic traps:
- **mutating the listener array while iterating it** (a \`once\` listener removes itself mid-emit)
- **\`off\` for once-listeners**: the stored function is a wrapper, but the user passes the original`,
  env: {},
  files: { "lib/emitter.js": stub },
  tests: { "tests/emitter.test.js": tests },
  fixes: { "lib/emitter.js": solution },
  bugs: [
    { file: "lib/emitter.js", title: "Storage", explain: "`Map<event, Array<{ fn, original }>>`. Keep the original so `off(event, original)` can find wrapped once-listeners." },
    { file: "lib/emitter.js", title: "emit over a snapshot", explain: "Iterate `[...list]` so removals during emit don't shift indices." },
    { file: "lib/emitter.js", title: "Error isolation", explain: "Wrap each call in try/catch, collect errors, then route them to `'error'` listeners or rethrow the first." },
  ],
  hints: ["once = a wrapper that removes itself, then calls the original.", "Why copy the array before looping?"],
  concepts: ["observer pattern", "closures", "iteration safety", "error isolation"],
};
