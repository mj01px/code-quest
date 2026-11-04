"use client";

import { useState } from "react";

import { PetComDica } from "@/components/licao/PetComDica";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";

export function PetDoExercicio({
  trilhaSlug,
  exercicioSlug,
  aulaTitulo,
  dica,
}: {
  trilhaSlug: string;
  exercicioSlug: string;
  aulaTitulo: string;
  dica?: string;
}) {
  const { usuario } = useProgresso();
  const [solucao, setSolucao] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const podeVer = usuario?.permissoes.includes("trilhas.view_solution") ?? false;

  async function mostrar() {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await api.solucaoReferencia(trilhaSlug, exercicioSlug);
      setSolucao(resposta.solucao_autor);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não consegui buscar a resposta agora.");
    } finally {
      setCarregando(false);
    }
  }

  const extra = !podeVer ? null : solucao !== null ? (
    solucao ? (
      <pre className="mt-3 max-h-60 overflow-auto border-2 border-void bg-field p-3 font-terminal text-base leading-[1.4] text-ink-soft">
        <code>{solucao}</code>
      </pre>
    ) : (
      <p className="mt-3 mb-0 text-sm">Este exercício não tem resposta cadastrada.</p>
    )
  ) : (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          void mostrar();
        }}
        disabled={carregando}
        className="cursor-pointer border-2 border-void bg-transparent px-3 py-2 font-label text-[10px] tracking-[2px] text-void uppercase hover:bg-void hover:text-ink disabled:cursor-wait disabled:opacity-60"
      >
        {carregando ? "Buscando..." : "Mostrar a resposta"}
      </button>
      {erro ? (
        <p role="alert" className="m-0 text-sm text-danger-deep">
          {erro}
        </p>
      ) : null}
    </div>
  );

  return (
    <PetComDica
      dica={
        dica ??
        `Travou? A lição "${aulaTitulo}" explica o que esta missão pede. Rode o código antes de enviar: o terminal mostra o que a sua função devolve.`
      }
      extra={extra}
      tamanho={120}
      flutuante
    />
  );
}
