import type { Metadata } from "next";
import { PainelConfiguracoes } from "@/components/configuracoes/PainelConfiguracoes";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Seu perfil, seus companheiros e sua conta.",
};

export default function PaginaConfiguracoes() {
  return <PainelConfiguracoes />;
}
