"use client";

import { AcoesRascunho } from "@/components/autoria/AcoesRascunho";
import { ListaEditorial } from "@/components/autoria/ListaEditorial";
import { api } from "@/lib/api";

// O devolvido (com parecer) mora em "Meus envios"; aqui fica o trabalho novo.
// Fora do componente: `carregar` precisa de referência estável.
const rascunhosPuros = () =>
  api.autoriaRascunhos().then((lista) => lista.filter((item) => !item.parecer));

export function ListaRascunhos({
  aoSubmeter,
  aoAlterar,
  aoContar,
}: {
  aoSubmeter?: () => void;
  /** Total da lista, para o resumo do painel. */
  aoContar?: (total: number) => void;
  /** Com ele, cada rascunho ganha editar e excluir; o painel recarrega a lista. */
  aoAlterar?: () => void;
}) {
  return (
    <ListaEditorial
      titulo="Rascunhos"
      status="RASCUNHO"
      aoContar={aoContar}
      carregar={rascunhosPuros}
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
      // A lista só traz trilhas; quem edita (aoAlterar) abre o editor no título.
      hrefDoItem={aoAlterar ? (item) => `/autoria/novo?trilha_id=${item.id}` : undefined}
    />
  );
}
