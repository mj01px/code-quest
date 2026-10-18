"use client";

import { CartaoDesafio } from "@/components/desafios/CartaoDesafio";
import { ContadorExpiracao } from "@/components/desafios/ContadorExpiracao";
import { SecaoStreak } from "@/components/desafios/SecaoStreak";
import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import type { Desafio } from "@/lib/desafios";
import { plural } from "@/lib/derivados";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { estaConcluida, percentual } from "@/lib/progresso";
import { TIPO } from "@/lib/tipografia";

// A lista do dia vem pronta do servidor estático; o que o aluno já concluiu
// vem da conta, pela API. É a mesma fronteira do painel de trilhas.

export function PainelDeDesafios({
  desafios,
  dia,
}: {
  desafios: Desafio[];
  /** Data já formatada no servidor, para não divergir na hidratação. */
  dia: string;
}) {
  const { chaves, sequencia, concluidos } = useProgresso();

  const feitos = desafios.filter((desafio) =>
    estaConcluida(chaves, desafio.trilhaSlug, desafio.slug),
  ).length;

  const xpDoDia = desafios.reduce((soma, desafio) => soma + desafio.xp, 0);

  return (
    <>
      <section
        aria-labelledby="desafio-do-dia"
        className="halo-brand animate-surgir border-2 border-brand bg-panel p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="rotulo text-ink-muted">Desafio do dia · {dia}</p>

            <h1
              id="desafio-do-dia"
              className={`mt-4 ${TIPO.tituloPagina} text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[22px]`}
            >
              {feitos === desafios.length
                ? "Missão do dia cumprida"
                : "Três fases escolhidas para hoje"}
            </h1>
          </div>

          <ContadorExpiracao />
        </div>

        <p className={`mt-3 ${TIPO.corpo} text-ink-muted`}>
          {plural(desafios.length, "desafio", "desafios")} · até {xpDoDia} XP ·
          troca a cada dia
        </p>

        <div className="mt-5">
          <BarraSegmentada
            valor={percentual(feitos, desafios.length)}
            segmentos={12}
            rotulo="Progresso nos desafios de hoje"
          />
        </div>

        <p className="rotulo mt-3 text-ink-muted">
          {feitos} de {desafios.length} concluídos
        </p>
      </section>

      {/* Sem sequência (visitante ou ainda carregando) a seção não aparece:
          no SSR ela nunca renderiza, então o horário do cliente não diverge. */}
      {sequencia ? <SecaoStreak sequencia={sequencia} concluidos={concluidos} /> : null}

      <ul className="mt-8 flex flex-col gap-3">
        {desafios.map((desafio, indice) => (
          <CartaoDesafio
            key={`${desafio.trilhaSlug}/${desafio.slug}`}
            desafio={desafio}
            posicao={indice + 1}
            concluido={estaConcluida(chaves, desafio.trilhaSlug, desafio.slug)}
          />
        ))}
      </ul>

      <p className={`mt-8 border border-edge bg-panel p-4 ${TIPO.corpo} text-ink-muted`}>
        Os desafios saem das trilhas publicadas e mudam todo dia. A conclusão é
        a mesma da fase: marcar aqui ou lá dá no mesmo. Seu progresso fica
        salvo na sua conta e acompanha você em qualquer dispositivo.
      </p>
    </>
  );
}
