import type { Metadata } from "next";
import Link from "next/link";

import { EditorDeConteudo } from "@/components/autoria/EditorDeConteudo";

export const metadata: Metadata = {
  title: "Novo conteúdo",
  description: "Crie uma trilha com aulas e exercícios na CodeQuest.",
};

// `?trilha_id=X` retoma uma trilha já criada; sem ele, o editor começa do zero.
export default async function PaginaNovoConteudo({
  searchParams,
}: {
  searchParams: Promise<{ trilha_id?: string }>;
}) {
  const { trilha_id } = await searchParams;
  const id = Number(trilha_id);
  return (
    <div className="flex w-full max-w-[880px] flex-col gap-6">
      {/* Link simples: sair não grava nada além do que já foi salvo. */}
      <Link
        href="/autoria"
        className="self-start font-label text-[12px] tracking-[2px] text-brand-light underline-offset-4 hover:underline"
      >
        {"< VOLTAR PARA AUTORIA"}
      </Link>
      <EditorDeConteudo trilhaId={Number.isInteger(id) && id > 0 ? id : null} />
    </div>
  );
}
