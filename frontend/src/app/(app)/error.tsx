"use client";

import { ErroDeCarregamento, type PropsErro } from "@/components/ui/ErroDeCarregamento";

// Rede de segurança das telas do app sem error.tsx próprio: o erro aparece
// dentro do layout, com a navegação lateral no lugar, e não em tela cheia.
export default function Erro(props: Omit<PropsErro, "titulo">) {
  return (
    <ErroDeCarregamento
      {...props}
      titulo="Algo deu errado nesta tela"
      mensagem="Esta tela encontrou um erro inesperado. Seu progresso está salvo: tente de novo ou use o menu para seguir."
    />
  );
}
