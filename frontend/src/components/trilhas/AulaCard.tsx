import Link from "next/link";

import { Badge, BadgeDificuldade } from "@/components/ui/Badge";
import { IconeCadeado, IconeCheck } from "@/components/ui/Icone";
import { chaveDoPasso } from "@/lib/passos";
import { plural, resumoDoModulo, xpDoModulo } from "@/lib/derivados";
import { minutosDeLeitura } from "@/lib/licao";
import type { Aula, EstadoDoPasso } from "@/lib/types";
import type { ReactNode } from "react";

const VAZIO: ReadonlySet<string> = Object.freeze(new Set<string>());

const LINHA = "group flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6";

function LinkOuTrava({
  href,
  bloqueado,
  children,
}: {
  href: string;
  bloqueado: boolean;
  children: ReactNode;
}) {
  if (bloqueado) {
    return (
      <div
        aria-disabled="true"
        title="Conclua a etapa anterior para liberar"
        className={`${LINHA} cursor-not-allowed opacity-45`}
      >
        <span className="sr-only">Bloqueado: </span>
        {children}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={`${LINHA} cursor-pointer transition-colors hover:bg-panel-soft`}
    >
      {children}
    </Link>
  );
}

function CabecalhoDaParte({
  numero,
  titulo,
}: {
  numero: number;
  titulo: string;
}) {
  return (
    <p className="m-0 flex items-center gap-3 border-t-2 border-edge bg-panel-deep px-5 py-2.5 font-label text-[10px] tracking-[2px] text-brand-light uppercase first:border-t-0 sm:px-6">
      <span aria-hidden="true" className="h-2 w-2 bg-brand" />
      Parte {numero} · {titulo}
    </p>
  );
}

function LinhaDidatica({
  href,
  marca,
  titulo,
  selo,
  feita = false,
  bloqueado = false,
}: {
  href: string;
  marca: string;
  titulo: string;
  selo: string;
  feita?: boolean;
  bloqueado?: boolean;
}) {
  return (
    <li>
      <LinkOuTrava href={href} bloqueado={bloqueado}>
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 bg-panel-deep font-display text-[8px] ${
            feita
              ? "border-success text-success"
              : "border-brand-shadow text-brand-light group-hover:border-brand"
          }`}
        >
          {feita ? (
            <IconeCheck className="h-3.5 w-3.5" />
          ) : bloqueado ? (
            <IconeCadeado className="h-3.5 w-3.5" />
          ) : (
            marca
          )}
        </span>
        <span className="min-w-0 flex-1 font-body text-base tracking-[1px] text-ink">
          {feita ? <span className="sr-only">Concluído: </span> : null}
          {titulo}
        </span>
        <Badge>{selo}</Badge>
      </LinkOuTrava>
    </li>
  );
}

export function AulaCard({
  aula,
  trilhaSlug,
  posicao,
  // A API devolve o pré-requisito como slug; a lista traduz para o título.
  preRequisitoTitulo,
  // Slugs das fases deste módulo que o aluno já concluiu. Vem vazio no render
  // do servidor e no de quem não tem sessão: o card só ganha a marca depois.
  fasesConcluidas = VAZIO,
  leituraFeita = false,
  quizFeito = false,
  estadoDe = () => "liberado",
}: {
  aula: Aula;
  trilhaSlug: string;
  posicao: number;
  preRequisitoTitulo?: string;
  fasesConcluidas?: ReadonlySet<string>;
  leituraFeita?: boolean;
  quizFeito?: boolean;
  estadoDe?: (chave: string) => EstadoDoPasso;
}) {
  const numero = String(posicao).padStart(2, "0");
  const resumo = resumoDoModulo(aula);
  const temFases = aula.exercicios.length > 0;
  // O catálogo vem do cache do Next (60s): um payload gravado antes do campo
  // existir chega sem ele, e a página inteira cairia no error boundary.
  const questoes = aula.questoes ?? [];
  const temLicao = (aula.conteudo ?? "").trim() !== "";
  const temQuiz = questoes.length > 0;
  const totalDoModulo =
    aula.exercicios.length + (temLicao ? 1 : 0) + (temQuiz ? 1 : 0);
  const feitas =
    aula.exercicios.filter((e) => fasesConcluidas.has(e.slug)).length +
    (temLicao && leituraFeita ? 1 : 0) +
    (temQuiz && quizFeito ? 1 : 0);
  const moduloCompleto = totalDoModulo > 0 && feitas === totalDoModulo;
  const rotaDaLicao = `/trilhas/${trilhaSlug}/aulas/${aula.slug}`;

  const cabecalho = (
    <>
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[12px] text-brand-light"
      >
        {numero}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-label text-[12px] tracking-[2px] text-ink uppercase">
          <span className="sr-only">Módulo {posicao}: </span>
          {aula.titulo}
        </span>
        <span className="mt-1.5 block truncate font-body text-base tracking-[1px] text-ink-muted">
          {resumo ? `${resumo} · ` : ""}
          {plural(aula.exercicios.length, "fase", "fases")}
          {aula.pre_requisito
            ? ` · requer ${preRequisitoTitulo ?? aula.pre_requisito}`
            : ""}
        </span>
      </span>

      {temFases || temLicao ? (
        <span className="shrink-0 font-label text-[11px] tracking-[2px] text-brand-light uppercase">
          {feitas > 0 ? (
            <span
              className={moduloCompleto ? "text-success" : "text-ink-muted"}
            >
              {feitas}/{totalDoModulo} ·{" "}
            </span>
          ) : null}
          {temFases ? `+${xpDoModulo(aula)} XP` : "Lição"}
        </span>
      ) : (
        <span className="shrink-0 font-label text-[11px] tracking-[2px] text-ink-dim uppercase">
          Em breve
        </span>
      )}
    </>
  );

  if (!temFases && !temLicao && questoes.length === 0) {
    return (
      <li className="flex items-center gap-5 border-2 border-edge bg-panel p-5 sm:px-6">
        {cabecalho}
      </li>
    );
  }

  return (
    <li className="border-2 border-edge bg-panel transition duration-150 hover:border-brand-shadow">
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-5 p-5 transition-colors hover:bg-panel-soft sm:px-6 [&::-webkit-details-marker]:hidden">
          {cabecalho}
        </summary>

        {temLicao || questoes.length > 0 ? (
          <div className="border-t-2 border-edge">
            <CabecalhoDaParte numero={1} titulo="Aprender" />
            <ul className="m-0 list-none divide-y-2 divide-edge p-0">
              {temLicao ? (
                <LinhaDidatica
                  href={rotaDaLicao}
                  marca="LI"
                  titulo={`Lição: ${aula.titulo}`}
                  selo={`Leitura · ${minutosDeLeitura(aula.conteudo)} min`}
                  feita={leituraFeita}
                  bloqueado={
                    estadoDe(chaveDoPasso("LEITURA", aula.slug)) === "bloqueado"
                  }
                />
              ) : null}
              {questoes.length > 0 ? (
                <LinhaDidatica
                  href={`${rotaDaLicao}/quiz`}
                  marca="QZ"
                  titulo="Quiz de fixação"
                  selo={plural(questoes.length, "pergunta", "perguntas")}
                  feita={quizFeito}
                  bloqueado={
                    estadoDe(chaveDoPasso("QUIZ", aula.slug)) === "bloqueado"
                  }
                />
              ) : null}
            </ul>
          </div>
        ) : null}

        {temFases && (temLicao || questoes.length > 0) ? (
          <CabecalhoDaParte numero={2} titulo="Praticar" />
        ) : null}

        {temFases ? (
          <ul className="m-0 list-none divide-y-2 divide-edge border-t-2 border-edge p-0">
            {aula.exercicios.map((exercicio, posicaoDaFase) => {
              const feita = fasesConcluidas.has(exercicio.slug);
              const bloqueada =
                !feita &&
                estadoDe(
                  chaveDoPasso("EXERCICIO", aula.slug, exercicio.slug),
                ) === "bloqueado";

              return (
                <li key={exercicio.id}>
                  <LinkOuTrava
                    href={`/trilhas/${trilhaSlug}/exercicios/${exercicio.slug}`}
                    bloqueado={bloqueada}
                  >
                    {/* O mesmo quadro numerado do módulo, um tamanho abaixo: é
                        ele que diz que a fase está feita, sem gastar uma coluna
                        só para isso. */}
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 font-display text-[10px] ${
                        feita
                          ? "border-success bg-panel-deep text-success"
                          : "border-edge-soft bg-panel-deep text-ink-muted group-hover:border-brand group-hover:text-brand-light"
                      }`}
                    >
                      {feita ? (
                        <IconeCheck className="h-3.5 w-3.5" />
                      ) : bloqueada ? (
                        <IconeCadeado className="h-3.5 w-3.5" />
                      ) : (
                        String(posicaoDaFase + 1).padStart(2, "0")
                      )}
                    </span>

                    <span className="min-w-0 flex-1 font-body text-base tracking-[1px] text-ink-body">
                      <span className="sr-only">
                        Fase {posicaoDaFase + 1}
                        {feita ? ", concluída" : ""}:{" "}
                      </span>
                      {exercicio.titulo}
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      <BadgeDificuldade
                        dificuldade={exercicio.dificuldade}
                        rotulo={exercicio.dificuldade_label}
                      />
                      <Badge>{exercicio.tipo_label}</Badge>
                    </span>
                  </LinkOuTrava>
                </li>
              );
            })}
          </ul>
        ) : null}
      </details>
    </li>
  );
}
