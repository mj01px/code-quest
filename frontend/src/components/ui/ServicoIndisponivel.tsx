"use client";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";

// O que as guardas de rota mostram quando a API falha com a sessão viva.
// Redirecionar para /entrar nesse caso expulsava o aluno em loop.
export function ServicoIndisponivel() {
  const { recarregar } = useProgresso();
  return (
    <div role="alert" className="border border-edge-soft bg-panel p-6">
      <h1 className="titulo text-lg text-ink-soft">Serviço indisponível</h1>
      <p className="mt-3 max-w-prose text-xs leading-relaxed text-ink-muted">
        Serviço indisponível, tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={recarregar}
        className="rotulo mt-6 cursor-pointer border border-brand px-4 py-2 text-brand hover:bg-brand-shadow/30"
      >
        Tentar de novo
      </button>
    </div>
  );
}
