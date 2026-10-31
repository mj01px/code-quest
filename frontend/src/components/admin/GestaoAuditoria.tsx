"use client";

import { useEffect, useState } from "react";

import { ErroApi, api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { FiltrosAuditoria, PaginaAuditoria } from "@/lib/types";

const CAMPO =
  "border-2 border-edge-soft bg-field px-3 py-2 font-body text-base tracking-[1px] text-ink outline-none focus:border-brand-light";
const BOTAO =
  "h-11 cursor-pointer border-2 border-edge-soft px-4 font-label text-[10px] tracking-[2px] text-ink-muted transition-colors hover:border-brand-light hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

// Data do <input type="date"> no fuso do navegador, em ISO com fuso: sem
// isto o Django leria hora ingênua e o dia cortaria no fuso errado.
function inicioDoDia(data: string): string {
  return new Date(`${data}T00:00:00`).toISOString();
}
function fimDoDia(data: string): string {
  return new Date(`${data}T23:59:59.999`).toISOString();
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** RF33: consulta completa à trilha de auditoria, com filtros e paginação. */
export function GestaoAuditoria() {
  const [acao, setAcao] = useState("");
  const [autor, setAutor] = useState<{ id: string; nome: string } | null>(null);
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<PaginaAuditoria | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const filtros: FiltrosAuditoria = {
      acao,
      actor: autor?.id,
      desde: desde ? inicioDoDia(desde) : undefined,
      ate: ate ? fimDoDia(ate) : undefined,
      page: pagina,
    };
    api
      .auditoria(filtros)
      .then((d) => {
        if (ativo) {
          setDados(d);
          setErro(null);
        }
      })
      .catch((e) => {
        if (ativo) {
          setErro(
            e instanceof ErroApi ? e.message : "Não foi possível carregar a auditoria.",
          );
        }
      });
    return () => {
      ativo = false;
    };
  }, [acao, autor, desde, ate, pagina]);

  // Filtro novo volta para a primeira página.
  function filtrar(aplicar: () => void) {
    aplicar();
    setPagina(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className={`${TIPO.etiqueta} text-ink-label`}>AÇÃO</span>
          <select
            value={acao}
            onChange={(e) => filtrar(() => setAcao(e.target.value))}
            className={`${CAMPO} cursor-pointer`}
          >
            <option value="">Todas</option>
            {dados?.acoes.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={`${TIPO.etiqueta} text-ink-label`}>DE</span>
          <input
            type="date"
            value={desde}
            onChange={(e) => filtrar(() => setDesde(e.target.value))}
            className={CAMPO}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={`${TIPO.etiqueta} text-ink-label`}>ATÉ</span>
          <input
            type="date"
            value={ate}
            onChange={(e) => filtrar(() => setAte(e.target.value))}
            className={CAMPO}
          />
        </label>
        {autor ? (
          <button
            type="button"
            onClick={() => filtrar(() => setAutor(null))}
            aria-label={`Remover filtro de autor ${autor.nome}`}
            className={BOTAO}
          >
            AUTOR: {autor.nome} · LIMPAR
          </button>
        ) : null}
      </div>

      <p className={`${TIPO.corpo} m-0 text-ink-dim`}>
        Clique no nome de quem fez a ação para filtrar por autor.
      </p>

      {erro ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : null}

      {dados === null && !erro ? (
        <p className={`${TIPO.etiqueta} text-ink-muted`} aria-busy="true">
          Carregando...
        </p>
      ) : null}

      {dados ? (
        <>
          <div className="overflow-x-auto border-2 border-edge bg-panel shadow-pixel">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-edge">
                  {["Quando", "Autor", "Ação", "IP"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-label text-[10px] tracking-[2px] text-ink-label"
                    >
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center font-body text-base tracking-[1px] text-ink-muted"
                    >
                      Nenhum registro para estes filtros.
                    </td>
                  </tr>
                ) : null}
                {dados.results.map((r) => (
                  <tr key={r.id} className="border-b border-edge last:border-b-0">
                    <td className="px-4 py-3 align-top font-body text-base tracking-[1px] whitespace-nowrap text-ink-muted">
                      <time dateTime={r.created_at}>{formatarDataHora(r.created_at)}</time>
                    </td>
                    <td className="px-4 py-3 align-top font-body text-base tracking-[1px]">
                      {r.actor ? (
                        <button
                          type="button"
                          onClick={() =>
                            filtrar(() =>
                              setAutor({
                                id: r.actor as string,
                                nome: r.actor_nickname ?? r.actor_email_snapshot,
                              }),
                            )
                          }
                          className="cursor-pointer text-ink underline-offset-4 hover:underline"
                        >
                          {r.actor_nickname ?? r.actor_email_snapshot}
                        </button>
                      ) : (
                        <span className="text-ink-dim">Anônimo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top font-body text-base tracking-[1px] text-ink-body">
                      {r.acao_rotulo}
                      {r.detalhes ? (
                        <span className="block text-sm text-ink-muted">{r.detalhes}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top font-body text-sm tracking-[1px] text-ink-muted">
                      {r.ip ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!dados.previous}
              onClick={() => setPagina((p) => p - 1)}
              className={BOTAO}
            >
              ANTERIOR
            </button>
            <span className={`${TIPO.etiqueta} text-ink-muted`}>
              PÁGINA {pagina} · {dados.count} REGISTROS
            </span>
            <button
              type="button"
              disabled={!dados.next}
              onClick={() => setPagina((p) => p + 1)}
              className={BOTAO}
            >
              PRÓXIMA
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
