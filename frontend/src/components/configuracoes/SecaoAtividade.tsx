"use client";

import { useEffect, useState } from "react";
import { ErroApi, api } from "@/lib/api";
import type { AtividadeItem } from "@/lib/types";

// Espelha o page_size do endpoint (AtividadePagination no backend).
const POR_PAGINA = 5;

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

// Falha de login é o único evento que merece cor: é o que o dono precisa notar.
function ehAlerta(acao: string): boolean {
  return acao === "LOGIN_FALHA";
}

export function SecaoAtividade() {
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<AtividadeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    (async () => {
      try {
        const dados = await api.minhaAtividade(pagina);
        if (!ativo) return;
        setItens(dados.results);
        setTotal(dados.count);
        setErro(null);
      } catch (e) {
        if (!ativo) return;
        setErro(
          e instanceof ErroApi
            ? e.message
            : "Não foi possível carregar sua atividade.",
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const temPaginacao = total > POR_PAGINA;
  // Primeira carga (ainda sem nada em tela) mostra o "carregando"; a troca de
  // página mantém a lista e só desabilita os botões.
  const primeiraCarga = carregando && itens.length === 0 && !erro;

  return (
    <section className="flex w-full max-w-[640px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink">
          Atividade recente
        </h2>
        <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
          Ações da sua conta: acessos, alterações e evoluções. Só você vê isto.
        </span>
      </div>

      {primeiraCarga ? (
        <p className="font-label text-[12px] tracking-[2px] text-brand-light">
          &gt; CARREGANDO ATIVIDADE...
        </p>
      ) : erro ? (
        <p
          role="alert"
          className="border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : itens.length === 0 ? (
        <p className="border-2 border-edge bg-panel px-4 py-3 font-body text-base tracking-[1px] text-ink-muted">
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <>
          <ul
            className={`flex flex-col border-2 border-edge-soft bg-panel transition-opacity ${
              carregando ? "opacity-60" : ""
            }`}
          >
            {itens.map((item, i) => {
              const quando = new Date(item.created_at);
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 ${
                    i > 0 ? "border-t border-edge" : ""
                  }`}
                >
                  <span
                    className={`font-body text-base leading-[1.4] tracking-[1px] ${
                      ehAlerta(item.acao) ? "text-danger" : "text-ink-soft"
                    }`}
                  >
                    {item.acao_rotulo}
                  </span>
                  <span className="font-label text-[11px] tracking-[1px] text-ink-muted tabular-nums">
                    {DATA.format(quando)} · {HORA.format(quando)}
                  </span>
                </li>
              );
            })}
          </ul>

          {temPaginacao ? (
            <nav
              aria-label="Paginação da atividade"
              className="flex items-center justify-between gap-4"
            >
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || carregando}
                className="cursor-pointer border-2 border-edge-soft bg-panel px-4 py-2 font-label text-[10px] tracking-[2px] text-ink-soft shadow-pixel hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-edge-soft disabled:hover:text-ink-soft"
              >
                &lt; ANTERIOR
              </button>

              <span className="font-label text-[10px] tracking-[2px] text-ink-muted tabular-nums">
                PÁGINA {pagina} DE {totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas || carregando}
                className="cursor-pointer border-2 border-edge-soft bg-panel px-4 py-2 font-label text-[10px] tracking-[2px] text-ink-soft shadow-pixel hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-edge-soft disabled:hover:text-ink-soft"
              >
                PRÓXIMA &gt;
              </button>
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
