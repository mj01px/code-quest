import { diaEmSaoPaulo } from "@/lib/desafios";
import { TIPO } from "@/lib/tipografia";
import type { ExercicioConcluido, Sequencia } from "@/lib/types";

const DIAS_NA_GRADE = 14;
const DIAS_DO_XP = 30;
const UM_DIA = 86_400_000;

/** Chaves AAAA-MM-DD dos últimos `quantos` dias em São Paulo, do mais antigo a hoje. */
function ultimosDias(agora: Date, quantos: number): string[] {
  // ponytail: passo fixo de 24h, certo enquanto São Paulo não tiver horário de verão.
  return Array.from({ length: quantos }, (_, indice) =>
    diaEmSaoPaulo(new Date(agora.getTime() - (quantos - 1 - indice) * UM_DIA)),
  );
}

function dias(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? "dia" : "dias"}`;
}

function motivacao(sequencia: Sequencia): string {
  if (sequencia.feito_hoje) return "Sequência garantida hoje. Volte amanhã para manter o ritmo.";
  if (sequencia.atual > 0) {
    return `Conclua uma fase hoje para chegar a ${dias(sequencia.atual + 1)} seguidos.`;
  }
  return "Conclua uma fase hoje para começar sua sequência.";
}

// Os números vêm da Sequencia do backend; a grade e o XP saem das conclusões já
// carregadas no Context, no mesmo fuso do dia do desafio. Conclusão de fase
// apagada some da lista, então a grade pode ter um dia a menos que a sequência.
export function SecaoStreak({
  sequencia,
  concluidos,
  agora = new Date(),
}: {
  sequencia: Sequencia;
  concluidos: readonly ExercicioConcluido[];
  agora?: Date;
}) {
  const porDia = concluidos.map((conclusao) => ({
    dia: diaEmSaoPaulo(new Date(conclusao.criado_em)),
    xp: conclusao.xp,
  }));
  const diasFeitos = new Set(porDia.map((conclusao) => conclusao.dia));

  const grade = ultimosDias(agora, DIAS_NA_GRADE);
  const hoje = grade.at(-1);
  const feitosNaGrade = grade.filter((dia) => diasFeitos.has(dia)).length;

  const janelaDoXp = new Set(ultimosDias(agora, DIAS_DO_XP));
  const xpRecente = porDia
    .filter((conclusao) => janelaDoXp.has(conclusao.dia))
    .reduce((soma, conclusao) => soma + conclusao.xp, 0);

  const numeros = [
    { rotulo: "STREAK ATUAL", valor: dias(sequencia.atual) },
    { rotulo: "RECORDE", valor: dias(sequencia.recorde) },
    { rotulo: `XP EM ${DIAS_DO_XP} DIAS`, valor: String(xpRecente) },
  ];

  return (
    <section aria-labelledby="sua-sequencia" className="mt-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="sua-sequencia" className={`m-0 ${TIPO.tituloSecao} text-ink`}>
          Sua sequência
        </h2>
        <p className="m-0 flex items-baseline gap-2 border-2 border-brand-shadow bg-panel-deep px-4 py-2">
          <span className="font-display text-[18px] leading-[1.5] text-brand-light">
            {sequencia.atual}
          </span>
          <span className={`${TIPO.etiqueta} text-ink-muted`}>
            {sequencia.atual === 1 ? "DIA SEGUIDO" : "DIAS SEGUIDOS"}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-6 border-2 border-edge bg-panel p-6 shadow-pixel sm:p-8">
        <div
          role="img"
          aria-label={`Últimos ${DIAS_NA_GRADE} dias: ${feitosNaGrade} com fase concluída`}
          className="flex flex-wrap gap-1"
        >
          {grade.map((dia) => {
            const estado = diasFeitos.has(dia) ? "feito" : dia === hoje ? "hoje" : "vazio";
            return (
              <span
                key={dia}
                data-dia={dia}
                data-estado={estado}
                className={`h-8 w-8 border-2 ${
                  estado === "feito"
                    ? "border-brand bg-brand-strong"
                    : estado === "hoje"
                      ? "border-brand-light"
                      : "border-edge-soft"
                }`}
              />
            );
          })}
        </div>

        <p className={`m-0 ${TIPO.corpo} text-ink-body text-pretty`}>{motivacao(sequencia)}</p>

        <dl className="m-0 grid grid-cols-1 gap-px border-2 border-edge bg-edge sm:grid-cols-3">
          {numeros.map((numero) => (
            <div key={numero.rotulo} className="flex flex-col gap-2 bg-panel-deep p-5">
              <dt className={`${TIPO.etiqueta} text-ink-muted`}>{numero.rotulo}</dt>
              <dd className="m-0 font-display text-[15px] leading-[1.6] text-ink">
                {numero.valor}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
