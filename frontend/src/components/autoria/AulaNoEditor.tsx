"use client";

import { useState } from "react";

import {
  AcoesQuestao,
  CamposQuestao,
  QUESTAO_VAZIA,
  questaoCompleta,
  questaoLimpa,
} from "@/components/autoria/AcoesQuestao";
import { AcoesRascunho } from "@/components/autoria/AcoesRascunho";
import { AreaDeTexto } from "@/components/autoria/AreaDeTexto";
import {
  CASO_VAZIO,
  CamposDeCodigo,
  ERRO_CASO,
  casosIncompletos,
  lerCasos,
  type CasoTexto,
} from "@/components/autoria/CamposDeCodigo";
import { BOTAO_SLOT, EditorDeSecoes } from "@/components/autoria/EditorDeSecoes";
import { GerenciadorFlashcards } from "@/components/autoria/GerenciadorFlashcards";
import { LINHA, MARCA } from "@/components/autoria/ListaEditorial";
import { ConteudoDaLicao } from "@/components/licao/ConteudoDaLicao";
import { CabecalhoDaParte } from "@/components/trilhas/AulaCard";
import { Badge } from "@/components/ui/Badge";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api } from "@/lib/api";
import { plural } from "@/lib/derivados";
import { minutosDeLeitura, rotuloDaSecao, secoesDaLicao } from "@/lib/licao";
import { TIPO } from "@/lib/tipografia";
import type { Flashcard, NovaAula, Questao, TipoExercicio } from "@/lib/types";

// A aula dentro do editor de trilhas: o card do módulo com as três partes e
// os formulários de criação. Mora fora do EditorDeConteudo para ele caber.

export const CARTAO = "flex flex-col gap-6 border-2 border-edge bg-panel p-5 sm:p-6";

export interface ExercicioEditor {
  id: number;
  titulo: string;
  tipo: TipoExercicio;
}

// O que o editor guarda de cada aula: o bastante para listar e para continuar
// adicionando, venha da criação agora ou de uma trilha salva.
export interface AulaEditor {
  id: number;
  titulo: string;
  conteudo: string;
  exercicios: ExercicioEditor[];
  flashcards: Flashcard[];
  questoes: Questao[];
}

export const aulaNova = (a: NovaAula): AulaEditor => ({
  id: a.id,
  titulo: a.titulo,
  conteudo: a.conteudo,
  exercicios: [],
  flashcards: [],
  questoes: [],
});

export function mensagemDe(erro: unknown): string {
  if (!(erro instanceof ErroApi)) return "Não foi possível salvar.";
  // Erro de campo (ex.: "enunciado") é mais útil que o resumo do envelope.
  return Object.values(erro.porCampo())[0] ?? erro.message;
}

export function Erro({ texto }: { texto: string | null }) {
  return texto ? (
    <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
      {texto}
    </p>
  ) : null;
}

const VAZIO =
  "m-0 border-2 border-dashed border-edge-soft px-4 py-3 font-body text-base tracking-[1px] text-ink-muted";

export function FormAula({
  trilha,
  aoCriar,
  aoCancelar,
}: {
  trilha: number;
  aoCriar: (a: NovaAula) => void;
  aoCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [leitura, setLeitura] = useState({ markdown: "", completa: false });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      // Fecha o formulário: o pai o desmonta, então não há o que limpar.
      aoCriar(await api.criarAula({ trilha, titulo: titulo.trim(), conteudo: leitura.markdown }));
    } catch (e) {
      setErro(mensagemDe(e));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className={CARTAO} aria-label="Nova aula">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={`m-0 text-ink ${TIPO.tituloSecao}`}>Nova aula</h3>
        <PixelButton type="button" variante="secundaria" onClick={aoCancelar}>
          CANCELAR
        </PixelButton>
      </div>
      <PixelField
        rotulo="TÍTULO DA AULA"
        value={titulo}
        maxLength={120}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <EditorDeSecoes
        id="aula-nova"
        inicial=""
        aoMudar={(markdown, completa) => setLeitura({ markdown, completa })}
      />
      <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
        Depois de salvar, a aula aparece na lista acima, onde você inclui o quiz,
        os exercícios e os flashcards dela.
      </p>
      <Erro texto={erro} />
      <PixelButton
        type="submit"
        className="self-end"
        disabled={enviando || !titulo.trim() || !leitura.completa}
      >
        {enviando ? "SALVANDO..." : "ADICIONAR AULA"}
      </PixelButton>
    </form>
  );
}

// O texto da aula já salva, no mesmo editor de seções da criação.
function FormLeitura({
  aula,
  conteudo,
  aoSalvar,
  aoCancelar,
}: {
  aula: AulaEditor;
  conteudo: string;
  aoSalvar: (conteudo: string) => void;
  aoCancelar: () => void;
}) {
  const [leitura, setLeitura] = useState({ markdown: conteudo, completa: conteudo.trim() !== "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await api.editarRascunho("aulas", aula.id, { titulo: aula.titulo, conteudo: leitura.markdown });
      aoSalvar(leitura.markdown);
    } catch (e) {
      setErro(mensagemDe(e));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} aria-label="Editar leitura" className="flex flex-col gap-5">
      <EditorDeSecoes
        id={`leitura-${aula.id}`}
        inicial={conteudo}
        aoMudar={(markdown, completa) => setLeitura({ markdown, completa })}
      />
      <Erro texto={erro} />
      <div className="flex flex-wrap justify-end gap-3">
        <PixelButton type="button" variante="secundaria" onClick={aoCancelar}>
          CANCELAR
        </PixelButton>
        <PixelButton type="submit" variante="secundaria" disabled={enviando || !leitura.completa}>
          {enviando ? "SALVANDO..." : "SALVAR LEITURA"}
        </PixelButton>
      </div>
    </form>
  );
}

// Uma parte da aula: o cabeçalho "Parte N · ..." do AulaCard e o conteúdo dela.
function ParteDaAula({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <CabecalhoDaParte numero={numero} titulo={titulo} />
      <div className="flex flex-col gap-6 border-t-2 border-edge px-5 py-5 sm:px-6">{children}</div>
    </div>
  );
}

// Um bloco dentro da parte (leitura, quiz), com o rótulo e a ação dele.
function Bloco({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <h4 className={`m-0 text-ink-soft ${TIPO.etiqueta}`}>{titulo}</h4>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function ItemAula({
  numero,
  aula,
  editavel,
  podeExercicio,
  aberta,
}: {
  numero: number;
  aula: AulaEditor;
  /** Lápis e lixeira nos exercícios: só com a trilha em rascunho, como no backend. */
  editavel: boolean;
  /** Sem `trilhas.create_exercicio`, os botões de adicionar somem. */
  podeExercicio: boolean;
  /** Card aberto ao montar: a aula em que o autor está trabalhando. */
  aberta: boolean;
}) {
  const [conteudo, setConteudo] = useState(aula.conteudo);
  const [editandoLeitura, setEditandoLeitura] = useState(false);
  const [exercicios, setExercicios] = useState(aula.exercicios);
  const [questoes, setQuestoes] = useState(aula.questoes);
  // Editar ou excluir mexe no título ou some com a linha: relê a aula em vez de
  // remendar a lista aqui.
  async function recarregar() {
    const lida = await api.detalheEditorial("aulas", aula.id);
    if (!("conteudo" in lida)) return;
    setExercicios(lida.exercicios);
    setQuestoes(lida.questoes);
  }
  // Formulário aberto; null mostra os botões de adicionar das partes.
  const [novo, setNovo] = useState<TipoNovo | null>(null);
  // "+ ADICIONAR EXERCÍCIO" abre a escolha do tipo antes do formulário.
  const [escolhendo, setEscolhendo] = useState(false);
  const adicionando = podeExercicio && novo === null;

  const indice = secoesDaLicao(conteudo);
  const resumo = [
    plural(indice.length, "seção", "seções"),
    plural(questoes.length, "questão", "questões"),
    plural(exercicios.length, "exercício", "exercícios"),
  ].join(" · ");

  const formulario =
    novo === null ? null : (
      <FormExercicio
        tipo={novo}
        aula={aula.id}
        aoCancelar={() => setNovo(null)}
        aoCriarExercicio={(ex) => {
          setExercicios((atual) => [...atual, ex]);
          setNovo(null);
        }}
        aoCriarQuestao={(q) => {
          setQuestoes((atual) => [...atual, q]);
          setNovo(null);
        }}
      />
    );

  return (
    <li className="border-2 border-edge bg-panel transition duration-150 hover:border-brand-shadow">
      <details open={aberta} className="group">
        {/* Cabeçalho do AulaCard: quadro numerado, título e o selo à direita. */}
        <summary className="flex cursor-pointer list-none items-center gap-5 p-5 transition-colors hover:bg-panel-soft sm:px-6 [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[12px] text-brand-light"
          >
            {String(numero).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-label text-[12px] tracking-[2px] text-ink uppercase">
              <span className="sr-only">Módulo {numero}: </span>
              {aula.titulo}
            </span>
            <span className="mt-1.5 block truncate font-body text-base tracking-[1px] text-ink-muted">
              {resumo}
            </span>
          </span>
          <span className="shrink-0 font-label text-[11px] tracking-[2px] text-brand-light uppercase">
            Leitura · {minutosDeLeitura(conteudo)} min
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 font-label text-[11px] text-ink-muted transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>

        {/* A sequência do aluno (leitura, quiz, exercícios) e, por último, os
            flashcards, que ele revisa na sessão da trilha, fora da sequência. */}
        <ParteDaAula numero={1} titulo="Aprender">
          <Bloco
            titulo="LEITURA"
            acao={
              editavel && !editandoLeitura ? (
                <PixelButton type="button" variante="secundaria" onClick={() => setEditandoLeitura(true)}>
                  EDITAR LEITURA
                </PixelButton>
              ) : null
            }
          >
            {editandoLeitura ? (
              <FormLeitura
                aula={aula}
                conteudo={conteudo}
                aoCancelar={() => setEditandoLeitura(false)}
                aoSalvar={(salvo) => {
                  setConteudo(salvo);
                  setEditandoLeitura(false);
                }}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
                {indice.length > 0 ? (
                  <ol aria-label="Nesta lição" className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {indice.map((secao, i) => (
                      <li key={i} className="flex items-start gap-2 font-label text-[10px] tracking-[2px] text-ink-body uppercase">
                        <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 bg-brand-shadow" />
                        {rotuloDaSecao(secao.titulo)}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={`m-0 text-ink-dim ${TIPO.etiqueta}`}>SEM SEÇÕES NO ÍNDICE</p>
                )}
                <div
                  tabIndex={0}
                  aria-label={`Texto da aula: ${aula.titulo}`}
                  className="max-h-80 overflow-y-auto border-2 border-edge bg-panel-deep p-4"
                >
                  <ConteudoDaLicao markdown={conteudo} tamanho="medio" embutido />
                </div>
              </div>
            )}
          </Bloco>

          <Bloco titulo="QUIZ DE FIXAÇÃO">
            {questoes.length === 0 ? (
              <p className={VAZIO}>&gt; NENHUMA QUESTÃO AINDA.</p>
            ) : (
              <ul
                aria-label="Quiz de fixação"
                className="m-0 list-none divide-y-2 divide-edge border-2 border-edge p-0"
              >
                {questoes.map((q) => (
                  <li key={`q-${q.id}`} className={LINHA}>
                    <span aria-hidden="true" className={`${MARCA} border-brand-shadow text-brand-light`}>
                      QZ
                    </span>
                    <span className="min-w-0 flex-1 font-body text-base tracking-[1px] text-ink-body">
                      {q.enunciado}
                    </span>
                    <Badge tom="alerta">MÚLTIPLA ESCOLHA</Badge>
                    {editavel ? (
                      <span className="flex items-center gap-2">
                        <AcoesQuestao questao={q} aoAlterar={recarregar} />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {adicionando ? (
              <button type="button" className={BOTAO_SLOT} onClick={() => setNovo("MULTIPLA")}>
                + ADICIONAR QUESTÃO
              </button>
            ) : null}
            {novo === "MULTIPLA" ? formulario : null}
          </Bloco>
        </ParteDaAula>

        <ParteDaAula numero={2} titulo="Praticar">
          {exercicios.length === 0 ? (
            <p className={VAZIO}>&gt; NENHUM EXERCÍCIO AINDA.</p>
          ) : (
            <ul className="m-0 list-none divide-y-2 divide-edge border-2 border-edge p-0">
              {exercicios.map((ex, i) => (
                <li key={`ex-${ex.id}`} className={LINHA}>
                  <span aria-hidden="true" className={`${MARCA} border-edge-soft text-ink-muted`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 font-body text-base tracking-[1px] text-ink-body">
                    {ex.titulo}
                  </span>
                  <Badge tom={ex.tipo === "CODIGO" ? "sucesso" : "acento"}>
                    {ex.tipo === "CODIGO" ? "CÓDIGO" : "TEÓRICO"}
                  </Badge>
                  {editavel ? (
                    <span className="flex items-center gap-2">
                      <AcoesRascunho
                        item={{
                          id: ex.id,
                          tipo: "exercicios",
                          titulo: ex.titulo,
                          status_editorial: "RASCUNHO",
                        }}
                        aoAlterar={recarregar}
                      />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {adicionando && !escolhendo ? (
            <button type="button" className={BOTAO_SLOT} onClick={() => setEscolhendo(true)}>
              + ADICIONAR EXERCÍCIO
            </button>
          ) : null}
          {adicionando && escolhendo ? (
            <div
              role="group"
              aria-label="Adicionar exercício"
              className="flex flex-wrap items-center gap-3 border-2 border-dashed border-brand-shadow p-4"
            >
              <span className={`mr-auto text-ink-muted ${TIPO.etiqueta}`}>QUAL TIPO?</span>
              {TIPOS_NOVOS.map(([valor, rotulo, cor]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => {
                    setEscolhendo(false);
                    setNovo(valor);
                  }}
                  className={`cursor-pointer border-2 bg-transparent px-4 py-3 font-label text-[11px] tracking-[2px] uppercase shadow-pixel transition duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-panel-soft hover:shadow-pixel-sm ${cor}`}
                >
                  + {rotulo}
                </button>
              ))}
              <PixelButton type="button" variante="secundaria" onClick={() => setEscolhendo(false)}>
                CANCELAR
              </PixelButton>
            </div>
          ) : null}
          {novo !== null && novo !== "MULTIPLA" ? formulario : null}
        </ParteDaAula>

        <ParteDaAula numero={3} titulo="Memorizar">
          <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
            Revisão da trilha, fora da sequência: o aluno estuda estes cards na
            sessão de flashcards.
          </p>
          <GerenciadorFlashcards aula={aula.id} iniciais={aula.flashcards} />
        </ParteDaAula>
      </details>
    </li>
  );
}

type TipoNovo = "TEORICO" | "MULTIPLA" | "CODIGO";

// Rótulo do botão e cor de destaque: cada tipo se reconhece de relance.
const TIPOS_NOVOS: [Exclude<TipoNovo, "MULTIPLA">, string, string][] = [
  ["TEORICO", "EXERCÍCIO TEÓRICO", "border-brand-light text-brand-light"],
  ["CODIGO", "EXERCÍCIO DE CÓDIGO", "border-success text-success"],
];

const TITULO_NOVO: Record<TipoNovo, string> = {
  TEORICO: "Novo exercício teórico",
  MULTIPLA: "Nova questão de múltipla escolha",
  CODIGO: "Novo exercício de código",
};

// O tipo vem do botão clicado: cada um abre só o formulário dele.
function FormExercicio({
  tipo,
  aula,
  aoCancelar,
  aoCriarExercicio,
  aoCriarQuestao,
}: {
  tipo: TipoNovo;
  aula: number;
  aoCancelar: () => void;
  aoCriarExercicio: (ex: ExercicioEditor) => void;
  aoCriarQuestao: (q: Questao) => void;
}) {
  return (
    <div className="flex flex-col gap-5 border-2 border-dashed border-brand-shadow bg-panel-deep p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className={`m-0 text-ink ${TIPO.tituloSecao}`}>{TITULO_NOVO[tipo]}</h4>
        <PixelButton type="button" variante="secundaria" onClick={aoCancelar}>
          CANCELAR
        </PixelButton>
      </div>
      {tipo === "MULTIPLA" ? (
        <FormQuestao aula={aula} aoCriar={aoCriarQuestao} />
      ) : (
        <FormTeorico aula={aula} codigo={tipo === "CODIGO"} aoCriar={aoCriarExercicio} />
      )}
    </div>
  );
}

// Teórico e código dividem título e enunciado; o de código pede também a
// função que o aluno implementa e os casos que o corretor roda nela.
// Exportado: a criação rápida do painel usa o mesmo formulário.
export function FormTeorico({
  aula,
  codigo = false,
  aoCriar,
}: {
  aula: number;
  codigo?: boolean;
  aoCriar: (ex: ExercicioEditor) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [funcao, setFuncao] = useState("");
  const [casos, setCasos] = useState<CasoTexto[]>([CASO_VAZIO]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    const testes = codigo ? lerCasos(casos) : [];
    if (testes === null) {
      setErro(ERRO_CASO);
      return;
    }
    setEnviando(true);
    try {
      const base = { aula, titulo: titulo.trim(), enunciado };
      aoCriar(
        await api.criarExercicio(
          codigo ? { ...base, funcao: funcao.trim(), testes } : base,
        ),
      );
    } catch (e) {
      setErro(mensagemDe(e));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} aria-label="Novo exercício" className="flex flex-col gap-5">
      <PixelField
        rotulo="TÍTULO DO EXERCÍCIO"
        value={titulo}
        maxLength={120}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <AreaDeTexto
        id={`enunciado-${aula}`}
        rotulo="ENUNCIADO"
        rows={6}
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
      />
      {codigo ? (
        <CamposDeCodigo
          funcao={funcao}
          aoMudarFuncao={setFuncao}
          casos={casos}
          aoMudarCasos={setCasos}
        />
      ) : null}
      <Erro texto={erro} />
      <PixelButton
        type="submit"
        variante="secundaria"
        className="self-end"
        disabled={
          enviando ||
          !titulo.trim() ||
          !enunciado.trim() ||
          (codigo && (!funcao.trim() || casosIncompletos(casos)))
        }
      >
        {enviando ? "SALVANDO..." : "SALVAR EXERCÍCIO"}
      </PixelButton>
    </form>
  );
}

export function FormQuestao({ aula, aoCriar }: { aula: number; aoCriar: (q: Questao) => void }) {
  const [dados, setDados] = useState(QUESTAO_VAZIA);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      aoCriar(await api.criarQuestao({ aula, ...questaoLimpa(dados) }));
    } catch (e) {
      setErro(mensagemDe(e));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} aria-label="Nova questão" className="flex flex-col gap-5">
      <CamposQuestao valor={dados} aoMudar={setDados} />
      <Erro texto={erro} />
      <PixelButton
        type="submit"
        variante="secundaria"
        className="self-end"
        disabled={enviando || !questaoCompleta(dados)}
      >
        {enviando ? "SALVANDO..." : "SALVAR EXERCÍCIO"}
      </PixelButton>
    </form>
  );
}
