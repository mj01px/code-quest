"use client";

import { useState } from "react";

import { AreaDeTexto } from "@/components/autoria/AreaDeTexto";
import { BOTAO_ICONE } from "@/components/autoria/AcoesRascunho";
import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { IconeLixeira } from "@/components/ui/Icone";
import { ErroApi, api } from "@/lib/api";
import type { TrilhaResumo } from "@/lib/types";

// Moderação: tira do ar uma trilha publicada, com aulas e exercícios. O motivo
// é obrigatório e vai para a auditoria; o backend cobra `trilhas.delete_published`.
export function ExcluirTrilhaPublicada({
  trilha,
  aoExcluir,
}: {
  trilha: TrilhaResumo;
  aoExcluir: (id: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    setMotivo("");
    setErro(null);
  }

  async function confirmar() {
    setOcupado(true);
    setErro(null);
    try {
      await api.excluirRascunho("trilhas", trilha.id, motivo.trim());
      fechar();
      aoExcluir(trilha.id);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível excluir a trilha.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Excluir trilha publicada: ${trilha.nome}`}
        className={`${BOTAO_ICONE} shrink-0 hover:border-danger hover:text-danger`}
      >
        <IconeLixeira className="h-4 w-4" />
      </button>
      {aberto ? (
        <ModalConfirmacao
          rotulo="TRILHA PUBLICADA"
          titulo={`Excluir: ${trilha.nome}`}
          textoConfirmar="EXCLUIR"
          perigo
          carregando={ocupado}
          confirmarDesabilitado={motivo.trim() === ""}
          erro={erro}
          onConfirmar={confirmar}
          onFechar={fechar}
        >
          <p className="m-0 font-body text-base leading-[1.6] text-ink-body">
            A trilha sai do ar com todas as aulas e exercícios. Não dá para
            desfazer.
          </p>
          <AreaDeTexto
            id={`motivo-exclusao-${trilha.id}`}
            rotulo="MOTIVO DA EXCLUSÃO (FICA NA AUDITORIA)"
            maxLength={1000}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </ModalConfirmacao>
      ) : null}
    </>
  );
}
