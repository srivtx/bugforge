export type Difficulty = "Easy" | "Medium" | "Hard";

export interface LabBug {
  file: string;
  title: string;
  explain: string;
}

export interface Lab {
  slug: string;
  order?: number;
  kind: "debug" | "build";
  lang: "js" | "py";
  title: string;
  difficulty: Difficulty;
  minutes: number;
  tagline: string;
  ticket: string;
  env: Record<string, string>;
  files: Record<string, string>;
  tests: Record<string, string>;
  fixes: Record<string, string>;
  bugs: LabBug[]; // for build labs: the requirements / key steps
  hints: string[];
  concepts: string[];
}

export interface TestResult {
  file: string;
  name: string;
  status: "pass" | "fail";
  error?: string;
  ms: number;
}

export interface TraceStep {
  kind: "middleware" | "handler" | "router" | "db" | "error";
  name: string;
  detail: string;
  coll?: string; // db steps: collection (model) name
  size?: number; // db steps: documents in the collection after the op
  matched?: number; // db steps: documents matched / affected
  op?: string;
}

export interface Trace {
  id: number;
  test: string | null;
  method: string;
  url: string;
  steps: TraceStep[];
  status: number | "timeout" | null;
  body: unknown;
}

export interface LabRun {
  tests: TestResult[];
  traces: Trace[];
  logs: { test: string | null; level: string; text: string }[];
  loadError: string | null;
  ms: number;
  timedOut?: boolean;
}

export interface Problem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  patterns: string[];
  group: string;
  freq: number;
  story: string;
  fn: string;
  params: [string, string][];
  returns: string;
  examples: { input: unknown[]; output: unknown; explain: string }[];
  constraints: string[];
  hints: string[];
  approach: string;
  time: string;
  space: string;
  compare: string;
  starter: { js: string; py: string };
  solution: { js: string; py: string };
  viz: { id: string; input?: unknown } | null;
  testCount: number;
  followUps: string[];
}

export interface Drill {
  id: string;
  lang: "javascript" | "python" | "java" | "cpp";
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  code: string;
  bugLine: number; // 1-based
  options: string[];
  answer: number; // index into options
  explain: string;
  fixed: string; // corrected line
}
