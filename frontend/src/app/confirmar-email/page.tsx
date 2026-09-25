import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PainelConfirmarEmail,
  PainelConfirmarEmailCarregando,
} from "@/components/auth/PainelConfirmarEmail";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Confirmar e-mail",
  description: "Confirme a troca do e-mail da sua conta.",
};

export default function PaginaConfirmarEmail() {
  return (
    <TelaBase>
      <AppHeader />
      <Suspense fallback={<PainelConfirmarEmailCarregando />}>
        <PainelConfirmarEmail />
      </Suspense>
    </TelaBase>
  );
}
