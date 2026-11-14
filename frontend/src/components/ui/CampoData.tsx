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
  limpavel?: boolean;
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

/** Aplica a máscara dd/mm/aaaa conforme os dígitos digitados. */
export function mascararData(entrada: string): string {
  const d = entrada.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "dd/mm/aaaa" completo e existente no calendário vira ISO; o resto vira "". */
export function textoParaIso(texto: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return "";
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(ano, mes - 1, dia);
  // Rejeita 31/02 e afins, que o Date "corrige" para o mês seguinte.
  if (
    ano < 1900 ||
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  )
    return "";
  return paraIso(ano, mes - 1, dia);
}

export function CampoData({ rotulo, value, onChange, erro, name, limpavel = false }: Props) {
  const id = useId();
  const erroId = `${id}-erro`;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [aberto, setAberto] = useState(false);
  const [visao, setVisao] = useState<"dias" | "anos">("dias");

  const [texto, setTexto] = useState(() => {
    const d = doIso(value);
    return d ? formatarBr(d) : "";
  });
  // Acompanha mudanças vindas de fora (calendário, limpar, reset do form)
  // sem apagar o que o usuário está digitando pela metade.
  const [ultimoValor, setUltimoValor] = useState(value);
  if (value !== ultimoValor) {
    setUltimoValor(value);
    if (value !== textoParaIso(texto)) {
      const d = doIso(value);
      setTexto(d ? formatarBr(d) : "");
    }
  }

  const textoCompleto = texto.length === 10;
  const erroLocal = textoCompleto && !textoParaIso(texto) ? "Data inválida." : null;
  const erroExibido = erroLocal ?? erro;

  function digitar(entrada: string) {
    const mascarado = mascararData(entrada);
    setTexto(mascarado);
    const iso = textoParaIso(mascarado);
    if (iso !== value) onChange(iso);
  }

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

  const borda = erroExibido ? "border-danger" : "border-brand-strong";

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
        <div
          className={`flex w-full items-center gap-2 border-2 ${borda} bg-field shadow-pixel focus-within:border-brand-pale hover:border-brand-pale`}
        >
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            value={texto}
            onChange={(e) => digitar(e.target.value)}
            aria-invalid={erroExibido ? true : undefined}
            aria-describedby={erroExibido ? erroId : undefined}
            className="min-w-0 flex-1 bg-transparent py-[11px] pl-3 font-body text-[15px] text-ink outline-none placeholder:text-ink-ghost"
          />
          <button
            type="button"
            onClick={abrir}
            aria-label="Abrir calendário"
            aria-haspopup="dialog"
            aria-expanded={aberto}
            className="shrink-0 px-3 py-[11px] text-brand hover:text-brand-light"
          >
            <span aria-hidden="true">
              <IconeCalendario />
            </span>
          </button>
        </div>
        {/* Campo escondido: mantém o valor no envio do formulário por name. */}
        {name ? <input type="hidden" name={name} value={value} /> : null}

        {aberto ? (
          <div
            role="dialog"
            aria-label="Escolha a data"
            className="absolute left-0 right-0 top-full z-50 mt-2 flex min-w-[280px] flex-col gap-3 border-2 border-brand-strong bg-panel p-3 shadow-pixel-lg"
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
                    {paginaAno} a {paginaAno + ANOS_POR_PAGINA - 1}
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
            {limpavel && selecionada ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setAberto(false);
                }}
                className="border-2 border-edge-soft bg-panel-soft px-2 py-1.5 font-label text-[11px] tracking-[1px] text-ink-muted hover:border-brand hover:text-ink"
              >
                LIMPAR DATA
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {erroExibido ? (
        <p
          id={erroId}
          role="alert"
          className="font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erroExibido}
        </p>
      ) : null}
    </div>
  );
}
