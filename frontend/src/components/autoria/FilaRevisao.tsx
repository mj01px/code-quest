"use client";

import { ListaEditorial } from "@/components/autoria/ListaEditorial";
import { api } from "@/lib/api";

export function FilaRevisao({
  aoDevolver,
  aoAprovar,
}: {
  aoDevolver?: () => void;
  /** O aprovado vai para "Prontos para publicar": o painel recarrega a lista. */
  aoAprovar?: () => void;
}) {
  return (
    <ListaEditorial
      titulo="Fila de revisão"
      vazio="Nada esperando revisão."
      status="REVISAO"
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
