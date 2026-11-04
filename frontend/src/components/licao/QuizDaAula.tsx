"use client";

import { useRef, useState } from "react";

import { BarraDeFoco } from "@/components/layout/BarraDeFoco";
import { TextoInline } from "@/components/licao/ConteudoDaLicao";
import { LinkDeAcao } from "@/components/licao/LinkDeAcao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { api, temSessao } from "@/lib/api";
import type { Alternativa, Questao } from "@/lib/types";

const LETRAS: Alternativa[] = ["A", "B", "C", "D"];

const PRIMARIO =
  "cursor-pointer border-[3px] border-brand-light bg-brand-deep px-6 py-3.5 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] transition duration-150 hover:bg-brand-strong disabled:cursor-not-allowed disabled:border-edge-soft disabled:bg-panel disabled:text-ink-dim disabled:shadow-none";

const SECUNDARIO =
  "cursor-pointer border-2 border-edge-soft bg-transparent px-5 py-3.5 font-label text-[11px] tracking-[2px] text-ink-body uppercase hover:border-brand hover:text-ink-soft";

const MOLDURA =
  "flex w-full flex-col justify-center gap-5 border-[3px] border-brand bg-panel p-6 shadow-[0_0_0_3px_var(--color-brand-void),0_0_0_6px_rgba(168,85,247,0.18),8px_8px_0_rgba(0,0,0,0.7)] sm:p-10";

type Registro = "enviando" | "registrado" | "falhou" | null;

function mensagemDoResultado(acertos: number, total: number): string {
  if (acertos === total) return "Gabaritou. Você está pronto para os exercícios.";
  if (acertos === 0) {
    return "Nenhuma de primeira, e tudo bem. Releia a lição com calma e tente de novo.";
  }
  const erros = total - acertos;
  return `Você acertou ${acertos === 1 ? "1 pergunta" : `${acertos} perguntas`}. Releia ${
    erros === 1 ? "a seção da que errou" : `as seções das ${erros} que errou`
  } antes de seguir.`;
}

export function QuizDaAula({
  trilhaSlug,
  aulaSlug,
  aulaTitulo,
  questoes,
  rotaDaLicao,
  rotaDosExercicios,
}: {
  trilhaSlug: string;
  aulaSlug: string;
  aulaTitulo: string;
  questoes: Questao[];
  rotaDaLicao: string;
  rotaDosExercicios: string | null;
}) {
  const { recarregar } = useProgresso();
  const respostas = useRef<Record<number, Alternativa>>({});
  const [registro, setRegistro] = useState<Registro>(null);
  const [indice, setIndice] = useState(0);
  const [escolhida, setEscolhida] = useState<Alternativa | null>(null);
  const [confirmada, setConfirmada] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [terminou, setTerminou] = useState(false);

  const total = questoes.length;
  const questao = questoes[indice];
  const respondidas = indice + (confirmada || terminou ? 1 : 0);

  function confirmar() {
    if (escolhida === null) return;
    setConfirmada(true);
    respostas.current[questao.id] = escolhida;
    if (escolhida === questao.resposta_correta) setAcertos((n) => n + 1);
  }

  function avancar() {
    if (indice + 1 >= total) {
      setTerminou(true);
      registrar();
      return;
    }
    setIndice(indice + 1);
    setEscolhida(null);
    setConfirmada(false);
  }

  function registrar() {
    if (!temSessao()) return;
    setRegistro("enviando");
    api
      .concluirQuiz(trilhaSlug, aulaSlug, { ...respostas.current })
      .then(() => {
        setRegistro("registrado");
        recarregar();
      })
      .catch(() => setRegistro("falhou"));
  }

  function refazer() {
    respostas.current = {};
    setRegistro(null);
    setIndice(0);
    setEscolhida(null);
    setConfirmada(false);
    setAcertos(0);
    setTerminou(false);
  }

  const acertou = confirmada && escolhida === questao?.resposta_correta;

  function estilo(letra: Alternativa): string {
    if (!confirmada) {
      return escolhida === letra
        ? "border-brand-light bg-panel-soft"
        : "cursor-pointer border-edge bg-panel hover:border-brand hover:bg-panel-soft";
    }
    if (letra === questao.resposta_correta) return "border-success bg-panel-soft";
    if (letra === escolhida) return "border-danger bg-panel-soft";
    return "border-edge bg-panel opacity-60";
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraDeFoco
        sairHref={rotaDaLicao}
        placar={
          <span className="font-label text-[10px] tracking-[2px] text-brand-light uppercase sm:text-[11px]">
            {acertos} / {total} acertos
          </span>
        }
      />

      <main className="flex flex-1 justify-center px-4 py-10 sm:px-8 sm:py-14">
        <div className="flex w-full max-w-3xl flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h1 className="m-0 font-display text-[14px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[16px]">
              Quiz
            </h1>
            <div className="flex w-full gap-[3px]" aria-hidden="true">
              {questoes.map((q, i) => (
                <span
                  key={q.id}
                  className={`h-2.5 max-w-12 flex-1 border border-edge-soft ${
                    i < respondidas
                      ? "bg-brand"
                      : i === indice && !terminou
                        ? "bg-brand-shadow"
                        : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 font-label text-[11px] tracking-[2px] uppercase">
              <span className="text-brand-light">
                {terminou ? "Quiz concluído" : `Pergunta ${indice + 1} de ${total}`}
              </span>
              <span className="text-ink-muted">Módulo: {aulaTitulo}</span>
            </div>

            {terminou ? (
              <section aria-label="Resultado" className={`${MOLDURA} min-h-[18rem]`}>
                <span className="flex items-center gap-3 font-label text-[12px] tracking-[3px] text-brand-light">
                  <span aria-hidden="true" className="h-3 w-3 bg-brand" />
                  RESULTADO
                </span>
                <p
                  role="status"
                  className="m-0 font-display text-[16px] leading-[1.8] tracking-[1px] text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-[20px]"
                >
                  {acertos} de {total}
                </p>
                <p className="m-0 font-body text-xl leading-[1.7] tracking-[0.5px] text-ink-soft">
                  {mensagemDoResultado(acertos, total)}
                </p>
              </section>
            ) : (
              <>
                <section aria-label={`Pergunta ${indice + 1}`} className={`${MOLDURA} min-h-[10rem]`}>
                  <span className="flex items-center gap-3 font-label text-[12px] tracking-[3px] text-brand-light">
                    <span aria-hidden="true" className="h-3 w-3 bg-brand" />
                    PERGUNTA
                  </span>
                  <p className="m-0 font-body text-xl leading-[1.6] tracking-[0.5px] text-ink">
                    <TextoInline texto={questao.enunciado} />
                  </p>
                </section>

                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {LETRAS.map((letra, i) => (
                    <li key={letra}>
                      <button
                        type="button"
                        disabled={confirmada}
                        aria-pressed={escolhida === letra}
                        onClick={() => setEscolhida(letra)}
                        className={`flex min-h-14 w-full items-center gap-4 border-2 px-4 py-3 text-left transition-colors duration-150 disabled:cursor-default ${estilo(letra)}`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 font-label text-[12px] ${
                            confirmada && letra === questao.resposta_correta
                              ? "border-success text-success"
                              : confirmada && letra === escolhida
                                ? "border-danger text-danger"
                                : "border-brand-shadow text-brand-light"
                          }`}
                        >
                          {letra}
                        </span>
                        <span className="font-body text-lg tracking-[0.5px] text-ink-body">
                          <TextoInline texto={questao.opcoes[i]} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              {terminou ? (
                <>
                  <span
                    role={registro === "falhou" ? "alert" : undefined}
                    className={`font-label text-[10px] tracking-[2px] uppercase ${
                      registro === "falhou"
                        ? "text-danger"
                        : registro === "registrado"
                          ? "text-success"
                          : "text-ink-dim"
                    }`}
                  >
                    {registro === "registrado"
                      ? "Quiz registrado no seu progresso"
                      : registro === "falhou"
                        ? "Não foi possível registrar. Refaça para tentar de novo."
                        : registro === "enviando"
                          ? "Registrando..."
                          : ""}
                  </span>
                  <div className="flex flex-wrap gap-3">
                    <LinkDeAcao href={rotaDaLicao} variante="secundario">
                      Voltar para a lição
                    </LinkDeAcao>
                    <button type="button" onClick={refazer} className={SECUNDARIO}>
                      Refazer quiz
                    </button>
                    {rotaDosExercicios ? (
                      <LinkDeAcao href={rotaDosExercicios}>Ir para os exercícios</LinkDeAcao>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <p
                    role="status"
                    className={`m-0 font-terminal text-xl tracking-[1px] ${
                      !confirmada ? "text-ink-muted" : acertou ? "text-success" : "text-danger"
                    }`}
                  >
                    {!confirmada
                      ? escolhida
                        ? `> alternativa ${escolhida} selecionada`
                        : "> escolha uma alternativa"
                      : acertou
                        ? "> correto!"
                        : `> errado. a certa é ${questao.resposta_correta}.`}
                  </p>
                  {confirmada ? (
                    <button type="button" onClick={avancar} className={PRIMARIO}>
                      {indice + 1 >= total ? "Ver resultado" : "Próxima"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={confirmar}
                      disabled={escolhida === null}
                      className={PRIMARIO}
                    >
                      Confirmar
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
