"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AreaDeTexto, ROTULO } from "@/components/autoria/AreaDeTexto";
import { GerenciadorFlashcards } from "@/components/autoria/GerenciadorFlashcards";
import { PreviaMarkdown } from "@/components/autoria/PreviaMarkdown";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { Dificuldade, NovaAula, NovaTrilha, NovoExercicio } from "@/lib/types";

const CARTAO = "flex flex-col gap-6 border-2 border-edge bg-panel p-7 shadow-pixel-lg";

const NIVEIS: [Dificuldade, string][] = [
  ["INICIANTE", "INICIANTE"],
  ["INTERMEDIARIO", "INTERMEDIÁRIO"],
  ["AVANCADO", "AVANÇADO"],
];

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

// Monta uma trilha nova em rascunho: primeiro os dados dela, depois as aulas e,
// dentro de cada aula, os exercícios. Tudo vai para o fluxo editorial normal.
export function EditorDeConteudo() {
  const router = useRouter();
  const { usuario, carregando } = useProgresso();
  const [trilha, setTrilha] = useState<NovaTrilha | null>(null);
  const [aulas, setAulas] = useState<NovaAula[]>([]);

  const podeCriar = usuario?.permissoes.includes("trilhas.create") ?? false;

  useEffect(() => {
    if (carregando) return;
    if (!usuario) router.replace("/entrar");
    else if (!podeCriar) router.replace("/autoria");
  }, [carregando, usuario, podeCriar, router]);

  if (carregando || !usuario || !podeCriar) {
    return (
      <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; VERIFICANDO ACESSO...</p>
    );
  }

  return (
    <div className="flex w-full max-w-[880px] flex-col gap-10">
      <div className="flex flex-col gap-3">
        <span className={`text-brand ${TIPO.sobretitulo}`}>{"// EDITOR DE TRILHAS"}</span>
        <h1 className={`m-0 text-ink ${TIPO.tituloPagina}`}>Novo conteúdo</h1>
        <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
          Tudo nasce em rascunho. Envie para revisão na tela de autoria quando
          estiver pronto.
        </p>
      </div>

      {trilha ? (
        <section className={CARTAO} aria-label="Trilha criada">
          <span className={`text-success ${TIPO.etiqueta}`}>&gt; TRILHA SALVA EM RASCUNHO</span>
          <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>{trilha.nome}</h2>
          <p className={`m-0 text-ink-body ${TIPO.corpo}`}>{trilha.descricao}</p>
        </section>
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
          <FormAula trilha={trilha.id} aoCriar={(a) => setAulas((atual) => [...atual, a])} />
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

function FormTrilha({ aoCriar }: { aoCriar: (t: NovaTrilha) => void }) {
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
      aoCriar(await api.criarTrilha({ nome: nome.trim(), descricao: descricao.trim(), dificuldade }));
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
              className={`flex-1 basis-[120px] cursor-pointer border-2 px-3 py-3.5 font-label text-[11px] tracking-[2px] shadow-pixel transition-colors duration-150 ${
                dificuldade === valor
                  ? "border-brand-light bg-brand-deep text-ink"
                  : "border-edge-soft text-ink-muted hover:border-brand hover:text-ink-soft"
              }`}
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

function ItemAula({ numero, aula }: { numero: number; aula: NovaAula }) {
  const [exercicios, setExercicios] = useState<NovoExercicio[]>([]);
  const [aberto, setAberto] = useState(false);

  return (
    <li className="flex flex-col gap-4 border-2 border-edge bg-panel p-5 shadow-pixel">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[11px] text-brand-light">
          {String(numero).padStart(2, "0")}
        </span>
        <span className={`min-w-0 flex-1 text-ink ${TIPO.etiqueta}`}>{aula.titulo}</span>
        <PixelButton
          variante="secundaria"
          aria-expanded={aberto}
          onClick={() => setAberto((a) => !a)}
        >
          {aberto ? "FECHAR" : "+ EXERCÍCIO"}
        </PixelButton>
      </div>
      <GerenciadorFlashcards aula={aula.id} />
      {exercicios.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 pl-14">
          {exercicios.map((ex) => (
            <li key={ex.id} className="font-body text-base text-ink-body">
              {ex.titulo}
            </li>
          ))}
        </ul>
      ) : null}
      {aberto ? (
        <FormExercicio
          aula={aula.id}
          aoCriar={(ex) => {
            setExercicios((atual) => [...atual, ex]);
            setAberto(false);
          }}
        />
      ) : null}
    </li>
  );
}

// ponytail: só exercício teórico (título e enunciado). Exercício de código,
// com função e casos de teste do corretor, fica fora do editor por escopo; o
// backend já aceita `funcao` e `testes` quando a tela voltar a pedir.
function FormExercicio({
  aula,
  aoCriar,
}: {
  aula: number;
  aoCriar: (ex: NovoExercicio) => void;
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
    <form
      onSubmit={enviar}
      aria-label="Novo exercício"
      className="flex flex-col gap-5 border-2 border-dashed border-brand-shadow bg-panel-deep p-5"
    >
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
