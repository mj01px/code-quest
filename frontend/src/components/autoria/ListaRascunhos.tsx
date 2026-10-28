"use client";

import { AcoesRascunho } from "@/components/autoria/AcoesRascunho";
import { ListaEditorial } from "@/components/autoria/ListaEditorial";
import { api } from "@/lib/api";

export function ListaRascunhos({
  aoSubmeter,
  aoAlterar,
}: {
  aoSubmeter?: () => void;
  /** Com ele, cada rascunho ganha editar e excluir; o painel recarrega a lista. */
  aoAlterar?: () => void;
}) {
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
      extras={
        aoAlterar
          ? (item) => <AcoesRascunho item={item} aoAlterar={aoAlterar} />
          : undefined
      }
    />
  );
}
