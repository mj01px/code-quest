"use client";

import Image from "next/image";
import Link from "next/link";
import type { MinhaCriatura, ProgressoXP } from "@/lib/types";

interface Props {
  ativa: MinhaCriatura | null;
  progresso: ProgressoXP | null;
}

const NAV = [
  { label: "TRILHAS", href: "/trilhas", ativo: false },
  { label: "DESAFIO DO DIA", href: "#", ativo: false },
  { label: "CONQUISTAS", href: "#", ativo: false },
  { label: "CONFIGURAÇÕES", href: "/configuracoes", ativo: true },
];

const BLOCOS = 10;

export function BarraLateral({ ativa, progresso }: Props) {
  const faixa =
    progresso && progresso.xp_para_o_proximo !== null
      ? progresso.xp_no_nivel + progresso.xp_para_o_proximo
      : progresso?.xp_no_nivel ?? 0;
  const fracao =
    progresso && progresso.xp_para_o_proximo !== null && faixa > 0
      ? progresso.xp_no_nivel / faixa
      : progresso
        ? 1
        : 0;
  const acesos = Math.round(fracao * BLOCOS);

  return (
    <aside className="flex min-w-[260px] max-w-[300px] flex-[1_1_300px] flex-col gap-8 border-r-[3px] border-edge bg-panel-deep px-5 py-6">
      <Link href="/" aria-label="CodeQuest, início">
        <Image
          src="/marca/logo.png"
          alt="CodeQuest"
          width={1705}
          height={189}
          priority
          className="block h-[18px] w-auto"
        />
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel">
            {ativa?.sprite ? (
              <Image
                src={ativa.sprite}
                alt="Companheiro principal"
                width={52}
                height={52}
                className="block h-[52px] w-[52px]"
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-[12px] leading-[1.5] text-ink">
              {ativa?.criatura.nome ?? "Sem pet"}
            </span>
            <span className="font-label text-[11px] tracking-[2px] text-brand-light">
              {progresso ? `NÍVEL ${progresso.nivel.numero}` : "NÍVEL —"}
            </span>
          </div>
        </div>

        <div
          className="flex gap-[2px] border-2 border-edge-soft bg-void p-[2px]"
          aria-hidden="true"
        >
          {Array.from({ length: BLOCOS }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 ${i < acesos ? "bg-brand-strong" : "bg-[#1c1826]"}`}
            />
          ))}
        </div>

        <span className="font-label text-[10px] tracking-[2px] text-ink-muted">
          {progresso
            ? progresso.xp_para_o_proximo === null
              ? `${progresso.xp_total} XP`
              : `${progresso.xp_no_nivel} / ${faixa} XP`
            : "0 / 0 XP"}
        </span>
      </div>

      <nav className="flex flex-col gap-2">
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.ativo ? "page" : undefined}
            className={`flex items-center gap-3 border-2 p-3 font-label text-[12px] tracking-[2px] ${
              item.ativo
                ? "border-brand-light bg-brand-deep text-ink shadow-pixel"
                : "border-edge text-ink-body hover:border-brand hover:text-ink-soft"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 ${item.ativo ? "bg-ink" : "bg-brand-shadow"}`}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
