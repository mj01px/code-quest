"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useModal } from "@/components/ui/useModal";

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

function AvisoDoWarden({ onFechar }: { onFechar: () => void }) {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const descricaoId = useId();

  useModal(painel, onFechar);

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-void/50 p-4 motion-safe:animate-aparecer">
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        tabIndex={-1}
        className="flex max-h-[90dvh] w-full max-w-[440px] flex-col items-center gap-4 overflow-y-auto border-2 border-danger bg-panel px-6 py-7 text-center shadow-pixel-lg outline-none motion-safe:animate-surgir"
      >
        <Image
          src="/marca/warden.png"
          alt=""
          width={144}
          height={144}
          unoptimized
          className="h-28 w-28 shrink-0 border-2 border-danger-deep bg-field object-contain [image-rendering:pixelated] sm:h-36 sm:w-36"
        />
        <span className="font-label text-[11px] tracking-[3px] text-danger">
          WARDEN.EXE
        </span>
        <h2 id={tituloId} className="m-0 font-display text-sm leading-[1.6] text-ink">
          Colagem interceptada
        </h2>
        <p
          id={descricaoId}
          className="m-0 w-full border-2 border-danger-deep bg-panel-deep px-4 py-3 font-body text-sm leading-relaxed text-ink-body"
        >
          Boa tentativa, aventureiro. Seu pet está contando com você. Tente escrever
          a solução do seu jeito.
        </p>
        <button
          type="button"
          onClick={onFechar}
          className="min-h-11 cursor-pointer border-2 border-danger bg-danger-deep px-4 py-2 font-display text-[10px] leading-[1.7] text-ink shadow-pixel hover:bg-danger-deep/80"
        >
          Voltar ao código
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function EditorDeCodigo({
  valor,
  aoMudar,
  linguagem = "python",
  altura = "20rem",
  somenteLeitura = false,
  aoExecutarAtalho,
  semMoldura = false,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  linguagem?: string;
  altura?: string;
  somenteLeitura?: boolean;
  aoExecutarAtalho?: () => void;
  semMoldura?: boolean;
}) {
  const [wardenAberto, setWardenAberto] = useState(false);
  const atalho = useRef(aoExecutarAtalho);
  useEffect(() => {
    atalho.current = aoExecutarAtalho;
  }, [aoExecutarAtalho]);

  return (
    <>
      <div
        className={
          semMoldura
            ? "overflow-hidden bg-field"
            : "overflow-hidden border-2 border-edge bg-field shadow-pixel-sm"
        }
        style={{ height: altura }}
        onKeyDownCapture={(evento) => {
          if (
            somenteLeitura ||
            !(evento.ctrlKey || evento.metaKey) ||
            evento.altKey ||
            evento.key.toLowerCase() !== "v"
          ) {
            return;
          }
          evento.preventDefault();
          evento.stopPropagation();
          setWardenAberto(true);
        }}
        onPasteCapture={(evento) => {
          if (somenteLeitura) return;
          evento.preventDefault();
          evento.stopPropagation();
          setWardenAberto(true);
        }}
      >
        <Editor
          height="100%"
          language={linguagem}
          theme="codequest"
          value={valor}
          beforeMount={definirTema}
          onMount={(editor, monaco) => {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
              atalho.current?.(),
            );
          }}
          onChange={(novo) => aoMudar(novo ?? "")}
          options={{ ...OPCOES, readOnly: somenteLeitura }}
        />
      </div>
      {wardenAberto && <AvisoDoWarden onFechar={() => setWardenAberto(false)} />}
    </>
  );
}