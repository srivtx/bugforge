"use client";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useRef } from "react";

function defineTheme(monaco: Monaco) {
  monaco.editor.defineTheme("bugforge", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b6b88", fontStyle: "italic" },
      { token: "keyword", foreground: "ff9a3c" },
      { token: "string", foreground: "3ee6a8" },
      { token: "number", foreground: "ffc857" },
      { token: "type", foreground: "3dd6f5" },
      { token: "identifier", foreground: "ececf4" },
      { token: "delimiter", foreground: "9a9ab5" },
    ],
    colors: {
      "editor.background": "#0b0b13",
      "editor.foreground": "#ececf4",
      "editorLineNumber.foreground": "#3a3a58",
      "editorLineNumber.activeForeground": "#ff9a3c",
      "editor.lineHighlightBackground": "#14142266",
      "editor.selectionBackground": "#8b7bff44",
      "editorCursor.foreground": "#ff9a3c",
      "editorIndentGuide.background1": "#1d1d2e",
      "editorGutter.background": "#0b0b13",
      "scrollbarSlider.background": "#2f2f4a88",
      "editorWidget.background": "#11111c",
    },
  });
}

export function langFor(path: string) {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".cpp")) return "cpp";
  return "javascript";
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly,
  path,
  onRun,
  highlightLines,
}: {
  value: string;
  onChange?: (v: string) => void;
  language: string;
  readOnly?: boolean;
  path?: string;
  onRun?: () => void;
  highlightLines?: number[];
}) {
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const decoRef = useRef<string[]>([]);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const applyDecorations = () => {
    const ed = editorRef.current;
    if (!ed) return;
    decoRef.current = ed.deltaDecorations(
      decoRef.current,
      (highlightLines || []).map((l) => ({
        range: { startLineNumber: l, startColumn: 1, endLineNumber: l, endColumn: 1 },
        options: { isWholeLine: true, className: "bf-line-hl", glyphMarginClassName: "bf-glyph" },
      })),
    );
  };
  if (editorRef.current) applyDecorations();

  return (
    <Editor
      height="100%"
      path={path}
      language={language}
      value={value}
      theme="bugforge"
      beforeMount={defineTheme}
      onMount={(editor, monaco) => {
        editorRef.current = editor;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
        applyDecorations();
      }}
      onChange={(v) => onChange?.(v ?? "")}
      loading={<div className="grid h-full place-items-center text-sm text-dim">Loading editor…</div>}
      options={{
        readOnly,
        fontFamily: "var(--font-code), JetBrains Mono, monospace",
        fontSize: 13.5,
        lineHeight: 21,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "all",
        tabSize: 2,
        automaticLayout: true,
        fixedOverflowWidgets: true,
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: false },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
}
