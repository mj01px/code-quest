"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AprovacoesAutoria } from "@/components/admin/AprovacoesAutoria";
import { ExclusaoUsuario } from "@/components/admin/ExclusaoUsuario";
import { GestaoAuditoria } from "@/components/admin/GestaoAuditoria";
import { GestaoNiveis } from "@/components/admin/GestaoNiveis";
import { LogsAuditoria } from "@/components/admin/LogsAuditoria";
import { ModalAdmin } from "@/components/admin/ModalAdmin";
import { ModalAtribuirNivel } from "@/components/admin/ModalAtribuirNivel";
import { PedidosPendentes } from "@/components/admin/PedidosPendentes";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ServicoIndisponivel } from "@/components/ui/ServicoIndisponivel";
import type { UsuarioAdmin } from "@/lib/types";

type Modal =
  | { tipo: "nenhum" }
  | { tipo: "atribuir" }
  | { tipo: "niveis" }
  | { tipo: "aprovacoes"; pedido: number }
  | { tipo: "auditoria" }
  | { tipo: "excluir"; usuario: UsuarioAdmin };

const DURACAO_AVISO_MS = 4000;

// Guarda no cliente: sem `is_admin` (nível com acesso ao painel) ninguém
// chega ao conteúdo. É de navegação: a proteção de verdade fica em cada
// endpoint do painel (o backend já resolve por RBAC/permissão). Enquanto o
// /eu não responde, segura a tela.
export function PainelAdmin() {
  const router = useRouter();
  const { usuario, carregando, erro } = useProgresso();
  const [modal, setModal] = useState<Modal>({ tipo: "nenhum" });
  const [aviso, setAviso] = useState<string | null>(null);
  // Sem abas nada remonta sozinho: cada ação concluída recarrega números e logs.
  const [versao, setVersao] = useState(0);

  const ehAdmin = usuario?.is_admin === true;

  useEffect(() => {
    if (carregando || erro) return;
    if (!usuario) {
      router.replace("/entrar");
      return;
    }
    if (!usuario.is_admin) {
      router.replace("/trilhas");
    }
  }, [carregando, erro, usuario, router]);

  useEffect(() => {
    if (!aviso) return;
    const sumir = setTimeout(() => setAviso(null), DURACAO_AVISO_MS);
    return () => clearTimeout(sumir);
  }, [aviso]);

  const fechar = useCallback(() => setModal({ tipo: "nenhum" }), []);

  function concluir(mensagem: string) {
    setAviso(mensagem);
    setVersao((v) => v + 1);
    fechar();
  }

  if (erro && !usuario) return <ServicoIndisponivel />;
  if (carregando || !usuario) {
    return (
      <p className="font-label text-[13px] tracking-[2px] text-brand-light">
        &gt; VERIFICANDO ACESSO...
      </p>
    );
  }

  if (!ehAdmin) {
    // O efeito acima já redireciona; aqui só evita piscar o painel no caminho.
    return (
      <p className="font-label text-[13px] tracking-[2px] text-ink-muted">
        &gt; ACESSO RESTRITO. REDIRECIONANDO...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-3">
          <span className="font-label text-[11px] tracking-[2px] text-brand">
            {"// ADMIN"}
          </span>
          <h1 className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">
            Painel do administrador
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setModal({ tipo: "atribuir" })}
            className="min-h-11 cursor-pointer border-2 border-brand-light bg-brand-strong px-5 font-label text-[11px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-deep"
          >
            ATRIBUIR NÍVEL
          </button>
          <button
            type="button"
            onClick={() => setModal({ tipo: "niveis" })}
            className="min-h-11 cursor-pointer border-2 border-brand bg-brand-void px-5 font-label text-[11px] tracking-[2px] text-ink shadow-pixel hover:border-brand-light"
          >
            NÍVEIS DE ACESSO
          </button>
        </div>
      </div>

      <AdminDashboard
        key={`dashboard-${versao}`}
        atencao={
          <PedidosPendentes
            key={`pendentes-${versao}`}
            onVerPedido={(id) => setModal({ tipo: "aprovacoes", pedido: id })}
          />
        }
      />

      {usuario.permissoes.includes("auditoria.view") ? (
        <LogsAuditoria
          key={`logs-${versao}`}
          onVerTodos={() => setModal({ tipo: "auditoria" })}
        />
      ) : null}

      {modal.tipo === "atribuir" ? (
        <ModalAtribuirNivel
          onFechar={fechar}
          onAtribuido={concluir}
          onExcluir={(alvo) => setModal({ tipo: "excluir", usuario: alvo })}
        />
      ) : null}

      {modal.tipo === "niveis" ? (
        <ModalAdmin
          rotulo="// ADMIN"
          titulo="Níveis de acesso"
          largura="larga"
          onFechar={fechar}
        >
          <GestaoNiveis />
        </ModalAdmin>
      ) : null}

      {modal.tipo === "aprovacoes" ? (
        <ModalAdmin
          rotulo="// AUTORIA"
          titulo="Solicitação de autor"
          largura="larga"
          onFechar={fechar}
        >
          <AprovacoesAutoria
            destaque={modal.pedido}
            onDecidido={() => concluir("Solicitação decidida.")}
          />
        </ModalAdmin>
      ) : null}

      {modal.tipo === "auditoria" ? (
        <ModalAdmin
          rotulo="// ADMIN"
          titulo="Auditoria"
          largura="larga"
          onFechar={fechar}
        >
          <GestaoAuditoria />
        </ModalAdmin>
      ) : null}

      {modal.tipo === "excluir" ? (
        <ExclusaoUsuario
          usuario={modal.usuario}
          onFechar={fechar}
          onExcluido={(alvo) => concluir(`Dados de ${alvo.nickname} anonimizados.`)}
        />
      ) : null}

      {/* Sempre montado: leitor de tela só anuncia mudança em região que já existe. */}
      <p
        role="status"
        className={
          aviso
            ? "fixed right-4 bottom-4 z-50 m-0 border-[3px] border-success bg-panel px-5 py-4 font-body text-base tracking-[1px] text-ink shadow-[6px_6px_0_#000]"
            : "sr-only"
        }
      >
        {aviso}
      </p>
    </div>
  );
}
