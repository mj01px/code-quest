"use client";

import { useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";

interface Props {
  trilhaSlug: string;
  exercicioSlug: string;
}

/**
 * RF16: solução de referência para quem tem `trilhas.view_solution` (autor e
 * admin). Aluno não vê o botão; se chamar a rota, o backend responde 403.
 */
export function BotaoSolucao({ trilhaSlug, exercicioSlug }: Props) {
  const { usuario } = useProgresso();
  const [solucao, setSolucao] = useState<string | null>(null);
  const [aberta, setAberta] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!usuario?.permissoes.includes("trilhas.view_solution")) return null;

  async function alternar() {
    if (aberta) {
      setAberta(false);
      return;
    }
    setAberta(true);
    if (solucao !== null) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await api.solucaoReferencia(trilhaSlug, exercicioSlug);
      setSolucao(r.solucao_autor);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar a solução.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="mt-4 border border-edge bg-panel p-4">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberta}
        className="rotulo cursor-pointer border border-edge-soft px-4 py-2 text-ink-muted transition-colors hover:border-brand hover:text-brand"
      >
        {aberta ? "Ocultar solução" : "Ver solução de referência"}
      </button>
      {aberta ? (
        <div className="mt-4" aria-live="polite">
          {carregando ? <p className="rotulo text-ink-muted">Carregando...</p> : null}
          {erro ? (
            <p role="alert" className="text-xs text-danger">
              {erro}
            </p>
          ) : null}
          {solucao !== null ? (
            solucao ? (
              <pre className="overflow-x-auto bg-field p-4 font-mono text-xs leading-relaxed text-ink-soft">
                <code>{solucao}</code>
              </pre>
            ) : (
              <p className="text-xs text-ink-muted">Este exercício não tem solução cadastrada.</p>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
