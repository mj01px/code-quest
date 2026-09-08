"use client";

import { useSyncExternalStore } from "react";

import { IconeMenu, IconeSeta } from "@/components/ui/Icone";
import {
  alternar,
  assinar,
  estaAberta,
  estaAbertaNoServidor,
} from "@/lib/preferenciaSidebar";

export const ID_DO_MENU = "menu-lateral";

const ID = { recolher: "recolher-menu", expandir: "expandir-menu" } as const;

export type Modo = keyof typeof ID;

export function AlternarSidebar({
  modo,
  className = "",
  comRotulo = false,
}: {
  modo: Modo;
  className?: string;
  comRotulo?: boolean;
}) {
  const aberta = useSyncExternalStore(
    assinar,
    estaAberta,
    estaAbertaNoServidor,
  );

  const recolhe = modo === "recolher";
  const rotulo = recolhe ? "Recolher menu" : "Abrir menu";

  function aoClicar() {
    alternar();
    // O botão clicado sai da tela junto com o CSS; sem devolver o foco ao
    // outro, o teclado voltaria para o topo do documento.
    document.getElementById(recolhe ? ID.expandir : ID.recolher)?.focus();
  }

  return (
    <button
      id={ID[modo]}
      type="button"
      onClick={aoClicar}
      aria-controls={ID_DO_MENU}
      aria-expanded={aberta}
      title={comRotulo ? undefined : rotulo}
      className={`cursor-pointer border transition-colors ${className}`}
    >
      {recolhe ? (
        <IconeSeta className="h-3.5 w-3.5" />
      ) : (
        <IconeMenu className="h-3.5 w-3.5" />
      )}
      {comRotulo ? (
        <span className="rotulo truncate">{rotulo}</span>
      ) : (
        <span className="sr-only">{rotulo}</span>
      )}
    </button>
  );
}
