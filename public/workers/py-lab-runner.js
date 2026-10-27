// Python lab runner: writes lab files into Pyodide's in-memory FS and runs unittest.
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

let boot = null;
let harness = false;
let runId = 0;

function getPy() {
  if (!boot) {
    boot = loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" }).then((py) => {
      self.postMessage({ type: "ready" });
      return py;
    });
  }
  return boot;
}
getPy();

function mkdirp(FS, path) {
  const parts = path.split("/").filter(Boolean);
  let cur = "";
  for (const p of parts) {
    cur += "/" + p;
    try {
      FS.mkdir(cur);
    } catch {
      /* exists */
    }
  }
}

self.onmessage = async (e) => {
  const { files, testFiles } = e.data;
  const py = await getPy();
  if (!harness) {
    const src = await (await fetch("/workers/py_lab_harness.py")).text();
    py.FS.writeFile("/py_lab_harness.py", src);
    py.runPython("import sys; sys.path.insert(0, '/')");
    harness = true;
  }
  runId += 1;
  const root = `/lab${runId}`;
  for (const [path, content] of Object.entries(files)) {
    const full = `${root}/${path}`;
    mkdirp(py.FS, full.slice(0, full.lastIndexOf("/")));
    py.FS.writeFile(full, content);
  }
  // make every directory a package
  const dirs = new Set(Object.keys(files).map((p) => p.split("/").slice(0, -1).join("/")).filter(Boolean));
  for (const d of dirs) {
    const init = `${root}/${d}/__init__.py`;
    if (!files[`${d}/__init__.py`]) py.FS.writeFile(init, "");
  }
  const mods = testFiles.map((f) => f.replace(/\.py$/, "").replace(/\//g, "."));
  try {
    const run = py.runPython("from py_lab_harness import run_lab; run_lab");
    const raw = run(root, py.toPy(mods));
    run.destroy();
    self.postMessage({ type: "done", traces: [], ...JSON.parse(raw) });
  } catch (err) {
    self.postMessage({ type: "done", tests: [{ file: testFiles[0], name: "Runner error", status: "fail", error: String(err.message || err), ms: 0 }], traces: [], logs: [], loadError: String(err) });
  }
};
