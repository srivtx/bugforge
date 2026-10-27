"use client";
// Client-side bridges to the Web Workers in /public/workers.
import type { LabRun } from "./types";

const LAB_TIMEOUT_MS = 20000;

export function runJsLab(files: Record<string, string>, testFiles: string[], env: Record<string, string>): Promise<LabRun> {
  return new Promise((resolve) => {
    const started = performance.now();
    const w = new Worker("/workers/lab-runner.js");
    const timer = setTimeout(() => {
      w.terminate();
      resolve({
        tests: testFiles.map((f) => ({ file: f, name: "Test run aborted", status: "fail", error: `Timed out after ${LAB_TIMEOUT_MS / 1000}s. Look for an infinite loop or a promise that never settles.`, ms: LAB_TIMEOUT_MS })),
        traces: [],
        logs: [],
        loadError: null,
        ms: LAB_TIMEOUT_MS,
        timedOut: true,
      });
    }, LAB_TIMEOUT_MS);
    w.onmessage = (e) => {
      if (e.data.type !== "done") return;
      clearTimeout(timer);
      w.terminate();
      resolve({ ...e.data, ms: performance.now() - started });
    };
    w.onerror = (e) => {
      clearTimeout(timer);
      w.terminate();
      resolve({ tests: [{ file: testFiles[0], name: "Runner crashed", status: "fail", error: e.message, ms: 0 }], traces: [], logs: [], loadError: e.message, ms: 0 });
    };
    w.postMessage({ files, testFiles, env });
  });
}

let pyLabWorker: Worker | null = null;
let pyLabReady: Promise<void> | null = null;

function getPyLabWorker(onStatus?: (s: string) => void) {
  if (!pyLabWorker) {
    pyLabWorker = new Worker("/workers/py-lab-runner.js");
    pyLabReady = new Promise((res) => {
      const w = pyLabWorker!;
      const h = (e: MessageEvent) => {
        if (e.data.type === "ready") {
          w.removeEventListener("message", h);
          res();
        }
      };
      w.addEventListener("message", h);
    });
  }
  if (onStatus) onStatus("Loading Python runtime (first run only, ~10MB)…");
  return { worker: pyLabWorker, ready: pyLabReady! };
}

export async function runPyLab(files: Record<string, string>, testFiles: string[], onStatus?: (s: string) => void): Promise<LabRun> {
  const started = performance.now();
  const { worker, ready } = getPyLabWorker(onStatus);
  await ready;
  onStatus?.("Running tests…");
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      pyLabWorker = null;
      resolve({
        tests: [{ file: testFiles[0], name: "Test run aborted", status: "fail", error: "Timed out after 20s (infinite loop?). The Python runtime was restarted.", ms: LAB_TIMEOUT_MS }],
        traces: [],
        logs: [],
        loadError: null,
        ms: LAB_TIMEOUT_MS,
        timedOut: true,
      });
    }, LAB_TIMEOUT_MS);
    const h = (e: MessageEvent) => {
      if (e.data.type !== "done") return;
      worker.removeEventListener("message", h);
      clearTimeout(timer);
      resolve({ traces: [], ...e.data, ms: performance.now() - started });
    };
    worker.addEventListener("message", h);
    worker.postMessage({ files, testFiles });
  });
}

export function runLab(lang: "js" | "py", files: Record<string, string>, testFiles: string[], env: Record<string, string>, onStatus?: (s: string) => void) {
  return lang === "py" ? runPyLab(files, testFiles, onStatus) : runJsLab(files, testFiles, env);
}

/* ---------------------------------------------------------------- DSA code runner */

export interface CodeResult {
  output?: unknown;
  error?: string;
  ms: number;
  logs: string[];
}

let pyWorker: Worker | null = null;
let pyBoot: Promise<void> | null = null;

function getPy() {
  if (!pyWorker) {
    pyWorker = new Worker("/workers/py-runner.js");
    pyBoot = new Promise((res) => {
      const w = pyWorker!;
      const h = (e: MessageEvent) => {
        if (e.data.type === "ready") {
          w.removeEventListener("message", h);
          res();
        }
      };
      w.addEventListener("message", h);
    });
  }
  return { worker: pyWorker, boot: pyBoot! };
}

export async function runCode(
  lang: "js" | "py",
  code: string,
  fn: string,
  tests: { input: unknown[] }[],
  onStatus?: (s: string) => void,
): Promise<{ compileError?: string; results?: CodeResult[]; timedOut?: boolean }> {
  const limit = 12000;
  if (lang === "js") {
    return new Promise((resolve) => {
      const w = new Worker("/workers/js-runner.js");
      const t = setTimeout(() => {
        w.terminate();
        resolve({ timedOut: true });
      }, limit);
      w.onmessage = (e) => {
        if (e.data.type === "progress") return;
        clearTimeout(t);
        w.terminate();
        if (e.data.type === "compile-error") resolve({ compileError: e.data.error });
        else resolve({ results: e.data.results });
      };
      w.postMessage({ code, fn, tests });
    });
  }
  const { worker, boot } = getPy();
  onStatus?.("Loading Python runtime (first run only)…");
  await boot;
  onStatus?.("Running…");
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      worker.terminate();
      pyWorker = null;
      resolve({ timedOut: true });
    }, limit + 8000);
    const h = (e: MessageEvent) => {
      if (e.data.type === "ready") return;
      worker.removeEventListener("message", h);
      clearTimeout(t);
      if (e.data.type === "compile-error") resolve({ compileError: e.data.error });
      else resolve({ results: e.data.results });
    };
    worker.addEventListener("message", h);
    worker.postMessage({ code, fn, tests });
  });
}
