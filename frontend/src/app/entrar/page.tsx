import type { Metadata } from "next";
import { PainelLogin } from "@/components/auth/PainelLogin";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Entrar | CodeQuest",
  description: "Acesse sua conta e continue de onde parou.",
};

export default function PaginaEntrar() {
  return (
    <TelaBase>
      <PainelLogin />
    </TelaBase>
  );
}
