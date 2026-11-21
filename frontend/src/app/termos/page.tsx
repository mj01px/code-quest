import type { Metadata } from "next";
import { paginaDeDocumento } from "@/components/legal/PaginaDeDocumento";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "As regras de uso da plataforma CodeQuest.",
};

interface Props {
  searchParams?: Promise<{ versao?: string | string[] }>;
}

export default async function PaginaTermos({ searchParams }: Props = {}) {
  const { versao } = (await searchParams) ?? {};

  return paginaDeDocumento({
    slug: "termos",
    versao: typeof versao === "string" ? versao : undefined,
    titulo: (
      <>
        TERMOS<span className="text-brand">.</span>DE_USO
      </>
    ),
    resumo:
      "As regras do acordo entre você e a CodeQuest. Ao criar uma conta, você concorda com o que está escrito aqui.",
  });
}
