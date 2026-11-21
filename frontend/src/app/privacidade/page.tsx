import type { Metadata } from "next";
import { paginaDeDocumento } from "@/components/legal/PaginaDeDocumento";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Quais dados a CodeQuest trata, com que finalidade, por quanto tempo e como exercer seus direitos.",
};

interface Props {
  searchParams?: Promise<{ versao?: string | string[] }>;
}

export default async function PaginaPrivacidade({ searchParams }: Props = {}) {
  const { versao } = (await searchParams) ?? {};

  return paginaDeDocumento({
    slug: "privacidade",
    versao: typeof versao === "string" ? versao : undefined,
    titulo: (
      <>
        POLITICA<span className="text-brand">.</span>DE
        <wbr />
        _PRIVACIDADE
      </>
    ),
    resumo:
      "O que a CodeQuest coleta, por que coleta, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos como titular.",
  });
}
