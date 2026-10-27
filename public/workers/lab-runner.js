// In-browser "mini Node" for debugging labs.
// Provides: ESM->CJS loader, express, mongoose (in-memory), supertest, jsonwebtoken, bcryptjs,
// dotenv, cors, uuid, and a Jest-compatible test runner. Everything runs inside this worker.
//
// Message in:  { files: { path: source }, testFiles: [path], env: {} }
// Message out: { type: 'done', tests: [...], traces: [...], logs: [...], loadError }

/* ------------------------------------------------------------------ utils */

const realNow = Date.now.bind(Date);
let clockOffset = 0;
Date.now = () => realNow() + clockOffset;

function fmt(v) {
  if (typeof v === "string") return v;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  try {
    return JSON.stringify(v, (_, x) => (x && x.__oid ? String(x) : x));
  } catch {
    return String(v);
  }
}

function pretty(v) {
  if (v === undefined) return "undefined";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "function") return "[Function]";
  try {
    const s = JSON.stringify(v, (_, x) => (x === undefined ? "__undef__" : x && x.__oid ? String(x) : x));
    return s.length > 400 ? s.slice(0, 400) + "…" : s.replace(/"__undef__"/g, "undefined");
  } catch {
    return String(v);
  }
}

function plain(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

// JSON-like normalisation that keeps asymmetric matchers (expect.any(...))
function norm(v) {
  if (v && typeof v.asymmetricMatch === "function") return v;
  if (v === undefined || typeof v === "function") return undefined;
  if (v === null || typeof v !== "object") return v;
  if (v.__oid) return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v.toJSON === "function" && !Array.isArray(v)) return norm(v.toJSON());
  if (Array.isArray(v)) return v.map((x) => (x === undefined ? null : norm(x)));
  const o = {};
  for (const k of Object.keys(v)) {
    const n = norm(v[k]);
    if (n !== undefined) o[k] = n;
  }
  return o;
}

function deepEqual(a, b) {
  if (b && typeof b.asymmetricMatch === "function") return b.asymmetricMatch(a);
  if (a === b) return true;
  if (a && b && a.__oid && b.__oid) return String(a) === String(b);
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

function matchObject(actual, expected) {
  if (expected && typeof expected.asymmetricMatch === "function") return expected.asymmetricMatch(actual);
  if (expected === null || typeof expected !== "object") return deepEqual(actual, expected);
  if (actual === null || typeof actual !== "object") return false;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && expected.every((e, i) => matchObject(actual[i], e));
  }
  return Object.keys(expected).every((k) => matchObject(actual[k], expected[k]));
}

function getPath(obj, path) {
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || !(p in Object(cur))) return { found: false };
    cur = cur[p];
  }
  return { found: true, value: cur };
}

/* ------------------------------------------------------------------ trace */

let currentTest = null;
let traces = [];
let serverLogs = [];
let activeReq = null;

function traceStep(kind, name, detail, extra) {
  if (activeReq) activeReq.steps.push({ kind, name, detail, ...(extra || {}) });
}

/* ------------------------------------------------------------------ ESM -> CJS */

function nl(s) {
  return "\n".repeat((s.match(/\n/g) || []).length);
}
function q(s) {
  return JSON.stringify(s);
}
function named(list) {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^([\w$]+)\s+as\s+([\w$]+)$/, "$1: $2"))
    .join(", ");
}

function toCjs(src) {
  const tail = [];
  let isEsm = false;
  let out = src;
  out = out.replace(/^[ \t]*import\s+([\w$]+)\s*,\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/gm, (m, d, n, mod) => {
    isEsm = true;
    return `const ${d} = __def(require(${q(mod)})); const {${named(n)}} = require(${q(mod)});${nl(m)}`;
  });
  out = out.replace(/^[ \t]*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/gm, (m, n, mod) => {
    isEsm = true;
    return `const {${named(n)}} = require(${q(mod)});${nl(m)}`;
  });
  out = out.replace(/^[ \t]*import\s*\*\s*as\s+([\w$]+)\s+from\s*['"]([^'"]+)['"];?/gm, (m, d, mod) => {
    isEsm = true;
    return `const ${d} = require(${q(mod)});${nl(m)}`;
  });
  out = out.replace(/^[ \t]*import\s+([\w$]+)\s+from\s*['"]([^'"]+)['"];?/gm, (m, d, mod) => {
    isEsm = true;
    return `const ${d} = __def(require(${q(mod)}));${nl(m)}`;
  });
  out = out.replace(/^[ \t]*import\s*['"]([^'"]+)['"];?/gm, (m, mod) => {
    isEsm = true;
    return `require(${q(mod)});`;
  });
  out = out.replace(/^([ \t]*)export\s+default\s+/gm, (m, ind) => {
    isEsm = true;
    return `${ind}module.exports.default = `;
  });
  out = out.replace(/^([ \t]*)export\s+(const|let|var)\s+([\w$]+)/gm, (m, ind, kw, name) => {
    isEsm = true;
    tail.push(name);
    return `${ind}${kw} ${name}`;
  });
  out = out.replace(/^([ \t]*)export\s+(async\s+function\*?|function\*?|class)\s+([\w$]+)/gm, (m, ind, kw, name) => {
    isEsm = true;
    tail.push(name);
    return `${ind}${kw} ${name}`;
  });
  out = out.replace(/^[ \t]*export\s*\{([^}]*)\};?/gm, (m, list) => {
    isEsm = true;
    const parts = list
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const mm = s.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
        return `module.exports[${q(mm[2] || mm[1])}] = ${mm[1]};`;
      });
    return parts.join(" ") + nl(m);
  });
  let head = "";
  if (isEsm) head = 'Object.defineProperty(module.exports, "__esModule", { value: true });';
  const exportsTail = tail.map((n) => `module.exports[${q(n)}] = ${n};`).join(" ");
  return head + out + "\n;" + exportsTail;
}

/* ------------------------------------------------------------------ express */

function compilePath(path, end) {
  if (path instanceof RegExp) return { re: path, keys: [] };
  const keys = [];
  let p = path === "/" && !end ? "" : path.replace(/\/$/, "");
  const pattern = p
    .replace(/[.+?^${}()|[\]\\]/g, (c) => (c === "?" ? c : "\\" + c))
    .replace(/\\?\/:([\w]+)(\?)?/g, (_, k, opt) => {
      keys.push(k);
      return opt ? "(?:/([^/]+))?" : "/([^/]+)";
    })
    .replace(/\*/g, ".*");
  const re = new RegExp("^" + pattern + (end ? "/?$" : "(?=/|$)"), "i");
  return { re, keys };
}

class HeadersSentError extends Error {
  constructor() {
    super("Cannot set headers after they are sent to the client");
    this.name = "Error [ERR_HTTP_HEADERS_SENT]";
    this.code = "ERR_HTTP_HEADERS_SENT";
  }
}

function createExpress() {
  function makeRouter() {
    const layers = [];
    const router = function (req, res, next) {
      return router.handle(req, res, next);
    };
    router.__isRouter = true;
    const add = (method) =>
      function (path, ...handlers) {
        for (const h of handlers.flat()) {
          if (typeof h !== "function") throw new TypeError(`Route.${(method || "use").toLowerCase()}() requires a callback function but got a ${typeof h}`);
          layers.push({ method, ...compilePath(path, true), handler: h, end: true, route: path });
        }
        return router;
      };
    for (const m of ["get", "post", "put", "patch", "delete", "all"]) {
      router[m] = add(m === "all" ? "ALL" : m.toUpperCase());
    }
    router.use = function (first, ...rest) {
      let path = "/";
      let handlers = [first, ...rest];
      if (typeof first === "string" || first instanceof RegExp) {
        path = first;
        handlers = rest;
      }
      for (const h of handlers.flat()) {
        if (typeof h !== "function") throw new TypeError(`Router.use() requires a middleware function but got a ${h === undefined ? "undefined" : typeof h}`);
        layers.push({ method: null, ...compilePath(path, false), handler: h, end: false, route: path });
      }
      return router;
    };
    router.route = function (path) {
      const api = {};
      for (const m of ["get", "post", "put", "patch", "delete", "all"]) {
        api[m] = (...h) => {
          router[m](path, ...h);
          return api;
        };
      }
      return api;
    };
    router.handle = function (req, res, out) {
      let idx = 0;
      const base = req.baseUrl || "";
      const fullPath = req.path;
      const rel = fullPath.slice(base.length) || "/";
      function next(err) {
        if (err === "route" || err === "router") err = undefined;
        while (idx < layers.length) {
          const layer = layers[idx++];
          if (layer.method && layer.method !== "ALL" && layer.method !== req.method) continue;
          const m = layer.re.exec(rel);
          if (!m) continue;
          const isErrHandler = layer.handler.length === 4;
          if (err && !isErrHandler) continue;
          if (!err && isErrHandler) continue;
          const params = {};
          layer.keys.forEach((k, i) => {
            if (m[i + 1] !== undefined) params[k] = decodeURIComponent(m[i + 1]);
          });
          if (layer.end || Object.keys(params).length) req.params = { ...(req.params || {}), ...params };
          const h = layer.handler;
          const label = h.__label || h.name || (h.__isRouter ? "router" : "anonymous");
          if (h.__isRouter) {
            const prevBase = req.baseUrl;
            req.baseUrl = base + m[0].replace(/\/$/, "");
            traceStep("router", `router ${layer.route}`, "");
            return h.handle(req, res, (e) => {
              req.baseUrl = prevBase;
              next(e);
            });
          }
          if (!h.__silent) traceStep(isErrHandler ? "error" : layer.end ? "handler" : "middleware", label, err ? String(err.message || err) : "");
          try {
            const r = isErrHandler ? h(err, req, res, next) : h(req, res, next);
            if (r && typeof r.then === "function") {
              r.then(undefined, (e) => next(e));
            }
          } catch (e) {
            next(e);
          }
          return;
        }
        out(err);
      }
      next();
    };
    return router;
  }

  function express() {
    const app = makeRouter();
    app.__isApp = true;
    app.locals = {};
    const settings = {};
    app.set = (k, v) => ((settings[k] = v), app);
    app.listen = (port, cb) => {
      if (typeof cb === "function") cb();
      return { close: (fn) => fn && fn() };
    };
    app.__dispatch = (req, res) => {
      app.handle(req, res, (err) => {
        if (res.headersSent) return;
        if (err) {
          traceStep("error", "express default handler", String(err.message || err));
          serverLogs.push({ test: currentTest, level: "error", text: String(err.stack || err) });
          res.status(err.status || err.statusCode || 500).send(`<pre>${err.name}: ${err.message}</pre>`);
        } else {
          res.status(404).send(`Cannot ${req.method} ${req.path}`);
        }
      });
    };
    return app;
  }
  const json = () => {
    const f = function jsonParser(req, res, next) {
      if (req.__raw !== undefined && req.body === undefined) req.body = req.__raw;
      next();
    };
    f.__silent = true;
    return f;
  };
  const urlencoded = () => {
    const f = function urlencodedParser(req, res, next) {
      next();
    };
    f.__silent = true;
    return f;
  };
  express.Router = () => makeRouter();
  express.json = json;
  express.urlencoded = urlencoded;
  express.static = () => (req, res, next) => next();
  return express;
}

/* ------------------------------------------------------------------ http request/response */

function makeReqRes({ method, url, headers, body }, onDone) {
  const [pathname, qs] = url.split("?");
  const query = {};
  if (qs) {
    for (const part of qs.split("&")) {
      const [k, v = ""] = part.split("=");
      query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
    }
  }
  const lower = {};
  for (const [k, v] of Object.entries(headers || {})) lower[k.toLowerCase()] = String(v);
  const req = {
    method,
    url,
    originalUrl: url,
    path: pathname,
    baseUrl: "",
    headers: lower,
    query,
    params: {},
    body: undefined,
    __raw: body === undefined ? undefined : plain(body),
    get(h) {
      return lower[String(h).toLowerCase()];
    },
    header(h) {
      return lower[String(h).toLowerCase()];
    },
    ip: "127.0.0.1",
    cookies: {},
  };
  const res = {
    statusCode: 200,
    headersSent: false,
    locals: {},
    _headers: {},
    status(code) {
      if (this.headersSent) throw new HeadersSentError();
      this.statusCode = code;
      return this;
    },
    set(k, v) {
      if (typeof k === "object") Object.assign(this._headers, k);
      else this._headers[String(k).toLowerCase()] = v;
      return this;
    },
    header(k, v) {
      return this.set(k, v);
    },
    setHeader(k, v) {
      return this.set(k, v);
    },
    get(k) {
      return this._headers[String(k).toLowerCase()];
    },
    cookie() {
      return this;
    },
    clearCookie() {
      return this;
    },
    json(b) {
      if (this.headersSent) throw new HeadersSentError();
      this._headers["content-type"] = "application/json";
      return this._end(b === undefined ? undefined : plain(b), b === undefined ? "" : JSON.stringify(plain(b)));
    },
    send(b) {
      if (this.headersSent) throw new HeadersSentError();
      if (b !== null && typeof b === "object") return this.json(b);
      return this._end(undefined, b === undefined ? "" : String(b));
    },
    redirect(a, b) {
      const [status, loc] = typeof a === "number" ? [a, b] : [b || 302, a];
      this.statusCode = status;
      this._headers.location = loc;
      return this._end(undefined, `Redirecting to ${loc}`);
    },
    sendStatus(code) {
      this.status(code);
      return this.send(String(code));
    },
    end(b) {
      if (this.headersSent) throw new HeadersSentError();
      return this._end(undefined, b === undefined ? "" : String(b));
    },
    _end(body, text) {
      this.headersSent = true;
      onDone({ status: this.statusCode, body: body === undefined ? (text ? safeParse(text) : {}) : body, text, headers: { ...this._headers } });
      return this;
    },
  };
  return { req, res };
}

function safeParse(t) {
  try {
    return JSON.parse(t);
  } catch {
    return {};
  }
}

function createSupertest() {
  return function request(app) {
    const mk = (method) => (url) => new PendingRequest(app, method, url);
    return { get: mk("GET"), post: mk("POST"), put: mk("PUT"), patch: mk("PATCH"), delete: mk("DELETE"), del: mk("DELETE") };
  };
}

class PendingRequest {
  constructor(app, method, url) {
    this.app = app;
    this.method = method;
    this.url = url;
    this.headers = {};
    this.body = undefined;
    this.expectations = [];
  }
  set(k, v) {
    if (typeof k === "object") Object.assign(this.headers, k);
    else this.headers[k] = v;
    return this;
  }
  auth(token) {
    this.headers.Authorization = `Bearer ${token}`;
    return this;
  }
  query(obj) {
    const qs = Object.entries(obj)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    this.url += (this.url.includes("?") ? "&" : "?") + qs;
    return this;
  }
  send(body) {
    this.body = body;
    if (!this.headers["Content-Type"]) this.headers["Content-Type"] = "application/json";
    return this;
  }
  expect(status) {
    if (typeof status === "number") this.expectations.push(status);
    return this;
  }
  _run() {
    if (this._p) return this._p;
    const app = this.app;
    this._p = new Promise((resolve, reject) => {
      if (!app || typeof app.__dispatch !== "function") {
        reject(new TypeError("request(app): app is not an express application. Did app.js export it?"));
        return;
      }
      const trace = { id: traces.length + 1, test: currentTest, method: this.method, url: this.url, steps: [], status: null, body: null };
      traces.push(trace);
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        trace.status = "timeout";
        trace.steps.push({ kind: "error", name: "timeout", detail: "no response was sent" });
        reject(new Error(`${this.method} ${this.url} timed out: the request never got a response. A handler or middleware forgot to call res.json()/res.send() or next().`));
      }, 1500);
      const { req, res } = makeReqRes({ method: this.method, url: this.url, headers: this.headers, body: this.body }, (r) => {
        if (activeReq === trace) activeReq = null;
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        trace.status = r.status;
        trace.body = r.body;
        for (const s of this.expectations) {
          if (r.status !== s) {
            reject(new Error(`expected ${s}, got ${r.status}`));
            return;
          }
        }
        resolve({ status: r.status, statusCode: r.status, body: r.body, text: r.text, headers: r.headers });
      });
      activeReq = trace;
      try {
        app.__dispatch(req, res);
      } catch (e) {
        reject(e);
      }
    });
    return this._p;
  }
  then(a, b) {
    return this._run().then(a, b);
  }
  catch(b) {
    return this._run().catch(b);
  }
}

/* ------------------------------------------------------------------ mongoose (in-memory) */

let oidCounter = 0;
class ObjectId {
  constructor(hex) {
    if (hex instanceof ObjectId) hex = hex.__hex;
    if (hex === undefined) {
      oidCounter += 1;
      hex = (Math.floor(realNow() / 1000).toString(16) + oidCounter.toString(16).padStart(16, "0")).slice(-24).padStart(24, "0");
    }
    this.__hex = String(hex);
    Object.defineProperty(this, "__oid", { value: true, enumerable: false });
  }
  toString() {
    return this.__hex;
  }
  toHexString() {
    return this.__hex;
  }
  toJSON() {
    return this.__hex;
  }
  valueOf() {
    return this.__hex;
  }
  equals(o) {
    return o !== null && o !== undefined && String(o._id && !o.__oid ? o._id : o) === this.__hex;
  }
  static isValid(v) {
    return v instanceof ObjectId || /^[0-9a-fA-F]{24}$/.test(String(v));
  }
}

function idStr(v) {
  if (v === null || v === undefined) return v;
  if (v.__oid) return String(v);
  if (typeof v === "object" && v._id) return String(v._id);
  return v;
}

function createMongoose() {
  const stores = new Map();
  const models = {};

  class CastError extends Error {
    constructor(value, path) {
      super(`Cast to ObjectId failed for value "${value}" (type ${typeof value}) at path "${path}"`);
      this.name = "CastError";
      this.kind = "ObjectId";
      this.path = path;
      this.value = value;
    }
  }
  class ValidationError extends Error {
    constructor(errors) {
      super(`Validation failed: ${Object.entries(errors).map(([k, e]) => `${k}: ${e.message}`).join(", ")}`);
      this.name = "ValidationError";
      this.errors = errors;
    }
  }

  class Schema {
    constructor(def, opts = {}) {
      this.def = def || {};
      this.opts = opts;
      this.methods = {};
      this.statics = {};
      this.hooks = { pre: {}, post: {} };
      this.virtuals = {};
      this.indexes = [];
    }
    pre(evt, fn) {
      (this.hooks.pre[evt] ||= []).push(fn);
      return this;
    }
    post(evt, fn) {
      (this.hooks.post[evt] ||= []).push(fn);
      return this;
    }
    index(fields, opts) {
      this.indexes.push({ fields, opts: opts || {} });
      return this;
    }
    virtual(name) {
      const v = (this.virtuals[name] = {});
      return {
        get(fn) {
          v.get = fn;
          return this;
        },
        set(fn) {
          v.set = fn;
          return this;
        },
      };
    }
    method(name, fn) {
      this.methods[name] = fn;
    }
    static(name, fn) {
      this.statics[name] = fn;
    }
    field(path) {
      const d = this.def[path];
      if (d === undefined) return undefined;
      if (Array.isArray(d)) return { isArray: true, item: normField(d[0]) };
      return normField(d);
    }
  }
  function normField(d) {
    if (d === undefined) return { type: null };
    if (typeof d === "function" || d === ObjectId || d === Schema.Types.ObjectId) return { type: d };
    if (d && typeof d === "object" && !("type" in d)) return { type: Object, nested: d };
    return d;
  }
  Schema.Types = { ObjectId, String, Number, Boolean, Date, Mixed: Object };

  function isOidType(t) {
    return t === ObjectId || t === Schema.Types.ObjectId;
  }

  function castValue(f, v, path) {
    if (v === null || v === undefined || !f) return v;
    if (f.isArray) return Array.isArray(v) ? v.map((x) => castValue(f.item, x, path)) : [castValue(f.item, v, path)];
    if (isOidType(f.type)) {
      if (v instanceof ObjectId) return v;
      if (typeof v === "object" && v._id) return new ObjectId(v._id);
      if (!ObjectId.isValid(v)) throw new CastError(v, path);
      return new ObjectId(v);
    }
    if (f.type === Number) {
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    }
    if (f.type === String) {
      let s = String(v);
      if (f.trim) s = s.trim();
      if (f.lowercase) s = s.toLowerCase();
      if (f.uppercase) s = s.toUpperCase();
      return s;
    }
    if (f.type === Date) return v instanceof Date ? v : new Date(v);
    if (f.type === Boolean) return Boolean(v);
    return v;
  }

  function matchesValue(docVal, cond) {
    if (cond !== null && typeof cond === "object" && !(cond instanceof ObjectId) && !(cond instanceof Date) && !(cond instanceof RegExp) && !Array.isArray(cond)) {
      const ops = Object.keys(cond);
      if (ops.length && ops.every((k) => k.startsWith("$"))) {
        return ops.every((op) => {
          const c = cond[op];
          const dv = docVal instanceof Date ? docVal.getTime() : idStr(docVal);
          const cv = c instanceof Date ? c.getTime() : idStr(c);
          switch (op) {
            case "$eq":
              return matchesValue(docVal, c);
            case "$ne":
              return !matchesValue(docVal, c);
            case "$gt":
              return dv > cv;
            case "$gte":
              return dv >= cv;
            case "$lt":
              return dv < cv;
            case "$lte":
              return dv <= cv;
            case "$in":
              return c.some((x) => matchesValue(docVal, x));
            case "$nin":
              return !c.some((x) => matchesValue(docVal, x));
            case "$exists":
              return c ? docVal !== undefined : docVal === undefined;
            case "$regex":
              return new RegExp(c, cond.$options || "").test(String(docVal ?? ""));
            case "$options":
              return true;
            case "$size":
              return Array.isArray(docVal) && docVal.length === c;
            default:
              throw new Error(`Unsupported query operator ${op}`);
          }
        });
      }
    }
    if (cond instanceof RegExp) return cond.test(String(docVal ?? ""));
    if (Array.isArray(docVal) && !Array.isArray(cond)) return docVal.some((x) => String(idStr(x)) === String(idStr(cond)));
    if (docVal instanceof Date && cond instanceof Date) return docVal.getTime() === cond.getTime();
    if (cond === null) return docVal === null || docVal === undefined;
    return JSON.stringify(idStr(docVal)) === JSON.stringify(idStr(cond)) || String(idStr(docVal)) === String(idStr(cond)) && (typeof idStr(docVal) === typeof idStr(cond) || docVal?.__oid || cond?.__oid);
  }

  function matches(doc, filter) {
    if (!filter) return true;
    return Object.entries(filter).every(([k, cond]) => {
      if (k === "$or") return cond.some((f) => matches(doc, f));
      if (k === "$and") return cond.every((f) => matches(doc, f));
      if (k === "$nor") return !cond.some((f) => matches(doc, f));
      const { value } = getPath(doc, k);
      return matchesValue(value, cond);
    });
  }

  function model(name, schema) {
    if (models[name]) return models[name];
    if (!stores.has(name)) stores.set(name, []);
    const store = () => stores.get(name);
    const castFilter = (filter) => {
      if (!filter) return filter;
      const out = {};
      for (const [k, v] of Object.entries(filter)) {
        if (k.startsWith("$")) {
          out[k] = Array.isArray(v) ? v.map(castFilter) : v;
          continue;
        }
        let f = k === "_id" ? { type: ObjectId } : schema.field(k);
        if (f && f.isArray) f = f.item;
        if (!f || !f.type || v === null || v === undefined || v instanceof RegExp) {
          out[k] = v;
          continue;
        }
        const one = (x) => (x === null || x === undefined || x instanceof RegExp ? x : castValue(f, x, k));
        if (typeof v === "object" && !(v instanceof ObjectId) && !(v instanceof Date) && !Array.isArray(v) && Object.keys(v).some((o) => o.startsWith("$"))) {
          const c = {};
          for (const [op, x] of Object.entries(v)) {
            c[op] = op === "$in" || op === "$nin" ? x.map(one) : op === "$exists" || op === "$regex" || op === "$options" || op === "$size" ? x : one(x);
          }
          out[k] = c;
        } else if (typeof v === "object" && !(v instanceof ObjectId) && !(v instanceof Date) && !Array.isArray(v)) {
          out[k] = v._id ? one(v._id) : v;
        } else {
          out[k] = Array.isArray(v) ? v : one(v);
        }
      }
      return out;
    };

    class Model {
      constructor(data = {}, opts = {}) {
        Object.defineProperty(this, "__isNew", { value: !opts.hydrated, writable: true, enumerable: false });
        Object.defineProperty(this, "__snap", { value: null, writable: true, enumerable: false });
        const d = data || {};
        this._id = d._id !== undefined ? new ObjectId(d._id) : new ObjectId();
        for (const [k, def] of Object.entries(schema.def)) {
          const f = schema.field(k);
          let v = d[k];
          if (v === undefined && !opts.hydrated) {
            const dflt = f && f.default !== undefined ? f.default : f && f.isArray ? [] : undefined;
            v = typeof dflt === "function" ? dflt() : Array.isArray(dflt) ? [...dflt] : dflt;
          }
          if (v !== undefined) {
            try {
              this[k] = opts.hydrated ? v : castValue(f, v, k);
            } catch (e) {
              this[k] = v;
              Object.defineProperty(this, "__castErr", { value: e, writable: true, enumerable: false, configurable: true });
            }
          }
          void def;
        }
        if (opts.hydrated) {
          for (const k of ["createdAt", "updatedAt", "__v"]) if (d[k] !== undefined) this[k] = d[k];
          this.__snap = JSON.stringify(this.toObject());
        }
        for (const [vn, v] of Object.entries(schema.virtuals)) {
          Object.defineProperty(this, vn, { get: v.get ? v.get.bind(this) : undefined, set: v.set ? v.set.bind(this) : undefined, enumerable: false, configurable: true });
        }
      }
      get id() {
        return String(this._id);
      }
      get isNew() {
        return this.__isNew;
      }
      isModified(path) {
        if (this.__isNew) return true;
        if (!path) return this.__snap !== JSON.stringify(this.toObject());
        const before = this.__snap ? JSON.parse(this.__snap)[path] : undefined;
        return JSON.stringify(before) !== JSON.stringify(plain(this[path]));
      }
      markModified() {}
      toObject() {
        const o = {};
        for (const k of Object.keys(this)) o[k] = this[k];
        return o;
      }
      toJSON() {
        const o = plain(this.toObject());
        if (schema.opts.toJSON && typeof schema.opts.toJSON.transform === "function") {
          const r = schema.opts.toJSON.transform(this, o);
          return r === undefined ? o : r;
        }
        return o;
      }
      validateSync() {
        const errors = {};
        if (this.__castErr) errors[this.__castErr.path] = this.__castErr;
        for (const k of Object.keys(schema.def)) {
          const f = schema.field(k);
          if (!f) continue;
          const v = this[k];
          const req = Array.isArray(f.required) ? f.required[0] : f.required;
          const reqMsg = Array.isArray(f.required) ? f.required[1] : `Path \`${k}\` is required.`;
          const reqOn = typeof req === "function" ? req.call(this) : req;
          if (reqOn && (v === undefined || v === null || v === "")) {
            errors[k] = { message: reqMsg, kind: "required", path: k };
            continue;
          }
          if (v === undefined || v === null) continue;
          const en = Array.isArray(f.enum) ? f.enum : f.enum && f.enum.values;
          if (en && !en.includes(v)) errors[k] = { message: `\`${v}\` is not a valid enum value for path \`${k}\`.`, kind: "enum", path: k };
          const mn = Array.isArray(f.min) ? f.min[0] : f.min;
          const mx = Array.isArray(f.max) ? f.max[0] : f.max;
          if (mn !== undefined && v < mn) errors[k] = { message: Array.isArray(f.min) ? f.min[1] : `Path \`${k}\` (${v}) is less than minimum allowed value (${mn}).`, kind: "min", path: k };
          if (mx !== undefined && v > mx) errors[k] = { message: Array.isArray(f.max) ? f.max[1] : `Path \`${k}\` (${v}) is more than maximum allowed value (${mx}).`, kind: "max", path: k };
          if (f.minlength !== undefined && String(v).length < (Array.isArray(f.minlength) ? f.minlength[0] : f.minlength))
            errors[k] = { message: `Path \`${k}\` is shorter than the minimum allowed length.`, kind: "minlength", path: k };
          if (f.match && !(Array.isArray(f.match) ? f.match[0] : f.match).test(String(v)))
            errors[k] = { message: Array.isArray(f.match) ? f.match[1] : `Path \`${k}\` is invalid (${v}).`, kind: "regexp", path: k };
        }
        return Object.keys(errors).length ? new ValidationError(errors) : undefined;
      }
      async validate() {
        const e = this.validateSync();
        if (e) throw e;
      }
      async save() {
        for (const h of schema.hooks.pre.save || []) {
          await new Promise((resolve, reject) => {
            const r = h.call(this, (err) => (err ? reject(err) : resolve()));
            if (r && typeof r.then === "function") r.then(resolve, reject);
            else if (h.length === 0) resolve();
          });
        }
        const err = this.validateSync();
        if (err) throw err;
        const raw = this.toObject();
        // unique constraints
        const uniques = Object.keys(schema.def).filter((k) => schema.field(k) && schema.field(k).unique);
        for (const idx of schema.indexes) if (idx.opts.unique) uniques.push(Object.keys(idx.fields));
        for (const u of uniques) {
          const keys = Array.isArray(u) ? u : [u];
          const clash = store().find((d) => String(d._id) !== String(this._id) && keys.every((k) => String(idStr(d[k])) === String(idStr(raw[k]))));
          if (clash) {
            const e = new Error(`E11000 duplicate key error collection: ${name.toLowerCase()}s index: ${keys.join("_")}_1 dup key`);
            e.name = "MongoServerError";
            e.code = 11000;
            e.keyValue = Object.fromEntries(keys.map((k) => [k, plain(raw[k])]));
            throw e;
          }
        }
        const now = new Date(Date.now());
        if (schema.opts.timestamps) {
          if (this.__isNew) this.createdAt = now;
          this.updatedAt = now;
        }
        const rec = clonePersist(this.toObject());
        const i = store().findIndex((d) => String(d._id) === String(this._id));
        if (i >= 0) store()[i] = rec;
        else store().push(rec);
        traceStep("db", `${name}.save()`, this.__isNew ? "insert" : "update", { coll: name, size: store().length, matched: 1, op: this.__isNew ? "insert" : "update" });
        this.__isNew = false;
        this.__snap = JSON.stringify(this.toObject());
        for (const h of schema.hooks.post.save || []) await h.call(this, this);
        return this;
      }
      async deleteOne() {
        const i = store().findIndex((d) => String(d._id) === String(this._id));
        if (i >= 0) store().splice(i, 1);
        traceStep("db", `${name}#deleteOne()`, "");
        return { deletedCount: i >= 0 ? 1 : 0 };
      }
      async remove() {
        return this.deleteOne();
      }
      async populate(path) {
        await populateDocs([this], typeof path === "string" ? path : path.path);
        return this;
      }
      static hydrate(rec) {
        return new Model(cloneRestore(rec), { hydrated: true });
      }
    }
    Object.defineProperty(Model, "name", { value: name });
    Model.modelName = name;
    Model.schema = schema;

    for (const [k, fn] of Object.entries(schema.methods)) Model.prototype[k] = fn;
    for (const [k, fn] of Object.entries(schema.statics)) Model[k] = fn;

    async function populateDocs(docs, pathSpec) {
      const paths = String(pathSpec).split(" ").filter(Boolean);
      for (const p of paths) {
        const f = schema.field(p);
        const ref = f && (f.isArray ? f.item.ref : f.ref);
        if (!ref) continue;
        const target = models[ref];
        if (!target) throw new Error(`Schema hasn't been registered for model "${ref}".`);
        const tstore = stores.get(ref) || [];
        for (const d of docs) {
          if (!d) continue;
          const look = (id) => {
            const r = tstore.find((x) => String(x._id) === String(idStr(id)));
            return r ? target.hydrate(r) : null;
          };
          d[p] = Array.isArray(d[p]) ? d[p].map(look).filter(Boolean) : d[p] === undefined ? d[p] : look(d[p]);
        }
      }
    }

    class Query {
      constructor(op, exec) {
        this.op = op;
        this.execFn = exec;
        this._sort = null;
        this._limit = null;
        this._skip = 0;
        this._populate = [];
        this._lean = false;
        this._select = null;
      }
      sort(s) {
        this._sort = typeof s === "string" ? Object.fromEntries(s.split(" ").filter(Boolean).map((k) => (k.startsWith("-") ? [k.slice(1), -1] : [k, 1]))) : s;
        return this;
      }
      limit(n) {
        this._limit = n;
        return this;
      }
      skip(n) {
        this._skip = n;
        return this;
      }
      populate(p) {
        this._populate.push(typeof p === "string" ? p : p.path);
        return this;
      }
      lean() {
        this._lean = true;
        return this;
      }
      select(s) {
        this._select = s;
        return this;
      }
      where() {
        return this;
      }
      async exec() {
        return this.execFn(this);
      }
      then(a, b) {
        return this.exec().then(a, b);
      }
      catch(b) {
        return this.exec().catch(b);
      }
    }

    function applySelect(obj, sel) {
      if (!sel) return obj;
      const parts = typeof sel === "string" ? sel.split(" ").filter(Boolean) : Object.entries(sel).map(([k, v]) => (v ? k : "-" + k));
      const excl = parts.filter((p) => p.startsWith("-")).map((p) => p.slice(1));
      const incl = parts.filter((p) => !p.startsWith("-"));
      for (const k of excl) delete obj[k];
      if (incl.length) for (const k of Object.keys(obj)) if (k !== "_id" && !incl.includes(k)) delete obj[k];
      return obj;
    }

    async function finalize(q, recs, single) {
      let list = recs.slice();
      if (q._sort) {
        const entries = Object.entries(q._sort);
        list.sort((a, b) => {
          for (const [k, dir] of entries) {
            const av = a[k] instanceof Date ? a[k].getTime() : idStr(a[k]);
            const bv = b[k] instanceof Date ? b[k].getTime() : idStr(b[k]);
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
          }
          return 0;
        });
      }
      if (q._skip) list = list.slice(q._skip);
      if (q._limit) list = list.slice(0, q._limit);
      let docs = list.map((r) => Model.hydrate(r));
      for (const p of q._populate) await populateDocs(docs, p);
      if (q._select) docs.forEach((d) => applySelect(d, q._select));
      if (q._lean) docs = docs.map((d) => d.toObject());
      return single ? docs[0] || null : docs;
    }

    function applyUpdate(rec, update) {
      const hasOps = Object.keys(update).some((k) => k.startsWith("$"));
      const ops = hasOps ? update : { $set: update };
      const doc = Model.hydrate(rec);
      for (const [op, fields] of Object.entries(ops)) {
        for (const [k, v] of Object.entries(fields || {})) {
          const f = schema.field(k);
          if (op === "$set") doc[k] = castValue(f, v, k);
          else if (op === "$unset") delete doc[k];
          else if (op === "$inc") doc[k] = (doc[k] || 0) + v;
          else if (op === "$push") (doc[k] ||= []).push(castValue(f && f.isArray ? f.item : f, v, k));
          else if (op === "$addToSet") {
            doc[k] ||= [];
            if (!doc[k].some((x) => String(idStr(x)) === String(idStr(v)))) doc[k].push(castValue(f && f.isArray ? f.item : f, v, k));
          } else if (op === "$pull") doc[k] = (doc[k] || []).filter((x) => !matchesValue(x, v));
          else throw new Error(`Unsupported update operator ${op}`);
        }
      }
      if (schema.opts.timestamps) doc.updatedAt = new Date(Date.now());
      return doc;
    }

    const findRecs = (filter) => store().filter((r) => matches(r, castFilter(filter)));
    const label = (op, filter) => `${name}.${op}(${filter && Object.keys(filter).length ? pretty(filter).slice(0, 60) : ""})`;

    const dbStep = (op, filter, matched, extra) => traceStep("db", label(op, filter), extra || (op.startsWith("find") && !op.includes("And") ? `→ ${matched} match${matched === 1 ? "" : "es"}` : ""), { coll: name, size: store().length, matched, op });
    Model.find = (filter = {}) => new Query("find", (q) => finalize(q, findRecs(filter), false).then((r) => (dbStep("find", filter, r.length), r)));
    Model.findOne = (filter = {}) => new Query("findOne", (q) => finalize(q, findRecs(filter).slice(0, q._sort ? undefined : 1), true).then((r) => (dbStep("findOne", filter, r ? 1 : 0, r ? "→ found" : "→ null"), r)));
    Model.findById = (id) =>
      new Query("findById", (q) => {
        const step = (m, d) => traceStep("db", `${name}.findById(${pretty(idStr(id))})`, d, { coll: name, size: store().length, matched: m, op: "findById" });
        if (id === undefined || id === null) return (step(0, "→ null"), Promise.resolve(null));
        if (!ObjectId.isValid(idStr(id))) return (step(0, "CastError"), Promise.reject(new CastError(id, "_id")));
        return finalize(q, findRecs({ _id: idStr(id) }), true).then((r) => (step(r ? 1 : 0, r ? "→ found" : "→ null"), r));
      });
    Model.countDocuments = (filter = {}) => new Query("count", async () => { const n = findRecs(filter).length; dbStep("countDocuments", filter, n, `= ${n}`); return n; });
    Model.estimatedDocumentCount = () => new Query("count", async () => store().length);
    Model.exists = (filter = {}) => new Query("exists", async () => { const r = findRecs(filter)[0]; dbStep("exists", filter, r ? 1 : 0, r ? "→ yes" : "→ no"); return r ? { _id: r._id } : null; });
    Model.create = async (data) => {
      if (Array.isArray(data)) {
        const out = [];
        for (const d of data) out.push(await new Model(d).save());
        return out;
      }
      return new Model(data).save();
    };
    Model.insertMany = async (arr) => Model.create(arr);
    Model.deleteMany = (filter = {}) =>
      new Query("deleteMany", async () => {
        const keep = store().filter((r) => !matches(r, castFilter(filter)));
        const n = store().length - keep.length;
        stores.set(name, keep);
        return { deletedCount: n, acknowledged: true };
      });
    Model.deleteOne = (filter = {}) =>
      new Query("deleteOne", async () => {
        const i = store().findIndex((r) => matches(r, castFilter(filter)));
        dbStep("deleteOne", filter, i >= 0 ? 1 : 0, i >= 0 ? "deleted 1" : "deleted 0");
        if (i >= 0) store().splice(i, 1);
        return { deletedCount: i >= 0 ? 1 : 0, acknowledged: true };
      });
    const findAndDelete = (filter, op) =>
      new Query(op, async (q) => {
        const i = store().findIndex((r) => matches(r, castFilter(filter)));
        dbStep(op, filter, i >= 0 ? 1 : 0, i >= 0 ? "deleted 1" : "→ null");
        if (i < 0) return null;
        const [rec] = store().splice(i, 1);
        return finalize(q, [rec], true);
      });
    Model.findOneAndDelete = (filter = {}) => findAndDelete(filter, "findOneAndDelete");
    Model.findByIdAndDelete = (id) => {
      if (!ObjectId.isValid(idStr(id))) return new Query("x", () => Promise.reject(new CastError(id, "_id")));
      return findAndDelete({ _id: idStr(id) }, "findByIdAndDelete");
    };
    Model.findOneAndRemove = Model.findOneAndDelete;
    Model.findByIdAndRemove = Model.findByIdAndDelete;
    const findAndUpdate = (filter, update, opts = {}, op) =>
      new Query(op, async (q) => {
        const recs = findRecs(filter);
        dbStep(op, filter, recs.length ? 1 : 0, recs.length ? (opts.new ? "updated · returns new" : "updated · returns OLD doc") : "→ null");
        let rec = recs[0];
        if (!rec) {
          if (!opts.upsert) return null;
          const created = await new Model({ ...filter, ...(update.$set || (Object.keys(update).some((k) => k.startsWith("$")) ? {} : update)) }).save();
          return opts.new ? finalize(q, [store().find((r) => String(r._id) === String(created._id))], true) : null;
        }
        const before = clonePersist(rec);
        const doc = applyUpdate(rec, update);
        if (opts.runValidators) {
          const e = doc.validateSync();
          if (e) throw e;
        }
        const after = clonePersist(doc.toObject());
        const i = store().indexOf(rec);
        store()[i] = after;
        return finalize(q, [opts.new || opts.returnDocument === "after" ? after : before], true);
      });
    Model.findOneAndUpdate = (filter, update, opts) => findAndUpdate(filter, update, opts, "findOneAndUpdate");
    Model.findByIdAndUpdate = (id, update, opts) => {
      if (!ObjectId.isValid(idStr(id))) return new Query("x", () => Promise.reject(new CastError(id, "_id")));
      return findAndUpdate({ _id: idStr(id) }, update, opts, "findByIdAndUpdate");
    };
    const upd = (many) => (filter, update) =>
      new Query("update", async () => {
        const recs = findRecs(filter);
        const target = many ? recs : recs.slice(0, 1);
        dbStep(many ? "updateMany" : "updateOne", filter, target.length, `modified ${target.length}`);
        for (const rec of target) {
          const after = clonePersist(applyUpdate(rec, update).toObject());
          store()[store().indexOf(rec)] = after;
        }
        return { matchedCount: target.length, modifiedCount: target.length, acknowledged: true };
      });
    Model.updateOne = upd(false);
    Model.updateMany = upd(true);
    // A small aggregation pipeline: $match, $group, $sort, $skip, $limit, $project, $unwind, $count.
    Model.aggregate = (pipeline = []) => {
      const val = (doc, e) => {
        if (typeof e === "string" && e.startsWith("$")) {
          const r = getPath(doc, e.slice(1));
          return r.found ? r.value : undefined;
        }
        if (e && typeof e === "object" && !Array.isArray(e) && !(e instanceof Date) && !(e instanceof ObjectId)) return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, val(doc, v)]));
        return e;
      };
      const key = (v) => JSON.stringify(v instanceof ObjectId ? String(v) : v);
      const cmp = (a, b) => {
        const x = a instanceof Date ? a.getTime() : idStr(a);
        const y = b instanceof Date ? b.getTime() : idStr(b);
        return x < y ? -1 : x > y ? 1 : 0;
      };
      const run = async () => {
        let rows = store().map((r) => clonePersist(r));
        for (const stage of pipeline) {
          const [op, arg] = Object.entries(stage)[0] || [];
          if (op === "$match") rows = rows.filter((r) => matches(r, castFilter(arg)));
          else if (op === "$sort") rows.sort((a, b) => { for (const [k, d] of Object.entries(arg)) { const c = cmp(getPath(a, k).value, getPath(b, k).value); if (c) return c * d; } return 0; });
          else if (op === "$skip") rows = rows.slice(arg);
          else if (op === "$limit") rows = rows.slice(0, arg);
          else if (op === "$count") rows = [{ [arg]: rows.length }];
          else if (op === "$unwind") {
            const path = (typeof arg === "string" ? arg : arg.path).slice(1);
            rows = rows.flatMap((r) => { const a = getPath(r, path).value; return Array.isArray(a) ? a.map((x) => ({ ...r, [path]: x })) : []; });
          } else if (op === "$project") {
            rows = rows.map((r) => {
              const out = "_id" in arg && !arg._id ? {} : { _id: r._id };
              const excl = Object.values(arg).every((v) => v === 0 || v === false);
              if (excl) { const o = { ...r }; for (const k of Object.keys(arg)) delete o[k]; return o; }
              for (const [k, v] of Object.entries(arg)) if (k !== "_id" || v) out[k] = v === 1 || v === true ? getPath(r, k).value : val(r, v);
              return out;
            });
          } else if (op === "$group") {
            const groups = new Map();
            for (const r of rows) {
              const id = val(r, arg._id ?? null);
              const k = key(id);
              if (!groups.has(k)) groups.set(k, { id, rows: [] });
              groups.get(k).rows.push(r);
            }
            rows = [...groups.values()].map(({ id, rows: g }) => {
              const out = { _id: id };
              for (const [field, acc] of Object.entries(arg)) {
                if (field === "_id") continue;
                const [fn, e] = Object.entries(acc)[0];
                const vals = g.map((r) => val(r, e));
                const nums = vals.filter((v) => typeof v === "number");
                if (fn === "$sum") out[field] = nums.reduce((a, b) => a + b, 0);
                else if (fn === "$avg") out[field] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
                else if (fn === "$min") out[field] = vals.reduce((a, b) => (a === undefined || cmp(b, a) < 0 ? b : a), undefined);
                else if (fn === "$max") out[field] = vals.reduce((a, b) => (a === undefined || cmp(b, a) > 0 ? b : a), undefined);
                else if (fn === "$push") out[field] = vals;
                else if (fn === "$addToSet") out[field] = [...new Map(vals.map((v) => [key(v), v])).values()];
                else if (fn === "$first") out[field] = vals[0];
                else if (fn === "$last") out[field] = vals[vals.length - 1];
                else if (fn === "$count") out[field] = g.length;
                else throw new Error(`aggregate: ${fn} is not supported in this sandbox`);
              }
              return out;
            });
          } else throw new Error(`aggregate: stage ${op} is not supported in this sandbox`);
        }
        traceStep("db", `${name}.aggregate(${pipeline.map((st) => Object.keys(st)[0]).join(" → ")})`, `→ ${rows.length} row${rows.length === 1 ? "" : "s"}`, { coll: name, size: store().length, matched: rows.length, op: "aggregate" });
        return rows;
      };
      const p = { exec: run, then: (a, b) => run().then(a, b), catch: (b) => run().catch(b) };
      return p;
    };

    models[name] = Model;
    return Model;
  }

  function clonePersist(o) {
    const out = {};
    for (const [k, v] of Object.entries(o)) out[k] = cloneVal(v);
    return out;
  }
  function cloneVal(v) {
    if (v instanceof ObjectId) return new ObjectId(v.__hex);
    if (v instanceof Date) return new Date(v.getTime());
    if (Array.isArray(v)) return v.map(cloneVal);
    if (v && typeof v === "object" && v._id instanceof ObjectId && typeof v.toObject === "function") return new ObjectId(v._id.__hex);
    if (v && typeof v === "object") return clonePersist(v);
    return v;
  }
  const cloneRestore = clonePersist;

  const mongoose = {
    Schema,
    model,
    models,
    Types: { ObjectId },
    ObjectId,
    isValidObjectId: (v) => ObjectId.isValid(v),
    connect: async () => mongoose,
    disconnect: async () => {},
    set: () => mongoose,
    connection: { close: async () => {}, dropDatabase: async () => stores.forEach((_, k) => stores.set(k, [])), readyState: 1, on() {}, once() {} },
    Error: { ValidationError, CastError },
    __reset: () => stores.forEach((_, k) => stores.set(k, [])),
  };
  mongoose.default = mongoose;
  return mongoose;
}

/* ------------------------------------------------------------------ jwt / bcrypt */

function b64(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function unb64(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(s)));
}
function parseDuration(v) {
  if (typeof v === "number") return v;
  const m = String(v).match(/^(\d+)\s*(ms|s|m|h|d)?$/);
  if (!m) return Number(v);
  const n = Number(m[1]);
  return { ms: n / 1000, s: n, m: n * 60, h: n * 3600, d: n * 86400 }[m[2] || "s"];
}
function createJwt() {
  class JsonWebTokenError extends Error {
    constructor(m) {
      super(m);
      this.name = "JsonWebTokenError";
    }
  }
  class TokenExpiredError extends JsonWebTokenError {
    constructor(at) {
      super("jwt expired");
      this.name = "TokenExpiredError";
      this.expiredAt = at;
    }
  }
  const sig = (data, secret) => {
    let h = 2166136261;
    const s = data + "|" + secret;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
  };
  const jwt = {
    sign(payload, secret, opts = {}) {
      if (!secret) throw new Error("secretOrPrivateKey must have a value");
      const body = { ...payload, iat: Math.floor(Date.now() / 1000) };
      if (opts.expiresIn !== undefined) body.exp = body.iat + parseDuration(opts.expiresIn);
      const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const pl = b64(JSON.stringify(body));
      return `${head}.${pl}.${sig(head + "." + pl, secret)}`;
    },
    verify(token, secret) {
      if (!token || typeof token !== "string") throw new JsonWebTokenError("jwt must be provided");
      const parts = token.split(".");
      if (parts.length !== 3) throw new JsonWebTokenError("jwt malformed");
      if (!secret) throw new JsonWebTokenError("secret or public key must be provided");
      if (sig(parts[0] + "." + parts[1], secret) !== parts[2]) throw new JsonWebTokenError("invalid signature");
      const body = JSON.parse(unb64(parts[1]));
      if (body.exp !== undefined && Date.now() / 1000 >= body.exp) throw new TokenExpiredError(new Date(body.exp * 1000));
      return body;
    },
    decode(token) {
      try {
        return JSON.parse(unb64(token.split(".")[1]));
      } catch {
        return null;
      }
    },
    JsonWebTokenError,
    TokenExpiredError,
  };
  jwt.default = jwt;
  return jwt;
}

function createBcrypt() {
  const h = (pw, salt = "$2a$10$sandboxsaltsandboxsalt") => salt + b64("pw:" + pw);
  const bcrypt = {
    hash: async (pw, rounds) => {
      if (pw === undefined || pw === null) throw new Error("data and salt arguments required");
      void rounds;
      return h(String(pw));
    },
    hashSync: (pw) => h(String(pw)),
    compare: async (pw, hash) => typeof hash === "string" && h(String(pw)) === hash,
    compareSync: (pw, hash) => typeof hash === "string" && h(String(pw)) === hash,
    genSalt: async () => "$2a$10$sandboxsaltsandboxsalt",
    genSaltSync: () => "$2a$10$sandboxsaltsandboxsalt",
  };
  bcrypt.default = bcrypt;
  return bcrypt;
}

/* ------------------------------------------------------------------ module system */

function dirname(p) {
  const i = p.lastIndexOf("/");
  return i <= 0 ? "" : p.slice(0, i);
}
function join(a, b) {
  const parts = (a ? a + "/" + b : b).split("/");
  const out = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}

function createRuntime(files, env, logSink) {
  const cache = {};
  const builtins = {};
  const mongoose = createMongoose();
  const express = createExpress();
  builtins.express = express;
  builtins.mongoose = mongoose;
  builtins.supertest = createSupertest();
  builtins.jsonwebtoken = createJwt();
  builtins.bcryptjs = createBcrypt();
  builtins.bcrypt = builtins.bcryptjs;
  builtins.dotenv = { config: () => ({ parsed: {} }), default: null };
  builtins.dotenv.default = builtins.dotenv;
  builtins.cors = () => {
    const f = function cors(req, res, next) {
      next();
    };
    f.__silent = true;
    return f;
  };
  builtins.morgan = () => {
    const f = (req, res, next) => next();
    f.__silent = true;
    return f;
  };
  builtins.uuid = { v4: () => crypto.randomUUID() };
  builtins.crypto = { randomUUID: () => crypto.randomUUID(), randomBytes: (n) => ({ toString: () => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("") }) };
  builtins.events = { EventEmitter: class EventEmitter { constructor() { this.l = {}; } on(e, f) { (this.l[e] ||= []).push(f); return this; } emit(e, ...a) { (this.l[e] || []).forEach((f) => f(...a)); return true; } } };
  builtins.util = { promisify: (fn) => (...a) => new Promise((res, rej) => fn(...a, (e, v) => (e ? rej(e) : res(v)))) };

  const proc = { env: { NODE_ENV: "test", ...env }, nextTick: (f, ...a) => Promise.resolve().then(() => f(...a)), exit() {}, on() {}, cwd: () => "/" };

  const appConsole = {
    log: (...a) => logSink("log", a.map(fmt).join(" ")),
    info: (...a) => logSink("info", a.map(fmt).join(" ")),
    warn: (...a) => logSink("warn", a.map(fmt).join(" ")),
    error: (...a) => logSink("error", a.map(fmt).join(" ")),
    debug: (...a) => logSink("debug", a.map(fmt).join(" ")),
  };

  function resolve(spec, from) {
    const bare = spec.replace(/^node:/, "");
    if (builtins[bare] !== undefined) return { builtin: bare };
    if (!spec.startsWith(".") && !spec.startsWith("/")) throw new Error(`Cannot find module '${spec}' from '${from}' (not available in the sandbox)`);
    const base = spec.startsWith("/") ? spec.slice(1) : join(dirname(from), spec);
    for (const c of [base, base + ".js", base + "/index.js"]) if (files[c] !== undefined) return { path: c };
    throw new Error(`Cannot find module '${spec}' from '${from}'`);
  }

  function load(path, extraGlobals) {
    if (cache[path]) return cache[path].exports;
    const module = { exports: {} };
    cache[path] = module;
    const code = toCjs(files[path]);
    const req = (spec) => {
      const r = resolve(spec, path);
      return r.builtin ? builtins[r.builtin] : load(r.path, extraGlobals);
    };
    const __def = (m) => (m && m.__esModule ? m.default : m);
    const gNames = Object.keys(extraGlobals || {});
    let fn;
    try {
      // eslint-disable-next-line no-new-func
      fn = new Function("require", "module", "exports", "__def", "console", "process", ...gNames, code + `\n//# sourceURL=${path}`);
    } catch (e) {
      delete cache[path];
      const err = new SyntaxError(`${path}: ${e.message}`);
      throw err;
    }
    try {
      fn(req, module, module.exports, __def, appConsole, proc, ...gNames.map((n) => extraGlobals[n]));
    } catch (e) {
      delete cache[path];
      throw e;
    }
    return module.exports;
  }

  return { load, mongoose };
}

/* ------------------------------------------------------------------ jest-like runner */

function createJest() {
  const suites = { name: "", tests: [], children: [], beforeAll: [], beforeEach: [], afterEach: [], afterAll: [], parent: null };
  let cur = suites;
  const describe = (name, fn) => {
    const s = { name, tests: [], children: [], beforeAll: [], beforeEach: [], afterEach: [], afterAll: [], parent: cur };
    cur.children.push(s);
    const prev = cur;
    cur = s;
    fn();
    cur = prev;
  };
  describe.skip = () => {};
  describe.only = describe;
  const it = (name, fn, timeout) => cur.tests.push({ name, fn, timeout });
  it.skip = () => {};
  it.only = it;
  it.todo = () => {};
  it.each = (rows) => (name, fn) => rows.forEach((row) => it(name.replace(/%[sdpj]/, () => fmt(Array.isArray(row) ? row[0] : row)), () => fn(...(Array.isArray(row) ? row : [row]))));

  function mockFn(impl) {
    const f = function (...args) {
      f.mock.calls.push(args);
      const once = f.__once.shift();
      const use = once || f.__impl;
      const r = use ? use.apply(this, args) : undefined;
      f.mock.results.push({ type: "return", value: r });
      return r;
    };
    f.mock = { calls: [], results: [] };
    f.__impl = impl;
    f.__once = [];
    f.__isMock = true;
    f.mockImplementation = (i) => ((f.__impl = i), f);
    f.mockImplementationOnce = (i) => (f.__once.push(i), f);
    f.mockReturnValue = (v) => ((f.__impl = () => v), f);
    f.mockReturnValueOnce = (v) => (f.__once.push(() => v), f);
    f.mockResolvedValue = (v) => ((f.__impl = () => Promise.resolve(v)), f);
    f.mockRejectedValue = (v) => ((f.__impl = () => Promise.reject(v)), f);
    f.mockClear = () => ((f.mock.calls = []), (f.mock.results = []), f);
    f.mockReset = () => (f.mockClear(), (f.__impl = undefined), f);
    return f;
  }

  const jestObj = {
    fn: mockFn,
    spyOn(obj, key) {
      const orig = obj[key];
      const m = mockFn((...a) => orig.apply(obj, a));
      m.mockRestore = () => {
        obj[key] = orig;
      };
      obj[key] = m;
      return m;
    },
    useFakeTimers() {
      return jestObj;
    },
    useRealTimers() {
      clockOffset = 0;
      return jestObj;
    },
    advanceTimersByTime(ms) {
      clockOffset += ms;
    },
    setSystemTime(t) {
      clockOffset = new Date(t).getTime() - realNow();
    },
    clearAllMocks() {},
    resetAllMocks() {},
    restoreAllMocks() {},
    setTimeout() {},
  };

  function fail(msg) {
    const e = new Error(msg);
    e.__assert = true;
    return e;
  }

  function expect(received) {
    const make = (negate) => {
      const check = (pass, msg) => {
        if (negate ? pass : !pass) throw fail(msg(negate));
      };
      const n = (neg) => (neg ? "not." : "");
      const m = {
        toBe: (exp) => check(Object.is(received, exp), (neg) => `expect(received).${n(neg)}toBe(expected)\n\nExpected: ${neg ? "not " : ""}${pretty(exp)}\nReceived: ${pretty(received)}`),
        toEqual: (exp) => check(deepEqual(norm(received), norm(exp)), (neg) => `expect(received).${n(neg)}toEqual(expected)\n\nExpected: ${neg ? "not " : ""}${pretty(exp)}\nReceived: ${pretty(received)}`),
        toStrictEqual: (exp) => m.toEqual(exp),
        toBeNull: () => check(received === null, (neg) => `expect(received).${n(neg)}toBeNull()\n\nReceived: ${pretty(received)}`),
        toBeUndefined: () => check(received === undefined, (neg) => `expect(received).${n(neg)}toBeUndefined()\n\nReceived: ${pretty(received)}`),
        toBeDefined: () => check(received !== undefined, (neg) => `expect(received).${n(neg)}toBeDefined()\n\nReceived: ${pretty(received)}`),
        toBeTruthy: () => check(!!received, (neg) => `expect(received).${n(neg)}toBeTruthy()\n\nReceived: ${pretty(received)}`),
        toBeFalsy: () => check(!received, (neg) => `expect(received).${n(neg)}toBeFalsy()\n\nReceived: ${pretty(received)}`),
        toBeGreaterThan: (x) => check(received > x, (neg) => `expect(received).${n(neg)}toBeGreaterThan(${x})\n\nReceived: ${pretty(received)}`),
        toBeGreaterThanOrEqual: (x) => check(received >= x, (neg) => `expect(received).${n(neg)}toBeGreaterThanOrEqual(${x})\n\nReceived: ${pretty(received)}`),
        toBeLessThan: (x) => check(received < x, (neg) => `expect(received).${n(neg)}toBeLessThan(${x})\n\nReceived: ${pretty(received)}`),
        toBeLessThanOrEqual: (x) => check(received <= x, (neg) => `expect(received).${n(neg)}toBeLessThanOrEqual(${x})\n\nReceived: ${pretty(received)}`),
        toBeCloseTo: (x, d = 2) => check(Math.abs(received - x) < Math.pow(10, -d) / 2, (neg) => `expect(received).${n(neg)}toBeCloseTo(${x})\n\nReceived: ${pretty(received)}`),
        toContain: (x) =>
          check(
            received !== null && received !== undefined && (typeof received === "string" ? received.includes(x) : Array.from(received).some((v) => Object.is(v, x) || (v && v.__oid && String(v) === String(x)))),
            (neg) => `expect(received).${n(neg)}toContain(${pretty(x)})\n\nReceived: ${pretty(received)}`,
          ),
        toContainEqual: (x) => check(Array.isArray(received) && received.some((v) => deepEqual(plain(v), plain(x))), (neg) => `expect(received).${n(neg)}toContainEqual(${pretty(x)})\n\nReceived: ${pretty(received)}`),
        toHaveLength: (len) => check(received != null && received.length === len, (neg) => `expect(received).${n(neg)}toHaveLength(${len})\n\nReceived length: ${received == null ? received : received.length}\nReceived: ${pretty(received)}`),
        toHaveProperty: (path, ...v) => {
          const r = getPath(received, path);
          const ok = r.found && (v.length === 0 || deepEqual(plain(r.value), plain(v[0])));
          check(ok, (neg) => `expect(received).${n(neg)}toHaveProperty(${pretty(path)}${v.length ? ", " + pretty(v[0]) : ""})\n\nReceived: ${pretty(received)}`);
        },
        toMatchObject: (exp) => check(matchObject(norm(received), norm(exp)), (neg) => `expect(received).${n(neg)}toMatchObject(expected)\n\nExpected: ${pretty(exp)}\nReceived: ${pretty(received)}`),
        toMatch: (re) => check(typeof received === "string" && (re instanceof RegExp ? re.test(received) : received.includes(re)), (neg) => `expect(received).${n(neg)}toMatch(${String(re)})\n\nReceived: ${pretty(received)}`),
        toBeInstanceOf: (C) => check(received instanceof C, (neg) => `expect(received).${n(neg)}toBeInstanceOf(${C.name})`),
        toThrow: (exp) => {
          let threw = false;
          let err;
          try {
            received();
          } catch (e) {
            threw = true;
            err = e;
          }
          const ok = threw && (exp === undefined || (exp instanceof RegExp ? exp.test(err.message) : typeof exp === "string" ? err.message.includes(exp) : err instanceof exp));
          check(ok, (neg) => `expect(fn).${n(neg)}toThrow(${exp ? String(exp) : ""})\n\n${threw ? "Thrown: " + err.message : "Function did not throw"}`);
        },
        toHaveBeenCalled: () => check(received.mock.calls.length > 0, (neg) => `expect(mock).${n(neg)}toHaveBeenCalled()\n\nCalls: ${received.mock.calls.length}`),
        toHaveBeenCalledTimes: (k) => check(received.mock.calls.length === k, (neg) => `expect(mock).${n(neg)}toHaveBeenCalledTimes(${k})\n\nReceived calls: ${received.mock.calls.length}`),
        toHaveBeenCalledWith: (...args) => check(received.mock.calls.some((c) => deepEqual(plain(c), plain(args))), (neg) => `expect(mock).${n(neg)}toHaveBeenCalledWith(${args.map(pretty).join(", ")})\n\nCalls: ${pretty(received.mock.calls)}`),
      };
      return m;
    };
    const api = make(false);
    api.not = make(true);
    const asyncWrap = (kind) =>
      new Proxy(
        {},
        {
          get: (_, key) => async (...args) => {
            let val;
            let threw = false;
            try {
              val = await received;
            } catch (e) {
              threw = true;
              val = e;
            }
            if (kind === "resolves" && threw) throw fail(`Expected promise to resolve, but it rejected with: ${val && val.message}`);
            if (kind === "rejects" && !threw) throw fail(`Expected promise to reject, but it resolved with: ${pretty(val)}`);
            if (kind === "rejects" && key === "toThrow") {
              const exp = args[0];
              const ok = exp === undefined || (exp instanceof RegExp ? exp.test(val.message) : typeof exp === "string" ? val.message.includes(exp) : val instanceof exp);
              if (!ok) throw fail(`Rejected with: ${val.message}`);
              return;
            }
            return expect(val)[key](...args);
          },
        },
      );
    Object.defineProperty(api, "resolves", { get: () => asyncWrap("resolves") });
    Object.defineProperty(api, "rejects", { get: () => asyncWrap("rejects") });
    return api;
  }
  expect.any = (C) => ({ asymmetricMatch: (v) => v != null && (v.constructor === C || v instanceof C), toJSON: () => `Any<${C.name}>` });
  expect.anything = () => ({ asymmetricMatch: (v) => v !== null && v !== undefined, toJSON: () => "Anything" });
  expect.stringContaining = (s) => ({ asymmetricMatch: (v) => typeof v === "string" && v.includes(s), toJSON: () => `StringContaining(${s})` });
  expect.objectContaining = (o) => ({ asymmetricMatch: (v) => matchObject(norm(v), norm(o)), toJSON: () => "ObjectContaining" });
  expect.arrayContaining = (arr) => ({ asymmetricMatch: (v) => Array.isArray(v) && arr.every((x) => v.some((y) => deepEqual(norm(y), norm(x)))), toJSON: () => "ArrayContaining" });

  async function runSuite(s, path, results, file) {
    const fullName = (t) => [...path, s.name, t].filter(Boolean).join(" › ");
    const allBeforeEach = [];
    const allAfterEach = [];
    for (let p = s; p; p = p.parent) {
      allBeforeEach.unshift(...p.beforeEach);
      allAfterEach.push(...p.afterEach);
    }
    try {
      for (const h of s.beforeAll) await withTimeout(h(), 3000, "beforeAll");
    } catch (e) {
      for (const t of s.tests) results.push({ file, name: fullName(t.name), status: "fail", error: `beforeAll failed: ${errText(e)}`, ms: 0 });
      return;
    }
    for (const t of s.tests) {
      currentTest = fullName(t.name);
      const start = performance.now();
      try {
        for (const h of allBeforeEach) await withTimeout(h(), 3000, "beforeEach");
        await withTimeout(Promise.resolve().then(() => t.fn()), t.timeout || 4000, "test");
        for (const h of allAfterEach) await withTimeout(h(), 3000, "afterEach");
        results.push({ file, name: currentTest, status: "pass", ms: performance.now() - start });
      } catch (e) {
        results.push({ file, name: currentTest, status: "fail", error: errText(e), ms: performance.now() - start });
      }
    }
    for (const c of s.children) await runSuite(c, [...path, s.name].filter(Boolean), results, file);
    for (const h of s.afterAll) {
      try {
        await h();
      } catch {
        /* ignore */
      }
    }
    currentTest = null;
  }

  const hook = (k) => (fn) => cur[k].push(fn);
  return {
    globals: {
      describe,
      it,
      test: it,
      expect,
      jest: jestObj,
      vi: jestObj,
      beforeAll: hook("beforeAll"),
      beforeEach: hook("beforeEach"),
      afterEach: hook("afterEach"),
      afterAll: hook("afterAll"),
    },
    run: async (file) => {
      const results = [];
      await runSuite(suites, [], results, file);
      return results;
    },
  };
}

function withTimeout(p, ms, what) {
  if (!p || typeof p.then !== "function") return Promise.resolve(p);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} exceeded ${ms}ms timeout. Is something never resolving?`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function errText(e) {
  if (!e) return String(e);
  if (e.__assert) return e.message;
  const where = (e.stack || "").split("\n").find((l) => /\.js:\d+/.test(l) && !/lab-runner/.test(l));
  let loc = "";
  if (where) {
    const mm = where.match(/([\w./-]+\.js):(\d+)/);
    if (mm) loc = `\n    at ${mm[1]}:${Number(mm[2]) - 2}`;
  }
  return `${e.name || "Error"}: ${e.message}${loc}`;
}

/* ------------------------------------------------------------------ entry */

self.onmessage = async (e) => {
  const { files, testFiles, env } = e.data;
  traces = [];
  serverLogs = [];
  clockOffset = 0;
  const allTests = [];
  let loadError = null;
  for (const tf of testFiles) {
    clockOffset = 0;
    const jest = createJest();
    const runtime = createRuntime(files, env || {}, (level, text) => serverLogs.push({ test: currentTest, level, text }));
    try {
      runtime.load(tf, jest.globals);
    } catch (err) {
      loadError = errText(err);
      allTests.push({ file: tf, name: "Test suite failed to run", status: "fail", error: loadError, ms: 0 });
      continue;
    }
    const res = await jest.run(tf);
    allTests.push(...res);
  }
  self.postMessage({ type: "done", tests: allTests, traces: JSON.parse(JSON.stringify(traces)), logs: serverLogs.slice(0, 400), loadError });
};
