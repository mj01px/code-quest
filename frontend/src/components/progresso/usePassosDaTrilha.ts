"use client";

import { useEffect, useMemo, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { api, temSessao } from "@/lib/api";
import { pedidosDerivados } from "@/lib/cacheDeProgresso";
import { mapaDePassos, type MapaDePassos } from "@/lib/passos";
import type { PassoDaTrilha } from "@/lib/types";

function buscarPassos(
  trilhaSlug: string,
  geracao: number,
): Promise<PassoDaTrilha[]> {
  const chave = `passos:${trilhaSlug}#${geracao}`;
  const existente = pedidosDerivados.get(chave) as
    Promise<PassoDaTrilha[]> | undefined;
  if (existente) return existente;
  for (const antiga of pedidosDerivados.keys()) {
    if (antiga.startsWith(`passos:${trilhaSlug}#`))
      pedidosDerivados.delete(antiga);
  }
  const pedido = Promise.resolve()
    .then(() => api.passosDaTrilha(trilhaSlug))
    .catch((erro: unknown) => {
      pedidosDerivados.delete(chave);
      throw erro;
    });
  pedidosDerivados.set(chave, pedido);
  return pedido;
}

export function usePassosDaTrilha(
  trilhaSlug: string,
): MapaDePassos & { carregado: boolean } {
  const { geracao } = useProgresso();
  const [passos, setPassos] = useState<PassoDaTrilha[] | null>(null);

  useEffect(() => {
    if (!trilhaSlug || !temSessao()) return;
    let ativo = true;
    buscarPassos(trilhaSlug, geracao ?? 0)
      .then((resposta) => {
        if (ativo) setPassos(resposta);
      })
      .catch(() => {
        if (ativo) setPassos(null);
      });
    return () => {
      ativo = false;
    };
  }, [trilhaSlug, geracao]);

  return useMemo(
    () => ({ ...mapaDePassos(passos), carregado: passos !== null }),
    [passos],
  );
}
