"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { AreaDeTexto, ROTULO } from "@/components/autoria/AreaDeTexto";
import { GerenciadorFlashcards } from "@/components/autoria/GerenciadorFlashcards";
import { PreviaMarkdown } from "@/components/autoria/PreviaMarkdown";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type {
  Alternativa,
  Dificuldade,
  Flashcard,
  NovaAula,
  Questao,
  StatusEditorial,
} from "@/lib/types";

const CARTAO = "flex flex-col gap-6 border-2 border-edge bg-panel p-7 shadow-pixel-lg";

const NIVEIS: [Dificuldade, string][] = [
  ["INICIANTE", "INICIANTE"],
  ["INTERMEDIARIO", "INTERMEDIÁRIO"],
  ["AVANCADO", "AVANÇADO"],
];

const ALTERNATIVAS: Alternativa[] = ["A", "B", "C", "D"];

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
}

interface AulaEditor {
  id: number;
  titulo: string;
  exercicios: { id: number; titulo: string }[];
  flashcards: Flashcard[];
  questoes: Questao[];
}

const aulaNova = (a: NovaAula): AulaEditor => ({
  id: a.id,
  titulo: a.titulo,
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

  const podeCriar = usuario?.permissoes.includes("trilhas.create") ?? false;

  useEffect(() => {
    if (carregando) return;
    if (!usuario) router.replace("/entrar");
    else if (!podeCriar) router.replace("/autoria");
  }, [carregando, usuario, podeCriar, router]);

  useEffect(() => {
    if (trilhaId === null || !podeCriar) return;
    let ativo = true;
    api
      .detalheEditorial("trilhas", trilhaId)
      .then((lida) => {
        if (!ativo || !("aulas" in lida)) return;
        const { id, nome, descricao, status_editorial } = lida;
        setTrilha({ id, nome, descricao, status_editorial });
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

  return (
    <div className="flex w-full max-w-[880px] flex-col gap-10">
      <div className="flex flex-col gap-3">
        <span className={`text-brand ${TIPO.sobretitulo}`}>{"// EDITOR DE TRILHAS"}</span>
        <h1 className={`m-0 text-ink ${TIPO.tituloPagina}`}>
          {retomando ? "Editar trilha" : "Novo conteúdo"}
        </h1>
        <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
          Tudo nasce em rascunho. Envie para revisão na tela de autoria quando
          estiver pronto.
        </p>
      </div>

      {trilha?.status_editorial === "APROVADO" ? (
        <BotaoPublicar
          trilha={trilha.id}
          aoPublicar={() => setTrilha({ ...trilha, status_editorial: "PUBLICADO" })}
        />
      ) : null}

      {trilha ? (
        <section className={CARTAO} aria-label="Trilha">
          <span className={`text-success ${TIPO.etiqueta}`}>
            &gt; {ROTULO_STATUS[trilha.status_editorial]}
          </span>
          <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>{trilha.nome}</h2>
          <p className={`m-0 text-ink-body ${TIPO.corpo}`}>{trilha.descricao}</p>
        </section>
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
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {aulas.map((aula, i) => (
                  <ItemAula key={aula.id} numero={i + 1} aula={aula} />
                ))}
              </ol>
            )}
          </section>
          <FormAula
            trilha={trilha.id}
            aoCriar={(a) => setAulas((atual) => [...atual, aulaNova(a)])}
          />
          <Link
            href="/autoria"
            className={`self-end text-brand-light underline underline-offset-4 ${TIPO.etiqueta}`}
          >
            IR PARA OS RASCUNHOS
          </Link>
        </>
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

function FormTrilha({ aoCriar }: { aoCriar: (t: TrilhaEditor) => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dificuldade, setDificuldade] = useState<Dificuldade>("INICIANTE");
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
      });
      aoCriar({ ...criada, status_editorial: "RASCUNHO" });
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

function FormAula({ trilha, aoCriar }: { trilha: number; aoCriar: (a: NovaAula) => void }) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      aoCriar(await api.criarAula({ trilha, titulo: titulo.trim(), conteudo }));
      setTitulo("");
      setConteudo("");
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className={CARTAO} aria-label="Nova aula">
      <h3 className={`m-0 text-ink ${TIPO.tituloSecao}`}>+ Adicionar aula</h3>
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
        Depois de adicionar, a aula aparece na lista acima, onde você inclui os
        exercícios dela.
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

function ItemAula({ numero, aula }: { numero: number; aula: AulaEditor }) {
  const [exercicios, setExercicios] = useState(aula.exercicios);
  const [questoes, setQuestoes] = useState(aula.questoes);
  const [aberto, setAberto] = useState(false);
  const vazia = exercicios.length === 0 && questoes.length === 0;

  return (
    <li className="flex flex-col gap-5 border-2 border-edge bg-panel p-5 shadow-pixel">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[11px] text-brand-light">
          {String(numero).padStart(2, "0")}
        </span>
        <span className={`min-w-0 flex-1 text-ink ${TIPO.etiqueta}`}>{aula.titulo}</span>
      </div>
      <GerenciadorFlashcards aula={aula.id} iniciais={aula.flashcards} />
      <div className="flex flex-col gap-3">
        <span className={`text-ink-muted ${TIPO.etiqueta}`}>EXERCÍCIOS DA AULA</span>
        {vazia ? (
          <p className="m-0 border-2 border-dashed border-edge-soft px-4 py-3 font-body text-base text-ink-muted">
            &gt; NENHUM EXERCÍCIO AINDA.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {exercicios.map((ex) => (
              <li key={`ex-${ex.id}`} className="font-body text-base text-ink-body">
                <span className={`mr-2 text-brand-light ${TIPO.etiqueta}`}>TEÓRICO</span>
                {ex.titulo}
              </li>
            ))}
            {questoes.map((q) => (
              <li key={`q-${q.id}`} className="font-body text-base text-ink-body">
                <span className={`mr-2 text-brand-light ${TIPO.etiqueta}`}>MÚLTIPLA ESCOLHA</span>
                {q.enunciado}
              </li>
            ))}
          </ul>
        )}
        <PixelButton
          variante={aberto ? "secundaria" : "primaria"}
          className="self-start"
          aria-expanded={aberto}
          onClick={() => setAberto((a) => !a)}
        >
          {aberto ? "CANCELAR" : "+ ADICIONAR EXERCÍCIO"}
        </PixelButton>
      </div>
      {aberto ? (
        <FormExercicio
          aula={aula.id}
          aoCriarExercicio={(ex) => {
            setExercicios((atual) => [...atual, ex]);
            setAberto(false);
          }}
          aoCriarQuestao={(q) => {
            setQuestoes((atual) => [...atual, q]);
            setAberto(false);
          }}
        />
      ) : null}
    </li>
  );
}

// ponytail: só teórico e múltipla escolha por enquanto; um tipo novo entra
// como mais uma opção do seletor e um formulário ao lado de FormTeorico.
function FormExercicio({
  aula,
  aoCriarExercicio,
  aoCriarQuestao,
}: {
  aula: number;
  aoCriarExercicio: (ex: { id: number; titulo: string }) => void;
  aoCriarQuestao: (q: Questao) => void;
}) {
  const id = useId();
  const [multipla, setMultipla] = useState(false);

  return (
    <div className="flex flex-col gap-5 border-2 border-dashed border-brand-shadow bg-panel-deep p-5">
      <h4 className={`m-0 text-ink ${TIPO.tituloSecao}`}>Novo exercício</h4>
      <div className="flex flex-col gap-2">
        <span id={`${id}-tipo`} className={ROTULO}>
          TIPO DO EXERCÍCIO
        </span>
        <div role="radiogroup" aria-labelledby={`${id}-tipo`} className="flex flex-wrap gap-2">
          {(
            [
              [false, "TEÓRICO"],
              [true, "MÚLTIPLA ESCOLHA"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              role="radio"
              aria-checked={multipla === valor}
              onClick={() => setMultipla(valor)}
              className={opcao(multipla === valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      {multipla ? (
        <FormQuestao aula={aula} aoCriar={aoCriarQuestao} />
      ) : (
        <FormTeorico aula={aula} aoCriar={aoCriarExercicio} />
      )}
    </div>
  );
}

function FormTeorico({
  aula,
  aoCriar,
}: {
  aula: number;
  aoCriar: (ex: { id: number; titulo: string }) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      aoCriar(await api.criarExercicio({ aula, titulo: titulo.trim(), enunciado }));
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
      <Erro texto={erro} />
      <PixelButton
        type="submit"
        variante="secundaria"
        className="self-end"
        disabled={enviando || !titulo.trim() || !enunciado.trim()}
      >
        {enviando ? "SALVANDO..." : "SALVAR EXERCÍCIO"}
      </PixelButton>
    </form>
  );
}

function FormQuestao({ aula, aoCriar }: { aula: number; aoCriar: (q: Questao) => void }) {
  const [enunciado, setEnunciado] = useState("");
  const [opcoes, setOpcoes] = useState(["", "", "", ""]);
  const [correta, setCorreta] = useState<Alternativa>("A");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      aoCriar(
        await api.criarQuestao({
          aula,
          enunciado: enunciado.trim(),
          opcoes: opcoes.map((o) => o.trim()),
          resposta_correta: correta,
        }),
      );
    } catch (e) {
      setErro(mensagemDe(e));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} aria-label="Nova questão" className="flex flex-col gap-5">
      <AreaDeTexto
        id={`questao-${aula}`}
        rotulo="ENUNCIADO DA QUESTÃO"
        rows={4}
        maxLength={1000}
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {ALTERNATIVAS.map((letra, i) => (
          <PixelField
            key={letra}
            rotulo={`OPÇÃO ${letra}`}
            value={opcoes[i]}
            onChange={(e) =>
              setOpcoes((atual) => atual.map((o, j) => (j === i ? e.target.value : o)))
            }
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`correta-${aula}`} className={ROTULO}>
          RESPOSTA CORRETA
        </label>
        <select
          id={`correta-${aula}`}
          value={correta}
          onChange={(e) => setCorreta(e.target.value as Alternativa)}
          className="cursor-pointer border-2 border-brand-strong bg-field px-3 py-[11px] font-body text-[15px] text-ink shadow-pixel outline-none focus:border-brand-pale"
        >
          {ALTERNATIVAS.map((letra) => (
            <option key={letra} value={letra}>
              {letra}
            </option>
          ))}
        </select>
      </div>
      <Erro texto={erro} />
      <PixelButton
        type="submit"
        variante="secundaria"
        className="self-end"
        disabled={enviando || !enunciado.trim() || opcoes.some((o) => !o.trim())}
      >
        {enviando ? "SALVANDO..." : "SALVAR EXERCÍCIO"}
      </PixelButton>
    </form>
  );
}
