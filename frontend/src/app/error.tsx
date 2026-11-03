"use client";

import Link from "next/link";

// Rede de segurança de toda rota sem error.tsx próprio: um erro de render vira
// esta tela, dentro do layout raiz, em vez da página em branco.
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section
        role="alert"
        aria-labelledby="titulo-erro"
        className="flex w-full max-w-[560px] flex-col gap-4 border-[3px] border-brand bg-panel p-7 shadow-frame"
      >
        <h1 id="titulo-erro" className="titulo m-0 font-display text-[15px] leading-[1.6] text-ink">
          Algo deu errado
        </h1>
        <p className="m-0 font-body text-base leading-[1.6] text-ink-body">
          Esta tela encontrou um erro inesperado. Seu progresso está salvo: tente
          de novo ou volte para o início.
        </p>
        {error.digest ? (
          <p className="rotulo m-0 text-ink-muted">Referência: {error.digest}</p>
        ) : null}
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={reset}
            className="rotulo min-h-11 cursor-pointer border-2 border-brand px-4 py-2 text-brand hover:bg-brand-shadow/30 focus-visible:bg-brand-shadow/30"
          >
            Tentar de novo
          </button>
          <Link
            href="/"
            className="rotulo flex min-h-11 items-center border-2 border-edge-soft px-4 py-2 text-ink-muted hover:text-ink focus-visible:text-ink"
          >
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}
