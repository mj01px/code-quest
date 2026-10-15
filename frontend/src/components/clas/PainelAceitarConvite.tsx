"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ErroApi, api } from "@/lib/api";
import { bandeira } from "@/lib/clas";
import type { MeuCla, PreviaConvite } from "@/lib/types";

import { BTN_PRIMARIO, BTN_SECUNDARIO } from "./estilos";
import { IconeSetaEsquerda } from "./icones";

function mensagem(erro: unknown): string {
  return erro instanceof ErroApi
    ? erro.message
    : "Algo deu errado. Tente de novo.";
}

export function PainelAceitarConvite({ token }: { token: string }) {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [previa, setPrevia] = useState<PreviaConvite | null>(null);
  const [invalido, setInvalido] = useState(false);
  const [outroCla, setOutroCla] = useState<MeuCla | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.previaConvite(token).catch((erro) => {
        if (erro instanceof ErroApi && erro.naoEncontrado) return null;
        throw erro;
      }),
      api.meuCla().catch(() => null),
    ])
      .then(([p, meu]) => {
        if (!ativo) return;
        if (p) setPrevia(p);
        else setInvalido(true);
        setOutroCla(meu);
      })
      .catch(() => {
        if (ativo) setInvalido(true);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [token]);

  async function aceitar() {
    setEntrando(true);
    setErro(null);
    try {
      const meu = await api.aceitarConvite(token);
      router.push(`/clas/${meu.cla.tag}`);
    } catch (erro) {
      setErro(mensagem(erro));
      setEntrando(false);
    }
  }

  if (carregando) {
    return (
      <p className="rotulo text-ink-muted" aria-busy="true">
        Carregando...
      </p>
    );
  }

  if (invalido || !previa) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/clas"
          className="inline-flex items-center gap-2 self-start font-label text-[11px] tracking-[2px] text-brand-light"
        >
          <IconeSetaEsquerda size={14} /> CLÃS
        </Link>
        <section className="border-2 border-dashed border-edge-soft bg-panel p-8 text-center">
          <p className="m-0 font-body text-base text-ink-muted">
            Convite inválido ou expirado. Peça um link novo pra quem te chamou.
          </p>
        </section>
      </div>
    );
  }

  const info = bandeira(previa.bandeira);
  const jaTenhoCla = outroCla !== null;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/clas"
        className="inline-flex items-center gap-2 self-start font-label text-[11px] tracking-[2px] text-brand-light"
      >
        <IconeSetaEsquerda size={14} /> CLÃS
      </Link>

      <section
        aria-labelledby="titulo-convite"
        className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-6 border-[3px] border-brand bg-panel p-8 text-center shadow-frame"
      >
        <span className="rotulo text-brand-light">Você foi convidado</span>

        <span className="flex h-[120px] w-[120px] items-center justify-center border-2 border-brand-shadow bg-void shadow-[0_0_0_4px_rgba(168,85,247,0.22)]">
          <Image
            src={info.src}
            alt={`Bandeira de ${previa.nome}`}
            width={104}
            height={104}
            className="block h-[104px] w-[104px]"
          />
        </span>

        <h1
          id="titulo-convite"
          className="titulo m-0 font-display text-xl leading-[1.6] break-words text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]"
        >
          {previa.nome}
        </h1>

        <span className="inline-flex items-center border-2 border-edge-soft px-2.5 py-1 font-label text-[10px] tracking-[2px] text-ink-muted">
          {previa.total_membros}/50 MEMBROS
        </span>

        {jaTenhoCla ? (
          <p className="m-0 font-body text-base leading-[1.6] text-ink-muted">
            Você já está em <strong className="text-ink">{outroCla?.cla.nome}</strong>.
            Saia dele antes de entrar aqui.
          </p>
        ) : null}

        {erro ? (
          <p role="alert" className="m-0 font-body text-base text-danger">
            {erro}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={aceitar}
            disabled={jaTenhoCla || entrando}
            className={BTN_PRIMARIO}
          >
            {entrando ? "ENTRANDO..." : "ENTRAR NO CLÃ"}
          </button>
          <Link href="/clas" className={BTN_SECUNDARIO}>
            AGORA NÃO
          </Link>
        </div>
      </section>
    </div>
  );
}
