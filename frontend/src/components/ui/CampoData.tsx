"use client";

import { useEffect, useId, useRef, useState } from "react";

import { IconeCalendario } from "./icones";

interface Props {
  rotulo: string;
  /** "YYYY-MM-DD" ou "". */
  value: string;
  onChange: (valor: string) => void;
  erro?: string | null;
  name?: string;
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const ANOS_POR_PAGINA = 12;

function doIso(iso: string): Date | null {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return null;
  const data = new Date(a, m - 1, d);
  return Number.isNaN(data.getTime()) ? null : data;
}

function paraIso(ano: number, mes: number, dia: number): string {
  const mm = String(mes + 1).padStart(2, "0");
  const dd = String(dia).padStart(2, "0");
  return `${ano}-${mm}-${dd}`;
}

function formatarBr(data: Date): string {
  const dd = String(data.getDate()).padStart(2, "0");
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${data.getFullYear()}`;
}

export function CampoData({ rotulo, value, onChange, erro, name }: Props) {
  const id = useId();
  const erroId = `${id}-erro`;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [aberto, setAberto] = useState(false);
  const [visao, setVisao] = useState<"dias" | "anos">("dias");

  const hoje = new Date();
  const selecionada = doIso(value);
  const inicial = selecionada ?? hoje;
  const [ano, setAno] = useState(inicial.getFullYear());
  const [mes, setMes] = useState(inicial.getMonth());
  // Primeiro ano da página do seletor de anos.
  const [paginaAno, setPaginaAno] = useState(
    inicial.getFullYear() - (inicial.getFullYear() % ANOS_POR_PAGINA),
  );

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!aberto) return;
    function aoClicar(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  function abrir() {
    const base = selecionada ?? hoje;
    setAno(base.getFullYear());
    setMes(base.getMonth());
    setPaginaAno(base.getFullYear() - (base.getFullYear() % ANOS_POR_PAGINA));
    setVisao("dias");
    setAberto((a) => !a);
  }

  function escolher(dia: number) {
    onChange(paraIso(ano, mes, dia));
    setAberto(false);
  }

  function passoMes(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  }

  const borda = erro ? "border-danger" : "border-brand-strong";

  // Grade do mês: offset até o primeiro dia + dias do mês.
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array<null>(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  const anosDaPagina = Array.from(
    { length: ANOS_POR_PAGINA },
    (_, i) => paginaAno + i,
  );

  const btnNav =
    "flex h-8 w-8 items-center justify-center border-2 border-edge-soft bg-panel-soft font-label text-[12px] text-brand-light hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2" ref={wrapperRef}>
      <label
        htmlFor={id}
        className="font-label text-[12px] tracking-[2px] text-ink-label"
      >
        {rotulo}
      </label>

      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={abrir}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          aria-describedby={erro ? erroId : undefined}
          className={`flex w-full items-center justify-between gap-2 border-2 ${borda} bg-field px-3 py-[11px] shadow-pixel hover:border-brand-pale`}
        >
          <span
            className={`font-body text-[15px] ${selecionada ? "text-ink" : "text-ink-ghost"}`}
          >
            {selecionada ? formatarBr(selecionada) : "dd/mm/aaaa"}
          </span>
          <span className="shrink-0 text-brand" aria-hidden="true">
            <IconeCalendario />
          </span>
        </button>
        {/* Campo escondido: mantém o valor no envio do formulário por name. */}
        {name ? <input type="hidden" name={name} value={value} /> : null}

        {aberto ? (
          <div
            role="dialog"
            aria-label="Escolha a data"
            className="absolute left-0 right-0 top-full z-50 mt-2 flex flex-col gap-3 border-2 border-brand-strong bg-panel p-3 shadow-pixel-lg"
          >
            {visao === "dias" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => passoMes(-1)}
                    aria-label="Mês anterior"
                    className={btnNav}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaginaAno(ano - (ano % ANOS_POR_PAGINA));
                      setVisao("anos");
                    }}
                    aria-label="Escolher ano"
                    className="flex-1 border-2 border-edge-soft bg-panel-soft px-2 py-1.5 font-label text-[11px] tracking-[1px] text-ink hover:border-brand"
                  >
                    {MESES[mes].toUpperCase()} {ano}
                  </button>
                  <button
                    type="button"
                    onClick={() => passoMes(1)}
                    aria-label="Próximo mês"
                    className={btnNav}
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {SEMANA.map((letra, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="flex h-6 items-center justify-center font-label text-[9px] tracking-[1px] text-ink-muted"
                    >
                      {letra}
                    </span>
                  ))}
                  {celulas.map((dia, i) => {
                    if (dia === null)
                      return <span key={`v-${i}`} className="h-9" />;
                    const data = new Date(ano, mes, dia);
                    const futuro = data > hoje;
                    const selecionado =
                      selecionada != null &&
                      selecionada.getFullYear() === ano &&
                      selecionada.getMonth() === mes &&
                      selecionada.getDate() === dia;
                    const ehHoje =
                      hoje.getFullYear() === ano &&
                      hoje.getMonth() === mes &&
                      hoje.getDate() === dia;
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => escolher(dia)}
                        disabled={futuro}
                        aria-label={formatarBr(data)}
                        aria-pressed={selecionado}
                        className={`flex h-9 items-center justify-center border-2 font-body text-sm ${
                          selecionado
                            ? "border-brand-light bg-brand-deep text-ink"
                            : ehHoje
                              ? "border-edge-soft text-brand-light"
                              : "border-transparent text-ink-body hover:border-brand hover:text-ink"
                        } disabled:cursor-not-allowed disabled:text-ink-dim disabled:hover:border-transparent`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPaginaAno((p) => p - ANOS_POR_PAGINA)}
                    aria-label="Anos anteriores"
                    className={btnNav}
                  >
                    ‹
                  </button>
                  <span className="flex-1 text-center font-label text-[11px] tracking-[1px] text-ink">
                    {paginaAno} – {paginaAno + ANOS_POR_PAGINA - 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaginaAno((p) => p + ANOS_POR_PAGINA)}
                    disabled={paginaAno + ANOS_POR_PAGINA > hoje.getFullYear()}
                    aria-label="Próximos anos"
                    className={btnNav}
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {anosDaPagina.map((a) => {
                    const futuro = a > hoje.getFullYear();
                    const atual = a === ano;
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          setAno(a);
                          setVisao("dias");
                        }}
                        disabled={futuro}
                        aria-pressed={atual}
                        className={`flex h-9 items-center justify-center border-2 font-body text-sm ${
                          atual
                            ? "border-brand-light bg-brand-deep text-ink"
                            : "border-edge text-ink-body hover:border-brand hover:text-ink"
                        } disabled:cursor-not-allowed disabled:text-ink-dim disabled:hover:border-edge`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {erro ? (
        <p
          id={erroId}
          role="alert"
          className="font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : null}
    </div>
  );
}
