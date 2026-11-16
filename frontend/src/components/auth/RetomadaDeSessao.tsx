"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { retomarSessao } from "@/lib/api";
import { destinoSeguro } from "@/lib/destino";

const MARCA = "cq_retomada";
// Renovou e o servidor recusou de novo em seguida: algo além do token curto
// (conta suspensa, cookie bloqueado). Vai para o login em vez de repetir.
const JANELA_DE_LOOP_MS = 15_000;

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
    const login = `/entrar?volta=${encodeURIComponent(volta)}`;
    if (Date.now() - lerMarca() < JANELA_DE_LOOP_MS) {
      router.replace(login);
      return;
    }
    retomarSessao().then((ok) => {
      if (!ativo) return;
      if (ok) {
        gravarMarca();
        router.replace(volta);
      } else {
        router.replace(login);
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
