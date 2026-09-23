"use client";

import dynamic from "next/dynamic";

type Monaco = typeof import("monaco-editor");

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-label text-xs text-ink-muted">
      carregando editor...
    </div>
  ),
});

const OPCOES = {
  fontSize: 14,
  fontFamily: "'Cascadia Mono', Consolas, 'Courier New', monospace",
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  padding: { top: 12, bottom: 12 },
  lineNumbersMinChars: 3,
  overviewRulerLanes: 0,
  folding: false,
  contextmenu: false,
  // desliguei o autocomplete padrao do monaco, se nao tira a ideia do projeto k
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: "off" as const,
  parameterHints: { enabled: false },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
};

function definirTema(monaco: Monaco) {
  monaco.editor.defineTheme("codequest", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#16161c",
      "editor.lineHighlightBackground": "#1b1b23",
      "editorLineNumber.foreground": "#6e6880",
      "editorLineNumber.activeForeground": "#c084fc",
      "editorCursor.foreground": "#c084fc",
      "editor.selectionBackground": "#3b3350",
      "editorIndentGuide.background1": "#24202e",
      "editorIndentGuide.activeBackground1": "#3b3350",
    },
  });
}

export function EditorDeCodigo({
  valor,
  aoMudar,
  linguagem = "python",
  altura = "20rem",
  somenteLeitura = false,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  linguagem?: string;
  altura?: string;
  somenteLeitura?: boolean;
}) {
  return (
    <div
      className="overflow-hidden border-2 border-edge bg-field shadow-pixel-sm"
      style={{ height: altura }}
    >
      <Editor
        height="100%"
        language={linguagem}
        theme="codequest"
        value={valor}
        beforeMount={definirTema}
        onChange={(novo) => aoMudar(novo ?? "")}
        options={{ ...OPCOES, readOnly: somenteLeitura }}
      />
    </div>
  );
}