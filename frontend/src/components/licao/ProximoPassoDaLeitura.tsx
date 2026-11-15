import { LinkDeAcao } from "@/components/licao/LinkDeAcao";

/**
 * Saídas do fim da leitura. Só o primeiro módulo de cada trilha tem quiz: nos
 * outros, sem o "Praticar" o aluno pulava os exercícios do módulo e, no último
 * (sem próximo módulo), ficava sem nenhum botão.
 */
export function ProximoPassoDaLeitura({
  rotaQuiz,
  rotaPratica,
  rotaProximoModulo,
  rotaTrilha,
}: {
  rotaQuiz: string | null;
  rotaPratica: string | null;
  rotaProximoModulo: string | null;
  rotaTrilha: string;
}) {
  return (
    <section
      aria-label="Próximo passo"
      className="mt-6 flex flex-col gap-5 border-2 border-brand-shadow bg-panel-deep px-6 py-8 sm:px-8"
    >
      <p className="m-0 font-display text-[12px] leading-[1.8] tracking-[1px] text-ink">
        Leu tudo? Hora de praticar.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {rotaQuiz ? (
          <LinkDeAcao href={rotaQuiz}>Fazer o quiz</LinkDeAcao>
        ) : rotaPratica ? (
          <LinkDeAcao href={rotaPratica}>Praticar</LinkDeAcao>
        ) : null}
        {rotaProximoModulo ? (
          <LinkDeAcao href={rotaProximoModulo} variante="secundario">
            Próximo módulo
          </LinkDeAcao>
        ) : null}
        {!rotaQuiz && !rotaPratica && !rotaProximoModulo ? (
          <LinkDeAcao href={rotaTrilha} variante="secundario">
            Voltar para a trilha
          </LinkDeAcao>
        ) : null}
      </div>
    </section>
  );
}
