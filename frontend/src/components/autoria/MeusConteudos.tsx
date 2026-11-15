"use client";

import { useEffect, useState } from "react";

import { AcoesRascunho } from "@/components/autoria/AcoesRascunho";
import {
  COR_STATUS,
  CabecalhoDaLista,
  LINHA,
  MARCA,
  MARCA_TIPO,
  MOLDURA,
  ROTULO_TIPO,
} from "@/components/autoria/ListaEditorial";
import { Badge, type TomBadge } from "@/components/ui/Badge";
import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { ItemEditorial, StatusEditorial } from "@/lib/types";

const STATUS: Record<StatusEditorial, { rotulo: string; tom: TomBadge }> = {
  RASCUNHO: { rotulo: "RASCUNHO", tom: "acento" },
  REVISAO: { rotulo: "EM REVISÃO", tom: "alerta" },
  APROVADO: { rotulo: "APROVADO", tom: "sucesso" },
  PUBLICADO: { rotulo: "PUBLICADO", tom: "neutro" },
};

// Tudo o que o usuário criou, em qualquer status. O backend filtra pelo dono
// da sessão; aqui só se lista. Monta só com a aba aberta, então cada visita
// busca de novo.
export function MeusConteudos({
  podeEditar,
  aoAlterar,
}: {
  /** Permissão trilhas.create: sem ela o lápis não aparece. */
  podeEditar: boolean;
  /** Editar o aprovado o leva para a fila: o painel recarrega as outras listas. */
  aoAlterar?: () => void;
}) {
  const [itens, setItens] = useState<ItemEditorial[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Editar muda o título e o status: relê a lista em vez de remendar aqui.
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    api
      .autoriaMeusConteudos()
      .then((lista) => {
        if (ativo) setItens(lista);
      })
      .catch((e: unknown) => {
        if (ativo)
          setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar seus conteúdos.");
      });
    return () => {
      ativo = false;
    };
  }, [versao]);

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

  if (!itens) {
    return <p className={`m-0 text-brand-light ${TIPO.etiqueta}`}>&gt; CARREGANDO...</p>;
  }

  return (
    <section aria-label="Meus conteúdos" className={MOLDURA}>
      <CabecalhoDaLista titulo="Meus conteúdos" total={itens.length} cor={COR_STATUS.RASCUNHO} />
      {itens.length === 0 ? (
        <p className={`m-0 border-t-2 border-edge px-5 py-4 text-ink-muted sm:px-6 ${TIPO.corpo}`}>
          Você ainda não criou nenhum conteúdo.
        </p>
      ) : (
        <ul className="m-0 list-none divide-y-2 divide-edge border-t-2 border-edge p-0">
          {itens.map((item) => (
            <li key={`${item.tipo}-${item.id}`} className={LINHA}>
              <span
                aria-hidden="true"
                className={`${MARCA} ${COR_STATUS[item.status_editorial].selo}`}
              >
                {MARCA_TIPO[item.tipo]}
              </span>
              <span className="min-w-0 flex-1 basis-48 font-body text-base tracking-[1px] text-ink">
                {item.titulo}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge>{ROTULO_TIPO[item.tipo]}</Badge>
                <Badge tom={STATUS[item.status_editorial].tom}>
                  {STATUS[item.status_editorial].rotulo}
                </Badge>
              </span>
              {/* Em revisão não se edita: o revisor está lendo. */}
              {podeEditar && item.status_editorial !== "REVISAO" ? (
                <span className="flex items-center gap-2">
                  <AcoesRascunho
                    item={item}
                    aoAlterar={() => {
                      setVersao((v) => v + 1);
                      aoAlterar?.();
                    }}
                    soEditar
                  />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
