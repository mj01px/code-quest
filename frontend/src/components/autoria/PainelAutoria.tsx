"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FilaRevisao } from "@/components/autoria/FilaRevisao";
import { ListaAprovados } from "@/components/autoria/ListaAprovados";
import { ListaRascunhos } from "@/components/autoria/ListaRascunhos";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { TIPO } from "@/lib/tipografia";

// Guarda de navegação, como no /admin: cada painel só aparece com a permissão
// da rota que ele consome. Quem barra de verdade é o backend (HasPerm).
export function PainelAutoria() {
  const router = useRouter();
  const { usuario, carregando } = useProgresso();
  // Submeter leva o item para a fila e devolver o traz de volta. Trocar a
  // `key` remonta a outra lista, que busca de novo.
  // ponytail: remontar descarta uma ação em voo na outra lista (resposta e
  // erro somem); só afeta quem tem as duas permissões e age nas duas ao mesmo
  // tempo. Subir `ocupado` para cá se isso aparecer.
  const [versaoRascunhos, setVersaoRascunhos] = useState(0);
  const [versaoFila, setVersaoFila] = useState(0);
  const [versaoAprovados, setVersaoAprovados] = useState(0);

  const permissoes = usuario?.permissoes ?? [];
  const podeSubmeter = permissoes.includes("trilhas.submit_review");
  const podeRevisar = permissoes.includes("trilhas.review");
  const podeCriar = permissoes.includes("trilhas.create");
  const temAcesso = podeSubmeter || podeRevisar;

  useEffect(() => {
    if (carregando) return;
    if (!usuario) router.replace("/entrar");
    else if (!temAcesso) router.replace("/trilhas");
  }, [carregando, usuario, temAcesso, router]);

  if (carregando || !usuario) {
    return (
      <p className="font-label text-[13px] tracking-[2px] text-brand-light">
        &gt; VERIFICANDO ACESSO...
      </p>
    );
  }

  if (!temAcesso) {
    return (
      <p className="font-label text-[13px] tracking-[2px] text-ink-muted">
        &gt; ACESSO RESTRITO. REDIRECIONANDO...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className={`text-brand ${TIPO.sobretitulo}`}>{"// AUTORIA"}</span>
          <h1 className={`m-0 text-ink ${TIPO.tituloPagina}`}>
            Fluxo editorial
          </h1>
          <p className={`m-0 text-ink-muted ${TIPO.corpo}`}>
            Envie rascunhos para revisão e aprove ou devolva o que chegou na fila.
          </p>
        </div>
        {podeCriar ? (
          <Link
            href="/autoria/novo"
            className="inline-flex items-center justify-center border-[3px] border-brand-light bg-brand-deep px-5 py-4 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)] hover:bg-brand-strong"
          >
            NOVO CONTEÚDO
          </Link>
        ) : null}
      </div>

      {podeSubmeter ? (
        <ListaRascunhos
          key={`rascunhos-${versaoRascunhos}`}
          aoSubmeter={() => setVersaoFila((v) => v + 1)}
          // Editar e excluir são de quem cria (trilhas.create), como no backend.
          aoAlterar={
            podeCriar ? () => setVersaoRascunhos((v) => v + 1) : undefined
          }
        />
      ) : null}

      {podeSubmeter ? (
        <ListaAprovados
          key={`aprovados-${versaoAprovados}`}
          aoAlterar={podeCriar ? () => setVersaoAprovados((v) => v + 1) : undefined}
        />
      ) : null}

      {podeRevisar ? (
        <FilaRevisao
          key={`fila-${versaoFila}`}
          aoDevolver={() => setVersaoRascunhos((v) => v + 1)}
        />
      ) : null}
    </div>
  );
}
