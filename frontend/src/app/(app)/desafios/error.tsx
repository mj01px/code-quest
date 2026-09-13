"use client";

import { ErroDeCarregamento, type PropsErro } from "@/components/ui/ErroDeCarregamento";

export default function Erro(props: Omit<PropsErro, "titulo">) {
  return (
    <ErroDeCarregamento {...props} titulo="Não deu para montar os desafios de hoje" />
  );
}
