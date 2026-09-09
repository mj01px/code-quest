"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelLink } from "@/components/ui/PixelLink";
import { ErroApi, api, temSessao } from "@/lib/api";
import type { Estagio, MinhaCriatura } from "@/lib/types";

const FORMA: Record<Estagio, string> = {
  1: "FORMA BASE",
  2: "FORMA 2",
  3: "FORMA FINAL",
};

const CAIXA =
  "m-0 border-2 bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide";

function Selo({ ativa }: { ativa: boolean }) {
  const estilo = ativa
    ? "border-brand bg-brand text-void"
    : "border-edge-soft bg-transparent text-ink-muted";
  return (
    <span
      className={`inline-flex shrink-0 items-center border-2 px-2 py-1 font-label text-[10px] leading-none tracking-[2px] ${estilo}`}
    >
      {ativa ? "ATIVA" : "RESERVA"}
    </span>
  );
}

function Cartao({
  posse,
  trocando,
  aoAtivar,
}: {
  posse: MinhaCriatura;
  trocando: boolean;
  aoAtivar: (slug: string) => void;
}) {
  const { criatura, ativa, estagio_atual, sprite } = posse;
  const borda = ativa ? "border-l-4 border-l-brand" : "border-l-4 border-l-edge";
  const halo = ativa ? "shadow-halo border-brand" : "border-edge-soft";

  return (
    <li
      className={`flex flex-wrap items-center gap-5 border-2 border-edge-soft bg-panel px-5 py-4 shadow-pixel ${borda}`}
    >
      <div
        className={`relative flex h-[88px] w-[88px] shrink-0 items-center justify-center border-2 bg-panel-soft ${halo}`}
      >
        {sprite ? (
          <Image
            src={sprite}
            alt=""
            width={72}
            height={72}
            className="block h-[72px] w-[72px]"
          />
        ) : null}
      </div>

      <div className="flex min-w-[180px] flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink">
            {criatura.nome}
          </h3>
          <Selo ativa={ativa} />
        </div>
        <p className="m-0 font-body text-base leading-[1.6] tracking-wide text-ink-muted">
          {criatura.tipo} · {FORMA[estagio_atual]}
          {posse.inicial ? " · inicial" : ""}
        </p>
      </div>

      {ativa ? (
        <p className="m-0 font-label text-[10px] tracking-[2px] text-brand-light">
          RECEBENDO XP
        </p>
      ) : (
        <PixelButton
          type="button"
          variante="secundaria"
          disabled={trocando}
          onClick={() => aoAtivar(criatura.slug)}
        >
          {trocando ? "TROCANDO..." : "TORNAR ATIVA"}
        </PixelButton>
      )}
    </li>
  );
}

export function SeletorAtiva() {
  const router = useRouter();
  const [posses, setPosses] = useState<MinhaCriatura[] | null>(null);
  const [trocando, setTrocando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!temSessao()) {
      router.replace("/entrar");
      return;
    }

    let ativo = true;
    api
      .minhasCriaturas()
      .then((lista) => {
        if (ativo) setPosses(lista);
      })
      .catch((e) => {
        if (!ativo) return;
        if (e instanceof ErroApi && e.status === 401) {
          router.replace("/entrar");
          return;
        }
        setErro("Não foi possível carregar suas criaturas.");
        setPosses([]);
      });

    return () => {
      ativo = false;
    };
  }, [router]);

  async function ativar(slug: string) {
    setTrocando(slug);
    setErro(null);
    try {
      await api.definirCriaturaAtiva(slug);
      setPosses(await api.minhasCriaturas());
    } catch (e) {
      setErro(
        e instanceof ErroApi ? e.message : "Não foi possível trocar agora.",
      );
    } finally {
      setTrocando(null);
    }
  }

  if (posses === null) {
    return (
      <p role="status" className={`${CAIXA} border-edge-soft text-ink-muted`}>
        Carregando suas criaturas...
      </p>
    );
  }

  if (posses.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
          Você ainda não escolheu sua criatura inicial.
        </p>
        <PixelLink href="/escolher-criatura">ESCOLHER CRIATURA</PixelLink>
      </div>
    );
  }

  const uma = posses.length === 1;

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
        {uma
          ? "A criatura ativa é a que acompanha você e recebe o XP dos exercícios. Quando você tiver mais de uma, dá para escolher qual será."
          : "Só uma criatura fica ativa por vez, e é ela que recebe o XP dos exercícios. As outras ficam de reserva, com o progresso delas guardado."}
      </p>

      {erro ? (
        <p role="alert" className={`${CAIXA} border-danger-deep text-danger`}>
          {erro}
        </p>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {posses.map((posse) => (
          <Cartao
            key={posse.id}
            posse={posse}
            trocando={trocando === posse.criatura.slug}
            aoAtivar={ativar}
          />
        ))}
      </ul>
    </div>
  );
}
