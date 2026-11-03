"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ModalConfirmacao } from "@/components/clas/ModalConfirmacao";
import { ErroApi, api } from "@/lib/api";
import type { UsuarioAdmin } from "@/lib/types";

interface Props {
  usuario: UsuarioAdmin;
  onFechar: () => void;
  onExcluido: (usuario: UsuarioAdmin) => void;
}

export function ExclusaoUsuario({ usuario, onFechar, onExcluido }: Props) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigo2fa, setCodigo2fa] = useState("");
  // null enquanto consulta. Lido ao abrir o modal: o admin pode ter acabado
  // de ativar o autenticador em outra aba.
  const [temApp, setTemApp] = useState<boolean | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .mfaStatus()
      .then((s) => {
        if (ativo) setTemApp(s.ativo && s.metodo === "APP");
      })
      // Na dúvida mostra o campo: quem decide é o backend.
      .catch(() => {
        if (ativo) setTemApp(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function confirmar() {
    setExcluindo(true);
    setErro(null);
    try {
      await api.adminExcluirUsuario(usuario.id, codigo2fa.trim());
      onExcluido(usuario);
    } catch (e) {
      // Código errado não serve de novo: o campo volta vazio para o próximo.
      setCodigo2fa("");
      setErro(e instanceof ErroApi ? e.message : "Não foi possível excluir agora.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <ModalConfirmacao
      rotulo="Excluir usuário"
      titulo={`Excluir ${usuario.nickname}?`}
      textoConfirmar="ANONIMIZAR"
      perigo
      carregando={excluindo}
      confirmarDesabilitado={!temApp || !codigo2fa.trim()}
      erro={erro}
      onConfirmar={confirmar}
      onFechar={onFechar}
    >
      <p className="m-0">
        Atenção: para conformidade com a LGPD, esta ação anonimizará os dados
        pessoais do usuário, mantendo apenas o histórico de progresso. Deseja
        continuar?
      </p>
      {temApp === null ? (
        <p className="m-0 mt-5 font-label text-[11px] tracking-[2px] text-ink-muted">
          VERIFICANDO SEU 2FA...
        </p>
      ) : temApp ? (
        <label className="mt-5 flex flex-col gap-2">
          <span className="font-label text-[11px] tracking-[2px] text-ink-label">
            CÓDIGO DO AUTENTICADOR (2FA)
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-invalid={Boolean(erro)}
            value={codigo2fa}
            // Sem maxLength: ele cortaria "123 456" colado antes de tirar o espaço.
            onChange={(e) =>
              setCodigo2fa(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="border-2 border-edge-soft bg-field px-3 py-2 font-body text-lg tracking-[4px] text-ink outline-none focus:border-brand-light"
          />
        </label>
      ) : (
        // O backend recusa (mfa_necessario): avisar antes poupa digitar à toa.
        <p
          role="note"
          className="m-0 mt-5 border-2 border-danger-deep bg-panel-soft px-4 py-3 text-danger"
        >
          Ações destrutivas exigem o aplicativo autenticador. Em{" "}
          <Link href="/configuracoes" className="underline underline-offset-4">
            Configurações
          </Link>
          , ative a verificação em duas etapas pelo aplicativo (se hoje ela usa
          e-mail, desative antes e ative de novo escolhendo o app).
        </p>
      )}
    </ModalConfirmacao>
  );
}
