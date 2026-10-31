"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";
import type { Consentimento } from "@/lib/types";

/**
 * RF30: depois do login, compara a versão vigente dos documentos legais com a
 * última aceita e pede o novo aceite. "Cancelar" adia até o próximo acesso.
 */
export function AvisoConsentimento() {
  const { usuario } = useProgresso();
  const [pendentes, setPendentes] = useState<Consentimento[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const usuarioId = usuario?.id;

  useEffect(() => {
    if (!usuarioId) return;
    let ativo = true;
    api
      .consentimentos()
      .then((cs) => {
        if (ativo) setPendentes(cs.filter((c) => c.pendente));
      })
      // Falha aqui não pode travar o app: o aviso volta no próximo acesso.
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [usuarioId]);

  if (pendentes.length === 0) return null;

  async function aceitar() {
    setEnviando(true);
    setErro(null);
    try {
      const cs = await api.aceitarConsentimentos();
      setPendentes(cs.filter((c) => c.pendente));
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível registrar o aceite.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ModalConfirmacao
      rotulo="Documentos legais"
      titulo="Atualizamos nossos documentos"
      textoConfirmar="LI E ACEITO"
      carregando={enviando}
      erro={erro}
      onConfirmar={aceitar}
      onFechar={() => setPendentes([])}
    >
      <p className="m-0">
        Os documentos abaixo têm uma nova versão. Leia antes de continuar:
      </p>
      <ul className="mt-4 flex list-none flex-col gap-2 p-0">
        {pendentes.map((c) => (
          <li key={c.documento}>
            <Link
              href={c.caminho}
              target="_blank"
              className="text-brand-light underline underline-offset-4"
            >
              {c.rotulo}
            </Link>{" "}
            <span className="text-ink-muted">
              (versão {c.versao_vigente}
              {c.versao_aceita ? `, você aceitou a ${c.versao_aceita}` : ""})
            </span>
          </li>
        ))}
      </ul>
    </ModalConfirmacao>
  );
}
