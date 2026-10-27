"use client";
// Lightweight clickable code viewer with a regex-based highlighter (no editor needed for drills).
import clsx from "clsx";
import { Fragment } from "react";

const KW: Record<string, string[]> = {
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "of", "in", "while", "async", "await", "new", "class", "this", "try", "catch", "throw", "true", "false", "null", "undefined", "typeof", "constructor", "import", "export", "from"],
  python: ["def", "return", "if", "elif", "else", "for", "in", "while", "class", "self", "try", "except", "raise", "True", "False", "None", "and", "or", "not", "is", "lambda", "import", "from", "global", "with", "as", "pass", "yield"],
  java: ["public", "private", "final", "static", "class", "return", "if", "else", "for", "while", "new", "void", "int", "boolean", "String", "switch", "case", "break", "synchronized", "true", "false", "null", "this", "instanceof", "Override"],
  cpp: ["int", "double", "bool", "const", "return", "for", "if", "else", "while", "struct", "auto", "void", "std", "size_t", "true", "false", "nullptr", "char", "long", "static_cast"],
};

function highlight(line: string, lang: string) {
  const kws = new Set(KW[lang] ?? []);
  const re = /(\/\/.*$|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const t = m[0];
    let cls = "";
    if ((t.startsWith("//") && lang !== "python") || (t.startsWith("#") && lang === "python")) cls = "text-dim italic";
    else if (/^["'`]/.test(t)) cls = "text-mint";
    else if (/^\d/.test(t)) cls = "text-amber";
    else if (kws.has(t)) cls = "text-orange font-semibold";
    else if (/^[A-Z]/.test(t)) cls = "text-cyan";
    out.push(
      <span key={k++} className={cls}>
        {t}
      </span>,
    );
    last = m.index + t.length;
    if (t.startsWith("//") || (t.startsWith("#") && lang === "python")) break;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function CodeLines({
  code,
  lang,
  onPick,
  picked,
  bugLine,
  reveal,
}: {
  code: string;
  lang: string;
  onPick?: (line: number) => void;
  picked: number | null;
  bugLine: number;
  reveal: boolean;
}) {
  const lines = code.split("\n");
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-line bg-code py-3 font-mono text-[13.5px] leading-[1.75] shadow-[0_4px_0_var(--edge)]">
      {lines.map((l, i) => {
        const n = i + 1;
        const isBug = reveal && n === bugLine;
        const isWrongPick = reveal && picked === n && n !== bugLine;
        return (
          <Fragment key={i}>
            <button
              disabled={!onPick}
              onClick={() => onPick?.(n)}
              className={clsx(
                "group flex w-full min-w-max items-center pr-4 text-left transition-colors",
                onPick && "cursor-pointer hover:bg-orange/10",
                isBug && "bg-mint/15",
                isWrongPick && "bg-rose/15",
                !reveal && picked === n && "bg-orange/15",
              )}
            >
              <span className={clsx("w-11 shrink-0 select-none pr-3 text-right text-xs", isBug ? "font-bold text-mint" : isWrongPick ? "text-rose" : "text-dim")}>{n}</span>
              <span className={clsx("mr-2 h-4 w-1 shrink-0 rounded-full transition", isBug ? "bg-mint" : isWrongPick ? "bg-rose" : "bg-transparent group-hover:bg-orange/50")} />
              <span className="whitespace-pre">{highlight(l, lang)}</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
