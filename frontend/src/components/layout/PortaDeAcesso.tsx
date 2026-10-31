"use client";

import type { ReactNode } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";

export function PortaDeAcesso({
  perm,
  children,
}: {
  perm: string;
  children: ReactNode;
}) {
  const { usuario } = useProgresso();

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
