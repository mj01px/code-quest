"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import {
  AcoesQuestao,
  CamposQuestao,
  QUESTAO_VAZIA,
  questaoCompleta,
  questaoLimpa,
} from "@/components/autoria/AcoesQuestao";
import { AcoesRascunho } from "@/components/autoria/AcoesRascunho";
import { AreaDeTexto, ROTULO } from "@/components/autoria/AreaDeTexto";
import {
  CASO_VAZIO,
  CamposDeCodigo,
  ERRO_CASO,
  casosIncompletos,
  lerCasos,
  type CasoTexto,
} from "@/components/autoria/CamposDeCodigo";
import { GerenciadorFlashcards } from "@/components/autoria/GerenciadorFlashcards";
import { ModalVisualizacao } from "@/components/autoria/ModalVisualizacao";
import { PreviaMarkdown } from "@/components/autoria/PreviaMarkdown";
import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type {
  Criatura,
  Dificuldade,
  Flashcard,
  NovaAula,
  Questao,
  StatusEditorial,
  TipoExercicio,
} from "@/lib/types";

const CARTAO = "flex flex-col gap-6 border-2 border-edge bg-panel p-7 shadow-pixel-lg";

const NIVEIS: [Dificuldade, string][] = [
  ["INICIANTE", "INICIANTE"],
  ["INTERMEDIARIO", "INTERMEDIÁRIO"],
  ["AVANCADO", "AVANÇADO"],
];

const ROTULO_STATUS: Record<StatusEditorial, string> = {
  RASCUNHO: "TRILHA SALVA EM RASCUNHO",
  REVISAO: "TRILHA EM REVISÃO",
  APROVADO: "TRILHA APROVADA",
  PUBLICADO: "TRILHA PUBLICADA",
};

// O que o editor guarda da trilha e de cada aula: o bastante para listar e
// para continuar adicionando, venha da criação agora ou de uma trilha salva.
interface TrilhaEditor {
  id: number;
  nome: string;
  descricao: string;
  status_editorial: StatusEditorial;
  /** Slug da criatura que ganha o dobro de XP na trilha. */
  criatura_bonus: string | null;
}

// O backend só exclui rascunho e aprovado; em revisão ou publicada o botão some.
const EXCLUIVEIS: StatusEditorial[] = ["RASCUNHO", "APROVADO"];

interface ExercicioEditor {
  id: number;
  titulo: string;
  tipo: TipoExercicio;
}

interface AulaEditor {
  id: number;
  titulo: string;
  conteudo: string;
  exercicios: ExercicioEditor[];
  flashcards: Flashcard[];
  questoes: Questao[];
}

const aulaNova = (a: NovaAula): AulaEditor => ({
  id: a.id,
  titulo: a.titulo,
  conteudo: a.conteudo,
  exercicios: [],
  flashcards: [],
  questoes: [],
});

function mensagemDe(erro: unknown): string {
  if (!(erro instanceof ErroApi)) return "Não foi possível salvar.";
  // Erro de campo (ex.: "enunciado") é mais útil que o resumo do envelope.
  return Object.values(erro.porCampo())[0] ?? erro.message;
}

function Erro({ texto }: { texto: string | null }) {
  return texto ? (
    <p role="alert" className={`m-0 text-danger ${TIPO.corpo}`}>
      {texto}
    </p>
  ) : null;
}

const opcao = (ativa: boolean) =>
  `flex-1 basis-[120px] cursor-pointer border-2 px-3 py-3.5 font-label text-[11px] tracking-[2px] shadow-pixel transition-colors duration-150 ${
    ativa
      ? "border-brand-light bg-brand-deep text-ink"
      : "border-edge-soft text-ink-muted hover:border-brand hover:text-ink-soft"
  }`;

// Monta uma trilha em rascunho: primeiro os dados dela, depois as aulas e,
// dentro de cada aula, exercícios, questões e flashcards. Com `trilhaId`,
// retoma uma trilha já salva de onde o autor parou.
export function EditorDeConteudo({ trilhaId = null }: { trilhaId?: number | null }) {
  const router = useRouter();
  const { usuario, carregando } = useProgresso();
  const [trilha, setTrilha] = useState<TrilhaEditor | null>(null);
  const [aulas, setAulas] = useState<AulaEditor[]>([]);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  // O formulário de aula fica atrás de um botão: aberto, esconde o botão.
  const [novaAula, setNovaAula] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [excluida, setExcluida] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  // Prévia da trilha inteira, a mesma que o revisor abre; o envio pode sair dela.
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const podeCriar = usuario?.permissoes.includes("trilhas.create") ?? false;
  // Granulares do RBAC: o admin define quem adiciona aula e quem adiciona
  // exercício. Esconder é navegação; quem barra é o backend.
  const podeAula = usuario?.permissoes.includes("trilhas.create_aula") ?? false;
  const podeExercicio =
    usuario?.permissoes.includes("trilhas.create_exercicio") ?? false;

  useEffect(() => {
    if (carregando) return;
    if (!usuario) router.replace("/entrar");
    else if (!podeCriar) router.replace("/autoria");
  }, [carregando, usuario, podeCriar, router]);

  // Dá tempo de ler o aviso antes de voltar à lista.
  useEffect(() => {
    if (!excluida) return;
    const timer = setTimeout(() => router.replace("/autoria"), 1500);
    return () => clearTimeout(timer);
  }, [excluida, router]);

  useEffect(() => {
    if (trilhaId === null || !podeCriar) return;
    let ativo = true;
    api
      .detalheEditorial("trilhas", trilhaId)
      .then((lida) => {
        if (!ativo || !("aulas" in lida)) return;
        const { id, nome, descricao, status_editorial } = lida;
        setTrilha({
          id,
          nome,
          descricao,
          status_editorial,
          criatura_bonus: lida.criatura_bonus ?? null,
        });
        setAulas(lida.aulas);
      })
      .catch((e: unknown) => {
        if (ativo) setErroCarga(mensagemDe(e));
      });
    return () => {
      ativo = false;
    };
  }, [trilhaId, podeCriar]);

  if (carregando || !usuario || !podeCriar) {
    return (
      <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; VERIFICANDO ACESSO...</p>
    );
  }

  const retomando = trilhaId !== null;

  async function excluir() {
    if (!trilha) return;
    setOcupado(true);
    setErroExclusao(null);
    try {
      await api.excluirRascunho("trilhas", trilha.id);
      setExcluindo(false);
      setExcluida(true);
    } catch (e) {
      setErroExclusao(mensagemDe(e));
    } finally {
      setOcupado(false);
    }
  }

  async function enviarParaRevisao() {
    if (!trilha) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      await api.submeterRevisao("trilhas", trilha.id);
      setRevisando(false);
      setTrilha({ ...trilha, status_editorial: "REVISAO" });
    } catch (e) {
      setErroEnvio(mensagemDe(e));
    } finally {
      setEnviando(false);
    }
  }

  if (excluida) {
    return (
      <p role="status" className={`m-0 text-success ${TIPO.etiqueta}`}>
        &gt; TRILHA EXCLUÍDA. VOLTANDO PARA A AUTORIA...
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-[880px] flex-col gap-10">
      <div className="flex flex-col gap-3">
        <span className={`text-brand ${TIPO.sobretitulo}`}>{"// EDITOR DE TRILHAS"}</span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className={`m-0 text-ink ${TIPO.tituloPagina}`}>
            {retomando ? "Editar trilha" : "Novo conteúdo"}
          </h1>
          {trilha && EXCLUIVEIS.includes(trilha.status_editorial) ? (
            <button
              type="button"
              onClick={() => {
                setErroExclusao(null);
                setExcluindo(true);
              }}
              className="cursor-pointer border-2 border-danger-deep px-4 py-2.5 font-label text-[11px] tracking-[2px] text-danger shadow-pixel transition-colors duration-150 hover:border-danger"
            >
              EXCLUIR RASCUNHO
            </button>
          ) : null}
        </div>
        <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
          Tudo nasce em rascunho. Confira o resultado em REVISAR CONTEÚDO e envie
          a trilha para revisão quando estiver pronta.
        </p>
      </div>

      {trilha?.status_editorial === "APROVADO" ? (
        <BotaoPublicar
          trilha={trilha.id}
          aoPublicar={() => setTrilha({ ...trilha, status_editorial: "PUBLICADO" })}
        />
      ) : null}

      {trilha ? (
        <DadosTrilha key={trilha.id} trilha={trilha} aoSalvar={setTrilha} />
      ) : retomando ? (
        erroCarga ? (
          <Erro texto={erroCarga} />
        ) : (
          <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; CARREGANDO TRILHA...</p>
        )
      ) : (
        <FormTrilha aoCriar={setTrilha} />
      )}

      {trilha ? (
        <>
          <section className="flex flex-col gap-4" aria-label="Aulas da trilha">
            <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>2. Aulas</h2>
            {aulas.length === 0 ? (
              <p className="m-0 border-2 border-dashed border-edge-soft bg-panel px-6 py-6 font-body text-base text-ink-muted">
                &gt; NENHUMA AULA AINDA. ADICIONE A PRIMEIRA ABAIXO.
              </p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-6 p-0">
                {aulas.map((aula, i) => (
                  <ItemAula
                    key={aula.id}
                    numero={i + 1}
                    aula={aula}
                    editavel={trilha.status_editorial === "RASCUNHO"}
                    podeExercicio={podeExercicio}
                  />
                ))}
              </ol>
            )}
            {novaAula ? (
              <FormAula
                trilha={trilha.id}
                aoCancelar={() => setNovaAula(false)}
                aoCriar={(a) => {
                  setAulas((atual) => [...atual, aulaNova(a)]);
                  setNovaAula(false);
                }}
              />
            ) : podeAula ? (
              <PixelButton className="self-start" onClick={() => setNovaAula(true)}>
                + ADICIONAR NOVA AULA
              </PixelButton>
            ) : null}
          </section>
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/autoria"
                className={`mr-2 text-brand-light underline underline-offset-4 ${TIPO.etiqueta}`}
              >
                IR PARA OS RASCUNHOS
              </Link>
              <PixelButton
                type="button"
                variante="secundaria"
                onClick={() => {
                  setErroEnvio(null);
                  setRevisando(true);
                }}
              >
                REVISAR CONTEÚDO
              </PixelButton>
              {trilha.status_editorial === "RASCUNHO" ? (
                <PixelButton type="button" onClick={enviarParaRevisao} disabled={enviando}>
                  {enviando ? "ENVIANDO..." : "ENVIAR PARA REVISÃO"}
                </PixelButton>
              ) : null}
            </div>
            {revisando ? null : <Erro texto={erroEnvio} />}
          </div>
        </>
      ) : null}

      {revisando && trilha ? (
        <ModalVisualizacao
          item={{
            id: trilha.id,
            tipo: "trilhas",
            titulo: trilha.nome,
            status_editorial: trilha.status_editorial,
          }}
          rotulo="PRÉVIA DA TRILHA"
          acoes={
            trilha.status_editorial === "RASCUNHO"
              ? [{ rotulo: "ENVIAR PARA REVISÃO" }]
              : []
          }
          ocupado={enviando}
          erro={erroEnvio}
          onAgir={() => void enviarParaRevisao()}
          onFechar={() => setRevisando(false)}
        />
      ) : null}

      {excluindo && trilha ? (
        <ModalConfirmacao
          rotulo="EXCLUIR RASCUNHO"
          titulo={trilha.nome}
          textoConfirmar="EXCLUIR"
          perigo
          carregando={ocupado}
          erro={erroExclusao}
          onConfirmar={excluir}
          onFechar={() => setExcluindo(false)}
        >
          <p className="m-0">
            A trilha e tudo dentro dela (aulas, exercícios, questões e
            flashcards) será apagado de vez. Não dá para desfazer.
          </p>
        </ModalConfirmacao>
      ) : null}
    </div>
  );
}

function BotaoPublicar({ trilha, aoPublicar }: { trilha: number; aoPublicar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function publicar() {
    setEnviando(true);
    setErro(null);
    try {
      await api.publicarConteudo("trilhas", trilha);
      aoPublicar();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <PixelButton onClick={publicar} disabled={enviando}>
        {enviando ? "PUBLICANDO..." : "PUBLICAR TRILHA"}
      </PixelButton>
      <Erro texto={erro} />
    </div>
  );
}

// Nome e descrição só se editam em rascunho, a mesma regra do backend; fora
// dele a trilha aparece como texto, com o status em destaque.
function DadosTrilha({
  trilha,
  aoSalvar,
}: {
  trilha: TrilhaEditor;
  aoSalvar: (t: TrilhaEditor) => void;
}) {
  const [nome, setNome] = useState(trilha.nome);
  const [descricao, setDescricao] = useState(trilha.descricao);
  const [bonus, setBonus] = useState(trilha.criatura_bonus ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const bonusMudou = bonus !== (trilha.criatura_bonus ?? "");

  const status = (
    <span className={`text-success ${TIPO.etiqueta}`}>
      &gt; {ROTULO_STATUS[trilha.status_editorial]}
    </span>
  );

  if (trilha.status_editorial !== "RASCUNHO") {
    return (
      <section className={CARTAO} aria-label="Trilha">
        {status}
        <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>{trilha.nome}</h2>
        <p className={`m-0 text-ink-body ${TIPO.corpo}`}>{trilha.descricao}</p>
      </section>
    );
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    setSalvo(false);
    const dados = { nome: nome.trim(), descricao: descricao.trim() };
    try {
      // Omitir o campo mantém o bônus; null o tira.
      await api.editarRascunho("trilhas", trilha.id, {
        ...dados,
        ...(bonusMudou ? { criatura_bonus: bonus || null } : {}),
      });
      aoSalvar({ ...trilha, ...dados, criatura_bonus: bonus || null });
      setSalvo(true);
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setEnviando(false);
    }
  }

  const mudou =
    nome.trim() !== trilha.nome || descricao.trim() !== trilha.descricao || bonusMudou;

  return (
    <form onSubmit={salvar} className={CARTAO} aria-label="Trilha">
      {status}
      <PixelField
        rotulo="NOME DA TRILHA"
        value={nome}
        maxLength={80}
        onChange={(e) => {
          setNome(e.target.value);
          setSalvo(false);
        }}
      />
      <AreaDeTexto
        id={`trilha-${trilha.id}-descricao`}
        rotulo="DESCRIÇÃO CURTA"
        rows={3}
        value={descricao}
        onChange={(e) => {
          setDescricao(e.target.value);
          setSalvo(false);
        }}
      />
      <SeletorBonus
        valor={bonus}
        aoMudar={(slug) => {
          setBonus(slug);
          setSalvo(false);
        }}
      />
      <Erro texto={erro} />
      {salvo ? (
        <p role="status" className={`m-0 text-success ${TIPO.etiqueta}`}>
          &gt; DADOS DA TRILHA SALVOS.
        </p>
      ) : null}
      <PixelButton
        type="submit"
        className="self-end"
        disabled={enviando || !mudou || !nome.trim() || !descricao.trim()}
      >
        {enviando ? "SALVANDO..." : "SALVAR DADOS DA TRILHA"}
      </PixelButton>
    </form>
  );
}

function FormTrilha({ aoCriar }: { aoCriar: (t: TrilhaEditor) => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dificuldade, setDificuldade] = useState<Dificuldade>("INICIANTE");
  const [bonus, setBonus] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const criada = await api.criarTrilha({
        nome: nome.trim(),
        descricao: descricao.trim(),
        dificuldade,
        ...(bonus ? { criatura_bonus: bonus } : {}),
      });
      aoCriar({
        id: criada.id,
        nome: criada.nome,
        descricao: criada.descricao,
        status_editorial: "RASCUNHO",
        criatura_bonus: criada.criatura_bonus ?? null,
      });
    } catch (e) {
      setErro(mensagemDe(e));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className={CARTAO} aria-label="Dados da trilha">
      <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>1. Dados da trilha</h2>
      <PixelField
        rotulo="NOME DA TRILHA"
        value={nome}
        maxLength={80}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex: TypeScript do zero"
      />
      <AreaDeTexto
        id="trilha-descricao"
        rotulo="DESCRIÇÃO CURTA"
        rows={3}
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="O que o aluno vai dominar ao fim da trilha?"
      />
      <div className="flex flex-col gap-2">
        <span id="trilha-nivel" className={ROTULO}>
          NÍVEL
        </span>
        <div role="radiogroup" aria-labelledby="trilha-nivel" className="flex flex-wrap gap-2">
          {NIVEIS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={dificuldade === valor}
              onClick={() => setDificuldade(valor)}
              className={opcao(dificuldade === valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      <SeletorBonus valor={bonus} aoMudar={setBonus} />
      <Erro texto={erro} />
      <PixelButton
        type="submit"
        className="self-end"
        disabled={enviando || !nome.trim() || !descricao.trim()}
      >
        {enviando ? "SALVANDO..." : "CRIAR TRILHA"}
      </PixelButton>
    </form>
  );
}

// A criatura escolhida ganha o dobro de XP nesta trilha. O bônus não vem da
// trilha: mora numa tabela à parte, que o backend grava a partir deste campo.
function SeletorBonus({ valor, aoMudar }: { valor: string; aoMudar: (slug: string) => void }) {
  const id = useId();
  const [criaturas, setCriaturas] = useState<Criatura[]>([]);

  useEffect(() => {
    let ativo = true;
    api
      .catalogo()
      .then((lista) => {
        // O catálogo público lista também as criaturas sem arte (Raposa, Elefante).
        if (ativo) setCriaturas(lista.filter((c) => c.disponivel));
      })
      // Sem o catálogo a lista fica só com "Nenhum", e a trilha segue sem bônus.
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={ROTULO}>
        BÔNUS DE CRIATURA
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="cursor-pointer border-2 border-brand-strong bg-field px-3 py-[11px] font-body text-[15px] text-ink shadow-pixel outline-none focus:border-brand-pale"
      >
        <option value="">Nenhum</option>
        {criaturas.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.nome} ({c.dominio_rotulo})
          </option>
        ))}
      </select>
      <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
        Quem tiver essa criatura ganha o dobro de XP nesta trilha.
      </p>
    </div>
  );
}

function FormAula({
  trilha,
  aoCriar,
  aoCancelar,
}: {
  trilha: number;
  aoCriar: (a: NovaAula) => void;
  aoCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      // Fecha o formulário: o pai o desmonta, então não há o que limpar.
      aoCriar(await api.criarAula({ trilha, titulo: titulo.trim(), conteudo }));
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
      <div className="grid gap-6 lg:grid-cols-2">
        <AreaDeTexto
          id="aula-conteudo"
          rotulo="TEXTO (MARKDOWN)"
          markdown
          rows={12}
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder={"# Variáveis\n\nUma variável guarda um valor.\n\n```\nidade = 20\n```"}
        />
        <div className="flex flex-col gap-2">
          <span className={ROTULO}>PRÉVIA</span>
          <div className="min-h-[120px] border-2 border-edge bg-panel-deep p-4">
            <PreviaMarkdown markdown={conteudo} />
          </div>
        </div>
      </div>
      <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
        Depois de salvar, a aula aparece na lista acima, onde você inclui os
        flashcards e os exercícios dela.
      </p>
      <Erro texto={erro} />
      <PixelButton
        type="submit"
        className="self-end"
        disabled={enviando || !titulo.trim() || !conteudo.trim()}
      >
        {enviando ? "SALVANDO..." : "ADICIONAR AULA"}
      </PixelButton>
    </form>
  );
}

// Moldura de uma das três partes da aula, com o título numerado.
function BlocoDaAula({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-2 border-edge-soft border-l-4 border-l-brand bg-panel-deep p-4">
      <h4 className={`m-0 text-brand-light ${TIPO.etiqueta}`}>{titulo}</h4>
      {children}
    </div>
  );
}

function ItemAula({
  numero,
  aula,
  editavel,
  podeExercicio,
}: {
  numero: number;
  aula: AulaEditor;
  /** Lápis e lixeira nos exercícios: só com a trilha em rascunho, como no backend. */
  editavel: boolean;
  /** Sem `trilhas.create_exercicio`, os botões de adicionar somem. */
  podeExercicio: boolean;
}) {
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
  // Tipo do exercício em criação; null mostra os três botões de adicionar.
  const [novo, setNovo] = useState<TipoNovo | null>(null);
  const vazia = exercicios.length === 0 && questoes.length === 0;

  return (
    <li className="flex flex-col gap-5 border-2 border-edge bg-panel p-5 shadow-pixel">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[11px] text-brand-light">
          {String(numero).padStart(2, "0")}
        </span>
        <span className={`min-w-0 flex-1 text-ink ${TIPO.etiqueta}`}>{aula.titulo}</span>
      </div>
      {/* Três blocos com moldura própria: estudo, memorização e prática. */}
      <BlocoDaAula titulo="1. CONTEÚDO DA AULA">
        <div
          tabIndex={0}
          aria-label={`Texto da aula: ${aula.titulo}`}
          className="max-h-72 overflow-y-auto"
        >
          <PreviaMarkdown markdown={aula.conteudo} />
        </div>
      </BlocoDaAula>
      <BlocoDaAula titulo="2. FLASHCARDS">
        <GerenciadorFlashcards aula={aula.id} iniciais={aula.flashcards} />
      </BlocoDaAula>
      <BlocoDaAula titulo="3. EXERCÍCIOS DA AULA">
        {vazia ? (
          <p className="m-0 border-2 border-dashed border-edge-soft px-4 py-3 font-body text-base text-ink-muted">
            &gt; NENHUM EXERCÍCIO AINDA.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {exercicios.map((ex) => (
              <li
                key={`ex-${ex.id}`}
                className="flex flex-wrap items-center gap-3 font-body text-base text-ink-body"
              >
                <span className="min-w-0 flex-1">
                  <span className={`mr-2 text-brand-light ${TIPO.etiqueta}`}>
                    {ex.tipo === "CODIGO" ? "CÓDIGO" : "TEÓRICO"}
                  </span>
                  {ex.titulo}
                </span>
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
            {questoes.map((q) => (
              <li
                key={`q-${q.id}`}
                className="flex flex-wrap items-center gap-3 font-body text-base text-ink-body"
              >
                <span className="min-w-0 flex-1">
                  <span className={`mr-2 text-brand-light ${TIPO.etiqueta}`}>
                    MÚLTIPLA ESCOLHA
                  </span>
                  {q.enunciado}
                </span>
                {editavel ? (
                  <span className="flex items-center gap-2">
                    <AcoesQuestao questao={q} aoAlterar={recarregar} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {novo === null ? (
          podeExercicio ? (
            <div role="group" aria-label="Adicionar exercício" className="flex flex-wrap gap-3">
              {TIPOS_NOVOS.map(([valor, rotulo, cor]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setNovo(valor)}
                  className={`cursor-pointer border-2 bg-panel-deep px-4 py-3 font-label text-[11px] tracking-[2px] shadow-pixel transition-colors duration-150 hover:bg-panel-soft ${cor}`}
                >
                  + {rotulo}
                </button>
              ))}
            </div>
          ) : null
        ) : (
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
        )}
      </BlocoDaAula>
    </li>
  );
}

type TipoNovo = "TEORICO" | "MULTIPLA" | "CODIGO";

// Rótulo do botão e cor de destaque: cada tipo se reconhece de relance.
const TIPOS_NOVOS: [TipoNovo, string, string][] = [
  ["TEORICO", "EXERCÍCIO TEÓRICO", "border-brand-light text-brand-light"],
  ["MULTIPLA", "MÚLTIPLA ESCOLHA", "border-warning text-warning"],
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
function FormTeorico({
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

function FormQuestao({ aula, aoCriar }: { aula: number; aoCriar: (q: Questao) => void }) {
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
