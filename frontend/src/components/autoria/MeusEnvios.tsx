"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import {
  BOTAO_ACAO,
  COR_STATUS,
  CabecalhoDaLista,
  LINHA,
  MARCA,
  MARCA_TIPO,
  MOLDURA,
  ROTULO_TIPO,
  type CorStatus,
} from "@/components/autoria/ListaEditorial";
import { Badge } from "@/components/ui/Badge";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { ExclusaoSofrida, MeusEnvios as Envios, TipoConteudo } from "@/lib/types";

const POSSESSIVO: Record<TipoConteudo, string> = {
  trilhas: "sua trilha",
  aulas: "sua aula",
  exercicios: "seu exercício",
};

function frase({ tipo, titulo, motivo, excluido_por }: ExclusaoSofrida): string {
  const quem = excluido_por ? `O admin ${excluido_por}` : "Um administrador";
  const oque = titulo ? `${POSSESSIVO[tipo]} "${titulo}"` : POSSESSIVO[tipo];
  return motivo
    ? `${quem} excluiu ${oque} pelo motivo: ${motivo}`
    : `${quem} excluiu ${oque} sem informar o motivo.`;
}

// Mesma moldura das listas do painel (e do módulo da trilha): cabeçalho com o
// total no quadro e uma linha por item.
function Secao({
  titulo,
  total,
  cor,
  vazio,
  children,
}: {
  titulo: string;
  total: number;
  cor: CorStatus;
  vazio: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={titulo} className={MOLDURA}>
      <CabecalhoDaLista titulo={titulo} total={total} cor={cor} />
      {total === 0 ? (
        <p className={`m-0 border-t-2 border-edge px-5 py-4 text-ink-muted sm:px-6 ${TIPO.corpo}`}>
          {vazio}
        </p>
      ) : (
        <ul className="m-0 list-none divide-y-2 divide-edge border-t-2 border-edge p-0">
          {children}
        </ul>
      )}
    </section>
  );
}

// Devolvido no vermelho de perigo; excluído no cinza do que já saiu.
const DEVOLVIDO: CorStatus = { selo: "border-danger text-danger", texto: "text-danger" };
const EXCLUIDO: CorStatus = { selo: "border-edge-soft text-ink-muted", texto: "text-ink-muted" };

// A aba do retorno: o que espera revisão, o que voltou para corrigir e o que
// outra pessoa excluiu. Monta só com a aba aberta, então cada visita busca de
// novo e não precisa de recarga vinda das outras abas.
export function MeusEnvios() {
  const [envios, setEnvios] = useState<Envios | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .autoriaMeusEnvios()
      .then((dados) => {
        if (ativo) setEnvios(dados);
      })
      .catch((e: unknown) => {
        if (ativo)
          setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar seus envios.");
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (erro) {
    return (
      <p
        role="alert"
        className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base text-danger"
      >
        {erro}
      </p>
    );
  }

  if (!envios) {
    return <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; CARREGANDO...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Secao
        titulo="Aguardando Revisão"
        total={envios.em_revisao.length}
        cor={COR_STATUS.REVISAO}
        vazio="Nada esperando revisão no momento."
      >
        {envios.em_revisao.map((item) => (
          <li key={`${item.tipo}-${item.id}`} className={LINHA}>
            <span aria-hidden="true" className={`${MARCA} ${COR_STATUS.REVISAO.selo}`}>
              {MARCA_TIPO[item.tipo]}
            </span>
            <span className="min-w-0 flex-1 font-body text-base tracking-[1px] text-ink">
              {item.titulo}
            </span>
            <Badge>{ROTULO_TIPO[item.tipo]}</Badge>
          </li>
        ))}
      </Secao>

      <Secao
        titulo="Devolvidos para Correção"
        total={envios.devolvidos.length}
        cor={DEVOLVIDO}
        vazio="Nada devolvido. Quando a revisão pedir ajustes, eles aparecem aqui."
      >
        {envios.devolvidos.map((item) => (
          <li key={`${item.tipo}-${item.id}`} className={LINHA}>
            <span aria-hidden="true" className={`${MARCA} ${DEVOLVIDO.selo}`}>
              {MARCA_TIPO[item.tipo]}
            </span>
            <span className="min-w-0 flex-1 font-body text-base tracking-[1px] text-ink">
              {item.titulo}
            </span>
            <Badge>{ROTULO_TIPO[item.tipo]}</Badge>
            <span
              role="note"
              aria-label="Motivo da devolução"
              className={`basis-full border-2 border-danger-deep bg-panel-deep px-3 py-2 text-danger ${TIPO.corpo}`}
            >
              <span className={`block ${TIPO.etiqueta}`}>DEVOLVIDO PELA REVISÃO</span>
              <span className="block whitespace-pre-wrap">{item.parecer}</span>
            </span>
            {/* Devolvido é sempre trilha (o backend só lista trilhas aqui). */}
            <Link
              href={`/autoria/novo?trilha_id=${item.id}`}
              aria-label={`Corrigir Rascunho: ${item.titulo}`}
              className={BOTAO_ACAO}
            >
              Corrigir Rascunho
            </Link>
          </li>
        ))}
      </Secao>

      <Secao
        titulo="Histórico de Exclusão"
        total={envios.excluidos.length}
        cor={EXCLUIDO}
        vazio="Nenhum conteúdo seu foi excluído."
      >
        {envios.excluidos.map((exclusao) => (
          <li
            key={`${exclusao.excluido_em}-${exclusao.tipo}-${exclusao.titulo}`}
            className={LINHA}
          >
            <span aria-hidden="true" className={`${MARCA} ${EXCLUIDO.selo}`}>
              {MARCA_TIPO[exclusao.tipo]}
            </span>
            <span className={`min-w-0 flex-1 text-ink ${TIPO.corpo}`}>{frase(exclusao)}</span>
            <time
              dateTime={exclusao.excluido_em}
              className={`shrink-0 text-ink-muted ${TIPO.etiqueta}`}
            >
              {new Date(exclusao.excluido_em).toLocaleDateString("pt-BR")}
            </time>
          </li>
        ))}
      </Secao>
    </div>
  );
}
