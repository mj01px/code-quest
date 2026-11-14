"use client";

import Link from "next/link";

import { AcoesRascunho, BOTAO_ICONE } from "@/components/autoria/AcoesRascunho";
import { ListaEditorial } from "@/components/autoria/ListaEditorial";
import { IconeLapis } from "@/components/ui/Icone";
import { api } from "@/lib/api";

// O que a revisão aprovou volta para o autor acompanhar. Só quem tem
// `trilhas.publish` (a administração) vê o botão Publicar; para o autor a lista
// é de leitura. A trilha também abre
// no editor, onde dá para ver o que ainda falta antes de publicar. Aprovado não
// se edita (só rascunho), mas se exclui: `aoAlterar` liga a lixeira e o painel
// recarrega a lista.
export function ListaAprovados({
  aoAlterar,
  aoContar,
  podePublicar = false,
}: {
  aoAlterar?: () => void;
  /** Total da lista, para o resumo do painel. */
  aoContar?: (total: number) => void;
  /** Permissão trilhas.publish: sem ela o botão Publicar não aparece. */
  podePublicar?: boolean;
}) {
  return (
    <>
      {podePublicar ? null : (
        <p className="font-body text-sm text-ink-muted">
          O conteúdo aprovado será publicado pela administração.
        </p>
      )}
      <ListaEditorial
        titulo="Prontos para publicar"
        status="APROVADO"
        aoContar={aoContar}
        carregar={api.autoriaAprovados}
        acoes={
          podePublicar
            ? [{ rotulo: "Publicar", executar: api.publicarConteudo }]
            : []
        }
        extras={(item) => (
          <>
            {item.tipo === "trilhas" ? (
              <Link
                href={`/autoria/novo?trilha_id=${item.id}`}
                aria-label={`Abrir no editor: ${item.titulo}`}
                className={BOTAO_ICONE}
              >
                <IconeLapis className="h-4 w-4" />
              </Link>
            ) : null}
            {aoAlterar ? (
              <AcoesRascunho item={item} aoAlterar={aoAlterar} soExcluir />
            ) : null}
          </>
        )}
      />
    </>
  );
}
