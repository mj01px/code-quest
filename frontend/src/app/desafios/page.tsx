import type { Metadata } from "next";
import Link from "next/link";

import { PainelDeDesafios } from "@/components/desafios/PainelDeDesafios";
import { buscarTrilha, listarTrilhas } from "@/lib/api";
import { dataPorExtenso, desafiosDoDia } from "@/lib/desafios";

export const metadata: Metadata = {
  title: "Desafio do dia",
  description: "Três fases escolhidas para hoje, sorteadas pelas trilhas publicadas.",
};

// Cinco minutos: o suficiente para a página não ser remontada a cada visita e
// pouco o bastante para a virada do dia aparecer quase na hora.
export const revalidate = 300;

export default async function DesafiosPage() {
  const resumos = await listarTrilhas();
  const trilhas = await Promise.all(
    resumos
      .filter((trilha) => trilha.total_exercicios > 0)
      .map((trilha) => buscarTrilha(trilha.slug)),
  );

  const hoje = new Date();
  const desafios = desafiosDoDia(trilhas, hoje);

  if (desafios.length === 0) {
    return (
      <>
        <h1 className="titulo text-xl text-ink-soft">Desafio do dia</h1>
        <p className="mt-6 border border-edge bg-panel p-6 text-xs leading-relaxed text-ink-muted">
          Ainda não há fases publicadas para sortear. Assim que a primeira
          trilha ganhar conteúdo, os desafios aparecem aqui.
        </p>
        <Link
          href="/trilhas"
          className="rotulo mt-6 inline-block border border-brand px-4 py-2 text-brand hover:bg-brand-shadow/30"
        >
          Ver as trilhas
        </Link>
      </>
    );
  }

  return <PainelDeDesafios desafios={desafios} dia={dataPorExtenso(hoje)} />;
}
