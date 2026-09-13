"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconeMenu } from "@/components/ui/Icone";
import { CtaLink } from "./CtaLink";
import { LINKS_NAV } from "./dados";

interface Props {
  // Em /entrar e /cadastro a barra fica so com a marca: as secoes nao existem
  // fora da landing e os CTAs ja aparecem dentro do proprio painel. Os CTAs
  // e o botao de menu continuam no DOM so como espaco, invisiveis: sao eles
  // que ditam a altura da barra, entao a marca fica no mesmo ponto da landing
  // em qualquer largura de tela.
  soMarca?: boolean;
}

export function LandingNavbar({ soMarca = false }: Props) {
  const [aberto, setAberto] = useState(false);
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 8);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b-2 transition-colors ${
        rolou
          ? "border-edge bg-void/90 shadow-pixel-sm backdrop-blur"
          : "border-transparent bg-void/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" aria-label="CodeQuest, início" className="shrink-0">
          <Image
            src="/marca/logo.png"
            alt="CodeQuest"
            width={1705}
            height={189}
            priority
            className="block h-5 w-auto sm:h-6"
          />
        </Link>

        {soMarca ? null : (
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Seções">
            {LINKS_NAV.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-label text-[11px] tracking-[0.18em] text-ink-muted hover:text-brand-mist"
              >
                {link.rotulo}
              </a>
            ))}
          </nav>
        )}

        <div
          aria-hidden={soMarca || undefined}
          className={`hidden items-center gap-3 sm:flex ${soMarca ? "invisible" : ""}`.trim()}
        >
          <CtaLink href="/entrar" variante="secundaria" tamanho="md">
            LOGIN
          </CtaLink>
          <CtaLink href="/cadastro" variante="primaria" tamanho="md">
            CRIAR CONTA
          </CtaLink>
        </div>

        <button
          type="button"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          aria-hidden={soMarca || undefined}
          onClick={() => setAberto((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-none border-2 border-edge-soft bg-panel text-brand-light shadow-pixel hover:border-brand hover:text-brand-mist sm:hidden ${soMarca ? "invisible" : ""}`.trim()}
        >
          <IconeMenu className="h-4 w-4" />
        </button>
      </div>

      {aberto && (
        <div className="border-t-2 border-edge bg-void px-5 py-4 sm:hidden">
          <nav
            className="flex flex-col gap-1"
            aria-label="Seções"
            onClick={() => setAberto(false)}
          >
            {LINKS_NAV.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="border-b border-edge py-3 font-label text-[11px] tracking-[0.18em] text-ink-muted hover:text-brand-mist"
              >
                {link.rotulo}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <CtaLink
              href="/entrar"
              variante="secundaria"
              tamanho="md"
              onClick={() => setAberto(false)}
            >
              LOGIN
            </CtaLink>
            <CtaLink
              href="/cadastro"
              variante="primaria"
              tamanho="md"
              onClick={() => setAberto(false)}
            >
              CRIAR CONTA
            </CtaLink>
          </div>
        </div>
      )}
    </header>
  );
}
