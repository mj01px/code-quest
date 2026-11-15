"use client";

import { useEffect, useId, useRef, useState } from "react";

import { PainelDeCodigo } from "@/components/exercicio/PainelDeCodigo";
import { ConteudoDaLicao } from "@/components/licao/ConteudoDaLicao";
import { BaralhoFlashcards } from "@/components/trilhas/CartaoFlashcard";
import { QuizQuestao } from "@/components/trilhas/QuizQuestao";
import { useModal } from "@/components/ui/useModal";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type {
  Aula,
  CampoAlterado,
  DetalheEditorial,
  DiffEditorial,
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
  const [diff, setDiff] = useState<DiffEditorial | null>(null);
  const [erroDiff, setErroDiff] = useState(false);

  // Quem revisa só age depois de ver o que mudou: o diff carrega junto.
  const carregando = detalhe === null || (diff === null && !erroDiff);

  useModal(painel, onFechar, ocupado);

  // À parte do detalhe: se o diff falhar, o conteúdo ainda abre, com o aviso.
  // ponytail: são duas leituras do balde `editorial` (30/min) por abertura;
  // juntar o diff ao detalhe se o revisor esbarrar no limite.
  useEffect(() => {
    let ativo = true;
    api
      .diffEditorial(item.tipo, item.id)
      .then((d) => {
        if (ativo) setDiff(d);
      })
      .catch(() => {
        if (ativo) setErroDiff(true);
      });
    return () => {
      ativo = false;
    };
  }, [item.tipo, item.id]);

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

        {erroDiff ? (
          <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
            Não foi possível carregar as alterações desta edição.
          </p>
        ) : null}

        {erroCarga ? (
          <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
            {erroCarga}
          </p>
        ) : carregando || detalhe === null ? (
          <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>
            &gt; CARREGANDO...
          </p>
        ) : (
          <>
            {diff ? <DiffDaEdicao diff={diff} /> : null}
            <Corpo detalhe={detalhe} />
          </>
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
              disabled={ocupado || carregando}
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

const ROTULO_CAMPO: Record<string, string> = {
  nome: "NOME",
  descricao: "DESCRIÇÃO",
  dificuldade: "NÍVEL",
  criatura_bonus: "BÔNUS DE CRIATURA",
  titulo: "TÍTULO",
  conteudo: "TEXTO DA AULA",
  enunciado: "ENUNCIADO",
  funcao: "FUNÇÃO",
  testes: "CASOS DE TESTE",
};

// O que mudou desde a versão aprovada, calculado no backend (difflib). Some
// quando não há edição pendente. Com filhos, um bloco por aula ou exercício
// editado: na fila a trilha aparece no lugar deles.
function DiffDaEdicao({ diff }: { diff: DiffEditorial }) {
  const blocos = [
    { chave: "proprio", titulo: null, campos: diff.campos },
    ...diff.filhos.map((f) => ({
      // O título não é único (só o slug é): a chave vem do tipo e do id.
      chave: `${f.tipo}-${f.id}`,
      titulo: `${f.tipo === "aulas" ? "AULA" : "EXERCÍCIO"}: ${f.titulo}`,
      campos: f.campos,
    })),
  ].filter((bloco) => bloco.campos.length > 0);
  if (blocos.length === 0) return null;

  return (
    <section
      aria-label="Alterações desde a versão aprovada"
      className="flex flex-col gap-4 border-2 border-warning bg-panel-deep p-4"
    >
      <h3 className={`m-0 text-warning ${TIPO.etiqueta}`}>
        ALTERAÇÕES DESDE A VERSÃO APROVADA
      </h3>
      <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
        Linhas com + entraram nesta edição; linhas com - riscadas saíram.
      </p>
      {blocos.map((bloco) => (
        <div key={bloco.chave} className="flex flex-col gap-3">
          {bloco.titulo ? (
            <h4 className={`m-0 text-brand-light ${TIPO.etiqueta}`}>{bloco.titulo.toUpperCase()}</h4>
          ) : null}
          {bloco.campos.map((campo) => (
            <CampoDoDiff key={campo.campo} campo={campo} />
          ))}
        </div>
      ))}
    </section>
  );
}

// `ins` e `del` dizem ao leitor de tela o que entrou e o que saiu; o sinal na
// frente e o riscado valem para quem não distingue verde de vermelho.
function CampoDoDiff({ campo }: { campo: CampoAlterado }) {
  const rotulo = ROTULO_CAMPO[campo.campo] ?? campo.campo.toUpperCase();
  return (
    <div className="flex flex-col gap-2">
      <span className={`text-ink-soft ${TIPO.etiqueta}`}>{rotulo}</span>
      <div
        role="group"
        tabIndex={0}
        aria-label={`Alterações em ${rotulo}`}
        className="max-h-72 overflow-y-auto border-2 border-edge bg-panel py-1 font-terminal text-sm leading-[1.6]"
      >
        {campo.linhas.map((linha, i) =>
          linha.tipo === "adicionado" ? (
            <ins key={i} className="block bg-success/15 px-3 whitespace-pre-wrap text-success no-underline">
              <span className="sr-only">Adicionado: </span>+ {linha.texto}
            </ins>
          ) : linha.tipo === "removido" ? (
            <del key={i} className="block bg-danger/15 px-3 whitespace-pre-wrap text-danger line-through">
              <span className="sr-only">Removido: </span>- {linha.texto}
            </del>
          ) : (
            // Linha em branco do Markdown: o espaço duro segura a altura.
            <span key={i} className="block px-3 whitespace-pre-wrap text-ink-muted">
              {linha.texto || "\u00a0"}
            </span>
          ),
        )}
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
        <QuizDaAula aula={detalhe} />
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

// A trilha inteira como o revisor a lê, na sequência do aluno: texto, quiz e
// exercícios; os cards por último, porque o aluno os revisa fora da sequência.
function AulaNaTrilha({ numero, aula }: { numero: number; aula: Aula }) {
  return (
    <section
      aria-label={`Aula ${numero}: ${aula.titulo}`}
      className="flex flex-col gap-4 border-2 border-edge-soft border-l-4 border-l-brand bg-panel-deep p-4"
    >
      <h3 className={`m-0 text-brand-light ${TIPO.etiqueta}`}>
        {`AULA ${numero}: ${aula.titulo}`.toUpperCase()}
      </h3>
      <ConteudoDaLicao markdown={aula.conteudo} tamanho="medio" embutido />
      <QuizDaAula aula={aula} />
      <ExerciciosDaAula aula={aula} />
      <BaralhoFlashcards cards={aula.flashcards} />
    </section>
  );
}

// O quiz de fixação vem logo depois da leitura: a questão já responde ao clique.
function QuizDaAula({ aula }: { aula: Aula }) {
  if (aula.questoes.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <span className={`text-brand-light ${TIPO.etiqueta}`}>QUIZ DE FIXAÇÃO</span>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {aula.questoes.map((q) => (
          <li key={`q-${q.id}`}>
            <QuizQuestao questao={q} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Os exercícios como o aluno os vê: o de código abre o editor e executa
// contra os casos visíveis.
function ExerciciosDaAula({ aula }: { aula: Aula }) {
  if (aula.exercicios.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <span className={`text-brand-light ${TIPO.etiqueta}`}>EXERCÍCIOS</span>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {aula.exercicios.map((ex) => (
          <ExercicioNaPrevia key={`ex-${ex.id}`} exercicio={ex} />
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
