"use client";

import { LinkDeAcao } from "@/components/licao/LinkDeAcao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { rotaDoExercicio } from "@/lib/aulas";
import { estaConcluida } from "@/lib/progresso";

/**
 * Saída do fim da leitura. Enquanto o módulo tem exercício pendente, o único
 * caminho é praticar: o quiz, se houver (ele já leva aos exercícios), ou o
 * próximo exercício pendente. "Próximo módulo" só aparece com o módulo
 * completo, porque antes disso ele levava a uma etapa bloqueada.
 */
export function ProximoPassoDaLeitura({
  trilhaSlug,
  fases,
  rotaQuiz,
  rotaProximoModulo,
  rotaTrilha,
}: {
  trilhaSlug: string;
  /** Slugs dos exercícios do módulo, na ordem da trilha. */
  fases: readonly string[];
  rotaQuiz: string | null;
  rotaProximoModulo: string | null;
  rotaTrilha: string;
}) {
  const { chaves } = useProgresso();
  const pendente = fases.find((slug) => !estaConcluida(chaves, trilhaSlug, slug));

  let acao = null;
  if (pendente !== undefined) {
    acao = rotaQuiz ? (
      <LinkDeAcao href={rotaQuiz}>Fazer o quiz</LinkDeAcao>
    ) : (
      <LinkDeAcao href={rotaDoExercicio(trilhaSlug, pendente)}>Praticar</LinkDeAcao>
    );
  } else if (rotaProximoModulo) {
    acao = <LinkDeAcao href={rotaProximoModulo}>Próximo módulo</LinkDeAcao>;
  } else {
    acao = (
      <LinkDeAcao href={rotaTrilha} variante="secundario">
        Voltar para a trilha
      </LinkDeAcao>
    );
  }

  return (
    <section
      aria-label="Próximo passo"
      className="mt-6 flex flex-col gap-5 border-2 border-brand-shadow bg-panel-deep px-6 py-8 sm:px-8"
    >
      <p className="m-0 font-display text-[12px] leading-[1.8] tracking-[1px] text-ink">
        {pendente !== undefined ? "Leu tudo? Hora de praticar." : "Módulo concluído."}
      </p>
      <div className="flex flex-wrap items-center gap-4">{acao}</div>
    </section>
  );
}
