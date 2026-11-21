"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { useModal } from "@/components/ui/useModal";
import { ErroApi, api, temSessao } from "@/lib/api";
import { EVENTO_CONSENTIMENTO, recarregarPagina } from "@/lib/consentimento";
import type { Consentimento } from "@/lib/types";

const ROTA_DOS_DIREITOS = "/configuracoes";

function nadaAFazer() {}

export function AvisoConsentimento() {
  const { usuario } = useProgresso();
  const router = useRouter();
  const caminho = usePathname();
  const [pendentes, setPendentes] = useState<Consentimento[]>([]);
  const [enviando, setEnviando] = useState<"aceite" | "saida" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const usuarioId = usuario?.id;

  const consultar = useCallback(() => {
    let ativo = true;
    api
      .consentimentos()
      .then((cs) => {
        if (ativo) setPendentes(cs.filter((c) => c.pendente));
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!temSessao()) return;
    return consultar();
  }, [usuarioId, consultar]);

  useEffect(() => {
    let cancelar = () => {};
    function aoBloquear() {
      cancelar();
      cancelar = consultar();
    }
    window.addEventListener(EVENTO_CONSENTIMENTO, aoBloquear);
    return () => {
      cancelar();
      window.removeEventListener(EVENTO_CONSENTIMENTO, aoBloquear);
    };
  }, [consultar]);

  if (pendentes.length === 0 || caminho?.startsWith(ROTA_DOS_DIREITOS)) return null;

  async function aceitar() {
    setEnviando("aceite");
    setErro(null);
    try {
      const cs = await api.aceitarConsentimentos();
      const restantes = cs.filter((c) => c.pendente);
      setPendentes(restantes);
      if (restantes.length === 0) recarregarPagina();
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível registrar o aceite.");
    } finally {
      setEnviando(null);
    }
  }

  async function sair() {
    setEnviando("saida");
    setErro(null);
    try {
      await api.sair();
    } catch {
      setErro("Não foi possível sair agora. Tente de novo.");
      setEnviando(null);
      return;
    }
    router.replace("/entrar");
  }

  return (
    <ModalDeAceite
      pendentes={pendentes}
      enviando={enviando}
      erro={erro}
      onAceitar={aceitar}
      onSair={sair}
    />
  );
}

function ModalDeAceite({
  pendentes,
  enviando,
  erro,
  onAceitar,
  onSair,
}: {
  pendentes: Consentimento[];
  enviando: "aceite" | "saida" | null;
  erro: string | null;
  onAceitar: () => void;
  onSair: () => void;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const descricaoId = useId();

  useModal(painel, nadaAFazer, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 p-4">
      <div
        ref={painel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        tabIndex={-1}
        className="flex max-h-[90dvh] w-full max-w-[600px] flex-col gap-6 overflow-y-auto border-[3px] border-brand bg-panel p-7 shadow-frame outline-none"
      >
        <div className="flex flex-col gap-2.5">
          <span className="font-label text-[11px] tracking-[2px] text-brand-light uppercase">
            Documentos legais
          </span>
          <h2 id={tituloId} className="titulo m-0 font-display text-[15px] leading-[1.6] text-ink">
            Atualizamos nossos documentos
          </h2>
        </div>

        <div id={descricaoId} className="flex flex-col gap-4 font-body text-base leading-[1.6] text-ink-body">
          <p className="m-0">
            Os documentos abaixo têm uma nova versão. O aceite é{" "}
            <strong className="text-ink">obrigatório</strong>: para continuar
            usando a CodeQuest, você precisa ler e aceitar a versão vigente.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {pendentes.map((c) => (
              <li key={c.documento}>
                <Link
                  href={`${c.caminho}?versao=${encodeURIComponent(c.versao_vigente)}`}
                  target="_blank"
                  rel="noopener noreferrer"
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
          <p className="m-0 text-ink-muted">
            Se não concordar, saia da conta. Enquanto não aceitar, você só
            consegue{" "}
            <Link
              href={ROTA_DOS_DIREITOS}
              className="text-brand-light underline underline-offset-4"
            >
              baixar seus dados ou excluir sua conta
            </Link>
            .
          </p>
        </div>

        {erro ? (
          <p role="alert" className="m-0 font-body text-base leading-[1.4] text-danger">
            {erro}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onSair}
            disabled={enviando !== null}
            className="inline-flex items-center justify-center border-[3px] border-edge-soft bg-transparent px-5 py-4 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink-muted hover:text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando === "saida" ? "SAINDO..." : "SAIR DA CONTA"}
          </button>
          <button
            type="button"
            onClick={onAceitar}
            disabled={enviando !== null}
            className="inline-flex items-center justify-center border-[3px] border-brand-light bg-brand-deep px-5 py-4 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando === "aceite" ? "REGISTRANDO..." : "LI E ACEITO"}
          </button>
        </div>
      </div>
    </div>
  );
}
