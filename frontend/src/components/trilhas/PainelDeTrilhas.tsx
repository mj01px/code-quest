"use client";

import { useEffect, useState } from "react";

import {
  CartaoDestaque,
  type Retomada,
} from "@/components/trilhas/CartaoDestaque";
import { ListaDeTrilhas } from "@/components/trilhas/ListaDeTrilhas";
import { fasesEmOrdem, plural, proximaFase } from "@/lib/derivados";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { usePassosDaTrilha } from "@/components/progresso/usePassosDaTrilha";
import { api, temSessao } from "@/lib/api";
import { rotaDoPasso } from "@/lib/passos";
import {
  chaveDaEtapa,
  concluidasDaTrilha,
  contarEtapasPorTrilha,
  contarPorTrilha,
  percentual,
} from "@/lib/progresso";
import type {
  EtapaConcluida,
  PassoDaTrilha,
  ExercicioConcluido,
  TrilhaDetalhe,
  TrilhaResumo,
} from "@/lib/types";

// Fronteira estático/cliente: catálogo vem do servidor, conclusões do Context.
// Agregação por trilha é feita aqui.

function montarRetomada(
  destaque: TrilhaDetalhe,
  feitas: readonly string[],
  progresso: number,
  etapasFeitas: ReadonlySet<string>,
  proximoPasso: PassoDaTrilha | null = null,
): Retomada | null {
  if (progresso <= 0) return null;

  if (proximoPasso) {
    const modulo =
      destaque.aulas.findIndex((aula) => aula.slug === proximoPasso.aula_slug) +
      1;
    return {
      progresso,
      posicao: `Módulo ${Math.max(1, modulo)} · ${proximoPasso.titulo}`,
      href: rotaDoPasso(destaque.slug, proximoPasso),
    };
  }

  const fases = fasesEmOrdem(destaque);
  const proxima = proximaFase(fases, feitas);

  if (proxima === null) {
    return {
      progresso,
      posicao: `${plural(fases.length, "fase concluída", "fases concluídas")}`,
    };
  }

  const aula = destaque.aulas[proxima.moduloPosicao - 1];
  const licaoPendente =
    aula !== undefined &&
    aula.conteudo.trim() !== "" &&
    !etapasFeitas.has(chaveDaEtapa(destaque.slug, aula.slug, "LEITURA"));

  if (licaoPendente) {
    return {
      progresso,
      posicao: `Módulo ${proxima.moduloPosicao} · Lição: ${aula.titulo}`,
      href: `/trilhas/${destaque.slug}/aulas/${aula.slug}`,
    };
  }

  return {
    progresso,
    posicao: `Módulo ${proxima.moduloPosicao} · ${proxima.titulo}`,
    href: `/trilhas/${destaque.slug}/exercicios/${proxima.slug}`,
  };
}

function calcularProgresso(
  trilhas: TrilhaResumo[],
  concluidos: readonly ExercicioConcluido[],
  etapas: readonly EtapaConcluida[],
): Record<string, number> {
  const exercicios = contarPorTrilha(concluidos);
  const etapasFeitas = contarEtapasPorTrilha(etapas);
  const porSlug: Record<string, number> = {};
  for (const trilha of trilhas) {
    porSlug[trilha.slug] = percentual(
      (exercicios.get(trilha.slug) ?? 0) + (etapasFeitas.get(trilha.slug) ?? 0),
      trilha.total_exercicios + (trilha.total_etapas ?? 0),
    );
  }
  return porSlug;
}

export function PainelDeTrilhas({
  trilhas,
  detalhes = {},
}: {
  trilhas: TrilhaResumo[];
  detalhes?: Record<string, TrilhaDetalhe>;
}) {
  const {
    concluidos,
    etapas,
    chavesDeEtapas,
    trilhasIniciadas,
    usuario,
    chaves,
  } = useProgresso();
  const [ativa, setAtiva] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    Promise.resolve()
      .then(() => (temSessao() ? api.trilhaAtual() : { trilha: null }))
      .then((resposta) => {
        if (vivo) setAtiva(resposta.trilha);
      })
      .catch(() => {
        if (vivo) setAtiva(null);
      });
    return () => {
      vivo = false;
    };
  }, [chaves, chavesDeEtapas]);

  const progressoPorSlug = calcularProgresso(trilhas, concluidos, etapas);
  const [primeira] = trilhas;
  const trilhaAtiva = ativa
    ? trilhas.find((trilha) => trilha.slug === ativa)
    : undefined;
  const destaque = trilhaAtiva ? (detalhes[trilhaAtiva.slug] ?? null) : null;
  const { proximo } = usePassosDaTrilha(trilhaAtiva?.slug ?? "");

  return (
    <>
      {primeira ? (
        trilhaAtiva ? (
          <CartaoDestaque
            trilha={trilhaAtiva}
            retomada={
              destaque
                ? montarRetomada(
                    destaque,
                    concluidasDaTrilha(concluidos, trilhaAtiva.slug),
                    progressoPorSlug[trilhaAtiva.slug] ?? 0,
                    chavesDeEtapas,
                    proximo,
                  )
                : null
            }
          />
        ) : (
          <CartaoDestaque
            trilha={primeira}
            modo={ativa === undefined ? "carregando" : "vazio"}
          />
        )
      ) : null}

      <ListaDeTrilhas
        trilhas={trilhas}
        progressoPorSlug={progressoPorSlug}
        iniciadas={trilhasIniciadas}
        podeExcluir={
          usuario?.permissoes.includes("trilhas.delete_published") ?? false
        }
      />
    </>
  );
}
