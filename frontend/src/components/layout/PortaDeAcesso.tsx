"use client";

import type { ReactNode } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";

/**
 * Esconde uma área de quem está logado mas não tem a permissão. É uma barreira
 * de UX (a leitura pública do catálogo segue no backend); as CAPACIDADES —
 * iniciar trilha, concluir exercício, adquirir/evoluir criatura — são barradas
 * de verdade no servidor. Deslogado (sem usuário) vê o conteúdo público.
 */
export function PortaDeAcesso({
  perm,
  children,
}: {
  perm: string;
  children: ReactNode;
}) {
  const { usuario } = useProgresso();

  // Durante o carregamento (usuário ainda nulo) mostramos o conteúdo — ele é
  // público no backend e vem pronto do SSR. Só bloqueamos depois de saber que o
  // usuário logado não tem a permissão.
  if (usuario && !usuario.permissoes.includes(perm)) {
    return (
      <section className="flex min-h-[220px] flex-col items-center justify-center gap-3 border-2 border-dashed border-edge-soft bg-panel p-8 text-center">
        <span className="font-label text-[12px] tracking-[2px] text-danger">
          SEM ACESSO
        </span>
        <span className="max-w-[420px] font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
          Seu nível de acesso não inclui esta área. Fale com um administrador.
        </span>
      </section>
    );
  }

  return <>{children}</>;
}
