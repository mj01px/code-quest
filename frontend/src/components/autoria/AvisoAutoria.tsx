"use client";

import Link from "next/link";
import { useState } from "react";

import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";

const CRIA: [string, string][] = [
  ["trilhas.create_trilha", "Trilhas"],
  ["trilhas.create_aula", "Aulas"],
  ["trilhas.create_exercicio", "Exercícios"],
];

export const chaveAviso = (id: string) => `codequest:aviso-autoria:${id}`;

// Storage bloqueado (modo privado, cota) não pode derrubar o layout: sem
// leitura, o aviso aparece; sem escrita, ele só não fica lembrado.
function jaVisto(id: string): boolean {
  try {
    return localStorage.getItem(chaveAviso(id)) !== null;
  } catch {
    return false;
  }
}

function lembrar(id: string) {
  try {
    localStorage.setItem(chaveAviso(id), "1");
  } catch {
    // segue sem lembrar
  }
}

// Parabéns de quem teve a solicitação de autoria aprovada, uma vez por
// usuário neste navegador. O /eu só chega depois da montagem, então ler o
// localStorage no render não diverge do HTML do servidor.
export function AvisoAutoria() {
  const { usuario } = useProgresso();
  const [fechado, setFechado] = useState(false);

  if (!usuario?.criacao_aprovada || fechado || jaVisto(usuario.id)) {
    return null;
  }

  const pode = CRIA.filter(([perm]) => usuario.permissoes.includes(perm)).map(
    ([, nome]) => nome,
  );
  const lista =
    pode.length > 1 ? `${pode.slice(0, -1).join(", ")} e ${pode.at(-1)}` : pode[0];

  function fechar() {
    lembrar(usuario!.id);
    setFechado(true);
  }

  return (
    <ModalConfirmacao
      rotulo="AUTORIA"
      titulo="Parabéns!"
      textoConfirmar="ENTENDI"
      onConfirmar={fechar}
      onFechar={fechar}
    >
      <p className="m-0">
        Sua solicitação de autor foi aprovada.
        {lista ? ` Agora você pode criar ${lista}.` : null}
      </p>
      <Link
        href="/autoria"
        onClick={fechar}
        className="mt-4 inline-block text-brand-light underline underline-offset-4"
      >
        Ir para a tela de autoria
      </Link>
    </ModalConfirmacao>
  );
}
