import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PainelConfirmarExclusao,
  PainelConfirmarExclusaoCarregando,
} from "@/components/auth/PainelConfirmarExclusao";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Excluir conta",
  description: "Confirme a exclusão definitiva da sua conta na CodeQuest.",
};

export default function PaginaConfirmarExclusao() {
  return (
    <TelaBase>
      <AppHeader />
      <Suspense fallback={<PainelConfirmarExclusaoCarregando />}>
        <PainelConfirmarExclusao />
      </Suspense>
    </TelaBase>
  );
}
