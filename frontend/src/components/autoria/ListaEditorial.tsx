"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { AreaDeTexto } from "@/components/autoria/AreaDeTexto";
import { ModalVisualizacao } from "@/components/autoria/ModalVisualizacao";
import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { IconeCheck } from "@/components/ui/Icone";
import { ErroApi } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { ItemEditorial, StatusEditorial, TipoConteudo } from "@/lib/types";

const ROTULO_TIPO: Record<TipoConteudo, string> = {
  trilhas: "TRILHA",
  aulas: "AULA",
  exercicios: "EXERCÍCIO",
};

// Cor de cada status, na borda do card e na moldura da seção que o lista:
// o autor reconhece a fila de relance, sem ler o título. Classes literais: o
// Tailwind só gera o que encontra escrito por inteiro no código.
const COR_STATUS: Record<
  StatusEditorial,
  { secao: string; card: string; selo: string }
> = {
  RASCUNHO: {
    secao: "border-t-brand",
    card: "border-l-brand",
    selo: "border-brand text-brand-light",
  },
  REVISAO: {
    secao: "border-t-warning",
    card: "border-l-warning",
    selo: "border-warning text-warning",
  },
  APROVADO: {
    secao: "border-t-success",
    card: "border-l-success",
    selo: "border-success text-success",
  },
  PUBLICADO: {
    secao: "border-t-brand-light",
    card: "border-l-brand-light",
    selo: "border-brand-light text-brand-light",
  },
};

const BOTAO =
  "cursor-pointer border-2 border-brand-light bg-brand-deep px-4 py-2 font-label text-[11px] tracking-[2px] text-ink uppercase transition duration-150 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60";

export interface AcaoEditorial {
  rotulo: string;
  // Sintaxe de método: aceita `api.devolverConteudo`, que exige o motivo.
  executar(tipo: TipoConteudo, id: number, motivo?: string): Promise<unknown>;
  /** Avisa o painel que o item foi parar em outra fila. */
  depois?: () => void;
  /** Com ele, a ação abre um modal pedindo o motivo antes de executar. */
  pedirMotivo?: string;
}

interface Props {
  titulo: string;
  vazio: string;
  /** Status que a lista mostra: dá a cor da seção e dos cards. */
  status: StatusEditorial;
  /** Referência estável (ex.: `api.autoriaRascunhos`); uma arrow nova a cada render refaz o fetch em laço. */
  carregar: () => Promise<ItemEditorial[]>;
  acoes: AcaoEditorial[];
  /** Botões a mais por item, depois das ações (ex.: editar e excluir rascunho). */
  extras?: (item: ItemEditorial) => ReactNode;
  /** Com ele, o título vira link para essa rota em vez de abrir o modal de leitura. */
  hrefDoItem?: (item: ItemEditorial) => string;
}

// O id só é único dentro do tipo: trilha 3 e aula 3 convivem na mesma fila.
const chave = (item: ItemEditorial) => `${item.tipo}-${item.id}`;

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof ErroApi ? erro.message : padrao;
}

// Base das duas filas: busca a lista ao montar e tira da tela o item que a
// ação moveu. Recarregar é com `key` no painel, não com efeito aqui dentro.
export function ListaEditorial({
  titulo,
  vazio,
  status,
  carregar,
  acoes,
  extras,
  hrefDoItem,
}: Props) {
  const [itens, setItens] = useState<ItemEditorial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aberto, setAberto] = useState<ItemEditorial | null>(null);
  const [pedindo, setPedindo] = useState<{
    item: ItemEditorial;
    acao: AcaoEditorial;
  } | null>(null);
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    let ativo = true;
    carregar()
      .then((lista) => {
        if (ativo) setItens(lista);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDe(e, "Não foi possível carregar a lista."));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [carregar]);

  // Devolve se deu certo: o modal só fecha no sucesso, para o erro aparecer nele.
  async function agir(
    item: ItemEditorial,
    acao: AcaoEditorial,
    motivoDado?: string,
  ): Promise<boolean> {
    setOcupado(chave(item));
    setErro(null);
    try {
      await (motivoDado === undefined
        ? acao.executar(item.tipo, item.id)
        : acao.executar(item.tipo, item.id, motivoDado));
      setItens((atual) => atual.filter((i) => chave(i) !== chave(item)));
      acao.depois?.();
      return true;
    } catch (e) {
      setErro(mensagemDe(e, "Não foi possível concluir a ação."));
      return false;
    } finally {
      setOcupado(null);
    }
  }

  // A ação que pede motivo troca o modal de visualização pelo do motivo: dois
  // modais empilhados disputariam o Esc e o foco.
  function iniciar(item: ItemEditorial, acao: AcaoEditorial) {
    if (!acao.pedirMotivo) return agir(item, acao);
    setAberto(null);
    setErro(null);
    setMotivo("");
    setPedindo({ item, acao });
  }

  async function agirNoModal(item: ItemEditorial, indice: number) {
    const acao = acoes[indice];
    if (acao.pedirMotivo) iniciar(item, acao);
    else if (await agir(item, acao)) setAberto(null);
  }

  async function confirmarMotivo() {
    if (!pedindo) return;
    if (await agir(pedindo.item, pedindo.acao, motivo.trim())) setPedindo(null);
  }

  function fecharModal() {
    setAberto(null);
    setPedindo(null);
    // O erro de uma ação feita no modal não vale para a lista.
    setErro(null);
  }

  const cor = COR_STATUS[status];

  return (
    <section
      aria-label={titulo}
      className={`flex min-w-0 flex-col gap-4 border-2 border-t-4 border-edge bg-panel-deep p-4 shadow-pixel sm:p-5 ${cor.secao}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>{titulo}</h2>
        {carregando ? null : (
          <span
            aria-label={`${itens.length} ${itens.length === 1 ? "item" : "itens"}`}
            className={`border-2 px-2 py-0.5 ${cor.selo} ${TIPO.etiqueta}`}
          >
            {itens.length}
          </span>
        )}
      </div>

      {erro && !aberto && !pedindo ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : null}

      {carregando ? (
        <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>
          &gt; CARREGANDO...
        </p>
      ) : itens.length === 0 ? (
        // Lista que não carregou não está vazia: o alerta acima já explica.
        erro ? null : (
          <div className="flex flex-col items-center gap-3 border-2 border-dashed border-edge-soft px-4 py-8 text-center">
            <span
              className={`flex h-12 w-12 items-center justify-center border-2 ${cor.selo}`}
            >
              <IconeCheck className="h-6 w-6" />
            </span>
            <p className={`m-0 text-ink ${TIPO.etiqueta}`}>TUDO EM DIA!</p>
            <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>{vazio}</p>
          </div>
        )
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {itens.map((item) => (
            <li
              key={chave(item)}
              className={`flex flex-col gap-3 border-2 border-l-4 border-edge bg-panel p-4 ${cor.card}`}
            >
              <span className="min-w-0">
                <span className={`block text-brand-light ${TIPO.etiqueta}`}>
                  {ROTULO_TIPO[item.tipo]}
                  {item.status_editorial === "APROVADO" ? (
                    <span className="ml-2 border-2 border-success px-1.5 py-0.5 text-success">
                      APROVADO
                    </span>
                  ) : null}
                </span>
                {hrefDoItem ? (
                  <Link
                    href={hrefDoItem(item)}
                    aria-label={`Abrir no editor: ${item.titulo}`}
                    className={`block max-w-full truncate text-left text-ink underline decoration-brand-shadow underline-offset-4 hover:decoration-brand-light ${TIPO.corpo}`}
                  >
                    {item.titulo}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAberto(item)}
                    aria-label={`Ver conteúdo: ${item.titulo}`}
                    className={`block max-w-full cursor-pointer truncate text-left text-ink underline decoration-brand-shadow underline-offset-4 hover:decoration-brand-light ${TIPO.corpo}`}
                  >
                    {item.titulo}
                  </button>
                )}
                {item.criado_por ? (
                  <span className={`mt-1 block break-words text-ink-muted ${TIPO.etiqueta}`}>
                    CRIADO POR: {item.criado_por}
                  </span>
                ) : null}
                {item.status_editorial === "RASCUNHO" && item.parecer ? (
                  <span
                    role="note"
                    aria-label="Motivo da devolução"
                    className={`mt-2 block border-2 border-danger-deep bg-panel-soft px-3 py-2 text-danger ${TIPO.corpo}`}
                  >
                    <span className={`block ${TIPO.etiqueta}`}>DEVOLVIDO PELA REVISÃO</span>
                    <span className="block whitespace-pre-wrap">{item.parecer}</span>
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {acoes.map((acao) => (
                  <button
                    key={acao.rotulo}
                    type="button"
                    disabled={ocupado !== null}
                    onClick={() => iniciar(item, acao)}
                    aria-label={`${acao.rotulo}: ${item.titulo}`}
                    className={BOTAO}
                  >
                    {acao.rotulo}
                  </button>
                ))}
                {extras?.(item)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {aberto ? (
        <ModalVisualizacao
          item={aberto}
          rotulo={ROTULO_TIPO[aberto.tipo]}
          acoes={acoes}
          ocupado={ocupado !== null}
          erro={erro}
          onAgir={(indice) => agirNoModal(aberto, indice)}
          onFechar={fecharModal}
        />
      ) : null}

      {pedindo ? (
        <ModalConfirmacao
          rotulo={ROTULO_TIPO[pedindo.item.tipo]}
          titulo={`${pedindo.acao.rotulo}: ${pedindo.item.titulo}`}
          textoConfirmar={pedindo.acao.rotulo.toUpperCase()}
          perigo
          carregando={ocupado !== null}
          confirmarDesabilitado={motivo.trim() === ""}
          erro={erro}
          onConfirmar={confirmarMotivo}
          onFechar={fecharModal}
        >
          <AreaDeTexto
            id="motivo-acao-editorial"
            rotulo={pedindo.acao.pedirMotivo ?? ""}
            maxLength={1000}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </ModalConfirmacao>
      ) : null}
    </section>
  );
}
