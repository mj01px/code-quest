"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { ErroApi, api, temSessao } from "@/lib/api";
import type { Criatura } from "@/lib/types";
import { CartaoCriatura } from "./CartaoCriatura";

export function SeletorCriatura() {
  const router = useRouter();
  const [criaturas, setCriaturas] = useState<Criatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!temSessao()) {
      router.replace("/entrar");
      return;
    }

    let ativo = true;
    (async () => {
      try {
        const [catalogo, minhas] = await Promise.all([
          api.catalogo(),
          api.minhasCriaturas(),
        ]);
        if (!ativo) return;
        if (minhas.length > 0) {
          router.replace("/trilhas");
          return;
        }
        setCriaturas(catalogo.filter((c) => c.disponivel));
      } catch (e) {
        if (ativo) {
          setErro(
            e instanceof ErroApi
              ? e.message
              : "Não foi possível carregar as criaturas.",
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [router]);

  const escolhida = criaturas.find((c) => c.slug === selecionada) ?? null;

  async function confirmar() {
    if (!escolhida) return;
    setErro(null);
    setEnviando(true);
    try {
      await api.escolherInicial(escolhida.slug);
      router.push("/trilhas");
    } catch (e) {
      setErro(
        e instanceof ErroApi ? e.message : "Não foi possível salvar a escolha.",
      );
      setEnviando(false);
    }
  }

  return (
    <>
      <main className="flex flex-1 flex-col items-center gap-10 px-6 py-12">
        <div className="flex max-w-[880px] flex-col items-center gap-4 text-center">
          <h1 className="m-0 font-display text-[18px] leading-[1.9] tracking-wide text-balance text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)] sm:text-[22px] lg:text-[26px]">
            Escolha seu
            <br />
            Companheiro de <span className="text-brand-light">Código</span>
          </h1>
          <p className="m-0 max-w-[640px] font-body text-[21px] leading-[1.7] tracking-wide text-ink-body text-pretty">
            Ela evolui a cada desafio que você supera. Escolha com sabedoria.
            <span
              aria-hidden="true"
              className="ml-2 inline-block h-4 w-[8px] translate-y-[2px] animate-blink bg-brand"
            />
          </p>
        </div>

        {carregando ? (
          <p className="font-label text-xs tracking-[2px] text-brand-light">
            &gt; CARREGANDO CATÁLOGO...
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Escolha sua criatura inicial"
            className="grid w-full max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(272px,1fr))] gap-8"
          >
            {criaturas.map((criatura, indice) => (
              <CartaoCriatura
                key={criatura.slug}
                criatura={criatura}
                slot={indice + 1}
                selecionada={criatura.slug === selecionada}
                aoSelecionar={setSelecionada}
              />
            ))}
          </div>
        )}

        {erro ? (
          <p
            role="alert"
            className="m-0 max-w-[560px] border-2 border-danger-deep bg-panel-soft px-4 py-3 text-center font-body text-base leading-[1.6] tracking-wide text-danger"
          >
            {erro}
          </p>
        ) : null}
      </main>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 border-t-2 border-edge bg-void px-8 py-5">
        <p
          aria-live="polite"
          className="m-0 font-label text-xs tracking-[2px] text-ink-body"
        >
          {escolhida
            ? `> COMPANHEIRO SELECIONADO: ${escolhida.nome.toUpperCase()}`
            : "> AGUARDANDO SELEÇÃO..."}
        </p>

        <PixelButton
          type="button"
          onClick={confirmar}
          disabled={!escolhida || enviando}
        >
          {enviando ? "CONFIRMANDO..." : "INICIAR JORNADA >"}
        </PixelButton>
      </div>
    </>
  );
}
