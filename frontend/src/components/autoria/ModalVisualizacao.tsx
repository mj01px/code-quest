"use client";

import { useEffect, useId, useRef, useState } from "react";

import { PreviaMarkdown } from "@/components/autoria/PreviaMarkdown";
import { PainelDeCodigo } from "@/components/exercicio/PainelDeCodigo";
import { BaralhoFlashcards } from "@/components/trilhas/CartaoFlashcard";
import { QuizQuestao } from "@/components/trilhas/QuizQuestao";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type {
  Aula,
  DetalheEditorial,
  ExercicioEditorial,
  ExercicioResumo,
  ItemEditorial,
} from "@/lib/types";

const BOTAO =
  "cursor-pointer border-2 border-brand-light bg-brand-deep px-4 py-2 font-label text-[11px] tracking-[2px] text-ink uppercase transition duration-150 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60";

const TEXTO = `m-0 whitespace-pre-wrap text-ink-body ${TIPO.corpo}`;

interface Props {
  item: ItemEditorial;
  rotulo: string;
  acoes: { rotulo: string }[];
  ocupado: boolean;
  erro: string | null;
  onAgir: (indice: number) => void;
  onFechar: () => void;
}

// Mesma estrutura do ModalConfirmacao dos clãs: foco no painel ao abrir, Esc e
// clique fora fecham, exceto com ação em voo.
export function ModalVisualizacao({
  item,
  rotulo,
  acoes,
  ocupado,
  erro,
  onAgir,
  onFechar,
}: Props) {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const [detalhe, setDetalhe] = useState<DetalheEditorial | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  useEffect(() => {
    // Devolve o foco ao título que abriu o modal, para o teclado não se perder.
    const origem = document.activeElement as HTMLElement | null;
    painel.current?.focus();
    return () => origem?.focus();
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !ocupado) onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [ocupado, onFechar]);

  useEffect(() => {
    let ativo = true;
    api
      .detalheEditorial(item.tipo, item.id)
      .then((d) => {
        if (ativo) setDetalhe(d);
      })
      .catch((e: unknown) => {
        if (ativo) {
          setErroCarga(
            e instanceof ErroApi ? e.message : "Não foi possível abrir o conteúdo.",
          );
        }
      });
    return () => {
      ativo = false;
    };
  }, [item.tipo, item.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4"
      onClick={() => {
        if (!ocupado) onFechar();
      }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        onClick={(evento) => evento.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-[720px] flex-col gap-6 overflow-y-auto border-[3px] border-brand bg-panel p-7 shadow-frame outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className={`text-brand-light ${TIPO.sobretitulo}`}>
              {rotulo}
            </span>
            <h2 id={tituloId} className={`m-0 text-ink ${TIPO.tituloSecao}`}>
              {item.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={ocupado}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-edge-soft text-ink-muted hover:text-ink-soft disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="square"
              aria-hidden="true"
            >
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        {erroCarga ? (
          <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
            {erroCarga}
          </p>
        ) : detalhe === null ? (
          <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>
            &gt; CARREGANDO...
          </p>
        ) : (
          <Corpo detalhe={detalhe} />
        )}

        {erro ? (
          <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
            {erro}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          {acoes.map((acao, indice) => (
            <button
              key={acao.rotulo}
              type="button"
              disabled={ocupado || detalhe === null}
              onClick={() => onAgir(indice)}
              className={BOTAO}
            >
              {acao.rotulo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// O texto vem do banco e entra como texto do JSX, nunca como HTML. Markdown da
// aula aparece cru: ponytail: sem renderizador, adicionar quando a revisão
// precisar ver a formatação final.
function Corpo({ detalhe }: { detalhe: DetalheEditorial }) {
  if ("enunciado" in detalhe) {
    return (
      <div className="flex flex-col gap-4">
        <span className={`text-ink-muted ${TIPO.etiqueta}`}>
          {`${detalhe.trilha_nome} / ${detalhe.aula_titulo} · ${detalhe.dificuldade_label}`.toUpperCase()}
        </span>
        <ExercicioPrevia detalhe={detalhe} />
      </div>
    );
  }

  if ("conteudo" in detalhe) {
    return (
      <div className="flex flex-col gap-4">
        <p className={TEXTO}>{detalhe.conteudo}</p>
        <ExerciciosDaAula aula={detalhe} />
        <BaralhoFlashcards cards={detalhe.flashcards} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {[detalhe.descricao, detalhe.resumo, detalhe.sobre]
        .filter(Boolean)
        .map((texto, i) => (
          <p key={i} className={TEXTO}>
            {texto}
          </p>
        ))}
      {detalhe.aulas.map((aula, i) => (
        <AulaNaTrilha key={aula.id} numero={i + 1} aula={aula} />
      ))}
    </div>
  );
}

// A trilha inteira como o revisor a lê: cada aula com texto, cards e exercícios.
function AulaNaTrilha({ numero, aula }: { numero: number; aula: Aula }) {
  return (
    <section
      aria-label={`Aula ${numero}: ${aula.titulo}`}
      className="flex flex-col gap-4 border-2 border-edge-soft border-l-4 border-l-brand bg-panel-deep p-4"
    >
      <h3 className={`m-0 text-brand-light ${TIPO.etiqueta}`}>
        {`AULA ${numero}: ${aula.titulo}`.toUpperCase()}
      </h3>
      <PreviaMarkdown markdown={aula.conteudo} />
      <BaralhoFlashcards cards={aula.flashcards} />
      <ExerciciosDaAula aula={aula} />
    </section>
  );
}

// Os exercícios como o aluno os vê: a questão já responde ao clique, e o de
// código abre o editor e executa contra os casos visíveis.
function ExerciciosDaAula({ aula }: { aula: Aula }) {
  if (aula.exercicios.length === 0 && aula.questoes.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <span className={`text-brand-light ${TIPO.etiqueta}`}>EXERCÍCIOS</span>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {aula.exercicios.map((ex) => (
          <ExercicioNaPrevia key={`ex-${ex.id}`} exercicio={ex} />
        ))}
        {aula.questoes.map((q) => (
          <li key={`q-${q.id}`}>
            <QuizQuestao questao={q} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// A lista da aula só traz o resumo: o detalhe vem ao abrir. Fechado por padrão
// para não subir um editor por exercício nem gastar o balde `editorial`.
function ExercicioNaPrevia({ exercicio }: { exercicio: ExercicioResumo }) {
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<ExercicioEditorial | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || detalhe !== null) return;
    let ativo = true;
    api
      .detalheEditorial("exercicios", exercicio.id)
      .then((d) => {
        if (ativo && "enunciado" in d) setDetalhe(d);
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível abrir o exercício.");
      });
    return () => {
      ativo = false;
    };
  }, [aberto, detalhe, exercicio.id]);

  return (
    <li className="flex flex-col gap-4 border-2 border-edge bg-panel-deep p-4">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => {
          setAberto((a) => !a);
          setErro(null);
        }}
        className="flex min-h-11 w-full cursor-pointer items-center gap-3 text-left text-ink-body transition-colors duration-150 hover:text-ink"
      >
        <span className={`text-brand-light ${TIPO.etiqueta}`}>
          {exercicio.tipo === "CODIGO" ? "CÓDIGO" : "TEÓRICO"}
        </span>
        <span className={`min-w-0 flex-1 ${TIPO.corpo}`}>{exercicio.titulo}</span>
        <span aria-hidden="true" className={`text-brand-light ${TIPO.etiqueta}`}>
          {aberto ? "FECHAR" : "ABRIR"}
        </span>
      </button>
      {!aberto ? null : erro ? (
        <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
          {erro}
        </p>
      ) : detalhe === null ? (
        <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; CARREGANDO...</p>
      ) : (
        <ExercicioPrevia detalhe={detalhe} />
      )}
    </li>
  );
}

// Teórico é só o enunciado; o de código traz o mesmo painel do aluno, sem ENVIAR.
function ExercicioPrevia({ detalhe }: { detalhe: ExercicioEditorial }) {
  return (
    <div className="flex flex-col gap-4">
      <p className={TEXTO}>{detalhe.enunciado}</p>
      {detalhe.especificacao ? (
        <PainelDeCodigo
          trilhaSlug={detalhe.trilha_slug}
          exercicioSlug={detalhe.slug}
          especificacao={detalhe.especificacao}
          previa
        />
      ) : null}
    </div>
  );
}
