"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconeEngrenagemPixel } from "@/components/ui/Icone";

export function BotaoConfiguracoes() {
  const caminho = usePathname();
  const ativo =
    caminho === "/configuracoes" || caminho?.startsWith("/configuracoes/");

  return (
    <Link
      href="/configuracoes"
      aria-label="Configurações"
      title="Configurações"
      aria-current={ativo ? "page" : undefined}
      className={`absolute top-5 right-5 z-10 flex h-12 w-12 items-center justify-center border-2 sm:top-6 sm:right-6 group ${
        ativo
          ? "border-brand-light bg-brand-deep text-ink shadow-pixel"
          : "border-edge text-ink hover:border-brand"
      }`}
    >
      <IconeEngrenagemPixel className="h-7 w-7 transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
    </Link>
  );
}
