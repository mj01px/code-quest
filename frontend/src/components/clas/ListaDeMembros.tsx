"use client";

import { useState } from "react";

import { acoesDeMembro, ehGestor, formatarData, iniciais, type AcaoDeMembro } from "@/lib/clas";
import type { Cargo, MembroDoCla } from "@/lib/types";

import { BadgeCargo } from "./BadgeCargo";
import { BTN_PERIGO, BTN_SECUNDARIO } from "./estilos";
import { IconeReticencias } from "./icones";

const TETO_INICIAL = 8;

const ROTULO_ACAO: Record<AcaoDeMembro, string> = {
  promover: "PROMOVER A CO-LÍDER",
  rebaixar: "REBAIXAR A MEMBRO",
  transferir: "PASSAR LIDERANÇA",
  expulsar: "EXPULSAR",
};

interface Props {
  membros: MembroDoCla[];
  total: number;
  meuNickname?: string;
  meuCargo: Cargo | null;
  busyId: string | null;
  onAcao: (acao: AcaoDeMembro, membro: MembroDoCla) => void;
}

export function ListaDeMembros({
  membros,
  total,
  meuNickname,
  meuCargo,
  busyId,
  onAcao,
}: Props) {
  const [expandido, setExpandido] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const gestor = meuCargo !== null && ehGestor(meuCargo);
  const visiveis = expandido ? membros : membros.slice(0, TETO_INICIAL);
  const resta = membros.length - visiveis.length;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-membros">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="titulo-membros"
          className="titulo m-0 font-display text-[13px] leading-[1.7] text-ink"
        >
          Membros
        </h2>
        <span className="font-label text-[11px] tracking-[2px] text-ink-muted">
          {total} de 50 vagas
        </span>
      </div>

      <div className="border-2 border-edge bg-edge shadow-pixel-lg">
        <div className="flex items-center gap-4 bg-panel-soft px-5 py-3">
          <span className="flex-1 basis-48 font-label text-[10px] tracking-[2px] text-ink-muted">
            MEMBRO
          </span>
          <span className="w-[104px] shrink-0 font-label text-[10px] tracking-[2px] text-ink-muted">
            CARGO
          </span>
          <span className="w-24 shrink-0 font-label text-[10px] tracking-[2px] text-ink-muted">
            ENTROU EM
          </span>
          {gestor ? <span className="w-11 shrink-0" /> : null}
        </div>

        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {visiveis.map((membro) => {
            const souEu = Boolean(
              meuNickname && membro.nickname === meuNickname,
            );
            const acoes =
              meuCargo !== null ? acoesDeMembro(meuCargo, membro, souEu) : [];
            const temAcoes = acoes.length > 0;
            const estaAberto = aberto === membro.id && temAcoes;
            const ocupado = busyId === membro.id;

            return (
              <li
                key={membro.id}
                className={`relative flex flex-col bg-panel ${
                  souEu ? "shadow-[inset_4px_0_0_var(--color-brand)]" : ""
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <span className="flex min-w-0 flex-1 basis-48 items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[11px] text-brand-light">
                      {iniciais(membro.nickname)}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate font-label text-[13px] tracking-[2px] text-ink">
                        {membro.nickname}
                      </span>
                      {souEu ? (
                        <span className="font-label text-[10px] tracking-[2px] text-brand-light">
                          VOCÊ
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="w-[104px] shrink-0">
                    <BadgeCargo cargo={membro.cargo} rotulo={membro.cargo_rotulo} />
                  </span>
                  <span className="w-24 shrink-0 font-body text-[15px] text-ink-muted">
                    {formatarData(membro.entrou_em)}
                  </span>
                  <span className="flex w-11 shrink-0 justify-end">
                    {temAcoes ? (
                      <button
                        type="button"
                        onClick={() =>
                          setAberto(estaAberto ? null : membro.id)
                        }
                        aria-label={`Ações para ${membro.nickname}`}
                        aria-expanded={estaAberto}
                        className="flex h-11 w-11 items-center justify-center border-2 border-edge-soft bg-void text-brand-light hover:border-brand"
                      >
                        <IconeReticencias size={18} />
                      </button>
                    ) : null}
                  </span>
                </div>

                {estaAberto ? (
                  <div className="flex flex-wrap justify-end gap-3 px-5 pb-4">
                    {acoes.map((acao) => (
                      <button
                        key={acao}
                        type="button"
                        disabled={ocupado}
                        onClick={() => onAcao(acao, membro)}
                        className={acao === "expulsar" ? BTN_PERIGO : BTN_SECUNDARIO}
                      >
                        {ROTULO_ACAO[acao]}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {resta > 0 ? (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className={`${BTN_SECUNDARIO} self-start`}
        >
          MOSTRAR TODOS OS {membros.length}
        </button>
      ) : null}
    </section>
  );
}
