// Runs public/workers/lab-runner.js inside a Node vm so labs can be verified at build time.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../public/workers/lab-runner.js", import.meta.url), "utf8");

export function runLab({ files, testFiles, env }) {
  return new Promise((resolve) => {
    const self = {
      postMessage: (msg) => resolve(msg),
    };
    const ctx = vm.createContext({
      self,
      console,
      setTimeout,
      clearTimeout,
      Promise,
      performance,
      crypto: globalThis.crypto,
      btoa,
      atob,
      escape,
      unescape,
      Date,
      JSON,
      Math,
      URL,
    });
    vm.runInContext(src, ctx, { filename: "lab-runner.js" });
    self.onmessage({ data: { files, testFiles, env } });
  });
}
