"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";

// Guarda de rota privada: espera a sessão e manda o visitante para /entrar.
// Fica no layout de cada rota privada, não no `(app)` inteiro: o catálogo de
// trilhas é público (vitrine), e só o que é da conta pede login.
// É barreira de navegação; quem barra de verdade é o backend.
export function ExigeLogin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { usuario, carregando } = useProgresso();

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/entrar");
  }, [carregando, usuario, router]);

  if (carregando || !usuario) return null;
  return children;
}
