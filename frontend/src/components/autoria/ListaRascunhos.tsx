"use client";

import { ListaEditorial } from "@/components/autoria/ListaEditorial";
import { api } from "@/lib/api";

export function ListaRascunhos({ aoSubmeter }: { aoSubmeter?: () => void }) {
  return (
    <ListaEditorial
      titulo="Rascunhos"
      vazio="Nenhum rascunho esperando envio."
      carregar={api.autoriaRascunhos}
      acoes={[
        {
          rotulo: "Enviar para Revisão",
          executar: api.submeterRevisao,
          depois: aoSubmeter,
        },
      ]}
    />
  );
}
