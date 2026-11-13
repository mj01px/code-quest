"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { AreaDeTexto } from "@/components/autoria/AreaDeTexto";
import { ModalVisualizacao } from "@/components/autoria/ModalVisualizacao";
import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { Badge } from "@/components/ui/Badge";
import { ErroApi } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { ItemEditorial, StatusEditorial, TipoConteudo } from "@/lib/types";

export const ROTULO_TIPO: Record<TipoConteudo, string> = {
  trilhas: "TRILHA",
  aulas: "AULA",
  exercicios: "EXERCÍCIO",
};

// Cor de cada status, no quadro numerado da seção e na marca de cada linha:
// o autor reconhece a fila de relance, sem ler o título. Classes literais: o
// Tailwind só gera o que encontra escrito por inteiro no código.
export const COR_STATUS: Record<StatusEditorial, { selo: string; texto: string }> = {
  RASCUNHO: { selo: "border-brand text-brand-light", texto: "text-brand-light" },
  REVISAO: { selo: "border-warning text-warning", texto: "text-warning" },
  APROVADO: { selo: "border-success text-success", texto: "text-success" },
  PUBLICADO: { selo: "border-brand-light text-brand-light", texto: "text-brand-light" },
};
export type CorStatus = (typeof COR_STATUS)[StatusEditorial];

// Marca de duas letras do tipo, no quadro de cada linha, como LI e QZ na trilha.
export const MARCA_TIPO: Record<TipoConteudo, string> = {
  trilhas: "TR",
  aulas: "AU",
  exercicios: "EX",
};

// Moldura e linha do módulo da trilha (AulaCard): a autoria lê como o catálogo.
export const MOLDURA = "flex min-w-0 flex-col border-2 border-edge bg-panel";
export const LINHA = "flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6";
export const MARCA =
  "flex h-8 w-8 shrink-0 items-center justify-center border-2 bg-panel-deep font-display text-[8px]";

// Botão de ação da linha: o mesmo afundar de sombra dos botões das trilhas.
export const BOTAO_ACAO =
  "inline-flex cursor-pointer items-center border-2 border-brand-light bg-brand-deep px-4 py-2 font-label text-[11px] tracking-[2px] text-ink uppercase shadow-pixel transition duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-brand-strong hover:shadow-pixel-sm disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:bg-brand-deep disabled:hover:shadow-pixel";

// Título do item: link para o editor ou botão que abre a leitura.
const TITULO =
  "block max-w-full cursor-pointer truncate text-left font-body text-base tracking-[1px] text-ink underline decoration-brand-shadow underline-offset-4 transition-colors duration-150 hover:decoration-brand-light";

/** Cabeçalho da seção: quadro com o total, como o número do módulo na trilha. */
export function CabecalhoDaLista({
  titulo,
  total,
  cor,
}: {
  titulo: string;
  /** null enquanto carrega: o quadro fica vazio. */
  total: number | null;
  cor: CorStatus;
}) {
  return (
    <div className="flex items-center gap-5 p-5 sm:px-6">
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 shrink-0 items-center justify-center border-2 bg-panel-deep font-display text-[12px] ${cor.selo}`}
      >
        {total === null ? "" : String(total).padStart(2, "0")}
      </span>
      <h2 className="m-0 min-w-0 flex-1 font-label text-[12px] tracking-[2px] text-ink uppercase">
        {titulo}
      </h2>
      {total === null ? null : (
        <span
          className={`shrink-0 font-label text-[11px] tracking-[2px] uppercase ${cor.texto}`}
        >
          {total} {total === 1 ? "item" : "itens"}
        </span>
      )}
    </div>
  );
}

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
  /** Status que a lista mostra: dá a cor da seção e dos cards. */
  status: StatusEditorial;
  /** Referência estável (ex.: `api.autoriaRascunhos`); uma arrow nova a cada render refaz o fetch em laço. */
  carregar: () => Promise<ItemEditorial[]>;
  acoes: AcaoEditorial[];
  /** Botões a mais por item, depois das ações (ex.: editar e excluir rascunho). */
  extras?: (item: ItemEditorial) => ReactNode;
  /** Com ele, o título vira link para essa rota em vez de abrir o modal de leitura. */
  hrefDoItem?: (item: ItemEditorial) => string;
  /** Recebe o total a cada carga e a cada item que sai; o painel monta o resumo com ele. */
  aoContar?: (total: number) => void;
}

// O id só é único dentro do tipo: trilha 3 e aula 3 convivem na mesma fila.
const chave = (item: ItemEditorial) => `${item.tipo}-${item.id}`;

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof ErroApi ? erro.message : padrao;
}

// Base das filas: busca a lista ao montar e tira da tela o item que a ação
// moveu. Recarregar é com `key` no painel, não com efeito aqui dentro. Vazia,
// some: o painel mostra o total dela no resumo do topo.
export function ListaEditorial({
  titulo,
  status,
  carregar,
  acoes,
  extras,
  hrefDoItem,
  aoContar,
}: Props) {
  const [itens, setItens] = useState<ItemEditorial[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Lista que falhou ao carregar não está vazia: não conta para o resumo.
  const [carregou, setCarregou] = useState(false);
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
        if (!ativo) return;
        setItens(lista);
        setCarregou(true);
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

  // Sincroniza com o painel, que é outro componente: não dá para derivar lá.
  useEffect(() => {
    if (carregou) aoContar?.(itens.length);
  }, [carregou, itens, aoContar]);

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

  if (carregou && itens.length === 0) return null;

  return (
    <section aria-label={titulo} className={MOLDURA}>
      <CabecalhoDaLista titulo={titulo} total={carregando ? null : itens.length} cor={cor} />

      {erro && !aberto && !pedindo ? (
        <p
          role="alert"
          className="m-0 border-t-2 border-danger-deep bg-panel-soft px-5 py-3 font-body text-base leading-[1.6] tracking-wide text-danger sm:px-6"
        >
          {erro}
        </p>
      ) : null}

      {carregando ? (
        <p className={`m-0 border-t-2 border-edge px-5 py-4 text-brand-light sm:px-6 ${TIPO.etiqueta}`}>
          &gt; CARREGANDO...
        </p>
      ) : itens.length === 0 ? null : (
        // O `null` acima é a carga que falhou: o alerta já explica.
        <ul className="m-0 list-none divide-y-2 divide-edge border-t-2 border-edge p-0">
          {itens.map((item) => (
            <li key={chave(item)} className={LINHA}>
              <span aria-hidden="true" className={`${MARCA} ${cor.selo}`}>
                {MARCA_TIPO[item.tipo]}
              </span>
              <span className="min-w-0 flex-1 basis-48">
                {hrefDoItem ? (
                  <Link
                    href={hrefDoItem(item)}
                    aria-label={`Abrir no editor: ${item.titulo}`}
                    className={TITULO}
                  >
                    {item.titulo}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAberto(item)}
                    aria-label={`Ver conteúdo: ${item.titulo}`}
                    className={TITULO}
                  >
                    {item.titulo}
                  </button>
                )}
                {item.criado_por ? (
                  <span className={`mt-1 block break-words text-ink-muted ${TIPO.etiqueta}`}>
                    CRIADO POR: {item.criado_por}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge>{ROTULO_TIPO[item.tipo]}</Badge>
                {item.status_editorial === "APROVADO" ? <Badge tom="sucesso">APROVADO</Badge> : null}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {acoes.map((acao) => (
                  <button
                    key={acao.rotulo}
                    type="button"
                    disabled={ocupado !== null}
                    onClick={() => iniciar(item, acao)}
                    aria-label={`${acao.rotulo}: ${item.titulo}`}
                    className={BOTAO_ACAO}
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
