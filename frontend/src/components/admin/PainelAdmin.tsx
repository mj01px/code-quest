"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GestaoNiveis } from "@/components/admin/GestaoNiveis";
import { GestaoUsuarios } from "@/components/admin/GestaoUsuarios";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";

type Aba = "usuarios" | "niveis";

// Guarda de papel no cliente: quem não é ADMIN nunca chega ao conteúdo. É de
// navegação — a proteção de verdade fica em cada endpoint do painel (o backend
// já resolve por RBAC/permissão). Enquanto o /eu não responde, segura a tela.
export function PainelAdmin() {
  const router = useRouter();
  const { usuario, carregando } = useProgresso();
  const [aba, setAba] = useState<Aba>("usuarios");

  const ehAdmin = usuario?.is_admin === true;

  useEffect(() => {
    if (carregando) return;
    if (!usuario) {
      router.replace("/entrar");
      return;
    }
    if (!usuario.is_admin) {
      router.replace("/trilhas");
    }
  }, [carregando, usuario, router]);

  if (carregando || !usuario) {
    return (
      <p className="font-label text-[13px] tracking-[2px] text-brand-light">
        &gt; VERIFICANDO ACESSO...
      </p>
    );
  }

  if (!ehAdmin) {
    // O efeito acima já redireciona; aqui só evita piscar o painel no caminho.
    return (
      <p className="font-label text-[13px] tracking-[2px] text-ink-muted">
        &gt; ACESSO RESTRITO. REDIRECIONANDO...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="font-label text-[11px] tracking-[2px] text-brand">
          {"// ADMIN"}
        </span>
        <h1 className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">
          Painel do administrador
        </h1>
      </div>

      <div className="flex border-b-2 border-edge">
        {(
          [
            ["usuarios", "USUÁRIOS"],
            ["niveis", "NÍVEIS DE ACESSO"],
          ] as [Aba, string][]
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            onClick={() => setAba(chave)}
            aria-current={aba === chave ? "page" : undefined}
            className={`cursor-pointer border-b-[3px] px-5 py-4 font-label text-[11px] tracking-[2px] ${
              aba === chave
                ? "border-brand-light text-ink"
                : "border-transparent text-ink-dim hover:text-ink-muted"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "usuarios" ? <GestaoUsuarios /> : <GestaoNiveis />}
    </div>
  );
}
