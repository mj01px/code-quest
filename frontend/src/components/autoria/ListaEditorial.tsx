"use client";

import { useEffect, useState } from "react";

import { ErroApi } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { ItemEditorial, TipoConteudo } from "@/lib/types";

const ROTULO_TIPO: Record<TipoConteudo, string> = {
  trilhas: "TRILHA",
  aulas: "AULA",
  exercicios: "EXERCÍCIO",
};

const BOTAO =
  "cursor-pointer border-2 border-brand-light bg-brand-deep px-4 py-2 font-label text-[11px] tracking-[2px] text-ink uppercase transition duration-150 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60";

export interface AcaoEditorial {
  rotulo: string;
  executar: (tipo: TipoConteudo, id: number) => Promise<unknown>;
  /** Avisa o painel que o item foi parar em outra fila. */
  depois?: () => void;
}

interface Props {
  titulo: string;
  vazio: string;
  /** Referência estável (ex.: `api.autoriaRascunhos`); uma arrow nova a cada render refaz o fetch em laço. */
  carregar: () => Promise<ItemEditorial[]>;
  acoes: AcaoEditorial[];
}

// O id só é único dentro do tipo: trilha 3 e aula 3 convivem na mesma fila.
const chave = (item: ItemEditorial) => `${item.tipo}-${item.id}`;

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof ErroApi ? erro.message : padrao;
}

// Base das duas filas: busca a lista ao montar e tira da tela o item que a
// ação moveu. Recarregar é com `key` no painel, não com efeito aqui dentro.
export function ListaEditorial({ titulo, vazio, carregar, acoes }: Props) {
  const [itens, setItens] = useState<ItemEditorial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

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

  async function agir(item: ItemEditorial, acao: AcaoEditorial) {
    setOcupado(chave(item));
    setErro(null);
    try {
      await acao.executar(item.tipo, item.id);
      setItens((atual) => atual.filter((i) => chave(i) !== chave(item)));
      acao.depois?.();
    } catch (e) {
      setErro(mensagemDe(e, "Não foi possível concluir a ação."));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <section aria-label={titulo} className="flex flex-col gap-4">
      <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>{titulo}</h2>

      {erro ? (
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
        erro ? null : <p className={`m-0 text-ink-dim ${TIPO.corpo}`}>{vazio}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {itens.map((item) => (
            <li
              key={chave(item)}
              className="flex flex-wrap items-center gap-4 border-2 border-edge bg-panel p-4 shadow-pixel"
            >
              <span className="min-w-0 flex-1">
                <span className={`block text-brand-light ${TIPO.etiqueta}`}>
                  {ROTULO_TIPO[item.tipo]}
                </span>
                <span className={`block truncate text-ink ${TIPO.corpo}`}>
                  {item.titulo}
                </span>
              </span>
              <span className="flex gap-2">
                {acoes.map((acao) => (
                  <button
                    key={acao.rotulo}
                    type="button"
                    disabled={ocupado !== null}
                    onClick={() => agir(item, acao)}
                    aria-label={`${acao.rotulo}: ${item.titulo}`}
                    className={BOTAO}
                  >
                    {acao.rotulo}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
