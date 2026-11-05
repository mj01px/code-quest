import type { Metadata } from "next";
import Link from "next/link";

import { PainelDeDesafios } from "@/components/desafios/PainelDeDesafios";
import { PortaDeAcesso } from "@/components/layout/PortaDeAcesso";
import { buscarDesafioDeHoje } from "@/lib/api";
import { dataPorExtenso, desafioDaApi } from "@/lib/desafios";
import { TIPO } from "@/lib/tipografia";

export const metadata: Metadata = {
  title: "Desafio do dia",
  description: "Um desafio de código por dia, fora das trilhas.",
};

export const revalidate = 60;

export default async function DesafiosPage() {
  const hoje = new Date();
  const { desafio, proximos } = await buscarDesafioDeHoje();

  if (!desafio) {
    return (
      <PortaDeAcesso perm="trilhas.view">
        <span className="mb-3 block font-label text-[11px] tracking-[2px] text-brand">
          {"// DESAFIO DO DIA"}
        </span>
        <h1 className={`${TIPO.tituloPagina} text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[22px]`}>
          Desafio do dia
        </h1>
        <p className={`mt-6 border border-edge bg-panel p-6 ${TIPO.corpo} text-ink-muted`}>
          Ainda não há desafios publicados. Assim que o primeiro entrar, ele
          aparece aqui e troca a cada dia.
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
      <PainelDeDesafios
        desafio={desafioDaApi(desafio)}
        proximos={proximos ?? []}
        dia={dataPorExtenso(hoje)}
      />
    </PortaDeAcesso>
  );
}
