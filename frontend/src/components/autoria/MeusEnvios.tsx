"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { COR_STATUS, ROTULO_TIPO } from "@/components/autoria/ListaEditorial";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { ExclusaoSofrida, MeusEnvios as Envios, TipoConteudo } from "@/lib/types";

const BOTAO =
  "inline-flex cursor-pointer items-center border-2 border-brand-light bg-brand-deep px-4 py-2 font-label text-[11px] tracking-[2px] text-ink uppercase transition-colors duration-150 hover:bg-brand-strong";

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

function Secao({
  titulo,
  total,
  cor,
  vazio,
  children,
}: {
  titulo: string;
  total: number;
  /** Classes de borda do topo e do selo (literais, para o Tailwind gerar). */
  cor: { secao: string; selo: string };
  vazio: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={titulo}
      className={`flex min-w-0 flex-col gap-4 border-2 border-t-4 border-edge bg-panel-deep p-4 shadow-pixel sm:p-5 ${cor.secao}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className={`m-0 text-ink ${TIPO.tituloSecao}`}>{titulo}</h2>
        <span className={`border-2 px-2 py-0.5 ${cor.selo} ${TIPO.etiqueta}`}>{total}</span>
      </div>
      {total === 0 ? <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>{vazio}</p> : children}
    </section>
  );
}

const DEVOLVIDO = { secao: "border-t-danger", selo: "border-danger text-danger" };
const EXCLUIDO = { secao: "border-t-edge-soft", selo: "border-edge-soft text-ink-muted" };

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
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {envios.em_revisao.map((item) => (
            <li
              key={`${item.tipo}-${item.id}`}
              className={`flex flex-col gap-1 border-2 border-l-4 border-edge bg-panel p-4 ${COR_STATUS.REVISAO.card}`}
            >
              <span className={`text-brand-light ${TIPO.etiqueta}`}>{ROTULO_TIPO[item.tipo]}</span>
              <span className={`text-ink ${TIPO.corpo}`}>{item.titulo}</span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao
        titulo="Devolvidos para Correção"
        total={envios.devolvidos.length}
        cor={DEVOLVIDO}
        vazio="Nada devolvido. Quando a revisão pedir ajustes, eles aparecem aqui."
      >
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {envios.devolvidos.map((item) => (
            <li
              key={`${item.tipo}-${item.id}`}
              className="flex flex-col gap-3 border-2 border-l-4 border-edge border-l-danger bg-panel p-4"
            >
              <span className={`text-brand-light ${TIPO.etiqueta}`}>{ROTULO_TIPO[item.tipo]}</span>
              <span className={`text-ink ${TIPO.corpo}`}>{item.titulo}</span>
              <span
                role="note"
                aria-label="Motivo da devolução"
                className={`border-2 border-danger-deep bg-panel-soft px-3 py-2 text-danger ${TIPO.corpo}`}
              >
                <span className={`block ${TIPO.etiqueta}`}>DEVOLVIDO PELA REVISÃO</span>
                <span className="block whitespace-pre-wrap">{item.parecer}</span>
              </span>
              <Link
                href={`/autoria/novo?trilha_id=${item.id}`}
                aria-label={`Corrigir Rascunho: ${item.titulo}`}
                className={`${BOTAO} self-start`}
              >
                Corrigir Rascunho
              </Link>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao
        titulo="Histórico de Exclusão"
        total={envios.excluidos.length}
        cor={EXCLUIDO}
        vazio="Nenhum conteúdo seu foi excluído."
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {envios.excluidos.map((exclusao) => (
            <li
              key={`${exclusao.excluido_em}-${exclusao.tipo}-${exclusao.titulo}`}
              className={`flex flex-col gap-1 border-b-2 border-edge pb-2 last:border-b-0 last:pb-0 ${TIPO.corpo}`}
            >
              <span className="text-ink">{frase(exclusao)}</span>
              <time
                dateTime={exclusao.excluido_em}
                className={`text-ink-muted ${TIPO.etiqueta}`}
              >
                {new Date(exclusao.excluido_em).toLocaleDateString("pt-BR")}
              </time>
            </li>
          ))}
        </ul>
      </Secao>
    </div>
  );
}
