"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { ErroApi, api, temSessao } from "@/lib/api";
import type { MinhaCriatura, Usuario } from "@/lib/types";
import { MATERIAS_DOMINIO } from "@/lib/types";

export function PainelInicio() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [posse, setPosse] = useState<MinhaCriatura | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!temSessao()) {
      router.replace("/entrar");
      return;
    }

    let ativo = true;
    (async () => {
      try {
        const [perfil, criaturas] = await Promise.all([
          api.eu(),
          api.minhasCriaturas(),
        ]);
        if (!ativo) return;
        setUsuario(perfil);
        setPosse(criaturas.find((c) => c.ativa) ?? criaturas[0] ?? null);
      } catch (e) {
        if (!ativo) return;
        if (e instanceof ErroApi && e.status === 401) {
          router.replace("/entrar");
          return;
        }
        setErro(
          e instanceof ErroApi ? e.message : "Não foi possível carregar o perfil.",
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [router]);

  async function sair() {
    try {
      await api.sair();
    } catch {
      /* a sessao cai do mesmo jeito ao sair da tela */
    }
    router.replace("/entrar");
  }

  if (carregando) {
    return (
      <main className="flex flex-1 items-center justify-center px-8 py-16">
        <p className="font-label text-[13px] tracking-[2px] text-brand-light">
          &gt; CARREGANDO PERFIL...
        </p>
      </main>
    );
  }

  if (erro || !usuario) {
    return (
      <main className="flex flex-1 items-center justify-center px-8 py-16">
        <p
          role="alert"
          className="border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-xl tracking-wide text-danger"
        >
          {erro ?? "Sessão inválida."}
        </p>
      </main>
    );
  }

  const estagio = posse?.criatura.estagios.find(
    (e) => e.estagio === posse.estagio_atual,
  );

  return (
    <main className="flex flex-1 flex-col items-center gap-12 px-8 py-16">
      <div className="flex w-full max-w-[880px] flex-wrap items-center justify-between gap-6 border-[3px] border-brand bg-panel px-8 py-6 shadow-frame">
        <div className="flex flex-col gap-2">
          <p className="m-0 font-label text-[13px] tracking-[2px] text-ink-muted">
            OPERADOR
          </p>
          <h1 className="m-0 font-display text-[19px] leading-[1.8] tracking-wide text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)]">
            {usuario.nickname}
          </h1>
          <p className="m-0 font-body text-xl tracking-wide text-ink-body">
            {usuario.email}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <span className="border-2 border-brand bg-brand px-3 py-1 font-label text-xs tracking-[2px] text-void">
            {usuario.papel_rotulo.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={sair}
            className="cursor-pointer border-2 border-edge-soft bg-panel-soft px-4 py-2 font-label text-xs tracking-[2px] text-ink-muted shadow-pixel hover:border-brand hover:text-brand-light"
          >
            SAIR
          </button>
        </div>
      </div>

      {posse && estagio ? (
        <div className="flex w-full max-w-[880px] flex-wrap items-center gap-10 border-[3px] border-edge-soft bg-panel px-8 py-8 shadow-pixel-lg">
          <div className="flex h-[216px] w-[216px] items-center justify-center border-2 border-brand-shadow bg-panel-deep shadow-halo">
            <Image
              src={estagio.sprite}
              alt={`${posse.criatura.nome}, estágio ${estagio.rotulo.toLowerCase()}`}
              width={176}
              height={176}
              priority
              className="block h-44 w-44"
            />
          </div>

          <div className="flex min-w-[260px] flex-1 flex-col gap-3">
            <h2 className="m-0 font-display text-[19px] leading-[1.8] tracking-wide text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)]">
              {posse.criatura.nome}
            </h2>
            <p className="m-0 font-label text-xs tracking-[2px] text-brand-light">
              {posse.criatura.dominio_rotulo.toUpperCase()} ·{" "}
              {estagio.rotulo.toUpperCase()}
            </p>
            <p className="m-0 font-body text-[21px] leading-[1.6] tracking-wide text-ink-body text-pretty">
              {posse.criatura.chamada}
            </p>
            <p className="m-0 font-body text-lg tracking-wide text-ink-muted">
              Trilha: {MATERIAS_DOMINIO[posse.criatura.dominio]}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <p className="m-0 font-body text-[21px] tracking-wide text-ink-body">
            Você ainda não escolheu sua criatura.
          </p>
          <PixelButton
            type="button"
            onClick={() => router.push("/escolher-criatura")}
          >
            ESCOLHER AGORA
          </PixelButton>
        </div>
      )}

      <p className="m-0 max-w-[560px] text-center font-body text-lg leading-[1.6] tracking-wide text-ink-muted text-pretty">
        As trilhas, os exercícios e o ranking entram nos próximos ciclos. Por
        enquanto, sua conta e sua criatura já estão salvas no servidor.
      </p>
    </main>
  );
}
