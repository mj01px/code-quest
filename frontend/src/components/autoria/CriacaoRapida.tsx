"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { AreaDeTexto } from "@/components/autoria/AreaDeTexto";
import { FormQuestao, FormTeorico } from "@/components/autoria/AulaNoEditor";
import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { IconeAjuda } from "@/components/ui/Icone";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { PixelSelect } from "@/components/ui/PixelSelect";
import { ErroApi, api, buscarTrilha, listarTrilhas } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";

// O botão "Começar/Retomar" do destaque das trilhas: afunda a sombra no hover.
const BOTAO =
  "inline-flex cursor-pointer items-center justify-center border-[3px] border-brand-light bg-brand-deep px-4 py-3 font-display text-[10px] leading-[1.7] tracking-[1px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] transition duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_0_0_3px_var(--color-brand-void),2px_2px_0_rgba(0,0,0,0.7)]";

type Modo = "aula" | "exercicio";
type TipoNovo = "TEORICO" | "MULTIPLA" | "CODIGO";

const TIPOS: [TipoNovo, string][] = [
  ["TEORICO", "TEÓRICO"],
  ["MULTIPLA", "QUIZ"],
  ["CODIGO", "CÓDIGO"],
];

const DICAS = {
  trilha: "Cria uma trilha completa do zero. Ideal para organizar módulos, aulas e exercícios.",
  aula: "Adiciona uma aula avulsa (teoria, flashcards) a uma trilha que já está em rascunho.",
  exercicio:
    "Cria um exercício (Teórico, Múltipla Escolha ou Código) e vincula a uma aula existente.",
};

// O "?" é só um ícone dentro do botão (sem pointer-events): clicar em qualquer
// ponto dispara a ação, e o hover ou o foco do botão abre a dica. A dica fica
// sempre no DOM, ligada por aria-describedby, para o leitor de tela.
// ponytail: sem Esc para fechar; usar um Popover/Tooltip de lib se isso importar.
function BotaoComDica({
  rotulo,
  dica,
  href,
  onClick,
}: {
  rotulo: string;
  dica: string;
  href?: string;
  onClick?: () => void;
}) {
  const id = useId();
  const conteudo = (
    <>
      {rotulo}
      <span className="pointer-events-none ml-3 inline-flex opacity-70">
        <IconeAjuda className="h-4 w-4" />
      </span>
    </>
  );
  return (
    <div className="group relative">
      {href ? (
        <Link href={href} aria-describedby={id} className={BOTAO}>
          {conteudo}
        </Link>
      ) : (
        <button type="button" aria-describedby={id} className={BOTAO} onClick={onClick}>
          {conteudo}
        </button>
      )}
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible absolute top-full right-0 z-20 mt-2 w-64 border-2 border-brand-strong bg-panel-deep px-3 py-2 text-left font-body text-[13px] leading-snug text-ink opacity-0 shadow-pixel transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {dica}
      </span>
    </div>
  );
}

function mensagemDe(erro: unknown): string {
  if (!(erro instanceof ErroApi)) return "Não foi possível concluir agora.";
  return Object.values(erro.porCampo())[0] ?? erro.message;
}

// Criação rápida do painel: trilha abre o editor completo; aula e exercício
// abrem um modal que os vincula a uma trilha em rascunho do autor. Cada botão
// segue a granular dele; quem barra de verdade é o backend.
export function CriacaoRapida({
  permissoes,
  aoCriar,
}: {
  permissoes: readonly string[];
  /** Avisa o painel para recarregar os rascunhos. */
  aoCriar: () => void;
}) {
  const [modo, setModo] = useState<Modo | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; trilha: number | null } | null>(null);

  const cria = permissoes.includes("trilhas.create");
  const pode = (granular: string) => cria && permissoes.includes(granular);
  // Sem trilha própria, aula e exercício entram nas trilhas publicadas.
  const publicadas = !pode("trilhas.create_trilha");

  function criado(texto: string, trilha: number | null) {
    setModo(null);
    setAviso({ texto, trilha });
    aoCriar();
  }

  const algum = ["trilhas.create_trilha", "trilhas.create_aula", "trilhas.create_exercicio"];
  if (!algum.some(pode)) return null;

  return (
    // Moldura do destaque das trilhas (CartaoDestaque). Div, não section: o
    // painel não ganha uma região a mais.
    <div className="animate-surgir flex flex-col items-start gap-5 border-[3px] border-brand bg-panel p-6 shadow-frame sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-brand px-3 py-1.5 font-label text-[11px] tracking-[2px] text-void uppercase">
          Criação rápida
        </span>
        <span className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
          Tudo nasce em rascunho
        </span>
      </div>
      <div role="group" aria-label="Criar conteúdo" className="flex flex-wrap justify-start gap-4">
        {pode("trilhas.create_trilha") ? (
          <BotaoComDica rotulo="+ NOVA TRILHA" dica={DICAS.trilha} href="/autoria/novo" />
        ) : null}
        {pode("trilhas.create_aula") ? (
          <BotaoComDica
            rotulo="+ NOVA AULA"
            dica={DICAS.aula}
            onClick={() => setModo("aula")}
          />
        ) : null}
        {pode("trilhas.create_exercicio") ? (
          <BotaoComDica
            rotulo="+ NOVO EXERCÍCIO"
            dica={DICAS.exercicio}
            onClick={() => setModo("exercicio")}
          />
        ) : null}
      </div>
      {aviso ? (
        <p role="status" className={`m-0 text-success ${TIPO.corpo}`}>
          {aviso.texto}{" "}
          {aviso.trilha !== null ? (
            <Link
              href={`/autoria/novo?trilha_id=${aviso.trilha}`}
              className="text-brand-light underline underline-offset-4"
            >
              Abrir a trilha
            </Link>
          ) : null}
        </p>
      ) : null}
      {modo ? (
        <ModalConfirmacao
          rotulo="CRIAÇÃO RÁPIDA"
          titulo={modo === "aula" ? "Nova aula" : "Novo exercício"}
          onFechar={() => setModo(null)}
        >
          <ConteudoDoModal
            modo={modo}
            publicadas={publicadas}
            // A trilha publicada é de outro: não há editor dela para abrir.
            aoCriar={(texto, trilha) => criado(texto, publicadas ? null : trilha)}
          />
        </ModalConfirmacao>
      ) : null}
    </div>
  );
}

type TrilhaAlvo = { id: number; titulo: string; slug?: string };

function ConteudoDoModal({
  modo,
  publicadas,
  aoCriar,
}: {
  modo: Modo;
  /** Lista as trilhas publicadas do sistema em vez dos rascunhos do autor. */
  publicadas: boolean;
  aoCriar: (texto: string, trilha: number) => void;
}) {
  const id = useId();
  const [trilhas, setTrilhas] = useState<TrilhaAlvo[] | null>(null);
  const [trilha, setTrilha] = useState<number | null>(null);
  const [aulas, setAulas] = useState<{ id: number; titulo: string }[] | null>(null);
  const [aula, setAula] = useState<number | null>(null);
  const [tipo, setTipo] = useState<TipoNovo>("TEORICO");
  const [erro, setErro] = useState<string | null>(null);
  // Troca rápida de trilha: a leitura que chega atrasada é descartada.
  const pedido = useRef(0);

  useEffect(() => {
    let ativo = true;
    // A lista de rascunhos só traz trilhas: é exatamente o que dá para vincular.
    // O catálogo público só traz publicadas, o que o backend aceita de terceiros.
    const carga: Promise<TrilhaAlvo[]> = publicadas
      ? listarTrilhas().then((l) => l.map((t) => ({ id: t.id, titulo: t.nome, slug: t.slug })))
      : api.autoriaRascunhos();
    carga
      .then((lista) => {
        if (ativo) setTrilhas(lista);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDe(e));
      });
    return () => {
      ativo = false;
    };
  }, [publicadas]);

  async function escolherTrilha(valor: string) {
    const escolhida = valor ? Number(valor) : null;
    setTrilha(escolhida);
    setAula(null);
    setAulas(null);
    if (modo !== "exercicio" || escolhida === null) return;
    const meu = ++pedido.current;
    const slug = trilhas?.find((t) => t.id === escolhida)?.slug;
    try {
      // Na publicada, o detalhe do catálogo já traz só as aulas no ar.
      const lida = slug
        ? await buscarTrilha(slug)
        : await api.detalheEditorial("trilhas", escolhida);
      if (meu === pedido.current) setAulas("aulas" in lida ? lida.aulas : []);
    } catch (e) {
      if (meu === pedido.current) setErro(mensagemDe(e));
    }
  }

  const nomeDaTrilha = trilhas?.find((t) => t.id === trilha)?.titulo ?? "";

  if (trilhas !== null && trilhas.length === 0) {
    return (
      <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
        {publicadas
          ? "Ainda não há trilha publicada para vincular."
          : `Você não tem trilha em rascunho. Crie uma trilha primeiro para vincular ${
              modo === "aula" ? "a aula" : "o exercício"
            }.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PixelSelect
        id={`${id}-trilha`}
        rotulo="VINCULAR À TRILHA"
        value={trilha === null ? "" : String(trilha)}
        disabled={trilhas === null}
        onChange={escolherTrilha}
        placeholder={trilhas === null ? "Carregando..." : "Escolha uma trilha"}
        opcoes={(trilhas ?? []).map((t) => ({ valor: String(t.id), rotulo: t.titulo }))}
      />

      {modo === "exercicio" && trilha !== null ? (
        <>
          <PixelSelect
            id={`${id}-aula`}
            rotulo="VINCULAR À AULA"
            value={aula === null ? "" : String(aula)}
            disabled={aulas === null || aulas.length === 0}
            onChange={(v) => setAula(v ? Number(v) : null)}
            placeholder={
              aulas === null
                ? "Carregando..."
                : aulas.length === 0
                  ? "Esta trilha ainda não tem aula"
                  : "Escolha uma aula"
            }
            opcoes={(aulas ?? []).map((a) => ({ valor: String(a.id), rotulo: a.titulo }))}
          />
          <div role="group" aria-label="Tipo do exercício" className="flex flex-wrap gap-2">
            {/* Quiz entra direto na aula, sem revisão: só na aula própria em rascunho. */}
            {TIPOS.filter(([valor]) => !publicadas || valor !== "MULTIPLA").map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={tipo === valor}
                onClick={() => setTipo(valor)}
                className={`cursor-pointer border-2 px-4 py-3 font-label text-[11px] tracking-[2px] uppercase shadow-pixel transition-colors duration-150 ${
                  tipo === valor
                    ? "border-brand-light bg-brand-deep text-ink"
                    : "border-edge-soft bg-transparent text-ink-muted hover:border-brand hover:text-ink-soft"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {modo === "aula" && trilha !== null ? (
        <FormAulaRapida
          trilha={trilha}
          aoCriar={(titulo) => aoCriar(`Aula "${titulo}" criada em ${nomeDaTrilha}.`, trilha)}
        />
      ) : null}

      {modo === "exercicio" && trilha !== null && aula !== null ? (
        tipo === "MULTIPLA" ? (
          <FormQuestao
            key={`${tipo}-${aula}`}
            aula={aula}
            aoCriar={() => aoCriar(`Quiz criado em ${nomeDaTrilha}.`, trilha)}
          />
        ) : (
          <FormTeorico
            key={`${tipo}-${aula}`}
            aula={aula}
            codigo={tipo === "CODIGO"}
            aoCriar={(ex) => aoCriar(`Exercício "${ex.titulo}" criado em ${nomeDaTrilha}.`, trilha)}
          />
        )
      ) : null}

      {erro ? (
        <p role="alert" className="m-0 font-body text-base text-danger">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

// Versão enxuta do formulário de aula do editor: sem moldura nem prévia, que
// não cabem no modal. Flashcards e exercícios da aula seguem no editor.
function FormAulaRapida({
  trilha,
  aoCriar,
}: {
  trilha: number;
  aoCriar: (titulo: string) => void;
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
      const aula = await api.criarAula({ trilha, titulo: titulo.trim(), conteudo });
      aoCriar(aula.titulo);
    } catch (e) {
      setErro(mensagemDe(e));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} aria-label="Nova aula" className="flex flex-col gap-5">
      <PixelField
        rotulo="TÍTULO DA AULA"
        value={titulo}
        maxLength={120}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <AreaDeTexto
        id={`aula-rapida-${trilha}`}
        rotulo="TEXTO (MARKDOWN)"
        markdown
        rows={8}
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
      />
      {erro ? (
        <p role="alert" className="m-0 font-body text-base text-danger">
          {erro}
        </p>
      ) : null}
      <PixelButton
        type="submit"
        className="self-end"
        disabled={enviando || !titulo.trim() || !conteudo.trim()}
      >
        {enviando ? "SALVANDO..." : "CRIAR AULA"}
      </PixelButton>
    </form>
  );
}
