"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { retomarSessao } from "@/lib/api";

const PADRAO = "/trilhas";
const MARCA = "cq_retomada";
// Renovou e o servidor recusou de novo em seguida: algo além do token curto
// (conta suspensa, cookie bloqueado). Vai para o login em vez de repetir.
const JANELA_DE_LOOP_MS = 15_000;

/** Só caminho interno: nada de outro domínio (//x, /\x) nem a própria /sessao. */
export function destinoSeguro(bruto: string | null): string {
  if (!bruto || !bruto.startsWith("/")) return PADRAO;
  if (bruto.startsWith("//") || bruto.startsWith("/\\")) return PADRAO;
  if (bruto === "/sessao" || bruto.startsWith("/sessao?")) return PADRAO;
  return bruto;
}

function lerMarca(): number {
  try {
    return Number(sessionStorage.getItem(MARCA) ?? 0);
  } catch {
    return 0;
  }
}

function gravarMarca(): void {
  try {
    sessionStorage.setItem(MARCA, String(Date.now()));
  } catch {
    // Sem sessionStorage a proteção contra loop some, mas a retomada segue.
  }
}

export function RetomadaDeSessao() {
  const router = useRouter();
  const params = useSearchParams();
  const volta = destinoSeguro(params.get("volta"));

  useEffect(() => {
    let ativo = true;
    if (Date.now() - lerMarca() < JANELA_DE_LOOP_MS) {
      router.replace("/entrar");
      return;
    }
    retomarSessao().then((ok) => {
      if (!ativo) return;
      if (ok) {
        gravarMarca();
        router.replace(volta);
      } else {
        router.replace("/entrar");
      }
    });
    return () => {
      ativo = false;
    };
  }, [router, volta]);

  return (
    <p role="status" className="m-0 font-body text-lg text-ink-muted">
      Retomando sua sessão...
    </p>
  );
}
