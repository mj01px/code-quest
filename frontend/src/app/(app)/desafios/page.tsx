import type { Metadata } from "next";
import Link from "next/link";

import { PainelDeDesafios } from "@/components/desafios/PainelDeDesafios";
import { PortaDeAcesso } from "@/components/layout/PortaDeAcesso";
import { buscarExercicio, buscarTrilha, listarTrilhas } from "@/lib/api";
import { type Desafio, dataPorExtenso, desafiosDoDia } from "@/lib/desafios";
import { TIPO } from "@/lib/tipografia";

export const metadata: Metadata = {
  title: "Desafio do dia",
  description: "Três fases escolhidas para hoje, sorteadas pelas trilhas publicadas.",
};

// Na prática a página revalida a cada minuto, não a cada cinco. O Next adota o
// menor valor entre a rota e os fetches dela, e as buscas do catálogo
// (`CATALOGO` em lib/api.ts) usam 60 segundos, então elas têm precedência
// sobre os 300 declarados aqui. O build confirma: "Revalidate 1m".
export const revalidate = 300;

// O enunciado só vem no detalhe da fase. As buscas saem em paralelo, e uma que
// falhe deixa o cartão sem preview em vez de derrubar a página.
async function comEnunciado(desafios: Desafio[]): Promise<Desafio[]> {
  const detalhes = await Promise.all(
    desafios.map((desafio) =>
      buscarExercicio(desafio.trilhaSlug, desafio.slug).catch(() => null),
    ),
  );
  return desafios.map((desafio, indice) => ({
    ...desafio,
    enunciado: detalhes[indice]?.enunciado,
  }));
}

export default async function DesafiosPage() {
  const resumos = await listarTrilhas();
  const trilhas = await Promise.all(
    resumos
      .filter((trilha) => trilha.total_exercicios > 0)
      .map((trilha) => buscarTrilha(trilha.slug)),
  );

  const hoje = new Date();
  const desafios = await comEnunciado(desafiosDoDia(trilhas, hoje));

  if (desafios.length === 0) {
    return (
      <PortaDeAcesso perm="trilhas.view">
        <h1 className={`${TIPO.tituloPagina} text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[22px]`}>
          Desafio do dia
        </h1>
        <p className={`mt-6 border border-edge bg-panel p-6 ${TIPO.corpo} text-ink-muted`}>
          Ainda não há fases publicadas para sortear. Assim que a primeira
          trilha ganhar conteúdo, os desafios aparecem aqui.
        </p>
        <Link
          href="/trilhas"
          className="rotulo mt-6 inline-flex min-h-11 items-center border border-brand px-4 py-2 text-brand hover:bg-brand-shadow/30"
        >
          Ver as trilhas
        </Link>
      </PortaDeAcesso>
    );
  }

  return (
    <PortaDeAcesso perm="trilhas.view">
      <PainelDeDesafios desafios={desafios} dia={dataPorExtenso(hoje)} />
    </PortaDeAcesso>
  );
}
