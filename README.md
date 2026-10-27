<div align="center">

# 🟧 BugForge

**Break it. Fix it. Build it.**

A free, browser-only practice arena for coding interviews and online assessments.<br/>
Debug real multi-file codebases, build components from a spec, and drill DSA patterns, with 3D voxel visualizations and an explanation on every screen.

No account, no backend, no API keys. Everything runs in your browser.

`MIT` · `Next.js 15` · `React 19` · `three.js` · `Monaco` · `Pyodide` · `Tailwind v4`

</div>

---

## Why

Modern technical assessments rarely ask you to "reverse a linked list" anymore. More often you get a **small repository, a bug ticket and a red test suite**, and you have to find the root cause under time pressure. Or you get a spec and some stubs and have to implement the feature until the tests pass.

That skill comes from repetition, and most practice sites don't offer it. BugForge is built around that loop:

> run the tests → read the first failure → form one hypothesis → change one thing → re-run

## What's inside

| Mode | What you do |
|---|---|
| 🐞 **Debug labs** (23) | Multi-file Node/Express/Mongoose or Python services, each with a bug ticket and a failing test suite. Find every root cause until the suite is green. The **Request flow** view (2D and 3D) shows each HTTP request travelling through middleware → router → handler → database, so you can *see* where it goes wrong. |
| 🔧 **Build labs** (9) | The reverse. The tests describe something that doesn't exist yet: a rate limiter, job queue, event emitter, JWT auth, KV store with transactions, parking lot, file system… Implement it from the stubs. |
| ♾️ **Bug Hunt** | Endless generated bugs. A mutation engine injects 1–3 real bugs into working labs (flipped comparisons, off-by-ones, swapped `&&`/`||`, dropped `await`s, missing `return`s…). Each one is verified to break the tests. Clear them against the clock. |
| ⚡ **Spot the Bug** (65) | Rapid-fire drills in JavaScript, Python, Java and C++. Click the buggy line, pick the diagnosis, then read why it's wrong and what the fix is. |
| 🧮 **DSA** (30) | Problems grouped by pattern. Hidden test suites include large inputs that catch O(n²) solutions. Each problem has progressive hints, a written approach and a step-by-step visualization. Solve in JS or Python. |
| 🧊 **3D Lab** | An orbitable voxel world where HTTP requests hit MongoDB collections (one voxel per document, and matches light up), plus an algorithm playground with editable inputs. |
| 📚 **Learn** | Short visual explainers: debugging playbook, event loop, Express pipeline, Mongoose, HTTP status codes, async pitfalls, JS/Python gotchas, concurrency and a pattern cheat sheet. Each one links to the labs that test it. |
| 📈 **Progress** | Local-only stats, an activity heatmap, accuracy by topic and "up next" suggestions. Export or import as JSON. |

Light and dark themes follow your system and can be toggled.

## How it works

Everything executes client-side, in Web Workers, so the UI never freezes and the site deploys as plain static files.

```
┌──────────────────── browser ────────────────────┐
│  Monaco editor ──► Web Worker                   │
│                    ├─ JS lab runtime   Express, Mongoose (in-memory),
│                    │                   supertest, Jest-style expect,
│                    │                   jwt, bcrypt, fake timers…
│                    ├─ Pyodide          CPython + unittest for Python labs
│                    └─ DSA judge        hidden tests, time limits, verdicts
│                                                 │
│  trace of every request ──► 2D / 3D flow view   │
└─────────────────────────────────────────────────┘
```

- **The JS lab runtime** (`public/workers/lab-runner.js`) is a small sandbox with in-memory stand-ins for Express, Mongoose, supertest, Jest's `expect`/`jest.fn`/`spyOn`/fake timers, `jsonwebtoken` and `bcryptjs`. It records a trace of each request, which drives the request-flow visualizations.
- **Python** runs in Pyodide. The same harness (`py_lab_harness.py`) is used at build time with real CPython.
- **Progress** lives in `localStorage`. Nothing leaves your machine.

### Verified content

All content is checked at build time, so nothing broken ships:

- **Labs:** the buggy code must *fail* the tests, and the reference fix must *pass all of them*.
- **DSA:** each problem's reference solution is cross-checked against a brute-force solution and a Python version on seeded random tests. That run also produces the hidden test files.
- **Drills:** each one is checked for exactly one marked buggy line and a unique id.

## Run locally

Requires **Node 20+**.

```bash
git clone https://github.com/srivtx/bugforge.git
cd bugforge
npm install
npm run dev
```

Open <http://localhost:3000>.

Production build (static export to `out/`):

```bash
npm run build
npm start        # serves ./out
```

## Deploy

It's a fully static site (`output: "export"`), so any static host works.

**Vercel:** import the repo, keep the detected Next.js preset and deploy. No environment variables are needed.

## Adding content

Sources live in `content-src/` and compile into `src/content/*.generated.json` and `public/tests/`. Generated files are committed, so hosts only run `next build`. Re-running the verifiers needs `python3` locally.

```bash
npm run content          # everything
npm run content:labs     # verify labs: buggy fails, fixed passes
npm run content:dsa      # verify DSA problems and generate hidden tests
npm run content:drills   # compile spot-the-bug drills
```

<details>
<summary><b>Lab format</b> (<code>content-src/labs/*.mjs</code>)</summary>

```js
export default {
  slug: "response-cache",
  lang: "js",                    // or "py"
  kind: "debug",                 // or "build"
  title: "Product Page Response Cache",
  difficulty: "Medium",
  minutes: 30,
  tagline: "One-line hook shown on the card.",
  ticket: `**CAT-512 · Markdown bug ticket**`,
  files:  { "app.js": "...", "middleware/cache.js": "..." },  // what the user edits
  tests:  { "tests/cache.test.js": "..." },
  fixes:  { "middleware/cache.js": "..." },                   // reference fix
  bugs:   [{ file, title, explain }],                         // revealed after solving
  hints:  ["..."],
  concepts: ["this binding", "TTL"],
};
```
</details>

<details>
<summary><b>Drill format</b> (<code>content-src/drills.mjs</code>)</summary>

Mark the buggy line with a trailing `// @bug` (or `# @bug`). The build strips the marker, records the line and shuffles the options.
</details>

## Project layout

```
content-src/        lab, DSA and drill sources (verified at build time)
scripts/            build-time verifiers / compilers
public/workers/     JS lab runtime, Pyodide runner, DSA judges
public/tests/       generated hidden DSA tests
src/app/            routes: debug, build, hunt, drills, dsa, visualize, learn, progress
src/components/     workspace, editors, 3D scenes (three/), visualizers (viz/)
src/lib/            progress store, bug mutation engine, theme
```

## Contributing

New labs, drills and problems are very welcome. Add a file to `content-src/`, run `npm run content`, and open a PR. If verification passes, it works.

## License

[MIT](LICENSE)
