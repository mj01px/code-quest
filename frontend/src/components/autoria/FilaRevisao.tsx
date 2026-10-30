"use client";

import { ListaEditorial } from "@/components/autoria/ListaEditorial";
import { api } from "@/lib/api";

export function FilaRevisao({ aoDevolver }: { aoDevolver?: () => void }) {
  return (
    <ListaEditorial
      titulo="Fila de revisão"
      vazio="Nada esperando revisão."
      carregar={api.autoriaFilaRevisao}
      acoes={[
        { rotulo: "Aprovar", executar: api.aprovarConteudo },
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
