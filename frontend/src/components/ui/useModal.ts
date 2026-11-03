"use client";

import { useEffect, type RefObject } from "react";

const FOCAVEIS =
  "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]";

/**
 * Teclado de todo modal: foco no painel ao abrir e de volta em quem abriu ao
 * fechar, Esc fecha (exceto bloqueado, com ação em voo) e o Tab dá a volta
 * dentro do painel, porque aria-modal não prende o foco sozinho.
 */
export function useModal(
  painel: RefObject<HTMLElement | null>,
  onFechar: () => void,
  bloqueado = false,
) {
  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null;
    painel.current?.focus();
    return () => {
      if (origem?.isConnected) origem.focus();
    };
  }, [painel]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const atual = painel.current;
      // Modal aberto dentro deste cuida do Esc e do Tab: sem isso o Esc
      // fecharia os dois e desmontaria o pedido em andamento.
      if (!atual || atual.querySelector('[role="dialog"]')) return;
      if (evento.key === "Escape" && !bloqueado) onFechar();
      if (evento.key !== "Tab") return;

      const focaveis = [...atual.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
        (elemento) => elemento.tabIndex >= 0,
      );
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;
      // Carregando, os botões ficam disabled e o foco pode ter caído no body.
      if (!primeiro || !ultimo || !atual.contains(ativo)) {
        evento.preventDefault();
        (primeiro ?? atual).focus();
        return;
      }
      if (evento.shiftKey && (ativo === primeiro || ativo === atual)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [painel, bloqueado, onFechar]);
}
