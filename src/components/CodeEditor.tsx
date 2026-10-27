"use client";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import { useTheme } from "@/lib/theme";

export function defineTheme(monaco: Monaco) {
  monaco.editor.defineTheme("bugforge-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "9a94a8", fontStyle: "italic" },
      { token: "keyword", foreground: "d9570a" },
      { token: "string", foreground: "0b8a5f" },
      { token: "number", foreground: "b07800" },
      { token: "type", foreground: "0a86a3" },
    ],
    colors: {
      "editor.background": "#fffdf8",
      "editor.foreground": "#1d1b26",
      "editorLineNumber.foreground": "#c9c1b0",
      "editorLineNumber.activeForeground": "#ff7a1a",
      "editor.lineHighlightBackground": "#f6f2ea",
      "editor.selectionBackground": "#6c5cf533",
      "editorCursor.foreground": "#ff7a1a",
      "editorGutter.background": "#fffdf8",
      "editorWidget.background": "#fffdf8",
    },
  });
  monaco.editor.defineTheme("bugforge", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7d776d", fontStyle: "italic" },
      { token: "keyword", foreground: "ff9a3c" },
      { token: "string", foreground: "3ee6a8" },
      { token: "number", foreground: "ffc857" },
      { token: "type", foreground: "3dd6f5" },
      { token: "identifier", foreground: "f0ece4" },
      { token: "delimiter", foreground: "a39d92" },
    ],
    colors: {
      "editor.background": "#171614",
      "editor.foreground": "#f0ece4",
      "editorLineNumber.foreground": "#4a4640",
      "editorLineNumber.activeForeground": "#ff9a3c",
      "editor.lineHighlightBackground": "#26242266",
      "editor.selectionBackground": "#8b7bff44",
      "editorCursor.foreground": "#ff9a3c",
      "editorIndentGuide.background1": "#2a2825",
      "editorGutter.background": "#171614",
      "scrollbarSlider.background": "#403d3888",
      "editorWidget.background": "#1b1a18",
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
  const theme = useTheme();
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
      theme={theme === "dark" ? "bugforge" : "bugforge-light"}
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
