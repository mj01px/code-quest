"use client";

import { ListaEditorial } from "@/components/autoria/ListaEditorial";
import { api } from "@/lib/api";

export function FilaRevisao({
  aoDevolver,
  aoAprovar,
  aoContar,
}: {
  aoDevolver?: () => void;
  /** O aprovado vai para "Prontos para publicar": o painel recarrega a lista. */
  aoAprovar?: () => void;
  /** Total da lista, para o resumo do painel. */
  aoContar?: (total: number) => void;
}) {
  return (
    <ListaEditorial
      titulo="Revisão de conteúdo"
      status="REVISAO"
      aoContar={aoContar}
      carregar={api.autoriaFilaRevisao}
      acoes={[
        { rotulo: "Aprovar", executar: api.aprovarConteudo, depois: aoAprovar },
        {
          rotulo: "Devolver",
          executar: api.devolverConteudo,
          depois: aoDevolver,
          pedirMotivo: "MOTIVO DA DEVOLUÇÃO (O AUTOR VAI VER)",
        },
      ]}
    />
  );
}
