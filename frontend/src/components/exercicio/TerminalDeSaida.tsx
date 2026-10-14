"use client";

import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

type Props = {
  saida: string;
  erro: string;
  veredito: string;
};

const MENSAGENS: Record<string, string> = {
  TEMPO_ESGOTADO: "Tempo esgotado: o código excedeu o limite de execução.",
  ERRO_DE_EXECUCAO: "Erro de execução: o código não terminou normalmente.",
};

function linhas(texto: string): string {
  return texto.replace(/\r\n/g, "\n");
}

export function TerminalDeSaida({ saida, erro, veredito }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);

  useEffect(() => {
    const elemento = container.current;
    if (!elemento) return;

    const instancia = new Terminal({
      disableStdin: true,
      cursorBlink: false,
      convertEol: true,
      fontFamily: "'Cascadia Mono', Consolas, 'Courier New', monospace",
      fontSize: 14,
      theme: {
        background: "#16161c",
        foreground: "#d8d4e0",
        cursor: "#c084fc",
        selectionBackground: "#3b3350",
        red: "#f87171",
        magenta: "#c084fc",
      },
    });
    const ajuste = new FitAddon();
    instancia.loadAddon(ajuste);
    instancia.open(elemento);
    instancia.textarea?.setAttribute("readonly", "");
    if (instancia.textarea) instancia.textarea.tabIndex = -1;
    terminal.current = instancia;

    const redimensionar = () => ajuste.fit();
    redimensionar();
    const observador = new ResizeObserver(redimensionar);
    observador.observe(elemento);

    return () => {
      observador.disconnect();
      terminal.current = null;
      instancia.dispose();
    };
  }, []);

  useEffect(() => {
    const instancia = terminal.current;
    if (!instancia) return;

    instancia.reset();
    if (saida) instancia.write(linhas(saida));
    if (erro) {
      if (saida && !saida.endsWith("\n")) instancia.write("\r\n");
      instancia.write(`\x1b[31m${linhas(erro)}\x1b[0m`);
    }
    if (MENSAGENS[veredito]) {
      if ((saida || erro) && !(erro || saida).endsWith("\n")) {
        instancia.write("\r\n");
      }
      instancia.write(`\x1b[35m${MENSAGENS[veredito]}\x1b[0m`);
    }
  }, [saida, erro, veredito]);

  return (
    <section className="overflow-hidden border-2 border-edge bg-field shadow-pixel-sm">
      <p className="border-b border-edge px-3 py-2 font-label text-xs text-brand-light">
        terminal
      </p>
      <div
        ref={container}
        role="log"
        aria-label="Saída da execução"
        className="h-48 p-3"
        onPaste={(evento) => evento.preventDefault()}
        onContextMenu={(evento) => evento.preventDefault()}
      />
    </section>
  );
}