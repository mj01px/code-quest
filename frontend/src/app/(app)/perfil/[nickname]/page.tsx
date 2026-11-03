import type { Metadata } from "next";

import { PainelDePerfil } from "@/components/perfil/PainelDePerfil";

export const metadata: Metadata = {
  title: "Perfil",
  description: "Criatura, nível, XP e conquistas de um codificador.",
};

export default async function PerfilPage({ params }: PageProps<"/perfil/[nickname]">) {
  const { nickname } = await params;
  return <PainelDePerfil nickname={decodeURIComponent(nickname)} />;
}
