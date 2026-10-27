# BugForge

A free, browser-only practice arena for coding interviews and online assessments, built around **debugging real codebases**, **building components from a spec**, and **DSA patterns**, with 3D/voxel visualizations and an explanation on every screen.

Everything runs client-side (Web Workers + Pyodide), so it deploys as a static site on Vercel's free tier with no backend.

## What's inside

| Mode | What you do |
|---|---|
| **Debug labs** (21) | Multi-file Node/Express/Mongoose or Python services with a bug ticket and a red test suite. Fix the root causes until every test is green. A *Request flow* view (2D and 3D) shows each request travelling through middleware → handler → database. |
| **Build labs** (9) | The opposite: tests describe a component that doesn't exist yet (rate limiter, job queue, LRU, JWT auth, KV store with transactions…). Implement it. |
| **Bug Hunt ∞** | Endless generated bugs: a mutation engine injects 1–3 real bugs into working labs, verified to break the tests. Find them against the clock. |
| **Spot the Bug** (65) | Fast drills in JS, Python, Java and C++: click the buggy line, pick the diagnosis, read the fix. |
| **DSA** (30) | Pattern-grouped problems with hidden tests (incl. large inputs that catch O(n²)), progressive hints, a written approach, and step-by-step visualizations. JS or Python. |
| **3D Lab** | An orbitable voxel world of HTTP requests hitting MongoDB collections, plus an algorithm playground with editable inputs (grid BFS rises as 3D voxel waves). |
| **Learn** | Short visual explainers: debugging playbook, event loop, Express pipeline, Mongoose, status codes, async pitfalls, JS/Python gotchas, concurrency, pattern cheat sheet. |
| **Progress** | Local-only stats, activity heatmap, weak-topic breakdown, export/import. |

Light and dark themes follow the system and can be toggled.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel (free)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo. The Next.js preset is detected automatically; no settings or environment variables are needed.
3. Deploy. `next.config.ts` uses `output: "export"`, so the site is fully static.

Or from the CLI:

```bash
npx vercel --prod
```

## Adding content

Content lives in `content-src/` and is compiled (and **verified**) into `src/content/*.generated.json` and `public/tests/`:

```bash
npm run content          # all of it
npm run content:labs     # labs: buggy code must fail, fixed code must pass
npm run content:dsa      # DSA: reference vs brute force vs Python, seeded random tests
npm run content:drills   # spot-the-bug drills
```

The verification scripts need Node 20+ and `python3` locally. Generated files are committed, so Vercel only runs `next build`.

## Tech

Next.js 15 (App Router, static export) · React 19 · Tailwind v4 · framer-motion · three.js via @react-three/fiber + drei · Monaco editor · Pyodide.
