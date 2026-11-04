"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface OpcaoSelect {
  valor: string;
  rotulo: string;
}

interface Props {
  rotulo: string;
  value: string;
  onChange: (valor: string) => void;
  opcoes: OpcaoSelect[];
  placeholder?: string;
  disabled?: boolean;
  erro?: string | null;
  descricaoId?: string;
  name?: string;
  id?: string;
  rotuloAoLado?: boolean;
  className?: string;
}

function IconeSeta({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 7 4"
      width="12"
      height="8"
      fill="currentColor"
      aria-hidden="true"
      className={aberto ? "rotate-180" : undefined}
    >
      <rect x="0" y="0" width="7" height="1" />
      <rect x="1" y="1" width="5" height="1" />
      <rect x="2" y="2" width="3" height="1" />
      <rect x="3" y="3" width="1" height="1" />
    </svg>
  );
}

export function PixelSelect({
  rotulo,
  value,
  onChange,
  opcoes,
  placeholder = "Selecione",
  disabled = false,
  erro,
  descricaoId,
  name,
  id: idExterno,
  rotuloAoLado = false,
  className = "",
}: Props) {
  const idGerado = useId();
  const id = idExterno ?? idGerado;
  const listaId = `${id}-lista`;
  const erroId = `${id}-erro`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);

  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);

  const indiceAtual = opcoes.findIndex((o) => o.valor === value);
  const selecionada = indiceAtual >= 0 ? opcoes[indiceAtual] : null;

  useEffect(() => {
    if (!aberto) return;
    function aoClicar(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicar);
    listaRef.current?.focus();
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    listaRef.current
      ?.querySelector<HTMLElement>(`[data-indice="${ativo}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [aberto, ativo]);

  function abrir() {
    if (disabled) return;
    setAtivo(indiceAtual >= 0 ? indiceAtual : 0);
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    gatilhoRef.current?.focus();
  }

  function escolher(indice: number) {
    const opcao = opcoes[indice];
    if (!opcao) return;
    if (opcao.valor !== value) onChange(opcao.valor);
    fechar();
  }

  function aoTeclarGatilho(e: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      abrir();
    }
  }

  function aoTeclarLista(e: React.KeyboardEvent) {
    const ultimo = opcoes.length - 1;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      fechar();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => Math.min(i + 1, ultimo));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setAtivo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setAtivo(ultimo);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      escolher(ativo);
    } else if (e.key === "Tab") {
      setAberto(false);
    }
  }

  const borda = erro ? "border-danger" : "border-brand-strong";
  const descritores = [erro ? erroId : null, descricaoId ?? null]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={wrapperRef}
      className={`flex ${rotuloAoLado ? "flex-row items-center gap-2.5" : "flex-col gap-2"} ${className}`}
    >
      <label
        htmlFor={id}
        className="shrink-0 font-label text-[12px] tracking-[2px] text-ink-label"
      >
        {rotulo}
      </label>

      <div className="relative min-w-0 flex-1">
        <button
          ref={gatilhoRef}
          type="button"
          id={id}
          onClick={() => (aberto ? setAberto(false) : abrir())}
          onKeyDown={aoTeclarGatilho}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-controls={aberto ? listaId : undefined}
          aria-describedby={descritores || undefined}
          className={`flex w-full cursor-pointer items-center justify-between gap-3 border-2 ${borda} bg-field px-3 py-[11px] text-left shadow-pixel hover:border-brand-pale focus-visible:border-brand-pale focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-brand-strong`}
        >
          <span
            className={`truncate font-body text-[15px] ${selecionada ? "text-ink" : "text-ink-ghost"}`}
          >
            {selecionada ? selecionada.rotulo : placeholder}
          </span>
          <span className="shrink-0 text-brand">
            <IconeSeta aberto={aberto} />
          </span>
        </button>
        {name ? <input type="hidden" name={name} value={value} /> : null}

        {aberto ? (
          <ul
            ref={listaRef}
            id={listaId}
            role="listbox"
            tabIndex={-1}
            aria-label={rotulo}
            aria-activedescendant={`${id}-opcao-${ativo}`}
            onKeyDown={aoTeclarLista}
            className="absolute top-full right-0 left-0 z-50 m-0 mt-2 flex max-h-72 min-w-full list-none flex-col gap-1 overflow-y-auto border-2 border-brand-strong bg-panel p-2 shadow-pixel-lg outline-none"
          >
            {opcoes.map((opcao, i) => {
              const marcada = opcao.valor === value;
              const emFoco = i === ativo;
              return (
                <li
                  key={opcao.valor}
                  id={`${id}-opcao-${i}`}
                  data-indice={i}
                  role="option"
                  aria-selected={marcada}
                  onMouseEnter={() => setAtivo(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(i)}
                  className={`flex min-h-9 cursor-pointer items-center border-2 px-3 py-1.5 font-body text-sm ${
                    marcada
                      ? "border-brand-light bg-brand-deep text-ink"
                      : emFoco
                        ? "border-brand text-ink"
                        : "border-transparent text-ink-body"
                  }`}
                >
                  {opcao.rotulo}
                </li>
              );
            })}
          </ul>
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
